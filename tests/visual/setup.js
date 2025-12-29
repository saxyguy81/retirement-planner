/**
 * Visual Test Setup
 *
 * Setup file for browser-based visual regression tests.
 * Runs before each visual test file.
 */

import { beforeAll, afterEach } from 'vitest';

// Disable animations for stable screenshots
beforeAll(() => {
  const style = document.createElement('style');
  style.textContent = `
    *, *::before, *::after {
      animation-duration: 0s !important;
      animation-delay: 0s !important;
      transition-duration: 0s !important;
      transition-delay: 0s !important;
    }
  `;
  document.head.appendChild(style);
});

// Clean up DOM after each test
afterEach(() => {
  document.body.innerHTML = '';
});
