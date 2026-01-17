/**
 * ESPectrum - Vanilla JS SPA Router
 * Hash-based routing without dependencies
 */

class Router {
    constructor() {
        this.routes = new Map();
        this.currentPage = null;
        this.currentCleanup = null;
        this.container = null;

        // Define the linear navigation order
        this.navOrder = [
            { path: '/files', title: 'File Explorer' },
            { path: '/editor', title: 'Code Editor' },
            { path: '/wifi-scanner', title: 'WiFi Scanner' },
            { path: '/wifi-sonar', title: 'WiFi Sonar' },
            { path: '/wifi-traffic', title: 'Traffic Matrix' },
            { path: '/wall-of-sheep', title: 'Wall of Sheep' },
            { path: '/ble-scanner', title: 'BLE Scanner' },
            { path: '/ir-remote', title: 'TV-B-Gone' },
            { path: '/attack-rickroll', title: 'Rick-Roll' },
            { path: '/attack-eviltwin', title: 'Evil Twin' },
            { path: '/attack-sour-apple', title: 'Sour Apple' },
            { path: '/ble-hid', title: 'Ghost Keyboard' },
            { path: '/defense', title: 'Deauth Detector' },
            { path: '/chat', title: 'Hacker Chat' },
            { path: '/reports', title: 'Cloud Reports' }
        ];
    }

    /**
     * Register a route
     * @param {string} path - Route path (e.g., '/dashboard')
     * @param {Object} pageModule - Page module with render() and cleanup()
     */
    register(path, pageModule) {
        this.routes.set(path, pageModule);
        return this;
    }

    /**
     * Initialize the router
     */
    init() {
        this.container = document.getElementById('app-content');

        if (!this.container) {
            console.error('[Router] Container #app-content not found');
            return;
        }

        // Listen to hash changes
        window.addEventListener('hashchange', () => this.handleRoute());

        // Handle initial route
        this.handleRoute();
    }

    /**
     * Navigate to a route programmatically
     * @param {string} path - Path to navigate to
     */
    navigate(path) {
        window.location.hash = path;
    }

    /**
     * Handle route changes
     */
    async handleRoute() {
        // Get current hash (remove #)
        let hash = window.location.hash.slice(1) || '/';

        // Parse path and params
        const [path, queryString] = hash.split('?');
        const params = this.parseQueryString(queryString);

        // Find matching route
        let route = this.routes.get(path);

        // Fallback to home if not found
        if (!route) {
            console.warn(`[Router] Route not found: ${path}, redirecting to home`);
            route = this.routes.get('/');
            window.location.hash = '/';
        }

        // Cleanup previous page
        if (this.currentCleanup) {
            try {
                await this.currentCleanup();
            } catch (err) {
                console.error('[Router] Cleanup error:', err);
            }
        }

        // Clear container
        this.container.innerHTML = '';

        // Show loading skeleton
        this.showLoadingSkeleton();

        // Small delay for smooth transition
        await this.sleep(100);

        // Render new page
        try {
            this.currentCleanup = await route.render(this.container, params);
            this.currentPage = path;

            // Inject Navigation Buttons
            this.injectNavButtons(path);

            // Update navigation active state
            this.updateNavActiveState(path);

            // Scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' });

            // Update store
            if (window.store) {
                window.store.dispatch('ROUTE_CHANGE', { currentPage: path });
            }

            // Log navigation
            if (window.ESPECTRUM_DEBUG) {
                console.log(`[Router] Navigated to ${path}`, params);
            }
        } catch (err) {
            console.error('[Router] Render error:', err);
            this.showErrorPage(err);
        }
    }

    injectNavButtons(currentPath) {
        // Don't show on Home or About
        if (currentPath === '/' || currentPath === '/about') return;

        const currentIndex = this.navOrder.findIndex(item => item.path === currentPath);

        let prevItem = null;
        let nextItem = null;

        if (currentIndex !== -1) {
            // Found in list
            if (currentIndex > 0) {
                prevItem = this.navOrder[currentIndex - 1];
            }
            if (currentIndex < this.navOrder.length - 1) {
                nextItem = this.navOrder[currentIndex + 1];
            } else {
                // Last page -> Next is About
                nextItem = { path: '/about', title: 'About' };
            }
        } else if (currentPath === '/dashboard') {
            // If dashboard is visited (Start Exploring), Next is First Tool
            nextItem = this.navOrder[0];
        }

        // Create Container
        const navContainer = document.createElement('div');
        navContainer.className = 'page-nav-buttons';
        navContainer.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 0;
            right: 0;
            pointer-events: none;
            display: flex;
            justify-content: space-between;
            padding: 0 20px;
            z-index: 90;
        `;

        // Render Prev Button
        let prevHtml = '';
        if (prevItem) {
            prevHtml = `
                <a href="#${prevItem.path}" class="btn btn-secondary nav-btn glow-card" style="pointer-events: auto; border-radius: 99px;">
                    <i class="ph ph-arrow-left"></i>
                    ${prevItem.title}
                </a>
             `;
        } else {
            prevHtml = '<div></div>'; // Spacer
        }

        // Render Next Button
        let nextHtml = '';
        if (nextItem) {
            nextHtml = `
                <a href="#${nextItem.path}" class="btn btn-primary nav-btn glow-card" style="pointer-events: auto; border-radius: 99px;">
                    ${nextItem.title}
                    <i class="ph ph-arrow-right"></i>
                </a>
             `;
        } else {
            nextHtml = '<div></div>'; // Spacer
        }

        navContainer.innerHTML = prevHtml + nextHtml;

        // Remove any existing nav buttons first
        const existingNav = document.querySelectorAll('.page-nav-buttons');
        existingNav.forEach(nav => nav.remove());

        // Then append the new one
        document.body.appendChild(navContainer);

        // Ensure cleanup on next route change
        const originalCleanup = this.currentCleanup;
        this.currentCleanup = () => {
            const allNav = document.querySelectorAll('.page-nav-buttons');
            allNav.forEach(n => n.remove());
            if (originalCleanup) return originalCleanup();
        };
    }

    /**
     * Parse query string into object
     */
    parseQueryString(queryString) {
        if (!queryString) return {};

        const params = {};
        queryString.split('&').forEach(pair => {
            const [key, value] = pair.split('=');
            params[decodeURIComponent(key)] = decodeURIComponent(value || '');
        });

        return params;
    }

    /**
     * Update navigation active state
     */
    updateNavActiveState(path) {
        const navLinks = document.querySelectorAll('[data-route]');
        navLinks.forEach(link => {
            const linkPath = link.getAttribute('data-route');
            if (linkPath === path) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    /**
     * Show loading skeleton while page loads
     */
    showLoadingSkeleton() {
        this.container.innerHTML = `
      <div class="grid grid-auto gap-md">
        <div class="glass-card skeleton skeleton-card"></div>
        <div class="glass-card skeleton skeleton-card"></div>
        <div class="glass-card skeleton skeleton-card"></div>
      </div>
    `;
    }

    /**
     * Show error page
     */
    showErrorPage(error) {
        this.container.innerHTML = `
      <div class="glass-card text-center" style="padding: 3rem;">
        <i class="ph ph-warning-circle" style="font-size: 4rem; color: var(--color-accent);"></i>
        <h2 style="margin-top: 1rem;">Oops! Something went wrong</h2>
        <p style="color: var(--text-secondary); margin: 1rem 0;">
          ${error.message || 'An unexpected error occurred while loading the page.'}
        </p>
        <button class="btn btn-primary" onclick="location.reload()">
          <i class="ph ph-arrow-clockwise"></i>
          Reload Page
        </button>
      </div>
    `;
    }

    /**
     * Utility: sleep
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Create singleton instance
const router = new Router();

// Expose globally for debugging
window.router = router;

export default router;
