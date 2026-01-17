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
            dbConnected: false,
            dbSyncing: false,
            lastDbSync: null,
            connectionAttempts: 0,

            // Sensor data
            sensorData: {
                touch: Array(2).fill(0),
                temp: 0,
                rssi: -100,
                uptime: 0
            },
            ledState: false,

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
            packetHistory: [],
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
     * @param {Object} payload - State updates or specific action payload
     */
    dispatch(action, payload) {
        const prevState = { ...this.state };
        let updates = {};

        switch (action) {
            case 'RECORD_MESSAGE':
                updates = { lastMessage: payload.message };
                break;
            case 'PACKET_RECEIVED':
                const newPackets = [payload.packet, ...this.state.packetHistory].slice(0, 100);
                updates = { packetHistory: newPackets };
                break;
            case 'CHAT_MESSAGE_RECEIVED':
                updates = { chatMessages: payload.chatMessages };
                break;
            case 'WS_STATUS_CHANGE':
            case 'HARDWARE_HEARTBEAT':
            case 'HARDWARE_OFFLINE':
            case 'DB_STATUS_CHANGE':
            case 'DB_SYNCING_CHANGE':
            case 'UPDATE_THEME':
            case 'LED_STATE_UPDATE':
                // These actions are expected to have payload directly as updates
                updates = payload;
                break;
            default:
                // For all other actions, assume payload is the updates object
                updates = payload;
                break;
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
            // If the value is an array, replace it entirely (don't merge items)
            if (Array.isArray(source[key])) {
                output[key] = source[key];
            }
            // If it's a plain object, merge recursively
            else if (source[key] instanceof Object && key in target && !Array.isArray(target[key])) {
                output[key] = this._deepMerge(target[key], source[key]);
            }
            else {
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
