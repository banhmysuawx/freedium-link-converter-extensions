// background.js (MV3, type: module)
// ─────────────────────────────────────────────────────────────────────────────
// Wiring for browser action, context menus, and config storage.
// Imports detection + conversion helpers.

import { isMediumURL, convertToFreediumUrl } from "./detectMedium.js";
import {
  getConfig as getStorageConfig,
  openUrl,
  showNotification,
  showLoadingBadge,
  showSuccessBadge,
  showErrorBadge,
  handleError,
} from "./utils.js";

// Default configuration (synced across devices)
const defaultConfig = {
  openInNewTab: true,
  openLinksOnButtonClick: true,
};

// Utility: read config from chrome.storage.sync with defaults applied.
async function getConfig() {
  return getStorageConfig(defaultConfig);
}

// Open a Freedium URL either in a new tab or current tab
async function openInFreedium(url, opts) {
  try {
    const newUrl = convertToFreediumUrl(url);
    const config = opts || (await getConfig());

    showLoadingBadge();
    await openUrl(newUrl, config.openInNewTab);
    showSuccessBadge();

    return true;
  } catch (error) {
    handleError("open in Freedium", error, true);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Action button click: convert current page if it's Medium-related.

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab || !tab.url) {
    showNotification(
      "Cannot Open in Freedium",
      "No valid URL found in the current tab",
      "basic"
    );
    return;
  }

  const currentUrl = tab.url;

  try {
    showLoadingBadge();

    const isMedium = await isMediumURL(currentUrl);

    if (isMedium) {
      const config = await getConfig();
      if (config.openLinksOnButtonClick) {
        await openInFreedium(currentUrl, config);
      } else {
        showNotification(
          "Freedium",
          "Open links on button click is disabled. Enable it in settings.",
          "basic"
        );
        showErrorBadge();
      }
    } else {
      showNotification(
        "Not a Medium Article",
        "This page doesn't appear to be a Medium article",
        "basic"
      );
      showErrorBadge();
    }
  } catch (error) {
    handleError("process action click", error, true);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Context menus for page and links.

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "openPageInFreedium",
    title: "Open in Freedium",
    contexts: ["page"],
  });

  chrome.contextMenus.create({
    id: "openLinkInFreedium",
    title: "Open link in Freedium",
    contexts: ["link"],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  let url;
  if (info.menuItemId === "openPageInFreedium") {
    url = tab?.url;
  } else if (info.menuItemId === "openLinkInFreedium") {
    url = info.linkUrl;
  }

  if (!url) {
    showNotification("Cannot Open in Freedium", "No valid URL found", "basic");
    return;
  }

  try {
    showLoadingBadge();

    const isMedium = await isMediumURL(url);

    if (isMedium) {
      await openInFreedium(url);
    } else {
      showNotification(
        "Not a Medium Article",
        "This URL doesn't appear to be a Medium article",
        "basic"
      );
      showErrorBadge();
    }
  } catch (error) {
    handleError("process context menu click", error, true);
  }
});
