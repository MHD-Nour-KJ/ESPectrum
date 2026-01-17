/**
 * ESPectrum - Local Chat Page
 * MQTT-based chat for devices on the dashboard
 */

import store from './app-store.js';
import mqtt from './service-socket.js';
import cloud from './service-cloud.js';

export default class PageChat {
    constructor() {
        this.unsubscribe = null;
        this.userId = 'WebClient-' + Math.floor(Math.random() * 1000);
    }

    async render(container) {
        this.container = container;
        container.innerHTML = `
      <div class="tool-page fade-in-up" style="height: calc(100vh - 120px); display: flex; flex-direction: column;">
        <div class="tool-header">
           <div class="icon-badge" style="background: rgba(var(--color-primary-rgb), 0.2); color: var(--color-primary);">
              <i class="ph ph-chat-circle-dots"></i>
           </div>
           <div>
             <h1>Hacker Chat</h1>
             <p>Anonymous communication channel via MQTT</p>
           </div>
           <div style="flex:1;"></div>
           <button class="btn btn-icon text-accent" id="btn-clear-chat" title="Delete All History" style="margin-right: 1rem;">
              <i class="ph ph-trash"></i>
           </button>
           <div class="badge status-connected">ID: ${this.userId}</div>
        </div>

        <div class="glass-card" style="flex: 1; display: flex; flex-direction: column; overflow: hidden; padding: 0; margin-top: 1rem; border-color: rgba(var(--color-primary-rgb), 0.3);">
            <div id="chat-messages" style="flex: 1; overflow-y: auto; padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; background: rgba(0,0,0,0.3);">
                <div class="chat-system-msg">Connecting to secure segment...</div>
            </div>

            <div style="padding: 1rem; background: rgba(0,0,0,0.4); border-top: 1px solid var(--glass-border); display: flex; gap: 1rem; align-items: center;">
                <input type="text" id="chat-input" class="input-dark" placeholder="Enter message..." style="margin: 0; flex: 1; border-radius: 99px; padding: 0.75rem 1.5rem;">
                <button class="btn btn-primary btn-icon" id="btn-send" style="width: 50px; height: 50px; border-radius: 50%;">
                    <i class="ph ph-paper-plane-right"></i>
                </button>
            </div>
        </div>
      </div>
      
      <style>
        .chat-system-msg { text-align: center; font-size: 0.75rem; color: var(--text-tertiary); margin: 0.5rem 0; font-family: monospace; }
        .chat-msg { padding: 0.75rem 1.25rem; border-radius: 20px; max-width: 75%; word-wrap: break-word; position: relative; animation: slideIn 0.2s ease-out; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
        .chat-msg.me { background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%); align-self: flex-end; border-bottom-right-radius: 4px; color: white; }
        .chat-msg.them { background: rgba(255,255,255,0.08); backdrop-filter: blur(5px); border: 1px solid rgba(255,255,255,0.1); align-self: flex-start; border-bottom-left-radius: 4px; color: #e2e8f0; }
        .chat-meta { font-size: 0.7rem; font-weight: 700; margin-bottom: 4px; opacity: 0.8; font-family: monospace; }
        @keyframes slideIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      </style>
    `;

        const input = container.querySelector('#chat-input');
        const btn = container.querySelector('#btn-send');

        const sendMessage = () => {
            const text = input.value.trim();
            if (!text) return;

            // Send via MQTT - it will be echoed back to us or updated via store
            mqtt.send({
                type: 'chat',
                user: this.userId,
                text: text,
                time: new Date().toLocaleTimeString()
            });

            // Optimistic update
            store.dispatch('CHAT_MESSAGE_RECEIVED', {
                chatMessages: [...store.getState().chatMessages, { user: this.userId, text, me: true }].slice(-50)
            });

            // Cloud Save
            cloud.addChat(this.userId, text);

            input.value = '';
        };

        btn.addEventListener('click', sendMessage);
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });

        // Clear Chat Listener
        const clearBtn = container.querySelector('#btn-clear-chat');
        clearBtn?.addEventListener('click', () => {
            if (confirm('Permanently delete all secure chat history?')) {
                cloud.deleteChat();
                store.dispatch('CHAT_MESSAGE_RECEIVED', { chatMessages: [] });
            }
        });

        this.unsubscribe = store.subscribe('chatMessages', () => this.renderMessages());

        // Initial load from cloud
        this.loadCloudHistory();
        this.renderMessages();

        return () => this.cleanup();
    }

    async loadCloudHistory() {
        const history = await cloud.getChat();
        if (history && history.length > 0) {
            // Map GAS format to local chat format
            const formatted = history.map(h => ({
                user: h.user,
                text: h.message,
                me: h.user === this.userId
            }));
            store.dispatch('CHAT_MESSAGE_RECEIVED', { chatMessages: formatted });
        }
    }

    renderMessages() {
        const list = document.getElementById('chat-messages');
        if (!list) return;

        const messages = store.getState().chatMessages;
        list.innerHTML = messages.map(msg => {
            const isMe = msg.user === this.userId || msg.me;
            return `
                <div class="chat-msg ${isMe ? 'me' : 'them'}">
                    <div class="chat-meta">${isMe ? 'YOU' : msg.user}</div>
                    <div style="line-height: 1.4;">${msg.text}</div>
                </div>
            `;
        }).join('');

        list.scrollTop = list.scrollHeight;
    }

    cleanup() {
        if (this.unsubscribe) this.unsubscribe();
    }
}
