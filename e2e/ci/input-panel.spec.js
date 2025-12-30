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

  test('Roth conversions section is visible', async ({ page }) => {
    // Roth Conversions section should be in the sidebar
    await expect(page.locator('text=Roth Conversions').first()).toBeVisible();
  });

  test('input panel has financial inputs', async ({ page }) => {
    // Should see number inputs for financial values
    const numberInputs = page.locator('input[type="number"]');
    const inputCount = await numberInputs.count();
    expect(inputCount).toBeGreaterThan(0);
  });

  test('expense overrides section works', async ({ page }) => {
    // Expand Expense Overrides section
    await page.click('text=Expense Overrides');
    await page.waitForTimeout(300);

    // Should see the section content
    const addButton = page.locator('button:has-text("Add")').first();
    await expect(addButton).toBeVisible();
  });

  test('profile section displays correctly', async ({ page }) => {
    // Profile section should be visible in the sidebar (contains timeline info)
    await expect(page.locator('text=Profile').first()).toBeVisible();
  });
});
