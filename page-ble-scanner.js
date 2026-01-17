/**
 * ESPectrum - BLE Scanner Page
 * Visualizes Bluetooth Low Energy devices in range
 */

import store from './app-store.js';
import mqtt from './service-socket.js';
import { wrapCommand } from './utils-feedback.js';
import { showToast } from './utils-helpers.js';

export default class PageBleScanner {
    constructor() {
        this.unsubscribe = null;
    }

    async render(container) {
        this.container = container;
        container.innerHTML = `
      <div class="tool-page fade-in-up">
        <div class="tool-header">
           <div class="icon-badge" style="background: rgba(74, 222, 128, 0.2); color: #4ade80;">
              <i class="ph ph-bluetooth"></i>
           </div>
           <div>
             <h1>BLE Scanner</h1>
             <p>Discover Bluetooth Low Energy Beacons & Devices</p>
           </div>
           <div style="flex:1;"></div>
           <button class="btn btn-primary" id="btn-scan-ble">
             <i class="ph ph-arrows-clockwise"></i> Scan BLE
           </button>
        </div>

        <div class="grid grid-2 gap-lg" style="margin-top: var(--spacing-lg);">
            <!-- List View -->
            <div class="glass-card full-width" style="padding: var(--spacing-md); height: 60vh; overflow-y: auto;">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Device Name</th>
                      <th>Address</th>
                      <th>RSSI</th>
                      <th>Last Seen</th>
                    </tr>
                  </thead>
                  <tbody id="ble-list-body">
                    <tr><td colspan="4" class="text-center text-tertiary">Click Scan to start...</td></tr>
                  </tbody>
                </table>
            </div>
        </div>
      </div>
    `;

        this.attachListeners();
        this.unsubscribe = store.subscribe('bleDevices', () => this.updateUI());
    }

    attachListeners() {
        const btn = this.container.querySelector('#btn-scan-ble');
        btn?.addEventListener('click', () => {
            wrapCommand(btn, async () => {
                mqtt.send({ type: 'command', action: 'ble_scan' }); // or 'scan_ble'
                // Actually the firmware looks for 'scan_ble' in one place and 'ble_scan' isn't standard
                // Let's check firmware: strnomp(action, "scan_ble")
                mqtt.send({ type: 'command', action: 'scan_ble' });

                showToast('Scanning BLE (3s)... WiFi will pause.', 'info');
                // UI optimistic update
                const tbody = document.getElementById('ble-list-body');
                if (tbody) tbody.innerHTML = '<tr><td colspan="4" class="text-center text-accent"><i class="ph ph-spinner spin"></i> Scanning...</td></tr>';

                await new Promise(r => setTimeout(r, 4000));
            }, { loadingText: 'Scanning...', successText: 'Done' });
        });
    }

    updateUI() {
        const devices = store.getState().bleDevices || [];
        const tbody = document.getElementById('ble-list-body');
        if (!tbody) return;

        if (devices.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-tertiary">No devices found.</td></tr>';
            return;
        }

        // Sort by RSSI
        const sorted = [...devices].sort((a, b) => b.rssi - a.rssi);

        tbody.innerHTML = sorted.map(dev => `
      <tr>
        <td class="text-white font-bold">${dev.name || '<Unknown>'}</td>
        <td class="mono text-tertiary">${dev.addr}</td>
        <td style="color: ${this.getRssiColor(dev.rssi)}">${dev.rssi} dBm</td>
        <td class="text-tertiary">Just now</td>
      </tr>
    `).join('');
    }

    getRssiColor(rssi) {
        if (rssi > -60) return '#4ade80';
        if (rssi > -75) return '#facc15';
        return '#f87171';
    }

    cleanup() {
        if (this.unsubscribe) this.unsubscribe();
    }
}
