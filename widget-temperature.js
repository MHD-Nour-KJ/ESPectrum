/**
 * ESPectrum - Temperature Gauge Widget
 * Radial gauge displaying ESP32 internal temperature
 */

import store from './app-store.js';
import RadialGauge from './chart-radial.js';

export default class TemperatureWidget {
    constructor(container) {
        this.container = container;
        this.gauge = null;
        this.unsubscribe = null;
    }

    render() {
        this.container.innerHTML = `
      <div style="height: 300px; position: relative;">
        <canvas id="temp-gauge"></canvas>
      </div>
      <div class="temp-info" style="text-align: center; margin-top: var(--spacing-sm);">
        <p class="mono" style="font-size: 0.875rem; color: var(--text-secondary); margin: 0;">
          <i class="ph ph-thermometer"></i>
          Internal Chip Temperature
        </p>
      </div>
    `;

        // Initialize gauge
        const canvas = this.container.querySelector('#temp-gauge');
        this.gauge = new RadialGauge(canvas, {
            min: 0,
            max: 100,
            value: 0,
            unit: '°C',
            color: '#FF864A'
        });

        // Subscribe to store
        this.subscribeToStore();
    }

    subscribeToStore() {
        this.unsubscribe = store.subscribe('sensorData', (data) => {
            if (data && data.temp !== undefined) {
                this.gauge.update(data.temp);

                // Change color based on temperature
                if (data.temp > 60) {
                    this.gauge.setColor('#EF4444'); // Red - hot
                } else if (data.temp > 45) {
                    this.gauge.setColor('#FF864A'); // Orange - warm
                } else {
                    this.gauge.setColor('#10B981'); // Green - normal
                }
            }
        });
    }

    cleanup() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }
        if (this.gauge) {
            this.gauge.destroy();
        }
    }
}
