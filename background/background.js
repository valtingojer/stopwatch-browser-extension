// Background script for the Stopwatch Extension

// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Stopwatch Extension installed');
  
  // Initialize storage with default values
  chrome.storage.local.set({
    isRunning: false,
    time: 0,
    startTime: null,
    laps: [],
    overlayState: false,
    speed: 1.0
  });
  
  // Create context menu
  chrome.contextMenus.create({
    id: 'toggleChronometer',
    title: 'Ligar',
    contexts: ['action']
  });
});

// Listen for context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'toggleChronometer') {
    chrome.storage.local.get(['overlayState'], (result) => {
      const currentState = result.overlayState || false;
      const newState = !currentState;
      chrome.contextMenus.update('toggleChronometer', {
        title: newState ? 'Desligar' : 'Ligar'
      });
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'toggleOverlay', state: newState });
      });
      chrome.storage.local.set({ overlayState: newState });
    });
  }
});

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getTime') {
    // Get current timer state and send it back
    chrome.storage.local.get(['isRunning', 'time', 'startTime', 'laps', 'speed', 'overlayState'], (result) => {
      sendResponse(result);
    });
    return true; // Required for async sendResponse
  }
  
  // Handle start timer request from overlay
  else if (message.action === 'startTimer' && message.source === 'overlay') {
    const startTime = Date.now();
    
    // Save state to Chrome storage
    chrome.storage.local.set({ 
      isRunning: true, 
      startTime: startTime,
      overlayState: true
    });
    
    // No need to send to popup as it's not open
    console.log('Timer started from overlay');
  }
  
  // Handle stop timer request from overlay
  else if (message.action === 'stopTimer' && message.source === 'overlay') {
    // Get current time
    chrome.storage.local.get(['startTime'], (result) => {
      if (result.startTime) {
        const elapsedTime = Date.now() - result.startTime;
        
        // Save state to Chrome storage
        chrome.storage.local.get(['laps'], (lapResult) => {
          const laps = lapResult.laps || [];
          laps.push(elapsedTime);
          
          chrome.storage.local.set({ 
            isRunning: false, 
            time: elapsedTime,
            laps: laps
          });
        });
      }
    });
    
    console.log('Timer stopped from overlay');
  }
});