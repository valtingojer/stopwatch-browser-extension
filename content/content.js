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
// Add these variables at the top with other global variables
let overlayPosition = { x: 120, y: 120 };
let isDragging = false;
let dragOffset = { x: 0, y: 0 };

function createOverlay() {
  const styleElement = document.createElement('style');
  styleElement.textContent = `
    #chronometer-overlay {
      position: fixed;
      top: ${overlayPosition.y}px;
      right: ${overlayPosition.x}px;
      z-index: 9999;
      background: rgba(30, 30, 30, 0.9);
      padding: 10px;
      border-radius: 5px;
      cursor: move;
    }
    
    .chronometer {
      display: flex;
      flex-direction: column;
      align-items: center;
      pointer-events: none;
    }
    
    .digits {
      font-family: monospace, sans-serif;
      font-size: 100px;
      color: #64ffda;
      line-height: 100px;
      pointer-events: none;
    }
    
    .power {
      font-size: 40px;
      vertical-align: super;
      pointer-events: none;
    }
    
    .buttons {
      margin-top: 10px;
      display: flex;
      gap: 10px;
      pointer-events: all;
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
    
    .close-btn {
      position: absolute;
      top: 5px;
      right: 5px;
      background: transparent;
      color: #64ffda;
      border: none;
      cursor: pointer;
      font-size: 16px;
      padding: 2px 6px;
      border-radius: 3px;
      pointer-events: all;
    }
    
    .close-btn:hover {
      background: rgba(255, 255, 255, 0.1);
    }
  `;
  
  // Update overlay HTML
  const overlay = document.createElement('div');
  overlay.id = 'chronometer-overlay';
  overlay.innerHTML = `
    <button class="close-btn">×</button>
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
  
  // Add close button handler
  const closeBtn = overlay.querySelector('.close-btn');
  closeBtn.addEventListener('click', () => {
    isOverlayActive = false;
    chrome.storage.local.set({ overlayState: false });
    overlay.remove();
  });
  
  // Add drag functionality
  overlay.addEventListener('mousedown', (e) => {
    if (e.target === overlay || e.target.classList.contains('chronometer')) {
      isDragging = true;
      const rect = overlay.getBoundingClientRect();
      dragOffset.x = e.clientX - rect.left;
      dragOffset.y = e.clientY - rect.top;
    }
  });
  
  document.addEventListener('mousemove', (e) => {
    if (isDragging) {
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      overlay.style.left = `${newX}px`;
      overlay.style.top = `${newY}px`;
      overlay.style.right = 'auto';
    }
  });
  
  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      const rect = overlay.getBoundingClientRect();
      overlayPosition = { x: rect.left, y: rect.top };
      // Save position to storage
      chrome.storage.local.set({ overlayPosition });
    }
  });
  
  // Add event listeners
  const playBtn = overlay.querySelector('.play-btn');
  const stopBtn = overlay.querySelector('.stop-btn');
  const counterDisplay = overlay.querySelector('.counter');
  const powerDisplay = overlay.querySelector('.power');

  playBtn.addEventListener('click', () => {
    if (!isRunning) {
      isRunning = true;
      startChronometer(counterDisplay, powerDisplay);
      
      // Notify background script to start timer
      chrome.runtime.sendMessage({ 
        action: 'startTimer',
        source: 'overlay' // Indicate this message came from the overlay
      });
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
      
      // Notify background script to stop timer
      chrome.runtime.sendMessage({ 
        action: 'stopTimer',
        source: 'overlay' // Indicate this message came from the overlay
      });
    }
  });
}

// Function to start the chronometer
// Add these at the top with other global variables
let audioContext = null;
let audioSource = null;
let gainNode = null;
let lowPassFilter = null;

// Initialize Web Audio API components
function initAudio(frequency = 200) {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    gainNode = audioContext.createGain();
    lowPassFilter = audioContext.createBiquadFilter();
    
    // Configure the filter
    lowPassFilter.type = 'lowpass';
    lowPassFilter.frequency.value = frequency; // Configurable frequency cutoff
    lowPassFilter.Q.value = 1; // Quality factor
    
    // Set up the audio processing chain
    gainNode.connect(lowPassFilter);
    lowPassFilter.connect(audioContext.destination);
  }
}

// Modify the function to play sound with specific parameters
function playSound(pitch = 1.0, volume = 1.0, frequency) {
  
  if (!audioContext) initAudio(frequency);
  else {
    // Update the filter frequency for existing audio context
    lowPassFilter.frequency.value = frequency;
  }
  
  // Create a new audio buffer source
  const source = audioContext.createBufferSource();
  fetch(chrome.runtime.getURL('assets/toc.mp3'))
    .then(response => response.arrayBuffer())
    .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
    .then(audioBuffer => {
      source.buffer = audioBuffer;
      source.playbackRate.value = pitch;
      gainNode.gain.value = volume;
      
      // Connect the source to our processing chain
      source.connect(gainNode);
      source.start(0);
    })
    .catch(err => console.log('Error playing sound:', err));
}

function startChronometer(counterDisplay, powerDisplay) {
  const baseFrequency = 10000;
  let frequencyMultiplier = 1.0;
  let volume = 1.0;
  let pitch = 1.0;
  intervalId = setInterval(() => {
    counter++;
    if (counter > 9) {
      counter = 0;
      power++;
      if (power > 9) {
        power = 0;
      }
      powerDisplay.textContent = power;
      pitch = 1.0;
      frequencyMultiplier = 1.0;
      volume = 2.0;
      playSound(pitch, volume, baseFrequency * frequencyMultiplier);
    } else if (counter === 5) { // Play at halfway point
      // Play sound with much lower pitch and lower volume
      pitch = 0.5;
      frequencyMultiplier = 0.3;
      volume = 2;
      playSound(pitch, volume, baseFrequency * frequencyMultiplier);
    }
    counterDisplay.textContent = counter;
  }, 1000 / speed);
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

// Function to update the overlay state based on received state
function updateOverlayState(state) {
  // Update running state
  if (state.isRunning !== undefined) {
    isRunning = state.isRunning;
  }
  
  // Update speed
  if (state.speed !== undefined) {
    speed = state.speed;
    
    // If running, restart chronometer with new speed
    if (isRunning) {
      clearInterval(intervalId);
      const counterDisplay = document.querySelector('.counter');
      const powerDisplay = document.querySelector('.power');
      if (counterDisplay && powerDisplay) {
        startChronometer(counterDisplay, powerDisplay);
      }
    }
  }
  
  // Update overlay visibility
  if (state.overlayState !== undefined) {
    toggleOverlay(state.overlayState);
  }
}

// Load initial state from Chrome storage and set up sync
function initializeState() {
  chrome.runtime.sendMessage({ action: 'getState' }, (response) => {
    if (response) {
      isOverlayActive = response.overlayState || false;
      isRunning = response.isRunning || false;
      speed = response.speed || 1.0;
      overlayPosition = response.overlayPosition || { x: 120, y: 120 };
      
      if (isOverlayActive) {
        createOverlay();
        
        // If timer is running, start the chronometer
        if (isRunning) {
          const counterDisplay = document.querySelector('.counter');
          const powerDisplay = document.querySelector('.power');
          if (counterDisplay && powerDisplay) {
            startChronometer(counterDisplay, powerDisplay);
          }
        }
      }
    }
  });
}

// Initialize state when content script loads
initializeState();

// Listen for messages from the extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'stateUpdated') {
    updateOverlayState(message.state);
    sendResponse({ success: true });
  } else if (message.action === 'toggleOverlay') {
    toggleOverlay(message.state);
    sendResponse({ success: true });
  } else if (message.action === 'startOverlayCounter') {
    if (!isRunning) {
      isRunning = true;
      const counterDisplay = document.querySelector('.counter');
      const powerDisplay = document.querySelector('.power');
      if (counterDisplay && powerDisplay) {
        startChronometer(counterDisplay, powerDisplay);
      }
    }
    sendResponse({ success: true });
  } else if (message.action === 'stopOverlayCounter') {
    if (isRunning) {
      isRunning = false;
      clearInterval(intervalId);
      counter = 0;
      power = 0;
      
      // Update the display if overlay exists
      const counterDisplay = document.querySelector('.counter');
      const powerDisplay = document.querySelector('.power');
      if (counterDisplay && powerDisplay) {
        counterDisplay.textContent = counter;
        powerDisplay.textContent = power;
      }
    }
    sendResponse({ success: true });
  } else if (message.action === 'updateSpeed') {
    speed = message.speed;
    if (isRunning) {
      clearInterval(intervalId);
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
