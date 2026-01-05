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
        this.topicTelemetry = 'espectrum/telemetry';
        this.topicChat = 'espectrum/chat';
        this.topicCommand = 'espectrum/command';

        // Mock mode for fallback
        this.mockMode = false;
        this.mockInterval = null;
    }

    /**
     * Initialize connection
     */
    async connect() {
        store.dispatch('WS_CONNECTING', { systemStatus: 'connecting' });
        console.log('[MQTT] Connecting to Flespi...');

        try {
            // Connect to Flespi Broker over WSS
            this.client = mqtt.connect('wss://mqtt.flespi.io:443', {
                username: this.token,
                clientId: this.clientId,
                clean: true,
                keepalive: 60
            });

            this.client.on('connect', () => this.onConnect());
            this.client.on('message', (topic, message) => this.onMessage(topic, message));
            this.client.on('error', (err) => this.onError(err));
            this.client.on('offline', () => this.onOffline());
            this.client.on('close', () => this.onClose());

        } catch (err) {
            console.error('[MQTT] Init failed:', err);
            this.enableMockMode();
        }
    }

    /**
     * Connected to broker
     */
    onConnect() {
        console.log('[MQTT] Connected!');
        this.mockMode = false;

        // Subscribe to data topic
        this.client.subscribe(this.topicData, (err) => {
            if (!err) console.log(`[MQTT] Subscribed to ${this.topicData}`);
        });

        // Subscribe to telemetry topic
        this.client.subscribe(this.topicTelemetry, (err) => {
            if (!err) console.log(`[MQTT] Subscribed to ${this.topicTelemetry}`);
        });

        // Subscribe to chat topic
        this.client.subscribe(this.topicChat, (err) => {
            if (!err) console.log(`[MQTT] Subscribed to ${this.topicChat}`);
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
        // Sensor Data
        if (message.type === 'sensor_data') {
            // ESP32 sends flat JSON: { type: "sensor_data", temp: 25, touch: 0 ... }
            // Store expects an object with these keys.
            store.dispatch('SENSOR_DATA_UPDATE', {
                sensorData: message // Pass the whole message as the data object
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
        store.dispatch('WS_ERROR', { systemStatus: 'error' });
    }

    /**
     * Connection Lost
     */
    onOffline() {
        console.warn('[MQTT] Offline');
        store.dispatch('WS_DISCONNECTED', {
            connected: false,
            systemStatus: 'disconnected'
        });
    }

    /**
     * Disconnect
     */
    disconnect() {
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
     * Connection Closed
     */
    onClose() {
        console.log('[MQTT] Closed');
        // Auto-reconnect is handled by mqtt.js, but we update UI
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
