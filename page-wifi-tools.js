/**
 * ESPectrum - WiFi Tools Page
 * Handles WiFi Scanner (Radar), Sonar (Distance), and Traffic Matrix
 */

import store from './app-store.js';
import mqtt from './service-socket.js';
import { wrapCommand } from './utils-feedback.js';
import { showToast } from './utils-helpers.js';
import Chart from 'chart.js/auto';

export default class PageWifiTools {
  constructor() {
    this.chart = null;
    this.unsubscribe = null;
  }

  async render(container) {
    this.container = container;
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
    }

    // Subscribe to store updates
    this.unsubscribe = store.subscribe('*', () => this.updateView());

    return () => this.cleanup();
  }

  updateView() {
    const route = window.location.hash.slice(1).split('?')[0];
    if (route === '/wifi-scanner') {
      this.updateScannerUI();
    } else if (route === '/wifi-sonar') {
      this.updateSonarUI();
    } else if (route === '/wifi-traffic') {
      this.updateTrafficUI();
    } else if (route === '/defense') {
      this.updateDefenseUI();
    }
  }

  // ... (Scanner code)

  updateTrafficUI() {
    const history = store.getState().packetHistory || [];
    const log = document.getElementById('traffic-log');
    const countEl = document.getElementById('pkt-count');
    if (!log) return;

    if (!Array.isArray(history) || history.length === 0) {
      log.innerHTML = '<div class="text-tertiary">> Awaiting capture command...</div>';
      if (countEl) countEl.textContent = '0 Packets';
      return;
    }

    log.innerHTML = history.map(pkt => `
      <div style="border-bottom: 1px solid #111; padding: 2px 0;">
        <span style="color: #777;">[${new Date().toLocaleTimeString()}]</span> 
        <span style="color: #3b82f6;">${pkt.type}</span> 
        FROM:${pkt.from || '??:??:??'} -> TO:${pkt.to || '??:??:??'} 
        <span style="color: #facc15;">RSSI:${pkt.rssi}</span>
      </div>
    `).join('');

    if (countEl) countEl.textContent = `${history.length} Packets (Last 100)`;
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
             <p>Snapshot of local 2.4GHz network topology</p>
           </div>
           <div style="flex:1;"></div>
           <button class="btn btn-primary" id="btn-scan">
             <i class="ph ph-arrows-clockwise"></i> Start Scan
           </button>
        </div>

        <div class="grid grid-2 gap-lg" style="margin-top: var(--spacing-lg);">
            <div class="glass-card" style="padding: var(--spacing-md); height: 45vh; position: relative;">
                <canvas id="wifi-radar-chart"></canvas>
            </div>
            
            <div class="glass-card" style="padding: var(--spacing-md); height: 45vh; overflow-y: auto;">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>SSID</th>
                      <th>Signal</th>
                      <th>Sec</th>
                      <th>Ch</th>
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

    this.initRadarChart();
    this.attachScannerListeners();
    this.updateScannerUI();
  }

  attachScannerListeners() {
    const scanBtn = this.container.querySelector('#btn-scan');
    scanBtn?.addEventListener('click', () => {
      wrapCommand(scanBtn, async () => {
        mqtt.send({ type: 'command', action: 'scan_wifi' });
        showToast('WiFi Scanning... please wait.', 'info');
        await new Promise(r => setTimeout(r, 3000));
      }, { loadingText: 'Scanning...', successText: 'Complete' });
    });
  }

  initRadarChart() {
    const ctx = document.getElementById('wifi-radar-chart')?.getContext('2d');
    if (!ctx) return;

    this.chart = new Chart(ctx, {
      type: 'polarArea',
      data: {
        labels: [],
        datasets: [{
          label: 'RSSI',
          data: [],
          backgroundColor: [
            'rgba(104, 74, 255, 0.5)',
            'rgba(255, 225, 74, 0.5)',
            'rgba(255, 134, 74, 0.5)',
            'rgba(74, 222, 128, 0.5)',
            'rgba(244, 63, 94, 0.5)',
            'rgba(14, 165, 233, 0.5)'
          ],
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            angleLines: { color: 'rgba(255,255,255,0.05)' },
            grid: { color: 'rgba(255,255,255,0.1)' },
            pointLabels: { display: false },
            ticks: { display: false }
          }
        },
        plugins: {
          legend: { position: 'bottom', labels: { color: '#888', font: { size: 10 } } }
        }
      }
    });
  }

  updateScannerUI() {
    const networks = store.getState().wifiNetworks;
    const tbody = document.getElementById('network-list-body');
    if (!tbody || !Array.isArray(networks) || networks.length === 0) return;

    tbody.innerHTML = networks.map(net => `
      <tr>
        <td class="mono" style="font-size: 0.85rem; color: #fff;">${net.ssid || '<Hidden>'}</td>
        <td class="mono" style="color: ${this.getRssiColor(net.rssi)}">${net.rssi} dBm</td>
        <td><i class="ph ${net.auth === 'OPEN' ? 'ph-lock-open text-danger' : 'ph-lock text-success'}"></i></td>
        <td class="text-tertiary">${net.channel || '?'}</td>
      </tr>
    `).join('');

    if (this.chart) {
      const topNets = [...networks].sort((a, b) => b.rssi - a.rssi).slice(0, 10);
      this.chart.data.labels = topNets.map(n => n.ssid || '<Hidden>');
      this.chart.data.datasets[0].data = topNets.map(n => Math.min(100, Math.max(0, 100 + n.rssi)));
      this.chart.update();
    }
  }

  getRssiColor(rssi) {
    if (rssi > -60) return '#4ade80';
    if (rssi > -75) return '#facc15';
    return '#f87171';
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
             <p>Estimate distance to target using RSSI trilateration math</p>
           </div>
        </div>

        <div class="grid grid-2 gap-lg" style="margin-top: var(--spacing-xl);">
           <div class="glass-card text-center relative" style="padding: var(--spacing-xl); overflow: hidden;">
              <div class="sonar-ring"></div>
              <h2 style="font-size: 5rem; margin: 0; color: var(--color-accent);" id="dist-value">--</h2>
              <p class="text-muted">METERS (EST)</p>
              <div class="mt-md mono" style="font-size: 1.2rem;">
                RSSI: <span id="dist-rssi" class="text-accent">--</span> dBm
              </div>
           </div>

           <div class="glass-card" style="padding: var(--spacing-lg);">
              <h3 class="mb-md"><i class="ph ph-gear"></i> Calibration</h3>
              
              <div class="form-group mb-md">
                <label class="text-tertiary">Measured Power @ 1m</label>
                <input type="number" id="cal-power" value="-50" class="input-dark">
                <small class="text-tertiary">Standard for ESP32: -50 to -45</small>
              </div>
              
              <div class="form-group">
                <label class="text-tertiary">Environmental Factor (N)</label>
                <input type="number" id="cal-n" value="3.0" step="0.1" class="input-dark">
                <small class="text-tertiary">Indoor: 3.0 | Outdoor: 2.0</small>
              </div>
           </div>
        </div>
      </div>
    `;

    this.updateSonarUI();
  }

  updateSonarUI() {
    const rssi = store.getState().sensorData.rssi;
    const powerEl = document.getElementById('cal-power');
    const nEl = document.getElementById('cal-n');
    const distEl = document.getElementById('dist-value');
    const rssiEl = document.getElementById('dist-rssi');

    if (!powerEl || !nEl || !distEl || rssi === undefined) return;

    const measuredPower = parseFloat(powerEl.value) || -50;
    const N = parseFloat(nEl.value) || 3.0;

    // Dist = 10 ^ ((MeasuredPower - RSSI) / (10 * N))
    const distance = Math.pow(10, (measuredPower - rssi) / (10 * N));

    distEl.textContent = distance.toFixed(2);
    rssiEl.textContent = Math.round(rssi);

    // Animate sonar ring speed based on distance
    const ring = document.querySelector('.sonar-ring');
    if (ring) {
      const speed = Math.min(3, Math.max(0.2, distance / 5));
      ring.style.animationDuration = `${speed}s`;
    }
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
             <p>Real-time 802.11 Layer-2 Packet Sniffer</p>
           </div>
           <div style="flex:1;"></div>
           <button class="btn btn-primary" id="btn-sniff-toggle">
              <i class="ph ph-play"></i> Start Capture
           </button>
        </div>
        
        <div class="glass-card" style="margin-top: 1rem; height: 60vh; overflow: hidden; display: flex; flex-direction: column;">
            <div class="flex-between" style="padding: 1rem; border-bottom: 1px solid rgba(255,255,255,0.05); background: rgba(0,0,0,0.2);">
                <div class="flex gap-md">
                    <span class="badge status-connected" id="sniff-status">Idle</span>
                    <span class="mono text-tertiary" id="pkt-count">0 Packets</span>
                </div>
                <div class="flex gap-sm">
                    <div class="badge status-mock">Ch: 11</div>
                </div>
            </div>
            
            <div id="traffic-log" class="mono" style="flex:1; overflow-y: auto; padding: 1rem; font-size: 0.8rem; background: #000; color: #4ade80;">
                <div class="text-tertiary">> Awaiting capture command...</div>
            </div>
        </div>
      </div>`;

    this.attachTrafficListeners();
  }

  attachTrafficListeners() {
    const btn = this.container.querySelector('#btn-sniff-toggle');
    let isSniffing = false;

    btn?.addEventListener('click', () => {
      isSniffing = !isSniffing;
      if (isSniffing) {
        btn.innerHTML = '<i class="ph ph-stop-circle"></i> Stop Capture';
        btn.classList.replace('btn-primary', 'btn-accent');
        document.getElementById('sniff-status').textContent = 'CAPTURING';
        mqtt.send({ type: 'command', action: 'start_sniffing' });
        showToast('Promiscuous mode active. MQTT may disconnect if heavy traffic.', 'warning');
      } else {
        btn.innerHTML = '<i class="ph ph-play"></i> Start Capture';
        btn.classList.replace('btn-accent', 'btn-primary');
        document.getElementById('sniff-status').textContent = 'IDLE';
        mqtt.send({ type: 'command', action: 'stop_sniffing' });
      }
    });
  }


  // ==================== 4. DEAUTH DETECTOR (DEFENSE) ====================
  renderDefense(container) {
    container.innerHTML = `
      <div class="tool-page fade-in-up">
        <div class="tool-header">
           <div class="icon-badge" style="background: rgba(34, 197, 94, 0.2); color: #22c55e;">
              <i class="ph ph-shield-check"></i>
           </div>
           <div>
             <h1>Deauth Detector</h1>
             <p>Intrusion Detection System (IDS) for 802.11 frames</p>
           </div>
           <div class="badge status-connected pulse">MONITORING</div>
        </div>
        
        <div class="glass-card" style="height: 60vh; overflow: hidden; background: #000; border-color: #065f46; display: flex; flex-direction: column;">
           <div style="background: #064e3b; padding: 0.5rem 1rem; font-family: monospace; font-size: 0.875rem; color: #4ade80;">
             Console Output - Live Log
           </div>
           <div id="defense-log" class="mono" style="flex:1; overflow-y: auto; padding: 1rem; color: #a7f3d0; font-size: 0.85rem;">
               <div style="opacity: 0.5;">[${new Date().toLocaleTimeString()}] System: Waiting for telemetry...</div>
           </div>
        </div>
      </div>`;
  }

  updateDefenseUI() {
    const log = document.getElementById('defense-log');
    const telemetry = store.getState().sensorData; // Or a dedicated alert stream
    // We look for 'alert' field in telemetry (hardware would send this)
    if (telemetry && telemetry.alert) {
      const div = document.createElement('div');
      div.style.color = '#f87171';
      div.style.fontWeight = 'bold';
      div.style.padding = '4px 0';
      div.style.borderBottom = '1px solid #222';
      div.textContent = `[${new Date().toLocaleTimeString()}] ALERT: ${telemetry.alert}`;
      log?.prepend(div);
    }
  }

  cleanup() {
    if (this.chart) this.chart.destroy();
    if (this.unsubscribe) this.unsubscribe();
  }
}
