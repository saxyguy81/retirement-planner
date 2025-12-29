# Enhanced Analysis Features Implementation Plan

> **STATUS: 100% COMPLETE** - Updated 2025-12-28
>
> **DONE:**
> - Phase 1: YearSelector with drag support, presets, custom mode
> - Phase 2: CalculationInspector with formula breakdown (unified view with 4 modes)
> - Phase 3: SplitPanel layout for side-by-side views
> - Phase 4: Dashboard with widget-based layout and summary cards
> - Phase 5: ScenarioComparison with multiple view modes and ScenarioNameModal
> - Phase 6: Additional visualizations (Tax Bracket Waterfall, Roth Analysis, Portfolio Composition, Effective Tax Rate)
> - Dashboard drag-and-drop widget reordering (handleDragStart, handleDrop, visual feedback)
> - Full diff view with color-coded changes (DiffTable with emerald/rose highlighting)

## Overview

This plan adds comprehensive analysis and visualization features to the retirement planner:
1. **Split Panel Layout** - View multiple analyses side-by-side
2. **Calculation Transparency** - Show formulas, concepts, and step-by-step breakdowns
3. **Policy Comparison** - Side-by-side scenario comparison with diff highlighting
4. **Configurable Dashboard** - Add/remove/arrange tables and charts
5. **Enhanced Year Selection** - Interactive year range picker with drag support
6. **Additional Visualizations** - New chart types for deeper analysis

## Current State Analysis

### Existing Features:
- **Tabs**: Projections, Charts, Risk Allocation, Heir Analysis, Scenarios, Optimize
- **ChartsView**: Already supports add/remove charts (6 chart types)
- **ScenarioComparison**: Compare scenarios with summary metrics
- **ProjectionsTable**: Year modes (brief/moderate/detailed/all)
- **Calculations**: Full tax model in `src/lib/calculations.js`

### Key Discoveries:
- ChartsView (`src/components/ChartsView/index.jsx:27`) uses `activeCharts` state for toggling
- ProjectionsTable (`src/components/ProjectionsTable/index.jsx:151-173`) has year filtering logic
- ScenarioComparison (`src/components/ScenarioComparison/index.jsx:73-81`) generates projections per scenario
- Collapsible sections already exist in ProjectionsTable and InputPanel

## Desired End State

After implementation:
1. User can split the main content area horizontally or vertically to view multiple tabs simultaneously
2. Clicking any calculation value opens a "Calculation Inspector" showing the formula breakdown
3. Enhanced Scenarios tab allows side-by-side projection table comparison
4. Dashboard mode allows arranging widgets (tables, charts) in a customizable grid
5. Year selection includes drag-to-expand, click-to-add individual years, and preset ranges
6. 10+ chart types available for selection

## What We're NOT Doing

- Monte Carlo simulation (future enhancement)
- Real-time collaboration features
- Mobile-responsive redesign (desktop-first)
- External data integrations
- Undo/redo system

---

## Phase 1: Enhanced Year Selection

### Overview
Upgrade the year display system with interactive controls, custom ranges, and drag-to-expand.

### Changes Required:

#### 1. Create YearSelector Component
**File**: `src/components/YearSelector/index.jsx` (new)

```jsx
/**
 * YearSelector - Interactive year range picker
 * Features:
 * - Preset modes (brief, moderate, detailed, all)
 * - Visual timeline with clickable years
 * - Drag to expand ranges
 * - Custom year selection with multi-select
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Grid } from 'lucide-react';

// Preset configurations
const PRESETS = {
  brief: { label: 'Brief', description: 'Years 1-2, final year' },
  moderate: { label: 'Moderate', description: 'Years 1-3, then 10, 20, 30' },
  detailed: { label: 'Detailed', description: 'Every 5th year' },
  all: { label: 'All Years', description: 'Complete timeline' },
  custom: { label: 'Custom', description: 'Select specific years' },
};

export function YearSelector({
  years,           // Array of all available years
  selectedYears,   // Currently selected years
  onChange,        // Callback when selection changes
  mode,            // Current mode
  onModeChange     // Callback when mode changes
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [showCustomPicker, setShowCustomPicker] = useState(false);

  // Generate years based on mode
  const getYearsForMode = useCallback((m) => {
    if (m === 'all') return years;
    if (m === 'brief') return [years[0], years[1], years[years.length - 1]];
    if (m === 'moderate') {
      const result = [years[0], years[1], years[2]];
      const idx10 = years.findIndex(y => y >= years[0] + 10);
      const idx20 = years.findIndex(y => y >= years[0] + 20);
      const idx30 = years.findIndex(y => y >= years[0] + 30);
      if (idx10 >= 0) result.push(years[idx10]);
      if (idx20 >= 0) result.push(years[idx20]);
      if (idx30 >= 0) result.push(years[idx30]);
      if (!result.includes(years[years.length - 1])) result.push(years[years.length - 1]);
      return [...new Set(result)];
    }
    if (m === 'detailed') {
      return years.filter((_, i) => i < 5 || i % 5 === 0 || i === years.length - 1);
    }
    return selectedYears; // custom
  }, [years, selectedYears]);

  // Handle year click (toggle in custom mode, or expand range)
  const handleYearClick = (year) => {
    if (mode !== 'custom') {
      onModeChange('custom');
      onChange([...selectedYears, year].sort((a, b) => a - b));
    } else {
      const newSelection = selectedYears.includes(year)
        ? selectedYears.filter(y => y !== year)
        : [...selectedYears, year].sort((a, b) => a - b);
      onChange(newSelection);
    }
  };

  // Handle drag to select range
  const handleDragStart = (year) => {
    setIsDragging(true);
    setDragStart(year);
  };

  const handleDragEnter = (year) => {
    if (!isDragging || !dragStart) return;
    const start = Math.min(dragStart, year);
    const end = Math.max(dragStart, year);
    const rangeYears = years.filter(y => y >= start && y <= end);
    onChange([...new Set([...selectedYears, ...rangeYears])].sort((a, b) => a - b));
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDragStart(null);
  };

  // Render mini timeline
  return (
    <div className="flex items-center gap-2">
      {/* Mode selector */}
      <select
        value={mode}
        onChange={(e) => {
          onModeChange(e.target.value);
          onChange(getYearsForMode(e.target.value));
        }}
        className="bg-slate-800 rounded px-2 py-1 text-xs border border-slate-700"
      >
        {Object.entries(PRESETS).map(([key, { label }]) => (
          <option key={key} value={key}>{label}</option>
        ))}
      </select>

      {/* Visual timeline (for custom mode) */}
      {mode === 'custom' && (
        <div className="flex items-center gap-px" onMouseUp={handleDragEnd} onMouseLeave={handleDragEnd}>
          {years.map(year => (
            <button
              key={year}
              className={`w-2 h-4 rounded-sm transition-colors ${
                selectedYears.includes(year)
                  ? 'bg-blue-500'
                  : 'bg-slate-700 hover:bg-slate-600'
              }`}
              onMouseDown={() => handleDragStart(year)}
              onMouseEnter={() => handleDragEnter(year)}
              onClick={() => handleYearClick(year)}
              title={year.toString()}
            />
          ))}
        </div>
      )}

      {/* Year count indicator */}
      <span className="text-slate-400 text-xs">
        {selectedYears.length} years
      </span>
    </div>
  );
}
```

#### 2. Update ProjectionsTable
**File**: `src/components/ProjectionsTable/index.jsx`
**Changes**: Replace dropdown with YearSelector component

```jsx
// Import new component
import { YearSelector } from '../YearSelector';

// Update state and toolbar section (around line 133)
const [yearMode, setYearMode] = useState('moderate');
const [customYears, setCustomYears] = useState([]);

// Add handler for year selection
const handleYearChange = (newYears) => {
  setCustomYears(newYears);
};

// Update getDisplayYears to use customYears when in custom mode
const getDisplayYears = () => {
  if (yearMode === 'custom' && customYears.length > 0) {
    return customYears;
  }
  // ... existing logic for other modes
};

// In toolbar, replace <select> with:
<YearSelector
  years={allYears}
  selectedYears={yearMode === 'custom' ? customYears : displayYears}
  onChange={handleYearChange}
  mode={yearMode}
  onModeChange={setYearMode}
/>
```

### Success Criteria:

#### Automated Verification:
- [ ] Build passes: `npm run build`
- [ ] No TypeScript/ESLint errors
- [ ] Component renders without console errors

#### Manual Verification:
- [ ] Brief mode shows first 2 years + final year
- [ ] Moderate mode shows years 1-3, then +10, +20, +30, final
- [ ] Dragging on timeline selects year ranges
- [ ] Clicking individual years toggles them in custom mode
- [ ] Year count updates correctly

---

## Phase 2: Calculation Transparency / Inspector

### Overview
Add a "Calculation Inspector" that shows formula breakdowns when clicking on any value.

### Changes Required:

#### 1. Create CalculationInspector Component
**File**: `src/components/CalculationInspector/index.jsx` (new)

```jsx
/**
 * CalculationInspector - Shows calculation breakdown
 *
 * Three views:
 * 1. Conceptual - What the calculation represents
 * 2. Formula - Mathematical notation with symbols
 * 3. Values - Formula with actual numbers substituted
 * 4. Back-of-envelope - Simplified mental-math version
 */

import React, { useState } from 'react';
import { X, BookOpen, Calculator, Hash, Lightbulb } from 'lucide-react';
import { fmt$ } from '../../lib/formatters';

// Calculation definitions - maps field keys to explanations
const CALCULATIONS = {
  federalTax: {
    name: 'Federal Income Tax',
    concept: 'Progressive tax on ordinary income after deductions. Income is taxed at increasing rates as it fills each bracket.',
    formula: 'Tax = Σ (Income_in_bracket × Bracket_rate)',
    formulaExpanded: 'Tax = (Income₁ × 10%) + (Income₂ × 12%) + (Income₃ × 22%) + ...',
    backOfEnvelope: '≈ Taxable Income × 22% (for most retirees in 22% bracket)',
    inputs: ['taxableOrdinary', 'standardDeduction'],
    compute: (data) => {
      const { taxableOrdinary, federalTax } = data;
      return {
        formula: `Tax = calculateFederalTax($${(taxableOrdinary/1000).toFixed(0)}K)`,
        values: `Tax = $${(federalTax/1000).toFixed(1)}K`,
        simple: `≈ $${(taxableOrdinary/1000).toFixed(0)}K × 22% ≈ $${(taxableOrdinary * 0.22 / 1000).toFixed(0)}K`
      };
    }
  },

  heirValue: {
    name: 'After-Tax Heir Value',
    concept: 'What heirs receive after taxes. After-tax accounts get step-up basis (no tax), Roth is tax-free, IRA is taxed at heir rate.',
    formula: 'Heir = AT + Roth + IRA × (1 - heir_tax_rate)',
    backOfEnvelope: '≈ Portfolio × 0.8 (if mostly IRA with 37% heir rate) or Portfolio × 0.95 (if mostly Roth)',
    inputs: ['atEOY', 'iraEOY', 'rothEOY', 'heirFedRate', 'heirStateRate'],
    compute: (data, params) => {
      const { atEOY, iraEOY, rothEOY, heirValue } = data;
      const rate = (params.heirFedRate + params.heirStateRate);
      return {
        formula: `Heir = AT + Roth + IRA × (1 - ${(rate * 100).toFixed(0)}%)`,
        values: `Heir = $${fmt$(atEOY)} + $${fmt$(rothEOY)} + $${fmt$(iraEOY)} × ${(1 - rate).toFixed(2)}`,
        result: `Heir = $${fmt$(heirValue)}`,
        simple: `≈ $${fmt$(atEOY + rothEOY + iraEOY)} × 0.${Math.round((1 - rate * iraEOY / (atEOY + iraEOY + rothEOY)) * 100)}`
      };
    }
  },

  taxableSS: {
    name: 'Taxable Social Security',
    concept: 'Up to 85% of SS may be taxable, based on "combined income" (AGI + half of SS).',
    formula: 'Combined = AGI + 0.5 × SS\nIf Combined > Tier2: Taxable = min(85% × SS, ...)\nElse if Combined > Tier1: Taxable = min(50% × SS, ...)',
    backOfEnvelope: '≈ 85% × SS (for most retirees with significant other income)',
    inputs: ['ssAnnual', 'ordinaryIncome'],
    compute: (data) => {
      const { ssAnnual, taxableSS, ordinaryIncome } = data;
      const combined = ordinaryIncome + 0.5 * ssAnnual;
      const pct = ssAnnual > 0 ? (taxableSS / ssAnnual * 100).toFixed(0) : 0;
      return {
        formula: `Combined = $${fmt$(ordinaryIncome)} + 0.5 × $${fmt$(ssAnnual)}`,
        values: `Combined = $${fmt$(combined)}`,
        result: `Taxable SS = $${fmt$(taxableSS)} (${pct}% of SS)`,
        simple: `≈ 85% × $${fmt$(ssAnnual)} = $${fmt$(ssAnnual * 0.85)}`
      };
    }
  },

  irmaaTotal: {
    name: 'IRMAA Medicare Surcharge',
    concept: 'Income-based premium increase for Medicare Parts B & D. Based on MAGI from 2 years prior.',
    formula: 'IRMAA = (PartB_surcharge + PartD_surcharge) × 12 × num_people',
    backOfEnvelope: '≈ $0 if MAGI < $206K, else $2K-$12K/year depending on income tier',
    inputs: ['irmaaMAGI', 'irmaaPartB', 'irmaaPartD'],
    compute: (data) => {
      const { irmaaMAGI, irmaaPartB, irmaaPartD, irmaaTotal } = data;
      return {
        formula: `IRMAA = (PartB + PartD) × 12 × 2 people`,
        values: `IRMAA = ($${(irmaaPartB/24).toFixed(0)}/mo + $${(irmaaPartD/24).toFixed(0)}/mo) × 12 × 2`,
        result: `IRMAA = $${fmt$(irmaaTotal)}/year`,
        simple: irmaaTotal === 0
          ? `$0 (MAGI $${fmt$(irmaaMAGI)} below threshold)`
          : `≈ $${(irmaaTotal/1000).toFixed(0)}K/year`
      };
    }
  },

  totalWithdrawal: {
    name: 'Total Withdrawal Needed',
    concept: 'Cash needed from accounts = Expenses + Taxes + IRMAA - Social Security',
    formula: 'Withdrawal = Expenses + Taxes + IRMAA - SS',
    backOfEnvelope: '≈ Expenses × 1.2 (assuming 20% goes to taxes)',
    inputs: ['expenses', 'totalTax', 'irmaaTotal', 'ssAnnual'],
    compute: (data) => {
      const { expenses, totalTax, irmaaTotal, ssAnnual, totalWithdrawal } = data;
      return {
        formula: `Need = Expenses + Tax + IRMAA - SS`,
        values: `Need = $${fmt$(expenses)} + $${fmt$(totalTax)} + $${fmt$(irmaaTotal)} - $${fmt$(ssAnnual)}`,
        result: `Withdrawal = $${fmt$(totalWithdrawal)}`,
        simple: `≈ $${fmt$(expenses)} × 1.${Math.round((totalWithdrawal/expenses - 1) * 100) || 20}`
      };
    }
  },

  rothConversion: {
    name: 'Roth Conversion',
    concept: 'Transfer from Traditional IRA to Roth. Taxed as ordinary income now, but grows tax-free. Strategic to fill lower brackets.',
    formula: 'Tax_cost = Conversion × marginal_rate\nFuture_savings = Conversion × heir_rate (if inherited) or future_rate',
    backOfEnvelope: '≈ Converting $100K costs ~$22K in taxes (22% bracket) but saves heirs ~$42K (at 37% + 5% rates)',
    inputs: [],
    compute: (data, params) => {
      const { rothConversion } = data;
      const heirRate = params.heirFedRate + params.heirStateRate;
      return {
        formula: `Conversion Tax = $${fmt$(rothConversion)} × marginal_rate`,
        values: `Tax now ≈ $${fmt$(rothConversion * 0.22)} (at 22%)`,
        result: `Heir savings = $${fmt$(rothConversion * heirRate)} (at ${(heirRate*100).toFixed(0)}%)`,
        simple: rothConversion > 0
          ? `$${(rothConversion/1000).toFixed(0)}K conversion → ~$${(rothConversion * 0.22 / 1000).toFixed(0)}K tax`
          : 'No conversion this year'
      };
    }
  }
};

export function CalculationInspector({ field, data, params, onClose }) {
  const [view, setView] = useState('concept');

  const calc = CALCULATIONS[field];
  if (!calc) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-slate-800 rounded-lg p-4 max-w-md">
          <div className="flex justify-between items-center mb-3">
            <span className="font-medium">Unknown Calculation</span>
            <button onClick={onClose}><X className="w-4 h-4" /></button>
          </div>
          <p className="text-slate-400 text-sm">No explanation available for: {field}</p>
        </div>
      </div>
    );
  }

  const computed = calc.compute(data, params);

  const views = [
    { id: 'concept', icon: BookOpen, label: 'Concept' },
    { id: 'formula', icon: Calculator, label: 'Formula' },
    { id: 'values', icon: Hash, label: 'Values' },
    { id: 'simple', icon: Lightbulb, label: 'Simple' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-slate-800 rounded-lg p-4 max-w-lg w-full mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <span className="font-medium text-blue-400">{calc.name}</span>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* View tabs */}
        <div className="flex gap-1 mb-4 bg-slate-900 rounded p-1">
          {views.map(v => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-xs ${
                view === v.id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <v.icon className="w-3 h-3" />
              {v.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="bg-slate-900 rounded p-3 min-h-[120px]">
          {view === 'concept' && (
            <p className="text-slate-300 text-sm leading-relaxed">{calc.concept}</p>
          )}

          {view === 'formula' && (
            <pre className="text-emerald-400 font-mono text-sm whitespace-pre-wrap">{calc.formula}</pre>
          )}

          {view === 'values' && (
            <div className="space-y-2 font-mono text-sm">
              <div className="text-slate-400">{computed.formula}</div>
              <div className="text-amber-400">{computed.values}</div>
              <div className="text-emerald-400 font-medium">{computed.result}</div>
            </div>
          )}

          {view === 'simple' && (
            <div className="text-xl font-mono text-blue-400">{computed.simple}</div>
          )}
        </div>

        {/* Back of envelope summary */}
        <div className="mt-3 p-2 bg-slate-900/50 rounded border border-slate-700">
          <div className="text-xs text-slate-500 mb-1">Quick Mental Math:</div>
          <div className="text-sm text-slate-300">{calc.backOfEnvelope}</div>
        </div>
      </div>
    </div>
  );
}
```

#### 2. Update ProjectionsTable to Support Clicking Values
**File**: `src/components/ProjectionsTable/index.jsx`
**Changes**: Add click handler to cells, pass to CalculationInspector

```jsx
// Add imports
import { CalculationInspector } from '../CalculationInspector';

// Add state for inspector
const [inspecting, setInspecting] = useState(null); // { field, year, data }

// In the table cell rendering, add click handler:
<td
  key={d.year}
  className={`text-right py-1 px-2 tabular-nums cursor-pointer hover:bg-slate-800 ${...}`}
  onClick={() => setInspecting({ field: row.key, year: d.year, data: d })}
>
  {formatValue(d[row.key], row.format)}
</td>

// Add inspector modal at end of component:
{inspecting && (
  <CalculationInspector
    field={inspecting.field}
    data={inspecting.data}
    params={params}
    onClose={() => setInspecting(null)}
  />
)}
```

### Success Criteria:

#### Automated Verification:
- [ ] Build passes: `npm run build`
- [ ] CalculationInspector component renders without errors

#### Manual Verification:
- [ ] Clicking a value in ProjectionsTable opens the inspector
- [ ] Concept view explains what the calculation means
- [ ] Formula view shows mathematical notation
- [ ] Values view shows actual numbers substituted
- [ ] Simple view shows back-of-envelope approximation
- [ ] Clicking outside or X closes the inspector

---

## Phase 3: Split Panel Layout

### Overview
Allow viewing multiple tabs/analyses side-by-side with resizable split panels.

### Changes Required:

#### 1. Create SplitPanel Component
**File**: `src/components/SplitPanel/index.jsx` (new)

```jsx
/**
 * SplitPanel - Resizable split view for comparing analyses
 */

import React, { useState, useRef, useCallback } from 'react';
import { Columns, Rows, Maximize2, X } from 'lucide-react';

export function SplitPanel({
  children,           // Array of panel contents [left/top, right/bottom]
  direction = 'horizontal', // 'horizontal' or 'vertical'
  defaultRatio = 0.5,
  minSize = 200,
  onClose,
}) {
  const [ratio, setRatio] = useState(defaultRatio);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef(null);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isResizing || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    let newRatio;

    if (direction === 'horizontal') {
      newRatio = (e.clientX - rect.left) / rect.width;
    } else {
      newRatio = (e.clientY - rect.top) / rect.height;
    }

    // Clamp to min/max
    const minRatio = minSize / (direction === 'horizontal' ? rect.width : rect.height);
    newRatio = Math.max(minRatio, Math.min(1 - minRatio, newRatio));

    setRatio(newRatio);
  }, [isResizing, direction, minSize]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  React.useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  const isHorizontal = direction === 'horizontal';

  return (
    <div
      ref={containerRef}
      className={`flex-1 flex ${isHorizontal ? 'flex-row' : 'flex-col'} overflow-hidden`}
    >
      {/* First panel */}
      <div
        className="overflow-hidden"
        style={{
          [isHorizontal ? 'width' : 'height']: `${ratio * 100}%`,
          minWidth: isHorizontal ? minSize : undefined,
          minHeight: !isHorizontal ? minSize : undefined,
        }}
      >
        {children[0]}
      </div>

      {/* Resize handle */}
      <div
        className={`${isHorizontal ? 'w-1 cursor-col-resize' : 'h-1 cursor-row-resize'}
          bg-slate-700 hover:bg-blue-500 transition-colors flex-shrink-0
          ${isResizing ? 'bg-blue-500' : ''}`}
        onMouseDown={handleMouseDown}
      />

      {/* Second panel */}
      <div
        className="overflow-hidden flex-1"
        style={{
          minWidth: isHorizontal ? minSize : undefined,
          minHeight: !isHorizontal ? minSize : undefined,
        }}
      >
        <div className="h-full flex flex-col">
          {/* Panel header with close button */}
          <div className="h-6 bg-slate-800 flex items-center justify-end px-2 shrink-0">
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white"
              title="Close split view"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            {children[1]}
          </div>
        </div>
      </div>
    </div>
  );
}
```

#### 2. Update App.jsx for Split View Mode
**File**: `src/App.jsx`
**Changes**: Add split view state and toggle

```jsx
// Add to state
const [splitView, setSplitView] = useState(null); // { secondTab: 'charts', direction: 'horizontal' }

// Add to header buttons
<button
  onClick={() => setSplitView(splitView ? null : { secondTab: 'charts', direction: 'horizontal' })}
  className={`px-2 py-1 rounded text-xs flex items-center gap-1 ${
    splitView ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'
  }`}
>
  <Columns className="w-3 h-3" />
  Split
</button>

// Wrap main content area:
{splitView ? (
  <SplitPanel
    direction={splitView.direction}
    onClose={() => setSplitView(null)}
  >
    {/* Primary tab content */}
    {renderTabContent(activeTab)}
    {/* Secondary tab content */}
    <div className="flex flex-col h-full">
      <div className="h-9 bg-slate-900 border-b border-slate-700 flex items-center px-2">
        <select
          value={splitView.secondTab}
          onChange={(e) => setSplitView({ ...splitView, secondTab: e.target.value })}
          className="bg-slate-800 text-xs rounded px-2 py-1"
        >
          {TABS.filter(t => t.id !== activeTab).map(t => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>
      </div>
      <div className="flex-1 overflow-hidden">
        {renderTabContent(splitView.secondTab)}
      </div>
    </div>
  </SplitPanel>
) : (
  renderTabContent(activeTab)
)}
```

### Success Criteria:

#### Automated Verification:
- [ ] Build passes: `npm run build`

#### Manual Verification:
- [ ] Split button toggles split view mode
- [ ] Dragging the divider resizes panels
- [ ] Second panel has tab selector dropdown
- [ ] X button closes split view
- [ ] Both panels scroll independently

---

## Phase 4: Configurable Dashboard

### Overview
Allow users to create custom dashboard layouts with drag-and-drop widgets.

### Changes Required:

#### 1. Create Dashboard Component
**File**: `src/components/Dashboard/index.jsx` (new)

Widgets include:
- Mini projection table (configurable columns)
- Any chart type
- Summary cards
- Comparison widgets

```jsx
/**
 * Dashboard - Customizable widget grid
 */

import React, { useState } from 'react';
import { Plus, X, Move, Settings } from 'lucide-react';

const WIDGET_TYPES = [
  { id: 'summary-cards', name: 'Summary Cards', defaultSize: { w: 2, h: 1 } },
  { id: 'chart-balances', name: 'Balance Chart', defaultSize: { w: 2, h: 2 } },
  { id: 'chart-taxes', name: 'Tax Chart', defaultSize: { w: 2, h: 2 } },
  { id: 'chart-heir', name: 'Heir Value Chart', defaultSize: { w: 2, h: 2 } },
  { id: 'mini-table', name: 'Mini Projections', defaultSize: { w: 3, h: 2 } },
  { id: 'scenario-compare', name: 'Scenario Compare', defaultSize: { w: 2, h: 2 } },
  { id: 'roth-analysis', name: 'Roth Analysis', defaultSize: { w: 2, h: 1 } },
  { id: 'tax-bracket', name: 'Tax Bracket Visual', defaultSize: { w: 2, h: 2 } },
];

export function Dashboard({ projections, summary, params }) {
  const [widgets, setWidgets] = useState([
    { id: 1, type: 'summary-cards', x: 0, y: 0, w: 2, h: 1 },
    { id: 2, type: 'chart-balances', x: 2, y: 0, w: 2, h: 2 },
    { id: 3, type: 'chart-taxes', x: 0, y: 1, w: 2, h: 2 },
  ]);
  const [showAddWidget, setShowAddWidget] = useState(false);
  const [editingWidget, setEditingWidget] = useState(null);

  const addWidget = (type) => {
    const widgetType = WIDGET_TYPES.find(w => w.id === type);
    setWidgets([...widgets, {
      id: Date.now(),
      type,
      x: 0,
      y: Math.max(...widgets.map(w => w.y + w.h), 0),
      ...widgetType.defaultSize,
    }]);
    setShowAddWidget(false);
  };

  const removeWidget = (id) => {
    setWidgets(widgets.filter(w => w.id !== id));
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="h-8 bg-slate-900/50 border-b border-slate-800 flex items-center px-3 gap-2">
        <button
          onClick={() => setShowAddWidget(!showAddWidget)}
          className="px-2 py-1 bg-blue-600 text-white rounded text-xs flex items-center gap-1"
        >
          <Plus className="w-3 h-3" /> Add Widget
        </button>
        <span className="text-slate-400 text-xs">{widgets.length} widgets</span>
      </div>

      {/* Widget picker */}
      {showAddWidget && (
        <div className="bg-slate-900 border-b border-slate-700 p-3">
          <div className="grid grid-cols-4 gap-2">
            {WIDGET_TYPES.map(w => (
              <button
                key={w.id}
                onClick={() => addWidget(w.id)}
                className="p-2 rounded border border-slate-700 hover:border-blue-500 text-left"
              >
                <div className="text-slate-200 text-xs">{w.name}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Widget grid */}
      <div className="flex-1 overflow-auto p-3">
        <div className="grid grid-cols-4 gap-3 auto-rows-[150px]">
          {widgets.map(widget => (
            <div
              key={widget.id}
              className="bg-slate-900 rounded border border-slate-700 overflow-hidden"
              style={{
                gridColumn: `span ${widget.w}`,
                gridRow: `span ${widget.h}`,
              }}
            >
              {/* Widget header */}
              <div className="h-6 bg-slate-800 flex items-center justify-between px-2">
                <span className="text-xs text-slate-400">
                  {WIDGET_TYPES.find(t => t.id === widget.type)?.name}
                </span>
                <button
                  onClick={() => removeWidget(widget.id)}
                  className="text-slate-500 hover:text-red-400"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              {/* Widget content - render based on type */}
              <div className="p-2 h-[calc(100%-24px)] overflow-auto">
                {/* Render widget content based on type */}
                {renderWidget(widget.type, { projections, summary, params })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function renderWidget(type, { projections, summary, params }) {
  // Implementation for each widget type...
  // This would render the appropriate chart/table/card
}
```

#### 2. Add Dashboard Tab to App.jsx
**File**: `src/App.jsx`

```jsx
// Add to TABS array
{ id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },

// Add tab content
{activeTab === 'dashboard' && (
  <Dashboard
    projections={projections}
    summary={summary}
    params={params}
  />
)}
```

### Success Criteria:

#### Automated Verification:
- [ ] Build passes: `npm run build`

#### Manual Verification:
- [ ] Dashboard tab appears in navigation
- [ ] Add Widget button shows widget picker
- [ ] Widgets can be added to the grid
- [ ] X button removes widgets
- [ ] Widgets render their content correctly

---

## Phase 5: Enhanced Scenario Comparison

### Overview
Upgrade scenario comparison with side-by-side projection tables and diff highlighting.

### Changes Required:

#### 1. Update ScenarioComparison Component
**File**: `src/components/ScenarioComparison/index.jsx`
**Changes**: Add detailed comparison mode with projection tables

```jsx
// Add new view mode state
const [viewMode, setViewMode] = useState('summary'); // 'summary' | 'detailed' | 'diff'

// Add detailed comparison view
{viewMode === 'detailed' && (
  <div className="grid grid-cols-2 gap-4">
    {/* Base case mini table */}
    <div className="bg-slate-900 rounded border border-slate-700">
      <div className="p-2 border-b border-slate-700 text-emerald-400 font-medium text-sm">
        Base Case
      </div>
      <MiniProjectionsTable
        projections={projections}
        highlightDiff={null}
      />
    </div>

    {/* Selected scenario mini table */}
    {selectedScenario && (
      <div className="bg-slate-900 rounded border border-slate-700">
        <div className="p-2 border-b border-slate-700 text-blue-400 font-medium text-sm">
          {selectedScenario.name}
        </div>
        <MiniProjectionsTable
          projections={selectedScenario.projections}
          highlightDiff={projections}
        />
      </div>
    )}
  </div>
)}

// Add diff view with color-coded changes
{viewMode === 'diff' && (
  <DiffTable
    base={projections}
    compare={selectedScenario?.projections}
    metrics={['totalEOY', 'heirValue', 'totalTax', 'rothPercent']}
  />
)}
```

### Success Criteria:

#### Automated Verification:
- [ ] Build passes: `npm run build`

#### Manual Verification:
- [ ] View mode selector switches between summary/detailed/diff
- [ ] Detailed view shows side-by-side projection tables
- [ ] Diff view highlights positive changes in green, negative in red
- [ ] Selecting different scenarios updates the comparison

---

## Phase 6: Additional Visualizations

### Overview
Add new chart types to the available visualizations.

### New Charts:

#### 1. Tax Bracket Waterfall
Shows how income fills each bracket with visual representation.

#### 2. Roth Conversion Analysis
Shows optimal conversion amounts based on bracket space.

#### 3. Portfolio Composition Timeline
Pie chart animation showing account mix over time.

#### 4. Income Sources Sankey
Flow diagram showing income sources → taxes → spending.

#### 5. Wealth Trajectory Cone
Range visualization with best/worst/expected cases.

### Changes Required:

**File**: `src/components/ChartsView/index.jsx`
**Changes**: Add new chart configurations and rendering

```jsx
const CHART_CONFIGS = [
  // Existing charts...
  { id: 'bracket', name: 'Tax Bracket Waterfall', icon: Layers },
  { id: 'roth-analysis', name: 'Roth Conversion Analysis', icon: TrendingUp },
  { id: 'composition', name: 'Portfolio Composition', icon: PieChart },
  { id: 'effective-rate', name: 'Effective Tax Rate', icon: Percent },
];

// Add rendering for new charts
{activeCharts.includes('bracket') && (
  <TaxBracketWaterfall data={projections[selectedYear]} />
)}

{activeCharts.includes('effective-rate') && (
  <div className="bg-slate-900 rounded border border-slate-800 p-4">
    <div className="text-sm font-medium text-slate-200 mb-3">Effective Tax Rate</div>
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis dataKey="year" stroke="#64748b" fontSize={10} />
        <YAxis stroke="#64748b" fontSize={10} tickFormatter={(v) => `${(v*100).toFixed(0)}%`} />
        <Tooltip contentStyle={tooltipStyle} />
        <Line
          type="monotone"
          dataKey="effectiveRate"
          stroke="#8b5cf6"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  </div>
)}
```

### Success Criteria:

#### Automated Verification:
- [ ] Build passes: `npm run build`

#### Manual Verification:
- [ ] New charts appear in chart picker
- [ ] Each new chart renders correctly
- [ ] Charts interact properly (tooltips, legends)

---

## Testing Strategy

### Unit Tests:
- YearSelector: mode changes, year selection, drag behavior
- CalculationInspector: formula computation, view switching
- SplitPanel: resize behavior, ratio clamping
- Dashboard: widget add/remove, grid layout

### Integration Tests:
- Full flow: change year selection → verify table updates
- Click value → inspector opens → shows correct formula
- Split view → both panels render and scroll independently

### Manual Testing Steps:
1. Test all year selection modes (brief, moderate, detailed, all, custom)
2. Drag on year timeline to select ranges
3. Click various calculated values to verify inspector accuracy
4. Toggle split view and verify both panels work
5. Add/remove dashboard widgets
6. Create scenarios and compare with diff view
7. Test all new chart types

## Performance Considerations

- Memoize heavy calculations (projections, chart data)
- Use virtualization for large year ranges in table
- Lazy load chart components not in viewport
- Debounce year selection drag updates

## Migration Notes

- No database changes required
- All state is client-side
- Existing saved scenarios/exports remain compatible

## References

- Existing calculations: `src/lib/calculations.js`
- Current year modes: `src/components/ProjectionsTable/index.jsx:152-173`
- Chart implementations: `src/components/ChartsView/index.jsx`
- Scenario comparison: `src/components/ScenarioComparison/index.jsx`
