/**
 * ESPectrum - File System Page
 * Handles LittleFS File Explorer and Code Editor
 */

export default class PageFiles {
    constructor() {
        this.editorValue = '';
    }

    async render(container) {
        const route = window.location.hash.slice(1).split('?')[0];

        // Determine View
        if (route === '/files') {
            this.renderExplorer(container);
        } else if (route === '/editor') {
            this.renderEditor(container);
        } else {
            container.innerHTML = '<h2>Tool not found</h2>';
        }

        return () => this.cleanup();
    }

    // ==================== 1. FILE EXPLORER ====================
    renderExplorer(container) {
        container.innerHTML = `
      <div class="tool-page fade-in-up">
        <div class="tool-header">
           <div class="icon-badge" style="background: rgba(var(--color-primary-rgb), 0.2); color: var(--color-primary);">
              <i class="ph ph-folder-open"></i>
           </div>
           <div>
             <h1>File Explorer</h1>
             <p>Manage ESP32 LittleFS Storage (Mini-Cloud)</p>
           </div>
           <div style="flex:1;"></div>
           <div class="file-actions">
               <input type="file" id="file-upload-input" style="display: none;">
               <button class="btn btn-primary" id="btn-upload">
                 <i class="ph ph-upload-simple"></i> Upload File
               </button>
               <button class="btn" id="btn-refresh">
                 <i class="ph ph-arrows-clockwise"></i> Refresh
               </button>
           </div>
        </div>

        <div class="glass-card">
          <table class="data-table" id="file-list">
             <thead>
                <tr>
                   <th>Name</th>
                   <th>Size</th>
                   <th>Action</th>
                </tr>
             </thead>
             <tbody id="file-list-body">
                <tr><td colspan="3" class="text-center">Loading files...</td></tr>
             </tbody>
          </table>
        </div>
        
        <div class="alert alert-info mt-md" style="font-size: 0.9rem;">
           <i class="ph ph-info"></i> 
           Note: Large files (>10KB) upload via HTTP POST to the ESP32 IP, not MQTT.
           Ensure you are on the same local network.
        </div>
      </div>
    `;

        // Event Listeners
        container.querySelector('#btn-refresh').addEventListener('click', () => this.fetchFiles());

        // Upload Flow
        const fileInput = container.querySelector('#file-upload-input');
        const uploadBtn = container.querySelector('#btn-upload');

        uploadBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => this.handleUpload(e.target.files[0]));

        // Initial Load
        this.fetchFiles();
    }

    async fetchFiles() {
        // In a real scenario, this would fetch from http://esp32-ip/list
        // Beacuse of cross-origin/mixed-content issues in development, we mock it 
        // OR proxy it via MQTT if small enough.

        const tbody = document.getElementById('file-list-body');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="3" class="text-center"><i class="ph ph-spinner ph-spin"></i> Fetching...</td></tr>';

        // Simulate a fetch
        setTimeout(() => {
            const mockFiles = [
                { name: '/config.json', size: 245 },
                { name: '/index.html', size: 4500 },
                { name: '/phished_creds.txt', size: 120 },
                { name: '/script.js', size: 1200 }
            ];

            tbody.innerHTML = mockFiles.map(f => `
            <tr>
              <td>
                  <i class="ph ${this.getFileIcon(f.name)}" style="margin-right:8px;"></i>
                  ${f.name}
              </td>
              <td class="mono">${f.size} B</td>
              <td>
                  <button class="btn-icon text-accent btn-delete" data-file="${f.name}"><i class="ph ph-trash"></i></button>
                  <button class="btn-icon text-primary btn-download" data-file="${f.name}"><i class="ph ph-download-simple"></i></button>
              </td>
            </tr>
          `).join('');

            // Re-attach listeners for dynamic buttons if needed
        }, 800);
    }

    getFileIcon(name) {
        if (name.endsWith('.json')) return 'ph-file-code';
        if (name.endsWith('.html')) return 'ph-file-html';
        if (name.endsWith('.js')) return 'ph-file-js';
        return 'ph-file-text';
    }

    handleUpload(file) {
        if (!file) return;
        alert(`Simulating upload of ${file.name} (${file.size} bytes). \nUse actual ESP32 WebServer endpoint /upload in production.`);
    }


    // ==================== 2. CODE EDITOR ====================
    renderEditor(container) {
        container.innerHTML = `
      <div class="tool-page fade-in-up">
         <div class="tool-header">
           <div class="icon-badge" style="background: rgba(var(--color-primary-rgb), 0.2); color: var(--color-primary);">
              <i class="ph ph-code"></i>
           </div>
           <div>
             <h1>Config Editor</h1>
             <p>Edit /config.json directly on the ESP32</p>
           </div>
           <button class="btn btn-primary" id="btn-save">
             <i class="ph ph-floppy-disk"></i> Save & Reboot
           </button>
        </div>

        <div class="glass-card" style="padding: 0; overflow: hidden; height: 60vh; background: #1e1e1e;">
            <textarea id="code-area" style="width: 100%; height: 100%; background: transparent; color: #d4d4d4; font-family: monospace; border: none; padding: 1rem; resize: none; outline: none;">
{
  "device_name": "ESPectrum-Hacker",
  "led_brightness": 128,
  "wifi_ssid": "NourKH",
  "attack_timeout": 60
}
            </textarea>
        </div>
      </div>
    `;

        container.querySelector('#btn-save').addEventListener('click', () => {
            const content = document.getElementById('code-area').value;
            // In real app: POST content to /upload as config.json
            alert("Saved config.json! ESP32 would reboot now.");
        });
    }

    cleanup() {
        // cleanup
    }
}
