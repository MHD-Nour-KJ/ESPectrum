/**
 * ESPectrum - Cloud Reports Page
 * Generates PDF and Excel reports from Google Sheets data
 */

import cloud from './service-cloud.js';
import { showToast, formatBytes } from './utils-helpers.js';
import { wrapCommand } from './utils-feedback.js';

export default class PageReports {
    constructor() {
        this.isLoading = false;
    }

    async render(container) {
        this.container = container;
        container.innerHTML = `
      <div class="tool-page fade-in-up">
        <div class="tool-header">
           <div class="icon-badge" style="background: rgba(var(--color-primary-rgb), 0.2); color: var(--color-primary);">
              <i class="ph ph-file-pdf"></i>
           </div>
           <div>
             <h1>Cloud Reports</h1>
             <p>Generate security audits and export logs</p>
           </div>
        </div>

        <div class="grid grid-2 gap-lg mt-lg">
            <!-- PDF Report Card -->
            <div class="glass-card p-lg text-center">
                <i class="ph ph-file-pdf" style="font-size: 4rem; color: #EF4444; margin-bottom: 1rem;"></i>
                <h3>Security PDF Report</h3>
                <p class="text-secondary" style="margin-bottom: 1.5rem;">
                    A formatted penetration test summary including attack logs, security alerts, and chat history.
                </p>
                <button class="btn btn-primary" id="btn-pdf-report" style="width: 100%;">
                    <i class="ph ph-download-simple"></i> Download PDF
                </button>
            </div>

            <!-- Excel Report Card -->
            <div class="glass-card p-lg text-center">
                <i class="ph ph-file-xls" style="font-size: 4rem; color: #10B981; margin-bottom: 1rem;"></i>
                <h3>Full Audit Logs (CSV)</h3>
                <p class="text-secondary" style="margin-bottom: 1.5rem;">
                    Export all raw timestamped data from the cloud database for external analysis.
                </p>
                <button class="btn btn-secondary" id="btn-csv-report" style="width: 100%;">
                    <i class="ph ph-file-csv"></i> Export CSV
                </button>
            </div>
        </div>

        <div class="glass-card mt-lg" style="border-color: rgba(var(--color-primary-rgb), 0.3);">
            <div class="p-md border-bottom flex-between">
                <h4 style="margin:0;"><i class="ph ph-clock-counter-clockwise"></i> Recent Activity Snapshot</h4>
                <button class="btn btn-icon" id="btn-refresh-logs"><i class="ph ph-arrows-clockwise"></i></button>
            </div>
            <div id="logs-snapshot" style="max-height: 300px; overflow-y: auto; padding: 1rem;" class="mono">
                <div class="text-center text-tertiary">Awaiting data...</div>
            </div>
        </div>
      </div>
    `;

        this.injectLibraries();
        this.attachEventListeners();
        this.refreshSnapshot();
    }

    async injectLibraries() {
        if (!window.jspdf) {
            const script = document.createElement('script');
            script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
            document.head.appendChild(script);
        }
        if (!window.jspdf_autotable) {
            const script = document.createElement('script');
            script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.25/jspdf.plugin.autotable.min.js";
            document.head.appendChild(script);
        }
    }

    attachEventListeners() {
        const pdfBtn = this.container.querySelector('#btn-pdf-report');
        const csvBtn = this.container.querySelector('#btn-csv-report');
        const refreshBtn = this.container.querySelector('#btn-refresh-logs');

        pdfBtn?.addEventListener('click', () => {
            wrapCommand(pdfBtn, () => this.generatePDF(), { loadingText: 'Generating PDF...', successText: 'Report Ready' });
        });

        csvBtn?.addEventListener('click', () => {
            wrapCommand(csvBtn, () => this.generateCSV(), { loadingText: 'Exporting...', successText: 'Exported' });
        });

        refreshBtn?.addEventListener('click', () => this.refreshSnapshot());
    }

    async refreshSnapshot() {
        const box = document.getElementById('logs-snapshot');
        if (!box) return;

        const logs = await cloud.getLogs();
        if (!logs || logs.length === 0) {
            box.innerHTML = '<div class="text-center text-tertiary">No logs found in cloud.</div>';
            return;
        }

        const recent = logs.reverse().slice(0, 10);
        box.innerHTML = recent.map(log => `
            <div style="font-size: 0.8rem; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                <span class="text-primary">[${new Date(log.timestamp).toLocaleTimeString()}]</span>
                <span class="badge" style="font-size: 0.65rem; margin: 0 8px; background: rgba(255,255,255,0.05);">${log.category}</span>
                <span style="color: var(--text-secondary);">${log.event}:</span>
                <span class="text-tertiary">${log.details}</span>
            </div>
        `).join('');
    }

    async generateCSV() {
        const logs = await cloud.getLogs();
        if (!logs) throw new Error('Could not fetch logs');

        const headers = ['Timestamp', 'Category', 'Event', 'Details'];
        const csvRows = [headers.join(',')];

        logs.forEach(log => {
            const row = [
                `"${new Date(log.timestamp).toLocaleString()}"`,
                `"${log.category}"`,
                `"${log.event}"`,
                `"${String(log.details).replace(/"/g, '""')}"`
            ];
            csvRows.push(row.join(','));
        });

        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ESPectrum_Log_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    }

    async generatePDF() {
        const { jsPDF } = window.jspdf || {};
        if (!jsPDF) {
            showToast('PDF Engine not ready. Try again in 2 seconds.', 'warning');
            return;
        }

        const logs = await cloud.getLogs();
        if (!logs || logs.length === 0) throw new Error('No data to export');

        const doc = new jsPDF();

        // --- Header ---
        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, 210, 40, 'F');

        doc.setTextColor(104, 74, 255);
        doc.setFontSize(22);
        doc.text("ESPECTRUM SECURITY REPORT", 14, 22);

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 32);
        doc.text(`Scope: Full System Audit`, 14, 37);

        // --- Summary Section ---
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(14);
        doc.text("Activity Overview", 14, 55);

        const security = logs.filter(l => l.category === 'Security');
        const attacks = logs.filter(l => l.category === 'Attack');

        doc.setFontSize(10);
        doc.text(`• Total Events: ${logs.length}`, 20, 65);
        doc.text(`• Security Alerts: ${security.length}`, 20, 72);
        doc.text(`• Offensive Actions: ${attacks.length}`, 20, 79);

        // --- Logs Table ---
        const tableData = logs.slice(0, 500).map(l => [
            new Date(l.timestamp).toLocaleString(),
            l.category,
            l.event,
            l.details.length > 60 ? l.details.substring(0, 57) + '...' : l.details
        ]);

        if (doc.autoTable) {
            doc.autoTable({
                startY: 90,
                head: [['Timestamp', 'Category', 'Event', 'Details']],
                body: tableData,
                theme: 'striped',
                headStyles: { fillColor: [104, 74, 255], fontSize: 9 },
                styles: { fontSize: 7, cellPadding: 2 },
                columnStyles: { 3: { cellWidth: 80 } }
            });
        }

        doc.save(`ESPectrum_Audit_${Date.now()}.pdf`);
    }

    cleanup() { }
}
