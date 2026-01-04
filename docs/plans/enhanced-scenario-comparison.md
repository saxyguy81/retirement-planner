# Enhanced Scenario Comparison - Multi-Select and Optional Base

## Overview

Enhance the Scenario Comparison tool with two key features:
1. **Toggle to include/exclude current parameters** as a "Base Case" scenario
2. **Multi-select scenarios** for comparison (compare 2+ named scenarios against each other)

## Current State Analysis

### Existing Behavior (lines 1066-1100 in ScenarioComparison/index.jsx)
- "Base Case" is always displayed using live `params`, `projections`, `summary` props
- Base Case is NOT stored in the `scenarios[]` array - it's hardcoded to always show
- Single scenario selection via `selectedScenarioId` state (dropdown in header)
- All diff/detailed views compare selected scenario TO base case

### Key Data Structures
```javascript
// Scenarios are stored as overrides on top of base params
const scenario = {
  id: Date.now(),
  name: string,
  description: string,
  overrides: { /* params that differ from base */ }
};

// scenarioResults computed by merging:
const mergedParams = { ...params, ...options, ...scenario.overrides };
```

## Desired End State

### Feature 1: Optional Base Case Toggle
- Checkbox/toggle in header: "Include current parameters"
- When unchecked, Base Case card is hidden from Summary view
- When comparing scenarios, they can be compared to each other without the base

### Feature 2: Multi-Select Scenarios
- Replace single-select dropdown with multi-select checkboxes
- User can select 2+ scenarios to compare
- If "Include current parameters" is checked, base is included in comparison
- Charts and tables dynamically adjust to selected scenarios

### Verification Criteria:
1. Toggle hides/shows Base Case in Summary view
2. Can select multiple scenarios via checkboxes
3. Detailed view shows tables for all selected scenarios side-by-side
4. Diff view shows comparison matrix between selected scenarios
5. Charts include all selected scenarios
6. Minimum 2 scenarios required for comparison (can be base + 1, or 2+ named)

## What We're NOT Doing

- Not changing how scenarios are stored (still use `overrides` pattern)
- Not changing how `scenarioResults` is computed
- Not adding drag-and-drop reordering of scenarios
- Not changing save/load functionality

## Implementation Approach

Replace the single `selectedScenarioId` with a `selectedScenarioIds: Set<number>` and add an `includeBaseCase: boolean` toggle. Update all views to handle multiple selections.

---

## Phase 1: Add State and UI Controls

### Overview
Add the new state variables and header controls for toggling base case and multi-selecting scenarios.

### Changes Required:

#### 1. State Variables
**File**: `src/components/ScenarioComparison/index.jsx`
**Location**: Around line 441

Replace:
```javascript
const [selectedScenarioId, setSelectedScenarioId] = useState(null);
```

With:
```javascript
// Multi-select: Set of scenario IDs to include in comparison
const [selectedScenarioIds, setSelectedScenarioIds] = useState(new Set());
// Toggle to include/exclude base case from comparison
const [includeBaseCase, setIncludeBaseCase] = useState(true);
```

#### 2. Selection Helper Functions
**File**: `src/components/ScenarioComparison/index.jsx`
**Location**: After state declarations (around line 445)

Add:
```javascript
// Toggle a scenario in/out of selection
const toggleScenarioSelection = useCallback((id) => {
  setSelectedScenarioIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    return next;
  });
}, []);

// Select all scenarios
const selectAllScenarios = useCallback(() => {
  setSelectedScenarioIds(new Set(scenarioResults.map(s => s.id)));
}, [scenarioResults]);

// Clear all selections
const clearScenarioSelection = useCallback(() => {
  setSelectedScenarioIds(new Set());
}, []);

// Get selected scenarios for display
const selectedScenarios = useMemo(() => {
  if (selectedScenarioIds.size === 0) {
    // If nothing selected, default to all scenarios
    return scenarioResults;
  }
  return scenarioResults.filter(s => selectedScenarioIds.has(s.id));
}, [scenarioResults, selectedScenarioIds]);
```

#### 3. Header Controls - Include Base Toggle
**File**: `src/components/ScenarioComparison/index.jsx`
**Location**: Around line 857 (header div, before existing scenario selector)

Replace the existing scenario selector block with:
```jsx
{/* Include Base Case Toggle */}
{scenarios.length > 0 && (
  <>
    <label className="flex items-center gap-1.5 text-xs cursor-pointer">
      <input
        type="checkbox"
        checked={includeBaseCase}
        onChange={e => setIncludeBaseCase(e.target.checked)}
        className="w-3 h-3 rounded border-slate-600 bg-slate-800
                   checked:bg-emerald-600 checked:border-emerald-600
                   focus:ring-0 focus:ring-offset-0"
      />
      <span className="text-slate-400">Include base</span>
    </label>
    <div className="w-px h-4 bg-slate-700" />
  </>
)}
```

#### 4. Header Controls - Multi-Select Dropdown
**File**: `src/components/ScenarioComparison/index.jsx`
**Location**: Replace the existing single-select dropdown (lines 859-873)

Replace with a dropdown button that shows checkboxes:
```jsx
{/* Scenario Multi-Select */}
{scenarios.length > 0 && (viewMode === 'detailed' || viewMode === 'diff') && (
  <>
    <div className="relative">
      <button
        onClick={() => setShowScenarioSelector(prev => !prev)}
        className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs
                   flex items-center gap-1 hover:bg-slate-700"
      >
        <span>
          {selectedScenarioIds.size === 0
            ? 'All scenarios'
            : `${selectedScenarioIds.size} selected`}
        </span>
        <ChevronDown className="w-3 h-3" />
      </button>

      {showScenarioSelector && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-slate-800 border
                        border-slate-700 rounded shadow-lg z-20 py-1">
          {/* Select All / Clear */}
          <div className="px-2 py-1 border-b border-slate-700 flex gap-2">
            <button
              onClick={selectAllScenarios}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              Select all
            </button>
            <button
              onClick={clearScenarioSelection}
              className="text-xs text-slate-400 hover:text-slate-300"
            >
              Clear
            </button>
          </div>

          {/* Scenario Checkboxes */}
          {scenarioResults.map((s, idx) => (
            <label
              key={s.id}
              className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-700 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedScenarioIds.size === 0 || selectedScenarioIds.has(s.id)}
                onChange={() => toggleScenarioSelection(s.id)}
                className="w-3 h-3 rounded border-slate-600 bg-slate-800
                           checked:bg-blue-600 checked:border-blue-600"
              />
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: SCENARIO_COLORS[idx % SCENARIO_COLORS.length] }}
              />
              <span className="text-xs text-slate-200 truncate">{s.name}</span>
            </label>
          ))}
        </div>
      )}
    </div>
    <div className="w-px h-4 bg-slate-700" />
  </>
)}
```

#### 5. Add State for Dropdown Visibility
**File**: `src/components/ScenarioComparison/index.jsx`
**Location**: With other state declarations (around line 430)

Add:
```javascript
const [showScenarioSelector, setShowScenarioSelector] = useState(false);
```

#### 6. Add ChevronDown Import
**File**: `src/components/ScenarioComparison/index.jsx`
**Location**: Line 13 (imports)

Add `ChevronDown` to the lucide-react imports:
```javascript
import {
  // ... existing imports
  ChevronDown,
} from 'lucide-react';
```

### Success Criteria:

#### Automated Verification:
- [x] Build succeeds: `npm run build`
- [x] Linting passes: `npm run lint`
- [x] Unit tests pass: `npm test`

#### Manual Verification:
- [x] "Include base" checkbox appears in header when scenarios exist
- [x] Unchecking hides Base Case card in Summary view
- [x] Scenario multi-select dropdown appears in Detailed/Diff views
- [x] Can select/deselect individual scenarios
- [x] "Select all" / "Clear" buttons work

---

## Phase 2: Update Summary View

### Overview
Update the Summary view to respect the `includeBaseCase` toggle and show only selected scenarios.

### Changes Required:

#### 1. Conditionally Render Base Case Card
**File**: `src/components/ScenarioComparison/index.jsx`
**Location**: Lines 1066-1100 (Base Scenario card)

Wrap the Base Case card with a conditional:
```jsx
{/* Base Scenario Card - only show if includeBaseCase is true */}
{includeBaseCase && (
  <div className="bg-slate-900 border-2 border-emerald-500/50 rounded-lg p-3">
    {/* ... existing base case card content ... */}
  </div>
)}
```

#### 2. Update Summary Table Headers
**File**: `src/components/ScenarioComparison/index.jsx`
**Location**: Lines 1291-1305 (Summary table header)

Make Base column conditional:
```jsx
<thead>
  <tr className="border-b border-slate-700">
    <th className="text-left py-2 px-3 text-slate-400 font-normal">Metric</th>
    {includeBaseCase && (
      <th className="text-right py-2 px-3 text-emerald-400 font-normal">
        Base
      </th>
    )}
    {selectedScenarios.map((s, sIdx) => (
      <th
        key={s.id}
        className="text-right py-2 px-3 font-normal"
        style={{ color: SCENARIO_COLORS[scenarioResults.indexOf(s) % SCENARIO_COLORS.length] }}
      >
        {s.name}
      </th>
    ))}
  </tr>
</thead>
```

#### 3. Update Summary Table Body
**File**: `src/components/ScenarioComparison/index.jsx`
**Location**: Lines 1307-1347 (Summary table body)

Make Base column conditional and use `selectedScenarios`:
```jsx
<tbody>
  {comparisonMetrics.map(metric => {
    const baseValue = getMetricValue(projections, summary, metric);
    // For diff calculation, use first selected scenario if no base
    const referenceValue = includeBaseCase
      ? baseValue
      : getMetricValue(selectedScenarios[0]?.projections, selectedScenarios[0]?.summary, metric);

    return (
      <tr key={metric.key} className="border-b border-slate-800 hover:bg-slate-800/50">
        <td className="py-2 px-3 text-slate-300">{metric.label}</td>
        {includeBaseCase && (
          <td className="py-2 px-3 text-right text-slate-200 font-mono">
            {metric.format === '$' ? fmt$(baseValue) : fmtPct(baseValue)}
          </td>
        )}
        {selectedScenarios.map((s, sIdx) => {
          const value = getMetricValue(s.projections, s.summary, metric);
          // Skip diff for first scenario if it's the reference
          const showDiff = includeBaseCase || sIdx > 0;
          const diff = showDiff ? value - referenceValue : 0;
          const isBetter = metric.key === 'totalTaxPaid' || metric.key === 'totalIRMAAPaid'
            ? diff < 0 : diff > 0;

          return (
            <td key={s.id} className="py-2 px-3 text-right font-mono">
              <div className="text-slate-200">
                {metric.format === '$' ? fmt$(value) : fmtPct(value)}
              </div>
              {showDiff && diff !== 0 && (
                <div className={`text-xs ${isBetter ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {diff > 0 ? '+' : ''}{metric.format === '$' ? fmt$(diff) : fmtPct(diff)}
                </div>
              )}
            </td>
          );
        })}
      </tr>
    );
  })}
</tbody>
```

#### 4. Update Comparison Chart
**File**: `src/components/ScenarioComparison/index.jsx`
**Location**: Lines 1250-1280 (LineChart in Summary view)

Update to use `selectedScenarios` and conditional base:
```jsx
<Line
  type="monotone"
  dataKey="Base"
  stroke="#10b981"
  strokeWidth={3}
  dot={false}
  name="Base Case"
  hide={!includeBaseCase}
/>
{selectedScenarios.map((s) => {
  const originalIdx = scenarioResults.indexOf(s);
  return (
    <Line
      key={s.id}
      type="monotone"
      dataKey={s.name}
      stroke={SCENARIO_COLORS[originalIdx % SCENARIO_COLORS.length]}
      strokeWidth={2.5}
      dot={false}
    />
  );
})}
```

### Success Criteria:

#### Automated Verification:
- [x] Build succeeds: `npm run build`
- [x] E2E tests pass: `npm run test:e2e`

#### Manual Verification:
- [x] Unchecking "Include base" hides Base Case card
- [x] Summary table removes Base column when toggle is off
- [x] Chart removes Base line when toggle is off
- [x] Selected scenarios appear in table and chart
- [x] Diff calculations work without base (first scenario becomes reference)

---

## Phase 3: Update Detailed View for Multi-Select

### Overview
Update the Detailed view to show side-by-side tables for all selected scenarios (not just one).

### Changes Required:

#### 1. Replace Detailed View Grid
**File**: `src/components/ScenarioComparison/index.jsx`
**Location**: Lines 1354-1447 (Detailed view mode block)

Replace with dynamic grid:
```jsx
{viewMode === 'detailed' && (
  <div className="space-y-4">
    {/* Dynamic grid based on selection count */}
    <div className={`grid gap-4 ${
      (includeBaseCase ? 1 : 0) + selectedScenarios.length <= 2
        ? 'grid-cols-1 lg:grid-cols-2'
        : 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3'
    }`}>
      {/* Base Case Mini Table */}
      {includeBaseCase && (
        <div className="bg-slate-900 border-2 border-emerald-500/50 rounded-lg overflow-hidden">
          <div className="p-2 border-b border-emerald-500/30 bg-emerald-500/10">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-emerald-400 font-medium text-sm">Base Case</span>
            </div>
          </div>
          <MiniProjectionsTable
            projections={projections}
            label="Metric"
            color="#10b981"
            showPV={showPV}
          />
        </div>
      )}

      {/* Selected Scenario Mini Tables */}
      {selectedScenarios.map((scenario) => {
        const originalIdx = scenarioResults.indexOf(scenario);
        const color = SCENARIO_COLORS[originalIdx % SCENARIO_COLORS.length];
        return (
          <div
            key={scenario.id}
            className="bg-slate-900 border-2 rounded-lg overflow-hidden"
            style={{ borderColor: `${color}80` }}
          >
            <div
              className="p-2 border-b"
              style={{ borderColor: `${color}50`, backgroundColor: `${color}10` }}
            >
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                <span className="font-medium text-sm" style={{ color }}>{scenario.name}</span>
              </div>
            </div>
            <MiniProjectionsTable
              projections={scenario.projections}
              label="Metric"
              color={color}
              showPV={showPV}
            />
          </div>
        );
      })}
    </div>

    {/* Comparison Chart */}
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
      <div className="text-slate-200 font-medium mb-4">Side-by-Side Trend</div>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={comparisonData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="year" stroke="#64748b" fontSize={10} />
          <YAxis stroke="#64748b" fontSize={10} tickFormatter={v => `$${v.toFixed(1)}M`} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ paddingTop: '10px' }} iconType="line" iconSize={12} />
          {includeBaseCase && (
            <Line type="monotone" dataKey="Base" stroke="#10b981" strokeWidth={3} dot={false} name="Base Case" />
          )}
          {selectedScenarios.map((s) => {
            const originalIdx = scenarioResults.indexOf(s);
            return (
              <Line
                key={s.id}
                type="monotone"
                dataKey={s.name}
                stroke={SCENARIO_COLORS[originalIdx % SCENARIO_COLORS.length]}
                strokeWidth={3}
                dot={false}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  </div>
)}
```

### Success Criteria:

#### Automated Verification:
- [x] Build succeeds: `npm run build`
- [x] E2E tests pass: `npm run test:e2e`

#### Manual Verification:
- [x] Detailed view shows tables for all selected scenarios
- [x] Grid adjusts columns based on count (2 cols for 2, 3 cols for 3+)
- [x] Base case table hidden when toggle is off
- [x] Chart shows all selected scenarios

---

## Phase 4: Update Diff View for Multi-Select

### Overview
Update the Diff view to handle comparing multiple scenarios. When multiple scenarios are selected, show a comparison matrix or sequential diffs.

### Changes Required:

#### 1. Create Multi-Diff Component
**File**: `src/components/ScenarioComparison/index.jsx`
**Location**: After DiffTable component (around line 392)

Add a new component for multi-scenario comparison:
```jsx
/**
 * MultiDiffSummary - Shows summary comparison cards for multiple scenarios
 * First scenario (or base if included) is the reference
 */
function MultiDiffSummary({
  baseProjections,
  baseSummary,
  scenarios,
  includeBase,
  showPV,
  scenarioColors
}) {
  // Reference is base if included, otherwise first scenario
  const referenceProj = includeBase ? baseProjections : scenarios[0]?.projections;
  const referenceSum = includeBase ? baseSummary : scenarios[0]?.summary;
  const referenceName = includeBase ? 'Base Case' : scenarios[0]?.name;
  const referenceColor = includeBase ? '#10b981' : scenarioColors[0];

  // Scenarios to compare (exclude reference if it's from scenarios)
  const compareScenarios = includeBase ? scenarios : scenarios.slice(1);

  const metrics = [
    { label: 'Final Portfolio', key: 'endingPortfolio', pvKey: 'pvTotalEOY', higherIsBetter: true },
    { label: 'Heir Value', key: 'endingHeirValue', pvKey: 'pvHeirValue', higherIsBetter: true },
    { label: 'Total Tax', key: 'totalTaxPaid', pvKey: null, higherIsBetter: false },
  ];

  const getValue = (proj, sum, metric) => {
    if (showPV && metric.pvKey && proj?.length) {
      return proj[proj.length - 1]?.[metric.pvKey];
    }
    return sum?.[metric.key];
  };

  const refValues = metrics.map(m => getValue(referenceProj, referenceSum, m));

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
      <div className="p-3 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-xs">Reference:</span>
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: referenceColor }} />
          <span className="text-sm font-medium" style={{ color: referenceColor }}>{referenceName}</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3 text-slate-400 font-normal">Metric</th>
              <th className="text-right py-2 px-3 font-normal" style={{ color: referenceColor }}>
                {referenceName}
              </th>
              {compareScenarios.map((s, idx) => (
                <th key={s.id} className="text-right py-2 px-3 font-normal"
                    style={{ color: scenarioColors[includeBase ? idx : idx + 1] }}>
                  {s.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {metrics.map((metric, mIdx) => (
              <tr key={metric.key} className="border-b border-slate-800">
                <td className="py-2 px-3 text-slate-300">{metric.label}</td>
                <td className="py-2 px-3 text-right text-slate-200 font-mono">
                  {fmt$(refValues[mIdx])}
                </td>
                {compareScenarios.map((s, idx) => {
                  const val = getValue(s.projections, s.summary, metric);
                  const diff = val - refValues[mIdx];
                  const isBetter = metric.higherIsBetter ? diff > 0 : diff < 0;
                  return (
                    <td key={s.id} className="py-2 px-3 text-right font-mono">
                      <div className="text-slate-200">{fmt$(val)}</div>
                      {diff !== 0 && (
                        <div className={`text-xs ${isBetter ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {diff > 0 ? '+' : ''}{fmt$(diff)}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

#### 2. Update Diff View Mode
**File**: `src/components/ScenarioComparison/index.jsx`
**Location**: Lines 1449-1593 (Diff view mode block)

Replace with multi-scenario diff:
```jsx
{viewMode === 'diff' && (
  <div className="space-y-4">
    {/* Need at least 2 items to compare */}
    {((includeBaseCase ? 1 : 0) + selectedScenarios.length) < 2 ? (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400">
        <GitMerge className="w-12 h-12 mb-3 opacity-50" />
        <div className="text-lg mb-2">Need at least 2 scenarios to compare</div>
        <div className="text-sm">Select more scenarios or enable "Include base"</div>
      </div>
    ) : (
      <>
        {/* Multi-Scenario Summary Comparison */}
        <MultiDiffSummary
          baseProjections={projections}
          baseSummary={summary}
          scenarios={selectedScenarios}
          includeBase={includeBaseCase}
          showPV={showPV}
          scenarioColors={selectedScenarios.map(s => {
            const idx = scenarioResults.indexOf(s);
            return SCENARIO_COLORS[idx % SCENARIO_COLORS.length];
          })}
        />

        {/* Individual Diff Tables - show each scenario vs reference */}
        {selectedScenarios.length > 0 && (includeBaseCase || selectedScenarios.length > 1) && (
          <div className="space-y-4">
            <div className="text-slate-400 text-xs">Detailed year-by-year comparison:</div>
            {(includeBaseCase ? selectedScenarios : selectedScenarios.slice(1)).map((scenario) => {
              const originalIdx = scenarioResults.indexOf(scenario);
              const color = SCENARIO_COLORS[originalIdx % SCENARIO_COLORS.length];
              const referenceProj = includeBaseCase ? projections : selectedScenarios[0].projections;
              const referenceName = includeBaseCase ? 'Base Case' : selectedScenarios[0].name;

              return (
                <div key={scenario.id} className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
                  <DiffTable
                    baseProjections={referenceProj}
                    scenarioProjections={scenario.projections}
                    scenarioName={scenario.name}
                    scenarioColor={color}
                    showPV={showPV}
                    baseName={referenceName}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Multi-Scenario Bar Chart */}
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
          <div className="text-slate-200 font-medium mb-4">Portfolio Comparison Over Time</div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart
              data={projections
                .filter((_, pIdx) => pIdx % 5 === 0 || pIdx === projections.length - 1)
                .map(p => {
                  const row = { year: p.year };
                  if (includeBaseCase) {
                    row['Base'] = (showPV ? p.pvTotalEOY : p.totalEOY) / 1e6;
                  }
                  selectedScenarios.forEach(s => {
                    const sRow = s.projections.find(sp => sp.year === p.year);
                    row[s.name] = sRow ? (showPV ? sRow.pvTotalEOY : sRow.totalEOY) / 1e6 : 0;
                  });
                  return row;
                })}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="year" stroke="#64748b" fontSize={10} />
              <YAxis stroke="#64748b" fontSize={10} tickFormatter={v => `$${v.toFixed(1)}M`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', fontSize: '11px' }}
                formatter={value => [`$${value?.toFixed(2)}M`]}
              />
              <Legend wrapperStyle={{ paddingTop: '10px' }} />
              {includeBaseCase && <Bar dataKey="Base" fill="#10b981" />}
              {selectedScenarios.map((s) => {
                const idx = scenarioResults.indexOf(s);
                return <Bar key={s.id} dataKey={s.name} fill={SCENARIO_COLORS[idx % SCENARIO_COLORS.length]} />;
              })}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </>
    )}
  </div>
)}
```

#### 3. Update DiffTable to Accept Custom Base Name
**File**: `src/components/ScenarioComparison/index.jsx`
**Location**: Line 200 (DiffTable component)

Add `baseName` prop:
```jsx
function DiffTable({
  baseProjections,
  scenarioProjections,
  scenarioName,
  scenarioColor,
  showPV,
  discountRate = 0.03,
  baseName = 'Base Case',  // NEW: customizable reference name
}) {
```

And update the header (line 289):
```jsx
<span className="text-emerald-400 text-xs">{baseName}</span>
```

### Success Criteria:

#### Automated Verification:
- [x] Build succeeds: `npm run build`
- [x] E2E tests pass: `npm run test:e2e`

#### Manual Verification:
- [x] Diff view shows error message when less than 2 items to compare
- [x] Multi-scenario summary table shows all selected scenarios
- [x] Diff tables show each scenario compared to reference
- [x] Bar chart shows all selected scenarios side-by-side
- [x] When base is excluded, first scenario becomes reference

---

## Phase 5: Update comparisonData and Charts

### Overview
Ensure `comparisonData` memo respects `selectedScenarios` filter so charts only show selected scenarios.

### Changes Required:

#### 1. Update comparisonData Memo
**File**: `src/components/ScenarioComparison/index.jsx`
**Location**: Lines 539-551

Update to use `selectedScenarios`:
```javascript
const comparisonData = useMemo(() => {
  const metricKey = getMetricKey(selectedMetric);
  const data = projections.map((p, pIdx) => {
    const row = { year: p.year };
    if (includeBaseCase) {
      row.Base = p[metricKey] / 1e6;
    }
    selectedScenarios.forEach(s => {
      row[s.name] = s.projections[pIdx]?.[metricKey] / 1e6 || 0;
    });
    return row;
  });
  return data;
}, [projections, selectedScenarios, selectedMetric, getMetricKey, includeBaseCase]);
```

### Success Criteria:

#### Automated Verification:
- [x] Build succeeds: `npm run build`
- [x] All tests pass: `npm test && npm run test:e2e`

#### Manual Verification:
- [x] Charts only show selected scenarios
- [x] Base line appears/disappears based on toggle
- [x] Deselecting a scenario removes it from charts

---

## Phase 6: Auto-Select New Scenarios

### Overview
When a new scenario is created, automatically add it to selection.

### Changes Required:

#### 1. Update createScenario Function
**File**: `src/components/ScenarioComparison/index.jsx`
**Location**: Lines 627-639

Add the new scenario ID to selection:
```javascript
const createScenario = useCallback(
  (preset, customName = null) => {
    const newId = Date.now();
    const newScenario = {
      id: newId,
      name: customName || (preset ? preset.name : getDefaultScenarioName('custom')),
      description: preset?.description || '',
      overrides: preset?.overrides || {},
    };
    setScenarios(prev => [...prev, newScenario]);
    // Auto-select the new scenario
    setSelectedScenarioIds(prev => new Set([...prev, newId]));
    setShowPresets(false);
    setNamingScenario(null);
  },
  [getDefaultScenarioName]
);
```

#### 2. Update Pending Scenario Handler
**File**: `src/components/ScenarioComparison/index.jsx`
**Location**: Lines 444-455

Auto-select pending scenarios too:
```javascript
useEffect(() => {
  if (pendingScenario) {
    const newId = pendingScenario.createdAt || Date.now();
    const newScenario = {
      id: newId,
      name: pendingScenario.name || 'From Optimizer',
      description: pendingScenario.description || '',
      overrides: pendingScenario.overrides || {},
    };
    setScenarios(prev => [...prev, newScenario]);
    // Auto-select the new scenario
    setSelectedScenarioIds(prev => new Set([...prev, newId]));
    onPendingScenarioConsumed?.();
  }
}, [pendingScenario, onPendingScenarioConsumed]);
```

#### 3. Clean Up Selection When Scenario Deleted
**File**: `src/components/ScenarioComparison/index.jsx`
**Location**: Lines 657-663 (removeScenario function)

Remove deleted scenario from selection:
```javascript
const removeScenario = id => {
  setScenarios(scenarios.filter(s => s.id !== id));
  // Remove from selection
  setSelectedScenarioIds(prev => {
    const next = new Set(prev);
    next.delete(id);
    return next;
  });
};
```

### Success Criteria:

#### Automated Verification:
- [x] Build succeeds: `npm run build`
- [x] All tests pass: `npm test && npm run test:e2e`

#### Manual Verification:
- [x] New scenarios are automatically selected
- [x] Deleted scenarios are removed from selection
- [x] Scenarios from optimizer/chat are auto-selected

---

## Testing Strategy

### Unit Tests:
- Test `toggleScenarioSelection` function logic
- Test `selectedScenarios` memo with various selection states
- Test `comparisonData` with/without base case

### E2E Tests:
Update `e2e/ci/scenarios.spec.js`:
- Test "Include base" toggle visibility and behavior
- Test multi-select dropdown functionality
- Test that charts update when selection changes

### Manual Testing Steps:
1. Create 3+ scenarios
2. Toggle "Include base" off - verify Base Case disappears from all views
3. Open multi-select dropdown and select only 2 scenarios
4. Verify Summary view shows only those 2
5. Switch to Detailed view - verify only selected scenarios have tables
6. Switch to Diff view - verify comparison works without base
7. Clear selection - verify it defaults to "all scenarios"
8. Delete a selected scenario - verify it's removed from selection
9. Create new scenario - verify it's auto-selected

---

## References

- Main component: `src/components/ScenarioComparison/index.jsx`
- E2E tests: `e2e/ci/scenarios.spec.js`
- Similar multi-select pattern: `src/components/ProjectionsTable/index.jsx:254-338`
