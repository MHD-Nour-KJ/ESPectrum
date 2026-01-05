/**
 * ESPectrum - Hall Effect Sensor Widget
 * Real-time chart of magnetic field strength
 */

import store from './app-store.js';
import LineChart from './chart-line.js';
import { formatTime } from './utils-helpers.js';

export default class HallSensorWidget {
    constructor(container) {
        this.container = container;
        this.chart = null;
        this.unsubscribe = null;
    }

    render() {
        this.container.innerHTML = `
      <div style="height: 300px; position: relative;">
        <canvas id="hall-chart"></canvas>
      </div>
    `;

        // Initialize chart
        const canvas = this.container.querySelector('#hall-chart');
        this.chart = new LineChart(canvas, {
            label: 'Hall Sensor',
            color: '#FFE14A',
            backgroundColor: 'rgba(255, 225, 74, 0.1)',
            min: -128,
            max: 127,
            maxDataPoints: 50
        });

        // Subscribe to store
        this.subscribeToStore();
    }

    subscribeToStore() {
        this.unsubscribe = store.subscribe('sensorData', (data) => {
            if (data && data.hall !== undefined) {
                const timestamp = formatTime(Date.now());
                this.chart.addData(timestamp, data.hall);
            }
        });
    }

    cleanup() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }
        if (this.chart) {
            this.chart.destroy();
        }
    }
}
