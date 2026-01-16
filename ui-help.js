import { technicalData } from './data-help.js';

export default class HelpSystem {
    constructor() {
        this.currentPath = '';
        this.cleanup = null;
        this.render();
        this.checkRoute();

        // Listen for route changes
        window.addEventListener('hashchange', () => this.checkRoute());
    }

    render() {
        // Create container only once
        if (document.getElementById('help-system-container')) return;

        const container = document.createElement('div');
        container.id = 'help-system-container';
        container.innerHTML = `
            <button id="help-btn" class="help-btn hidden" aria-label="Technical Details">
                <i class="ph ph-atom"></i>
            </button>
            <div id="help-modal" class="help-modal">
                <div class="help-content glass-card">
                    <button class="btn-icon close-help"><i class="ph ph-x"></i></button>
                    <div id="help-body"></div>
                </div>
            </div>
        `;
        document.body.appendChild(container);
        this.addStyles();
        this.attachListeners();
    }

    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .help-btn {
                position: fixed;
                bottom: 6rem;
                right: 2rem;
                width: 56px;
                height: 56px;
                border-radius: 50%;
                background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
                border: none;
                color: white;
                font-size: 1.5rem;
                cursor: pointer;
                box-shadow: 0 4px 15px rgba(104, 74, 255, 0.4);
                transition: transform 0.3s, box-shadow 0.3s;
                z-index: 900;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .help-btn:hover {
                transform: scale(1.1) rotate(10deg);
                box-shadow: 0 8px 25px rgba(104, 74, 255, 0.6);
            }
            .help-btn.hidden {
                display: none;
            }

            .help-modal {
                position: fixed;
                top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0,0,0,0.6);
                backdrop-filter: blur(5px);
                z-index: 1000;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.3s;
            }
            .help-modal.active {
                opacity: 1;
                pointer-events: all;
            }
            
            .help-content {
                width: 90%;
                max-width: 600px;
                max-height: 80vh;
                overflow-y: auto;
                position: relative;
                transform: translateY(20px);
                transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                background: rgba(15, 23, 42, 0.9);
            }
            .help-modal.active .help-content {
                transform: translateY(0);
            }
            
            .close-help {
                position: absolute;
                top: 1rem;
                right: 1rem;
            }
            
            /* Typography for help content */
            #help-body h2 {
                color: var(--color-secondary);
                font-size: 1.8rem;
                margin-bottom: 1.5rem;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            #help-body h4 {
                color: var(--color-primary-light);
                margin-top: 1rem;
                border-bottom: 1px solid rgba(255,255,255,0.1);
                padding-bottom: 0.5rem;
            }
            #help-body p {
                line-height: 1.7;
                color: rgba(255,255,255,0.8);
            }
            #help-body ul, #help-body ol {
                padding-left: 1.5rem;
                color: rgba(255,255,255,0.8);
                margin-bottom: 1rem;
            }
            #help-body li {
                margin-bottom: 0.5rem;
            }
            .code-block {
                background: rgba(0,0,0,0.3);
                padding: 1rem;
                border-radius: 8px;
                font-family: monospace;
                border: 1px solid rgba(255,255,255,0.1);
                margin: 1rem 0;
                color: #A5B4FC;
            }
        `;
        document.head.appendChild(style);
    }

    attachListeners() {
        const btn = document.getElementById('help-btn');
        const modal = document.getElementById('help-modal');
        const close = document.querySelector('.close-help');

        btn.addEventListener('click', () => {
            modal.classList.add('active');
        });

        const closeModal = () => modal.classList.remove('active');

        close.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }

    checkRoute() {
        const hash = window.location.hash.slice(1) || '/';
        const cleanPath = hash.split('?')[0]; // Remove query params if any

        const btn = document.getElementById('help-btn');
        const body = document.getElementById('help-body');

        // Hide on Home and About
        if (cleanPath === '/' || cleanPath === '/about' || cleanPath === '/dashboard') {
            btn.classList.add('hidden');
            return;
        }

        const data = technicalData[cleanPath];
        if (data) {
            btn.classList.remove('hidden');
            // Update content now
            body.innerHTML = `
                <h2><i class="ph ${data.icon}"></i> ${data.title}</h2>
                <div class="help-text">${data.content}</div>
            `;
        } else {
            // If no unique data, maybe show generic info or hide?
            // User request: "on every page other than the main page and the about page"
            // For now, if no data, hide.
            btn.classList.add('hidden');

            // Or fallback?
            if (cleanPath !== '/' && cleanPath !== '/about') {
                // For pages like /files or /editor if we didn't add data yet
                // We can show generic or add data for them.
                // Let's add data for them later.
            }
        }
    }
}
