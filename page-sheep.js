/**
 * ESPectrum - Wall of Sheep Page
 * Displays captured credentials and unencrypted traffic
 */

import store from './app-store.js';
import cloud from './service-cloud.js';

export default class PageSheep {
    constructor() {
        this.unsubscribe = null;
    }

    async render(container) {
        container.innerHTML = `
      <div class="tool-page fade-in-up">
        <div class="tool-header">
           <div class="icon-badge" style="background: rgba(239, 68, 68, 0.2); color: #ef4444;">
              <i class="ph ph-sheep"></i>
           </div>
           <div>
             <h1>Wall of Sheep</h1>
             <p>Captured Credentials & Sensitive Data (HTTP/Basic Auth)</p>
           </div>
           <div class="badge status-warning pulse">LIVE FEED</div>
        </div>

        <div class="glass-card full-width" style="margin-top: var(--spacing-lg); height: 70vh; overflow: hidden; display: flex; flex-direction: column;">
            <div style="padding: 1rem; border-bottom: 1px solid rgba(255,255,255,0.05); background: rgba(0,0,0,0.3); display: flex; justify-content: space-between;">
               <span class="text-tertiary mono">SOURCE: Sniffer & Evil Twin</span>
               <button class="btn btn-sm btn-secondary" id="btn-refresh-sheep"><i class="ph ph-arrows-clockwise"></i> Load History</button>
            </div>
            
            <div id="sheep-feed" style="flex:1; overflow-y: auto; padding: 1rem;">
               <div class="text-center text-tertiary mt-lg">Listening for unencrypted traffic...</div>
            </div>
        </div>
      </div>
    `;

        this.attachListeners();
        this.loadCloudHistory(); // Initial load
    }

    async loadCloudHistory() {
        // Fetch recent "Security" logs from cloud to populate history
        const logs = await cloud.getLogs();
        if (!logs) return;

        const sheepLogs = logs.filter(l => l.category === 'Security' && (l.event.includes('Credential') || l.details.includes('User:')));
        this.renderItems(sheepLogs);
    }

    renderItems(logs) {
        const feed = document.getElementById('sheep-feed');
        if (!feed) return;

        if (logs.length === 0) {
            feed.innerHTML = '<div class="text-center text-tertiary mt-lg">No credentials captured yet.</div>';
            return;
        }

        feed.innerHTML = logs.reverse().map(item => `
            <div class="glass-card p-md mb-sm fade-in-left" style="border-left: 4px solid #ef4444;">
                <div class="flex-between mb-xs">
                    <span class="text-danger font-bold"><i class="ph ph-skull"></i> COMPROMISED</span>
                    <span class="text-tertiary text-sm">${new Date(item.timestamp).toLocaleString()}</span>
                </div>
                <div class="mono text-white" style="word-break: break-all;">
                    ${item.details}
                </div>
            </div>
        `).join('');
    }

    attachListeners() {
        document.getElementById('btn-refresh-sheep')?.addEventListener('click', () => this.loadCloudHistory());
    }

    cleanup() {
        // Real-time updates could be added via store subscription if we added sheep data to store
    }
}
