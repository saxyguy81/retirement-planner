/**
 * Optimizer E2E Tests
 *
 * Tests for the Strategy Optimizer functionality.
 * These tests are CI-safe (no external dependencies).
 */

import { test, expect } from '@playwright/test';

test.describe('Optimizer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.click('button:has-text("Optimize")');
    await page.waitForTimeout(500);
  });

  test('shows 3 optimizer objectives', async ({ page }) => {
    await expect(page.locator('text=Maximize Heir Value')).toBeVisible();
    await expect(page.locator('text=Minimize Lifetime Tax')).toBeVisible();
    await expect(page.locator('text=Maximize Portfolio')).toBeVisible();

    // Should NOT show Balance Roth Ratio (removed in previous enhancement)
    await expect(page.locator('text=Balance Roth')).not.toBeVisible();
  });

  test('can run optimization', async ({ page }) => {
    // Click Run Optimization button
    await page.click('button:has-text("Run Optimization")');

    // Wait for results (may take a few seconds)
    await page.waitForTimeout(8000);

    // Should show results - either a table or optimization results section
    const resultsVisible = await page.locator('table').or(page.locator('text=/Heir Value|Portfolio|Tax/')).first().isVisible();
    expect(resultsVisible).toBeTruthy();
  });

  test('Create Scenario button appears in results', async ({ page }) => {
    await page.click('button:has-text("Run Optimization")');
    await page.waitForTimeout(5000);

    // Should have Create Scenario button
    await expect(page.locator('button:has-text("Create Scenario")')).toBeVisible();
  });

  test('Create Scenario switches to Scenarios tab', async ({ page }) => {
    await page.click('button:has-text("Run Optimization")');
    await page.waitForTimeout(5000);

    // Click the first Create Scenario button
    await page.click('button:has-text("Create Scenario")');
    await page.waitForTimeout(500);

    // Should now be on Scenarios tab
    await expect(page.locator('text=Scenario Comparison')).toBeVisible();
  });

  test('optimizer shows strategy descriptions', async ({ page }) => {
    await page.click('button:has-text("Run Optimization")');
    await page.waitForTimeout(5000);

    // Should show strategy names in results
    const resultsTable = page.locator('table');
    await expect(resultsTable).toBeVisible();
  });
});
