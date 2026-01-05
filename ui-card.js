/**
 * ESPectrum - Reusable Glass Card Component
 * Factory function for creating glass cards
 */

/**
 * Create a glass card element
 * @param {Object} options - Card configuration
 * @returns {HTMLElement} Card element
 */
export function createCard({ title, subtitle, icon, content, actions, glow = false }) {
    const card = document.createElement('div');
    card.className = `glass-card fade-in-up ${glow ? 'glow-primary' : ''}`;

    let html = '';

    // Header
    if (title || icon) {
        html += `
      <div class="card-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--spacing-sm);">
        <div style="display: flex; align-items: center; gap: var(--spacing-xs);">
          ${icon ? `<i class="ph ph-${icon}" style="font-size: 1.5rem; color: var(--color-primary);"></i>` : ''}
          <div>
            ${title ? `<h3 style="margin: 0;">${title}</h3>` : ''}
            ${subtitle ? `<p style="margin: 0; font-size: 0.875rem; color: var(--text-tertiary);">${subtitle}</p>` : ''}
          </div>
        </div>
      </div>
    `;
    }

    // Content
    if (content) {
        html += `<div class="card-content">${content}</div>`;
    }

    // Actions
    if (actions) {
        html += `
      <div class="card-actions" style="margin-top: var(--spacing-md); display: flex; gap: var(--spacing-sm); flex-wrap: wrap;">
        ${actions}
      </div>
    `;
    }

    card.innerHTML = html;
    return card;
}

/**
 * Create a skeleton loader card
 */
export function createSkeletonCard() {
    const card = document.createElement('div');
    card.className = 'glass-card';
    card.innerHTML = `
    <div class="skeleton skeleton-text" style="width: 60%; height: 1.5rem; margin-bottom: var(--spacing-sm);"></div>
    <div class="skeleton skeleton-text" style="width: 40%; height: 1rem; margin-bottom: var(--spacing-md);"></div>
    <div class="skeleton" style="height: 120px; margin-bottom: var(--spacing-sm);"></div>
    <div class="skeleton skeleton-text" style="width: 80%;"></div>
    <div class="skeleton skeleton-text" style="width: 90%;"></div>
  `;
    return card;
}

export default { createCard, createSkeletonCard };
