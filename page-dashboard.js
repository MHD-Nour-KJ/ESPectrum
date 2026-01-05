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
import { formatUptime } from './utils-helpers.js';

export default {
  widgets: [],
  unsubscribers: [],

  async render(container) {
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

    // Subscribe to uptime updates
    this.subscribeToUptime();

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
    const unsubscribe = store.subscribe('sensorData', (data) => {
      if (!data) return;

      // Update Uptime
      if (data.uptime !== undefined) {
        const uptimeDisplay = document.getElementById('uptime-display');
        if (uptimeDisplay) uptimeDisplay.textContent = `Uptime: ${formatUptime(data.uptime)}`;
      }

      // Update Widgets
      // Map flat data structure from ESP32 to widgets

      // 1. Touch Widget
      const touchWidget = this.widgets[0];
      if (touchWidget && data.touch !== undefined) {
        touchWidget.update(data.touch);
      }

      // 2. Hall Widget
      const hallWidget = this.widgets[1];
      if (hallWidget && data.hall !== undefined) {
        hallWidget.update(data.hall);
      }

      // 3. Temp Widget
      const tempWidget = this.widgets[2];
      if (tempWidget && data.temp !== undefined) {
        tempWidget.update(data.temp);
      }
    });

    this.unsubscribers.push(unsubscribe);
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
