/**
 * Bootstrap utilities
 */

export function initBoostrap(): void {
  // Initialize Bootstrap tooltips
  initTooltips();

  // Initialize Bootstrap popovers
  initPopovers();
}

function initTooltips(): void {
  const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  tooltipTriggerList.forEach((tooltipTriggerEl) => {
    try {
      // Using Bootstrap tooltip would require importing it
      // For now, just add data attributes for future enhancement
    } catch (error) {
      console.error('Error initializing tooltips:', error);
    }
  });
}

function initPopovers(): void {
  const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
  popoverTriggerList.forEach((popoverTriggerEl) => {
    try {
      // Using Bootstrap popover would require importing it
      // For now, just add data attributes for future enhancement
    } catch (error) {
      console.error('Error initializing popovers:', error);
    }
  });
}
