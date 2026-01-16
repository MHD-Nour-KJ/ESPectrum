/**
 * ESPectrum - File System Page
 * Handles LittleFS File Explorer and Code Editor
 */

import store from './app-store.js';
import mqtt from './service-socket.js';
import { wrapCommand } from './utils-feedback.js';
import { showToast, formatBytes } from './utils-helpers.js';

export default class PageFiles {
  constructor() {
    this.unsubscribe = null;
  }

  async render(container) {
    this.container = container;
    const route = window.location.hash.slice(1).split('?')[0];

    if (route === '/files') {
      this.renderExplorer(container);
    } else if (route === '/editor') {
      this.renderEditor(container);
    }

    // Subscribe to store updates
    this.unsubscribe = store.subscribe('*', () => this.updateView());

    // Refresh file list on load
    if (route === '/files') this.fetchFiles();

    return () => this.cleanup();
  }

  updateView() {
    const route = window.location.hash.slice(1).split('?')[0];
    if (route === '/files') {
      this.renderFileList();
    } else if (route === '/editor') {
      this.updateEditorContent();
    }
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
             <p>Manage ESP32 LittleFS Storage</p>
           </div>
           <div style="flex:1;"></div>
           <div class="file-actions">
               <input type="file" id="file-upload-input" style="display: none;">
               <button class="btn btn-primary" id="btn-upload">
                 <i class="ph ph-upload-simple"></i> Upload
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
                   <th style="text-align: right;">Action</th>
                </tr>
             </thead>
             <tbody id="file-list-body">
                <tr><td colspan="3" class="text-center">Initializing...</td></tr>
             </tbody>
          </table>
        </div>
        
        <div class="alert glass-card mt-md" style="font-size: 0.85rem; padding: 1rem; border-color: rgba(59, 130, 246, 0.3);">
           <i class="ph ph-info" style="color: #3b82f6;"></i> 
           Files are synced via MQTT. For binary uploads or files > 10KB, use the ESP32 Local Web Interface.
        </div>
      </div>
    `;

    this.attachExplorerListeners();
    this.renderFileList();
  }

  attachExplorerListeners() {
    const refreshBtn = this.container.querySelector('#btn-refresh');
    refreshBtn?.addEventListener('click', () => {
      wrapCommand(refreshBtn, async () => {
        await this.fetchFiles();
        // Wait a bit for MQTT response
        await new Promise(r => setTimeout(r, 1000));
      }, { loadingText: 'Syncing...', successText: 'Updated' });
    });

    const fileInput = this.container.querySelector('#file-upload-input');
    const uploadBtn = this.container.querySelector('#btn-upload');

    uploadBtn?.addEventListener('click', () => fileInput.click());
    fileInput?.addEventListener('change', (e) => this.handleUpload(e.target.files[0]));
  }

  async fetchFiles() {
    mqtt.send({ type: 'file_cmd', action: 'list' });
  }

  renderFileList() {
    const tbody = document.getElementById('file-list-body');
    if (!tbody) return;

    const files = store.getState().fileList;

    if (!Array.isArray(files) || files.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" class="text-center">No files found.</td></tr>';
      return;
    }

    tbody.innerHTML = files.map(f => `
            <tr>
              <td>
                  <i class="ph ${this.getFileIcon(f.name)}" style="margin-right:8px; opacity: 0.7;"></i>
                  ${f.name}
              </td>
              <td class="mono" style="font-size: 0.8rem; opacity: 0.6;">${formatBytes(f.size)}</td>
              <td style="text-align: right;">
                  <button class="btn-icon btn-edit-file" data-file="${f.name}" title="Edit File"><i class="ph ph-note-pencil"></i></button>
                  <button class="btn-icon text-accent btn-delete-file" data-file="${f.name}" title="Delete"><i class="ph ph-trash"></i></button>
                  <button class="btn-icon text-primary btn-download-file" data-file="${f.name}" title="Download"><i class="ph ph-download-simple"></i></button>
              </td>
            </tr>
        `).join('');

    this.attachFileRowListeners();
  }

  attachFileRowListeners() {
    this.container.querySelectorAll('.btn-edit-file').forEach(btn => {
      btn.addEventListener('click', () => {
        const path = btn.dataset.file;
        window.location.hash = `#/editor?path=${encodeURIComponent(path)}`;
      });
    });

    this.container.querySelectorAll('.btn-delete-file').forEach(btn => {
      btn.addEventListener('click', () => {
        const path = btn.dataset.file;
        if (confirm(`Are you sure you want to delete ${path}?`)) {
          wrapCommand(btn, async () => {
            mqtt.send({ type: 'file_cmd', action: 'delete', path });
            showToast(`Requested deletion of ${path}`, 'info');
          });
        }
      });
    });

    this.container.querySelectorAll('.btn-download-file').forEach(btn => {
      btn.addEventListener('click', () => {
        const path = btn.dataset.file;
        mqtt.send({ type: 'file_cmd', action: 'read', path });
        showToast(`Requesting ${path}...`, 'info');
      });
    });
  }

  getFileIcon(name) {
    if (name.endsWith('.json')) return 'ph-file-code';
    if (name.endsWith('.html')) return 'ph-file-html';
    if (name.endsWith('.js')) return 'ph-file-js';
    if (name.endsWith('.py')) return 'ph-file-code';
    if (name.endsWith('.txt')) return 'ph-file-text';
    return 'ph-file';
  }

  handleUpload(file) {
    if (!file) return;
    if (file.size > 10240) {
      showToast('File too large for MQTT sync (>10KB)', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      mqtt.send({
        type: 'file_cmd',
        action: 'write',
        path: '/' + file.name,
        content
      });
      showToast(`Uploading ${file.name}...`, 'info');
    };
    reader.readAsText(file);
  }


  // ==================== 2. CODE EDITOR ====================
  renderEditor(container) {
    const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
    const path = urlParams.get('path') || '/config.json';

    container.innerHTML = `
      <div class="tool-page fade-in-up">
         <div class="tool-header">
           <div class="icon-badge" style="background: rgba(var(--color-primary-rgb), 0.2); color: var(--color-primary);">
              <i class="ph ph-code"></i>
           </div>
           <div>
             <h1 id="editor-title">Editor: ${path}</h1>
             <p>Edit ESP32 system files directly</p>
           </div>
           <div style="flex:1;"></div>
           <button class="btn btn-primary" id="btn-save-editor">
             <i class="ph ph-floppy-disk"></i> Save Changes
           </button>
        </div>

        <div class="glass-card editor-wrapper" style="padding: 0; overflow: hidden; height: 65vh; position: relative;">
            <div id="editor-highlight" class="editor-display"></div>
            <textarea id="code-area" spellcheck="false" placeholder="Loading file content..."></textarea>
            <div id="editor-loading" class="editor-overlay hidden">
                <i class="ph ph-spinner ph-spin"></i>
            </div>
        </div>
        
        <div class="flex-between mt-md">
            <span class="mono text-tertiary" style="font-size: 0.8rem;" id="path-display">${path}</span>
            <span class="badge" id="save-status" style="display:none;">Saved!</span>
        </div>
      </div>
    `;

    this.addEditorStyles();
    this.injectPrism();
    this.attachEditorListeners(path);

    // Load initial content
    mqtt.send({ type: 'file_cmd', action: 'read', path });
    this.showEditorLoading(true);
  }

  injectPrism() {
    if (document.getElementById('prism-styles')) return;

    const link = document.createElement('link');
    link.id = 'prism-styles';
    link.rel = 'stylesheet';
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js';
    script.onload = () => {
      // Load components
      const components = ['json', 'javascript', 'bash', 'c', 'cpp', 'python'];
      components.forEach(lang => {
        const s = document.createElement('script');
        s.src = `https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-${lang}.min.js`;
        document.head.appendChild(s);
      });
    };
    document.head.appendChild(script);
  }

  attachEditorListeners(path) {
    const textArea = this.container.querySelector('#code-area');
    const display = this.container.querySelector('#editor-highlight');
    const saveBtn = this.container.querySelector('#btn-save-editor');

    textArea?.addEventListener('input', () => this.syncHighlight());
    textArea?.addEventListener('scroll', () => {
      if (display) {
        display.scrollTop = textArea.scrollTop;
        display.scrollLeft = textArea.scrollLeft;
      }
    });

    saveBtn?.addEventListener('click', () => {
      const content = textArea.value;
      wrapCommand(saveBtn, async () => {
        mqtt.send({ type: 'file_cmd', action: 'write', path, content });
        showToast(`Saving ${path}...`, 'info');
        await new Promise(r => setTimeout(r, 1000));
      }, { successText: 'Saved' });
    });
  }

  syncHighlight() {
    const textArea = document.getElementById('code-area');
    const display = document.getElementById('editor-highlight');
    if (!textArea || !display || !window.Prism) return;

    const path = new URLSearchParams(window.location.hash.split('?')[1]).get('path') || '';
    let lang = 'javascript';
    if (path.endsWith('.json')) lang = 'json';
    if (path.endsWith('.py')) lang = 'python';
    if (path.endsWith('.c') || path.endsWith('.cpp')) lang = 'cpp';

    const code = textArea.value + '\n'; // Add newline to ensure last line is visible
    display.innerHTML = window.Prism.highlight(code, window.Prism.languages[lang] || window.Prism.languages.javascript, lang);
  }

  updateEditorContent() {
    const textArea = document.getElementById('code-area');
    if (!textArea) return;

    const currentFile = store.getState().currentFile;
    if (currentFile.path) {
      textArea.value = currentFile.content;
      this.syncHighlight();
      this.showEditorLoading(false);
    }
  }

  showEditorLoading(show) {
    const loading = document.getElementById('editor-loading');
    if (loading) {
      loading.classList.toggle('hidden', !show);
    }
  }

  addEditorStyles() {
    if (document.getElementById('editor-styles')) return;
    const style = document.createElement('style');
    style.id = 'editor-styles';
    style.textContent = `
            .editor-wrapper {
                background: #020617;
                border: 1px solid var(--glass-border);
                position: relative;
            }
            .editor-display, #code-area {
                position: absolute;
                top: 0; left: 0;
                width: 100%; height: 100%;
                padding: 1.5rem;
                margin: 0;
                font-family: 'JetBrains Mono', 'Fira Code', monospace;
                font-size: 14px;
                line-height: 1.6;
                white-space: pre;
                overflow: auto;
                border: none;
                outline: none;
                box-sizing: border-box;
            }
            .editor-display {
                color: #e2e8f0;
                z-index: 1;
                pointer-events: none; /* Let clicks pass to textarea */
                background: transparent;
            }
            #code-area {
                z-index: 2;
                color: transparent; /* Hide text, show only caret */
                caret-color: var(--color-primary);
                background: transparent;
                -webkit-text-fill-color: transparent;
                resize: none;
            }
            .editor-overlay {
                position: absolute;
                top:0; left:0; right:0; bottom:0;
                background: rgba(0,0,0,0.7);
                backdrop-filter: blur(4px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 20;
                font-size: 2rem;
                color: var(--color-primary);
            }
            .editor-overlay.hidden { display: none; }
        `;
    document.head.appendChild(style);
  }

  cleanup() {
    if (this.unsubscribe) this.unsubscribe();
  }
}
