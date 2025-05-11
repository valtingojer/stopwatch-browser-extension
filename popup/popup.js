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
        overlayActive: false
      };
    },
    
    computed: {
      formattedTime() {
        return this.formatTime(this.time);
      }
    },
    
    methods: {
      startTimer() {
        if (!this.isRunning) {
          this.isRunning = true;
          const startTime = Date.now() - this.time;
          
          this.timer = setInterval(() => {
            this.time = Date.now() - startTime;
          }, 10);
          
          // Save state to Chrome storage
          chrome.storage.local.set({ isRunning: true, startTime: startTime });
        }
      },
      
      stopTimer() {
        if (this.isRunning) {
          clearInterval(this.timer);
          this.isRunning = false;
          this.laps.push(this.time);
          
          // Save state to Chrome storage
          chrome.storage.local.set({ 
            isRunning: false, 
            time: this.time,
            laps: this.laps
          });
        }
      },
      
      resetTimer() {
        clearInterval(this.timer);
        this.time = 0;
        this.isRunning = false;
        
        // Save state to Chrome storage
        chrome.storage.local.set({ 
          isRunning: false, 
          time: 0,
          startTime: null
        });
      },
      
      formatTime(ms) {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        const milliseconds = Math.floor((ms % 1000) / 10);
        
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
      },
      
      clearLaps() {
        this.laps = [];
        chrome.storage.local.set({ laps: [] });
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
        
        // Save to storage
        chrome.storage.local.set({ speed: this.speed });
        
        // Send message to content script to update speed
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, { 
              action: 'updateSpeed', 
              speed: this.speed 
            });
          }
        });
      },
      
      toggleOverlay() {
        this.overlayActive = !this.overlayActive;
        
        // Save to storage
        chrome.storage.local.set({ overlayState: this.overlayActive });
        
        // Send message to content script to toggle overlay
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, { 
              action: 'toggleOverlay', 
              state: this.overlayActive 
            });
          }
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
        
        if (result.overlayState) {
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
});