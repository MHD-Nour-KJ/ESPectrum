export default class PageIR {
    render(container) {
        container.innerHTML = `
            <div class="tool-page fade-in-up">
                <div class="tool-header">
                    <div class="icon-badge"><i class="ph ph-television"></i></div>
                    <div>
                        <h1>IR Remote</h1>
                        <p>Universal Remote & TV-B-Gone</p>
                    </div>
                </div>
                <div class="glass-card p-xl text-center mt-xl">
                    <i class="ph ph-wrench" style="font-size: 3rem; color: #666;"></i>
                    <h3 class="mt-md">Under Construction</h3>
                    <p class="text-tertiary">Radio Frequency modules are being calibrated.</p>
                </div>
            </div>
        `;
    }
}
