import Chart from 'chart.js/auto';

/**
 * ESPectrum - Line Chart Wrapper
 * Chart.js wrapper for real-time line charts
 */

export default class LineChart {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.chart = null;
        this.maxDataPoints = options.maxDataPoints || 50;

        this.defaultOptions = {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: options.label || 'Data',
                    data: [],
                    borderColor: options.color || '#684AFF',
                    backgroundColor: options.backgroundColor || 'rgba(104, 74, 255, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 300
                },
                plugins: {
                    legend: {
                        display: options.showLegend ?? true,
                        labels: {
                            color: '#FFFFFF',
                            font: {
                                family: 'Inter'
                            }
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#FFFFFF',
                        bodyColor: '#FFFFFF',
                        borderColor: '#684AFF',
                        borderWidth: 1
                    }
                },
                scales: {
                    x: {
                        display: options.showXAxis ?? true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)',
                            drawBorder: false
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.6)',
                            font: {
                                family: 'Inter',
                                size: 10
                            },
                            maxTicksLimit: 10
                        }
                    },
                    y: {
                        display: options.showYAxis ?? true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)',
                            drawBorder: false
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.6)',
                            font: {
                                family: 'Inter',
                                size: 10
                            }
                        },
                        min: options.min,
                        max: options.max
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        };

        this.init();
    }

    init() {
        this.chart = new Chart(this.canvas, this.defaultOptions);
    }

    /**
     * Add data point
     * @param {string} label - X-axis label (timestamp)
     * @param {number} value - Data value
     */
    addData(label, value) {
        if (!this.chart) return;

        this.chart.data.labels.push(label);
        this.chart.data.datasets[0].data.push(value);

        // Limit data points
        if (this.chart.data.labels.length > this.maxDataPoints) {
            this.chart.data.labels.shift();
            this.chart.data.datasets[0].data.shift();
        }

        this.chart.update('none'); // Update without animation for performance
    }

    /**
     * Clear all data
     */
    clear() {
        if (!this.chart) return;

        this.chart.data.labels = [];
        this.chart.data.datasets[0].data = [];
        this.chart.update();
    }

    /**
     * Update chart options
     */
    updateOptions(options) {
        if (!this.chart) return;

        Object.assign(this.chart.options, options);
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
