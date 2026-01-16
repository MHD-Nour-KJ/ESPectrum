/**
 * ESPectrum - Main Application Bootstrap
 * Entry point that initializes all services and components
 */

import router from './app-router.js';
import store from './app-store.js';
import wsService from './service-socket.js';
import AnimatedBackground from './ui-background.js';
import Header from './ui-header.js';
import Drawer from './ui-drawer.js';
import Footer from './ui-footer.js';
import HelpSystem from './ui-help.js';

// Import pages
import pageHome from './page-home.js';
import pageDashboard from './page-dashboard.js';
import pageTerminal from './page-terminal.js';
import pageAbout from './page-about.js';

/**
 * Application class
 */
class App {
    constructor() {
        this.background = null;
        this.header = null;
        this.drawer = null;
        this.footer = null;
    }

    /**
     * Initialize the application
     */
    async init() {
        console.log('%c🚀 ESPectrum Starting...', 'color: #684AFF; font-size: 16px; font-weight: bold;');

        // 1. Initialize animated background
        this.initBackground();

        // 2. Initialize header
        this.initHeader();

        // 3. Initialize navigation drawer
        this.initDrawer();

        // 4. Initialize footer
        this.initFooter();

        // 5. Initialize Help System
        new HelpSystem();

        // 5. Register routes
        await this.registerRoutes();

        // 6. Initialize router
        router.init();

        // 7. Connect MQTT
        await this.connectMQTT();

        // 8. Add global error handler
        this.addErrorHandler();

        console.log('%c✨ ESPectrum Ready!', 'color: #10B981; font-size: 14px; font-weight: bold;');

        // Show welcome message in console
        this.showWelcomeMessage();
    }

    initBackground() {
        const canvas = document.getElementById('background-canvas');
        if (canvas) {
            this.background = new AnimatedBackground(canvas);
            console.log('✓ Animated background initialized');
        }
    }

    initHeader() {
        const container = document.getElementById('app-header');
        if (container) {
            this.header = new Header(container);
            this.header.render();
            // Verify smart scroll is active
            if (window.scrollY > 50) this.header.container.querySelector('.header-wrapper')?.classList.add('header-hidden');
            console.log('✓ Header initialized');
        }
    }

    initDrawer() {
        const container = document.getElementById('app-drawer');
        if (container) {
            this.drawer = new Drawer(container);
            this.drawer.render();
            console.log('✓ Navigation drawer initialized');
        }
    }

    initFooter() {
        const container = document.getElementById('app-footer');
        if (container) {
            this.footer = new Footer(container);
            this.footer.render();
            console.log('✓ Footer initialized');
        }
    }

    registerRoutes() {
        router.register('/', pageHome);
        router.register('/dashboard', pageDashboard);
        router.register('/terminal', pageTerminal);
        router.register('/about', new pageAbout());

        // Hacker Board Routes

        // 1. WiFi Tools
        import('./page-wifi-tools.js').then(module => {
            const PageWifiTools = module.default;
            const wifiTools = new PageWifiTools();
            router.register('/wifi-scanner', wifiTools);
            router.register('/wifi-sonar', wifiTools);
            router.register('/wifi-traffic', wifiTools);
            router.register('/defense', wifiTools);
        });

        // 2. Attack Tools (Hacker Mode)
        import('./page-hack.js').then(module => {
            const PageHack = module.default;
            const hackTools = new PageHack();
            router.register('/attack-rickroll', hackTools);
            router.register('/attack-eviltwin', hackTools);
            router.register('/attack-sour-apple', hackTools);
        });

        // 3. File System
        import('./page-files.js').then(module => {
            const PageFiles = module.default;
            const fileTools = new PageFiles();
            router.register('/files', fileTools);
            router.register('/editor', fileTools);
        });

        // 4. Hardware Tools (BLE, IR, Sheep)
        import('./page-hardware.js').then(module => {
            const PageHardware = module.default;
            const hardwareTools = new PageHardware();
            router.register('/ble-scanner', hardwareTools); // View is determined by hash in render method
            router.register('/ble-hid', hardwareTools);
            router.register('/ir-remote', hardwareTools);
            router.register('/wall-of-sheep', hardwareTools);
        });

        // 5. Chat
        import('./page-chat.js').then(module => {
            const PageChat = module.default;
            router.register('/chat', new PageChat());
        });

        console.log('✓ Routes registered');
    }

    async connectMQTT() {
        try {
            await wsService.connect();
            console.log('✓ MQTT service started');
        } catch (err) {
            console.warn('⚠ MQTT connection failed', err);
        }
    }

    addErrorHandler() {
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);

            // Show user-friendly error
            this.showErrorNotification(event.error.message);
        });

        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
        });
    }

    showErrorNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'error-notification scale-in';
        notification.innerHTML = `
      <div class="glass-card" style="
        position: fixed;
        top: 100px;
        right: 20px;
        z-index: 1000;
        padding: 1rem;
        min-width: 300px;
        background: rgba(239, 68, 68, 0.1);
        border-color: #EF4444;
      ">
        <div class="flex-between">
          <strong style="color: #EF4444;">
            <i class="ph ph-warning"></i>
            Error
          </strong>
          <button class="btn-icon" onclick="this.parentElement.parentElement.remove()">
            <i class="ph ph-x"></i>
          </button>
        </div>
        <p style="margin: 0.5rem 0 0; font-size: 0.875rem;">
          ${message}
        </p>
      </div>
    `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    showWelcomeMessage() {
        console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   ███████╗███████╗██████╗ ███████╗ ██████╗████████╗██████╗  ║
║   ██╔════╝██╔════╝██╔══██╗██╔════╝██╔════╝╚══██╔══╝██╔══██╗ ║
║   █████╗  ███████╗██████╔╝█████╗  ██║        ██║   ██████╔╝ ║
║   ██╔══╝  ╚════██║██╔═══╝ ██╔══╝  ██║        ██║   ██╔══██╗ ║
║   ███████╗███████║██║     ███████╗╚██████╗   ██║   ██║  ██║ ║
║   ╚══════╝╚══════╝╚═╝     ╚══════╝ ╚═════╝   ╚═╝   ╚═╝  ╚═╝ ║
║                                                              ║
║   ESP32 Hardware Visualization Interface                    ║
║   Version 1.0.0                                              ║
║                                                              ║
║   Debug Commands:                                            ║
║   • window.ESPECTRUM_DEBUG = true   (Enable debug logging)   ║
║   • window.store.getState()        (View current state)     ║
║   • window.router.navigate('/path') (Navigate programmatically) ║
║   • window.wsService                (Access WebSocket service) ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
    `);
    }
}

// Create and initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const app = new App();
        app.init();
    });
} else {
    const app = new App();
    app.init();
}

// Export for debugging
window.App = App;
