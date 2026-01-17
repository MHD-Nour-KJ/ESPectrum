/**
 * ESPectrum - Header Component
 * Floating glass header with navigation
 */

import store from './app-store.js';
import cloud from './service-cloud.js';

export default class Header {
  constructor(container) {
    this.container = container;
    this.unsubscribe = null;
  }

  render() {
    this.container.innerHTML = `
      <div class="header-wrapper" id="header-wrapper">
        <div class="header-content glass-card">
          <div class="header-left">
            <button class="btn btn-icon menu-toggle" id="menu-toggle" aria-label="Toggle menu">
              <i class="ph ph-list"></i>
            </button>
          </div>
          
          <div class="header-center">
            <div id="mqtt-status" class="status-container"></div>
            <div id="hw-status" class="status-container"></div>
            <div id="db-status" class="status-container"></div>
            <div id="radio-status" class="status-container"></div>
          </div>
          
          <div class="header-right">
            <!-- New LED Toggle Button -->
            <button class="btn btn-led" id="led-btn" aria-label="Toggle LED" title="Toggle ESP32 LED">
              <i class="ph ph-lightbulb"></i>
              <span class="led-text">ESP LED</span>
            </button>
          </div>
        </div>
      </div>
    `;

    // Add styles
    this.addStyles();

    // Attach event listeners
    this.attachEventListeners();

    // Subscribe to store updates
    this.subscribeToStore();

    // Initial status render
    this.updateConnectionStatus();

    // Smart Scroll
    this.initSmartScroll();
  }

  addStyles() {
    if (document.getElementById('header-styles')) return;

    const style = document.createElement('style');
    style.id = 'header-styles';
    style.textContent = `
      .header-wrapper {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: var(--z-header);
        padding: var(--spacing-sm);
        transition: transform var(--transition-medium);
        background: rgba(15, 23, 42, 0.85); /* Darker, less transparent */
        backdrop-filter: blur(12px);
        border-bottom: 1px solid var(--glass-border);
      }
      
      .header-wrapper.header-hidden {
        transform: translateY(-100%);
      }
      
      .header-content {
        display: flex;
        align-items: center;
        justify-content: space-between;
        justify-content: space-between;
        padding: var(--spacing-sm) var(--spacing-md);
        gap: var(--spacing-md);
        border-radius: var(--radius-lg);
      }
      
      .header-left,
      .header-right {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
      }
      
      .header-center {
        display: flex;
        align-items: center;
        gap: 8px;
        justify-content: center;
        flex-wrap: nowrap;
        overflow-x: auto;
        max-width: 40%;
        scrollbar-width: none; /* Hide scrollbar for Chrome/Safari */
      }
      .header-center::-webkit-scrollbar { display: none; }
      
      @media (max-width: 768px) {
        .header-center {
          position: static;
          transform: none;
          max-width: unset;
          flex: 1;
          justify-content: center;
        }
        .header-content {
          gap: 8px;
        }
        .led-text { display: none; }
      }
      
      /* LED Button Styles */
      .btn-led {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        border-radius: 99px;
        border: 1px solid var(--glass-border);
        background: rgba(255,255,255,0.05);
        color: var(--text-primary);
        cursor: pointer;
        transition: all 0.3s ease;
        font-family: var(--font-primary);
      }
      
      .led-text {
        font-size: 0.85rem;
        font-weight: 600;
        letter-spacing: 0.5px;
      }

      /* LED Button Glow */
      #led-btn.active {
        color: #F59E0B;
        text-shadow: 0 0 10px rgba(245, 158, 11, 0.5);
        background: rgba(245, 158, 11, 0.1);
        border-color: rgba(245, 158, 11, 0.3);
      }
       
      #led-btn i {
         transition: all 0.3s ease;
         font-size: 1.1rem;
      }
      
      #led-btn.active i {
         transform: scale(1.1);
         color: #F59E0B;
         fill: #F59E0B;
      }
      @media (max-width: 480px) {
        .header-content {
          padding: 8px;
        }
        .header-center {
          justify-content: flex-start; /* Left-aligned scrollable list */
          padding: 0 4px;
        }
        .badge {
          font-size: 0.75rem;
          padding: 4px 8px;
        }
        .btn-led {
          padding: 8px;
          border-radius: 8px;
        }
      }
      /* Connection Status Styles */
      .status-connecting {
        background: rgba(234, 179, 8, 0.15);
        color: #fbbf24;
        border: 1px solid rgba(234, 179, 8, 0.3);
      }
      
      .status-warning {
        background: rgba(234, 179, 8, 0.15);
        color: #fbbf24;
        border: 1px solid rgba(234, 179, 8, 0.3);
      }
      
      .status-error {
        background: rgba(239, 68, 68, 0.15);
        color: #f87171;
        border: 1px solid rgba(239, 68, 68, 0.3);
      }
      
      .status-connected {
        background: rgba(34, 197, 94, 0.15);
        color: #4ade80;
        border: 1px solid rgba(34, 197, 94, 0.3);
      }
      
      .status-mock {
        background: rgba(168, 85, 247, 0.15);
        color: #c084fc;
        border: 1px solid rgba(168, 85, 247, 0.3);
      }
      
      .status-container {
        cursor: pointer;
      }

      .badge {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.35rem 0.75rem;
        border-radius: 99px;
        font-size: 0.85rem;
        font-weight: 500;
        transition: all 0.3s ease;
        cursor: pointer; /* Ensure entire badge shows pointer */
      }

      .badge:hover {
        transform: scale(1.05);
        filter: brightness(1.2);
      }
      
      .badge:active {
        transform: scale(0.95);
      }
      
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      
      .spin-icon {
        animation: spin 1.5s linear infinite;
      }
      
      .spin {
        animation: spin 1s linear infinite;
      }
    `;

    document.head.appendChild(style);
  }

  attachEventListeners() {
    // Menu toggle
    const menuToggle = document.getElementById('menu-toggle');
    menuToggle?.addEventListener('click', () => {
      store.dispatch('TOGGLE_DRAWER', {
        drawerOpen: !store.getState().drawerOpen
      });
    });

    // LED Button Logic
    const ledBtn = document.getElementById('led-btn');
    let isLedOn = false;

    ledBtn?.addEventListener('click', () => {
      const newState = !store.getState().ledState;

      // 1. Update Local Store (Instant feedback)
      store.dispatch('LED_STATE_UPDATE', { ledState: newState });

      // 2. Send to Hardware
      if (window.wsService) {
        window.wsService.send({ type: 'command', action: 'toggle_led', params: { state: newState } });
      }

      // 3. Save to Cloud
      cloud.saveConfig('led_builtin_state', newState);
      cloud.log('System', 'LED Toggled', `State: ${newState ? 'ON' : 'OFF'}`);
    });

    // Clicking status badges refreshes connection
    const handleStatusClick = () => {
      if (window.wsService) window.wsService.retry();
    };

    document.getElementById('mqtt-status')?.addEventListener('click', handleStatusClick);
    document.getElementById('hw-status')?.addEventListener('click', handleStatusClick);
    document.getElementById('db-status')?.addEventListener('click', () => {
      // Cloud manual refresh?
    });
  }

  subscribeToStore() {
    this.unsubscribe = store.subscribe('*', () => {
      this.updateConnectionStatus();
      this.updateLEDUI();
    });
  }

  updateLEDUI() {
    const ledBtn = document.getElementById('led-btn');
    if (!ledBtn) return;

    const isLedOn = store.getState().ledState;
    const icon = ledBtn.querySelector('i');

    if (isLedOn) {
      ledBtn.classList.add('active');
      if (icon) icon.classList.replace('ph-lightbulb', 'ph-lightbulb-filament');
    } else {
      ledBtn.classList.remove('active');
      if (icon) icon.classList.replace('ph-lightbulb-filament', 'ph-lightbulb');
    }
  }

  initSmartScroll() {
    let lastScroll = 0;
    const header = document.getElementById('header-wrapper');
    window.addEventListener('scroll', () => {
      if (!header) return;
      const currentScroll = window.scrollY;
      if (currentScroll > lastScroll && currentScroll > 50) {
        header.classList.add('header-hidden');
      } else {
        header.classList.remove('header-hidden');
      }
      lastScroll = currentScroll;
    });
  }

  updateConnectionStatus() {
    const mqttContainer = document.getElementById('mqtt-status');
    const hwContainer = document.getElementById('hw-status');
    const dbContainer = document.getElementById('db-status');
    if (!mqttContainer || !hwContainer || !dbContainer) return;

    const state = store.getState();

    // 1. MQTT Cloud Status
    let mClass = 'status-disconnected';
    let mText = 'Cloud: Off';
    let mIcon = 'ph-cloud-slash';

    switch (state.systemStatus) {
      case 'connecting':
        mClass = 'status-connecting';
        mText = 'Cloud: Seq...';
        mIcon = 'ph-arrows-clockwise';
        break;
      case 'retrying':
        mClass = 'status-warning';
        mText = `Cloud: Try ${state.connectionAttempts}`;
        mIcon = 'ph-arrows-clockwise';
        break;
      case 'connected':
        mClass = 'status-connected';
        mText = 'Cloud: Online';
        mIcon = 'ph-cloud-check';
        break;
      case 'failed':
        mClass = 'status-error';
        mText = 'Cloud: Fail';
        mIcon = 'ph-cloud-warning';
        break;
      case 'mock':
        mClass = 'status-mock';
        mText = 'Cloud: Mock';
        mIcon = 'ph-test-tube';
        break;
    }

    mqttContainer.innerHTML = `
      <div class="badge ${mClass}" title="MQTT Broker Status - Click to Refresh">
        <i class="ph ${mIcon} ${state.systemStatus === 'connecting' || state.systemStatus === 'retrying' ? 'spin-icon' : ''}"></i>
        ${mText}
      </div>
    `;

    // 2. Hardware / ESP32 Status
    let hClass = 'status-disconnected';
    let hText = 'ESP32: Off';
    let hIcon = 'ph-plugs-off';

    if (state.mockMode) {
      hClass = 'status-mock';
      hText = 'ESP32: Mock';
      hIcon = 'ph-cpu';
    } else if (state.hardwareConnected && state.systemStatus === 'connected') {
      hClass = 'status-connected';
      hText = 'ESP32: Live';
      hIcon = 'ph-cpu';
    } else if (state.systemStatus === 'connected') {
      hClass = 'status-warning';
      hText = 'ESP32: Lost';
      hIcon = 'ph-plugs-off';
    }

    hwContainer.innerHTML = `
      <div class="badge ${hClass}" title="ESP32 Hardware Status - Click to Refresh">
        <i class="ph ${hIcon}"></i>
        ${hText}
      </div>
    `;

    // 3. Database / Google Sheets Status
    let dClass = 'status-disconnected';
    let dText = 'DB: Offline';
    let dIcon = 'ph-database';

    if (state.dbSyncing) {
      dClass = 'status-connecting';
      dText = 'DB: Syncing...';
      dIcon = 'ph-arrows-clockwise';
    } else if (state.dbConnected) {
      dClass = 'status-connected';
      dText = 'DB: Online';
      dIcon = 'ph-database';
    }

    dbContainer.innerHTML = `
      <div class="badge ${dClass}" title="Database (Google Sheets) Connectivity Status">
        <i class="ph ${dIcon} ${state.dbSyncing ? 'spin-icon' : ''}"></i>
        ${dText}
      </div>
    `;

    // 4. Radio Mode Status
    const radioContainer = document.getElementById('radio-status');
    if (radioContainer) {
      const isWiFi = state.radioMode === 'WiFi';
      const rClass = isWiFi ? 'status-connected' : 'status-mock';
      const rText = isWiFi ? 'WiFi Mode' : 'BLE Mode';
      const rIcon = isWiFi ? 'ph-wifi-high' : 'ph-bluetooth';

      radioContainer.innerHTML = `
        <div class="badge ${rClass}" title="Current HW Radio Mode - Some features require switching">
          <i class="ph ${rIcon}"></i>
          ${rText}
        </div>
      `;
    }
  }

  cleanup() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }
}
