/**
 * ESPectrum - Hacker Tools Page
 * Handles "Attack Mode" features: RickRoll, Evil Twin, Sour Apple
 * Implements the Disconnect -> Timer -> Reconnect workflow
 */

import store from './app-store.js';
import mqtt from './service-socket.js';
import cloud from './service-cloud.js';
import { wrapCommand } from './utils-feedback.js';
import { showToast } from './utils-helpers.js';

export default class PageHack {
    constructor() {
        this.unsubscribe = null;
        this.attackType = '';
        this.duration = 60;
        this.timerInterval = null;
    }

    async render(container) {
        this.container = container;
        const route = window.location.hash.slice(1).split('?')[0];

        if (route === '/attack-rickroll') {
            this.attackType = 'rickroll';
            this.renderAttackUI('Rick-Roll Beacon', 'Spams "Never Gonna Give You Up" lyrics as WiFi SSID beacons.', 'ph-music-notes', '#ef4444');
        } else if (route === '/attack-eviltwin') {
            this.attackType = 'eviltwin';
            this.renderAttackUI('Evil Twin Portal', 'Spawns a fake "Free_WiFi_Login" AP to capture credentials.', 'ph-mask-happy', '#ef4444');
        } else if (route === '/attack-sour-apple') {
            this.attackType = 'sourapple';
            this.renderAttackUI('Sour Apple', 'Floods BLE Advertising packets to trigger popups on iOS devices.', 'ph-apple-logo', '#f43f5e');
        }

        this.unsubscribe = store.subscribe('*', () => this.updateView());

        return () => this.cleanup();
    }

    updateView() {
        this.renderLogs();
    }

    renderAttackUI(title, desc, icon, color) {
        this.container.innerHTML = `
      <div class="tool-page fade-in-up">
        <div class="tool-header">
           <div class="icon-badge" style="background: rgba(${this.hexToRgb(color)}, 0.2); color: ${color}; width: 80px; height: 80px; font-size: 2.5rem;">
              <i class="ph ${icon}"></i>
           </div>
           <div>
             <h1 style="color: ${color};">${title}</h1>
             <p>${desc}</p>
           </div>
        </div>

        <div class="grid grid-2 gap-lg" style="margin-top: 1.5rem;">
            <div class="glass-card" style="padding: 2rem;" id="config-panel">
                <h3 class="mb-md">Target Parameters</h3>
                
                <div class="alert glass-card mb-md" style="border-color: rgba(245, 158, 11, 0.3); background: rgba(245, 158, 11, 0.05);">
                    <i class="ph ph-warning" style="color: #f59e0b;"></i>
                    <div style="font-size: 0.85rem;">
                        <strong>Network Disruption</strong>
                        <p class="text-tertiary mt-xs">The ESP32 will disconnect from the cloud to focus radio power on the attack.</p>
                    </div>
                </div>

                <div class="form-group mb-lg">
                    <div class="flex-between mb-sm">
                        <label>Attack Duration</label>
                        <span id="duration-val" class="badge">${this.duration}s</span>
                    </div>
                    <input type="range" id="duration-slider" min="10" max="300" step="10" value="60" style="width: 100%;">
                </div>

                <button class="btn btn-primary" id="btn-start-attack" style="width: 100%; height: 50px; background: ${color}; border:none;">
                    <i class="ph ph-skull"></i> EXECUTE ATTACK
                </button>
            </div>

            <div id="results-panel" class="glass-card" style="padding: 1.5rem; display: flex; flex-direction: column;">
               <h3 class="mb-md"><i class="ph ph-scroll"></i> Intelligence Log</h3>
               <div id="attack-logs" class="mono" style="flex:1; background: #000; border-radius: 8px; padding: 1rem; color: #4ade80; font-size: 0.8rem; overflow-y: auto; max-height: 350px;">
                  <div class="text-tertiary">Waiting for active session...</div>
               </div>
            </div>
        </div>

        <!-- Progress Overlay -->
        <div id="attack-overlay" class="hidden-overlay">
            <div class="overlay-content">
                <div class="timer-circle">
                    <span id="countdown">${this.duration}</span>
                    <div class="ring-loader"></div>
                </div>
                <h2 class="mt-lg">CRITICAL PHASE ACTIVE</h2>
                <p class="text-tertiary">Radio Silence... Monitoring Targets Offline</p>
                <button class="btn btn-secondary mt-lg" id="btn-emergency-abort">ABORT</button>
            </div>
        </div>
      </div>

      <style>
        .hidden-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.9); backdrop-filter: blur(10px); z-index: 1000; align-items: center; justify-content: center; text-align: center; }
        .hidden-overlay.active { display: flex; }
        .timer-circle { width: 150px; height: 150px; border-radius: 50%; border: 4px solid #ef4444; margin: 0 auto; display: flex; align-items: center; justify-content: center; position: relative; font-size: 3rem; font-weight: bold; font-family: monospace; }
        .ring-loader { position: absolute; inset: -10px; border: 2px solid rgba(239, 68, 68, 0.3); border-radius: 50%; border-top-color: #ef4444; animation: spin 2s linear infinite; }
      </style>
    `;

        this.attachListeners();
        this.renderLogs();
    }

    attachListeners() {
        const slider = this.container.querySelector('#duration-slider');
        const display = this.container.querySelector('#duration-val');
        const startBtn = this.container.querySelector('#btn-start-attack');
        const abortBtn = this.container.querySelector('#btn-emergency-abort');

        slider?.addEventListener('input', (e) => {
            this.duration = e.target.value;
            if (display) display.textContent = `${this.duration}s`;
        });

        startBtn?.addEventListener('click', () => {
            wrapCommand(startBtn, async () => {
                this.executeAttack();
                await new Promise(r => setTimeout(r, 1000));
            }, { loadingText: 'Deploying...', successText: 'Active' });
        });

        abortBtn?.addEventListener('click', () => {
            this.stopAttack();
            window.location.reload();
        });
    }

    executeAttack() {
        // Send command
        mqtt.send({
            type: 'command',
            action: 'start_attack',
            params: { type: this.attackType, duration: this.duration }
        });

        // UI Transition
        document.getElementById('attack-overlay')?.classList.add('active');

        // Start Timer
        let remaining = this.duration;
        const countEl = document.getElementById('countdown');

        this.timerInterval = setInterval(() => {
            remaining--;
            if (countEl) countEl.textContent = remaining;

            if (remaining <= 0) {
                this.stopAttack();
            }
        }, 1000);

        showToast(`${this.attackType.toUpperCase()} Attack Started`, 'error');
        cloud.log('Attack', 'Started', `${this.attackType} for ${this.duration}s`);
    }

    stopAttack() {
        clearInterval(this.timerInterval);
        document.getElementById('attack-overlay')?.classList.remove('active');
        mqtt.retry(); // Force a reconnect now that radio is free
        showToast('Attack sequence finished. Reconnecting...', 'info');
        cloud.log('Attack', 'Finished', this.attackType);
    }

    renderLogs() {
        const logBox = document.getElementById('attack-logs');
        if (!logBox) return;

        const logs = store.getState().attackLogs;
        if (!Array.isArray(logs) || logs.length === 0) return;

        logBox.innerHTML = logs.map(log => `
            <div style="border-bottom: 1px solid #111; padding: 4px 0;">
                <span class="text-tertiary">[${new Date().toLocaleTimeString()}]</span> ${log}
            </div>
        `).join('');
    }

    hexToRgb(hex) {
        hex = hex.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        return `${r}, ${g}, ${b}`;
    }

    cleanup() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        if (this.unsubscribe) this.unsubscribe();
    }
}
