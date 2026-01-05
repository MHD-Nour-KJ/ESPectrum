/**
 * ESPectrum - Skeleton Loader Component
 * Creates placeholder loaders for async content
 */

/**
 * Create skeleton loader for charts
 */
export function createChartSkeleton() {
    const skeleton = document.createElement('div');
    skeleton.className = 'skeleton';
    skeleton.style.height = '300px';
    skeleton.style.borderRadius = 'var(--radius-md)';
    return skeleton;
}

/**
 * Create skeleton loader for text
 */
export function createTextSkeleton(lines = 3) {
    const container = document.createElement('div');

    for (let i = 0; i < lines; i++) {
        const line = document.createElement('div');
        line.className = 'skeleton skeleton-text';
        line.style.width = `${60 + Math.random() * 40}%`;
        container.appendChild(line);
    }

    return container;
}

/**
 * Create skeleton loader for card grid
 */
export function createGridSkeleton(count = 3) {
    const grid = document.createElement('div');
    grid.className = 'grid grid-auto gap-md';

    for (let i = 0; i < count; i++) {
        const card = document.createElement('div');
        card.className = 'glass-card';
        card.innerHTML = `
      <div class="skeleton skeleton-text" style="width: 60%; margin-bottom: var(--spacing-sm);"></div>
      <div class="skeleton" style="height: 200px;"></div>
    `;
        grid.appendChild(card);
    }

    return grid;
}

/**
 * Replace element with skeleton
 */
export function showSkeleton(element, type = 'chart') {
    const originalContent = element.innerHTML;
    element.dataset.originalContent = originalContent;

    let skeleton;
    switch (type) {
        case 'chart':
            skeleton = createChartSkeleton();
            break;
        case 'text':
            skeleton = createTextSkeleton();
            break;
        default:
            skeleton = createChartSkeleton();
    }

    element.innerHTML = '';
    element.appendChild(skeleton);
}

/**
 * Restore element from skeleton
 */
export function hideSkeleton(element) {
    if (element.dataset.originalContent) {
        element.innerHTML = element.dataset.originalContent;
        delete element.dataset.originalContent;
    }
}

export default {
    createChartSkeleton,
    createTextSkeleton,
    createGridSkeleton,
    showSkeleton,
    hideSkeleton
};
