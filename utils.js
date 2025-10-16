// utils.js
// ─────────────────────────────────────────────────────────────────────────────
// Shared utility functions for the extension

// ─────────────────────────────────────────────────────────────────────────────
// Tab management utilities

/**
 * Open a URL in a new tab or update the current tab
 * @param {string} url - The URL to open
 * @param {boolean} openInNewTab - Whether to open in a new tab
 * @returns {Promise<chrome.tabs.Tab>} The created or updated tab
 */
export async function openUrl(url, openInNewTab = true) {
  if (openInNewTab) {
    return chrome.tabs.create({ url });
  } else {
    // Get current active tab
    const [activeTab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (activeTab?.id) {
      return chrome.tabs.update(activeTab.id, { url });
    } else {
      // Fallback to creating a new tab if no active tab found
      return chrome.tabs.create({ url });
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// User feedback utilities

/**
 * Show a notification to the user
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {string} type - Notification type ('basic', 'image', 'list', 'progress')
 */
export function showNotification(title, message, type = "basic") {
  if (!chrome.notifications) {
    console.warn("Notifications API not available");
    return;
  }

  const notificationId = `freedium-${Date.now()}`;
  chrome.notifications.create(notificationId, {
    type,
    iconUrl: "images/icon.png",
    title,
    message,
    priority: 1,
  });

  // Auto-clear notification after 5 seconds
  setTimeout(() => {
    chrome.notifications.clear(notificationId);
  }, 5000);
}

/**
 * Set badge text on the extension icon
 * @param {string} text - Text to display (max 4 characters)
 * @param {string} color - Badge background color (hex or rgb)
 */
export function setBadge(text, color = "#4CAF50") {
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color });
}

/**
 * Clear badge from the extension icon
 */
export function clearBadge() {
  chrome.action.setBadgeText({ text: "" });
}

/**
 * Show loading state on the badge
 */
export function showLoadingBadge() {
  setBadge("...", "#FFA500");
}

/**
 * Show success state on the badge
 */
export function showSuccessBadge() {
  setBadge("✓", "#4CAF50");
  setTimeout(clearBadge, 2000);
}

/**
 * Show error state on the badge
 */
export function showErrorBadge() {
  setBadge("✗", "#F44336");
  setTimeout(clearBadge, 3000);
}

// ─────────────────────────────────────────────────────────────────────────────
// Storage utilities

/**
 * Get configuration from chrome.storage.sync with defaults
 * @param {Object} defaults - Default configuration values
 * @returns {Promise<Object>} The configuration object
 */
export async function getConfig(defaults = {}) {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(defaults, (items) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(items);
      }
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Error handling utilities

/**
 * Handle error with user notification
 * @param {string} context - Context where error occurred
 * @param {Error} error - The error object
 * @param {boolean} notify - Whether to show notification to user
 */
export function handleError(context, error, notify = false) {
  // Log error with context
  console.error(`[Freedium] ${context}:`, {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
  });

  showErrorBadge();

  if (notify) {
    showNotification(
      "Freedium Error",
      `Failed to ${context}: ${error.message}`,
      "basic"
    );
  }
}
