# Stopwatch Chrome Extension

A feature-rich stopwatch extension for Chrome that provides both a popup timer and an overlay chronometer. Built with Vue.js (using CDN, no Node.js required).

## Features

- Traditional stopwatch with start, stop, and reset functionality
- Lap time recording
- Adjustable speed control (0.1x to 10x)
- Draggable overlay chronometer with digital display
- Persistent timer state using Chrome storage
- Clean, responsive UI with dark theme
- Context menu integration for quick overlay toggle

## Project Structure

```
stopwatch-browser-extenssion/
├── assets/
│   └── icons/              # Extension icons
├── background/
│   └── background.js       # Background service worker
├── content/
│   └── content.js          # Content script for web page interaction
├── popup/
│   ├── popup.html          # Extension popup UI
│   └── popup.js            # Vue.js application logic
├── styles/
│   └── styles.css          # CSS styles
└── manifest.json           # Extension manifest
```

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" by toggling the switch in the top right corner
4. Click "Load unpacked" and select the extension directory
5. The extension should now be installed and visible in your toolbar

## Development

This extension uses Vue.js file downloaded directly from CDN without requiring Node.js or any build tools. To modify the extension:

1. Edit the files directly
2. Reload the extension in Chrome's extension management page

## Vue.js Implementation

The extension uses Vue.js 3 with the Options API pattern. The template is defined outside of the script in popup.html, and the application logic is in popup.js.