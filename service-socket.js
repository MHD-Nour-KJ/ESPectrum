/**
 * ESPectrum - MQTT Service (Flespi)
 * Handles real-time communication via MQTT
 */

import store from './app-store.js';

class MQTTService {
    constructor() {
        this.client = null;
        this.token = 'AS2wNDPtK056fOhQAQdcEOdx3ceJ0dPmEioS81O0q2ytBvxW8FM5uIcQ3m3C4FOc';
        this.clientId = 'espectrum-web-' + Math.random().toString(16).substr(2, 8);
        this.topicData = 'espectrum/data';
        this.topicTelemetry = 'espectrum/telemetry';
        this.topicChat = 'espectrum/chat';
        this.topicCommand = 'espectrum/command';

        // Mock mode for fallback
        this.mockMode = false;
        this.mockInterval = null;

        // Connection handling
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.isExplicitlyDisconnected = false;
        this.watchdogInterval = null;
    }

    /**
     * Initialize connection
     */
    async connect() {
        if (this.client && this.client.connected) return;

        this.startWatchdog();

        this.isExplicitlyDisconnected = false;
        store.dispatch('WS_STATUS_CHANGE', {
            systemStatus: 'connecting',
            connected: false,
            mockMode: false
        });
        console.log('[MQTT] Connecting to Flespi...');

        try {
            // Connect to Flespi Broker over WSS
            this.client = mqtt.connect('wss://mqtt.flespi.io:443', {
                username: this.token,
                clientId: this.clientId,
                clean: true,
                keepalive: 60,
                reconnectPeriod: 0 // We handle reconnection manually for better UI control
            });

            this.client.on('connect', () => this.onConnect());
            this.client.on('message', (topic, message) => this.onMessage(topic, message));
            this.client.on('error', (err) => this.onError(err));
            this.client.on('offline', () => this.onOffline());
            this.client.on('close', () => this.onClose());

        } catch (err) {
            console.error('[MQTT] Init failed:', err);
            this.handleConnectionFailure(err);
        }
    }

    /**
     * Manual Retry from UI
     */
    retry() {
        this.disconnect();
        setTimeout(() => this.connect(), 500);
    }

    /**
     * Connected to broker
     */
    onConnect() {
        console.log('[MQTT] Connected!');
        this.mockMode = false;
        this.reconnectAttempts = 0;

        // Subscribe to topics
        const topics = [this.topicData, this.topicTelemetry, this.topicChat];
        this.client.subscribe(topics, (err) => {
            if (!err) console.log(`[MQTT] Subscribed to ${topics.join(', ')}`);
        });

        store.dispatch('WS_CONNECTED', {
            connected: true,
            mockMode: false,
            systemStatus: 'connected'
        });
    }

    /**
     * Message received
     */
    onMessage(topic, messageBuffer) {
        try {
            const messageStr = messageBuffer.toString();
            const message = JSON.parse(messageStr);

            if (window.ESPECTRUM_DEBUG) {
                console.log('[MQTT] RX:', topic, message);
            }

            if (topic === this.topicChat) {
                this.handleChatMessage(message);
            } else if (topic === this.topicData || topic === this.topicTelemetry) {
                this.handleDataMessage(message);
            }

        } catch (err) {
            console.error('[MQTT] Parse error:', err);
        }
    }

    /**
     * Handle chat messages
     */
    handleChatMessage(message) {
        store.dispatch('CHAT_MESSAGE_RECEIVED', message);
    }

    /**
     * Handle business logic for incoming messages
     */
    handleDataMessage(message) {
        // Update Heartbeat on ANY message from ESP32
        store.dispatch('HARDWARE_HEARTBEAT', {
            hardwareConnected: true,
            lastHeartbeat: Date.now()
        });

        // Sensor Data
        if (message.type === 'sensor_data') {
            // Unify structure: Hardware is flat, Mock has .data
            const actualData = message.data || message;

            // Dispatch specifically the sensor fields to the store
            store.dispatch('SENSOR_DATA_UPDATE', {
                sensorData: {
                    touch: actualData.touch,
                    hall: actualData.hall,
                    temp: actualData.temp,
                    rssi: actualData.rssi,
                    uptime: actualData.uptime
                }
            });
        }
        // Chat Messages
        else if (message.type === 'chat') {
            store.dispatch('CHAT_MESSAGE_RECEIVED', {
                chatMessages: [...store.getState().chatMessages, message].slice(-50)
            });
        }
        // Attack Logs
        else if (message.type === 'attack_log') {
            store.dispatch('ATTACK_LOG_RECEIVED', {
                attackLogs: [message.entry, ...store.getState().attackLogs].slice(0, 50)
            });
        }
        // WiFi Scan results
        else if (message.type === 'scan_result_wifi') {
            store.dispatch('WIFI_SCAN_COMPLETE', {
                wifiNetworks: message.networks || []
            });
        }
        // BLE Scan results
        else if (message.type === 'scan_result_ble') {
            store.dispatch('BLE_SCAN_COMPLETE', {
                bleDevices: message.devices || []
            });
        }
        // File List Response
        else if (message.type === 'file_list') {
            store.dispatch('FILES_UPDATED', {
                fileList: message.data || []
            });
        }
        // File Content Response
        else if (message.type === 'file_content') {
            store.dispatch('FILE_CONTENT_RECEIVED', {
                currentFile: {
                    path: message.path,
                    content: message.content,
                    loading: false
                }
            });
        }
        // System Events (Sleep/Wake)
        else if (message.type === 'system_event') {
            if (message.event === 'wakeup') {
                store.dispatch('SYSTEM_WAKEUP', {
                    lastWakeup: {
                        duration: message.data.sleep_duration,
                        reason: message.data.wakeup_reason,
                        timestamp: Date.now()
                    },
                    systemStatus: 'connected'
                });
                this.showWakeupNotification(message.data);
            }
        }
    }

    /**
     * Connection Error
     */
    onError(error) {
        console.error('[MQTT] Error:', error);
        // Don't dispatch error status immediately, wait for close/offline
    }

    /**
     * Connection Lost
     */
    onOffline() {
        if (this.isExplicitlyDisconnected) return;

        console.warn('[MQTT] Offline');
        store.dispatch('WS_STATUS_CHANGE', {
            connected: false,
            systemStatus: 'disconnected'
        });

        // Attempt reconnect if not explicitly closed
        this.attemptReconnect();
    }

    /**
     * Connection Closed
     */
    onClose() {
        console.log('[MQTT] Closed');
        if (!this.isExplicitlyDisconnected) {
            this.attemptReconnect();
        }
    }

    /**
     * Handle Reconnection Logic
     */
    attemptReconnect() {
        if (this.client && this.client.connected) return;
        if (this.mockMode) return;

        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = this.reconnectAttempts * 1000;

            console.log(`[MQTT] Reconnecting attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms...`);

            store.dispatch('WS_STATUS_CHANGE', {
                systemStatus: 'retrying',
                connectionAttempts: this.reconnectAttempts
            });

            setTimeout(() => {
                if (!this.client || !this.client.connected) {
                    this.client?.reconnect(); // Trigger mqtt.js reconnect
                }
            }, delay);
        } else {
            console.warn('[MQTT] Max reconnect attempts reached. Switching to Mock Mode.');
            this.enableMockMode();
            store.dispatch('WS_STATUS_CHANGE', { systemStatus: 'failed' });
        }
    }

    handleConnectionFailure(err) {
        store.dispatch('WS_STATUS_CHANGE', { systemStatus: 'failed' });
        this.enableMockMode();
    }

    /**
     * Disconnect
     */
    disconnect() {
        this.isExplicitlyDisconnected = true;
        if (this.client) {
            this.client.end();
            this.client = null;
        }

        this.disableMockMode();

        store.dispatch('WS_DISCONNECTED', {
            connected: false,
            systemStatus: 'disconnected'
        });
    }

    /**
     * Send command to ESP32
     */
    send(message) {
        if (this.client && this.client.connected) {
            const payload = JSON.stringify(message);

            // Route to correct topic
            let topic = this.topicCommand;
            if (message.type === 'chat') {
                topic = this.topicChat;
            }

            this.client.publish(topic, payload);

            if (window.ESPECTRUM_DEBUG) {
                console.log('[MQTT] TX:', topic, message);
            }
        } else {
            console.warn('[MQTT] Cannot send, not connected');
            // If in mock mode, simulate logic could go here if needed
        }
    }

    /**
     * Enable mock mode (simulated data)
     */
    enableMockMode() {
        if (this.mockMode) return;

        console.log('[MockMode] Enabled - Generating simulated sensor data');
        this.mockMode = true;

        store.dispatch('MOCK_MODE_ENABLED', {
            mockMode: true,
            connected: false,
            systemStatus: 'mock'
        });

        // Generate mock data every 500ms
        this.mockInterval = setInterval(() => {
            const mockData = this.generateMockData();
            // Simulate receiving it as if from MQTT
            this.handleDataMessage(mockData);
        }, 500);
    }

    disableMockMode() {
        if (this.mockInterval) {
            clearInterval(this.mockInterval);
            this.mockInterval = null;
        }
        this.mockMode = false;
    }

    startWatchdog() {
        if (this.watchdogInterval) clearInterval(this.watchdogInterval);

        this.watchdogInterval = setInterval(() => {
            const state = store.getState();
            if (state.mockMode) return;

            const now = Date.now();
            const timeSinceLastSeen = now - state.lastHeartbeat;

            // If No message for 5 seconds, mark hardware as offline
            if (state.hardwareConnected && timeSinceLastSeen > 5000) {
                console.warn('[Watchdog] ESP32 Heartbeat lost.');
                store.dispatch('HARDWARE_OFFLINE', { hardwareConnected: false });
            }
        }, 1000);
    }

    generateMockData() {
        const touch = Array(10).fill(0).map(() => Math.random() > 0.85 ? Math.floor(Math.random() * 1000) : 0);
        const hall = Math.floor(Math.sin(Date.now() / 5000) * 50 + Math.random() * 10);
        const temp = 38 + Math.sin(Date.now() / 10000) * 5 + Math.random() * 2;
        const uptime = Math.floor(performance.now() / 1000);

        return {
            type: 'sensor_data',
            timestamp: Math.floor(Date.now() / 1000),
            data: { touch, hall, temp: parseFloat(temp.toFixed(2)), uptime }
        };
    }

    showWakeupNotification(data) {
        // Reuse existing notification logic
        const notification = document.createElement('div');
        notification.className = 'wakeup-notification scale-in';
        notification.innerHTML = `
      <div class="glass-card" style="position: fixed; top: 100px; right: 20px; z-index: 1000; padding: 1.5rem; min-width: 300px; background: var(--glass-bg-hover);">
        <div class="flex-between mb-sm">
          <h4 style="margin: 0;"><i class="ph ph-check-circle" style="color: var(--color-secondary);"></i> System Woke Up!</h4>
          <button class="btn-icon" onclick="this.parentElement.parentElement.remove()"><i class="ph ph-x"></i></button>
        </div>
        <p style="margin: 0; color: var(--text-secondary);">Sleep Duration: <strong>${data.sleep_duration}s</strong><br>Reason: <strong>${data.wakeup_reason}</strong></p>
      </div>`;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 5000);
    }
}

// Create singleton instance
const mqttService = new MQTTService();
window.wsService = mqttService; // Keep global name compatible
export default mqttService;
