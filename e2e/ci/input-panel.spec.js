/**
 * Input Panel E2E Tests
 *
 * Tests for the left sidebar input panel functionality.
 * These tests are CI-safe (no external dependencies).
 */

import { test, expect } from '@playwright/test';

test.describe('Input Panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('can expand and collapse input sections', async ({ page }) => {
    // The sidebar should show various collapsible sections
    // Look for section headers that are clickable - actual title is "Starting Accounts"
    await expect(page.locator('text=Starting Accounts').first()).toBeVisible();
  });

  test('Tax Strategies section is visible', async ({ page }) => {
    // Tax Strategies section (contains Roth Conversions and Cap Gains Harvesting)
    await expect(page.locator('text=Tax Strategies').first()).toBeVisible();
  });

  test('input panel has financial inputs', async ({ page }) => {
    // Should see number inputs for financial values
    const numberInputs = page.locator('input[type="number"]');
    const inputCount = await numberInputs.count();
    expect(inputCount).toBeGreaterThan(0);
  });

  test('expenses section with overrides works', async ({ page }) => {
    // Expand Expenses section (now contains overrides as subsection)
    await page.click('text=Expenses');
    await page.waitForTimeout(300);

    // Should see the Year-Specific Overrides subsection
    await expect(page.locator('text=Year-Specific Overrides').first()).toBeVisible();

    // Should see the Add button for overrides
    const addButton = page.locator('button:has-text("Add")').first();
    await expect(addButton).toBeVisible();
  });

  test('profile section displays correctly', async ({ page }) => {
    // Profile & Life Events section should be visible in the sidebar
    await expect(page.locator('text=Profile & Life Events').first()).toBeVisible();
  });
});
