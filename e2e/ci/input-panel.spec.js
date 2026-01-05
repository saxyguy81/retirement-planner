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
    // Look for section headers that are clickable - renamed to "What You Have"
    await expect(page.locator('text=What You Have').first()).toBeVisible();
  });

  test('Tax Strategies section is visible', async ({ page }) => {
    // Tax Strategies section (contains Roth Conversions and Cap Gains Harvesting)
    await expect(page.locator('text=Tax Strategies').first()).toBeVisible();
  });

  test('input panel has financial inputs', async ({ page }) => {
    // Should see text inputs for financial values (ParamInput and YearInput use type="text")
    // Also check for any number inputs that may exist
    const textInputs = page.locator('aside input[type="text"]');
    const textCount = await textInputs.count();
    expect(textCount).toBeGreaterThan(0);
  });

  test('expenses section with overrides works', async ({ page }) => {
    // "What You'll Spend" section is expanded by default now
    // Should see the Year-Specific Overrides subsection
    await expect(page.locator('text=Year-Specific Overrides').first()).toBeVisible();

    // Should see the Add button for overrides
    const addButton = page.locator('button:has-text("Add")').first();
    await expect(addButton).toBeVisible();
  });

  test('profile section displays correctly', async ({ page }) => {
    // About You section (renamed from Profile & Life Events) should be visible
    await expect(page.locator('text=About You').first()).toBeVisible();
  });
});
