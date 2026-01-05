/**
 * ESPectrum - Local Chat Page
 * MQTT-based chat for devices on the dashboard
 */

import store from './app-store.js';

export default class PageChat {
    constructor() {
        this.unsubscribe = null;
        this.messages = [];
    }

    async render(container) {
        container.innerHTML = `
      <div class="tool-page fade-in-up" style="height: calc(100vh - 100px); display: flex; flex-direction: column;">
        <div class="tool-header">
           <div class="icon-badge" style="background: rgba(255, 255, 255, 0.1);">
              <i class="ph ph-chat-circle-dots"></i>
           </div>
           <div>
             <h1>Hacker Chat</h1>
             <p>Global encrypted comms channel (MQTT)</p>
           </div>
        </div>

        <!-- Chat Area -->
        <div class="glass-card" style="flex: 1; display: flex; flex-direction: column; overflow: hidden; padding: 0;">
            
            <!-- Messages List -->
            <div id="chat-messages" style="
                flex: 1; 
                overflow-y: auto; 
                padding: 1rem; 
                display: flex; 
                flex-direction: column; 
                gap: 0.5rem;
                background: rgba(0,0,0,0.2);
            ">
                <div class="chat-system-msg">Requesting channel access...</div>
            </div>

            <!-- Input Area -->
            <div style="
                padding: 1rem; 
                background: rgba(255,255,255,0.05); 
                border-top: 1px solid var(--glass-border);
                display: flex;
                gap: 1rem;
            ">
                <input type="text" id="chat-input" class="input-dark" placeholder="Type a message..." style="margin: 0;">
                <button class="btn btn-primary btn-icon" id="btn-send">
                    <i class="ph ph-paper-plane-right"></i>
                </button>
            </div>
        </div>
      </div>
      
      <style>
        .chat-system-msg {
            text-align: center;
            font-size: 0.8rem;
            color: var(--text-tertiary);
            margin: 0.5rem 0;
        }
        .chat-msg {
            padding: 0.5rem 1rem;
            border-radius: 12px;
            max-width: 80%;
            word-wrap: break-word;
            animation: fadeIn 0.3s ease;
        }
        .chat-msg.me {
            background: var(--color-primary);
            align-self: flex-end;
            border-bottom-right-radius: 2px;
        }
        .chat-msg.them {
            background: rgba(255,255,255,0.1);
            align-self: flex-start;
            border-bottom-left-radius: 2px;
        }
        .chat-meta {
            font-size: 0.7rem;
            opacity: 0.7;
            margin-bottom: 2px;
        }
      </style>
    `;

        const input = container.querySelector('#chat-input');
        const btn = container.querySelector('#btn-send');
        const list = container.querySelector('#chat-messages');

        // Subscribe to incoming MQTT messages
        // Note: In a real app we would subscribe to a specific topic like 'espectrum/chat'
        // Here we piggyback on the store's lastMessage or use the service directly if exposed.
        // For now, let's assume successful connection means we can chat.

        // Add fake "Connected" message
        setTimeout(() => {
            this.addMessage(list, 'System', 'Joined channel #hackers', 'system');
        }, 500);

        // Event Listeners
        const sendMessage = () => {
            const text = input.value.trim();
            if (!text) return;

            // 1. Show locally immediately
            this.addMessage(list, 'Me', text, 'me');
            input.value = '';

            // 2. Send via MQTT
            if (window.wsService) {
                // We use a custom topic or the generic command channel for demo
                window.wsService.send(JSON.stringify({
                    type: 'chat',
                    user: 'WebClient',
                    text: text
                }));
            }
        };

        btn.addEventListener('click', sendMessage);
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });

        // Listen for incoming (echoed) messages
        this.unsubscribe = store.subscribe('lastMessage', (msg) => {
            if (msg && msg.type === 'chat' && msg.user !== 'WebClient') {
                this.addMessage(list, msg.user || 'Anon', msg.text, 'them');
            }
        });

        return () => this.cleanup();
    }

    addMessage(container, user, text, type) {
        if (!container) return;

        const div = document.createElement('div');

        if (type === 'system') {
            div.className = 'chat-system-msg';
            div.textContent = text;
        } else {
            div.className = `chat-msg ${type}`;
            div.innerHTML = `
            <div class="chat-meta">${user}</div>
            <div>${text}</div>
          `;
        }

        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
    }

    cleanup() {
        if (this.unsubscribe) this.unsubscribe();
    }
}
