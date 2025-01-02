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
      const status = document.getElementById("status");
      status.textContent = "Options saved.";
      setTimeout(() => {
        status.textContent = "";
      }, 2000);
    }
  );
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restoreOptions() {
  chrome.storage.sync.get(
    {
      openInNewTab: false,
      openLinksOnButtonClick: true,
    },
    (items) => {
      document.getElementById("openInNewTab").checked = items.openInNewTab;
      document.getElementById("openLinksOnButtonClick").checked =
        items.openLinksOnButtonClick;
    }
  );
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.getElementById("openInNewTab").addEventListener("change", saveOptions);
document
  .getElementById("openLinksOnButtonClick")
  .addEventListener("change", saveOptions);
