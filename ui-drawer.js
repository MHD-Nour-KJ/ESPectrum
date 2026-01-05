/**
 * ESPectrum - Off-Canvas Navigation Drawer
 * Slide-out side panel with glass texture
 */

import store from './app-store.js';
import router from './app-router.js';

export default class Drawer {
  constructor(container) {
    this.container = container;
    this.unsubscribe = null;
  }

  render() {
    this.container.innerHTML = `
      <div class="drawer-overlay" id="drawer-overlay"></div>
      <div class="drawer-panel glass-card" id="drawer-panel">
        <div class="drawer-header">
          <h3>
            <i class="ph ph-lightning"></i>
            Navigation
          </h3>
          <button class="btn btn-icon" id="drawer-close" aria-label="Close menu">
            <i class="ph ph-x"></i>
          </button>
        </div>
        
        <nav class="drawer-nav">
          <div class="nav-section">
            <h4 class="nav-category">General</h4>
            <a href="#/" class="nav-link" data-route="/">
              <i class="ph ph-house"></i>
              <span>Home</span>
            </a>
            <a href="#/dashboard" class="nav-link" data-route="/dashboard">
              <i class="ph ph-gauge"></i>
              <span>Dashboard</span>
            </a>
          </div>

          <div class="nav-section">
            <h4 class="nav-category">File System</h4>
            <a href="#/files" class="nav-link" data-route="/files">
              <i class="ph ph-folder-open"></i>
              <span>File Explorer</span>
            </a>
            <a href="#/editor" class="nav-link" data-route="/editor">
              <i class="ph ph-code"></i>
              <span>Code Editor</span>
            </a>
          </div>

          <div class="nav-section">
            <h4 class="nav-category">WiFi Tools</h4>
            <a href="#/wifi-scanner" class="nav-link" data-route="/wifi-scanner">
              <i class="ph ph-radar"></i>
              <span>WiFi Sniffer</span>
            </a>
            <a href="#/wifi-sonar" class="nav-link" data-route="/wifi-sonar">
              <i class="ph ph-ruler"></i>
              <span>WiFi Sonar</span>
            </a>
             <a href="#/wifi-traffic" class="nav-link" data-route="/wifi-traffic">
              <i class="ph ph-traffic-signal"></i>
              <span>Traffic Matrix</span>
            </a>
          </div>

          <div class="nav-section">
            <h4 class="nav-category">Hacking Tools</h4>
            <a href="#/attack-rickroll" class="nav-link warning" data-route="/attack-rickroll">
              <i class="ph ph-music-notes"></i>
              <span>Rick-Roll Beacon</span>
            </a>
            <a href="#/attack-eviltwin" class="nav-link warning" data-route="/attack-eviltwin">
              <i class="ph ph-mask-happy"></i>
              <span>Evil Twin & Phishing</span>
            </a>
            <a href="#/attack-sour-apple" class="nav-link warning" data-route="/attack-sour-apple">
              <i class="ph ph-apple-logo"></i>
              <span>Sour Apple (BLE)</span>
            </a>
            <a href="#/defense" class="nav-link success" data-route="/defense">
              <i class="ph ph-shield-check"></i>
              <span>Deauth Detector</span>
            </a>
             <a href="#/wall-of-sheep" class="nav-link warning" data-route="/wall-of-sheep">
              <i class="ph ph-sheep"></i>
              <span>Wall of Sheep</span>
            </a>
          </div>
          
           <div class="nav-section">
            <h4 class="nav-category">Bluetooth & Hardware</h4>
            <a href="#/ble-scanner" class="nav-link" data-route="/ble-scanner">
              <i class="ph ph-bluetooth"></i>
              <span>BLE Scanner</span>
            </a>
             <a href="#/ble-hid" class="nav-link" data-route="/ble-hid">
              <i class="ph ph-keyboard"></i>
              <span>Ghost Keyboard</span>
            </a>
             <a href="#/ir-remote" class="nav-link" data-route="/ir-remote">
              <i class="ph ph-television"></i>
              <span>IR TV-B-Gone</span>
            </a>
            <a href="#/chat" class="nav-link" data-route="/chat">
              <i class="ph ph-chat-circle-dots"></i>
              <span>Hacker Chat</span>
            </a>
          </div>

          <div class="nav-section">
            <h4 class="nav-category">Stats & About</h4>
            <a href="#/about" class="nav-link" data-route="/about">
              <i class="ph ph-user"></i>
              <span>About Me</span>
            </a>
          </div>
        </nav>
        
        <div class="drawer-footer">
          <div class="drawer-info">
            <p class="mono" style="font-size: 0.875rem; margin: 0;">
              <i class="ph ph-microchip"></i>
              Hacker's Board v2.0
            </p>
          </div>
        </div>
      </div>
    `;

    // Add styles
    this.addStyles();

    // Attach event listeners
    this.attachEventListeners();

    // Subscribe to store
    this.subscribeToStore();
  }

  addStyles() {
    if (document.getElementById('drawer-styles')) return;

    const style = document.createElement('style');
    style.id = 'drawer-styles';
    style.textContent = `
      .drawer-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: var(--z-drawer);
        opacity: 0;
        pointer-events: none;
        transition: opacity var(--transition-medium);
      }
      
      .drawer-overlay.active {
        opacity: 1;
        pointer-events: all;
      }
      
      .drawer-panel {
        position: fixed;
        top: 0;
        left: 0;
        bottom: 0;
        width: 280px;
        z-index: calc(var(--z-drawer) + 1);
        transform: translateX(-100%);
        transition: transform var(--transition-medium);
        display: flex;
        flex-direction: column;
        border-radius: 0 var(--radius-lg) var(--radius-lg) 0;
        padding: 0;
        overflow: hidden;
        /* Less Transparent, Darker Background */
        background: rgba(15, 23, 42, 0.95);
        backdrop-filter: blur(20px);
        border-right: 1px solid var(--glass-border);
        box-shadow: 10px 0 30px rgba(0,0,0,0.5);
      }
      
      .drawer-panel.active {
        transform: translateX(0);
      }
      
      .drawer-header {
        padding: var(--spacing-md);
        border-bottom: 1px solid var(--glass-border);
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      
      .drawer-header h3 {
        margin: 0;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 1.25rem;
      }
      
      .drawer-nav {
        flex: 1;
        padding: var(--spacing-md);
        display: flex;
        flex-direction: column;
        gap: var(--spacing-sm);
        overflow-y: auto;
      }
      
      .nav-section {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-xs);
        margin-bottom: var(--spacing-sm);
      }
      
      .nav-category {
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: var(--text-tertiary);
        margin: 0 0 0.5rem 0.75rem;
        font-weight: 600;
      }
      
      .nav-link {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        padding: var(--spacing-xs) var(--spacing-md);
        color: var(--text-secondary);
        text-decoration: none;
        border-radius: var(--radius-md);
        transition: all var(--transition-fast);
        font-weight: 500;
        position: relative;
        font-size: 0.95rem;
      }

      /* Warning/Hack Links */
      .nav-link.warning:hover {
        color: #ff4a4a;
        background: rgba(255, 74, 74, 0.1);
      }
      
      .nav-link.success:hover {
        color: #4affb0;
        background: rgba(74, 255, 176, 0.1);
      }
      
      .nav-link i {
        font-size: 1.25rem;
      }
      
      .nav-link:hover {
        background: var(--glass-bg-hover);
        color: var(--text-primary);
        transform: translateX(4px);
      }
      
      .nav-link.active {
        background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
        color: var(--text-primary);
        box-shadow: 0 4px 16px rgba(104, 74, 255, 0.3);
      }
      
      .nav-link.active::before {
        content: '';
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 3px;
        background: var(--color-secondary);
        border-radius: 0 3px 3px 0;
      }
      
      .drawer-footer {
        padding: var(--spacing-md);
        border-top: 1px solid var(--glass-border);
      }
      
      .drawer-info {
        background: rgba(255, 255, 255, 0.03);
        padding: var(--spacing-sm);
        border-radius: var(--radius-md);
        border: 1px solid var(--glass-border);
      }
      

    `;

    document.head.appendChild(style);
  }

  attachEventListeners() {
    // Close button - scope to container to ensure we find it
    const closeBtn = this.container.querySelector('#drawer-close');
    console.log('[Drawer] Attaching listener to closeBtn:', closeBtn);
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        console.log('[Drawer] Close button CLICKED');
        store.dispatch('CLOSE_DRAWER', { drawerOpen: false });
      });
    }

    // Overlay click - scope to container
    const overlay = this.container.querySelector('#drawer-overlay');
    if (overlay) {
      overlay.addEventListener('click', () => {
        console.log('[Drawer] Overlay CLICKED');
        store.dispatch('CLOSE_DRAWER', { drawerOpen: false });
      });
    }

    // Nav links (close drawer on all devices after navigation)
    const navLinks = this.container.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        // Close drawer on all devices after navigation
        setTimeout(() => {
          console.log('[Drawer] Nav link CLICKED');
          store.dispatch('CLOSE_DRAWER', { drawerOpen: false });
        }, 100);
      });
    });
  }

  subscribeToStore() {
    this.unsubscribe = store.subscribe('drawerOpen', (isOpen) => {
      console.log('[Drawer] Subscriber called. isOpen:', isOpen);
      // Use container scope to ensure we toggle the correct elements
      const panel = this.container.querySelector('#drawer-panel');
      const overlay = this.container.querySelector('#drawer-overlay');

      console.log('[Drawer] Elements found:', { panel, overlay });

      if (isOpen) {
        panel?.classList.add('active');
        if (panel) panel.style.transform = 'translateX(0)';

        overlay?.classList.add('active');
        if (overlay) overlay.style.opacity = '1';
        if (overlay) overlay.style.pointerEvents = 'all';
      } else {
        panel?.classList.remove('active');
        if (panel) panel.style.transform = 'translateX(-100%)';

        overlay?.classList.remove('active');
        if (overlay) overlay.style.opacity = '0';
        if (overlay) overlay.style.pointerEvents = 'none';
      }
    });
  }

  cleanup() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }
}
