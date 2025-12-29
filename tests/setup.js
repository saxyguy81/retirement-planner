import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Custom matchers for financial calculations
expect.extend({
  /**
   * Assert that a value is within a dollar tolerance of the expected value
   * @param {number} received - The actual value
   * @param {number} expected - The expected value
   * @param {number} tolerance - The maximum allowed difference (default: $1)
   */
  toBeWithinDollars(received, expected, tolerance = 1) {
    const pass = Math.abs(received - expected) <= tolerance;
    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} not to be within $${tolerance} of ${expected}`
          : `expected ${received} to be within $${tolerance} of ${expected}, but difference was $${Math.abs(received - expected)}`,
    };
  },

  /**
   * Assert that a value is within a percentage tolerance of the expected value
   * @param {number} received - The actual value
   * @param {number} expected - The expected value
   * @param {number} tolerancePercent - The maximum allowed difference as a decimal (default: 0.01 = 1%)
   */
  toBeWithinPercent(received, expected, tolerancePercent = 0.01) {
    const tolerance = Math.abs(expected * tolerancePercent);
    const pass = Math.abs(received - expected) <= tolerance;
    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} not to be within ${tolerancePercent * 100}% of ${expected}`
          : `expected ${received} to be within ${tolerancePercent * 100}% of ${expected}, but difference was ${((Math.abs(received - expected) / expected) * 100).toFixed(2)}%`,
    };
  },
});
