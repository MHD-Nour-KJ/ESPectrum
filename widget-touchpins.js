/**
 * ESPectrum - Touch Pins Visualizer Widget
 * Real-time visualization of ESP32 touch pin readings
 */

import store from './app-store.js';

export default class TouchPinsWidget {
  constructor(container) {
    this.container = container;
    this.pins = Array(10).fill(0);
    this.unsubscribe = null;
  }

  render() {
    this.container.innerHTML = `
      <div class="touch-pins-grid">
        ${this.pins.map((_, index) => `
          <div class="touch-pin" data-pin="${index}">
            <div class="pin-bar">
              <div class="pin-fill" data-pin-fill="${index}"></div>
            </div>
            <div class="pin-label mono">T${index}</div>
            <div class="pin-value mono" data-pin-value="${index}">0</div>
          </div>
        `).join('')}
      </div>
    `;

    // Add styles
    this.addStyles();

    // Subscribe to store
    this.subscribeToStore();
  }

  addStyles() {
    if (document.getElementById('touch-pins-styles')) return;

    const style = document.createElement('style');
    style.id = 'touch-pins-styles';
    style.textContent = `
      .touch-pins-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
        gap: var(--spacing-sm);
      }
      
      .touch-pin {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
      }
      
      .pin-bar {
        width: 100%;
        height: 120px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid var(--glass-border);
        border-radius: var(--radius-md);
        position: relative;
        overflow: hidden;
      }
      
      .pin-fill {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 0%;
        background: linear-gradient(180deg, var(--color-primary-light), var(--color-primary));
        transition: height 0.3s ease, box-shadow 0.3s ease;
        border-radius: var(--radius-md);
      }
      
      .pin-fill.active {
        box-shadow: 0 0 20px var(--color-primary), 0 0 40px var(--color-primary);
      }
      
      .pin-label {
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--text-secondary);
      }
      
      .pin-value {
        font-size: 0.75rem;
        color: var(--text-tertiary);
      }
    `;

    document.head.appendChild(style);
  }

  subscribeToStore() {
    this.unsubscribe = store.subscribe('sensorData', (data) => {
      if (data && data.touch) {
        this.updatePins(data.touch);
      }
    });
  }

  updatePins(touchData) {
    if (!Array.isArray(touchData)) return;

    touchData.forEach((value, index) => {
      const fill = this.container.querySelector(`[data-pin-fill="${index}"]`);
      const valueDisplay = this.container.querySelector(`[data-pin-value="${index}"]`);

      if (fill && valueDisplay) {
        // Map touch value (0-1023) to percentage
        const percentage = (value / 1023) * 100;
        fill.style.height = `${percentage}%`;

        // Add active class if touched
        if (value > 100) {
          fill.classList.add('active');
        } else {
          fill.classList.remove('active');
        }

        // Update value
        valueDisplay.textContent = value;
      }
    });
  }

  cleanup() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }
}
