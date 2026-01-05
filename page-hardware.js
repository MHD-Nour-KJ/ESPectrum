/**
 * ESPectrum - Hardware Tools Page
 * Handles BLE Tools, IR Blaster, and Wall of Sheep
 */

import store from './app-store.js';

export default class PageHardware {
    constructor(type) {
        this.type = type; // 'ble-scanner', 'ble-hid', 'ir', 'sheep'
    }

    async render(container) {
        const route = window.location.hash.slice(1).split('?')[0];

        if (route === '/ble-scanner') {
            this.renderBLEScanner(container);
        } else if (route === '/ble-hid') {
            this.renderGhostKeyboard(container);
        } else if (route === '/ir-remote') {
            this.renderIRRemote(container);
        } else if (route === '/wall-of-sheep') {
            this.renderWallOfSheep(container);
        } else {
            container.innerHTML = '<h2>Tool not found</h2>';
        }

        return () => this.cleanup();
    }

    // ==================== BLE SCANNER ====================
    renderBLEScanner(container) {
        container.innerHTML = `
      <div class="tool-page fade-in-up">
        <div class="tool-header">
           <div class="icon-badge" style="background: rgba(50, 200, 50, 0.2); color: #4ade80;">
              <i class="ph ph-bluetooth"></i>
           </div>
           <div>
             <h1>BLE Scanner</h1>
             <p>Detect nearby Bluetooth Low Energy devices & beacons</p>
           </div>
           <button class="btn btn-primary" id="btn-scan-ble">
             <i class="ph ph-magnifying-glass"></i> Scan BLE
           </button>
        </div>

        <div class="glass-card">
          <table class="data-table">
             <thead>
                <tr>
                   <th>Device Name</th>
                   <th>MAC Address</th>
                   <th>RSSI</th>
                   <th>Vendor</th>
                </tr>
             </thead>
             <tbody id="ble-list">
                <tr><td colspan="4" class="text-center">Click Scan to start...</td></tr>
             </tbody>
          </table>
        </div>
      </div>
    `;

        container.querySelector('#btn-scan-ble').addEventListener('click', () => {
            if (window.wsService) {
                window.wsService.send(JSON.stringify({ type: 'command', action: 'scan_ble' }));
            }
            document.getElementById('ble-list').innerHTML = '<tr><td colspan="4" class="text-center"><i class="ph ph-spinner ph-spin"></i> Scanning...</td></tr>';
        });

        // Listen for results
        this.unsubscribe = store.subscribe('lastMessage', (msg) => {
            if (msg && msg.type === 'scan_result_ble') {
                const tbody = document.getElementById('ble-list');
                if (tbody) {
                    tbody.innerHTML = msg.devices.map(d => `
                    <tr>
                        <td><strong>${d.name || '(Unknown)'}</strong></td>
                        <td class="mono text-muted">${d.addr}</td>
                        <td>${d.rssi} dBm</td>
                        <td>Unknown</td>
                    </tr>
                `).join('');
                }
            }
        });
    }

    // ==================== GHOST KEYBOARD (HID) ====================
    renderGhostKeyboard(container) {
        container.innerHTML = `
      <div class="tool-page fade-in-up">
        <div class="tool-header">
           <div class="icon-badge" style="background: rgba(200, 50, 200, 0.2); color: #d946ef;">
              <i class="ph ph-keyboard"></i>
           </div>
           <div>
             <h1>Ghost Keyboard</h1>
             <p>Emulate a Bluetooth HID Keyboard to control paired devices</p>
           </div>
        </div>

        <div class="grid grid-2 gap-lg" style="max-width: 800px; margin: 0 auto;">
            <!-- Media Controls -->
            <div class="glass-card text-center">
                <h3>Media Control</h3>
                <div class="grid grid-3 gap-sm mt-md">
                    <button class="btn btn-icon" onclick="sendKey('vol_down')"><i class="ph ph-speaker-low"></i></button>
                    <button class="btn btn-icon" onclick="sendKey('play_pause')"><i class="ph ph-play-pause"></i></button>
                    <button class="btn btn-icon" onclick="sendKey('vol_up')"><i class="ph ph-speaker-high"></i></button>
                </div>
            </div>

            <!-- Pranks -->
            <div class="glass-card text-center">
                <h3>Prank Scripts</h3>
                <div class="flex-col gap-sm mt-md">
                    <button class="btn btn-primary" onclick="sendKey('type_hello')">Type "Hello World"</button>
                    <button class="btn btn-accent" onclick="sendKey('cmd_space')">Open Spotlight (Cmd+Space)</button>
                    <button class="btn" style="border-color: #ef4444; color: #ef4444;" onclick="sendKey('lock_screen')">Lock Screen</button>
                </div>
            </div>
        </div>
      </div>
    `;

        // Define global helper for inline onClicks (lazy way, better to use addEventListener in real app)
        window.sendKey = (key) => {
            if (window.wsService) {
                window.wsService.send(JSON.stringify({
                    type: 'command',
                    action: 'ble_hid_key',
                    params: { key: key }
                }));
                alert(`Sent keystroke: ${key}`);
            }
        };
    }

    // ==================== IR REMOTE ====================
    renderIRRemote(container) {
        container.innerHTML = `
      <div class="tool-page fade-in-up text-center">
           <div class="icon-badge" style="margin: 0 auto 1rem; background: rgba(255, 255, 255, 0.1);">
              <i class="ph ph-television" style="font-size: 3rem;"></i>
           </div>
           <h1 style="margin-bottom: 0.5rem;">TV-B-Gone</h1>
           <p style="margin-bottom: 3rem;">Universal IR Remote Power Blaster</p>

           <button class="btn" id="btn-blast" style="
               width: 200px; 
               height: 200px; 
               border-radius: 50%; 
               background: radial-gradient(circle, #ef4444 0%, #991b1b 100%);
               border: 4px solid #fecaca;
               box-shadow: 0 0 50px rgba(239, 68, 68, 0.5);
               font-size: 1.5rem;
               text-transform: uppercase;
           ">
               <i class="ph ph-power" style="font-size: 4rem; display: block; margin-bottom: 0.5rem;"></i>
               SHUT DOWN
           </button>
           
           <p class="mt-lg text-muted">Point ESP32 (GPIO 4) at TV screens</p>
      </div>
    `;

        container.querySelector('#btn-blast').addEventListener('click', () => {
            if (window.wsService) {
                window.wsService.send(JSON.stringify({ type: 'command', action: 'ir_blast_power' }));
            }
            // Haptic visual
            const btn = container.querySelector('#btn-blast');
            btn.style.transform = 'scale(0.95)';
            setTimeout(() => btn.style.transform = 'scale(1)', 100);
        });
    }

    // ==================== WALL OF SHEEP ====================
    renderWallOfSheep(container) {
        container.innerHTML = `
      <div class="tool-page fade-in-up">
        <div class="tool-header">
           <div class="icon-badge" style="background: rgba(255, 100, 50, 0.2); color: #ff6b35;">
              <i class="ph ph-sheep"></i>
           </div>
           <div>
             <h1>Wall of Sheep</h1>
             <p>Live HTTP Traffic Sniffer (Unencrypted URLs)</p>
           </div>
        </div>
        
        <div class="glass-card" style="height: 60vh; overflow-y: auto; font-family: monospace; background: #000;">
           <div style="color: #22c55e;">> Initializing Promiscuous Sniffer...</div>
           <div style="color: #22c55e;">> Filter: TCP Port 80 (HTTP)</div>
           <div style="margin-top: 1rem;" id="sheep-log">
               <!-- Logs go here -->
               <div style="color: #777;">[10:42:01] 192.168.1.105 -> GET http://neverssl.com/</div>
               <div style="color: #777;">[10:42:05] 192.168.1.112 -> POST http://insecure-login.com/auth</div>
           </div>
        </div>
      </div>
    `;
    }

    cleanup() {
        if (this.unsubscribe) this.unsubscribe();
        // delete global
        delete window.sendKey;
    }
}
