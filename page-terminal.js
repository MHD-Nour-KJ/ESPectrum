/**
 * ESPectrum - Developer Terminal Page
 * Real-time WebSocket message viewer with JSON formatting
 */

import store from './app-store.js';
import { copyToClipboard, formatTime } from './utils-helpers.js';

export default {
    messages: [],
    maxMessages: 100,
    isPaused: false,
    unsubscribe: null,

    async render(container) {
        container.innerHTML = `
      <div class="terminal-page">
        <!-- Page Header -->
        <div class="terminal-header" style="margin-bottom: var(--spacing-lg);">
          <div class="flex-between" style="flex-wrap: wrap; gap: var(--spacing-sm);">
            <div>
              <h1 style="margin: 0;">
                <i class="ph ph-terminal"></i>
                Developer Terminal
              </h1>
              <p style="color: var(--text-secondary); margin: 0.5rem 0 0;">
                Raw WebSocket data stream
              </p>
            </div>
            <div class="terminal-controls" style="display: flex; gap: var(--spacing-xs);">
              <button class="btn" id="pause-btn">
                <i class="ph ph-pause"></i>
                Pause
              </button>
              <button class="btn" id="clear-btn">
                <i class="ph ph-trash"></i>
                Clear
              </button>
              <button class="btn" id="copy-btn">
                <i class="ph ph-copy"></i>
                Copy All
              </button>
            </div>
          </div>
        </div>
        
        <!-- Terminal Output -->
        <div class="glass-card" style="padding: 0; overflow: hidden; background: rgba(0, 0, 0, 0.4);">
          <div class="terminal-toolbar" style="
            padding: var(--spacing-sm) var(--spacing-md);
            border-bottom: 1px solid var(--glass-border);
            display: flex;
            align-items: center;
            gap: var(--spacing-sm);
          ">
            <div class="terminal-dots" style="display: flex; gap: 0.5rem;">
              <div style="width: 12px; height: 12px; border-radius: 50%; background: #EF4444;"></div>
              <div style="width: 12px; height: 12px; border-radius: 50%; background: #FFE14A;"></div>
              <div style="width: 12px; height: 12px; border-radius: 50%; background: #10B981;"></div>
            </div>
            <div class="mono" style="font-size: 0.75rem; color: var(--text-tertiary);">
              esp32@websocket:~$
            </div>
          </div>
          
          <div class="terminal-output mono" id="terminal-output" style="
            padding: var(--spacing-md);
            height: 600px;
            overflow-y: auto;
            font-size: 0.875rem;
            line-height: 1.6;
          ">
            <div class="terminal-message" style="color: var(--color-secondary);">
              > ESPectrum Terminal v1.0.0
            </div>
            <div class="terminal-message" style="color: var(--text-tertiary);">
              > Waiting for WebSocket messages...
            </div>
          </div>
        </div>
        
        <!-- Legend -->
        <div class="terminal-legend" style="margin-top: var(--spacing-md); display: flex; gap: var(--spacing-md); flex-wrap: wrap;">
          <div class="badge">
            <span style="color: #10B981;">●</span> Sensor Data
          </div>
          <div class="badge">
            <span style="color: #684AFF;">●</span> System Event
          </div>
          <div class="badge">
            <span style="color: #FF864A;">●</span> Command
          </div>
          <div class="badge">
            <span style="color: #EF4444;">●</span> Error
          </div>
        </div>
      </div>
    `;

        // Attach event listeners
        this.attachEventListeners(container);

        // Subscribe to WebSocket messages
        this.subscribeToMessages();

        // Cleanup function
        return () => this.cleanup();
    },

    attachEventListeners(container) {
        // Pause button
        const pauseBtn = container.querySelector('#pause-btn');
        pauseBtn?.addEventListener('click', () => {
            this.isPaused = !this.isPaused;
            pauseBtn.innerHTML = this.isPaused
                ? '<i class="ph ph-play"></i> Resume'
                : '<i class="ph ph-pause"></i> Pause';
        });

        // Clear button
        const clearBtn = container.querySelector('#clear-btn');
        clearBtn?.addEventListener('click', () => {
            this.messages = [];
            const output = container.querySelector('#terminal-output');
            if (output) {
                output.innerHTML = `
          <div class="terminal-message" style="color: var(--text-tertiary);">
            > Terminal cleared
          </div>
        `;
            }
        });

        // Copy button
        const copyBtn = container.querySelector('#copy-btn');
        copyBtn?.addEventListener('click', async () => {
            const text = this.messages.map(m => m.raw).join('\n');
            const success = await copyToClipboard(text);

            if (success) {
                copyBtn.innerHTML = '<i class="ph ph-check"></i> Copied!';
                setTimeout(() => {
                    copyBtn.innerHTML = '<i class="ph ph-copy"></i> Copy All';
                }, 2000);
            }
        });
    },

    subscribeToMessages() {
        // Subscribe to all state changes
        this.unsubscribe = store.subscribe('*', (state, prevState) => {
            // Check for sensor data updates
            if (state.sensorData !== prevState.sensorData && state.sensorData) {
                this.addMessage({
                    type: 'sensor_data',
                    data: state.sensorData,
                    timestamp: Date.now()
                });
            }

            // Check for system events
            if (state.lastWakeup !== prevState.lastWakeup && state.lastWakeup) {
                this.addMessage({
                    type: 'system_event',
                    event: 'wakeup',
                    data: state.lastWakeup,
                    timestamp: Date.now()
                });
            }

            // Connection status changes
            if (state.connected !== prevState.connected) {
                this.addMessage({
                    type: 'system_event',
                    event: state.connected ? 'connected' : 'disconnected',
                    timestamp: Date.now()
                });
            }
        });
    },

    addMessage(message) {
        if (this.isPaused) return;

        // Add to messages array
        this.messages.push({
            ...message,
            raw: JSON.stringify(message, null, 2)
        });

        // Limit messages
        if (this.messages.length > this.maxMessages) {
            this.messages.shift();
        }

        // Render message
        this.renderMessage(message);
    },

    renderMessage(message) {
        const output = document.getElementById('terminal-output');
        if (!output) return;

        const messageEl = document.createElement('div');
        messageEl.className = 'terminal-message';
        messageEl.style.marginBottom = '1rem';
        messageEl.style.borderLeft = '3px solid';
        messageEl.style.paddingLeft = '1rem';

        // Color based on type
        let color = '#10B981'; // Green for sensor data
        let icon = 'ph-chart-line';

        if (message.type === 'system_event') {
            color = '#684AFF';
            icon = 'ph-info';
        } else if (message.type === 'command') {
            color = '#FF864A';
            icon = 'ph-terminal';
        } else if (message.type === 'error') {
            color = '#EF4444';
            icon = 'ph-warning';
        }

        messageEl.style.borderColor = color;

        // Format message
        const time = formatTime(message.timestamp || Date.now());
        const jsonStr = JSON.stringify(message, null, 2);

        messageEl.innerHTML = `
      <div style="color: var(--text-tertiary); font-size: 0.75rem; margin-bottom: 0.25rem;">
        <i class="ph ${icon}" style="color: ${color};"></i>
        ${time}
      </div>
      <pre style="margin: 0; white-space: pre-wrap; word-wrap: break-word; color: var(--text-secondary);">${this.syntaxHighlight(jsonStr)}</pre>
    `;

        output.appendChild(messageEl);

        // Auto-scroll to bottom
        output.scrollTop = output.scrollHeight;
    },

    syntaxHighlight(json) {
        json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

        return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
            let cls = 'number';
            let color = '#FFE14A';

            if (/^"/.test(match)) {
                if (/:$/.test(match)) {
                    cls = 'key';
                    color = '#684AFF';
                } else {
                    cls = 'string';
                    color = '#10B981';
                }
            } else if (/true|false/.test(match)) {
                cls = 'boolean';
                color = '#FF864A';
            } else if (/null/.test(match)) {
                cls = 'null';
                color = '#EF4444';
            }

            return `<span style="color: ${color};">${match}</span>`;
        });
    },

    cleanup() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }
        this.messages = [];
        this.isPaused = false;
    }
};
