/**
 * ProjectionsTable Visual Regression Tests
 *
 * Visual tests for the ProjectionsTable component using Vitest Browser Mode.
 * These tests capture screenshots and compare against baseline images.
 */

import { render } from '@testing-library/react';
import { page } from '@vitest/browser/context';
import { describe, it, expect } from 'vitest';

import { ProjectionsTable } from './index';
import { MOCK_PROJECTIONS, MOCK_PARAMS, disableAnimations } from '../../../tests/visual/utils';

// Import styles for proper rendering
import '../../index.css';

describe('ProjectionsTable Visual', () => {
  it('renders table correctly with default settings', async () => {
    disableAnimations();

    render(
      <ProjectionsTable
        projections={MOCK_PROJECTIONS}
        params={MOCK_PARAMS}
        options={{ showPV: false, iterativeTax: false }}
      />
    );

    // Wait for table to render
    await page.waitForSelector('[data-testid="projections-table"]');

    await expect(page.getByTestId('projections-table')).toMatchScreenshot(
      'projections-table-default'
    );
  });

  it('renders with Present Value toggle enabled', async () => {
    disableAnimations();

    render(
      <ProjectionsTable
        projections={MOCK_PROJECTIONS}
        params={MOCK_PARAMS}
        options={{ showPV: true, iterativeTax: false }}
      />
    );

    await page.waitForSelector('[data-testid="projections-table"]');

    await expect(page.getByTestId('projections-table')).toMatchScreenshot('projections-table-pv');
  });

  it('renders with all sections expanded', async () => {
    disableAnimations();

    render(
      <ProjectionsTable
        projections={MOCK_PROJECTIONS}
        params={MOCK_PARAMS}
        options={{ showPV: false, iterativeTax: false }}
      />
    );

    await page.waitForSelector('[data-testid="projections-table"]');

    // Click "Expand All" button
    const expandBtn = await page.getByText('Expand All');
    if (expandBtn) {
      await expandBtn.click();
      // Wait for expansion animation
      await page.waitForTimeout(100);
    }

    await expect(page.getByTestId('projections-table')).toMatchScreenshot(
      'projections-table-expanded'
    );
  });

  it('renders with survivor year styling', async () => {
    disableAnimations();

    // Create projections with survivor indicator
    const projectionsWithSurvivor = MOCK_PROJECTIONS.map((p, i) => ({
      ...p,
      isSurvivor: i >= 2, // Last projection is survivor
    }));

    render(
      <ProjectionsTable
        projections={projectionsWithSurvivor}
        params={MOCK_PARAMS}
        options={{ showPV: false, iterativeTax: false }}
      />
    );

    await page.waitForSelector('[data-testid="projections-table"]');

    await expect(page.getByTestId('projections-table')).toMatchScreenshot(
      'projections-table-survivor'
    );
  });

  it('renders with iterative tax indicator', async () => {
    disableAnimations();

    // Create projections with iterations
    const projectionsWithIterations = MOCK_PROJECTIONS.map(p => ({
      ...p,
      iterations: 3,
    }));

    render(
      <ProjectionsTable
        projections={projectionsWithIterations}
        params={MOCK_PARAMS}
        options={{ showPV: false, iterativeTax: true }}
      />
    );

    await page.waitForSelector('[data-testid="projections-table"]');

    await expect(page.getByTestId('projections-table')).toMatchScreenshot(
      'projections-table-iterative'
    );
  });
});
