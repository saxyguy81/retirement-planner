# Projections UX & Heir Analysis Enhancements

> **STATUS: 100% COMPLETE** - Updated 2025-12-28
>
> **DONE:**
> - Phase 1: Global PV toggle in App.jsx toolbar, colors.js with accessible color system
> - Phase 2: Projection sheet restructured with 10 logical sections following "story of a year"
> - Phase 3: Interactive cell highlighting with CELL_DEPENDENCIES and colored outlines
> - Phase 4: Row selection with checkboxes, CustomViewModal for custom tables/charts
> - Phase 5: CalculationInspector with unified view (concept, formula, values, simple)
> - Phase 6: Input reorganization - heirs, discountRate, heirDistributionStrategy in DEFAULT_PARAMS
> - Phase 7: Validation & Smart Inputs - validation.js with SmartYearInput component
> - Phase 8: Heir distribution analysis with calculateMultiHeirValueWithStrategy (even/year10)
> - Phase 9: Scenario UX improvements - ScenarioNameModal for naming custom scenarios
> - Visual polish: Accessible Okabe-Ito color palette, consistent Tailwind styling, transitions

## Overview

Comprehensive enhancement to the retirement planner covering nine major areas:
1. **Global PV Toggle & Color System** - Consistent present value display, accessible blue-orange palette
2. **Projection Sheet Restructure** - Optimized section grouping for logical year flow
3. **Interactive Cell Highlighting** - Hover to see calculation dependencies with colored outlines
4. **Row Selection & Custom Views** - Select rows to generate custom tables/charts/dashboards
5. **Unified Calculation Inspector** - Replace tabbed view with organized single-page display
6. **Input Reorganization** - Move heir params, discount rate, iteration controls to visible inputs
7. **Validation & Smart Inputs** - Age OR year entry, sanity checking, sensible defaults
8. **Heir Distribution Analysis** - 10-year rule modeling with per-heir taxable RoR for normalized comparison
9. **Scenario UX Improvements** - Remove "+ " prefix, add naming dialog for custom scenarios

---

## Current State Analysis

### Key Discoveries:
- PV toggle is local to ProjectionsTable (`src/components/ProjectionsTable/index.jsx:167`)
- CalculationInspector uses 4 tabs: Concept/Formula/Values/Simple (`index.jsx:595-600`)
- Heir parameters are in Settings (`useProjections.js:38-51`), not visible in InputPanel
- Iterative tax toggle exists in code (`useProjections.js:229-231`) but no UI control
- Tax year defaults to 2024 (`taxTables.js:149`)
- Trump SS exemption is boolean, defaults to false (`useProjections.js:28`)
- No validation beyond basic NaN checks and min/max clamping

### Files to Modify:
| File | Changes |
|------|---------|
| `src/hooks/useProjections.js` | Move heir/discount to params, add SS exemption modes |
| `src/components/ProjectionsTable/index.jsx` | Enhanced highlighting, tooltips, color system |
| `src/components/CalculationInspector/index.jsx` | Unified view, color-coded formulas |
| `src/components/InputPanel/index.jsx` | Heir section, discount rate, iteration control, validation |
| `src/components/SettingsPanel/index.jsx` | Remove moved items, add SS exemption mode selector |
| `src/lib/projections.js` | Tax accuracy metric, heir distribution strategies |
| `src/lib/calculations.js` | Heir PV calculations with 10-year rule |
| `src/App.jsx` | Global PV state, pass to all views |

---

## What We're NOT Doing

- Changing the underlying tax calculation logic (only adding metrics)
- Modifying chart visualizations (focus is on table and inspector)
- Adding new projection scenarios
- Changing the data persistence structure

---

## Phase 1: Global PV Toggle & Color System

### Overview
Move PV toggle to App level, create consistent color semantic system, apply to all views.

### Changes Required:

#### 1. App.jsx - Global PV State
**File**: `src/App.jsx`

Add global PV state and pass to all components:

```jsx
// Add to App component state
const [showPV, setShowPV] = useState(true);

// Add to toolbar (visible on all tabs except Settings)
<button
  onClick={() => setShowPV(!showPV)}
  className={`px-2 py-1 text-xs rounded flex items-center gap-1 ${
    showPV
      ? 'bg-blue-600 text-white'
      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
  }`}
  title={showPV ? 'Showing Present Value (today\'s dollars)' : 'Showing Future Value (nominal dollars)'}
>
  <DollarSign className="w-3 h-3" />
  {showPV ? 'PV' : 'FV'}
</button>

// Pass showPV to: ProjectionsTable, ChartsView, Dashboard, ScenarioComparison, HeirAnalysis
```

#### 2. Accessibility-First Color Semantic System
**File**: `src/lib/colors.js` (new file)

Using blue-orange palette instead of red-green for colorblind accessibility (Okabe-Ito palette):

```javascript
/**
 * Accessible Color System
 *
 * Uses blue-orange as primary semantic pair (colorblind-safe)
 * Based on Okabe-Ito palette: https://siegal.bio.nyu.edu/color-palette/
 * WCAG 2.1 AA compliant (4.5:1 contrast for text)
 */

// Cell value colors by semantic meaning
export const VALUE_COLORS = {
  // Positive flows (additions, income) - Blue (Okabe-Ito)
  positive: {
    text: 'text-blue-500',        // #0072B2
    bg: 'bg-blue-500/10',
    border: 'border-blue-500',
    ring: 'ring-blue-500',
  },
  // Negative flows (subtractions, withdrawals, taxes) - Orange/Vermillion (Okabe-Ito)
  negative: {
    text: 'text-orange-500',      // #D55E00
    bg: 'bg-orange-500/10',
    border: 'border-orange-500',
    ring: 'ring-orange-500',
  },
  // Neutral/calculated values
  neutral: {
    text: 'text-slate-300',
    bg: 'bg-slate-800/50',
    border: 'border-slate-600',
    ring: 'ring-slate-400',
  },
  // Highlighted totals - Teal (Okabe-Ito Blue-Green)
  highlight: {
    text: 'text-teal-400',        // #009E73
    bg: 'bg-teal-400/10',
    border: 'border-teal-400',
    ring: 'ring-teal-400',
  },
  // Dim/secondary
  dim: {
    text: 'text-slate-500',
    bg: 'bg-slate-900/30',
    border: 'border-slate-700',
    ring: 'ring-slate-600',
  },
};

// Formula variable colors (for inspector) - All from Okabe-Ito palette
export const FORMULA_COLORS = {
  iraBOY: { color: '#E69F00', label: 'IRA' },       // Okabe-Ito Orange
  rothBOY: { color: '#009E73', label: 'Roth' },     // Okabe-Ito Blue-Green
  atBOY: { color: '#56B4E9', label: 'AT' },         // Okabe-Ito Sky Blue
  withdrawal: { color: '#D55E00', label: 'W' },     // Okabe-Ito Vermillion
  tax: { color: '#CC79A7', label: 'Tax' },          // Okabe-Ito Pink
  income: { color: '#0072B2', label: 'Inc' },       // Okabe-Ito Blue
  expense: { color: '#F0E442', label: 'Exp' },      // Okabe-Ito Yellow
  growth: { color: '#009E73', label: 'Grw' },       // Okabe-Ito Blue-Green
};

// Row semantic categories
export const ROW_SEMANTICS = {
  // Beginning of year - neutral (calculated from prior)
  atBOY: 'neutral', iraBOY: 'neutral', rothBOY: 'neutral', totalBOY: 'highlight',

  // Income - positive (money in)
  ssAnnual: 'positive',

  // Expenses - negative (money out)
  expenses: 'negative', rothConversion: 'neutral',

  // Withdrawals - negative (money leaving accounts)
  atWithdrawal: 'negative', iraWithdrawal: 'negative', rothWithdrawal: 'negative',
  totalWithdrawal: 'negative',

  // Taxes - negative (money out)
  federalTax: 'negative', ltcgTax: 'negative', niit: 'negative',
  stateTax: 'negative', totalTax: 'negative',
  irmaaTotal: 'negative',

  // End of year - neutral/highlight
  atEOY: 'neutral', iraEOY: 'neutral', rothEOY: 'neutral',
  totalEOY: 'highlight', heirValue: 'highlight',

  // Returns - positive (growth)
  effectiveAtReturn: 'positive', effectiveIraReturn: 'positive', effectiveRothReturn: 'positive',
};

// Accessibility note: Always pair color with secondary indicator
// - Prefix signs: +/- for positive/negative values
// - Directional icons: up/down arrows where appropriate
// - Pattern/weight: bold for totals, lighter for dim
```

#### 3. Update ProjectionsTable
**File**: `src/components/ProjectionsTable/index.jsx`

- Remove local `showPV` state, accept as prop
- Import and apply `ROW_SEMANTICS` colors
- Update cell styling based on semantic meaning

```jsx
// In getSections, add semantic to each row
{ key: 'atWithdrawal', label: 'From After-Tax', format: '$', semantic: 'negative' },

// In cell rendering
const semantic = ROW_SEMANTICS[row.key] || 'neutral';
const colors = VALUE_COLORS[semantic];

<td className={`text-right py-1 px-2 tabular-nums ${colors.text} ...`}>
```

#### 4. Update All Views to Accept showPV Prop
**Files**: `ChartsView`, `Dashboard`, `ScenarioComparison`, `HeirAnalysis`

Each component should:
- Accept `showPV` as prop
- Use appropriate PV/FV keys for display
- Remove any local PV toggle (keep only one source of truth)

### Success Criteria:

#### Automated Verification:
- [ ] Build succeeds: `npm run build`
- [ ] No TypeScript/ESLint errors: `npm run lint`

#### Manual Verification:
- [ ] PV toggle visible in top toolbar on all tabs
- [ ] Toggling PV updates all views simultaneously
- [ ] Color coding distinguishes positive (green) from negative (red) values
- [ ] Totals highlighted in teal
- [ ] Positive values (income, returns) in blue
- [ ] Negative values (expenses, taxes, withdrawals) in orange

---

## Phase 2: Projection Sheet Restructure

### Overview
Reorganize the projection table sections for better logical flow. The current structure has issues: Roth conversion misplaced, IRMAA shown after taxes but affects withdrawals, fragmented analysis sections.

### New Section Structure

The logical "story" of a retirement year:
1. What do I have? (Starting Position)
2. What money is coming in? (Income)
3. What money is going out? (Cash Needs)
4. What am I required/choosing to distribute? (RMD & Conversions)
5. Where does the withdrawal come from? (Withdrawals)
6. How much tax do I owe? (Tax Detail)
7. What do I have left? (Ending Position)
8. What's it worth to heirs? (Heir Value)
9. Performance metrics (Analysis)

### Changes Required:

#### 1. Update getSections()
**File**: `src/components/ProjectionsTable/index.jsx`

```javascript
const getSections = (showPV) => [
  {
    title: 'STARTING POSITION',
    rows: [
      { key: 'atBOY', label: 'After-Tax', format: '$' },
      { key: 'iraBOY', label: 'Traditional IRA', format: '$' },
      { key: 'rothBOY', label: 'Roth IRA', format: '$' },
      { key: 'totalBOY', label: 'Total', format: '$', highlight: true },
      { key: 'costBasisBOY', label: 'Cost Basis', format: '$', dim: true },
    ]
  },
  {
    title: 'INCOME',
    rows: [
      { key: 'ssAnnual', label: 'Social Security', format: '$' },
    ]
  },
  {
    title: 'CASH NEEDS',
    rows: [
      { key: showPV ? 'pvExpenses' : 'expenses', label: 'Annual Expenses', format: '$' },
      { key: 'irmaaTotal', label: 'IRMAA Surcharges', format: '$' },
    ]
  },
  {
    title: 'RMD & CONVERSIONS',
    rows: [
      { key: 'rmdFactor', label: 'RMD Factor', format: 'n', dim: true },
      { key: 'rmdRequired', label: 'RMD Required', format: '$' },
      { key: 'rothConversion', label: 'Roth Conversion', format: '$', highlight: true },
    ]
  },
  {
    title: 'WITHDRAWALS',
    rows: [
      { key: 'atWithdrawal', label: 'From After-Tax', format: '$' },
      { key: 'iraWithdrawal', label: 'From IRA', format: '$' },
      { key: 'rothWithdrawal', label: 'From Roth', format: '$' },
      { key: 'totalWithdrawal', label: 'Total Withdrawal', format: '$', highlight: true },
    ]
  },
  {
    title: 'TAX DETAIL',
    rows: [
      { key: 'taxableSS', label: 'Taxable Soc Sec', format: '$', dim: true },
      { key: 'ordinaryIncome', label: 'Ordinary Income', format: '$', dim: true },
      { key: 'capitalGains', label: 'Capital Gains', format: '$', dim: true },
      { key: 'taxableOrdinary', label: 'Taxable Income', format: '$', dim: true },
      { key: 'federalTax', label: 'Federal Tax', format: '$' },
      { key: 'ltcgTax', label: 'LTCG Tax', format: '$' },
      { key: 'niit', label: 'NIIT (3.8%)', format: '$' },
      { key: 'stateTax', label: 'State Tax', format: '$' },
      { key: 'totalTax', label: 'Total Tax', format: '$', highlight: true },
      { key: 'taxEstimateAccuracy', label: 'Est. Accuracy', format: '%', dim: true },
    ]
  },
  {
    title: 'IRMAA DETAIL',
    rows: [
      { key: 'irmaaMAGI', label: 'MAGI (2yr prior)', format: '$', dim: true },
      { key: 'irmaaPartB', label: 'Part B Surcharge', format: '$', dim: true },
      { key: 'irmaaPartD', label: 'Part D Surcharge', format: '$', dim: true },
    ]
  },
  {
    title: 'ENDING POSITION',
    rows: [
      { key: showPV ? 'pvAtEOY' : 'atEOY', label: 'After-Tax', format: '$' },
      { key: showPV ? 'pvIraEOY' : 'iraEOY', label: 'Traditional IRA', format: '$' },
      { key: showPV ? 'pvRothEOY' : 'rothEOY', label: 'Roth IRA', format: '$' },
      { key: showPV ? 'pvTotalEOY' : 'totalEOY', label: 'Total', format: '$', highlight: true },
      { key: 'costBasisEOY', label: 'Cost Basis', format: '$', dim: true },
      { key: 'rothPercent', label: 'Roth %', format: '%', dim: true },
    ]
  },
  {
    title: 'HEIR VALUE',
    rows: [
      { key: showPV ? 'pvHeirValue' : 'heirValue', label: 'After-Tax to Heirs', format: '$', highlight: true },
    ]
  },
  {
    title: 'ANALYSIS & METRICS',
    rows: [
      { key: 'effectiveAtReturn', label: 'AT Return Rate', format: '%', dim: true },
      { key: 'effectiveIraReturn', label: 'IRA Return Rate', format: '%', dim: true },
      { key: 'effectiveRothReturn', label: 'Roth Return Rate', format: '%', dim: true },
      { key: 'cumulativeTax', label: 'Cumulative Tax Paid', format: '$' },
      { key: 'cumulativeIRMAA', label: 'Cumulative IRMAA', format: '$' },
      { key: 'cumulativeCapitalGains', label: 'Cumulative Cap Gains', format: '$' },
      { key: 'atLiquidationPercent', label: 'AT Liquidation %', format: '%', highlight: true },
    ]
  },
];

// Default collapsed state - keep primary flow visible
const DEFAULT_COLLAPSED = {
  'TAX DETAIL': true,
  'IRMAA DETAIL': true,
  'ANALYSIS & METRICS': true,
  // Primary flow stays expanded: STARTING POSITION, INCOME, CASH NEEDS,
  // RMD & CONVERSIONS, WITHDRAWALS, ENDING POSITION, HEIR VALUE
};
```

### Success Criteria:

#### Automated Verification:
- [ ] Build succeeds: `npm run build`

#### Manual Verification:
- [ ] Sections follow logical year flow
- [ ] IRMAA total appears in CASH NEEDS (before withdrawals)
- [ ] Roth Conversion grouped with RMD
- [ ] Analysis sections consolidated
- [ ] Default collapse keeps primary flow visible

---

## Phase 3: Interactive Cell Highlighting

### Overview
When hovering on a cell, highlight the cells that contribute to its calculation with colored rounded rectangles.

### Changes Required:

#### 1. Define Calculation Dependencies
**File**: `src/lib/calculationDependencies.js` (new file)

Map each calculated field to its input dependencies:

```javascript
// For each field, list the other fields that contribute to its value
export const CELL_DEPENDENCIES = {
  // Beginning of year = prior year end of year
  atBOY: (year, data, allData) => {
    const priorYear = allData.find(d => d.year === year - 1);
    return priorYear ? [{ year: year - 1, field: 'atEOY' }] : [];
  },
  iraBOY: (year, data, allData) => {
    const priorYear = allData.find(d => d.year === year - 1);
    return priorYear ? [{ year: year - 1, field: 'iraEOY' }] : [];
  },

  // Total BOY = sum of account BOYs
  totalBOY: (year) => [
    { year, field: 'atBOY' },
    { year, field: 'iraBOY' },
    { year, field: 'rothBOY' },
  ],

  // Total withdrawal = sum of account withdrawals
  totalWithdrawal: (year) => [
    { year, field: 'atWithdrawal' },
    { year, field: 'iraWithdrawal' },
    { year, field: 'rothWithdrawal' },
  ],

  // Total tax = sum of tax components
  totalTax: (year) => [
    { year, field: 'federalTax' },
    { year, field: 'ltcgTax' },
    { year, field: 'niit' },
    { year, field: 'stateTax' },
  ],

  // EOY = (BOY - withdrawals) * (1 + return)
  atEOY: (year) => [
    { year, field: 'atBOY' },
    { year, field: 'atWithdrawal' },
    { year, field: 'effectiveAtReturn' },
  ],
  iraEOY: (year) => [
    { year, field: 'iraBOY' },
    { year, field: 'iraWithdrawal' },
    { year, field: 'rothConversion' },
    { year, field: 'effectiveIraReturn' },
  ],
  rothEOY: (year) => [
    { year, field: 'rothBOY' },
    { year, field: 'rothWithdrawal' },
    { year, field: 'rothConversion' },
    { year, field: 'effectiveRothReturn' },
  ],
  totalEOY: (year) => [
    { year, field: 'atEOY' },
    { year, field: 'iraEOY' },
    { year, field: 'rothEOY' },
  ],

  // Heir value = AT + Roth + IRA*(1-rate)
  heirValue: (year) => [
    { year, field: 'atEOY' },
    { year, field: 'iraEOY' },
    { year, field: 'rothEOY' },
  ],

  // Federal tax depends on income
  federalTax: (year) => [
    { year, field: 'taxableOrdinary' },
    { year, field: 'iraWithdrawal' },
    { year, field: 'rothConversion' },
    { year, field: 'taxableSS' },
  ],

  // Add more as needed...
};

// Get dependencies with sign (positive contributes, negative subtracts)
export const DEPENDENCY_SIGNS = {
  // For EOY calculations
  atBOY: '+', atWithdrawal: '-', effectiveAtReturn: '+',
  iraBOY: '+', iraWithdrawal: '-', rothConversion: '-', effectiveIraReturn: '+',
  rothBOY: '+', rothWithdrawal: '-', effectiveRothReturn: '+',
  // rothConversion is + for Roth, - for IRA

  // For totals
  atEOY: '+', iraEOY: '+', rothEOY: '+',
  federalTax: '+', ltcgTax: '+', niit: '+', stateTax: '+',
};
```

#### 2. Update ProjectionsTable for Highlighting
**File**: `src/components/ProjectionsTable/index.jsx`

Add hover state and highlight logic:

```jsx
// State for highlighted cells
const [highlightedCells, setHighlightedCells] = useState([]);
// { year, field, sign } array

// On cell hover
const handleCellHover = useCallback((field, year, data) => {
  const getDeps = CELL_DEPENDENCIES[field];
  if (getDeps) {
    const deps = getDeps(year, data, projections);
    const withSigns = deps.map(d => ({
      ...d,
      sign: DEPENDENCY_SIGNS[d.field] || '+',
    }));
    setHighlightedCells(withSigns);
  } else {
    setHighlightedCells([]);
  }
}, [projections]);

const handleCellLeave = useCallback(() => {
  setHighlightedCells([]);
}, []);

// Check if a cell should be highlighted
const getCellHighlight = (field, year) => {
  const match = highlightedCells.find(h => h.field === field && h.year === year);
  if (!match) return null;
  return match.sign === '+' ? 'positive' : 'negative';
};

// In cell rendering
const highlight = getCellHighlight(row.key, d.year);
const highlightClass = highlight === 'positive'
  ? 'ring-2 ring-emerald-400 rounded bg-emerald-400/10'
  : highlight === 'negative'
    ? 'ring-2 ring-rose-400 rounded bg-rose-400/10'
    : '';

<td
  onMouseEnter={() => handleCellHover(row.key, d.year, d)}
  onMouseLeave={handleCellLeave}
  className={`... ${highlightClass}`}
>
```

### Success Criteria:

#### Automated Verification:
- [ ] Build succeeds: `npm run build`

#### Manual Verification:
- [ ] Hovering on `totalTax` highlights all tax component cells in rose
- [ ] Hovering on `atEOY` highlights atBOY (green), atWithdrawal (red), effectiveAtReturn (green)
- [ ] Hovering on `totalBOY` year 2028 highlights atEOY, iraEOY, rothEOY from 2027
- [ ] Highlight colors indicate positive (blue ring) vs negative (orange ring) contribution

---

## Phase 4: Row Selection & Custom Views

### Overview
Allow users to select one or more rows from the first column and generate custom tables, charts, or dashboards based on the selected data.

### Changes Required:

#### 1. Add Row Selection State
**File**: `src/components/ProjectionsTable/index.jsx`

```jsx
// Selection state
const [selectedRows, setSelectedRows] = useState(new Set());

// Toggle row selection
const toggleRowSelection = (rowKey) => {
  setSelectedRows(prev => {
    const next = new Set(prev);
    if (next.has(rowKey)) {
      next.delete(rowKey);
    } else {
      next.add(rowKey);
    }
    return next;
  });
};

// Select all rows in a section
const toggleSectionSelection = (section) => {
  const sectionKeys = section.rows.map(r => r.key);
  const allSelected = sectionKeys.every(k => selectedRows.has(k));

  setSelectedRows(prev => {
    const next = new Set(prev);
    sectionKeys.forEach(k => {
      if (allSelected) {
        next.delete(k);
      } else {
        next.add(k);
      }
    });
    return next;
  });
};

// Clear all selections
const clearSelection = () => setSelectedRows(new Set());
```

#### 2. Add Selection UI to Row Labels
**File**: `src/components/ProjectionsTable/index.jsx`

```jsx
// In row rendering
<td className="py-1 px-2 sticky left-0 bg-slate-950">
  <div className="flex items-center gap-2">
    {/* Selection checkbox */}
    <input
      type="checkbox"
      checked={selectedRows.has(row.key)}
      onChange={() => toggleRowSelection(row.key)}
      className="w-3 h-3 rounded border-slate-600 bg-slate-800
                 checked:bg-blue-600 checked:border-blue-600
                 focus:ring-0 focus:ring-offset-0 cursor-pointer"
    />
    <span className={row.dim ? 'text-slate-500' : 'text-slate-300'}>
      {row.label}
    </span>
  </div>
</td>

// Section header with select-all
<td onClick={() => toggleSectionSelection(section)} className="cursor-pointer">
  <div className="flex items-center gap-2">
    <input
      type="checkbox"
      checked={section.rows.every(r => selectedRows.has(r.key))}
      onChange={() => toggleSectionSelection(section)}
      className="w-3 h-3 ..."
    />
    {/* ... section title ... */}
  </div>
</td>
```

#### 3. Add Selection Action Toolbar
**File**: `src/components/ProjectionsTable/index.jsx`

```jsx
// Show when rows are selected
{selectedRows.size > 0 && (
  <div className="h-10 bg-blue-900/30 border-b border-blue-700 flex items-center px-3 justify-between">
    <div className="flex items-center gap-3">
      <span className="text-blue-300 text-xs">
        {selectedRows.size} row{selectedRows.size > 1 ? 's' : ''} selected
      </span>
      <button
        onClick={clearSelection}
        className="text-xs text-slate-400 hover:text-white"
      >
        Clear
      </button>
    </div>

    <div className="flex items-center gap-2">
      <button
        onClick={() => openCustomView('table')}
        className="px-2 py-1 text-xs bg-slate-700 text-slate-300 rounded hover:bg-slate-600 flex items-center gap-1"
      >
        <TableIcon className="w-3 h-3" />
        Custom Table
      </button>
      <button
        onClick={() => openCustomView('chart')}
        className="px-2 py-1 text-xs bg-slate-700 text-slate-300 rounded hover:bg-slate-600 flex items-center gap-1"
      >
        <LineChartIcon className="w-3 h-3" />
        Chart
      </button>
      <button
        onClick={() => openCustomView('dashboard')}
        className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-500 flex items-center gap-1"
      >
        <LayoutDashboardIcon className="w-3 h-3" />
        Dashboard
      </button>
    </div>
  </div>
)}
```

#### 4. Create CustomViewModal Component
**File**: `src/components/CustomViewModal/index.jsx` (new file)

```jsx
import React, { useState } from 'react';
import { X, Download, Copy } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { fmt$, fmtPct } from '../../lib/formatters';

export function CustomViewModal({ viewType, selectedRows, projections, onClose }) {
  const [chartType, setChartType] = useState('line'); // 'line' | 'area' | 'stacked'

  // Filter projection data to selected rows
  const chartData = projections.map(p => {
    const point = { year: p.year, age: p.age };
    selectedRows.forEach(key => {
      point[key] = p[key];
    });
    return point;
  });

  // Get row metadata for labels
  const rowLabels = useMemo(() => {
    const labels = {};
    // Flatten all sections to get labels
    getSections(false).forEach(section => {
      section.rows.forEach(row => {
        labels[row.key] = row.label;
      });
    });
    return labels;
  }, []);

  // Chart colors from accessible palette
  const CHART_COLORS = ['#0072B2', '#D55E00', '#009E73', '#E69F00', '#56B4E9', '#CC79A7'];

  if (viewType === 'table') {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
        <div className="bg-slate-900 rounded-lg border border-slate-700 w-[90vw] max-h-[80vh] overflow-auto">
          <div className="px-4 py-3 border-b border-slate-700 flex justify-between items-center sticky top-0 bg-slate-900">
            <h3 className="text-lg font-medium text-slate-200">Custom Table</h3>
            <div className="flex items-center gap-2">
              <button onClick={copyToClipboard} className="p-2 text-slate-400 hover:text-white">
                <Copy className="w-4 h-4" />
              </button>
              <button onClick={exportCSV} className="p-2 text-slate-400 hover:text-white">
                <Download className="w-4 h-4" />
              </button>
              <button onClick={onClose} className="p-2 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="text-left p-2 text-slate-400">Year</th>
                {[...selectedRows].map(key => (
                  <th key={key} className="text-right p-2 text-slate-400">{rowLabels[key]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projections.map(p => (
                <tr key={p.year} className="border-t border-slate-800">
                  <td className="p-2 text-slate-300">{p.year}</td>
                  {[...selectedRows].map(key => (
                    <td key={key} className="text-right p-2 text-slate-300 tabular-nums">
                      {formatValue(p[key], getFormat(key))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (viewType === 'chart') {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
        <div className="bg-slate-900 rounded-lg border border-slate-700 w-[80vw] h-[70vh]">
          <div className="px-4 py-3 border-b border-slate-700 flex justify-between items-center">
            <h3 className="text-lg font-medium text-slate-200">Custom Chart</h3>
            <div className="flex items-center gap-2">
              {/* Chart type selector */}
              <div className="flex gap-1">
                {['line', 'area', 'stacked'].map(type => (
                  <button
                    key={type}
                    onClick={() => setChartType(type)}
                    className={`px-2 py-1 text-xs rounded ${
                      chartType === type
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
              <button onClick={onClose} className="p-2 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="p-4 h-[calc(100%-60px)]">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'line' ? (
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="year" stroke="#64748b" />
                  <YAxis stroke="#64748b" tickFormatter={(v) => `$${(v/1e6).toFixed(1)}M`} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} />
                  <Legend />
                  {[...selectedRows].map((key, i) => (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={key}
                      name={rowLabels[key]}
                      stroke={CHART_COLORS[i % CHART_COLORS.length]}
                      strokeWidth={2}
                    />
                  ))}
                </LineChart>
              ) : (
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="year" stroke="#64748b" />
                  <YAxis stroke="#64748b" tickFormatter={(v) => `$${(v/1e6).toFixed(1)}M`} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} />
                  <Legend />
                  {[...selectedRows].map((key, i) => (
                    <Area
                      key={key}
                      type="monotone"
                      dataKey={key}
                      name={rowLabels[key]}
                      fill={CHART_COLORS[i % CHART_COLORS.length]}
                      fillOpacity={0.3}
                      stroke={CHART_COLORS[i % CHART_COLORS.length]}
                      stackId={chartType === 'stacked' ? '1' : undefined}
                    />
                  ))}
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard view - show both table summary and chart
  if (viewType === 'dashboard') {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
        <div className="bg-slate-900 rounded-lg border border-slate-700 w-[90vw] h-[85vh] overflow-auto">
          {/* ... Dashboard layout with summary cards, chart, and table ... */}
        </div>
      </div>
    );
  }
}
```

### Success Criteria:

#### Automated Verification:
- [ ] Build succeeds: `npm run build`

#### Manual Verification:
- [ ] Checkboxes appear in row label column
- [ ] Clicking checkbox selects/deselects row
- [ ] Section header checkbox selects all rows in section
- [ ] Selection count shown in toolbar when rows selected
- [ ] "Custom Table" button opens table with only selected rows
- [ ] "Chart" button opens chart with selected metrics
- [ ] "Dashboard" button opens combined view
- [ ] Copy and Export buttons work

---

## Phase 5: Unified Calculation Inspector

### Overview
Replace the 4-tab design with a single organized view showing all calculation info at once, with Excel-like color-coded formulas.

### Changes Required:

#### 1. Redesign CalculationInspector
**File**: `src/components/CalculationInspector/index.jsx`

Replace tabbed design with unified layout:

```jsx
export function CalculationInspector({ field, data, params, onClose }) {
  const calc = CALCULATIONS[field] || CALCULATIONS.default;
  const computed = calc.compute ? calc.compute(data, params) : {};

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-slate-900 rounded-lg border border-slate-700 w-[600px] max-h-[80vh] overflow-auto"
           onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-700 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium text-slate-200">{calc.name}</h3>
            <div className="text-slate-500 text-xs">Year {data.year} (Age {data.age})</div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content - All sections visible */}
        <div className="p-4 space-y-4">

          {/* Quick Answer */}
          <div className="bg-slate-800 rounded-lg p-4 text-center">
            <div className="text-3xl font-mono text-blue-400">{computed.simple}</div>
            <div className="text-slate-500 text-xs mt-1">Back-of-envelope</div>
          </div>

          {/* Concept */}
          <div>
            <div className="text-slate-400 text-xs uppercase tracking-wide mb-2">What is this?</div>
            <p className="text-slate-300 text-sm leading-relaxed">{calc.concept}</p>
          </div>

          {/* Formula with Color-Coded Values */}
          <div>
            <div className="text-slate-400 text-xs uppercase tracking-wide mb-2">Formula</div>
            <div className="bg-slate-950 rounded p-3 font-mono text-sm">
              <ColorCodedFormula formula={computed.formula} values={computed.values} data={data} />
            </div>
          </div>

          {/* Calculation Breakdown */}
          <div>
            <div className="text-slate-400 text-xs uppercase tracking-wide mb-2">This Year's Values</div>
            <div className="bg-slate-950 rounded p-3 font-mono text-sm space-y-1">
              <div className="text-slate-400">{computed.formula}</div>
              <div className="text-amber-400">{computed.values}</div>
              <div className="text-emerald-400 font-medium text-base pt-2 border-t border-slate-800">
                {computed.result}
              </div>
            </div>
          </div>

          {/* Rule of Thumb */}
          {calc.backOfEnvelope && (
            <div className="text-slate-500 text-xs italic border-t border-slate-800 pt-3">
              <span className="text-slate-400">Rule of thumb:</span> {calc.backOfEnvelope}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// New component for color-coded formula display
function ColorCodedFormula({ formula, data }) {
  // Parse formula and replace variable names with colored spans
  const colorize = (text) => {
    let result = text;
    Object.entries(FORMULA_COLORS).forEach(([key, { color, label }]) => {
      const value = data[key];
      if (value !== undefined) {
        const regex = new RegExp(key, 'gi');
        result = result.replace(regex,
          `<span style="color: ${color}; border-bottom: 2px solid ${color};" title="${key}: ${fmt$(value)}">${label}</span>`
        );
      }
    });
    return result;
  };

  return (
    <div
      className="whitespace-pre-wrap"
      dangerouslySetInnerHTML={{ __html: colorize(formula) }}
    />
  );
}
```

#### 2. Add Tax Accuracy Metric
**File**: `src/lib/projections.js`

Add metric comparing estimated vs actual tax:

```javascript
// In calculateWithdrawals, track accuracy
result = {
  ...existingResult,
  taxEstimateAccuracy: estimatedTax > 0
    ? Math.round((1 - Math.abs(totalTax - estimatedTax) / totalTax) * 100)
    : 100, // If no estimate needed, 100% accurate
  estimatedTax: Math.round(estimatedTax),
  actualTax: Math.round(totalTax),
};
```

#### 3. Update CALCULATIONS to include BOY explanations
**File**: `src/components/CalculationInspector/index.jsx`

Add calculations for BOY balances:

```javascript
atBOY: {
  name: 'After-Tax Beginning of Year',
  concept: 'This is the after-tax account balance at the start of the year. For the first year, this equals your starting after-tax balance from inputs. For subsequent years, it equals the prior year\'s end-of-year after-tax balance.',
  formula: 'BOY = Prior Year EOY',
  compute: (data, params) => ({
    formula: data.yearsFromStart === 0
      ? 'First year: Starting balance from inputs'
      : `BOY ${data.year} = EOY ${data.year - 1}`,
    values: data.yearsFromStart === 0
      ? `Starting AT: ${fK(params.afterTaxStart)}`
      : `Prior EOY: ${fK(data.atBOY)}`,
    result: `After-Tax BOY: ${fK(data.atBOY)}`,
    simple: fK(data.atBOY),
  }),
},
// Similar for iraBOY, rothBOY, totalBOY...
```

### Success Criteria:

#### Automated Verification:
- [ ] Build succeeds: `npm run build`

#### Manual Verification:
- [ ] Click any cell shows unified inspector (no tabs)
- [ ] All sections visible at once: Quick Answer, Concept, Formula, Values
- [ ] Formula shows color-coded variable names matching cell colors
- [ ] Tax accuracy metric visible for tax-related cells

---

## Phase 6: Input Reorganization

### Overview
Move heir parameters, discount rate, and iteration controls to InputPanel. Make them visible and editable.

### Changes Required:

#### 1. Update DEFAULT_PARAMS
**File**: `src/lib/taxTables.js`

Add moved parameters with new defaults:

```javascript
export const DEFAULT_PARAMS = {
  // ... existing params ...

  // Tax calculation options (moved to be visible)
  iterativeTax: true,
  maxIterations: 5,

  // Discount rate (moved from settings)
  discountRate: 0.03,

  // Heir configuration (moved from settings)
  heirs: [
    { name: 'Heir 1', state: 'IL', agi: 200000, splitPercent: 50, taxableRoR: 0.06 },
    { name: 'Heir 2', state: 'IL', agi: 200000, splitPercent: 50, taxableRoR: 0.06 },
  ],
  heirDistributionStrategy: 'even', // 'even' or 'year10'
  heirNormalizationYears: 10, // Years to project forward for comparison

  // Tax year base - default to current year
  taxYear: 2025,
};
```

#### 2. Update InputPanel
**File**: `src/components/InputPanel/index.jsx`

Add new sections:

```jsx
{/* Calculation Options Section */}
<InputSection
  title="Calculation Options"
  icon={Calculator}
  expanded={expanded.includes('calc')}
  onToggle={() => toggle('calc')}
  color="purple"
>
  <div className="space-y-3">
    {/* Iterative Tax Toggle */}
    <div className="flex items-center justify-between">
      <div>
        <div className="text-slate-300 text-sm">Iterative Tax Estimation</div>
        <div className="text-slate-500 text-xs">Refine tax estimate over multiple iterations</div>
      </div>
      <button
        onClick={() => updateParam('iterativeTax', !params.iterativeTax)}
        className={`px-2 py-1 rounded text-xs ${
          params.iterativeTax ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-400'
        }`}
      >
        {params.iterativeTax ? 'ON' : 'OFF'}
      </button>
    </div>

    {/* Max Iterations */}
    {params.iterativeTax && (
      <div>
        <label className="block text-slate-400 text-xs mb-1">Max Iterations</label>
        <div className="flex gap-1">
          {[1, 2, 3, 5, 10].map(n => (
            <button
              key={n}
              onClick={() => updateParam('maxIterations', n)}
              className={`px-2 py-1 rounded text-xs ${
                params.maxIterations === n
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
    )}

    {/* Discount Rate */}
    <ParamInput
      label="Discount Rate (PV)"
      value={params.discountRate}
      onChange={(v) => updateParam('discountRate', v)}
      format="%"
      min={0}
      max={0.15}
      helpText="Used for present value calculations"
    />
  </div>
</InputSection>

{/* Heir Configuration Section */}
<InputSection
  title="Heirs"
  icon={Users}
  expanded={expanded.includes('heir')}
  onToggle={() => toggle('heir')}
  color="indigo"
>
  {/* Full heir configuration UI - moved from Settings */}
  <HeirConfigPanel heirs={params.heirs} onChange={(heirs) => updateParam('heirs', heirs)} />

  {/* Per-Heir Taxable RoR Note */}
  <div className="text-slate-500 text-xs mt-2 p-2 bg-slate-800/50 rounded">
    <strong>Taxable RoR:</strong> Each heir's expected investment return after inheritance.
    Used to normalize heir value to a common future point for fair comparison across
    different tax-advantaged distributions.
  </div>

  {/* Distribution Strategy */}
  <div className="mt-4 pt-3 border-t border-slate-700">
    <label className="block text-slate-400 text-xs mb-2">IRA Distribution Strategy</label>
    <div className="flex gap-2">
      <button
        onClick={() => updateParam('heirDistributionStrategy', 'even')}
        className={`flex-1 px-2 py-1.5 rounded text-xs ${
          params.heirDistributionStrategy === 'even'
            ? 'bg-blue-600 text-white'
            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
        }`}
      >
        Spread Evenly (10yr)
      </button>
      <button
        onClick={() => updateParam('heirDistributionStrategy', 'year10')}
        className={`flex-1 px-2 py-1.5 rounded text-xs ${
          params.heirDistributionStrategy === 'year10'
            ? 'bg-blue-600 text-white'
            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
        }`}
      >
        Lump Sum Year 10
      </button>
    </div>
    <div className="text-slate-500 text-xs mt-2">
      {params.heirDistributionStrategy === 'even'
        ? 'Heirs spread IRA withdrawals evenly, reducing marginal tax rate impact'
        : 'Heirs wait until year 10 for maximum growth, but higher tax bracket hit'}
    </div>
  </div>
</InputSection>
```

#### 3. Update SettingsPanel
**File**: `src/components/SettingsPanel/index.jsx`

Remove heirs section, update SS exemption to 3-way:

```jsx
{/* Trump SS Exemption - 3-way selector */}
<div className="mt-4 p-3 bg-slate-800 rounded border border-slate-700">
  <div className="text-slate-300 text-sm font-medium mb-2">Social Security Tax Exemption</div>
  <div className="text-slate-500 text-xs mb-3">
    Trump's proposal: Exempt Social Security from federal taxation
  </div>
  <div className="flex gap-1">
    {[
      { value: 'disabled', label: 'Disabled' },
      { value: 'through2028', label: 'Through 2028' },
      { value: 'permanent', label: 'Permanent' },
    ].map(option => (
      <button
        key={option.value}
        onClick={() => updateSettings({ ssExemptionMode: option.value })}
        className={`flex-1 px-2 py-1.5 rounded text-xs ${
          settings.ssExemptionMode === option.value
            ? 'bg-emerald-600 text-white'
            : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
        }`}
      >
        {option.label}
      </button>
    ))}
  </div>
</div>
```

#### 4. Update useProjections Hook
**File**: `src/hooks/useProjections.js`

Update DEFAULT_SETTINGS:

```javascript
const DEFAULT_SETTINGS = {
  // User Profile
  primaryName: 'Ira',
  primaryBirthYear: 1955,
  spouseName: 'Carol',
  spouseBirthYear: 1954,

  // Tax Settings
  taxYear: 2025, // Updated default
  ssExemptionMode: 'through2028', // New 3-way: 'disabled' | 'through2028' | 'permanent'

  // Display Preferences
  defaultPV: true,

  // Custom Tax Brackets
  customBrackets: null,

  // NOTE: heirs and discountRate moved to params
};
```

Update projection params merge:

```javascript
const projectionParams = {
  ...params,
  ...options,
  // Compute exemptSSFromTax based on mode and year
  getExemptSSFromTax: (year) => {
    if (settings.ssExemptionMode === 'disabled') return false;
    if (settings.ssExemptionMode === 'permanent') return true;
    return year >= 2025 && year <= 2028; // through2028
  },
  birthYear: settings.primaryBirthYear || params.birthYear,
  customBrackets: settings.customBrackets || null,
  taxYear: settings.taxYear || 2025,
};
```

### Success Criteria:

#### Automated Verification:
- [ ] Build succeeds: `npm run build`

#### Manual Verification:
- [ ] Iterative Tax toggle visible in InputPanel under "Calculation Options"
- [ ] Iteration count selectable: 1, 2, 3, 5, 10
- [ ] Discount rate input visible and editable
- [ ] Heir configuration section visible in InputPanel
- [ ] Distribution strategy toggle (Even vs Lump Sum) visible
- [ ] SS Exemption mode has 3 options in Settings
- [ ] Tax year defaults to 2025

---

## Phase 7: Validation & Smart Inputs

### Overview
Add sanity checking, allow age OR year input for overrides with auto-detection.

### Changes Required:

#### 1. Create Validation Utilities
**File**: `src/lib/validation.js` (new file)

```javascript
export const VALIDATION = {
  year: {
    min: 2024,
    max: 2100,
    validate: (v) => v >= 2024 && v <= 2100,
    message: 'Year must be between 2024 and 2100',
  },
  age: {
    min: 50,
    max: 125,
    validate: (v) => v >= 50 && v <= 125,
    message: 'Age must be between 50 and 125',
  },
  rate: {
    min: 0,
    max: 1,
    validate: (v) => v >= 0 && v <= 1,
    message: 'Rate must be between 0% and 100%',
  },
  balance: {
    min: 0,
    max: 100000000,
    validate: (v) => v >= 0 && v <= 100000000,
    message: 'Balance must be non-negative',
  },
  percent: {
    min: 0,
    max: 100,
    validate: (v) => v >= 0 && v <= 100,
    message: 'Percentage must be 0-100',
  },
};

// Detect if input is age or year
export function detectAgeOrYear(value, birthYear) {
  const num = parseInt(value);
  if (isNaN(num)) return { type: null, value: null };

  // If between 50-125, likely an age
  if (num >= 50 && num <= 125) {
    return { type: 'age', value: birthYear + num };
  }
  // If 2020+, likely a year
  if (num >= 2020 && num <= 2100) {
    return { type: 'year', value: num };
  }
  // Ambiguous - could be either
  return { type: 'ambiguous', value: num };
}

// Convert age to year
export function ageToYear(age, birthYear) {
  return birthYear + age;
}

// Convert year to age
export function yearToAge(year, birthYear) {
  return year - birthYear;
}
```

#### 2. Create SmartYearInput Component
**File**: `src/components/InputPanel/SmartYearInput.jsx` (new file)

```jsx
import React, { useState } from 'react';
import { detectAgeOrYear, yearToAge } from '../../lib/validation';

export function SmartYearInput({
  value, // year value
  onChange,
  birthYear,
  min = 2024,
  max = 2100,
  placeholder = 'Year or Age'
}) {
  const [inputValue, setInputValue] = useState(value?.toString() || '');
  const [mode, setMode] = useState('year'); // 'year' or 'age'

  const handleChange = (e) => {
    const raw = e.target.value;
    setInputValue(raw);

    const detected = detectAgeOrYear(raw, birthYear);
    if (detected.type === 'year') {
      setMode('year');
      onChange(detected.value);
    } else if (detected.type === 'age') {
      setMode('age');
      onChange(detected.value);
    }
  };

  const handleBlur = () => {
    if (value) {
      // Show in current mode
      setInputValue(mode === 'age'
        ? yearToAge(value, birthYear).toString()
        : value.toString()
      );
    }
  };

  const age = value ? yearToAge(value, birthYear) : null;
  const isValid = value && value >= min && value <= max && age <= 125;

  return (
    <div className="relative">
      <input
        type="text"
        value={inputValue}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={`w-full bg-slate-800 border rounded px-2 py-1.5 text-sm text-slate-200
          ${isValid ? 'border-slate-700' : 'border-rose-500'}`}
      />
      {value && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-500">
          {mode === 'age' ? `Age ${age}` : value}
        </div>
      )}
      {!isValid && inputValue && (
        <div className="text-rose-400 text-xs mt-1">
          {age > 125 ? 'Age exceeds 125' : 'Invalid year/age'}
        </div>
      )}
    </div>
  );
}
```

#### 3. Update Override Inputs
**File**: `src/components/InputPanel/index.jsx`

Replace year inputs with SmartYearInput:

```jsx
// In Roth Conversions section
<SmartYearInput
  value={year}
  onChange={(newYear) => handleYearChange(year, newYear)}
  birthYear={settings.primaryBirthYear || 1955}
  min={params.startYear}
  max={params.endYear}
  placeholder="Year or Age"
/>

// In Expense Overrides section - same pattern
```

#### 4. Add Input Validation to ParamInput
**File**: `src/components/InputPanel/index.jsx`

Update ParamInput component:

```jsx
function ParamInput({ label, value, onChange, format, min, max, validate, helpText }) {
  const [error, setError] = useState(null);

  const handleBlur = () => {
    const parsed = parseFloat(localValue.replace(/[,$%]/g, ''));
    if (!isNaN(parsed)) {
      // Apply constraints
      let finalValue = parsed;
      if (min !== undefined) finalValue = Math.max(min, finalValue);
      if (max !== undefined) finalValue = Math.min(max, finalValue);

      // Custom validation
      if (validate && !validate(finalValue)) {
        setError('Invalid value');
        return;
      }

      setError(null);
      onChange(format === '%' ? finalValue : finalValue);
    }
  };

  return (
    <div className="mb-2">
      <label className="block text-slate-400 text-xs mb-0.5">{label}</label>
      <input
        // ... existing props
        className={`... ${error ? 'border-rose-500' : 'border-slate-700'}`}
      />
      {error && <div className="text-rose-400 text-xs mt-0.5">{error}</div>}
      {helpText && !error && <div className="text-slate-500 text-xs mt-0.5">{helpText}</div>}
    </div>
  );
}
```

### Success Criteria:

#### Automated Verification:
- [ ] Build succeeds: `npm run build`

#### Manual Verification:
- [ ] Enter "75" in year override field → auto-detects as age, converts to year
- [ ] Enter "2035" in year override field → recognized as year
- [ ] Age > 125 shows validation error
- [ ] Year < current shows validation error
- [ ] Negative balances show validation error
- [ ] Rates > 100% show validation error

---

## Phase 8: Heir Distribution Analysis

### Overview
Implement 10-year rule modeling with present value calculations for inherited IRA distributions, and allow per-heir taxable rate of return for normalized inheritance value comparison.

### Changes Required:

#### 1. Update Heir Value Calculations
**File**: `src/lib/calculations.js`

Add distribution strategy calculations:

```javascript
/**
 * Calculate heir value with 10-year distribution strategy
 *
 * Traditional IRA: Must distribute over 10 years, taxed as ordinary income
 * Roth IRA: Must distribute over 10 years, but tax-free
 * After-Tax: Step-up in basis, no tax
 *
 * Per-heir taxable RoR enables fair comparison by projecting what
 * each heir's inheritance becomes after N years of investing in
 * their own taxable account. This normalizes across:
 * - Different tax-advantaged distributions (Roth tax-free vs IRA taxed)
 * - Different heir investment strategies
 */
export function calculateHeirValueWithStrategy(
  atBalance,
  iraBalance,
  rothBalance,
  heir,
  strategy = 'even', // 'even' or 'year10'
  discountRate = 0.03,
  normalizationYears = 10
) {
  const rates = calculateHeirTaxRates(heir);
  const splitFraction = (heir.splitPercent || 100) / 100;
  const taxableRoR = heir.taxableRoR || 0.06; // Per-heir taxable return rate

  const heirAt = atBalance * splitFraction;
  const heirIra = iraBalance * splitFraction;
  const heirRoth = rothBalance * splitFraction;

  // After-Tax: Step-up in basis, 100% value received immediately
  // Heir invests in taxable account at their taxable RoR
  const atValue = heirAt;
  const atFV = heirAt * Math.pow(1 + taxableRoR, normalizationYears);
  const atNormalized = atFV / Math.pow(1 + discountRate, normalizationYears);

  // Roth: Tax-free, but must distribute within 10 years
  // Assume heir takes distribution and invests at their taxable RoR
  // For simplicity, assume year 10 distribution for Roth (max growth in tax-free)
  const rothFV = heirRoth * Math.pow(1 + 0.06, 10); // Grows tax-free at IRA rate
  // After distribution, heir invests remaining years at taxable RoR
  const remainingYears = Math.max(0, normalizationYears - 10);
  const rothAfterDistribution = rothFV * Math.pow(1 + taxableRoR, remainingYears);
  const rothNormalized = rothAfterDistribution / Math.pow(1 + discountRate, normalizationYears);

  // Traditional IRA: Depends on strategy
  let iraNormalized;
  let iraDetails;

  if (strategy === 'year10') {
    // Lump sum in year 10 - higher tax bracket hit
    const iraGrowthRate = 0.06; // IRA growth rate
    const iraFV = heirIra * Math.pow(1 + iraGrowthRate, 10);
    // Assume higher effective rate due to bracket creep (add 3-5%)
    const effectiveRate = Math.min(rates.combined + 0.04, 0.50);
    const afterTax = iraFV * (1 - effectiveRate);
    // After distribution, heir invests at their taxable RoR
    const iraAfterDistribution = afterTax * Math.pow(1 + taxableRoR, remainingYears);
    iraNormalized = iraAfterDistribution / Math.pow(1 + discountRate, normalizationYears);
    iraDetails = {
      strategy: 'year10',
      futureValue: iraFV,
      taxRate: effectiveRate,
      afterTax,
      normalized: iraNormalized,
      taxableRoR: taxableRoR,
    };
  } else {
    // Spread evenly over 10 years
    let totalNormalized = 0;
    let remaining = heirIra;
    const distributions = [];
    const iraGrowthRate = 0.06;

    for (let year = 1; year <= 10; year++) {
      remaining = remaining * (1 + iraGrowthRate);
      const distribution = remaining / (10 - year + 1);
      remaining -= distribution;

      // Tax at heir's rate (spreading keeps them in lower brackets)
      const tax = distribution * rates.combined;
      const afterTax = distribution - tax;

      // Heir invests after-tax amount at taxable RoR for remaining years
      const yearsToGrow = normalizationYears - year;
      const fv = afterTax * Math.pow(1 + taxableRoR, yearsToGrow);
      const normalized = fv / Math.pow(1 + discountRate, normalizationYears);

      totalNormalized += normalized;
      distributions.push({ year, distribution, tax, afterTax, normalized });
    }

    iraNormalized = totalNormalized;
    iraDetails = {
      strategy: 'even',
      distributions,
      taxRate: rates.combined,
      normalized: totalNormalized,
      taxableRoR: taxableRoR,
    };
  }

  // Total normalized value - what each account type becomes at horizon
  const totalValue = atNormalized + rothNormalized + iraNormalized;

  return {
    name: heir.name,
    split: splitFraction,
    rates,
    taxableRoR: taxableRoR,
    // Immediate values (what heir receives)
    atValue: Math.round(atValue),
    rothGross: Math.round(heirRoth),
    iraGross: Math.round(heirIra),
    grossInheritance: Math.round(heirAt + heirIra + heirRoth),
    // Normalized values (fair comparison at horizon)
    atNormalized: Math.round(atNormalized),
    rothNormalized: Math.round(rothNormalized),
    iraNormalized: Math.round(iraNormalized),
    netNormalized: Math.round(totalValue),
    iraDetails,
    normalizationYears,
  };
}

/**
 * Calculate multi-heir value with distribution strategy
 */
export function calculateMultiHeirValueWithStrategy(
  atBalance,
  iraBalance,
  rothBalance,
  heirs,
  strategy = 'even',
  discountRate = 0.03,
  normalizationYears = 10
) {
  let totalGross = 0;
  let totalNormalized = 0;
  const heirDetails = [];

  for (const heir of heirs) {
    const result = calculateHeirValueWithStrategy(
      atBalance, iraBalance, rothBalance,
      heir, strategy, discountRate, normalizationYears
    );
    totalGross += result.grossInheritance;
    totalNormalized += result.netNormalized;
    heirDetails.push(result);
  }

  return {
    grossTotal: Math.round(totalGross),
    normalizedTotal: Math.round(totalNormalized),
    details: heirDetails,
    strategy,
    normalizationYears,
  };
}
```

#### 2. Update Projections to Use Strategy
**File**: `src/lib/projections.js`

Update heir value calculation:

```javascript
// In the projection loop
let heirGross, heirNormalized, heirDetails;
if (p.heirs && p.heirs.length > 0) {
  const heirResult = calculateMultiHeirValueWithStrategy(
    atEOY, iraEOY, rothEOY,
    p.heirs,
    p.heirDistributionStrategy || 'even',
    p.discountRate || 0.03,
    p.heirNormalizationYears || 10
  );
  heirGross = heirResult.grossTotal;
  heirNormalized = heirResult.normalizedTotal;
  heirDetails = heirResult.details;
} else {
  // Legacy single-heir calculation
  const legacyValue = calculateHeirValue(atEOY, iraEOY, rothEOY, p.heirFedRate, p.heirStateRate);
  heirGross = atEOY + iraEOY + rothEOY;
  heirNormalized = legacyValue;
  heirDetails = null;
}

// Include both values in result
result = {
  ...result,
  heirGross,
  heirValue: heirNormalized, // Normalized value for comparisons
  heirDetails,
};
```

#### 3. Update HeirAnalysis Display
**File**: `src/components/HeirAnalysis/index.jsx`

Add strategy comparison:

```jsx
{/* Strategy Comparison Card */}
<div className="bg-slate-900 rounded border border-slate-800 p-4 mb-4">
  <div className="text-slate-300 font-medium mb-3">Distribution Strategy Comparison</div>

  <div className="grid grid-cols-2 gap-4">
    {/* Even Strategy */}
    <div className={`p-3 rounded border ${
      params.heirDistributionStrategy === 'even'
        ? 'border-emerald-500 bg-emerald-900/20'
        : 'border-slate-700'
    }`}>
      <div className="text-slate-200 font-medium mb-1">Spread Evenly</div>
      <div className="text-2xl font-bold text-emerald-400">
        {fmt$(evenStrategyValue)}
      </div>
      <div className="text-slate-500 text-xs mt-1">
        Lower tax bracket impact
      </div>
    </div>

    {/* Year 10 Strategy */}
    <div className={`p-3 rounded border ${
      params.heirDistributionStrategy === 'year10'
        ? 'border-blue-500 bg-blue-900/20'
        : 'border-slate-700'
    }`}>
      <div className="text-slate-200 font-medium mb-1">Lump Sum Year 10</div>
      <div className="text-2xl font-bold text-blue-400">
        {fmt$(year10StrategyValue)}
      </div>
      <div className="text-slate-500 text-xs mt-1">
        Maximum growth, higher tax hit
      </div>
    </div>
  </div>

  <div className="mt-3 text-xs text-slate-400">
    Difference: <span className={evenBetter ? 'text-emerald-400' : 'text-rose-400'}>
      {fmt$(Math.abs(evenStrategyValue - year10StrategyValue))}
    </span>
    {' '}in favor of {evenBetter ? 'even distribution' : 'lump sum'}
  </div>
</div>

{/* Per-Heir Breakdown with IRA Details and Taxable RoR */}
{hasMultiHeir && (
  <div className="space-y-3">
    {last.heirDetails.map((heir, idx) => (
      <div key={idx} className="bg-slate-800 rounded p-3">
        {/* Heir Name and Split */}
        <div className="flex justify-between items-center mb-2">
          <span className="text-slate-200 font-medium">{heir.name}</span>
          <span className="text-slate-500 text-xs">
            {fmtPct(heir.split)} split • {fmtPct(heir.taxableRoR)} taxable RoR
          </span>
        </div>

        {/* Gross vs Normalized Values */}
        <div className="grid grid-cols-2 gap-4 mb-2">
          <div>
            <div className="text-xs text-slate-500">Gross Inheritance</div>
            <div className="text-lg font-bold text-slate-300">{fmt$(heir.grossInheritance)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">
              Normalized ({heir.normalizationYears}yr @ {fmtPct(heir.taxableRoR)})
            </div>
            <div className="text-lg font-bold text-emerald-400">{fmt$(heir.netNormalized)}</div>
          </div>
        </div>

        {/* Account Breakdown */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div>
            <span className="text-slate-500">AT: </span>
            <span className="text-slate-300">{fmt$(heir.atNormalized)}</span>
          </div>
          <div>
            <span className="text-slate-500">Roth: </span>
            <span className="text-slate-300">{fmt$(heir.rothNormalized)}</span>
          </div>
          <div>
            <span className="text-slate-500">IRA: </span>
            <span className="text-slate-300">{fmt$(heir.iraNormalized)}</span>
          </div>
        </div>

        {/* IRA Distribution Details */}
        {heir.iraDetails && (
          <div className="mt-2 pt-2 border-t border-slate-700">
            <div className="text-xs text-slate-400 mb-1">
              IRA Distribution ({heir.iraDetails.strategy === 'even' ? '10-year spread' : 'Year 10 lump sum'})
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <span className="text-slate-500">Gross IRA: </span>
                <span className="text-slate-300">{fmt$(heir.iraGross)}</span>
              </div>
              <div>
                <span className="text-slate-500">Tax Rate: </span>
                <span className="text-rose-400">{fmtPct(heir.iraDetails.taxRate || heir.rates.combined)}</span>
              </div>
              <div>
                <span className="text-slate-500">Net Normalized: </span>
                <span className="text-emerald-400">{fmt$(heir.iraNormalized)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    ))}
  </div>
)}
```

### Success Criteria:

#### Automated Verification:
- [ ] Build succeeds: `npm run build`

#### Manual Verification:
- [ ] Distribution strategy toggle appears in InputPanel
- [ ] HeirAnalysis shows strategy comparison with both values
- [ ] "Even" strategy typically shows higher value (lower effective tax)
- [ ] Per-heir breakdown shows IRA distribution details
- [ ] Changing strategy updates heir values across all views
- [ ] Per-heir taxable RoR input visible in heir configuration
- [ ] Normalized values update when heir RoR changes
- [ ] Both gross inheritance and normalized values displayed
- [ ] Normalization horizon (years) configurable

---

## Phase 9: Scenario UX Improvements

### Overview
Improve scenario creation workflow: remove "+ " prefix from custom scenario button, add naming dialog when selecting custom scenario.

### Changes Required:

#### 1. Update ScenarioComparison Component
**File**: `src/components/ScenarioComparison/index.jsx`

Remove "+ " prefix from custom scenario option:

```jsx
// In scenario type dropdown options
const SCENARIO_OPTIONS = [
  { value: 'current', label: 'Current' },
  { value: 'noRoth', label: 'No Roth Conversions' },
  { value: 'maxRoth', label: 'Max Roth Conversion' },
  { value: 'delayRMD', label: 'Delay RMD' },
  { value: 'earlyHarvest', label: 'Early Harvest' },
  { value: 'custom', label: 'Custom Scenario' },  // Removed "+ " prefix
];
```

#### 2. Add ScenarioNameModal Component
**File**: `src/components/ScenarioComparison/ScenarioNameModal.jsx` (new file)

```jsx
import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export function ScenarioNameModal({ defaultName, onConfirm, onCancel }) {
  const [name, setName] = useState(defaultName);
  const inputRef = useRef(null);

  // Focus and select input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm(name.trim() || defaultName);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      onClick={onCancel}
      onKeyDown={handleKeyDown}
    >
      <div
        className="bg-slate-900 rounded-lg border border-slate-700 w-80 p-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-slate-200">Name Your Scenario</h3>
          <button onClick={onCancel} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Scenario name"
            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-200
                       focus:border-blue-500 focus:outline-none mb-4"
            maxLength={40}
          />

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1.5 text-sm text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-500"
            >
              Create Scenario
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

#### 3. Update Scenario Add Flow
**File**: `src/components/ScenarioComparison/index.jsx`

Add modal state and generation logic for default names:

```jsx
import { ScenarioNameModal } from './ScenarioNameModal';

// State for naming modal
const [namingScenario, setNamingScenario] = useState(null);
// { type: 'custom', baseType: 'custom' }

// Generate reasonable default name
const getDefaultScenarioName = (type) => {
  const existingNames = scenarios.map(s => s.name);
  let baseName;

  switch (type) {
    case 'noRoth':
      baseName = 'No Roth';
      break;
    case 'maxRoth':
      baseName = 'Max Roth';
      break;
    case 'delayRMD':
      baseName = 'Delay RMD';
      break;
    case 'earlyHarvest':
      baseName = 'Early Harvest';
      break;
    case 'custom':
    default:
      baseName = 'Custom';
  }

  // Add number suffix if name already exists
  if (!existingNames.includes(baseName)) {
    return baseName;
  }

  let counter = 2;
  while (existingNames.includes(`${baseName} ${counter}`)) {
    counter++;
  }
  return `${baseName} ${counter}`;
};

// Handle scenario type selection
const handleAddScenario = (type) => {
  if (type === 'custom') {
    // Show naming dialog for custom scenarios
    setNamingScenario({
      type: 'custom',
      defaultName: getDefaultScenarioName('custom'),
    });
  } else {
    // For preset types, use default name and create immediately
    const name = getDefaultScenarioName(type);
    createScenario(type, name);
  }
};

// Create the scenario with given name
const createScenario = (type, name) => {
  const newScenario = {
    id: Date.now(),
    name,
    type,
    params: type === 'custom'
      ? { ...params }
      : getPresetParams(type, params),
  };
  setScenarios([...scenarios, newScenario]);
  setNamingScenario(null);
};

// In the render:
{namingScenario && (
  <ScenarioNameModal
    defaultName={namingScenario.defaultName}
    onConfirm={(name) => createScenario(namingScenario.type, name)}
    onCancel={() => setNamingScenario(null)}
  />
)}
```

#### 4. Update Dropdown Trigger
**File**: `src/components/ScenarioComparison/index.jsx`

Update the add scenario dropdown to use new handler:

```jsx
// In the dropdown menu
{SCENARIO_OPTIONS.map(option => (
  <button
    key={option.value}
    onClick={() => handleAddScenario(option.value)}
    className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-700"
  >
    {option.label}
  </button>
))}
```

### Success Criteria:

#### Automated Verification:
- [ ] Build succeeds: `npm run build`

#### Manual Verification:
- [ ] Dropdown shows "Custom Scenario" without "+ " prefix
- [ ] Selecting "Custom Scenario" opens naming dialog
- [ ] Dialog shows reasonable default name ("Custom", "Custom 2", etc.)
- [ ] Enter key submits the name
- [ ] Escape key cancels the dialog
- [ ] Input is focused and selected on dialog open
- [ ] Created scenario appears with user-provided name
- [ ] Preset scenarios (No Roth, Max Roth, etc.) still create immediately

---

## Testing Strategy

### Unit Tests:
- [ ] `calculateHeirValueWithStrategy` returns correct values for both strategies
- [ ] `calculateHeirValueWithStrategy` respects per-heir taxable RoR
- [ ] Normalized values differ when heirs have different taxable RoR
- [ ] `detectAgeOrYear` correctly identifies age vs year inputs
- [ ] `getDefaultScenarioName` generates unique names with numeric suffixes
- [ ] Validation functions reject invalid inputs

### Integration Tests:
- [ ] PV toggle state persists across tab navigation
- [ ] Heir parameters save/load correctly in scenarios
- [ ] SS exemption mode applies correctly per year

### Manual Testing Steps:
1. Toggle PV in toolbar, verify all views update
2. Hover over `totalTax` cell, verify component cells highlight with orange rings
3. Hover over `totalEOY` cell, verify BOY cells highlight with blue rings
4. Click any cell, verify unified inspector appears (no tabs)
5. Enter "75" in Roth conversion year, verify converts to correct year
6. Enter invalid age (130), verify error message appears
7. Change heir distribution strategy, verify heir values update
8. Set SS exemption to "Through 2028", verify 2029+ years tax SS
9. Change heir's taxable RoR, verify normalized values update
10. Select rows and create custom chart, verify correct metrics plotted
11. Click "Custom Scenario", verify naming dialog appears
12. Enter scenario name and confirm, verify scenario created with given name

---

## Performance Considerations

- Cell highlighting uses React state, may need optimization for large tables (consider useMemo for dependency lookups)
- Global PV toggle triggers re-render of all views - ensure memoization where possible
- Heir distribution calculations add iteration loop - cache results where feasible

---

## Migration Notes

- Existing saved states may have heirs in settings - add migration logic to move to params
- SS exemption boolean needs migration to new mode string
- Tax year change from 2024 to 2025 may affect existing projections

---

## References

- SECURE Act 10-year rule: https://www.irs.gov/publications/p590b
- Present value formulas: FPA Journal SEP24
- Okabe-Ito colorblind-safe palette: https://siegal.bio.nyu.edu/color-palette/
- Original enhancement request: User session 2025-12-28
