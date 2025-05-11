chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
      id: 'toggleChronometer',
      title: 'Ligar',
      contexts: ['action']
    });
  });
  
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'toggleChronometer') {
      chrome.storage.sync.get(['overlayState'], (result) => {
        const currentState = result.overlayState || false;
        const newState = !currentState;
        chrome.contextMenus.update('toggleChronometer', {
          title: newState ? 'Desligar' : 'Ligar'
        });
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'toggleOverlay', state: newState });
        });
      });
    }
  });