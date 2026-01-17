/**
 * ESPectrum - Touch Pins Visualizer Widget
 * Real-time visualization of ESP32 touch pin readings
 */

import store from './app-store.js';

export default class TouchPinsWidget {
  constructor(container) {
    this.container = container;
    this.pins = Array(2).fill(0);
    this.labels = ['33 (T8)', '32 (T9)'];
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
            <div class="pin-label mono">GPIO ${this.labels[index] || index}</div>
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
        grid-template-columns: repeat(2, 1fr);
        gap: var(--spacing-lg);
        padding: var(--spacing-md);
      }
      
      .touch-pin {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.75rem;
        perspective: 1000px;
      }
      
      .pin-bar {
        width: 40px;
        height: 180px;
        background: rgba(0, 0, 0, 0.3);
        border: 2px solid rgba(255, 255, 255, 0.05);
        border-radius: 20px;
        position: relative;
        overflow: hidden;
        box-shadow: inset 0 0 15px rgba(0,0,0,0.5);
      }

      .pin-bar::before {
        content: '';
        position: absolute;
        top: 0; left: 0; right: 0; bottom: 0;
        background: repeating-linear-gradient(
          0deg,
          transparent,
          transparent 2px,
          rgba(255, 255, 255, 0.05) 3px
        );
        pointer-events: none;
        z-index: 2;
      }
      
      .pin-fill {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 0%;
        background: linear-gradient(180deg, #00f2ff, #7000ff);
        transition: height 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        border-radius: 18px;
        z-index: 1;
      }

      .pin-fill::after {
        content: '';
        position: absolute;
        top: 0; left: 0; right: 0; height: 10px;
        background: #fff;
        filter: blur(4px);
        opacity: 0.8;
      }
      
      .touch-pin.active .pin-bar {
        border-color: rgba(0, 242, 255, 0.5);
        box-shadow: 0 0 20px rgba(0, 242, 255, 0.2);
        transform: scale(1.05);
      }

      .touch-pin.active .pin-fill {
        box-shadow: 0 0 30px #00f2ff;
        filter: brightness(1.2);
        animation: pulse-glow 2s infinite ease-in-out;
      }

      .touch-pin.active .pin-label {
        color: #00f2ff;
        text-shadow: 0 0 10px rgba(0, 242, 255, 0.5);
        animation: pulse-glow 2s infinite ease-in-out;
      }
      
      .pin-label {
        font-size: 0.75rem;
        font-weight: 800;
        color: var(--text-tertiary);
        letter-spacing: 1px;
        text-transform: uppercase;
        transition: all 0.3s ease;
      }
      
      .pin-value {
        font-size: 0.7rem;
        color: var(--text-tertiary);
        opacity: 0.8;
        font-family: var(--font-mono);
        margin-top: -5px;
      }

      @keyframes pulse-glow {
        0% { opacity: 0.7; }
        50% { opacity: 1; filter: brightness(1.5); }
        100% { opacity: 0.7; }
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

  update(value) {
    this.updatePins(value);
  }

  updatePins(touchData) {
    if (Array.isArray(touchData)) {
      this.pins = touchData;
    } else if (typeof touchData === 'number') {
      this.pins = [touchData, 0];
    }

    this.pins.forEach((value, index) => {
      const pinContainer = this.container.querySelector(`[data-pin="${index}"]`);
      const fill = this.container.querySelector(`[data-pin-fill="${index}"]`);
      const valueDisplay = this.container.querySelector(`[data-pin-value="${index}"]`);

      if (fill && valueDisplay) {
        // ESP32 Touch Logic:
        // The user reported values range 0-2200, with lower values when touched.
        // We track a baseline (untouched) and a floor (touched).
        const baseline = 2200;
        const touchFloor = 500; // Threshold for 100% fill

        let percentage = ((baseline - value) / (baseline - touchFloor)) * 100;

        // Clamp 0-100
        percentage = Math.max(0, Math.min(100, percentage));

        fill.style.height = `${percentage}%`;

        // Add 'active' class to the whole container for combined effects
        // Trigger if value drops significantly (e.g., below 80% of baseline)
        if (value < (baseline * 0.8) && value > 0) {
          pinContainer.classList.add('active');
        } else {
          pinContainer.classList.remove('active');
        }

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
