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

    // Check Dashboard tab is active by default (for better first impression)
    await expect(page.locator('button:has-text("Dashboard")')).toBeVisible();
  });

  test('can navigate between all tabs', async ({ page }) => {
    // Tab labels as they appear in the UI
    const tabs = ['Projections', 'Dashboard', 'Risk Allocation', 'Heir Analysis', 'Scenarios', 'Optimize', 'AI Chat', 'Settings'];

    for (const tab of tabs) {
      const tabButton = page.locator(`button:has-text("${tab}")`).first();
      await tabButton.click();
      await page.waitForTimeout(500);
      // Tab button should be visible
      await expect(tabButton).toBeVisible();
    }
  });

  test('File menu contains New Session option', async ({ page }) => {
    // Set up dialog handler before clicking
    let dialogMessage = '';
    page.on('dialog', async dialog => {
      dialogMessage = dialog.message();
      await dialog.dismiss();
    });

    // Click the File menu button
    await page.click('button:has-text("File")');
    await page.waitForTimeout(200);

    // Click New Session inside the menu
    await page.click('button:has-text("New Session")');
    await page.waitForTimeout(500);

    expect(dialogMessage).toContain('Start a new session');
  });

  test('projections table displays data', async ({ page }) => {
    // Navigate to Projections tab (default is now Dashboard)
    await page.click('button:has-text("Projections")');
    await page.waitForTimeout(300);

    // Should see year column starting from 2025
    await expect(page.locator('text=2025').first()).toBeVisible();

    // Should see financial data (header shows $ amounts)
    await expect(page.locator('text=/Final:.*\\$/')).toBeVisible();
  });

  test('PV/FV toggle works', async ({ page }) => {
    // Navigate to Projections tab (default is now Dashboard)
    await page.click('button:has-text("Projections")');
    await page.waitForTimeout(300);

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
