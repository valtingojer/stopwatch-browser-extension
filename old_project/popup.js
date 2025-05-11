document.addEventListener('DOMContentLoaded', () => {
    const speedInput = document.getElementById('speed');
  
    // Carrega a velocidade salva
    chrome.storage.sync.get(['speed'], (result) => {
      if (result.speed) {
        speedInput.value = result.speed;
      }
    });
  
    // Salva a velocidade e atualiza o cronômetro em tempo real
    speedInput.addEventListener('input', () => {
      let speed = parseFloat(speedInput.value);
      if (speed < 0.1) speed = 0.1;
      if (speed > 10.0) speed = 10.0;
      chrome.storage.sync.set({ speed: speed }, () => {
        // Envia a nova velocidade para o content script
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'updateSpeed', speed: speed });
        });
      });
    });
  });