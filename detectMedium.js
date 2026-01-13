// detectMedium.js
// ─────────────────────────────────────────────────────────────────────────────
// Standalone heuristics to detect if a given URL is a Medium page, including
// custom domains hosted by Medium.
// This module can be imported by background.js, popup scripts, or content
// scripts (if needed).

// ─────────────────────────────────────────────────────────────────────────────
// Configuration constants

// Fetch timeout for HEAD requests (in milliseconds)
const FETCH_TIMEOUT_MS = 3000; // 3 seconds - reduced from 6s for better UX

// Maximum bytes to fetch from HEAD tag
const HEAD_FETCH_MAX_BYTES = 16384; // 16KB - sufficient for metadata analysis

// Cache time-to-live for detection results
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// Minimum score threshold to consider a site as Medium-hosted
// Score is calculated from various signals (mobile app IDs, metadata, etc.)
const MEDIUM_DETECTION_THRESHOLD = 8;

// ─────────────────────────────────────────────────────────────────────────────
// Known Medium-related domains

// Known Medium-related domains that should be treated as direct Medium hits.
export const mediumDomains = [
  "medium.com",
  "towardsdatascience.com",
  "betterprogramming.pub",
  "betterhumans.pub",
  "medium.freecodecamp.org",
  "uxdesign.cc",
  "levelup.gitconnected.com",
  "blog.medium.com",
  "entrepreneurshandbook.co",
  "python.plainenglish.io",
];

// ─────────────────────────────────────────────────────────────────────────────
// Medium app identifiers for mobile deep links

// Stable app identifiers used by Medium's mobile deep links.
const MEDIUM_IOS_APP_ID = "828256236";
const MEDIUM_ANDROID_PKG = "com.medium.reader";

// ─────────────────────────────────────────────────────────────────────────────
// Regular expressions for pattern matching

// Medium static resource hints used as secondary signals.
// Matches: miro.medium.com, glyph.medium.com, cdn-images-1.medium.com
// With word boundaries to avoid false positives
const MEDIUM_HEAD_HOSTS_RE =
  /(?:^|[\s"'(])(?:miro\.medium\.com|glyph\.medium\.com|cdn-images-1\.medium\.com)(?:[^\w.-]|$)/i;

// Pattern for Medium's Android app deep link format
const MEDIUM_ANDROID_APP_RE =
  /^android-app:\/\/com\.medium\.reader\/https\/medium\.com\/p\//i;

// Simple in-memory cache to avoid refetching the same hostname repeatedly.
const detectionCache = new Map(); // key: hostname, value: { ts, isMedium, score, reasons }

// ─────────────────────────────────────────────────────────────────────────────
// Utilities

function textBetweenHeadTags(html) {
  const m = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  return m ? m[1] : "";
}

/**
 * Parse meta tags from HTML string using regex
 * Service workers don't have DOMParser, so we use regex instead
 */
function parseMetaTags(headHTML) {
  const metaTags = [];
  // Match all meta tags: <meta name="..." content="..."> or <meta property="..." content="...">
  const metaRegex = /<meta\s+([^>]*?)>/gi;
  let match;

  while ((match = metaRegex.exec(headHTML)) !== null) {
    const attrs = match[1];
    const tag = {};

    // Extract name attribute
    const nameMatch = /name=["']([^"']+)["']/i.exec(attrs);
    if (nameMatch) tag.name = nameMatch[1];

    // Extract property attribute
    const propMatch = /property=["']([^"']+)["']/i.exec(attrs);
    if (propMatch) tag.property = propMatch[1];

    // Extract content attribute
    const contentMatch = /content=["']([^"']+)["']/i.exec(attrs);
    if (contentMatch) tag.content = contentMatch[1];

    metaTags.push(tag);
  }

  return metaTags;
}

/**
 * Parse link tags from HTML string using regex
 */
function parseLinkTags(headHTML) {
  const linkTags = [];
  const linkRegex = /<link\s+([^>]*?)>/gi;
  let match;

  while ((match = linkRegex.exec(headHTML)) !== null) {
    const attrs = match[1];
    const tag = {};

    // Extract rel attribute
    const relMatch = /rel=["']([^"']+)["']/i.exec(attrs);
    if (relMatch) tag.rel = relMatch[1];

    // Extract href attribute
    const hrefMatch = /href=["']([^"']+)["']/i.exec(attrs);
    if (hrefMatch) tag.href = hrefMatch[1];

    // Extract title attribute
    const titleMatch = /title=["']([^"']+)["']/i.exec(attrs);
    if (titleMatch) tag.title = titleMatch[1];

    linkTags.push(tag);
  }

  return linkTags;
}

/**
 * Extract script tags (for LD+JSON)
 */
function parseScriptTags(headHTML) {
  const scripts = [];
  const scriptRegex =
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = scriptRegex.exec(headHTML)) !== null) {
    scripts.push(match[1]);
  }

  return scripts;
}

function pickMetaName(metaTags, name) {
  return metaTags
    .filter((tag) => tag.name && tag.name.toLowerCase() === name.toLowerCase())
    .map((tag) => tag.content)
    .filter(Boolean);
}

function pickMetaProp(metaTags, prop) {
  return metaTags
    .filter(
      (tag) => tag.property && tag.property.toLowerCase() === prop.toLowerCase()
    )
    .map((tag) => tag.content)
    .filter(Boolean);
}

function pickLinkAttr(linkTags, rel, attr) {
  return linkTags
    .filter((tag) => tag.rel && tag.rel.toLowerCase() === rel.toLowerCase())
    .map((tag) => tag[attr])
    .filter(Boolean);
}

function hasExact(arr, value) {
  const val = String(value).toLowerCase();
  return arr.some((v) => String(v || "").toLowerCase() === val);
}

function anyMatch(arr, re) {
  return arr.some((v) => re.test(String(v || "")));
}

// ─────────────────────────────────────────────────────────────────────────────
// HEAD fetch (we use GET and cut to </head> for reliability across servers)

async function fetchHeadHTML(url, { timeoutMs = FETCH_TIMEOUT_MS } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        // Servers may ignore Range; it's just a hint to reduce payload.
        Range: `bytes=0-${HEAD_FETCH_MAX_BYTES}`,
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
      signal: controller.signal,
    });
    const text = await res.text();
    return {
      ok: res.ok,
      status: res.status,
      headHTML: textBetweenHeadTags(text) || "",
    };
  } catch (error) {
    // Log error for debugging purposes
    console.warn("Failed to fetch HEAD HTML:", error.message);
    return { ok: false, status: 0, headHTML: "", error: error.message };
  } finally {
    clearTimeout(timer);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Heuristic scoring based on <head> signals
//
// Scoring system:
// - Mobile app identifiers (3 points each): Most reliable signal
// - App names (2 points each): Strong but could be spoofed
// - Author links to Medium (3 points): Very reliable
// - LD+JSON Medium references (2 points): Reliable structured data
// - Brand/site name matches (1 point each): Supporting evidence
// - Static resource hints (1 point): Weak but helpful confirmation

function scoreMediumSignals(headRawHTML) {
  let score = 0;
  const reasons = [];

  // Parse HTML tags using regex (service workers don't have DOMParser)
  const metaTags = parseMetaTags(headRawHTML);
  const linkTags = parseLinkTags(headRawHTML);
  const ldJsonBlocks = parseScriptTags(headRawHTML);

  // 1) Mobile deep links & app IDs (very strong signals)
  const twitterAppName = pickMetaName(metaTags, "twitter:app:name:iphone");
  const twitterAppId = pickMetaName(metaTags, "twitter:app:id:iphone");
  const alIosName = pickMetaProp(metaTags, "al:ios:app_name");
  const alIosId = pickMetaProp(metaTags, "al:ios:app_store_id");
  const alAndroidPkg = pickMetaProp(metaTags, "al:android:package");
  const alAndroidName = pickMetaProp(metaTags, "al:android:app_name");
  const altAndroidHref = pickLinkAttr(linkTags, "alternate", "href");

  if (hasExact(twitterAppName, "Medium")) {
    score += 2;
    reasons.push('twitter:app:name:iphone="Medium"');
  }
  if (hasExact(twitterAppId, MEDIUM_IOS_APP_ID)) {
    score += 3;
    reasons.push(`twitter:app:id:iphone=${MEDIUM_IOS_APP_ID}`);
  }
  if (hasExact(alIosName, "Medium")) {
    score += 2;
    reasons.push('al:ios:app_name="Medium"');
  }
  if (hasExact(alIosId, MEDIUM_IOS_APP_ID)) {
    score += 3;
    reasons.push(`al:ios:app_store_id=${MEDIUM_IOS_APP_ID}`);
  }
  if (hasExact(alAndroidName, "Medium")) {
    score += 2;
    reasons.push('al:android:app_name="Medium"');
  }
  if (hasExact(alAndroidPkg, MEDIUM_ANDROID_PKG)) {
    score += 3;
    reasons.push(`al:android:package=${MEDIUM_ANDROID_PKG}`);
  }
  if (anyMatch(altAndroidHref, MEDIUM_ANDROID_APP_RE)) {
    score += 3;
    reasons.push(
      "link[rel=alternate] android-app://com.medium.reader/https/medium.com/p/..."
    );
  }

  // 2) Author/creator wired to Medium profile (strong)
  const relAuthor = pickLinkAttr(linkTags, "author", "href");
  if (anyMatch(relAuthor, /^https:\/\/medium\.com\/@/i)) {
    score += 3;
    reasons.push('rel="author" -> https://medium.com/@...');
  }

  if (ldJsonBlocks.some((t) => /"https:\/\/medium\.com\/@[^"]+"/i.test(t))) {
    score += 2;
    reasons.push("LD+JSON contains medium.com/@author");
  }

  // 3) Brand/OSD helpers (supporting)
  const osdHref = pickLinkAttr(linkTags, "search", "href");
  const osdTitle = pickLinkAttr(linkTags, "search", "title");
  if (hasExact(osdTitle, "Medium")) {
    score += 1;
    reasons.push('link[rel="search"][title="Medium"]');
  }
  if (osdHref.includes("/osd.xml")) {
    score += 1;
    reasons.push('link[rel="search"][href="/osd.xml"]');
  }

  const ogSiteName = pickMetaProp(metaTags, "og:site_name");
  if (hasExact(ogSiteName, "Medium")) {
    score += 1;
    reasons.push('og:site_name="Medium"');
  }

  // 4) Static resource hints in <head> (weak support)
  if (MEDIUM_HEAD_HOSTS_RE.test(headRawHTML)) {
    score += 1;
    reasons.push("Head contains miro/glyph/cdn-images-1.medium.com");
  }

  return { score, reasons };
}

// Public API: head-based detection with threshold
export async function detectMediumPublicationByHead(
  url,
  { threshold = MEDIUM_DETECTION_THRESHOLD } = {}
) {
  let hostname;
  try {
    hostname = new URL(url).hostname;
  } catch {
    return { isMediumLikely: false, score: 0, reasons: ["invalid URL"] };
  }

  // Serve from cache if fresh.
  const cached = detectionCache.get(hostname);
  const now = Date.now();
  if (cached && now - cached.ts < CACHE_TTL_MS) {
    return {
      isMediumLikely: cached.isMedium,
      score: cached.score,
      reasons: cached.reasons.slice(),
    };
  }

  const { ok, headHTML } = await fetchHeadHTML(url);
  if (!ok || !headHTML) {
    const miss = {
      isMediumLikely: false,
      score: 0,
      reasons: ["fetch failed or empty head"],
    };
    detectionCache.set(hostname, {
      ts: now,
      isMedium: miss.isMediumLikely,
      score: miss.score,
      reasons: miss.reasons,
    });
    return miss;
  }

  // Parse HTML and score Medium signals
  const { score, reasons } = scoreMediumSignals(headHTML);
  const isMediumLikely = score >= threshold;

  detectionCache.set(hostname, {
    ts: now,
    isMedium: isMediumLikely,
    score,
    reasons,
  });
  return { isMediumLikely, score, reasons };
}

// ─────────────────────────────────────────────────────────────────────────────
// Direct check against known Medium domains and substring "medium"

export function isDirectMediumDomain(hostname) {
  return mediumDomains.some(
    (domain) =>
      hostname === domain ||
      hostname.endsWith("." + domain) ||
      hostname.includes("medium")
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Public composite API used by the extension

export async function isMediumURL(url) {
  try {
    const { hostname } = new URL(url);

    // 1) Instant decision by domain list / substring
    if (isDirectMediumDomain(hostname)) return true;

    // 2) Head heuristics for custom domains
    const result = await detectMediumPublicationByHead(url);
    return result.isMediumLikely;
  } catch (error) {
    console.warn("Error checking if URL is Medium:", error.message);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Freedium helpers

export function convertToFreediumUrl(url) {
  // Freedium format: https://freedium-mirror.cfd/<original-host-and-path>
  return `https://freedium-mirror.cfd/${url.replace(/^https?:\/\//, "")}`;
}
