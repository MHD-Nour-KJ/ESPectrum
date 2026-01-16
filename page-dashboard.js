/**
 * ESPectrum - Dashboard Page
 * Hardware visualization dashboard with all sensors
 */

import { createCard } from './ui-card.js';
import TouchPinsWidget from './widget-touchpins.js';
import HallSensorWidget from './widget-hallsensor.js';
import TemperatureWidget from './widget-temperature.js';
import DeepSleepWidget from './widget-sleep.js';
import store from './app-store.js';
import { formatUptime, copyToClipboard } from './utils-helpers.js';

export default {
  widgets: [],
  unsubscribers: [],

  async render(container) {
    // Clear previous state
    this.cleanup();

    container.innerHTML = `
      <div class="dashboard-page">
        <!-- Page Header -->
        <div class="dashboard-header" style="margin-bottom: var(--spacing-lg);">
          <div class="flex-between" style="flex-wrap: wrap; gap: var(--spacing-sm);">
            <div>
              <h1 style="margin: 0;">
                <i class="ph ph-gauge"></i>
                Hardware Dashboard
              </h1>
              <p style="color: var(--text-secondary); margin: 0.5rem 0 0;">
                Real-time ESP32 sensor visualization
              </p>
            </div>
            <div class="dashboard-stats" style="display: flex; gap: var(--spacing-sm); flex-wrap: wrap;">
              <div class="badge">
                <i class="ph ph-clock"></i>
                <span id="uptime-display">Uptime: --</span>
              </div>
              <div class="badge">
                <i class="ph ph-broadcast"></i>
                <span id="rssi-display">RSSI: --</span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Widgets Grid -->
        <div class="dashboard-grid grid gap-md" style="grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));">
          <!-- Touch Pins -->
          <div class="glass-card fade-in-up">
            <div class="card-header" style="margin-bottom: var(--spacing-md);">
              <h3 style="margin: 0; display: flex; align-items: center; gap: 0.5rem;">
                <i class="ph ph-hand-tap" style="color: var(--color-primary);"></i>
                Capacitive Touch Pins
              </h3>
              <p style="margin: 0.25rem 0 0; font-size: 0.875rem; color: var(--text-tertiary);">
                10 channels · 0-1023 range
              </p>
            </div>
            <div id="touch-widget"></div>
          </div>
          
          <!-- Hall Effect Sensor -->
          <div class="glass-card fade-in-up" style="animation-delay: 0.1s;">
            <div class="card-header" style="margin-bottom: var(--spacing-md);">
              <h3 style="margin: 0; display: flex; align-items: center; gap: 0.5rem;">
                <i class="ph ph-magnet" style="color: var(--color-secondary);"></i>
                Hall Effect Sensor
              </h3>
              <p style="margin: 0.25rem 0 0; font-size: 0.875rem; color: var(--text-tertiary);">
                Magnetic field strength · -128 to 127
              </p>
            </div>
            <div id="hall-widget"></div>
          </div>
          
          <!-- Temperature Gauge -->
          <div class="glass-card fade-in-up" style="animation-delay: 0.2s;">
            <div class="card-header" style="margin-bottom: var(--spacing-md);">
              <h3 style="margin: 0; display: flex; align-items: center; gap: 0.5rem;">
                <i class="ph ph-thermometer" style="color: var(--color-accent);"></i>
                Internal Temperature
              </h3>
              <p style="margin: 0.25rem 0 0; font-size: 0.875rem; color: var(--text-tertiary);">
                Chip temperature sensor · Celsius
              </p>
            </div>
            <div id="temp-widget"></div>
          </div>
        </div>
        
        <!-- Deep Sleep Section -->
        <div class="sleep-section" style="margin-top: var(--spacing-lg);">
          <div class="glass-card fade-in-up glow-primary" style="animation-delay: 0.3s;">
            <div class="card-header" style="margin-bottom: var(--spacing-md);">
              <h3 style="margin: 0; display: flex; align-items: center; gap: 0.5rem;">
                <i class="ph ph-moon-stars" style="color: var(--color-primary);"></i>
                Deep Sleep Experiment
              </h3>
              <p style="margin: 0.25rem 0 0; font-size: 0.875rem; color: var(--text-tertiary);">
                Test power management and wake-up behavior
              </p>
            </div>
            <div id="sleep-widget"></div>
          </div>
        </div>
      </div>
    `;

    // Initialize widgets
    this.initializeWidgets(container);

    // Subscribe to store updates
    this.subscribeToData();

    // Cleanup function
    return () => this.cleanup();
  },

  initializeWidgets(container) {
    // Touch Pins Widget
    const touchContainer = container.querySelector('#touch-widget');
    const touchWidget = new TouchPinsWidget(touchContainer);
    touchWidget.render();
    this.widgets.push(touchWidget);

    // Hall Sensor Widget
    const hallContainer = container.querySelector('#hall-widget');
    const hallWidget = new HallSensorWidget(hallContainer);
    hallWidget.render();
    this.widgets.push(hallWidget);

    // Temperature Widget
    const tempContainer = container.querySelector('#temp-widget');
    const tempWidget = new TemperatureWidget(tempContainer);
    tempWidget.render();
    this.widgets.push(tempWidget);

    // Deep Sleep Widget
    const sleepContainer = container.querySelector('#sleep-widget');
    const sleepWidget = new DeepSleepWidget(sleepContainer);
    sleepWidget.render();
    this.widgets.push(sleepWidget);
  },

  subscribeToData() {
    this.unsubscribers.push(
      store.subscribe('sensorData', (data) => {
        if (!data) return;

        // Logging for verification (Phase 4 Debugging)
        console.log(`[Dashboard] Data Received - Hall: ${data.hall}, Temp: ${data.temp}, RSSI: ${data.rssi}`);

        // 1. Update Uptime & RSSI
        const uptimeDisplay = document.getElementById('uptime-display');
        if (uptimeDisplay && data.uptime !== undefined) {
          uptimeDisplay.textContent = `Uptime: ${formatUptime(data.uptime)}`;
        }

        const rssiDisplay = document.getElementById('rssi-display');
        if (rssiDisplay && data.rssi !== undefined) {
          rssiDisplay.textContent = `RSSI: ${data.rssi} dBm`;
        }

        // 2. Update Widgets (Mapping fields from ESP32 JSON)
        // Widgets are stored in order: [0:Touch, 1:Hall, 2:Temp, 3:Sleep]
        if (this.widgets.length >= 3) {
          // Touch Pins (Index 0)
          if (data.touch !== undefined) {
            this.widgets[0].update(data.touch);
          }

          // Hall Sensor (Index 1) - ONLY update with data.hall
          if (data.hall !== undefined) {
            this.widgets[1].update(data.hall);
          }

          // Temperature (Index 2) - ONLY update with data.temp
          if (data.temp !== undefined) {
            this.widgets[2].update(data.temp);
          }
        }
      })
    );
  },

  cleanup() {
    // Cleanup all widgets
    this.widgets.forEach(widget => {
      if (widget.cleanup) widget.cleanup();
    });
    this.widgets = [];

    // Unsubscribe from store
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];
  }
};
