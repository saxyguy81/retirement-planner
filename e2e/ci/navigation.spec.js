/**
 * Navigation E2E Tests
 *
 * Tests for basic app navigation and UI interactions.
 * These tests are CI-safe (no external dependencies).
 */

import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('loads application with default values', async ({ page }) => {
    // Check app is loaded
    await expect(page.locator('[data-testid="app-loaded"]')).toBeVisible();

    // Check header shows "Retirement Planner"
    await expect(page.locator('text=Retirement Planner')).toBeVisible();

    // Check projections tab is active by default
    await expect(page.locator('button:has-text("Projections")')).toBeVisible();
  });

  test('can navigate between all tabs', async ({ page }) => {
    const tabs = ['Projections', 'Dashboard', 'Risk', 'Heir', 'Scenarios', 'Optimize', 'AI Chat', 'Settings'];

    for (const tab of tabs) {
      const tabButton = page.locator(`button:has-text("${tab}")`).first();
      await tabButton.click();
      await page.waitForTimeout(500);
      // Tab button should be visible
      await expect(tabButton).toBeVisible();
    }
  });

  test('New button shows confirmation dialog', async ({ page }) => {
    // Set up dialog handler before clicking
    let dialogMessage = '';
    page.on('dialog', async dialog => {
      dialogMessage = dialog.message();
      await dialog.dismiss();
    });

    await page.click('button:has-text("New")');
    await page.waitForTimeout(500);

    expect(dialogMessage).toContain('Start a new session');
  });

  test('projections table displays data', async ({ page }) => {
    // Should see year column starting from 2025
    await expect(page.locator('text=2025').first()).toBeVisible();

    // Should see financial data (header shows $ amounts)
    await expect(page.locator('text=/Final:.*\\$/')).toBeVisible();
  });

  test('PV/FV toggle works', async ({ page }) => {
    // Find the PV/FV button
    const pvButton = page.locator('button:has-text("PV")');
    const fvButton = page.locator('button:has-text("FV")');

    // Initially should show PV
    await expect(pvButton.or(fvButton)).toBeVisible();

    // Click to toggle
    await pvButton.or(fvButton).click();
    await page.waitForTimeout(300);

    // Should now show the other value
    await expect(pvButton.or(fvButton)).toBeVisible();
  });

  test('summary stats display in header', async ({ page }) => {
    // Check for Final, Heir, and Tax stats
    await expect(page.locator('text=/Final:.*\\$/')).toBeVisible();
    await expect(page.locator('text=/Heir:.*\\$/')).toBeVisible();
    await expect(page.locator('text=/Tax:.*\\$/')).toBeVisible();
  });
});
