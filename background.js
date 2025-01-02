// background.js
chrome.action.onClicked.addListener(async (tab) => {
  console.log("clicked");
  const currentUrl = tab.url;

  // Check if URL is from Medium or Towards Data Science
  if (
    currentUrl.includes("medium.com") ||
    currentUrl.includes("towardsdatascience.com")
  ) {
    const newUrl = `https://freedium.cfd/${currentUrl}`;

    // Update current tab with new URL
    chrome.tabs.update(tab.id, { url: newUrl });
  }
});
