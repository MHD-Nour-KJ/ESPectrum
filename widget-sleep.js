/**
 * ESPectrum - Deep Sleep Controller Widget
 * Controls ESP32 deep sleep and displays wake-up reports
 */

import store from './app-store.js';
import { hapticFeedback } from './utils-helpers.js';
import cloud from './service-cloud.js';

export default class DeepSleepWidget {
  constructor(container) {
    this.container = container;
    this.unsubscribe = null;
    this.isSleeping = false;
  }

  render() {
    this.container.innerHTML = `
      <div class="sleep-controller">
        <div class="sleep-status" id="sleep-status">
          <div class="status-indicator">
            <i class="ph ph-moon-stars" style="font-size: 3rem; color: var(--color-primary);"></i>
          </div>
          <h4 style="margin: var(--spacing-sm) 0;">Ready for Sleep</h4>
          <p style="color: var(--text-secondary); margin: 0;">
            ESP32 is awake and operational
          </p>
        </div>
        
        <div class="sleep-controls" style="margin-top: var(--spacing-md);">
          <label for="sleep-duration" style="display: block; margin-bottom: var(--spacing-xs); color: var(--text-secondary);">
            Sleep Duration (seconds)
          </label>
          <input 
            type="number" 
            id="sleep-duration" 
            min="5" 
            max="300" 
            value="30" 
            class="sleep-input"
            style="
              width: 100%;
              padding: var(--spacing-sm);
              background: var(--glass-bg);
              border: 1px solid var(--glass-border);
              border-radius: var(--radius-md);
              color: var(--text-primary);
              font-family: var(--font-mono);
              font-size: 1rem;
              margin-bottom: var(--spacing-md);
            "
          />
          
          <button class="btn btn-primary" id="sleep-btn" style="width: 100%;">
            <i class="ph ph-power"></i>
            Send to Deep Sleep
          </button>
        </div>
        
        <div class="wakeup-report" id="wakeup-report" style="display: none; margin-top: var(--spacing-md);">
          <!-- Wakeup report will be inserted here -->
        </div>
      </div>
    `;

    // Attach event listeners
    this.attachEventListeners();

    // Subscribe to store
    this.subscribeToStore();
  }

  attachEventListeners() {
    const sleepBtn = this.container.querySelector('#sleep-btn');
    const durationInput = this.container.querySelector('#sleep-duration');

    sleepBtn?.addEventListener('click', () => {
      const duration = parseInt(durationInput.value) || 30;
      this.sendToSleep(duration);
    });
  }

  subscribeToStore() {
    // Listen for wakeup events
    this.unsubscribe = store.subscribe('lastWakeup', (wakeupData) => {
      if (wakeupData) {
        this.showWakeupReport(wakeupData);
        this.isSleeping = false;
      }
    });

    // Listen for connection status
    store.subscribe('connected', (connected) => {
      if (!connected && this.isSleeping) {
        this.showSleepingStatus();
      }
    });
  }

  sendToSleep(duration) {
    if (!window.wsService) {
      alert('WebSocket not available');
      return;
    }

    // Haptic feedback
    hapticFeedback([50, 100, 50]);

    // Send deep sleep command
    window.wsService.send({
      type: 'command',
      action: 'deep_sleep',
      params: {
        duration: duration
      }
    });

    // Cloud Log
    cloud.log('System', 'Entering Deep Sleep', `Duration: ${duration}s`);

    // Update UI
    this.isSleeping = true;
    this.showSleepingStatus();

    // Hide wakeup report
    const report = this.container.querySelector('#wakeup-report');
    if (report) report.style.display = 'none';
  }

  showSleepingStatus() {
    const statusDiv = this.container.querySelector('#sleep-status');
    if (!statusDiv) return;

    statusDiv.innerHTML = `
      <div class="status-indicator">
        <i class="ph ph-moon spin" style="font-size: 3rem; color: var(--color-accent);"></i>
      </div>
      <h4 style="margin: var(--spacing-sm) 0;">ESP32 Sleeping...</h4>
      <p style="color: var(--text-secondary); margin: 0;">
        Connection lost. Waiting for wake-up...
      </p>
    `;

    // Disable sleep button
    const sleepBtn = this.container.querySelector('#sleep-btn');
    if (sleepBtn) {
      sleepBtn.disabled = true;
      sleepBtn.style.opacity = '0.5';
    }
  }

  showWakeupReport(data) {
    const statusDiv = this.container.querySelector('#sleep-status');
    const reportDiv = this.container.querySelector('#wakeup-report');
    const sleepBtn = this.container.querySelector('#sleep-btn');

    // Update status
    if (statusDiv) {
      statusDiv.innerHTML = `
        <div class="status-indicator">
          <i class="ph ph-check-circle" style="font-size: 3rem; color: var(--color-secondary);"></i>
        </div>
        <h4 style="margin: var(--spacing-sm) 0;">System Awake!</h4>
        <p style="color: var(--text-secondary); margin: 0;">
          ESP32 has successfully woken up
        </p>
      `;
    }

    // Show report
    if (reportDiv) {
      reportDiv.style.display = 'block';
      reportDiv.innerHTML = `
        <div class="glass-card" style="background: var(--glass-bg-hover); border-color: var(--color-secondary);">
          <h4 style="margin: 0 0 var(--spacing-sm);">
            <i class="ph ph-chart-line"></i>
            Wake-Up Report
          </h4>
          <div class="report-grid" style="display: grid; gap: var(--spacing-sm);">
            <div class="report-item">
              <span style="color: var(--text-secondary);">Sleep Duration:</span>
              <strong class="mono">${data.duration}s</strong>
            </div>
            <div class="report-item">
              <span style="color: var(--text-secondary);">Wake Reason:</span>
              <strong class="mono">${data.reason}</strong>
            </div>
            <div class="report-item">
              <span style="color: var(--text-secondary);">Time:</span>
              <strong class="mono">${new Date(data.timestamp).toLocaleTimeString()}</strong>
            </div>
          </div>
        </div>
      `;
    }

    // Re-enable sleep button
    if (sleepBtn) {
      sleepBtn.disabled = false;
      sleepBtn.style.opacity = '1';
    }

    // Haptic feedback for success
    hapticFeedback(200);

    // Cloud Log
    cloud.log('System', 'System Wakeup', `Reason: ${data.reason}, Duration: ${data.duration}s`);
  }

  cleanup() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }
}
