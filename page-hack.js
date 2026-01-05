/**
 * ESPectrum - Hacker Tools Page
 * Handles "Attack Mode" features: RickRoll, Evil Twin, Sour Apple
 * Implements the Disconnect -> Timer -> Reconnect workflow
 */

import store from './app-store.js';

export default class PageHack {
    constructor() {
        this.attackType = '';
        this.duration = 60; // default seconds
        this.timerInterval = null;
    }

    async render(container) {
        const route = window.location.hash.slice(1).split('?')[0];

        // Determine Attack Type based on Route
        if (route === '/attack-rickroll') {
            this.attackType = 'rickroll';
            this.renderAttackUI(container, 'Rick-Roll Beacon', 'Spams "Never Gonna Give You Up" lyrics as WiFi networks.', 'ph-music-notes');
        } else if (route === '/attack-eviltwin') {
            this.attackType = 'eviltwin';
            this.renderAttackUI(container, 'Evil Twin Portal', 'Creates an Open AP "Free_WiFi_Login" and captures credentials.', 'ph-mask-happy');
        } else if (route === '/attack-sour-apple') {
            this.attackType = 'sourapple';
            this.renderAttackUI(container, 'Sour Apple Spammer', 'Floods BLE Advertising packets to annoy iOS devices.', 'ph-apple-logo');
        } else {
            container.innerHTML = '<h2>Tool not found</h2>';
        }

        return () => this.cleanup();
    }

    renderAttackUI(container, title, desc, icon) {
        container.innerHTML = `
      <div class="tool-page fade-in-up">
        
        <!-- Header -->
        <div class="tool-header">
           <div class="icon-badge" style="background: rgba(239, 68, 68, 0.2); color: #ef4444; width: 80px; height: 80px; font-size: 2.5rem;">
              <i class="ph ${icon}"></i>
           </div>
           <div>
             <h1 style="color: #ef4444;">${title}</h1>
             <p>${desc}</p>
           </div>
        </div>

        <!-- Configuration Card -->
        <div class="glass-card" style="padding: 2rem; max-width: 600px; margin: 0 auto;" id="config-panel">
            <h3 style="margin-bottom: 1.5rem;">Attack Configuration</h3>
            
            <div class="alert alert-warning" style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; display: flex; gap: 1rem; align-items: flex-start;">
                <i class="ph ph-warning" style="font-size: 1.5rem; color: #f59e0b;"></i>
                <div>
                    <strong style="color: #f59e0b;">Warning: Connection will be lost!</strong>
                    <p style="margin: 0.5rem 0 0; font-size: 0.9rem; color: var(--text-secondary);">
                        Starting this attack requires the ESP32 to switch radio modes. 
                        It will <strong>disconnect from MQTT</strong> for the duration of the attack.
                        The website will automatically reconnect when the timer ends.
                    </p>
                </div>
            </div>

            <div class="form-group" style="margin-bottom: 2rem;">
                <label style="display: block; margin-bottom: 0.5rem;">Duration (Seconds)</label>
                <div style="display: flex; gap: 1rem; align-items: center;">
                    <input type="range" id="duration-slider" min="10" max="120" step="10" value="60" style="flex: 1;">
                    <span id="duration-val" class="mono" style="background: rgba(255,255,255,0.1); padding: 4px 8px; border-radius: 4px;">60s</span>
                </div>
            </div>

            <button class="btn btn-primary" id="btn-start" style="width: 100%; padding: 1rem; background: #ef4444; border-color: #dc2626;">
                <i class="ph ph-skull"></i> START ATTACK
            </button>
        </div>

        <!-- Active Attack Overlay (Hidden by default) -->
        <div id="attack-overlay" style="display: none; text-align: center; padding: 3rem;">
            <div class="pulse-ring" style="margin: 0 auto 2rem; width: 120px; height: 120px; border-radius: 50%; border: 4px solid #ef4444; display: flex; align-items: center; justify-content: center; position: relative;">
                <span id="countdown" style="font-size: 2.5rem; font-weight: bold; font-family: monospace;">60</span>
                <div class="ripple"></div>
            </div>
            <h2>Attack in Progress...</h2>
            <p class="text-muted">ESP32 is offline. Wait for reconnection.</p>
            <button class="btn btn-secondary" id="btn-cancel" style="margin-top: 2rem;">
               Force Reload (If stuck)
            </button>
        </div>
        
        <!-- Results Log (Example for Evil Twin) -->
        <div id="results-panel" class="glass-card" style="display: none; margin-top: 2rem; padding: 2rem;">
           <h3><i class="ph ph-scroll"></i> Attack Logs</h3>
           <p>If any data was captured (e.g. credentials), it will appear here after reconnection.</p>
           <pre style="background: rgba(0,0,0,0.3); padding: 1rem; border-radius: 8px;">Waiting for logs...</pre>
        </div>

      </div>
      
      <style>
        .ripple {
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            border: 2px solid #ef4444;
            border-radius: 50%;
            animation: ripple 1.5s infinite;
        }
        @keyframes ripple {
            0% { transform: scale(1); opacity: 1; }
            100% { transform: scale(1.5); opacity: 0; }
        }
      </style>
    `;

        // Sliders
        const slider = container.querySelector('#duration-slider');
        const valDisplay = container.querySelector('#duration-val');
        slider.addEventListener('input', (e) => {
            valDisplay.textContent = e.target.value + 's';
            this.duration = parseInt(e.target.value);
        });

        // Start Button
        container.querySelector('#btn-start').addEventListener('click', () => {
            this.startAttack();
        });

        container.querySelector('#btn-cancel').addEventListener('click', () => {
            window.location.reload();
        });
    }

    startAttack() {
        // 1. Send Command to ESP32
        if (window.wsService) {
            window.wsService.send(JSON.stringify({
                type: 'command',
                action: 'start_attack',
                params: {
                    type: this.attackType,
                    duration: this.duration
                }
            }));
        }

        // 2. Switch UI
        document.getElementById('config-panel').style.display = 'none';
        document.getElementById('attack-overlay').style.display = 'block';

        // 3. Start Frontend Timer
        let remaining = this.duration;
        const countEl = document.getElementById('countdown');

        this.timerInterval = setInterval(() => {
            remaining--;
            if (countEl) countEl.textContent = remaining;

            if (remaining <= 0) {
                this.finishAttack();
            }
        }, 1000);
    }

    finishAttack() {
        clearInterval(this.timerInterval);

        const countEl = document.getElementById('countdown');
        if (countEl) countEl.innerHTML = '<i class="ph ph-check"></i>';

        document.querySelector('#attack-overlay h2').textContent = 'Attack Complete';
        document.querySelector('#attack-overlay p').textContent = 'Reconnecting to ESP32...';

        // Attempt to trigger a reconnect if the library handles it, 
        // or just wait for the periodic health check / natural status update
        setTimeout(() => {
            if (window.wsService) window.wsService.connect();

            // Show Results
            document.getElementById('attack-overlay').style.display = 'none';
            document.getElementById('config-panel').style.display = 'block';

            const results = document.getElementById('results-panel');
            if (results) results.style.display = 'block';

            // Ideally fetch logs here
        }, 3000);
    }

    cleanup() {
        if (this.timerInterval) clearInterval(this.timerInterval);
    }
}
