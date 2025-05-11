let isOverlayActive = false;
let isRunning = false;
let counter = 0;
let power = 0;
let speed = 1.0;
let intervalId = null;

function createOverlay() {
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
  }, 1000 / speed); // 1000ms dividido pela velocidade
}

// Função para ativar/desativar o overlay
function toggleOverlay(state) {
  if (state === isOverlayActive) return; // Não faz nada se o estado não mudar
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
  chrome.storage.sync.set({ overlayState: isOverlayActive });
}

// Carrega o estado inicial do overlay
chrome.storage.sync.get(['overlayState', 'speed'], (result) => {
  isOverlayActive = result.overlayState || false;
  speed = result.speed || 1.0;
  if (isOverlayActive) {
    createOverlay();
  }
});

// Recebe mensagens do popup ou background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'toggleOverlay') {
    toggleOverlay(message.state);
  } else if (message.action === 'updateSpeed') {
    speed = message.speed;
    if (isRunning) {
      clearInterval(intervalId);
      const counterDisplay = document.querySelector('.counter');
      const powerDisplay = document.querySelector('.power');
      startChronometer(counterDisplay, powerDisplay);
    }
  }
});