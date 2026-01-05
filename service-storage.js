/**
 * ESPectrum - localStorage Abstraction Service
 * Provides safe localStorage access with fallbacks
 */

class StorageService {
    constructor() {
        this.prefix = 'espectrum_';
        this.available = this.checkAvailability();
    }

    /**
     * Check if localStorage is available
     */
    checkAvailability() {
        try {
            const test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (err) {
            console.warn('[Storage] localStorage not available:', err);
            return false;
        }
    }

    /**
     * Get item from storage
     * @param {string} key - Storage key
     * @param {*} defaultValue - Default value if not found
     * @returns {*} Stored value or default
     */
    get(key, defaultValue = null) {
        if (!this.available) return defaultValue;

        try {
            const item = localStorage.getItem(this.prefix + key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (err) {
            console.error('[Storage] Failed to get item:', err);
            return defaultValue;
        }
    }

    /**
     * Set item in storage
     * @param {string} key - Storage key
     * @param {*} value - Value to store
     * @returns {boolean} Success status
     */
    set(key, value) {
        if (!this.available) return false;

        try {
            localStorage.setItem(this.prefix + key, JSON.stringify(value));
            return true;
        } catch (err) {
            console.error('[Storage] Failed to set item:', err);
            return false;
        }
    }

    /**
     * Remove item from storage
     * @param {string} key - Storage key
     */
    remove(key) {
        if (!this.available) return;

        try {
            localStorage.removeItem(this.prefix + key);
        } catch (err) {
            console.error('[Storage] Failed to remove item:', err);
        }
    }

    /**
     * Clear all ESPectrum data
     */
    clear() {
        if (!this.available) return;

        try {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith(this.prefix)) {
                    localStorage.removeItem(key);
                }
            });
        } catch (err) {
            console.error('[Storage] Failed to clear storage:', err);
        }
    }

    /**
     * Get all ESPectrum keys
     */
    keys() {
        if (!this.available) return [];

        try {
            return Object.keys(localStorage)
                .filter(key => key.startsWith(this.prefix))
                .map(key => key.replace(this.prefix, ''));
        } catch (err) {
            console.error('[Storage] Failed to get keys:', err);
            return [];
        }
    }
}

// Create singleton
const storageService = new StorageService();

export default storageService;
