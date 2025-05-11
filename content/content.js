// Content script for the Stopwatch Extension

// This script runs in the context of web pages
// It can interact with the page's DOM and communicate with the extension

// Listen for messages from the extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'showTime') {
    // Example: Display the current stopwatch time on the page
    showTimeOnPage(message.time);
    sendResponse({ success: true });
  }
  return true;
});

// Function to display the stopwatch time on the page (example functionality)
function showTimeOnPage(time) {
  // Check if our timer display already exists
  let timerDisplay = document.getElementById('stopwatch-extension-display');
  
  // If not, create it
  if (!timerDisplay) {
    timerDisplay = document.createElement('div');
    timerDisplay.id = 'stopwatch-extension-display';
    timerDisplay.style.position = 'fixed';
    timerDisplay.style.bottom = '20px';
    timerDisplay.style.right = '20px';
    timerDisplay.style.padding = '10px';
    timerDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    timerDisplay.style.color = 'white';
    timerDisplay.style.borderRadius = '5px';
    timerDisplay.style.zIndex = '9999';
    timerDisplay.style.fontFamily = 'Arial, sans-serif';
    document.body.appendChild(timerDisplay);
  }
  
  // Update the display with the current time
  timerDisplay.textContent = time;
}