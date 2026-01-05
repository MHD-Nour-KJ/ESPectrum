/**
 * ESPectrum - Header Component
 * Floating glass header with navigation
 */

import store from './app-store.js';

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
            <div id="connection-status"></div>
          </div>
          
          <div class="header-right">
            <!-- New LED Toggle Button -->
            <button class="btn btn-led" id="led-btn" aria-label="Toggle LED" title="Toggle ESP32 LED">
              <i class="ph ph-lightbulb"></i>
              <span class="led-text">ESP LED</span>
            </button>
            
            <button class="btn btn-icon" id="refresh-btn" aria-label="Refresh connection" title="Refresh Connection">
              <i class="ph ph-arrow-clockwise"></i>
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
        position: absolute;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        justify-content: center;
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
         weight: fill;
      }
      
      @media (max-width: 480px) {
        .header-center {
          display: none;
        }
        
        .led-text {
          display: none; /* Hide text on very small screens to prevent overflow */
        }
        .btn-led {
          padding: 8px; /* Revert to square-ish on mobile */
          border-radius: 8px;
        }
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
      isLedOn = !isLedOn;

      // Update UI
      if (isLedOn) {
        ledBtn.classList.add('active');
        // Change icon style to filled if library supports it, otherwise just glow
        ledBtn.querySelector('i').classList.replace('ph-lightbulb', 'ph-lightbulb-filament');
      } else {
        ledBtn.classList.remove('active');
        ledBtn.querySelector('i').classList.replace('ph-lightbulb-filament', 'ph-lightbulb');
      }

      // Send MQTT Command
      if (window.wsService) {
        const command = {
          type: 'command',
          action: 'toggle_led',
          params: { state: isLedOn }
        };
        window.wsService.send(JSON.stringify(command));
        console.log('[Header] Sent LED command:', command);
      }
    });

    // Refresh button
    const refreshBtn = document.getElementById('refresh-btn');
    refreshBtn?.addEventListener('click', () => {
      if (window.wsService) {
        window.wsService.disconnect();
        setTimeout(() => window.wsService.connect(), 500);
      }

      // Animate button
      refreshBtn.classList.add('spin');
      setTimeout(() => refreshBtn.classList.remove('spin'), 1000);
    });
  }

  subscribeToStore() {
    this.unsubscribe = store.subscribe('*', () => {
      this.updateConnectionStatus();
    });
  }

  initSmartScroll() {
    let lastScroll = 0;
    const header = document.getElementById('header-wrapper');

    window.addEventListener('scroll', () => {
      if (!header) return;

      const currentScroll = window.scrollY;

      // Down scroll & not at top
      if (currentScroll > lastScroll && currentScroll > 50) {
        header.classList.add('header-hidden');
      } else {
        // Up scroll
        header.classList.remove('header-hidden');
      }

      lastScroll = currentScroll;
    });
  }

  updateConnectionStatus() {
    const statusContainer = document.getElementById('connection-status');
    if (!statusContainer) return;

    const state = store.getState();
    let statusClass = 'status-disconnected';
    let statusText = 'Disconnected';
    let icon = 'ph-wifi-slash';

    if (state.mockMode) {
      statusClass = 'status-mock';
      statusText = 'Mock Mode';
      icon = 'ph-test-tube';
    } else if (state.connected) {
      statusClass = 'status-connected';
      statusText = 'Connected';
      icon = 'ph-wifi-high';
    }

    statusContainer.innerHTML = `
      <div class="badge ${statusClass}">
        <i class="ph ${icon}"></i>
        ${statusText}
      </div>
    `;
  }

  cleanup() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }
}
