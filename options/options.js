// options.js
// ─────────────────────────────────────────────────────────────────────────────
// Options page script for Freedium Link Converter

// Saves options to chrome.storage
function saveOptions() {
  const openInNewTab = document.getElementById("openInNewTab").checked;
  const openLinksOnButtonClick = document.getElementById(
    "openLinksOnButtonClick"
  ).checked;

  chrome.storage.sync.set(
    {
      openInNewTab: openInNewTab,
      openLinksOnButtonClick: openLinksOnButtonClick,
    },
    () => {
      // Show save confirmation
      const status = document.getElementById("status");
      status.textContent = "Settings saved successfully!";
      status.classList.add("show");

      // Hide after 2 seconds
      setTimeout(() => {
        status.classList.remove("show");
      }, 2000);
    }
  );
}

// Restores checkbox state using the preferences stored in chrome.storage
function restoreOptions() {
  chrome.storage.sync.get(
    {
      openInNewTab: true,
      openLinksOnButtonClick: true,
    },
    (items) => {
      document.getElementById("openInNewTab").checked = items.openInNewTab;
      document.getElementById("openLinksOnButtonClick").checked =
        items.openLinksOnButtonClick;
    }
  );
}

// Initialize on DOM load
document.addEventListener("DOMContentLoaded", restoreOptions);

// Add change listeners to auto-save
document.getElementById("openInNewTab").addEventListener("change", saveOptions);
document
  .getElementById("openLinksOnButtonClick")
  .addEventListener("change", saveOptions);
