// test-regex-parser.js
// Simple test to verify regex-based HTML parsing works correctly

// Test data - sample Medium article HEAD
const sampleMediumHead = `
  <meta name="twitter:app:name:iphone" content="Medium">
  <meta name="twitter:app:id:iphone" content="828256236">
  <meta property="al:ios:app_name" content="Medium">
  <meta property="al:ios:app_store_id" content="828256236">
  <meta property="al:android:package" content="com.medium.reader">
  <meta property="og:site_name" content="Medium">
  <link rel="author" href="https://medium.com/@username">
  <link rel="search" type="application/opensearchdescription+xml" href="/osd.xml" title="Medium">
  <script type="application/ld+json">{"author": "https://medium.com/@username"}</script>
`;

// Test parseMetaTags
console.log("Testing parseMetaTags...");
const metaTags = parseMetaTags(sampleMediumHead);
console.log("Found meta tags:", metaTags.length);
console.log("Sample:", metaTags.slice(0, 2));

// Test parseLinkTags
console.log("\nTesting parseLinkTags...");
const linkTags = parseLinkTags(sampleMediumHead);
console.log("Found link tags:", linkTags.length);
console.log("Sample:", linkTags);

// Test parseScriptTags
console.log("\nTesting parseScriptTags...");
const scripts = parseScriptTags(sampleMediumHead);
console.log("Found scripts:", scripts.length);
console.log("Content:", scripts[0]);

// Test pickMetaName
console.log("\nTesting pickMetaName...");
const twitterApp = pickMetaName(metaTags, "twitter:app:name:iphone");
console.log("twitter:app:name:iphone =", twitterApp);

// Test pickMetaProp
console.log("\nTesting pickMetaProp...");
const alIosId = pickMetaProp(metaTags, "al:ios:app_store_id");
console.log("al:ios:app_store_id =", alIosId);

// Test pickLinkAttr
console.log("\nTesting pickLinkAttr...");
const authorLink = pickLinkAttr(linkTags, "author", "href");
console.log("author link =", authorLink);

console.log("\n✅ All tests completed!");
