// Content script for the Stopwatch Extension

// This script runs in the context of web pages
// It can interact with the page's DOM and communicate with the extension

let isOverlayActive = false;
let isRunning = false;
let counter = 0;
let power = 0;
let speed = 1.0;
let intervalId = null;

// Function to create the chronometer overlay
function createOverlay() {
  // Add styles to the page
  const styleElement = document.createElement('style');
  styleElement.textContent = `
    #chronometer-overlay {
      position: fixed;
      top: 120px;
      right: 120px;
      z-index: 9999;
      background: rgba(30, 30, 30, 0.9);
      padding: 10px;
      border-radius: 5px;
    }
    
    .chronometer {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    
    .digits {
      font-family: monospace, sans-serif;
      font-size: 100px;
      color: #64ffda;
      line-height: 100px;
    }
    
    .power {
      font-size: 40px;
      vertical-align: super;
    }
    
    .buttons {
      margin-top: 10px;
      display: flex;
      gap: 10px;
    }
    
    .play-btn, .stop-btn {
      padding: 5px 10px;
      background: #4285f4;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    
    .play-btn:hover, .stop-btn:hover {
      background: #3367d6;
    }
  `;
  document.head.appendChild(styleElement);

  // Create overlay element
  const overlay = document.createElement('div');
  overlay.id = 'chronometer-overlay';
  overlay.innerHTML = `
    <div class="chronometer">
      <span class="digits">
        <span class="counter">0</span><sup class="power">0</sup>
      </span>
      <div class="buttons">
        <button class="play-btn">Play</button>
        <button class="stop-btn">Stop</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  // Add event listeners
  const playBtn = overlay.querySelector('.play-btn');
  const stopBtn = overlay.querySelector('.stop-btn');
  const counterDisplay = overlay.querySelector('.counter');
  const powerDisplay = overlay.querySelector('.power');

  playBtn.addEventListener('click', () => {
    if (!isRunning) {
      isRunning = true;
      startChronometer(counterDisplay, powerDisplay);
    }
  });

  stopBtn.addEventListener('click', () => {
    if (isRunning) {
      isRunning = false;
      clearInterval(intervalId);
      counter = 0;
      power = 0;
      counterDisplay.textContent = counter;
      powerDisplay.textContent = power;
    }
  });
}

// Function to start the chronometer
function startChronometer(counterDisplay, powerDisplay) {
  intervalId = setInterval(() => {
    counter++;
    if (counter > 9) {
      counter = 0;
      power++;
      if (power > 9) {
        power = 0;
      }
      powerDisplay.textContent = power;
    }
    counterDisplay.textContent = counter;
  }, 1000 / speed); // 1000ms divided by speed
}

// Function to toggle the overlay
function toggleOverlay(state) {
  if (state === isOverlayActive) return; // Do nothing if state doesn't change
  isOverlayActive = state;

  if (isOverlayActive) {
    createOverlay();
  } else {
    const overlay = document.getElementById('chronometer-overlay');
    if (overlay) {
      overlay.remove();
      clearInterval(intervalId);
      isRunning = false;
      counter = 0;
      power = 0;
    }
  }
  chrome.storage.local.set({ overlayState: isOverlayActive });
}

// Function to display the stopwatch time on the page (original functionality)
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

// Load initial state from Chrome storage
chrome.storage.local.get(['overlayState', 'speed'], (result) => {
  isOverlayActive = result.overlayState || false;
  speed = result.speed || 1.0;
  if (isOverlayActive) {
    createOverlay();
  }
});

// Listen for messages from the extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'showTime') {
    // Display the current stopwatch time on the page
    showTimeOnPage(message.time);
    sendResponse({ success: true });
  } else if (message.action === 'toggleOverlay') {
    toggleOverlay(message.state);
    sendResponse({ success: true });
  } else if (message.action === 'updateSpeed') {
    speed = message.speed;
    if (isRunning) {
      clearInterval(intervalId);
      const counterDisplay = document.querySelector('.counter');
      const powerDisplay = document.querySelector('.power');
      startChronometer(counterDisplay, powerDisplay);
    }
    sendResponse({ success: true });
  } else if (message.action === 'startOverlayCounter') {
    // Start the overlay counter if overlay is active
    if (isOverlayActive && !isRunning) {
      isRunning = true;
      const counterDisplay = document.querySelector('.counter');
      const powerDisplay = document.querySelector('.power');
      if (counterDisplay && powerDisplay) {
        startChronometer(counterDisplay, powerDisplay);
      }
    }
    sendResponse({ success: true });
  }
  return true;
});

// Modify the play button event listener in createOverlay function
playBtn.addEventListener('click', () => {
  if (!isRunning) {
    isRunning = true;
    startChronometer(counterDisplay, powerDisplay);
    
    // Notify popup to start its timer too
    chrome.runtime.sendMessage({ 
      action: 'startPopupTimer'
    });
  }
});