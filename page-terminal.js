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
        <div class="glass-card" style="padding: 0; overflow: hidden; background: rgba(0, 0, 0, 0.6); border-color: var(--color-primary); box-shadow: 0 0 20px rgba(104, 74, 255, 0.2);">
          <div class="terminal-toolbar" style="
            padding: var(--spacing-sm) var(--spacing-md);
            border-bottom: 1px solid var(--glass-border);
            display: flex;
            align-items: center;
            justify-content: space-between;
          ">
            <div class="flex gap-sm">
                <div class="terminal-dots" style="display: flex; gap: 0.5rem;">
                  <div style="width: 10px; height: 10px; border-radius: 50%; background: #EF4444;"></div>
                  <div style="width: 10px; height: 10px; border-radius: 50%; background: #FFE14A;"></div>
                  <div style="width: 10px; height: 10px; border-radius: 50%; background: #10B981;"></div>
                </div>
                <div class="mono" style="font-size: 0.75rem; color: var(--text-tertiary); margin-left: 0.5rem;">
                   esp32@root:~$ <span class="text-primary">monitoring_active</span>
                </div>
            </div>
            <div class="badge status-connected" id="tx-indicator" style="opacity: 0; transition: opacity 0.1s;">TX ACTIVE</div>
          </div>
          
          <div class="terminal-output mono" id="terminal-output" style="
            padding: var(--spacing-md);
            height: 500px;
            overflow-y: auto;
            font-size: 0.825rem;
            line-height: 1.5;
            scrollbar-width: thin;
          ">
            <div class="terminal-message" style="color: var(--color-primary); font-weight: bold;">
              > [SYSTEM] ESPectrum Cyber-Terminal initialized.
            </div>
          </div>

          <!-- Command Input Area -->
          <div style="
               padding: 0.75rem 1rem; 
               background: rgba(var(--color-primary-rgb), 0.05); 
               border-top: 1px solid var(--glass-border);
               display: flex;
               align-items: center;
               gap: 0.75rem;
          ">
              <span class="text-primary mono" style="font-weight: bold;">></span>
              <input type="text" id="terminal-input" class="mono" placeholder="Enter command or type 'help'..." style="
                  flex: 1;
                  background: transparent;
                  border: none;
                  color: var(--color-secondary);
                  outline: none;
                  font-size: 0.9rem;
              ">
          </div>
        </div>
        
        <!-- Legend & Shortcuts -->
        <div style="margin-top: 1rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
            <div class="terminal-legend" style="display: flex; gap: var(--spacing-md); flex-wrap: wrap;">
              <div class="badge" style="background: rgba(16, 185, 129, 0.1); border-color: rgba(16, 185, 129, 0.2);">
                <span style="color: #10B981;">●</span> Telemetry
              </div>
              <div class="badge" style="background: rgba(104, 74, 255, 0.1); border-color: rgba(104, 74, 255, 0.2);">
                <span style="color: #684AFF;">●</span> System
              </div>
              <div class="badge" style="background: rgba(255, 134, 74, 0.1); border-color: rgba(255, 134, 74, 0.2);">
                <span style="color: #FF864A;">●</span> Command
              </div>
            </div>
            
            <div class="flex gap-sm mono" style="font-size: 0.7rem; opacity: 0.5;">
                Shortcuts: <span class="badge">help</span> <span class="badge">scan</span> <span class="badge">led 1|0</span>
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
    const input = container.querySelector('#terminal-input');
    const output = container.querySelector('#terminal-output');
    const pauseBtn = container.querySelector('#pause-btn');
    const clearBtn = container.querySelector('#clear-btn');
    const copyBtn = container.querySelector('#copy-btn');

    // Command History
    this.history = [];
    this.historyIndex = -1;

    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const cmd = input.value.trim();
        if (cmd) {
          this.executeCommand(cmd);
          this.history.unshift(cmd);
          this.historyIndex = -1;
          input.value = '';
        }
      } else if (e.key === 'ArrowUp') {
        if (this.historyIndex < this.history.length - 1) {
          this.historyIndex++;
          input.value = this.history[this.historyIndex];
        }
      } else if (e.key === 'ArrowDown') {
        if (this.historyIndex > 0) {
          this.historyIndex--;
          input.value = this.history[this.historyIndex];
        } else {
          this.historyIndex = -1;
          input.value = '';
        }
      }
    });

    pauseBtn?.addEventListener('click', () => {
      this.isPaused = !this.isPaused;
      pauseBtn.innerHTML = this.isPaused
        ? '<i class="ph ph-play"></i> Resume'
        : '<i class="ph ph-pause"></i> Pause';
    });

    clearBtn?.addEventListener('click', () => {
      this.messages = [];
      if (output) output.innerHTML = '<div class="terminal-message text-tertiary">> Terminal cleared</div>';
    });

    copyBtn?.addEventListener('click', async () => {
      const text = this.messages.map(m => m.raw).join('\n');
      if (await copyToClipboard(text)) {
        const original = copyBtn.innerHTML;
        copyBtn.innerHTML = '<i class="ph ph-check"></i> Copied!';
        setTimeout(() => copyBtn.innerHTML = original, 2000);
      }
    });
  },

  executeCommand(cmd) {
    const [action, ...args] = cmd.toLowerCase().split(' ');

    this.logLocal(`Executing: ${cmd}`, 'command');

    // Interactive Help
    if (action === 'help') {
      const helpText = `
            Available Commands:
            ------------------
            - scan [wifi|ble] : Start a network scan
            - led [1|0]       : Toggle ESP32 on-board LED
            - clear           : Clear terminal screen
            - ping            : Check hardware heartbeat
            - files           : List files in LittleFS
            - attack [type]   : Start RickRoll or SourApple attack
            - status          : Show connection stats
        `;
      this.logLocal(helpText, 'system');
      return;
    }

    // Direct Signal Logic
    this.pulseTX();

    switch (action) {
      case 'scan':
        const type = args[0] || 'wifi';
        mqtt.send({ type: 'command', action: `scan_${type}` });
        break;
      case 'led':
        mqtt.send({ type: 'command', action: 'toggle_led', params: { state: args[0] === '1' } });
        break;
      case 'ping':
        mqtt.send({ type: 'command', action: 'ping' });
        break;
      case 'files':
        mqtt.send({ type: 'file_cmd', action: 'list' });
        break;
      case 'clear':
        document.getElementById('clear-btn').click();
        break;
      default:
        // Raw JSON attempt or unknown
        if (cmd.startsWith('{')) {
          try {
            mqtt.send(JSON.parse(cmd));
          } catch (e) {
            this.logLocal('Invalid JSON payload', 'error');
          }
        } else {
          this.logLocal(`Unknown command: ${action}`, 'error');
        }
    }
  },

  pulseTX() {
    const tx = document.getElementById('tx-indicator');
    if (tx) {
      tx.style.opacity = '1';
      setTimeout(() => tx.style.opacity = '0', 200);
    }
  },

  logLocal(text, type = 'system') {
    this.addMessage({
      type: type,
      text: text,
      timestamp: Date.now()
    });
  },

  subscribeToMessages() {
    // Subscribe to all state changes
    this.unsubscribe = store.subscribe('*', (state, prevState) => {
      const lastMsg = state.lastMessage;
      if (lastMsg && lastMsg !== prevState.lastMessage) {
        this.addMessage(lastMsg);
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
