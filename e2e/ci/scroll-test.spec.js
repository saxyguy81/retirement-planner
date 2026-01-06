/**
 * Scroll Behavior E2E Tests
 *
 * Regression tests to ensure scrolling works correctly in key UI areas.
 *
 * Root cause: Flexbox children have implicit min-height: auto which prevents
 * them from shrinking below content size. Fix requires min-h-0 on flex children
 * and ensuring parent containers are flex containers (not block).
 */

import { test, expect } from '@playwright/test';

test.describe('Scrolling Behavior', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('projections table scrolls vertically when content exceeds viewport', async ({ page }) => {
    // Navigate to Projections tab
    await page.click('button:has-text("Projections")');
    await page.waitForTimeout(500);

    // Find the scrollable container within ProjectionsTable
    const tableContainer = page.locator('[data-testid="projections-table"] .overflow-auto');
    await expect(tableContainer).toBeVisible();

    // Expand all sections to ensure there's enough content to scroll
    await page.click('text=Expand All');
    await page.waitForTimeout(300);

    // Get scroll dimensions
    const scrollInfo = await tableContainer.evaluate(el => ({
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
      isScrollable: el.scrollHeight > el.clientHeight
    }));

    // CRITICAL: The container must be constrained (clientHeight < scrollHeight)
    // If clientHeight equals scrollHeight, the flex layout is broken
    expect(scrollInfo.isScrollable).toBe(true);
    expect(scrollInfo.clientHeight).toBeLessThan(scrollInfo.scrollHeight);

    // Verify actual scrolling works
    await tableContainer.evaluate(el => {
      el.scrollTop = 200;
    });
    const newScrollTop = await tableContainer.evaluate(el => el.scrollTop);
    expect(newScrollTop).toBeGreaterThan(0);

    // Scroll back to top
    await tableContainer.evaluate(el => {
      el.scrollTop = 0;
    });
  });

  test('projections table container has proper flex constraints', async ({ page }) => {
    // Navigate to Projections tab
    await page.click('button:has-text("Projections")');
    await page.waitForTimeout(500);

    // Verify the parent container is a flex container (not block)
    // This was the root cause of the scrolling bug
    const containerStyle = await page.evaluate(() => {
      const container = document.querySelector('[data-testid="projections-table"]');
      if (!container) return null;

      const parent = container.parentElement;
      const style = window.getComputedStyle(parent);

      return {
        display: style.display,
        flexDirection: style.flexDirection,
        minHeight: style.minHeight,
        overflow: style.overflow
      };
    });

    // Parent must be a flex container for child's flex-1 to work
    expect(containerStyle.display).toBe('flex');
    expect(containerStyle.minHeight).toBe('0px'); // Required for flex shrinking
  });

  test('projections table respects viewport height constraint', async ({ page }) => {
    // Navigate to Projections tab
    await page.click('button:has-text("Projections")');
    await page.waitForTimeout(500);

    // Get viewport height
    const viewportHeight = await page.evaluate(() => window.innerHeight);

    // Get the ProjectionsTable container height
    const tableContainerHeight = await page.evaluate(() => {
      const container = document.querySelector('[data-testid="projections-table"]');
      return container ? container.clientHeight : 0;
    });

    // Table container should be smaller than viewport (constrained by layout)
    expect(tableContainerHeight).toBeLessThan(viewportHeight);
    expect(tableContainerHeight).toBeGreaterThan(0);
  });
});
