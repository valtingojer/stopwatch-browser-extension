// Initialize Vue application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Define the Vue application
  const app = Vue.createApp({
    // Use the template with id 'stopwatch-template'
    template: '#stopwatch-template',
    
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
      
      updateSpeed() {
        // Ensure speed is within valid range
        if (this.speed < 0.1) this.speed = 0.1;
        if (this.speed > 10.0) this.speed = 10.0;
        
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