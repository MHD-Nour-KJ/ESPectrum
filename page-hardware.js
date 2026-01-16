/**
 * ESPectrum - Hardware Tools Page
 * Handles BLE Tools, IR Blaster, and Wall of Sheep
 */

import store from './app-store.js';
import mqtt from './service-socket.js';
import { wrapCommand } from './utils-feedback.js';
import { showToast } from './utils-helpers.js';

export default class PageHardware {
    constructor() {
        this.unsubscribe = null;
    }

    async render(container) {
        this.container = container;
        const route = window.location.hash.slice(1).split('?')[0];

        if (route === '/ble-scanner') {
            this.renderBLEScanner();
        } else if (route === '/ble-hid') {
            this.renderGhostKeyboard();
        } else if (route === '/ir-remote') {
            this.renderIRRemote();
        } else if (route === '/wall-of-sheep') {
            this.renderWallOfSheep();
        }

        this.unsubscribe = store.subscribe('*', () => this.updateView());

        return () => this.cleanup();
    }

    updateView() {
        const route = window.location.hash.slice(1).split('?')[0];
        if (route === '/ble-scanner') {
            this.updateBLEUI();
        } else if (route === '/wall-of-sheep') {
            this.updateSheepUI();
        }
    }

    // ==================== 1. BLE SCANNER ====================
    renderBLEScanner() {
        this.container.innerHTML = `
      <div class="tool-page fade-in-up">
        <div class="tool-header">
           <div class="icon-badge" style="background: rgba(50, 200, 50, 0.2); color: #4ade80;">
              <i class="ph ph-bluetooth"></i>
           </div>
           <div>
             <h1>BLE Scanner</h1>
             <p>Track nearby Bluetooth Low Energy devices</p>
           </div>
           <div style="flex:1;"></div>
           <button class="btn btn-primary" id="btn-scan-ble">
             <i class="ph ph-magnifying-glass"></i> Start Scan
           </button>
        </div>

        <div class="glass-card">
          <table class="data-table">
             <thead>
                <tr>
                   <th>Device / Name</th>
                   <th>Address</th>
                   <th>Signal</th>
                   <th>Class</th>
                </tr>
             </thead>
             <tbody id="ble-list">
                <tr><td colspan="4" class="text-center">Awaiting scan command...</td></tr>
             </tbody>
          </table>
        </div>
      </div>
    `;

        const btn = this.container.querySelector('#btn-scan-ble');
        btn?.addEventListener('click', () => {
            wrapCommand(btn, async () => {
                mqtt.send({ type: 'command', action: 'scan_ble' });
                showToast('Scanning BLE Spectrum...', 'info');
                await new Promise(r => setTimeout(r, 4000));
            }, { successText: 'Finished' });
        });

        this.updateBLEUI();
    }

    updateBLEUI() {
        const devices = store.getState().bleDevices;
        const tbody = document.getElementById('ble-list');
        if (!tbody || devices.length === 0) return;

        tbody.innerHTML = devices.map(d => `
            <tr>
                <td>
                    <div style="font-weight: 500;">${d.name || '<Unnamed>'}</div>
                    <div class="text-tertiary" style="font-size: 0.75rem;">UUID: ${d.uuid || 'N/A'}</div>
                </td>
                <td class="mono" style="opacity: 0.7;">${d.addr}</td>
                <td class="mono" style="color: ${d.rssi > -70 ? '#4ade80' : '#888'}">${d.rssi} dBm</td>
                <td><span class="badge ${d.name ? 'status-connected' : 'status-mock'}">${d.name ? 'Device' : 'Beacon'}</span></td>
            </tr>
        `).join('');
    }

    // ==================== 2. GHOST KEYBOARD (HID) ====================
    renderGhostKeyboard() {
        this.container.innerHTML = `
      <div class="tool-page fade-in-up">
        <div class="tool-header">
           <div class="icon-badge" style="background: rgba(200, 50, 200, 0.2); color: #d946ef;">
              <i class="ph ph-keyboard"></i>
           </div>
           <div>
             <h1>Ghost Keyboard</h1>
             <p>Emulate a Bluetooth HID Keyboard via ESP32</p>
           </div>
        </div>

        <div class="grid grid-2 gap-lg" style="margin-top: 1rem;">
            <div class="glass-card" style="padding: 1.5rem;">
                <h3 class="mb-lg"><i class="ph ph-speaker-high"></i> Multimedia</h3>
                <div class="flex gap-md wrap">
                    <button class="btn btn-icon hid-key" data-key="vol_up" title="Vol Up"><i class="ph ph-speaker-high"></i></button>
                    <button class="btn btn-icon hid-key" data-key="vol_down" title="Vol Down"><i class="ph ph-speaker-low"></i></button>
                    <button class="btn btn-icon hid-key" data-key="play_pause" title="Play/Pause"><i class="ph ph-play-pause"></i></button>
                    <button class="btn btn-icon hid-key" data-key="next" title="Next"><i class="ph ph-skip-forward"></i></button>
                    <button class="btn btn-icon hid-key" data-key="mute" title="Mute"><i class="ph ph-speaker-slash"></i></button>
                </div>
                
                <h3 class="mt-xl mb-lg"><i class="ph ph-desktop"></i> OS Controls</h3>
                <div class="flex gap-md wrap">
                    <button class="btn hid-key" data-key="lock_screen">Lock Screen</button>
                    <button class="btn hid-key" data-key="brightness_up">Brighness +</button>
                    <button class="btn hid-key" data-key="spotlight">Search</button>
                </div>
            </div>

            <div class="glass-card" style="padding: 1.5rem;">
                <h3 class="mb-md"><i class="ph ph-terminal"></i> Custom Injection</h3>
                <div class="form-group">
                    <textarea id="hid-content" class="input-dark" style="height: 120px; font-family: monospace;" placeholder="Type content here..."></textarea>
                </div>
                <button class="btn btn-primary mt-md" id="btn-send-text" style="width: 100%;">
                    <i class="ph ph-paper-plane-right"></i> Inject Text
                </button>
                <div class="alert glass-card mt-md" style="font-size: 0.8rem; opacity: 0.6;">
                    Device must be paired with "ESPectrum HID" via System Settings.
                </div>
            </div>
        </div>
      </div>
    `;

        this.container.querySelectorAll('.hid-key').forEach(btn => {
            btn.addEventListener('click', () => {
                const key = btn.dataset.key;
                mqtt.send({ type: 'command', action: 'ble_hid_key', params: { key } });
                showToast(`Sent key: ${key}`, 'info');
            });
        });

        const injectBtn = this.container.querySelector('#btn-send-text');
        injectBtn?.addEventListener('click', () => {
            const content = document.getElementById('hid-content').value;
            if (!content) return;
            wrapCommand(injectBtn, async () => {
                mqtt.send({ type: 'command', action: 'ble_hid_type', params: { text: content } });
                await new Promise(r => setTimeout(r, 1000));
            }, { successText: 'Typed' });
        });
    }

    // ==================== 3. IR REMOTE ====================
    renderIRRemote() {
        this.container.innerHTML = `
      <div class="tool-page fade-in-up text-center">
           <div class="tool-header" style="justify-content: center;">
               <div class="icon-badge" style="background: rgba(255, 255, 255, 0.1);">
                  <i class="ph ph-television" style="font-size: 3rem;"></i>
               </div>
           </div>
           
           <h1 style="margin-bottom: 0.5rem;">TV-B-Gone</h1>
           <p class="text-tertiary" style="margin-bottom: 3rem;">Universal IR Power Off sequence for 1,000+ TV brands</p>

           <div class="blast-container">
               <button class="btn" id="btn-blast">
                   <i class="ph ph-power"></i>
                   <span>SHUT DOWN</span>
               </button>
               <div class="blast-ring"></div>
               <div class="blast-ring" style="animation-delay: 1s;"></div>
           </div>
           
           <p class="mt-xl text-tertiary mono" style="font-size: 0.8rem;">
               [GPIO 4] IR LED STATUS: <span class="status-connected">READY</span>
           </p>
      </div>

      <style>
          .blast-container { position: relative; width: 220px; height: 220px; margin: 0 auto; display: flex; align-items: center; justify-content: center; }
          #btn-blast {
               width: 180px; height: 180px; border-radius: 50%;
               background: radial-gradient(circle, #ef4444 0%, #7f1d1d 100%);
               border: 6px solid rgba(255,255,255,0.2);
               box-shadow: 0 0 30px rgba(239, 68, 68, 0.4);
               font-size: 1.2rem; font-weight: 800; color: white;
               display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px;
               transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
               z-index: 5;
          }
          #btn-blast:active { transform: scale(0.9); box-shadow: 0 0 10px rgba(239, 68, 68, 0.6); }
          #btn-blast i { font-size: 3.5rem; }
          .blast-ring {
              position: absolute; inset: 0; border: 2px solid #ef4444; border-radius: 50%;
              opacity: 0; pointer-events: none;
          }
          .blasting .blast-ring { animation: blast-out 2s cubic-bezier(0.165, 0.84, 0.44, 1) infinite; }
          @keyframes blast-out {
              0% { transform: scale(0.8); opacity: 0.8; }
              100% { transform: scale(2); opacity: 0; }
          }
      </style>
    `;

        const blastBtn = this.container.querySelector('#btn-blast');
        blastBtn?.addEventListener('click', () => {
            const container = this.container.querySelector('.blast-container');
            container.classList.add('blasting');
            mqtt.send({ type: 'command', action: 'ir_blast_power' });
            showToast('Transmitting IR codes...', 'error');
            setTimeout(() => container.classList.remove('blasting'), 5000);
        });
    }

    // ==================== 4. WALL OF SHEEP ====================
    renderWallOfSheep() {
        this.container.innerHTML = `
      <div class="tool-page fade-in-up">
        <div class="tool-header">
           <div class="icon-badge" style="background: rgba(255, 100, 50, 0.2); color: #ff6b35;">
              <i class="ph ph-sheep"></i>
           </div>
           <div>
             <h1>Wall of Sheep</h1>
             <p>Live unencrypted HTTP credentials & cookie metadata</p>
           </div>
           <div style="flex:1;"></div>
           <div class="badge status-connected pulse">LISTENING</div>
        </div>
        
        <div class="glass-card" style="margin-top: 1rem; height: 60vh; overflow: hidden; display: flex; flex-direction: column; background: #000; border-color: #7f1d1d;">
           <div class="flex-between" style="background: rgba(127, 29, 29, 0.3); padding: 0.75rem 1rem; border-bottom: 1px solid #7f1d1d;">
              <span class="mono" style="color: #fca5a5; font-size: 0.85rem;">Source -> Target</span>
              <span class="badge" style="background: #991b1b;">FILTER: HTTP</span>
           </div>
           <div id="sheep-log" class="mono" style="flex:1; overflow-y: auto; padding: 1rem; color: #fecaca; font-size: 0.85rem;">
               <div style="opacity: 0.4;">[${new Date().toLocaleTimeString()}] Sniffer active on GPIO radio interface...</div>
           </div>
        </div>
        
        <div class="alert glass-card mt-md" style="font-size: 0.8rem; border-color: rgba(239, 68, 68, 0.3);">
            <i class="ph ph-info text-accent"></i>
            Disclaimer: This tool is for educational purposes. Only sniffs unencrypted port 80 traffic.
        </div>
      </div>
    `;
    }

    updateSheepUI() {
        const logBox = document.getElementById('sheep-log');
        const lastMsg = store.getState().lastMessage;
        if (!logBox || !lastMsg || lastMsg.type !== 'sheep_data') return;

        const div = document.createElement('div');
        div.style.padding = '4px 0';
        div.style.borderBottom = '1px solid #222';
        div.innerHTML = `[${new Date().toLocaleTimeString()}] 
                         <span style="color: #ef4444;">${lastMsg.ip}</span> 
                         -> <span style="color: #facc15;">${lastMsg.path}</span> 
                         <span style="color: #777;">(Captured: ${lastMsg.content})</span>`;
        logBox.prepend(div);
    }

    cleanup() {
        if (this.unsubscribe) this.unsubscribe();
    }
}
