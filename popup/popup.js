// Initialize Vue application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Define the Vue application
  const app = Vue.createApp({
    // Use render function instead of template
    render() {
      const h = Vue.h;
      
      return h('div', { class: 'stopwatch-container' }, [
        h('h1', 'Stopwatch'),
        h('div', { class: 'time-display' }, this.formattedTime),
        h('div', { class: 'controls' }, [
          !this.isRunning ? h('button', { onClick: this.startTimer }, 'Start') : null,
          this.isRunning ? h('button', { onClick: this.stopTimer }, 'Stop') : null,
          h('button', { onClick: this.resetTimer }, 'Reset')
        ]),
        h('div', { class: 'speed-control' }, [
          h('label', 'Speed Control:'),
          h('div', { class: 'speed-display' }, `${this.speed.toFixed(1)}x`),
          h('input', { 
            type: 'range', 
            class: '',
            id: 'speed-slider', 
            value: this.speed,
            min: 0.1,
            max: 10.0,
            step: 0.1,
            onInput: this.handleSpeedInput
          }),
          h('div', { class: 'speed-buttons' }, [
            h('button', { onClick: this.decreaseSpeed }, '-'),
            h('button', { onClick: this.increaseSpeed }, '+')
          ])
        ]),
        h('div', { class: 'overlay-control' }, [
          h('button', { onClick: this.toggleOverlay }, 
            this.overlayActive ? 'Hide Overlay' : 'Show Overlay')
        ]),
        this.laps.length > 0 ? h('div', { class: 'lap-times' }, [
          h('h2', 'Lap Times'),
          h('ul', this.laps.map((lap, index) => 
            h('li', `Lap ${index + 1}: ${this.formatTime(lap)}`)
          )),
          h('button', { onClick: this.clearLaps }, 'Clear Laps')
        ]) : null
      ]);
    },
    
    // Options API pattern
    data() {
      return {
        time: 0,
        isRunning: false,
        timer: null,
        laps: [],
        speed: 1.0,
        overlayActive: false,
        lastSyncTime: 0
      };
    },
    
    computed: {
      formattedTime() {
        return this.formatTime(this.time);
      }
    },
    
    mounted() {
      // Load saved state from background script
      this.syncStateFromBackground();
      
      // Set up periodic sync to keep time updated
      this.syncTimer = setInterval(() => {
        if (this.isRunning) {
          this.syncStateFromBackground();
        }
      }, 1000);
      
      // Listen for state updates from background
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'stateUpdated') {
          this.updateStateFromMessage(message.state);
        }
      });
    },
    
    beforeUnmount() {
      // Clear all timers when component is unmounted
      clearInterval(this.timer);
      clearInterval(this.syncTimer);
    },
    
    methods: {
      syncStateFromBackground() {
        chrome.runtime.sendMessage({ action: 'getState' }, (response) => {
          if (response) {
            this.updateStateFromMessage(response);
          }
        });
      },
      
      updateStateFromMessage(state) {
        // Update timer state
        if (state.isRunning !== undefined) {
          this.isRunning = state.isRunning;
        }
        
        // Update time
        if (state.time !== undefined) {
          this.time = state.time;
        }
        
        // Update laps
        if (state.laps !== undefined) {
          this.laps = state.laps;
        }
        
        // Update speed
        if (state.speed !== undefined) {
          this.speed = state.speed;
        }
        
        // Update overlay state
        if (state.overlayState !== undefined) {
          this.overlayActive = state.overlayState;
        }
        
        // If timer is running, update the local timer
        if (this.isRunning) {
          if (this.timer) {
            clearInterval(this.timer);
          }
          
          const startTime = state.startTime || (Date.now() - this.time);
          this.timer = setInterval(() => {
            this.time = Date.now() - startTime;
          }, 10);
        } else if (!this.isRunning && this.timer) {
          clearInterval(this.timer);
          this.timer = null;
        }
      },
      
      startTimer() {
        if (!this.isRunning) {
          // Send message to background to start timer
          chrome.runtime.sendMessage({ 
            action: 'startTimer',
            currentTime: this.time
          });
        }
      },
      
      stopTimer() {
        if (this.isRunning) {
          // Send message to background to stop timer and add lap
          chrome.runtime.sendMessage({ 
            action: 'stopTimer',
            addLap: true
          });
        }
      },
      
      resetTimer() {
        // Send message to background to reset timer
        chrome.runtime.sendMessage({ action: 'resetTimer' });
      },
      
      clearLaps() {
        // Send message to background to clear laps
        chrome.runtime.sendMessage({ action: 'clearLaps' });
      },
      
      formatTime(ms) {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        const milliseconds = Math.floor((ms % 1000) / 10);
        
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
      },
      
      handleSpeedInput(event) {
        this.updateSpeedValue(parseFloat(event.target.value));
      },
      
      increaseSpeed() {
        let newSpeed = Math.min(10.0, this.speed + 0.1);
        this.updateSpeedValue(parseFloat(newSpeed.toFixed(1)));
      },
      
      decreaseSpeed() {
        let newSpeed = Math.max(0.1, this.speed - 0.1);
        this.updateSpeedValue(parseFloat(newSpeed.toFixed(1)));
      },
      
      updateSpeedValue(newSpeed) {
        // Ensure speed is within valid range
        if (newSpeed < 0.1) newSpeed = 0.1;
        if (newSpeed > 10.0) newSpeed = 10.0;
        
        this.speed = newSpeed;
        
        // Update the hidden input value
        const speedSlider = document.getElementById('speed-slider');
        if (speedSlider) {
          speedSlider.value = this.speed;
        }
        
        // Send message to background to update speed
        chrome.runtime.sendMessage({ 
          action: 'updateSpeed', 
          speed: this.speed 
        });
      },
      
      toggleOverlay() {
        const newState = !this.overlayActive;
        
        // Send message to background to toggle overlay
        chrome.runtime.sendMessage({ 
          action: 'toggleOverlay', 
          state: newState 
        });
      }
    },
    
    mounted() {
      // Load saved state from Chrome storage
      chrome.storage.local.get(['isRunning', 'time', 'startTime', 'laps', 'speed', 'overlayState'], (result) => {
        if (result.laps) {
          this.laps = result.laps;
        }
        
        if (result.speed) {
          this.speed = result.speed;
        }
        
        if (result.overlayState !== undefined) {
          this.overlayActive = result.overlayState;
        }
        
        if (result.isRunning) {
          // Resume timer if it was running
          this.isRunning = true;
          const startTime = result.startTime;
          
          this.timer = setInterval(() => {
            this.time = Date.now() - startTime;
          }, 10);
        } else if (result.time) {
          // Just restore the time if it wasn't running
          this.time = result.time;
        }
      });
      
      // Listen for messages from background script
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'timerStateChanged') {
          // Reload state from storage
          chrome.storage.local.get(['isRunning', 'time', 'startTime', 'laps'], (result) => {
            if (result.isRunning && !this.isRunning) {
              // Start timer if it should be running
              this.isRunning = true;
              const startTime = result.startTime;
              
              this.timer = setInterval(() => {
                this.time = Date.now() - startTime;
              }, 10);
            } else if (!result.isRunning && this.isRunning) {
              // Stop timer if it should be stopped
              clearInterval(this.timer);
              this.isRunning = false;
              this.time = result.time;
            }
            
            // Update laps
            if (result.laps) {
              this.laps = result.laps;
            }
          });
        }
      });
    },
    
    beforeUnmount() {
      // Clean up interval when component is destroyed
      if (this.timer) {
        clearInterval(this.timer);
      }
    }
  });
  
  // Mount the Vue application
  app.mount('#app');
  
  // Listen for messages from content script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'startPopupTimer') {
      // Get the Vue instance and start the timer
      const vueApp = document.querySelector('#app').__vue_app__;
      if (vueApp) {
        const vm = vueApp._instance.proxy;
        if (!vm.isRunning) {
          vm.startTimer();
        }
      }
      sendResponse({ success: true });
    } else if (message.action === 'stopPopupTimer') {
      // Get the Vue instance and stop the timer
      const vueApp = document.querySelector('#app').__vue_app__;
      if (vueApp) {
        const vm = vueApp._instance.proxy;
        if (vm.isRunning) {
          vm.stopTimer();
        }
      }
      sendResponse({ success: true });
    }
    return true;
  });
});