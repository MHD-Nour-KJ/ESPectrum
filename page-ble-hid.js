/**
 * ESPectrum - Ghost Keyboard Page
 * Text injection and remote control via Bluetooth HID
 */

import store from './app-store.js';
import mqtt from './service-socket.js';
import { showToast } from './utils-helpers.js';

export default class PageBleHid {
    constructor() {
        this.unsubscribe = null;
    }

    async render(container) {
        container.innerHTML = `
      <div class="tool-page fade-in-up">
        <div class="tool-header">
           <div class="icon-badge" style="background: rgba(168, 85, 247, 0.2); color: #a855f7;">
              <i class="ph ph-keyboard"></i>
           </div>
           <div>
             <h1>Ghost Keyboard</h1>
             <p>Bluetooth Human Interface Device (HID) Injection</p>
           </div>
        </div>

        <div class="grid grid-2 gap-lg" style="margin-top: var(--spacing-lg);">
            <!-- Typer -->
            <div class="glass-card p-lg">
                <h3 class="mb-md">Text Injection</h3>
                <div class="form-group">
                    <textarea id="hid-text" rows="4" class="input-dark mb-md" placeholder="Type text here to send to target..."></textarea>
                    <button class="btn btn-primary full-width" id="btn-send-text">
                        <i class="ph ph-paper-plane-right"></i> Type Text
                    </button>
                </div>
            </div>

            <!-- Shortcuts -->
            <div class="glass-card p-lg">
                <h3 class="mb-md">Quick Actions</h3>
                <div class="grid grid-2 gap-sm">
                    <button class="btn btn-secondary" data-key="131">Win/Cmd</button>
                    <button class="btn btn-secondary" data-key="177">Esc</button>
                    <button class="btn btn-secondary" data-key="179">Tab</button>
                    <button class="btn btn-secondary" data-key="176">Enter</button>
                    <button class="btn btn-accent full-width col-span-2" id="btn-payload-demo">
                        <i class="ph ph-lightning"></i> Deploy Payload 1
                    </button>
                </div>
                <p class="text-tertiary mt-md text-sm">
                    Connect 'ESPectrum-Keyboard' in your device's Bluetooth settings first.
                </p>
            </div>
        </div>
      </div>
    `;

        this.attachListeners();
    }

    attachListeners() {
        /*
        Key codes mapped to BleKeyboard library:
        KEY_LEFT_CTRL = 0x80;
        KEY_LEFT_SHIFT = 0x81;
        KEY_LEFT_ALT = 0x82;
        KEY_LEFT_GUI = 0x83;
        KEY_RIGHT_CTRL = 0x84;
        KEY_RIGHT_SHIFT = 0x85;
        KEY_RIGHT_ALT = 0x86;
        KEY_RIGHT_GUI = 0x87;

        KEY_UP_ARROW = 0xDA;
        KEY_DOWN_ARROW = 0xD9;
        KEY_LEFT_ARROW = 0xD8;
        KEY_RIGHT_ARROW = 0xD7;
        KEY_BACKSPACE = 0xB2;
        KEY_TAB = 0xB3;
        KEY_RETURN = 0xB0;
        KEY_ESC = 0xB1;
        KEY_INSERT = 0xD1;
        KEY_DELETE = 0xD4;
        KEY_PAGE_UP = 0xD3;
        KEY_PAGE_DOWN = 0xD6;
        KEY_HOME = 0xD2;
        KEY_END = 0xD5;
        KEY_CAPS_LOCK = 0xC1;
        KEY_F1 = 0xC2;
        KEY_F2 = 0xC3;
        KEY_F3 = 0xC4;
        KEY_F4 = 0xC5;
        KEY_F5 = 0xC6;
        KEY_F6 = 0xC7;
        KEY_F7 = 0xC8;
        KEY_F8 = 0xC9;
        KEY_F9 = 0xCA;
        KEY_F10 = 0xCB;
        KEY_F11 = 0xCC;
        KEY_F12 = 0xCD;
        */

        const textBtn = document.getElementById('btn-send-text');
        const textInput = document.getElementById('hid-text');

        textBtn?.addEventListener('click', () => {
            const text = textInput.value;
            if (!text) return;
            mqtt.send({ type: 'command', action: 'ble_hid_type', params: { text } });
            showToast('Sending keystrokes...', 'success');
        });

        const keyBtns = document.querySelectorAll('button[data-key]');
        keyBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const key = parseInt(btn.dataset.key);
                // Simple mapping needed? No, firmware takes Int. 
                // However, our data-key above are random approximations.
                // Let's use correct decimal values for BleKeyboard.
                // 176=Enter? The standard Arduino Keyboard.h uses 176 for Enter.
                // BleKeyboard uses 0xB0 for Return = 176. Correct.
                // 0xB1 = 177 (Esc). Correct.
                // 0xB3 = 179 (Tab). Correct.
                // 0x83 = 131 (GUI/Win). Correct.

                mqtt.send({ type: 'command', action: 'ble_hid_key', params: { key } });
                showToast('Key Sent', 'info');
            });
        });

        const payloadBtn = document.getElementById('btn-payload-demo');
        payloadBtn?.addEventListener('click', () => {
            // Example Payload: Win+R, notepad, enter, "Hello"
            // This is complex to sequence without backend scripting engine, 
            // but we can send a "type" command with a special trigger if we wanted.
            // For now, let's just type a demo string
            mqtt.send({ type: 'command', action: 'ble_hid_type', params: { text: "Hello World!\n" } });
            showToast('Demo payload sent', 'success');
        });
    }

    cleanup() { }
}
