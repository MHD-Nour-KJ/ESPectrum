/**
 * Button Feedback Utility
 * Wraps async actions with UI feedback (Loading -> Success/Error)
 */

/**
 * Wraps a button's action with visual feedback
 * @param {HTMLElement} button - The button element
 * @param {Function} actionFn - Async function to execute
 * @param {Object} options - Custom icons/text
 */
export async function wrapCommand(button, actionFn, options = {}) {
    if (!button) return;

    // Store original state
    const originalContent = button.innerHTML;
    const originalClass = button.className;

    // 1. Set Loading State
    button.disabled = true;
    button.classList.add('btn-loading');
    button.innerHTML = `<i class="ph ph-spinner spin"></i> ${options.loadingText || ''}`;

    try {
        // 2. Execute Action
        await actionFn();

        // 3. Success State
        button.classList.remove('btn-loading');
        button.classList.add('btn-success');
        button.innerHTML = `<i class="ph ph-check"></i> ${options.successText || ''}`;

        // Return to normal after delay
        setTimeout(() => {
            button.className = originalClass;
            button.innerHTML = originalContent;
            button.disabled = false;
        }, 2000);

    } catch (err) {
        console.error('Command failed:', err);

        // 4. Error State
        button.classList.remove('btn-loading');
        button.classList.add('btn-error');
        button.innerHTML = `<i class="ph ph-x"></i> Failed`;

        // Show notification if available
        if (window.store && typeof window.App?.prototype?.showErrorNotification === 'function') {
            // Accessing the method via instance might be tricky if not exposed, 
            // so we'll dispatch an error to the store if we can, or just log.
            // Ideally we'd use the global app instance or a notification service.
        }

        // Return to normal
        setTimeout(() => {
            button.className = originalClass;
            button.innerHTML = originalContent;
            button.disabled = false;
        }, 2000);
    }
}
