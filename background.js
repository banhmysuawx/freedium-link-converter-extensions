// List of known Medium-related domains
const mediumDomains = [
  "medium.com",
  "towardsdatascience.com",
  "betterprogramming.pub",
  "betterhumans.pub",
  "medium.freecodecamp.org",
  "uxdesign.cc",
  "levelup.gitconnected.com",
  "blog.medium.com",
  "entrepreneurshandbook.co",
];

async function checkRedirectFromMedium(url) {
  try {
    const response = await fetch(url, {
      method: "HEAD",
      redirect: "manual", // Don't automatically follow redirects
    });

    // Check if it's a 301 redirect
    if (response.status === 301 || response.status === 308) {
      const redirectUrl = response.headers.get("location");
      if (redirectUrl) {
        // Check if original URL was from Medium
        const originalUrl = new URL(url);
        return mediumDomains.some(
          (domain) =>
            originalUrl.hostname === domain ||
            originalUrl.hostname.endsWith("." + domain) ||
            originalUrl.hostname.includes("medium")
        );
      }
    }
    return false;
  } catch {
    return false;
  }
}

// Function to check if URL is Medium-related
async function isMediumURL(url) {
  try {
    const urlObj = new URL(url);
    // First check direct Medium domains
    const isDirectMedium = mediumDomains.some(
      (domain) =>
        urlObj.hostname === domain ||
        urlObj.hostname.endsWith("." + domain) ||
        urlObj.hostname.includes("medium")
    );

    if (isDirectMedium) return true;

    // If not direct Medium domain, check for redirect
    return await checkRedirectFromMedium(url);
  } catch {
    return false;
  }
}

// Default configuration
const defaultConfig = {
  openInNewTab: true,
  openLinksOnButtonClick: true,
};

// Retrieve configuration from storage or use default
function getConfig(callback) {
  chrome.storage.sync.get(defaultConfig, (items) => {
    callback(items);
  });
}

chrome.action.onClicked.addListener(async (tab) => {
  console.log("clicked");
  const currentUrl = tab.url;

  // Check if URL is Medium-related
  if (isMediumURL(currentUrl)) {
    const currentUrl = tab.url.replace(/^https?:\/\//, "");
    const newUrl = `https://freedium.cfd/${currentUrl}`;

    // Retrieve user configuration
    getConfig((config) => {
      if (config.openLinksOnButtonClick) {
        if (config.openInNewTab) {
          chrome.tabs.create({ url: newUrl });
        } else {
          chrome.tabs.update(tab.id, { url: newUrl });
        }
      }
    });
  }
});
