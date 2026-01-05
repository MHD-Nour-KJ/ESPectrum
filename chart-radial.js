/**
 * ESPectrum - Radial Gauge Chart
 * Chart.js doughnut chart styled as a radial gauge
 */

export default class RadialGauge {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.chart = null;
        this.min = options.min || 0;
        this.max = options.max || 100;
        this.value = options.value || 0;
        this.label = options.label || '';
        this.unit = options.unit || '';
        this.color = options.color || '#684AFF';

        this.init();
    }

    init() {
        if (!window.Chart) {
            console.error('[RadialGauge] Chart.js not loaded');
            return;
        }

        const percentage = ((this.value - this.min) / (this.max - this.min)) * 100;

        this.chart = new Chart(this.canvas, {
            type: 'doughnut',
            data: {
                datasets: [{
                    data: [percentage, 100 - percentage],
                    backgroundColor: [
                        this.color,
                        'rgba(255, 255, 255, 0.1)'
                    ],
                    borderWidth: 0,
                    circumference: 270,
                    rotation: 225
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '75%',
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        enabled: false
                    }
                }
            }
        });

        // Add center text
        this.addCenterText();
    }

    /**
     * Add text in center of gauge
     */
    addCenterText() {
        const plugin = {
            id: 'centerText',
            afterDraw: (chart) => {
                const ctx = chart.ctx;
                const centerX = chart.width / 2;
                const centerY = chart.height / 2;

                ctx.save();
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                // Value
                ctx.font = 'bold 2rem Inter';
                ctx.fillStyle = '#FFFFFF';
                ctx.fillText(this.value.toFixed(1), centerX, centerY - 10);

                // Unit
                ctx.font = '1rem Inter';
                ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
                ctx.fillText(this.unit, centerX, centerY + 20);

                ctx.restore();
            }
        };

        Chart.register(plugin);
    }

    /**
     * Update gauge value
     * @param {number} value - New value
     */
    update(value) {
        if (!this.chart) return;

        this.value = value;
        const percentage = ((value - this.min) / (this.max - this.min)) * 100;

        this.chart.data.datasets[0].data = [percentage, 100 - percentage];
        this.chart.update('active');
    }

    /**
     * Set gauge color
     */
    setColor(color) {
        if (!this.chart) return;

        this.color = color;
        this.chart.data.datasets[0].backgroundColor[0] = color;
        this.chart.update();
    }

    /**
     * Destroy chart
     */
    destroy() {
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
    }
}
