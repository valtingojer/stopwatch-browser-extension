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

// Function to broadcast state changes to all tabs
function broadcastStateChange(state) {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, { 
        action: 'stateUpdated',
        state: state
      }).catch(() => {
        // Ignore errors for tabs that don't have the content script
      });
    });
  });
}

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getState') {
    // Get current timer state and send it back
    chrome.storage.local.get(['isRunning', 'time', 'startTime', 'laps', 'speed', 'overlayState'], (result) => {
      // If timer is running, calculate current time
      if (result.isRunning && result.startTime) {
        result.time = Date.now() - result.startTime;
      }
      sendResponse(result);
    });
    return true; // Required for async sendResponse
  }
  
  // Handle start timer request from any source
  else if (message.action === 'startTimer') {
    const startTime = Date.now() - (message.currentTime || 0);
    
    // Save state to Chrome storage
    chrome.storage.local.set({ 
      isRunning: true, 
      startTime: startTime,
      overlayState: true
    }, () => {
      // Broadcast state change to all tabs
      broadcastStateChange({
        isRunning: true,
        startTime: startTime,
        overlayState: true
      });
    });
    
    sendResponse({ success: true });
    return true;
  }
  
  // Handle stop timer request from any source
  else if (message.action === 'stopTimer') {
    // Get current time
    chrome.storage.local.get(['startTime', 'laps'], (result) => {
      if (result.startTime) {
        const elapsedTime = Date.now() - result.startTime;
        const laps = result.laps || [];
        
        // Add lap if requested
        if (message.addLap) {
          laps.push(elapsedTime);
        }
        
        // Save state to Chrome storage
        chrome.storage.local.set({ 
          isRunning: false, 
          time: elapsedTime,
          laps: laps
        }, () => {
          // Broadcast state change to all tabs
          broadcastStateChange({
            isRunning: false,
            time: elapsedTime,
            laps: laps
          });
        });
      }
    });
    
    sendResponse({ success: true });
    return true;
  }
  
  // Handle reset timer request
  else if (message.action === 'resetTimer') {
    chrome.storage.local.set({ 
      isRunning: false, 
      time: 0,
      startTime: null
    }, () => {
      // Broadcast state change to all tabs
      broadcastStateChange({
        isRunning: false,
        time: 0,
        startTime: null
      });
    });
    
    sendResponse({ success: true });
    return true;
  }
  
  // Handle clear laps request
  else if (message.action === 'clearLaps') {
    chrome.storage.local.set({ laps: [] }, () => {
      // Broadcast state change to all tabs
      broadcastStateChange({
        laps: []
      });
    });
    
    sendResponse({ success: true });
    return true;
  }
  
  // Handle speed update request
  else if (message.action === 'updateSpeed') {
    chrome.storage.local.set({ speed: message.speed }, () => {
      // Broadcast state change to all tabs
      broadcastStateChange({
        speed: message.speed
      });
    });
    
    sendResponse({ success: true });
    return true;
  }
  
  // Handle overlay toggle request
  else if (message.action === 'toggleOverlay') {
    chrome.storage.local.set({ overlayState: message.state }, () => {
      // Broadcast state change to all tabs
      broadcastStateChange({
        overlayState: message.state
      });
    });
    
    sendResponse({ success: true });
    return true;
  }
});