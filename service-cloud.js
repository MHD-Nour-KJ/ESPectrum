/**
 * ESPectrum - Cloud Database Service
 * Handles communication with Google Sheets via Apps Script
 */

import store from './app-store.js';
import { showToast } from './utils-helpers.js';

const CLOUD_DB_URL = "/api/db";

class CloudService {
    constructor() {
        this.isSyncing = false;
        this.lastSync = null;
    }

    /**
     * Generic fetch helper (now hits our secure proxy)
     */
    async _request(params = {}, isPost = false) {
        try {
            this.setSyncing(true);

            let url = CLOUD_DB_URL;
            let options = {
                method: isPost ? 'POST' : 'GET',
                mode: 'cors',
                headers: {
                    'Content-Type': 'application/json',
                }
            };

            if (isPost) {
                options.body = JSON.stringify(params);
            } else {
                const query = new URLSearchParams(params).toString();
                url += (url.includes('?') ? '&' : '?') + query;
            }

            const response = await fetch(url, options);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const data = await response.json();


            const wasConnected = store.getState().dbConnected;
            if (!wasConnected) showToast('Cloud Database Connected', 'success');

            store.dispatch('DB_STATUS_CHANGE', { dbConnected: true, lastDbSync: Date.now() });
            return data;
        } catch (error) {
            console.error('[Cloud] Request Failed:', error);
            const wasConnected = store.getState().dbConnected;
            if (wasConnected) showToast('Cloud Database Offline', 'error');

            store.dispatch('DB_STATUS_CHANGE', { dbConnected: false });
            return null;
        } finally {
            this.setSyncing(false);
        }
    }

    setSyncing(val) {
        this.isSyncing = val;
        store.dispatch('DB_SYNCING_CHANGE', { dbSyncing: val });
    }

    /**
     * Logs an event to the cloud
     * @param {string} category - System, Security, File, BLE, etc.
     * @param {string} event - Short description
     * @param {string} details - Detailed info
     */
    async log(category, event, details = "") {
        return await this._request({
            action: 'log',
            category,
            event,
            details: typeof details === 'object' ? JSON.stringify(details) : details
        }, true);
    }

    /**
     * Saves a configuration key-value pair
     */
    async saveConfig(key, value) {
        return await this._request({
            action: 'saveConfig',
            key,
            value: typeof value === 'object' ? JSON.stringify(value) : value
        }, true);
    }

    /**
     * Fetches all configuration
     */
    async getConfig() {
        return await this._request({ action: 'getConfig' });
    }

    /**
     * Records a chat message
     */
    async addChat(user, message) {
        return await this._request({
            action: 'addChat',
            user,
            message,
            id: Date.now().toString(36)
        }, true);
    }

    /**
     * Fetches recent chat history
     */
    async getChat() {
        return await this._request({ action: 'getChat' });
    }

    /**
     * Deletes all chat history
     */
    async deleteChat() {
        return await this._request({ action: 'deleteChat' }, true);
    }

    /**
     * Logs file system operations
     */
    async logFile(filename, size, lastAction) {
        return await this._request({
            action: 'logFile',
            filename,
            size,
            lastAction
        }, true);
    }

    /**
     * Batch logs WiFi scan results
     */
    async saveWifiScan(networks) {
        if (!Array.isArray(networks) || networks.length === 0) return;
        return await this._request({
            action: 'saveWifiScan',
            networks
        }, true);
    }

    /**
     * Batch logs BLE scan results
     */
    async saveBleScan(devices) {
        if (!Array.isArray(devices) || devices.length === 0) return;
        return await this._request({
            action: 'saveBleScan',
            devices
        }, true);
    }

    /**
     * Fetches full logs for reporting
     */
    async getLogs() {
        return await this._request({ action: 'getLogs' });
    }
}

const cloud = new CloudService();
export default cloud;
