// Background script for the Stopwatch Extension

// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Stopwatch Extension installed');
  
  // Initialize storage with default values
  chrome.storage.local.set({
    isRunning: false,
    time: 0,
    startTime: null,
    laps: []
  });
});

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getTime') {
    // Get current timer state and send it back
    chrome.storage.local.get(['isRunning', 'time', 'startTime', 'laps'], (result) => {
      sendResponse(result);
    });
    return true; // Required for async sendResponse
  }
});