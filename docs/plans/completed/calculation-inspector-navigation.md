# Enhanced Calculation Inspector with Navigation

## Overview

Enhance the CalculationInspector to provide an interactive, navigable experience where users can:
1. See formulas with actual values substituted inline (merged view)
2. Click on any variable/value to navigate to its calculation
3. Use back/forward buttons to traverse navigation history
4. See "Used By" section showing which calculations depend on this field
5. Fix the frozen column visual bug in ProjectionsTable
6. Add granular significant digit control (2, 3, 4 sig figs)

## Current State Analysis

### CalculationInspector (`src/components/CalculationInspector/index.jsx`)
- Shows calculation details in separate sections: Quick Answer, Concept, Formula, This Year's Values
- `ColorCodedFormula` component highlights variables with colors, shows values on hover
- Variables parsed from formula text using `FORMULA_COLORS` mapping
- Modal-based, shows one field at a time with no navigation history
- Each CALCULATIONS entry has a `compute()` function returning `{formula, values, result, simple}`

### ProjectionsTable Frozen Column (`src/components/ProjectionsTable/index.jsx`)
- Line 571: Header uses `sticky left-0 bg-slate-950 z-10`
- Line 674: Body cells use `sticky left-0 bg-slate-950` (no z-index)
- Content from other columns can bleed through when scrolling horizontally

### Current Precision Setting (`src/lib/formatters.js`)
- Options: 'abbreviated' | 'dollars' | 'cents'
- Abbreviated uses fixed decimal places, not true significant figures

### Calculation Dependencies (`src/lib/calculationDependencies.js`)
- `CELL_DEPENDENCIES` maps each field to its input dependencies
- Functions return `[{year, field}]` arrays
- `getDependencySign()` returns '+' or '-' for each dependency

## Desired End State

1. **Inline Values View**: Formula section shows values directly substituted over/alongside variable names
2. **Clickable Navigation**: Every variable and value in the formula is clickable, navigating to that field's calculation
3. **Navigation History**: Back/forward buttons to traverse visited calculations (browser-like)
4. **"Used By" Section**: Shows all fields that depend on the current field, also clickable
5. **Fixed Frozen Column**: First column completely obscures content when scrolling horizontally
6. **Significant Digit Options**: 2, 3, or 4 significant figures for abbreviated currency display

### Verification
- Click on a calculation row → inspector opens
- Formula shows inline values (e.g., `iraBOY - iraWithdrawal` becomes `$1.5M - $50K`)
- Click on `iraBOY` → navigates to 2024 iraEOY calculation (actual dependency)
- Back button returns to original calculation
- "Used By" section shows fields like `totalBOY`, `iraEOY` that use this value
- Click on "Used By" item → navigates forward to that calculation
- Scroll horizontally in table → frozen column fully obscures other columns
- Settings shows sig fig options → values format accordingly

## What We're NOT Doing

- Not changing the table structure or data flow
- Not adding new calculation types
- Not modifying the actual computation logic
- Not changing the color scheme or visual design language
- Not adding keyboard shortcuts for navigation (future enhancement)

## Implementation Approach

Build incrementally:
1. Fix the simple CSS bug first (frozen column)
2. Add significant digit formatting options
3. Build the navigation infrastructure (history stack, reverse dependencies)
4. Enhance the CalculationInspector UI with inline values and clickable elements
5. Add "Used By" section

---

## Phase 1: Fix Frozen Column Visual Bug

### Overview
Ensure the frozen first column completely obscures content when scrolling horizontally.

### Changes Required

#### 1. ProjectionsTable Sticky Column Styling
**File**: `src/components/ProjectionsTable/index.jsx`

**Change 1**: Add z-index to sticky header cell (line ~571)
```jsx
// Before:
<th className="text-left py-1.5 px-2 sticky left-0 bg-slate-950 min-w-40">

// After:
<th className="text-left py-1.5 px-2 sticky left-0 bg-slate-950 min-w-40 z-20 after:absolute after:right-0 after:top-0 after:bottom-0 after:w-px after:bg-slate-700 after:shadow-[2px_0_4px_rgba(0,0,0,0.3)]">
```

**Change 2**: Add z-index to sticky body cells (line ~674)
```jsx
// Before:
<td className={`py-1 px-2 sticky left-0 bg-slate-950 ${row.dim ? 'text-slate-500' : 'text-slate-300'}`}>

// After:
<td className={`py-1 px-2 sticky left-0 bg-slate-950 z-20 after:absolute after:right-0 after:top-0 after:bottom-0 after:w-px after:bg-slate-700 ${row.dim ? 'text-slate-500' : 'text-slate-300'}`}>
```

**Change 3**: Add z-index to section header rows (line ~627)
```jsx
// The section header td also needs proper z-index when it spans the frozen column area
// Add z-20 to section header cells
```

### Success Criteria

#### Automated Verification:
- [x] Build succeeds: `npm run build`
- [x] Lint passes: `npm run lint`

#### Manual Verification (automated via e2e-verification.mjs):
- [x] Frozen column has proper z-index and shadow styling (e2e verified)

---

## Phase 2: Significant Digit Formatting

### Overview
Replace the current 'abbreviated' option with granular significant digit control: 2, 3, or 4 sig figs.

### Changes Required

#### 1. Update Formatters
**File**: `src/lib/formatters.js`

**Add significant figure formatting logic**:
```javascript
// Update globalPrecision options
// 'sig2' | 'sig3' | 'sig4' | 'dollars' | 'cents'
let globalPrecision = 'sig3'; // Default to 3 sig figs

/**
 * Format a number to N significant figures
 */
function toSigFigs(value, sigFigs) {
  if (value === 0) return 0;
  const magnitude = Math.floor(Math.log10(Math.abs(value)));
  const scale = Math.pow(10, magnitude - sigFigs + 1);
  return Math.round(value / scale) * scale;
}

/**
 * Format currency with significant figures for abbreviated values
 */
export function formatCurrency(value, options = {}) {
  const {
    abbreviate = true,
    showSign = false,
    prefix = '$',
    useGlobalPrecision = true,
  } = options;

  if (value == null || isNaN(value)) return `${prefix}0`;

  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : showSign && value > 0 ? '+' : '';

  if (useGlobalPrecision) {
    // Full precision modes
    if (globalPrecision === 'cents') {
      return `${sign}${prefix}${absValue.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}`;
    }
    if (globalPrecision === 'dollars') {
      return `${sign}${prefix}${Math.round(absValue).toLocaleString()}`;
    }

    // Significant figure modes (sig2, sig3, sig4)
    const sigFigs = globalPrecision === 'sig2' ? 2 :
                    globalPrecision === 'sig3' ? 3 :
                    globalPrecision === 'sig4' ? 4 : 3;

    if (abbreviate && absValue >= 1e3) {
      const rounded = toSigFigs(absValue, sigFigs);
      if (rounded >= 1e9) {
        const num = rounded / 1e9;
        const decimals = Math.max(0, sigFigs - Math.floor(Math.log10(num)) - 1);
        return `${sign}${prefix}${num.toFixed(decimals)}B`;
      } else if (rounded >= 1e6) {
        const num = rounded / 1e6;
        const decimals = Math.max(0, sigFigs - Math.floor(Math.log10(num)) - 1);
        return `${sign}${prefix}${num.toFixed(decimals)}M`;
      } else if (rounded >= 1e3) {
        const num = rounded / 1e3;
        const decimals = Math.max(0, sigFigs - Math.floor(Math.log10(num)) - 1);
        return `${sign}${prefix}${num.toFixed(decimals)}K`;
      }
    }
  }

  // Fallback for small values or non-abbreviated
  return `${sign}${prefix}${Math.round(absValue).toLocaleString()}`;
}
```

#### 2. Update SettingsPanel
**File**: `src/components/SettingsPanel/index.jsx`

**Update Display Precision options** (lines 196-212):
```jsx
{[
  { value: 'sig2', label: '$1.2M', desc: '2 significant figures' },
  { value: 'sig3', label: '$1.23M', desc: '3 significant figures' },
  { value: 'sig4', label: '$1.234M', desc: '4 significant figures' },
  { value: 'dollars', label: '$1,234,567', desc: 'Full dollars' },
  { value: 'cents', label: '$1,234,567.89', desc: 'Dollars and cents' },
].map(option => (
  <button
    key={option.value}
    onClick={() => updateSettings({ displayPrecision: option.value })}
    className={`px-2 py-1.5 rounded text-xs ${
      (settings.displayPrecision || 'sig3') === option.value
        ? 'bg-blue-600 text-white'
        : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
    }`}
    title={option.desc}
  >
    {option.label}
  </button>
))}
```

#### 3. Update Default Setting
**File**: `src/hooks/useProjections.js`

**Change default** (in DEFAULT_SETTINGS):
```javascript
displayPrecision: 'sig3', // Changed from 'abbreviated'
```

### Success Criteria

#### Automated Verification:
- [x] Build succeeds: `npm run build`
- [x] Lint passes: `npm run lint`

#### Manual Verification (automated via e2e-verification.mjs):
- [x] Settings → Display Preferences shows 5 options (e2e verified)
- [x] Can select precision options (e2e verified)

---

## Phase 3: Navigation Infrastructure

### Overview
Build the foundation for navigation: reverse dependency mapping and history management.

### Changes Required

#### 1. Create Reverse Dependency Mapping
**File**: `src/lib/calculationDependencies.js`

**Add function to compute reverse dependencies**:
```javascript
/**
 * Build a reverse dependency map: for each field, which fields use it?
 * Returns { [field]: [{year, field, parentField}] }
 */
export function getReverseDependencies(field, year, allData) {
  const usedBy = [];

  // Check each field to see if it depends on our field
  for (const [parentField, getDeps] of Object.entries(CELL_DEPENDENCIES)) {
    // Check the same year first
    const sameYearData = allData.find(d => d.year === year);
    if (sameYearData) {
      const deps = getDeps(year, sameYearData, allData);
      if (deps.some(d => d.field === field && d.year === year)) {
        usedBy.push({ year, field: parentField });
      }
    }

    // Check next year (for BOY fields that use prior EOY)
    const nextYearData = allData.find(d => d.year === year + 1);
    if (nextYearData) {
      const deps = getDeps(year + 1, nextYearData, allData);
      if (deps.some(d => d.field === field && d.year === year)) {
        usedBy.push({ year: year + 1, field: parentField });
      }
    }

    // Check 2 years later (for IRMAA lookback)
    const twoYearsLater = allData.find(d => d.year === year + 2);
    if (twoYearsLater) {
      const deps = getDeps(year + 2, twoYearsLater, allData);
      if (deps.some(d => d.field === field && d.year === year)) {
        usedBy.push({ year: year + 2, field: parentField });
      }
    }
  }

  return usedBy;
}
```

#### 2. Create Navigation Hook
**File**: `src/hooks/useInspectorNavigation.js` (new file)

```javascript
import { useState, useCallback } from 'react';

/**
 * Hook for managing calculation inspector navigation history
 */
export function useInspectorNavigation() {
  // History stack: [{field, year, data}]
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Current inspection state
  const current = historyIndex >= 0 ? history[historyIndex] : null;

  // Navigate to a new field (adds to history)
  const navigateTo = useCallback((field, year, data) => {
    setHistory(prev => {
      // Truncate forward history if navigating from middle
      const truncated = prev.slice(0, historyIndex + 1);
      return [...truncated, { field, year, data }];
    });
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  // Go back in history
  const goBack = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
    }
  }, [historyIndex]);

  // Go forward in history
  const goForward = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1);
    }
  }, [historyIndex, history.length]);

  // Close inspector and clear history
  const close = useCallback(() => {
    setHistory([]);
    setHistoryIndex(-1);
  }, []);

  // Can navigate?
  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex < history.length - 1;

  return {
    current,
    navigateTo,
    goBack,
    goForward,
    close,
    canGoBack,
    canGoForward,
    historyLength: history.length,
    historyIndex,
  };
}
```

### Success Criteria

#### Automated Verification:
- [x] Build succeeds: `npm run build`
- [x] New hook file exists and exports correctly

#### Manual Verification:
- [x] N/A - infrastructure only, tested in Phase 4

---

## Phase 4: Enhanced Calculation Inspector UI

### Overview
Update CalculationInspector to show inline values, clickable navigation, back/forward buttons, and "Used By" section.

### Changes Required

#### 1. Update CalculationInspector Component
**File**: `src/components/CalculationInspector/index.jsx`

**Major changes**:

1. **Accept navigation props instead of single field**:
```jsx
export function CalculationInspector({
  current,           // {field, year, data} from navigation hook
  params,
  projections,       // All projections for dependency lookup
  onNavigate,        // (field, year, data) => void
  onBack,
  onForward,
  onClose,
  canGoBack,
  canGoForward,
}) {
```

2. **Create ClickableFormula component** (replaces ColorCodedFormula):
```jsx
function ClickableFormula({ formula, data, projections, onNavigate }) {
  // Similar parsing logic to ColorCodedFormula
  // But each variable is wrapped in a clickable button
  // On click: find the dependency and call onNavigate with the source field/year

  return (
    <span className="whitespace-pre-wrap">
      {parts.map((part, idx) => {
        if (part.type === 'text') {
          return <span key={idx}>{part.content}</span>;
        }

        // Variable - make it clickable
        const { config, value, content, dependency } = part;
        return (
          <button
            key={idx}
            onClick={() => dependency && onNavigate(dependency.field, dependency.year, ...)}
            style={{ color: config.color, borderBottom: `2px solid ${config.color}` }}
            className="font-medium hover:bg-white/10 rounded px-0.5 cursor-pointer"
            title={`Click to see ${config.label} calculation`}
          >
            <span className="text-xs opacity-70">{content}</span>
            <span className="ml-1">{formattedValue}</span>
          </button>
        );
      })}
    </span>
  );
}
```

3. **Add navigation header with back/forward**:
```jsx
<div className="px-4 py-3 border-b border-slate-700 flex justify-between items-center sticky top-0 bg-slate-900">
  <div className="flex items-center gap-2">
    <button
      onClick={onBack}
      disabled={!canGoBack}
      className={`p-1 rounded ${canGoBack ? 'hover:bg-slate-700 text-slate-300' : 'text-slate-600 cursor-not-allowed'}`}
    >
      <ChevronLeft className="w-5 h-5" />
    </button>
    <button
      onClick={onForward}
      disabled={!canGoForward}
      className={`p-1 rounded ${canGoForward ? 'hover:bg-slate-700 text-slate-300' : 'text-slate-600 cursor-not-allowed'}`}
    >
      <ChevronRight className="w-5 h-5" />
    </button>
  </div>
  <div>
    <h3 className="text-lg font-medium text-slate-200">{calc.name}</h3>
    <div className="text-slate-500 text-xs">Year {data.year} (Age {data.age})</div>
  </div>
  <button onClick={onClose} className="text-slate-400 hover:text-white">
    <X className="w-5 h-5" />
  </button>
</div>
```

4. **Add "Used By" section**:
```jsx
{/* Used By Section */}
<div>
  <div className="text-slate-400 text-xs uppercase tracking-wide mb-2">Used By</div>
  <div className="flex flex-wrap gap-2">
    {usedBy.length === 0 ? (
      <span className="text-slate-500 text-sm italic">Not used by other calculations</span>
    ) : (
      usedBy.map((dep, idx) => {
        const depCalc = CALCULATIONS[dep.field];
        return (
          <button
            key={idx}
            onClick={() => onNavigate(dep.field, dep.year, projections.find(p => p.year === dep.year))}
            className="px-2 py-1 bg-slate-800 rounded text-sm text-slate-300 hover:bg-slate-700 flex items-center gap-1"
          >
            <span>{depCalc?.name || dep.field}</span>
            <span className="text-slate-500">({dep.year})</span>
            <ChevronRight className="w-3 h-3 text-slate-500" />
          </button>
        );
      })
    )}
  </div>
</div>
```

#### 2. Update ProjectionsTable Integration
**File**: `src/components/ProjectionsTable/index.jsx`

**Use the navigation hook**:
```jsx
import { useInspectorNavigation } from '../../hooks/useInspectorNavigation';

// Inside component:
const navigation = useInspectorNavigation();

// When cell is clicked:
onClick={() => {
  if (isInspectable) {
    navigation.navigateTo(row.key, d.year, d);
  }
}}

// Render inspector:
{navigation.current && (
  <CalculationInspector
    current={navigation.current}
    params={params}
    projections={projections}
    onNavigate={navigation.navigateTo}
    onBack={navigation.goBack}
    onForward={navigation.goForward}
    onClose={navigation.close}
    canGoBack={navigation.canGoBack}
    canGoForward={navigation.canGoForward}
  />
)}
```

### Success Criteria

#### Automated Verification:
- [x] Build succeeds: `npm run build`
- [x] Lint passes: `npm run lint`

#### Manual Verification (automated via e2e-verification.mjs):
- [x] Click on cell → inspector opens (e2e verified)
- [x] Back/forward navigation buttons present (e2e verified)
- [x] "Used By" section present with actual values ($1.23M format) (e2e verified)
- [x] Formula shows navigation hint (e2e verified)
- [x] Navigation works - back button enabled after navigating (e2e verified)
- [x] Back navigation works (e2e verified)
- [x] Inspector closes correctly (e2e verified)

---

## Testing Strategy

### Unit Tests
- Test `getReverseDependencies()` returns correct fields
- Test `toSigFigs()` rounds correctly for various magnitudes
- Test `useInspectorNavigation` hook manages history correctly

### Integration Tests
- Test navigation flow: open → navigate → back → forward → close
- Test that clicking variables resolves to correct dependency year

### Manual Testing Steps
1. Open projections table, click on any highlighted row value
2. Verify formula shows inline values with variable names
3. Click on a variable → verify navigation to correct year's calculation
4. Use back/forward buttons → verify history works
5. Check "Used By" section lists correct dependent fields
6. Scroll table horizontally → verify frozen column obscures content
7. Change precision in settings → verify all values update

---

## Performance Considerations

- Reverse dependency calculation is O(n*m) where n=fields, m=years
- Cache reverse dependencies if performance becomes an issue
- Navigation history limited to reasonable depth (100 entries max)

## References

- CalculationInspector: `src/components/CalculationInspector/index.jsx`
- ProjectionsTable: `src/components/ProjectionsTable/index.jsx`
- Dependencies: `src/lib/calculationDependencies.js`
- Formatters: `src/lib/formatters.js`
- Settings: `src/components/SettingsPanel/index.jsx`
- Colors: `src/lib/colors.js`
