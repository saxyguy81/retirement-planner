/**
 * Dashboard Visual Regression Tests
 *
 * Visual tests for the Dashboard component using Vitest Browser Mode.
 * These tests capture screenshots and compare against baseline images.
 */

import { render } from '@testing-library/react';
import { page } from '@vitest/browser/context';
import { describe, it, expect } from 'vitest';

import {
  MOCK_PROJECTIONS,
  MOCK_PARAMS,
  MOCK_SUMMARY,
  disableAnimations,
  waitForCharts,
} from '../../../tests/visual/utils';

import { Dashboard } from './index';

// Import styles for proper rendering
import '../../index.css';

describe('Dashboard Visual', () => {
  it('renders overview tab correctly', async () => {
    disableAnimations();

    render(<Dashboard projections={MOCK_PROJECTIONS} params={MOCK_PARAMS} />);

    // Wait for dashboard to render
    await page.waitForSelector('[data-testid="dashboard"]');

    // Wait for Recharts to render
    await waitForCharts(page);

    await expect(page.getByTestId('dashboard')).toMatchScreenshot('dashboard-overview');
  });

  it('renders charts container correctly', async () => {
    disableAnimations();

    render(<Dashboard projections={MOCK_PROJECTIONS} params={MOCK_PARAMS} />);

    await page.waitForSelector('[data-testid="dashboard-charts"]');
    await waitForCharts(page);

    await expect(page.getByTestId('dashboard-charts')).toMatchScreenshot('dashboard-charts');
  });

  it('renders balances tab correctly', async () => {
    disableAnimations();

    render(<Dashboard projections={MOCK_PROJECTIONS} params={MOCK_PARAMS} />);

    await page.waitForSelector('[data-testid="dashboard"]');

    // Click on Balances tab
    const balancesTab = await page.getByText('Balances');
    if (balancesTab) {
      await balancesTab.click();
      await waitForCharts(page);
    }

    await expect(page.getByTestId('dashboard-charts')).toMatchScreenshot('dashboard-balances');
  });

  it('renders income & tax tab correctly', async () => {
    disableAnimations();

    render(<Dashboard projections={MOCK_PROJECTIONS} params={MOCK_PARAMS} />);

    await page.waitForSelector('[data-testid="dashboard"]');

    // Click on Income & Tax tab
    const incomeTab = await page.getByText('Income & Tax');
    if (incomeTab) {
      await incomeTab.click();
      await waitForCharts(page);
    }

    await expect(page.getByTestId('dashboard-charts')).toMatchScreenshot('dashboard-income-tax');
  });

  it('renders withdrawals tab correctly', async () => {
    disableAnimations();

    render(<Dashboard projections={MOCK_PROJECTIONS} params={MOCK_PARAMS} />);

    await page.waitForSelector('[data-testid="dashboard"]');

    // Click on Withdrawals tab
    const withdrawalsTab = await page.getByText('Withdrawals');
    if (withdrawalsTab) {
      await withdrawalsTab.click();
      await waitForCharts(page);
    }

    await expect(page.getByTestId('dashboard-charts')).toMatchScreenshot('dashboard-withdrawals');
  });

  it('renders healthcare tab correctly', async () => {
    disableAnimations();

    render(<Dashboard projections={MOCK_PROJECTIONS} params={MOCK_PARAMS} />);

    await page.waitForSelector('[data-testid="dashboard"]');

    // Click on Healthcare tab
    const healthcareTab = await page.getByText('Healthcare');
    if (healthcareTab) {
      await healthcareTab.click();
      await waitForCharts(page);
    }

    await expect(page.getByTestId('dashboard-charts')).toMatchScreenshot('dashboard-healthcare');
  });

  it('renders legacy tab correctly', async () => {
    disableAnimations();

    render(<Dashboard projections={MOCK_PROJECTIONS} params={MOCK_PARAMS} />);

    await page.waitForSelector('[data-testid="dashboard"]');

    // Click on Legacy tab
    const legacyTab = await page.getByText('Legacy');
    if (legacyTab) {
      await legacyTab.click();
      await waitForCharts(page);
    }

    await expect(page.getByTestId('dashboard-charts')).toMatchScreenshot('dashboard-legacy');
  });

  it('renders with stacked layout', async () => {
    disableAnimations();

    render(<Dashboard projections={MOCK_PROJECTIONS} params={MOCK_PARAMS} />);

    await page.waitForSelector('[data-testid="dashboard"]');

    // Click on stacked layout button (second layout button)
    const stackedBtn = await page.locator('[title="Stacked layout"]');
    if (stackedBtn) {
      await stackedBtn.click();
      await waitForCharts(page);
    }

    await expect(page.getByTestId('dashboard-charts')).toMatchScreenshot(
      'dashboard-stacked-layout'
    );
  });

  it('renders advanced tab correctly', async () => {
    disableAnimations();

    render(<Dashboard projections={MOCK_PROJECTIONS} params={MOCK_PARAMS} />);

    await page.waitForSelector('[data-testid="dashboard"]');

    // Click on Advanced tab
    const advancedTab = await page.getByText('Advanced');
    if (advancedTab) {
      await advancedTab.click();
      await waitForCharts(page);
    }

    await expect(page.getByTestId('dashboard-charts')).toMatchScreenshot('dashboard-advanced');
  });
});
