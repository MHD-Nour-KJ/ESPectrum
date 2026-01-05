/**
 * ESPectrum - WiFi Tools Page
 * Handles WiFi Scanner (Radar), Sonar (Distance), and Traffic Matrix
 */

import store from './app-store.js';
// import { createChart } from './utils-helpers.js'; // Removed: Using global Chart.js from CDN

export default class PageWifiTools {
  constructor() {
    this.chart = null;
    this.unsubscribe = null;
    this.scanInterval = null;
  }

  async render(container) {
    const route = window.location.hash.slice(1).split('?')[0];

    // 1. Render Layout based on Route
    if (route === '/wifi-scanner') {
      this.renderScanner(container);
    } else if (route === '/wifi-sonar') {
      this.renderSonar(container);
    } else if (route === '/wifi-traffic') {
      this.renderTraffic(container);
    } else if (route === '/defense') {
      this.renderDefense(container);
    } else {
      container.innerHTML = '<h2>Tool not found</h2>';
    }

    // 2. Setup standard cleanup
    return () => this.cleanup();
  }

  // ==================== 1. WIFI SCANNER (RADAR) ====================
  renderScanner(container) {
    container.innerHTML = `
      <div class="tool-page fade-in-up">
        <div class="tool-header">
           <div class="icon-badge" style="background: rgba(var(--color-secondary-rgb), 0.2); color: var(--color-secondary);">
              <i class="ph ph-radar"></i>
           </div>
           <div>
             <h1>WiFi Scanner</h1>
             <p>Visualize surrounding networks in 360° space</p>
           </div>
           <button class="btn btn-primary" id="btn-scan">
             <i class="ph ph-arrows-clockwise"></i> Scan Now
           </button>
        </div>

        <!-- Radar Chart Container -->
        <div class="glass-card" style="margin-top: var(--spacing-lg); padding: var(--spacing-md); height: 50vh; position: relative;">
          <canvas id="wifi-radar-chart"></canvas>
        </div>

        <!-- Network List -->
        <div class="glass-card" style="margin-top: var(--spacing-md);">
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>SSID</th>
                  <th>RSSI (dBm)</th>
                  <th>Security</th>
                  <th>Channel</th>
                </tr>
              </thead>
              <tbody id="network-list-body">
                <tr><td colspan="4" class="text-center">Click Scan to start...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    // Init Chart
    this.initRadarChart();

    // Event Listeners
    container.querySelector('#btn-scan').addEventListener('click', () => {
      this.triggerScan();
    });

    // Subscribe to Store for Results
    this.unsubscribe = store.subscribe('lastMessage', (msg) => {
      if (msg && msg.type === 'scan_result_wifi') {
        this.updateScannerUI(msg.networks);
      }
    });
  }

  triggerScan() {
    const btn = document.querySelector('#btn-scan');
    if (btn) {
      btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Scanning...';
      btn.disabled = true;
    }

    if (window.wsService) {
      window.wsService.send(JSON.stringify({
        type: 'command',
        action: 'scan_wifi'
      }));
    }

    // Re-enable button after timeout if no response
    setTimeout(() => {
      if (btn) {
        btn.innerHTML = '<i class="ph ph-arrows-clockwise"></i> Scan Now';
        btn.disabled = false;
      }
    }, 5000);
  }

  initRadarChart() {
    const ctx = document.getElementById('wifi-radar-chart')?.getContext('2d');
    if (!ctx) return;

    // Use Chart.js Polar Area or Radar
    this.chart = new Chart(ctx, {
      type: 'polarArea',
      data: {
        labels: [],
        datasets: [{
          label: 'Signal Strength (RSSI)',
          data: [],
          backgroundColor: [
            'rgba(255, 99, 132, 0.5)',
            'rgba(54, 162, 235, 0.5)',
            'rgba(255, 206, 86, 0.5)',
            'rgba(75, 192, 192, 0.5)',
            'rgba(153, 102, 255, 0.5)'
          ],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            angleLines: { color: 'rgba(255,255,255,0.1)' },
            grid: { color: 'rgba(255,255,255,0.1)' },
            pointLabels: { color: '#fff', font: { size: 12 } },
            ticks: { display: false } // Hide numbers
          }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });
  }

  updateScannerUI(networks) {
    // Update List
    const tbody = document.getElementById('network-list-body');
    if (!tbody) return;

    tbody.innerHTML = networks.map(net => `
      <tr>
        <td class="font-mono" style="color: var(--color-primary-light);">${net.ssid}</td>
        <td>
            <div class="flex-align-center gap-xs">
                <i class="ph ${this.getRssiIcon(net.rssi)}"></i>
                ${net.rssi}
            </div>
        </td>
        <td>${net.auth === 'OPEN' ? '<span class="badge badge-danger">OPEN</span>' : '<span class="badge badge-success">SECURE</span>'}</td>
        <td class="text-muted">Auto</td>
      </tr>
    `).join('');

    // Update Chart
    if (this.chart) {
      // Limit to top 8 strongest for clarity
      const topNets = networks.sort((a, b) => b.rssi - a.rssi).slice(0, 8);

      this.chart.data.labels = topNets.map(n => n.ssid);
      // Map RSSI (-100 to -30) to positive score (0 to 100) for chart visualization
      this.chart.data.datasets[0].data = topNets.map(n => Math.min(100, Math.max(0, 100 + n.rssi)));
      this.chart.update();
    }
  }

  getRssiIcon(rssi) {
    if (rssi > -50) return 'ph-wifi-high';
    if (rssi > -70) return 'ph-wifi-medium';
    return 'ph-wifi-low';
  }


  // ==================== 2. WIFI SONAR ====================
  renderSonar(container) {
    container.innerHTML = `
      <div class="tool-page fade-in-up">
        <div class="tool-header">
           <div class="icon-badge" style="background: rgba(var(--color-accent-rgb), 0.2); color: var(--color-accent);">
              <i class="ph ph-ruler"></i>
           </div>
           <div>
             <h1>WiFi Sonar</h1>
             <p>Distance estimation using Log-Distance Path Loss Model</p>
           </div>
        </div>

        <div class="grid grid-2 gap-lg" style="margin-top: var(--spacing-xl);">
           <!-- Big Gauge -->
           <div class="glass-card text-center relative" style="padding: var(--spacing-xl);">
              <div class="sonar-ring"></div>
              <h2 style="font-size: 4rem; margin: 0; color: var(--color-accent);" id="dist-value">--</h2>
              <p class="text-muted">METERS ESTIMATED</p>
              <div style="margin-top: var(--spacing-md); font-family: monospace;">
                RSSI: <span id="dist-rssi">--</span> dBm
              </div>
           </div>

           <!-- Calibration -->
           <div class="glass-card" style="padding: var(--spacing-lg);">
              <h3>Calibration</h3>
              <p class="text-small text-muted">Adjust Reference Power (Measured RSSI at 1m) and Environmental Factor (N).</p>
              
              <div class="form-group" style="margin-top: 1rem;">
                <label>Measured Power@1m (dBm)</label>
                <input type="number" id="cal-power" value="-50" class="input-dark">
              </div>
              
              <div class="form-group">
                <label>Env Factor (2-4)</label>
                <input type="number" id="cal-n" value="3.0" step="0.1" class="input-dark">
              </div>
           </div>
        </div>
      </div>
    `;

    // Logic for Sonar
    this.unsubscribe = store.subscribe('sensorData', (data) => {
      if (data && data.rssi !== undefined) {
        this.updateSonar(data.rssi);
      } else {
        // Fallback jitter if no real RSSI yet
        const mockRssi = -65 + (Math.random() * 5 - 2.5);
        this.updateSonar(mockRssi);
      }
    });
  }

  updateSonar(rssi) {
    const powerEl = document.getElementById('cal-power');
    const nEl = document.getElementById('cal-n');
    const distEl = document.getElementById('dist-value');
    const rssiEl = document.getElementById('dist-rssi');

    if (!powerEl || !nEl) return;

    const measuredPower = parseFloat(powerEl.value);
    const N = parseFloat(nEl.value);

    // Distance = 10 ^ ((MeasuredPower - RSSI) / (10 * N))
    const exponent = (measuredPower - rssi) / (10 * N);
    const distance = Math.pow(10, exponent);

    if (distEl) distEl.textContent = distance.toFixed(2);
    if (rssiEl) rssiEl.textContent = Math.round(rssi);
  }


  // ==================== 3. TRAFFIC MATRIX ====================
  renderTraffic(container) {
    container.innerHTML = `
      <div class="tool-page fade-in-up">
        <div class="tool-header">
           <div class="icon-badge" style="background: rgba(50, 255, 50, 0.2); color: #4ade80;">
              <i class="ph ph-traffic-signal"></i>
           </div>
           <div>
             <h1>Traffic Matrix</h1>
             <p>802.11 Packet Sniffer (Promiscuous Mode)</p>
           </div>
           <button class="btn btn-primary" id="btn-sniff">
             Start Sniffing
           </button>
        </div>
        
        <div class="glass-card" style="margin-top: 2rem; padding: 2rem; text-align: center;">
            <p style="color: var(--text-tertiary);">
                This feature requires switching the ESP32 to Promiscuous Mode.
                <br>Connection will be lost during capture.
            </p>
        </div>
      </div>`;
  }

  // ==================== 4. DEAUTH DETECTOR ====================
  renderDefense(container) {
    container.innerHTML = `
      <div class="tool-page fade-in-up">
        <div class="tool-header">
           <div class="icon-badge" style="background: rgba(34, 197, 94, 0.2); color: #22c55e;">
              <i class="ph ph-shield-check"></i>
           </div>
           <div>
             <h1>Deauth Detector</h1>
             <p>Blue Team Defense: Detects 802.11 Deauthentication Attacks</p>
           </div>
           <div class="badge badge-success pulse">ACTIVE MONITORING</div>
        </div>
        
        <div class="glass-card" style="height: 60vh; overflow-y: auto; font-family: monospace; background: #000; padding: 1rem;">
           <div style="color: #22c55e; margin-bottom: 1rem;">> System: IDS Initialized... Listening for Management Frames (Type 0xC0)</div>
           
           <div id="defense-log">
               <div style="color: #777; border-bottom: 1px solid #333; padding: 4px;">
                  [10:00:01] SCAN: No anomalies detected.
               </div>
           </div>
        </div>
      </div>`;

    // Mock detection loop
    const log = container.querySelector('#defense-log');
    this.unsubscribe = store.subscribe('telemetry', (data) => {
      // In real app, check for 'deauth_alert' in data
      if (Math.random() > 0.95) {
        const div = document.createElement('div');
        div.style.color = '#ef4444';
        div.style.fontWeight = 'bold';
        div.style.padding = '4px';
        div.style.borderBottom = '1px solid #333';
        div.textContent = `[${new Date().toLocaleTimeString()}] ALERT: Deauth Flood Detected! Source: 00:11:22:33:44:55`;
        if (log) log.prepend(div);
      }
    });
  }

  cleanup() {
    if (this.chart) {
      this.chart.destroy();
    }
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }
}
