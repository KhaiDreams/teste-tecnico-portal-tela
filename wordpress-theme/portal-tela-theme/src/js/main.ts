// Main theme JavaScript
import '../styles/main.scss';
import { initBoostrap } from './utils/bootstrap';
import { setupPostInteractions } from './modules/post';

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Bootstrap components
  initBoostrap();

  // Setup post interactions
  setupPostInteractions();

  // Initialize smooth scroll for anchor links
  setupSmoothScroll();

  // Initialize lazy loading for images
  setupLazyLoading();
});

/**
 * Setup smooth scroll for anchor links
 */
function setupSmoothScroll(): void {
  document.querySelectorAll('a[href^="#"]').forEach((anchor: Element) => {
    const link = anchor as HTMLAnchorElement;
    link.addEventListener('click', (e: Event) => {
      e.preventDefault();
      const target = document.querySelector(link.getAttribute('href') || '');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
}

/**
 * Setup lazy loading for images
 */
function setupLazyLoading(): void {
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          img.src = img.dataset.src || '';
          img.classList.add('loaded');
          observer.unobserve(img);
        }
      });
    });

    document.querySelectorAll('img[data-src]').forEach((img) => {
      imageObserver.observe(img);
    });
  }
}

// Console message
console.log('Portal Tela Theme loaded successfully');
