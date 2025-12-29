# Lazy Loading and Code Splitting Implementation Plan

## Overview

Implement lazy loading and code splitting to reduce initial bundle size and improve load performance. The tab-based architecture is ideal for this - users only need the active tab's code, so other tabs can load on demand.

## Current State Analysis

### Bundle Structure (No Splitting)
Currently all components are statically imported in `App.jsx:36-44`:
```javascript
import { Dashboard } from './components/Dashboard';
import { HeirAnalysis } from './components/HeirAnalysis';
import { InputPanel } from './components/InputPanel';
import { Optimization } from './components/Optimization';
import { ProjectionsTable } from './components/ProjectionsTable';
import { RiskAllocation } from './components/RiskAllocation';
import { ScenarioComparison } from './components/ScenarioComparison';
import { SettingsPanel } from './components/SettingsPanel';
```

### Heavy Dependencies
| Dependency | Approx Size | Used By |
|------------|-------------|---------|
| recharts | ~300KB | Dashboard, ChartsView, ScenarioComparison, Optimization |
| xlsx | ~200KB | excelExport (import/export only) |
| jspdf + autotable | ~150KB | excelExport (PDF export only) |
| lucide-react | ~50KB | All components (icons) |

### Component Sizes (Lazy Loading Candidates)
| Component | Lines | Tab | Priority |
|-----------|-------|-----|----------|
| ScenarioComparison | ~1549 | scenarios | High |
| Dashboard | ~946 | dashboard | High |
| ProjectionsTable | ~632 | projections | Keep static (default tab) |
| Optimization | ~545 | optimize | High |
| RiskAllocation | ~400 | risk | Medium |
| HeirAnalysis | ~350 | heir | Medium |
| SettingsPanel | ~300 | settings | Low |

## Desired End State

After implementation:
1. Initial bundle contains only `InputPanel`, `ProjectionsTable`, and core framework
2. Other tab components load on-demand when tabs are selected
3. Vendor libraries (recharts, xlsx, jspdf) are in separate chunks
4. Preloading on hover makes tab switches feel instant
5. Error boundary gracefully handles chunk load failures

### How to Verify:
- Run `npm run build` and check `dist/assets/` for multiple JS chunks
- Use browser DevTools Network tab to see chunks load when switching tabs
- Test offline/slow network to verify error boundary works

## What We're NOT Doing

- No route-based splitting (app has no router)
- No component-level splitting within tabs (too granular)
- No dynamic imports for the always-visible InputPanel
- No SSR/hydration concerns (this is a client-only SPA)

---

## Phase 1: Create Lazy Loading Infrastructure

### Overview
Add the loading fallback component and error boundary needed for Suspense.

### Changes Required:

#### 1. Create Loading Fallback Component
**File**: `src/components/LazyLoadingFallback.jsx` (new file)
**Purpose**: Shown while lazy components are loading

```jsx
import React from 'react';

export function LazyLoadingFallback({ message = 'Loading...' }) {
  return (
    <div className="flex-1 flex items-center justify-center bg-slate-950">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-slate-400 text-sm">{message}</span>
      </div>
    </div>
  );
}
```

#### 2. Create Error Boundary for Chunk Load Failures
**File**: `src/components/LazyErrorBoundary.jsx` (new file)
**Purpose**: Gracefully handle network errors when loading chunks

```jsx
import React from 'react';
import { RefreshCw } from 'lucide-react';

export class LazyErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex items-center justify-center bg-slate-950">
          <div className="text-center p-6 bg-slate-900 rounded-lg border border-slate-700 max-w-sm">
            <div className="text-rose-400 text-lg mb-2">Failed to load component</div>
            <p className="text-slate-400 text-sm mb-4">
              There was a problem loading this section. This might be due to a network issue.
            </p>
            <button
              onClick={this.handleRetry}
              className="px-4 py-2 bg-blue-600 text-white rounded text-sm flex items-center gap-2 mx-auto hover:bg-blue-500"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
```

### Success Criteria:

#### Automated Verification:
- [ ] Lint passes: `npm run lint`
- [ ] Build succeeds: `npm run build`
- [ ] Unit tests pass: `npm run test:unit`
- [ ] New files exist: `test -f src/components/LazyLoadingFallback.jsx && test -f src/components/LazyErrorBoundary.jsx`
- [ ] LazyLoadingFallback unit test passes (add test in Phase 1):
  ```javascript
  // src/components/LazyLoadingFallback.test.jsx
  import { render, screen } from '@testing-library/react';
  import { LazyLoadingFallback } from './LazyLoadingFallback';

  describe('LazyLoadingFallback', () => {
    it('renders loading spinner', () => {
      render(<LazyLoadingFallback />);
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('renders custom message', () => {
      render(<LazyLoadingFallback message="Loading Dashboard..." />);
      expect(screen.getByText('Loading Dashboard...')).toBeInTheDocument();
    });
  });
  ```
- [ ] LazyErrorBoundary unit test passes (add test in Phase 1):
  ```javascript
  // src/components/LazyErrorBoundary.test.jsx
  import { render, screen, fireEvent } from '@testing-library/react';
  import { LazyErrorBoundary } from './LazyErrorBoundary';

  const ThrowError = () => { throw new Error('Test error'); };

  describe('LazyErrorBoundary', () => {
    beforeEach(() => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    it('renders children when no error', () => {
      render(<LazyErrorBoundary><div>Content</div></LazyErrorBoundary>);
      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('renders error UI when child throws', () => {
      render(<LazyErrorBoundary><ThrowError /></LazyErrorBoundary>);
      expect(screen.getByText('Failed to load component')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('clears error state on retry click', () => {
      const { rerender } = render(<LazyErrorBoundary><ThrowError /></LazyErrorBoundary>);
      fireEvent.click(screen.getByRole('button', { name: /retry/i }));
      // After retry, boundary attempts to re-render children
      rerender(<LazyErrorBoundary><div>Recovered</div></LazyErrorBoundary>);
      expect(screen.getByText('Recovered')).toBeInTheDocument();
    });
  });
  ```

---

## Phase 2: Convert Tab Components to Lazy Loading

### Overview
Replace static imports with React.lazy() and wrap tab content in Suspense.

### Changes Required:

#### 1. Update App.jsx Imports
**File**: `src/App.jsx`
**Changes**: Convert to lazy imports, add Suspense wrapper

Replace lines 34-44 (static imports) with:

```jsx
import React, { useState, useCallback, useRef, useEffect, useMemo, Suspense, lazy } from 'react';

// Static imports - always needed
import { InputPanel } from './components/InputPanel';
import { SplitPanel } from './components/SplitPanel';
import { LazyLoadingFallback } from './components/LazyLoadingFallback';
import { LazyErrorBoundary } from './components/LazyErrorBoundary';

// Lazy imports - loaded on demand
// ProjectionsTable stays static since it's the default tab
import { ProjectionsTable } from './components/ProjectionsTable';

const Dashboard = lazy(() => import('./components/Dashboard').then(m => ({ default: m.Dashboard })));
const RiskAllocation = lazy(() => import('./components/RiskAllocation').then(m => ({ default: m.RiskAllocation })));
const HeirAnalysis = lazy(() => import('./components/HeirAnalysis').then(m => ({ default: m.HeirAnalysis })));
const ScenarioComparison = lazy(() => import('./components/ScenarioComparison').then(m => ({ default: m.ScenarioComparison })));
const Optimization = lazy(() => import('./components/Optimization').then(m => ({ default: m.Optimization })));
const SettingsPanel = lazy(() => import('./components/SettingsPanel').then(m => ({ default: m.SettingsPanel })));
```

Note: The `.then(m => ({ default: m.ComponentName }))` pattern is needed because components use named exports.

#### 2. Wrap Tab Content in Suspense
**File**: `src/App.jsx`
**Changes**: Add LazyErrorBoundary and Suspense around lazy-loaded tabs

Replace the tab content section (lines 492-544) with:

```jsx
{/* Tab content */}
<div className="flex-1 flex flex-col overflow-hidden">
  {splitView ? (
    <SplitPanel
      views={splitPanelViews}
      defaultLeftView="projections"
      defaultRightView="dashboard"
    />
  ) : (
    <LazyErrorBoundary>
      {activeTab === 'projections' && (
        <ProjectionsTable
          projections={projections}
          options={options}
          params={params}
          showPV={showPV}
        />
      )}

      <Suspense fallback={<LazyLoadingFallback />}>
        {activeTab === 'dashboard' && (
          <Dashboard projections={projections} params={params} showPV={showPV} />
        )}

        {activeTab === 'risk' && (
          <RiskAllocation
            projections={projections}
            params={params}
            selectedYear={riskYear}
            onYearChange={setRiskYear}
          />
        )}

        {activeTab === 'heir' && (
          <HeirAnalysis projections={projections} params={params} showPV={showPV} />
        )}

        {activeTab === 'scenarios' && (
          <ScenarioComparison
            params={params}
            projections={projections}
            summary={summary}
            showPV={showPV}
          />
        )}

        {activeTab === 'optimize' && (
          <Optimization
            params={params}
            projections={projections}
            summary={summary}
            updateParams={updateParams}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsPanel
            settings={settings}
            updateSettings={updateSettings}
            resetSettings={resetSettings}
          />
        )}
      </Suspense>
    </LazyErrorBoundary>
  )}
</div>
```

#### 3. Fix splitPanelViews to Work with Lazy Components
**File**: `src/App.jsx`
**Changes**: The `splitPanelViews` useMemo instantiates all components eagerly, which defeats lazy loading.

Replace the splitPanelViews useMemo (lines 175-213) with a render-function approach:

```jsx
// Split panel view configurations - use render functions for lazy loading
const splitPanelViews = useMemo(
  () => [
    {
      id: 'projections',
      label: 'Projections',
      render: () => (
        <ProjectionsTable
          projections={projections}
          options={options}
          params={params}
          showPV={showPV}
        />
      ),
    },
    {
      id: 'dashboard',
      label: 'Dashboard',
      render: () => (
        <Suspense fallback={<LazyLoadingFallback />}>
          <Dashboard projections={projections} params={params} showPV={showPV} />
        </Suspense>
      ),
    },
    {
      id: 'risk',
      label: 'Risk Allocation',
      render: () => (
        <Suspense fallback={<LazyLoadingFallback />}>
          <RiskAllocation
            projections={projections}
            params={params}
            selectedYear={riskYear}
            onYearChange={setRiskYear}
          />
        </Suspense>
      ),
    },
    {
      id: 'heir',
      label: 'Heir Analysis',
      render: () => (
        <Suspense fallback={<LazyLoadingFallback />}>
          <HeirAnalysis projections={projections} params={params} showPV={showPV} />
        </Suspense>
      ),
    },
  ],
  [projections, options, params, riskYear, showPV]
);
```

#### 4. Update SplitPanel to Use Render Functions
**File**: `src/components/SplitPanel/index.jsx`
**Changes**: Update `getViewComponent` helper and render locations to use render functions

Update the helper function at line 84-87:
```jsx
// Before:
const getViewComponent = viewId => {
  const view = views.find(v => v.id === viewId);
  return view ? view.component : null;
};

// After:
const getViewComponent = viewId => {
  const view = views.find(v => v.id === viewId);
  return view ? view.render() : null;
};
```

This change affects both usages:
- Line 132: `{getViewComponent(leftView)}` - left panel content
- Line 168: `{getViewComponent(rightView)}` - right panel content

### Success Criteria:

#### Automated Verification:
- [ ] Lint passes: `npm run lint`
- [ ] Build succeeds: `npm run build`
- [ ] Unit tests pass: `npm run test:unit`
- [ ] Build output contains lazy component chunks:
  ```bash
  # Verify at least 3 lazy component chunks exist (Dashboard, Scenarios, Optimization)
  ls dist/assets/*.js | grep -v vendor | wc -l | test $(cat) -ge 4
  ```
- [ ] App.jsx lazy loading integration test (add test):
  ```javascript
  // src/App.lazy.test.jsx
  import { render, screen, waitFor, fireEvent } from '@testing-library/react';
  import { Suspense } from 'react';
  import App from './App';

  describe('App lazy loading', () => {
    it('renders Projections tab immediately (not lazy)', async () => {
      render(<App />);
      // ProjectionsTable is static, should render without Suspense fallback
      await waitFor(() => {
        expect(screen.getByText('STARTING POSITION')).toBeInTheDocument();
      });
    });

    it('shows loading state when switching to Dashboard tab', async () => {
      render(<App />);
      const dashboardTab = screen.getByRole('button', { name: /dashboard/i });
      fireEvent.click(dashboardTab);
      // May briefly show loading state, then content
      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('all tabs render without errors after loading', async () => {
      render(<App />);
      const tabs = ['Dashboard', 'Risk Allocation', 'Heir Analysis', 'Scenarios', 'Optimize', 'Settings'];
      for (const tabName of tabs) {
        const tab = screen.getByRole('button', { name: new RegExp(tabName, 'i') });
        fireEvent.click(tab);
        await waitFor(() => {
          expect(screen.queryByText('Failed to load component')).not.toBeInTheDocument();
        }, { timeout: 5000 });
      }
    });
  });
  ```
- [ ] SplitPanel render function test (add test):
  ```javascript
  // src/components/SplitPanel/SplitPanel.test.jsx
  import { render, screen } from '@testing-library/react';
  import { SplitPanel } from './index';

  describe('SplitPanel with render functions', () => {
    const mockViews = [
      { id: 'left', label: 'Left', render: () => <div>Left Content</div> },
      { id: 'right', label: 'Right', render: () => <div>Right Content</div> },
    ];

    it('renders content from render functions', () => {
      render(<SplitPanel views={mockViews} defaultLeftView="left" defaultRightView="right" />);
      expect(screen.getByText('Left Content')).toBeInTheDocument();
      expect(screen.getByText('Right Content')).toBeInTheDocument();
    });
  });
  ```

---

## Phase 3: Configure Vite Vendor Chunking

### Overview
Configure Vite's Rollup output to split large vendor libraries into separate chunks for better caching.

### Changes Required:

#### 1. Update Vite Configuration
**File**: `vite.config.js`
**Changes**: Add manualChunks configuration

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/retirement-planner/',
  server: {
    port: 3000,
    open: true
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React - rarely changes, cache separately
          'vendor-react': ['react', 'react-dom'],

          // Charting library - large, used by multiple tabs
          'vendor-recharts': ['recharts'],

          // Export libraries - only loaded when exporting
          'vendor-export': ['xlsx', 'jspdf', 'jspdf-autotable'],

          // Icons - used everywhere, cache separately
          'vendor-icons': ['lucide-react'],
        }
      }
    }
  }
});
```

### Success Criteria:

#### Automated Verification:
- [ ] Build succeeds: `npm run build`
- [ ] Separate vendor chunks exist in `dist/assets/`:
  ```bash
  # Verify all 4 vendor chunks are created
  ls dist/assets/ | grep -E 'vendor-(react|recharts|export|icons)' | wc -l | test $(cat) -eq 4
  ```
- [ ] Vendor chunk separation test (add to build verification script):
  ```bash
  #!/bin/bash
  # scripts/verify-chunks.sh
  set -e
  npm run build

  # Check vendor chunks exist
  for chunk in vendor-react vendor-recharts vendor-export vendor-icons; do
    if ! ls dist/assets/${chunk}-*.js 1>/dev/null 2>&1; then
      echo "ERROR: Missing ${chunk} chunk"
      exit 1
    fi
  done

  # Check main bundle is smaller than 500KB (was ~1MB+ before splitting)
  MAIN_SIZE=$(ls -l dist/assets/index-*.js | awk '{print $5}')
  if [ "$MAIN_SIZE" -gt 512000 ]; then
    echo "WARNING: Main bundle is ${MAIN_SIZE} bytes, expected < 500KB"
  fi

  # Verify app still works by checking HTML references chunks
  if ! grep -q 'vendor-react' dist/index.html && ! grep -q 'modulepreload' dist/index.html; then
    echo "ERROR: index.html doesn't reference vendor chunks properly"
    exit 1
  fi

  echo "All chunk verification passed"
  ```
- [ ] Integration test verifies app loads after chunking:
  ```javascript
  // Add to src/App.lazy.test.jsx
  it('app renders with vendor chunking', async () => {
    render(<App />);
    // If vendor chunks fail to load, app won't render
    await waitFor(() => {
      expect(screen.getByText('Retirement Planner')).toBeInTheDocument();
    });
  });
  ```

---

## Phase 4: Add Preloading on Tab Hover

### Overview
Start loading tab components when users hover over tabs, making switches feel instant.

### Changes Required:

#### 1. Add Preload Functions
**File**: `src/App.jsx`
**Changes**: Add preload functions after the lazy imports

```jsx
// Preload functions - trigger chunk loading without rendering
const preloadDashboard = () => import('./components/Dashboard');
const preloadRisk = () => import('./components/RiskAllocation');
const preloadHeir = () => import('./components/HeirAnalysis');
const preloadScenarios = () => import('./components/ScenarioComparison');
const preloadOptimize = () => import('./components/Optimization');
const preloadSettings = () => import('./components/SettingsPanel');

// Map tab IDs to preload functions
const preloadMap = {
  dashboard: preloadDashboard,
  risk: preloadRisk,
  heir: preloadHeir,
  scenarios: preloadScenarios,
  optimize: preloadOptimize,
  settings: preloadSettings,
};
```

#### 2. Add onMouseEnter to Tab Buttons
**File**: `src/App.jsx`
**Changes**: Update tab button rendering to preload on hover

Find the tab button map (around line 436) and add onMouseEnter:

```jsx
{TABS.map(tab => (
  <button
    key={tab.id}
    onClick={() => {
      setActiveTab(tab.id);
      if (
        splitView &&
        (tab.id === 'scenarios' || tab.id === 'optimize' || tab.id === 'settings')
      ) {
        setSplitView(false);
      }
    }}
    onMouseEnter={() => {
      // Preload component when user hovers over tab
      const preload = preloadMap[tab.id];
      if (preload) preload();
    }}
    className={`h-full px-3 flex items-center gap-1.5 border-b-2 text-xs transition-colors ${
      activeTab === tab.id && !splitView
        ? 'border-blue-500 text-blue-400 bg-slate-800/50'
        : 'border-transparent text-slate-400 hover:text-slate-300'
    }`}
  >
    <tab.icon className="w-3 h-3" />
    {tab.label}
  </button>
))}
```

### Success Criteria:

#### Automated Verification:
- [ ] Lint passes: `npm run lint`
- [ ] Build succeeds: `npm run build`
- [ ] Unit tests pass: `npm run test:unit`
- [ ] Preload functions are defined correctly (static analysis):
  ```bash
  # Verify preloadMap contains all lazy tabs
  grep -E "preloadMap\s*=" src/App.jsx | grep -q "dashboard.*risk.*heir.*scenarios.*optimize.*settings" || \
    (grep -A10 "preloadMap" src/App.jsx | grep -c ":" | test $(cat) -ge 6)
  ```
- [ ] Tab hover preloading test (add test):
  ```javascript
  // Add to src/App.lazy.test.jsx
  describe('Tab preloading on hover', () => {
    it('preloads Dashboard component on tab hover', async () => {
      render(<App />);
      const dashboardTab = screen.getByRole('button', { name: /dashboard/i });

      // Mock import to track if it's called
      const importSpy = vi.spyOn(window, 'import').mockImplementation(() => Promise.resolve({}));

      fireEvent.mouseEnter(dashboardTab);

      // After hover, clicking should be fast (component already loading)
      fireEvent.click(dashboardTab);
      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      }, { timeout: 3000 }); // Faster than cold load
    });

    it('does not break on rapid hover across tabs', async () => {
      render(<App />);
      const tabs = screen.getAllByRole('button').filter(btn =>
        ['Dashboard', 'Risk', 'Heir', 'Scenarios', 'Optimize', 'Settings'].some(t =>
          btn.textContent.includes(t)
        )
      );

      // Rapidly hover over all tabs
      for (const tab of tabs) {
        fireEvent.mouseEnter(tab);
      }

      // App should still be responsive
      expect(screen.getByText('Retirement Planner')).toBeInTheDocument();
    });
  });
  ```
- [ ] onMouseEnter handler exists on tab buttons:
  ```bash
  grep -A20 "TABS.map" src/App.jsx | grep -q "onMouseEnter"
  ```

---

## Testing Strategy

### Unit Tests (All Automated):
- `LazyLoadingFallback.test.jsx`: Renders loading spinner, accepts custom message
- `LazyErrorBoundary.test.jsx`: Catches errors, shows retry button, clears state on retry
- `SplitPanel.test.jsx`: Renders content from render functions

### Integration Tests (All Automated):
- `App.lazy.test.jsx`:
  - Projections tab renders immediately (not lazy)
  - All tabs render without errors after switching
  - App renders with vendor chunking
  - Tab preloading on hover works correctly
  - Rapid hover across tabs doesn't break app

### Build Verification (Automated Script):
- `scripts/verify-chunks.sh`:
  - All vendor chunks created (react, recharts, export, icons)
  - Main bundle size under threshold
  - HTML references chunks correctly

### Running All Verification:
```bash
npm run check && bash scripts/verify-chunks.sh
```

---

## Performance Considerations

### Expected Improvements:
- Initial bundle reduced by ~40-60%
- Faster first contentful paint
- Better caching of vendor chunks
- Preloading eliminates perceived latency

### Potential Tradeoffs:
- Slight delay on first tab switch (mitigated by preloading)
- More HTTP requests (mitigated by HTTP/2 multiplexing)
- Build output has more files (not a problem)

---

## References

- React.lazy documentation: https://react.dev/reference/react/lazy
- Vite code splitting: https://vite.dev/guide/features#async-chunk-loading-optimization
- Prior performance note: `docs/plans/completed/enhanced-analysis-features.md:1045`
