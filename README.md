# Freedium Link Converter

## Description

Freedium Link Converter is a Chrome extension that prepends `freedium.cfd` to Medium and Towards Data Science URLs.

## Features

- Converts Medium and Towards Data Science URLs to use `freedium.cfd`
- Easy to use with a single click
- Supports context menu for quickly opening Medium pages in Freedium
- Option to open Medium links in Freedium directly from the right-click menu

## Installation (User Mode)

1. **Download the Extension**
   - Download the latest release from the [Releases](https://chromewebstore.google.com/detail/freedium-link-converter/enocadmdedhoajldcnlajbjaihpkccml) page.

## Installation (Developer Mode)

1. **Clone the Repository**

   ```bash
   git clone https://github.com/banhmysuawx/freedium-link-converter-extensions.git
   ```

2. **Navigate to the Directory**

   ```bash
   cd freedium-extension
   ```

3. **Build the Extension**

   ```bash
   # Create directory for zip contents
   mkdir extension-build

   # Copy all necessary files
   cp manifest.json extension-build/
   cp background.js extension-build/
   cp -r images/ extension-build/images/
   cp -r options/ extension-build/options/

   # Create zip file
   cd extension-build
   zip -r ../freedium-extension.zip .
   cd ..

   # Clean up
   rm -rf extension-build
   ```

4. **Load the Extension in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" in the top right corner
   - Click on "Load unpacked" and select the project directory

## Usage

### Method 1: Using the extension icon

1. Navigate to a Medium or Towards Data Science article
2. Click on the Freedium Link Converter icon in the toolbar
3. The URL will be updated to use `https://freedium.cfd/`
![toolbar](./assets/toolbar.png)

### Method 2: Using the context menu

1. **For the current Medium page**:
   - Right-click anywhere on the page
   - Select "Open in Freedium" from the context menu
   - The page will be reopened using Freedium

2. **For Medium links**:
   - Right-click on any Medium link
   - Select "Open in Freedium" from the context menu
   - The link will be opened in Freedium

![context_menu](./assets/context_menu.png)

### Configuration options

- Access the extension options page to configure:
  - Open in new tab or current tab
  - Enable/disable automatic link opening when clicking the extension icon

## License

MIT License
