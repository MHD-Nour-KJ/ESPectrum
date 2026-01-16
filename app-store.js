/**
 * ESPectrum - Central State Management Store
 * Pub/Sub pattern for reactive state management
 */

class Store {
    constructor() {
        this.state = {
            // Connection status
            connected: false,
            mockMode: false,
            hardwareConnected: false,
            lastHeartbeat: 0,
            connectionAttempts: 0,

            // Sensor data
            sensorData: {
                touch: Array(10).fill(0),
                hall: 0,
                temp: 0,
                rssi: -100,
                uptime: 0
            },

            // System events
            systemStatus: 'initializing', // 'initializing', 'connected', 'disconnected', 'error'
            lastWakeup: null,
            lastMessage: null, // For chat

            // User preferences (loaded from localStorage)
            theme: 'dark',
            chartHistoryLength: 50,
            terminalMaxLines: 100,
            hapticsEnabled: true,

            // UI state
            drawerOpen: false,
            currentPage: 'home',

            // File System State
            fileList: [],
            currentFile: {
                path: '',
                content: '',
                loading: false
            },

            // Network Tools State
            wifiNetworks: [],
            bleDevices: [],
            trafficData: [],
            attackLogs: [],
            chatMessages: []
        };

        this.subscribers = new Map();
        this.history = []; // For time-travel debugging

        // Load preferences from localStorage
        this.loadPreferences();
    }

    /**
     * Subscribe to state changes
     * @param {string} key - State key to watch (or '*' for all changes)
     * @param {Function} callback - Function to call on change
     * @returns {Function} Unsubscribe function
     */
    subscribe(key, callback) {
        if (!this.subscribers.has(key)) {
            this.subscribers.set(key, new Set());
        }

        this.subscribers.get(key).add(callback);

        // Return unsubscribe function
        return () => {
            const subs = this.subscribers.get(key);
            if (subs) subs.delete(callback);
        };
    }

    /**
     * Dispatch state changes
     * @param {string} action - Action type (for debugging)
     * @param {Object} updates - State updates to apply
     */
    dispatch(action, updates) {
        const prevState = { ...this.state };

        // Apply updates
        if (action === 'CHAT_MESSAGE_RECEIVED') {
            updates = { lastMessage: updates };
        } else if (action === 'WS_STATUS_CHANGE' || action === 'HARDWARE_HEARTBEAT' || action === 'HARDWARE_OFFLINE') {
            // Already correctly shaped, fall through
        }

        this.state = this._deepMerge(this.state, updates);

        // Store in history (limit to last 50 actions)
        this.history.push({
            action,
            timestamp: Date.now(),
            state: { ...this.state }
        });
        if (this.history.length > 50) this.history.shift();

        // Debug logging
        if (window.ESPECTRUM_DEBUG) {
            console.log(`[Store] ${action}`, updates);
        }

        // Notify subscribers
        Object.keys(updates).forEach(key => {
            // Notify specific key subscribers
            if (this.subscribers.has(key)) {
                this.subscribers.get(key).forEach(cb => {
                    console.log(`[Store] Notifying subscriber for ${key}:`, this.state[key]);
                    cb(this.state[key], prevState[key]);
                });
            }

            // Notify wildcard subscribers
            if (this.subscribers.has('*')) {
                this.subscribers.get('*').forEach(cb => {
                    cb(this.state, prevState);
                });
            }
        });

        // Save preferences if they changed
        const prefKeys = ['theme', 'chartHistoryLength', 'terminalMaxLines', 'hapticsEnabled'];
        if (Object.keys(updates).some(k => prefKeys.includes(k))) {
            this.savePreferences();
        }
    }

    /**
     * Get current state
     */
    getState() {
        return { ...this.state };
    }

    /**
     * Load preferences from localStorage
     */
    loadPreferences() {
        try {
            const saved = localStorage.getItem('espectrum_preferences');
            if (saved) {
                const prefs = JSON.parse(saved);
                this.state = { ...this.state, ...prefs };
            }
        } catch (err) {
            console.warn('[Store] Failed to load preferences:', err);
        }
    }

    /**
     * Save preferences to localStorage
     */
    savePreferences() {
        try {
            const prefs = {
                theme: this.state.theme,
                chartHistoryLength: this.state.chartHistoryLength,
                terminalMaxLines: this.state.terminalMaxLines,
                hapticsEnabled: this.state.hapticsEnabled
            };
            localStorage.setItem('espectrum_preferences', JSON.stringify(prefs));
        } catch (err) {
            console.warn('[Store] Failed to save preferences:', err);
        }
    }

    /**
     * Deep merge helper
     */
    _deepMerge(target, source) {
        const output = { ...target };

        for (const key in source) {
            if (source[key] instanceof Object && key in target) {
                output[key] = this._deepMerge(target[key], source[key]);
            } else {
                output[key] = source[key];
            }
        }

        return output;
    }

    /**
     * Reset to initial state
     */
    reset() {
        const prefs = {
            theme: this.state.theme,
            chartHistoryLength: this.state.chartHistoryLength,
            terminalMaxLines: this.state.terminalMaxLines,
            hapticsEnabled: this.state.hapticsEnabled
        };

        this.state = {
            connected: false,
            mockMode: false,
            connectionAttempts: 0,
            sensorData: {
                touch: Array(10).fill(0),
                hall: 0,
                temp: 0,
                uptime: 0
            },
            systemStatus: 'initializing',
            lastWakeup: null,
            ...prefs,
            drawerOpen: false,
            currentPage: 'home'
        };

        this.history = [];
    }
}

// Create singleton instance
const store = new Store();

// Enable debug mode via console
window.ESPECTRUM_DEBUG = false;
window.store = store;

export default store;
