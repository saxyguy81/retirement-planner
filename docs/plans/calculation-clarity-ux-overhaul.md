# Calculation Clarity & UX Overhaul - Implementation Plan

## Executive Summary

This plan transforms the retirement planner from a data-dense tool into a **verification-friendly, navigable calculation explorer** where every number is traceable, every formula is visible, and tax tables are accessible for confirmation.

**Core Problem**: Users can't follow how calculations connect, aren't sure if groupings make sense, and have no way to verify calculations against source tables.

**Core Solution**:
1. Reorganize sections for logical money flow
2. Side panel inspector with clickable formula navigation
3. PV/FV dual display in formulas
4. Interactive tax table viewer with "you are here" indicators
5. Scroll-to-cell navigation for off-screen dependencies

**Target User**: Technically-savvy individuals who understand financial concepts but need to trace HOW the app calculates things and verify against authoritative sources.

**Relationship to Existing Plan**: Complements `new-user-usability-improvements.md` (v3). That plan focuses on onboarding. This plan focuses on ongoing usability for users actively exploring projections.

---

## Critical Constraints

### Responsive Design Requirements

The side panel approach requires different layouts for different screen sizes:

| Breakpoint | Layout | Inspector Behavior |
|------------|--------|-------------------|
| **≥1280px (xl)** | Side-by-side: Table + Panel | Panel resizable 300-500px |
| **1024-1279px (lg)** | Side-by-side: Table + Panel | Panel fixed 320px |
| **768-1023px (md)** | Overlay panel | Panel slides over table as drawer |
| **<768px (sm)** | Full-screen modal | Inspector takes full screen when open |

```jsx
// Responsive panel behavior
const InspectorPanel = ({ isOpen, ...props }) => {
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const isMobile = useMediaQuery('(max-width: 767px)');

  if (isMobile) {
    return <FullScreenInspector isOpen={isOpen} {...props} />;
  }
  if (!isDesktop) {
    return <DrawerInspector isOpen={isOpen} {...props} />;
  }
  return <SidePanelInspector isOpen={isOpen} {...props} />;
};
```

### Accessibility Requirements (WCAG 2.1 AA)

**Keyboard Navigation:**
- `Tab` to navigate between cells
- `Enter` or `Space` to open inspector on focused cell
- `Escape` to close inspector
- Arrow keys to navigate dependencies within inspector
- `J` / `K` for next/previous dependency (vim-style)

**Screen Reader Support:**
- All cells have `aria-label` describing the value and its meaning
- Inspector uses `aria-live="polite"` for content updates
- Dependency list uses `role="list"` with proper `role="listitem"`
- Tax tables use proper `<th scope="col">` and `scope="row"`

**Motion & Visual:**
```css
/* Respect reduced motion preference */
@media (prefers-reduced-motion: reduce) {
  .flash-highlight {
    animation: none;
    background-color: rgba(59, 130, 246, 0.3);
    transition: background-color 0.5s ease-out;
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .cell-highlighted { outline: 3px solid white; }
  .clickable-value { text-decoration: underline; }
}
```

**Focus Management:**
- Opening inspector moves focus to inspector header
- Closing inspector returns focus to the triggering cell
- `scrollToCell()` also sets focus on the target cell

### Performance Requirements

**Memoization Strategy:**
```jsx
// Memoize inflated tax brackets (only recalculate when params change)
const useMemoizedBrackets = (baseYear, targetYear, inflationRate) => {
  return useMemo(() => {
    const years = targetYear - baseYear;
    return {
      federal: inflateBrackets(FEDERAL_BRACKETS_MFJ_2024, inflationRate, years),
      ltcg: inflateBrackets(LTCG_BRACKETS_MFJ_2024, inflationRate, years),
    };
  }, [baseYear, targetYear, inflationRate]);
};

// Memoize dependency calculations
const dependencies = useMemo(
  () => getDependencies(field, year, allProjections),
  [field, year, allProjections]
);
```

**Cell ID Strategy:**
- Use data attributes instead of IDs: `data-cell="${field}-${year}"`
- Use `useRef` with callback ref for direct DOM access
- Virtualize rows if projections exceed 50 years

**Cleanup:**
```jsx
// Proper cleanup for flash highlight timeout
useEffect(() => {
  if (flashCell) {
    const timer = setTimeout(() => setFlashCell(null), 1500);
    return () => clearTimeout(timer);
  }
}, [flashCell]);
```

### Edge Cases & Error Handling

**Pre-RMD Age (< 73):**
```jsx
// RMD Table: Don't show "You are here" for users under 73
export function RMDTable({ age, iraBalance }) {
  const isRMDAge = age >= 73;

  return (
    <div>
      {!isRMDAge && (
        <div className="bg-slate-800 rounded p-3 mb-4 text-sm">
          <span className="text-amber-400">Note:</span>
          <span className="text-slate-300 ml-2">
            RMDs begin at age 73. You are currently {age}.
            First RMD year: {new Date().getFullYear() + (73 - age)}.
          </span>
        </div>
      )}
      {/* Table content... */}
    </div>
  );
}
```

**Survivor Scenario (MFJ → Single Filing Status):**
```jsx
// Tax tables must detect filing status change mid-projection
const getFilingStatusForYear = (year, params) => {
  const { survivorDeathYear, birthYear } = params;
  if (survivorDeathYear && year > survivorDeathYear) {
    return 'single';
  }
  return 'mfj';
};

// Tax Table Viewer shows both when survivor scenario is active
{survivorDeathYear && (
  <div className="bg-amber-900/30 rounded p-2 text-xs mb-4">
    ⚠️ Survivor scenario: Filing status changes from MFJ to Single in {survivorDeathYear + 1}
  </div>
)}
```

**Leaf Nodes (No Formula):**
```jsx
// Handle cells that are inputs, not calculations
export function FormulaDisplay({ calc, ...props }) {
  // Input fields have no formula - show source instead
  if (!calc.formula || calc.isInput) {
    return (
      <div className="text-slate-400 text-sm">
        <span className="text-amber-400">Input value</span>
        <p className="mt-2">
          This value comes from your inputs, not a calculation.
          {calc.inputSource && (
            <span> See: <strong>{calc.inputSource}</strong></span>
          )}
        </p>
      </div>
    );
  }

  // Regular formula display...
}
```

**Missing Dependency Data:**
```jsx
// Graceful handling when dependency data doesn't exist
const depValues = dependencies.map(dep => {
  const depData = allProjections.find(p => p.year === dep.year);

  if (!depData) {
    return {
      ...dep,
      value: null,
      error: `Data not available for ${dep.year}`,
    };
  }

  return {
    ...dep,
    value: depData[dep.field] ?? 0,
  };
});

// In render:
{dep.error ? (
  <span className="text-red-400 text-xs">{dep.error}</span>
) : (
  <ClickableValue value={dep.value} ... />
)}
```

**Year Out of Tax Table Range:**
```jsx
// For projections beyond 2054, show extrapolation warning
const TAX_DATA_END_YEAR = 2054;

{projectionYear > TAX_DATA_END_YEAR && (
  <div className="text-amber-400 text-xs mt-2">
    ⚠️ Tax brackets for {projectionYear} are extrapolated beyond available data.
  </div>
)}
```

**Empty Projections:**
```jsx
// Handle case where projections array is empty
if (!allProjections || allProjections.length === 0) {
  return (
    <div className="text-slate-500 p-4 text-center">
      No projection data available. Enter your parameters to generate projections.
    </div>
  );
}
```

### Navigation History (Back Button Support)

```jsx
// Track navigation history for back/forward within inspector
const [navHistory, setNavHistory] = useState([]);
const [historyIndex, setHistoryIndex] = useState(-1);

const navigateTo = (field, year) => {
  // Truncate forward history when navigating from middle
  const newHistory = navHistory.slice(0, historyIndex + 1);
  newHistory.push({ field, year });
  setNavHistory(newHistory);
  setHistoryIndex(newHistory.length - 1);
  // ... scroll and update inspector
};

const goBack = () => {
  if (historyIndex > 0) {
    setHistoryIndex(historyIndex - 1);
    const prev = navHistory[historyIndex - 1];
    // Navigate without adding to history
    scrollToCell(prev.field, prev.year);
  }
};

// UI: Back/Forward buttons in inspector header
<div className="flex gap-1">
  <button onClick={goBack} disabled={historyIndex <= 0} title="Previous (Alt+←)">
    <ChevronLeft className="w-4 h-4" />
  </button>
  <button onClick={goForward} disabled={historyIndex >= navHistory.length - 1} title="Next (Alt+→)">
    <ChevronRight className="w-4 h-4" />
  </button>
</div>
```

---

## Design Principles

| Principle | Application |
|-----------|-------------|
| **Use correct terminology** | Keep official terms (RMD, IRMAA, MAGI) with concise definitions available on demand |
| **High information density** | Don't hide data; organize it better with visual hierarchy |
| **Everything is clickable** | Every number leads to its calculation breakdown |
| **Context preservation** | Side panel inspector, not blocking modal |
| **Verification-friendly** | Tax tables accessible, source citations visible, external calculator links |
| **PV/FV transparency** | Always show both when in PV mode |

---

## Phase 1: Side Panel Inspector (Replaces Modal)

### Overview
Replace the current modal-based CalculationInspector with a persistent side panel that keeps the table visible and maintains context.

### Current Problem
- Modal blocks the projections table
- Lose context when inspecting calculations
- Can't compare cells across years while inspecting
- Navigation feels disconnected

### Solution: Resizable Side Panel

```
┌─────────────────────────────────────────────┬──────────────────────────────┐
│                                             │                              │
│     PROJECTIONS TABLE                       │   INSPECTOR                  │
│     (full width when panel closed)          │   (resizable, 300-500px)     │
│                                             │                              │
│     Year        2024      2025      2026    │   Total Tax (2025)           │
│     ─────────────────────────────────────   │                              │
│     federalTax  $7,800    $8,200    $8,600  │   $14,200                    │
│     ltcgTax     $3,100    $3,400    $3,200  │   (9.5% effective rate)      │
│     niit           $0        $0        $0  │                              │
│     stateTax    $2,400    $2,600    $2,800  │   ─────────────────────────  │
│     ─────────────────────────────────────   │   FORMULA:                   │
│     totalTax   $13,300  [$14,200]  $14,600  │   totalTax = federalTax      │
│                    ▲                        │     + ltcgTax + niit         │
│                    │                        │     + stateTax               │
│                    └────────────────────────┤                              │
│                                             │   [Click values to navigate] │
│                                             │                              │
└─────────────────────────────────────────────┴──────────────────────────────┘
```

### Panel Features

1. **Resizable**: Drag edge to resize (300px min, 500px max)
2. **Collapsible**: Click X or edge to collapse fully
3. **Pinnable**: Pin open to keep visible while navigating table
4. **Remembers state**: localStorage persists size and open/closed state

### Changes Required:

#### 1. Inspector Panel Component
**File**: `src/components/InspectorPanel/index.jsx` (new)

```jsx
export function InspectorPanel({
  isOpen,
  onClose,
  activeField,
  activeYear,
  activeData,
  allProjections,
  params,
  showPV,
  onNavigate // (field, year) => void - scrolls table and updates inspector
}) {
  const [width, setWidth] = useState(380);
  const calc = CALCULATIONS[activeField];
  const computed = calc?.compute(activeData, params, { showPV, discountRate: params.discountRate });

  if (!isOpen || !activeField) return null;

  return (
    <aside
      className="border-l border-slate-700 bg-slate-900 flex flex-col"
      style={{ width: `${width}px`, minWidth: '300px', maxWidth: '500px' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-slate-700">
        <div>
          <h3 className="text-blue-400 font-medium">{calc.name}</h3>
          <span className="text-slate-500 text-xs">{activeYear}</span>
        </div>
        <button onClick={onClose} aria-label="Close inspector">
          <X className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      {/* Content - scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Quick Answer */}
        <QuickAnswer computed={computed} showPV={showPV} />

        {/* Formula with clickable values */}
        <FormulaDisplay
          calc={calc}
          computed={computed}
          activeData={activeData}
          activeYear={activeYear}
          allProjections={allProjections}
          showPV={showPV}
          discountRate={params.discountRate}
          onNavigate={onNavigate}
        />

        {/* Tax bracket context (if applicable) */}
        {isTaxField(activeField) && (
          <TaxBracketIndicator
            field={activeField}
            data={activeData}
            params={params}
          />
        )}

        {/* Dependencies */}
        <DependencyList
          field={activeField}
          year={activeYear}
          allProjections={allProjections}
          onNavigate={onNavigate}
        />

        {/* Source citation */}
        <SourceCitation field={activeField} />
      </div>

      {/* Footer actions */}
      <div className="p-3 border-t border-slate-700 flex gap-2">
        <button className="text-xs text-slate-400 hover:text-slate-300">
          View Tax Tables
        </button>
        <button className="text-xs text-slate-400 hover:text-slate-300">
          Export Details
        </button>
      </div>

      {/* Resize handle */}
      <ResizeHandle onResize={setWidth} />
    </aside>
  );
}
```

#### 2. Integration with App Layout
**File**: `src/App.jsx`

```jsx
// Add inspector state
const [inspectorState, setInspectorState] = useState({
  isOpen: false,
  field: null,
  year: null,
  data: null,
});

// Handler for cell clicks (passed to ProjectionsTable)
const handleInspect = (field, year, data) => {
  setInspectorState({ isOpen: true, field, year, data });
};

// Handler for navigation within inspector
const handleInspectorNavigate = (field, year) => {
  // Find the data for this year
  const data = projections.find(p => p.year === year);
  if (data) {
    setInspectorState({ isOpen: true, field, year, data });
    // Scroll table to this cell
    scrollToCell(field, year);
  }
};

// Layout
<div className="flex flex-1 overflow-hidden">
  <div className="flex-1 overflow-auto">
    <ProjectionsTable
      projections={projections}
      onInspect={handleInspect}
      highlightedCell={inspectorState.isOpen ? { field: inspectorState.field, year: inspectorState.year } : null}
    />
  </div>
  <InspectorPanel
    isOpen={inspectorState.isOpen}
    onClose={() => setInspectorState(s => ({ ...s, isOpen: false }))}
    activeField={inspectorState.field}
    activeYear={inspectorState.year}
    activeData={inspectorState.data}
    allProjections={projections}
    params={params}
    showPV={showPV}
    onNavigate={handleInspectorNavigate}
  />
</div>
```

### Success Criteria:

#### Automated Verification:
- [x] `npm run build` succeeds
- [x] `npm run test:e2e` passes
- [x] Panel renders without layout shift
- [x] Resize persists to localStorage

#### Manual Verification:
- [x] Table remains visible when inspector is open
- [x] Can compare cells across years while inspector is open
- [x] Panel is resizable via drag handle
- [x] Panel collapses fully when closed

---

## Phase 2: Clickable Formula with PV/FV Display

### Overview
Enhance the existing ClickableFormula component to show both Present Value and Future Value when PV mode is active.

### Formula Display Design

When **PV mode is OFF** (showing Future Values):
```
totalTax = federalTax + ltcgTax + niit + stateTax

         = [$8,200]  + [$3,400] + [$0] + [$2,600]  =  $14,200
              ↑          ↑        ↑        ↑
           [clickable - navigates to that calculation]
```

When **PV mode is ON** (showing Present Values):
```
totalTax = federalTax + ltcgTax + niit + stateTax

PV:      = [$7,800]  + [$3,200] + [$0] + [$2,500]  =  $13,500
FV:        ($8,200)    ($3,400)   ($0)   ($2,600)     ($14,200)
              ↑          ↑        ↑        ↑
           [clickable - navigates to that calculation]
```

The PV line is primary (what user selected), FV shown below in dimmer text for reference/verification.

### Changes Required:

#### 1. Enhanced Formula Display Component
**File**: `src/components/InspectorPanel/FormulaDisplay.jsx` (new)

```jsx
export function FormulaDisplay({
  calc,
  computed,
  activeData,
  activeYear,
  allProjections,
  showPV,
  discountRate,
  onNavigate
}) {
  const dependencies = CELL_DEPENDENCIES[calc.key]?.(activeYear, activeData, allProjections) || [];

  // Get values for each dependency
  const depValues = dependencies.map(dep => {
    const depData = allProjections.find(p => p.year === dep.year) || activeData;
    const fvValue = depData[dep.field] || 0;
    const yearsFromStart = depData.yearsFromStart || 0;
    const pvValue = showPV ? applyPV(fvValue, yearsFromStart, discountRate) : fvValue;
    return { ...dep, fvValue, pvValue };
  });

  return (
    <div className="space-y-3">
      {/* Symbolic formula */}
      <div className="text-slate-400 text-sm font-mono">
        {computed.formula}
      </div>

      {/* Values - PV primary when in PV mode */}
      <div className="bg-slate-800 rounded p-3 font-mono text-sm">
        {showPV ? (
          <>
            {/* PV line (primary) */}
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-slate-500 w-8">PV:</span>
              {depValues.map((dep, i) => (
                <React.Fragment key={dep.field}>
                  {i > 0 && <span className="text-slate-600 mx-1">+</span>}
                  <ClickableValue
                    value={dep.pvValue}
                    label="PV"
                    field={dep.field}
                    year={dep.year}
                    onNavigate={onNavigate}
                    className="text-amber-400"
                  />
                </React.Fragment>
              ))}
              <span className="text-slate-600 mx-2">=</span>
              <span className="text-emerald-400 font-bold">
                {formatK(computed.pvResult || computed.simple)}
              </span>
            </div>

            {/* FV line (reference) */}
            <div className="flex items-center gap-1 flex-wrap mt-1 opacity-60">
              <span className="text-slate-500 w-8">FV:</span>
              {depValues.map((dep, i) => (
                <React.Fragment key={dep.field}>
                  {i > 0 && <span className="text-slate-700 mx-1">+</span>}
                  <span className="text-slate-500">({formatK(dep.fvValue)})</span>
                </React.Fragment>
              ))}
              <span className="text-slate-700 mx-2">=</span>
              <span className="text-slate-500">
                ({formatK(computed.fvResult || computed.simple)})
              </span>
            </div>
          </>
        ) : (
          /* FV only (default mode) */
          <div className="flex items-center gap-1 flex-wrap">
            {depValues.map((dep, i) => (
              <React.Fragment key={dep.field}>
                {i > 0 && <span className="text-slate-600 mx-1">+</span>}
                <ClickableValue
                  value={dep.fvValue}
                  field={dep.field}
                  year={dep.year}
                  onNavigate={onNavigate}
                  className="text-amber-400"
                />
              </React.Fragment>
            ))}
            <span className="text-slate-600 mx-2">=</span>
            <span className="text-emerald-400 font-bold">
              {formatK(computed.simple)}
            </span>
          </div>
        )}
      </div>

      {/* Click hint */}
      <div className="text-slate-600 text-xs">
        Click any value to navigate to that calculation
      </div>
    </div>
  );
}
```

#### 2. Clickable Value Component
**File**: `src/components/InspectorPanel/ClickableValue.jsx` (new)

```jsx
export function ClickableValue({ value, label, field, year, onNavigate, className }) {
  const fieldLabel = CALCULATIONS[field]?.name || field;

  return (
    <button
      onClick={() => onNavigate(field, year)}
      className={`
        px-1.5 py-0.5 rounded
        hover:bg-blue-900/30
        border-b border-dotted border-current
        transition-colors
        ${className}
      `}
      title={`${fieldLabel} (${year}) - Click to inspect`}
    >
      {formatK(value)}
      {label && <span className="text-xs ml-0.5 opacity-70">{label}</span>}
    </button>
  );
}
```

### Success Criteria:

#### Automated Verification:
- [x] `npm run build` succeeds
- [x] PV/FV values calculate correctly

#### Manual Verification:
- [x] In FV mode: single line of clickable values
- [x] In PV mode: PV line primary, FV line below in dimmer style
- [x] Clicking any value scrolls to that cell and updates inspector
- [x] Values show proper formatting ($K, $M as appropriate)

---

## Phase 3: Scroll-to-Cell Navigation

### Overview
When clicking a dependency in the inspector, scroll the table to bring that cell into view and highlight it briefly.

### The Problem
Dependencies may be off-screen (different year column or different row section). Highlighting invisible cells is useless.

### Solution: Click to Scroll + Flash Highlight

```jsx
// In ProjectionsTable
const scrollToCell = (field, year) => {
  // Find the cell element
  const cellId = `cell-${field}-${year}`;
  const cell = document.getElementById(cellId);

  if (cell) {
    // Scroll into view
    cell.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });

    // Flash highlight
    cell.classList.add('flash-highlight');
    setTimeout(() => cell.classList.remove('flash-highlight'), 1500);
  }
};
```

### CSS for Flash Highlight

```css
@keyframes flash-highlight {
  0% { background-color: rgba(59, 130, 246, 0.5); }
  100% { background-color: transparent; }
}

.flash-highlight {
  animation: flash-highlight 1.5s ease-out;
}
```

### Changes Required:

#### 1. Add cell IDs to ProjectionsTable
**File**: `src/components/ProjectionsTable/index.jsx`

```jsx
<td
  key={d.year}
  id={`cell-${row.key}-${d.year}`}
  onClick={() => onInspect(row.key, d.year, d)}
  className={`... ${highlightedCell?.field === row.key && highlightedCell?.year === d.year ? 'ring-2 ring-blue-500' : ''}`}
>
  {formatValue(displayValue, row.format)}
</td>
```

#### 2. Expose scrollToCell from App
**File**: `src/App.jsx`

```jsx
const tableRef = useRef(null);

const scrollToCell = useCallback((field, year) => {
  const cellId = `cell-${field}-${year}`;
  const cell = document.getElementById(cellId);
  if (cell) {
    cell.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    cell.classList.add('flash-highlight');
    setTimeout(() => cell.classList.remove('flash-highlight'), 1500);
  }
}, []);

const handleInspectorNavigate = (field, year) => {
  const data = projections.find(p => p.year === year);
  if (data) {
    setInspectorState({ isOpen: true, field, year, data });
    scrollToCell(field, year);
  }
};
```

### Implementation Details (Critical)

**1. Expand Collapsed Sections Before Scrolling:**

The existing `ProjectionsTable` has a `collapsedSections` state keyed by section title. When navigating to a cell in a collapsed section, we must expand it first:

```jsx
// Add to App.jsx or create a shared context
const expandSectionForField = useCallback((field) => {
  // Find which section contains this field
  const section = SECTIONS.find(s => s.rows.some(r => r.key === field));
  if (section && collapsedSections[section.title]) {
    setCollapsedSections(prev => ({ ...prev, [section.title]: false }));
    // Return true to indicate we expanded - caller should wait for render
    return true;
  }
  return false;
}, [collapsedSections]);

const scrollToCell = useCallback((field, year) => {
  const didExpand = expandSectionForField(field);

  // If we expanded a section, wait for DOM update before scrolling
  const doScroll = () => {
    const cell = document.querySelector(`[data-cell="${field}-${year}"]`);
    if (cell) {
      cell.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      cell.classList.add('flash-highlight');
      setTimeout(() => cell.classList.remove('flash-highlight'), 1500);
    }
  };

  if (didExpand) {
    // Wait for React to re-render the expanded section
    requestAnimationFrame(() => requestAnimationFrame(doScroll));
  } else {
    doScroll();
  }
}, [expandSectionForField]);
```

**2. Handle Sticky Headers:**

If table has sticky year headers, `scrollIntoView` might scroll under them:

```jsx
// Calculate offset for sticky header
const scrollToCell = (field, year) => {
  const cell = document.querySelector(`[data-cell="${field}-${year}"]`);
  const stickyHeaderHeight = 48; // Height of sticky header row

  if (cell) {
    const rect = cell.getBoundingClientRect();
    const scrollContainer = document.querySelector('[data-table-container]');

    scrollContainer.scrollTo({
      top: scrollContainer.scrollTop + rect.top - stickyHeaderHeight - 20,
      left: scrollContainer.scrollLeft + rect.left - 100,
      behavior: 'smooth'
    });
    // ... flash highlight
  }
};
```

**3. Skip Flash for Already-Visible Cells:**

```jsx
const isInViewport = (cell) => {
  const rect = cell.getBoundingClientRect();
  const container = document.querySelector('[data-table-container]');
  const containerRect = container.getBoundingClientRect();

  return rect.top >= containerRect.top &&
         rect.bottom <= containerRect.bottom &&
         rect.left >= containerRect.left &&
         rect.right <= containerRect.right;
};

// Only scroll if not visible, but always flash
if (!isInViewport(cell)) {
  cell.scrollIntoView(...);
}
cell.classList.add('flash-highlight');
```

### Success Criteria:

#### Manual Verification:
- [x] Clicking dependency in inspector scrolls table to that cell
- [x] Cell flashes blue briefly after scroll
- [x] Works for cells in different year columns
- [x] Works for cells in collapsed sections (expands section first)
- [x] Sticky headers don't obscure scrolled-to cells

---

## Phase 4: Dependency List with Jump-to-Cell

### Overview
Show inputs (what feeds into this) and outputs (what depends on this) as clickable lists.

### Design

```
┌─────────────────────────────────────────────┐
│ INPUTS (click to jump):                     │
│ ├─ federalTax    $8,200 (2025)    [↗]      │
│ ├─ ltcgTax       $3,400 (2025)    [↗]      │
│ ├─ niit             $0 (2025)     [↗]      │
│ └─ stateTax      $2,600 (2025)    [↗]      │
│                                             │
│ OUTPUTS (this feeds into):                  │
│ ├─ totalWithdrawal   (same year)  [↗]      │
│ └─ heirValue         (same year)  [↗]      │
└─────────────────────────────────────────────┘
```

### Changes Required:

**File**: `src/components/InspectorPanel/DependencyList.jsx` (new)

```jsx
export function DependencyList({ field, year, allProjections, onNavigate }) {
  const data = allProjections.find(p => p.year === year);
  const inputs = CELL_DEPENDENCIES[field]?.(year, data, allProjections) || [];
  const outputs = getReverseDependencies(field, year, allProjections);

  return (
    <div className="space-y-4">
      {/* Inputs */}
      {inputs.length > 0 && (
        <div>
          <h4 className="text-slate-500 text-xs uppercase mb-2">
            Inputs (click to jump)
          </h4>
          <div className="space-y-1">
            {inputs.map(dep => {
              const depData = allProjections.find(p => p.year === dep.year);
              const value = depData?.[dep.field] || 0;
              const label = CALCULATIONS[dep.field]?.name || dep.field;
              const yearDiff = dep.year !== year ? ` (${dep.year})` : '';
              // Use existing getDependencySign() to show +/- contribution
              const sign = getDependencySign(dep.field, field);

              return (
                <button
                  key={`${dep.field}-${dep.year}`}
                  onClick={() => onNavigate(dep.field, dep.year)}
                  className="w-full flex items-center justify-between p-2 rounded
                             bg-slate-800 hover:bg-slate-700 text-left group"
                >
                  <span className="flex items-center gap-2">
                    <span className={`text-xs font-mono w-4 ${
                      sign === '+' ? 'text-green-400' : 'text-red-400'
                    }`}>{sign}</span>
                    <span className="text-slate-300 text-sm">{label}{yearDiff}</span>
                  </span>
                  <span className="text-amber-400 text-sm font-mono">{formatK(value)}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Outputs */}
      {outputs.length > 0 && (
        <div>
          <h4 className="text-slate-500 text-xs uppercase mb-2">
            This feeds into
          </h4>
          <div className="space-y-1">
            {outputs.map(dep => {
              const label = CALCULATIONS[dep.field]?.name || dep.field;
              const yearDiff = dep.year !== year ? ` (${dep.year})` : ' (same year)';

              return (
                <button
                  key={`${dep.field}-${dep.year}`}
                  onClick={() => onNavigate(dep.field, dep.year)}
                  className="w-full flex items-center justify-between p-2 rounded
                             bg-slate-800 hover:bg-slate-700 text-left"
                >
                  <span className="text-slate-300 text-sm">{label}</span>
                  <span className="text-slate-500 text-xs">{yearDiff}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
```

### Implementation Details (Critical)

**1. Show Dependency Signs (+/-):**

The existing `getDependencySign()` function in `calculationDependencies.js` returns `'+'` or `'-'` for each dependency. Use this to show whether each input adds or subtracts:

```jsx
import { getDependencySign } from '@/lib/calculationDependencies';

// In dependency list item:
const sign = getDependencySign(dep.field, field); // field = parent being calculated
// Render: <span className="text-green-400">+</span> or <span className="text-red-400">-</span>
```

**2. Group Long Dependency Lists:**

Some fields like `atWithdrawal` have 6+ dependencies. Group by category:

```jsx
const groupDependencies = (deps, field) => {
  // Group by type: income sources, account balances, tax-related
  const groups = {
    'Account Balances': deps.filter(d => d.field.includes('BOY') || d.field.includes('EOY')),
    'Income': deps.filter(d => ['ssAnnual', 'rmdRequired'].includes(d.field)),
    'Expenses': deps.filter(d => ['expenses', 'totalTax', 'irmaaTotal'].includes(d.field)),
    'Other': deps.filter(d => !/* matched above */),
  };
  return Object.entries(groups).filter(([_, deps]) => deps.length > 0);
};
```

**3. Prevent Circular Navigation Loops:**

Track navigation path and warn if user is going in circles:

```jsx
const [navPath, setNavPath] = useState([]); // [{field, year}, ...]

const handleNavigate = (field, year) => {
  const key = `${field}-${year}`;
  const isLoop = navPath.some(p => `${p.field}-${p.year}` === key);

  if (isLoop && navPath.length > 2) {
    // Show subtle indicator that user is revisiting
    // Don't block, just inform
  }

  setNavPath(prev => [...prev.slice(-5), { field, year }]); // Keep last 5
  onNavigate(field, year);
};
```

**4. Handle Empty States:**

```jsx
{inputs.length === 0 && outputs.length === 0 && (
  <div className="text-slate-500 text-sm italic">
    This is a base input value with no calculation dependencies.
  </div>
)}
```

---

## Phase 5: Tax Table Viewer

### Overview
A dedicated panel/modal showing the actual tax tables used in calculations, with "you are here" indicators.

### Available Tables (from taxTables.js)

| Table | Data Available |
|-------|----------------|
| Federal Income Tax Brackets | MFJ + Single, 2024 base + inflation |
| Long-Term Capital Gains | MFJ + Single, 2024 base |
| Standard Deduction | MFJ + Single + senior bonus |
| IRMAA (Medicare) | MFJ + Single, Part B + Part D monthly |
| RMD (Uniform Lifetime) | Ages 72-120, factors |
| Beneficiary SLE | Ages 20-90, factors |
| Social Security Taxation | MFJ + Single thresholds |
| NIIT | Rate (3.8%) + thresholds |
| Illinois State Tax | Flat rate (4.95%) |

### Tax Table Viewer Component

**File**: `src/components/TaxTableViewer/index.jsx` (new)

```jsx
const TAX_TABLE_TABS = [
  { id: 'federal', label: 'Federal Income' },
  { id: 'ltcg', label: 'Capital Gains' },
  { id: 'irmaa', label: 'IRMAA' },
  { id: 'rmd', label: 'RMD' },
  { id: 'ss', label: 'Social Security' },
  { id: 'state', label: 'State Tax' },
];

export function TaxTableViewer({ isOpen, onClose, context }) {
  const [activeTab, setActiveTab] = useState('federal');
  const { taxableIncome, magi, age, filingStatus } = context || {};

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-slate-900 border border-slate-700 rounded-lg w-[800px] max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-lg font-medium">Tax Reference Tables</h2>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700">
          {TAX_TABLE_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm ${activeTab === tab.id
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-slate-400'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'federal' && (
            <FederalBracketsTable
              taxableIncome={taxableIncome}
              filingStatus={filingStatus}
            />
          )}
          {activeTab === 'ltcg' && (
            <CapitalGainsTable filingStatus={filingStatus} />
          )}
          {activeTab === 'irmaa' && (
            <IRMAATable magi={magi} filingStatus={filingStatus} />
          )}
          {activeTab === 'rmd' && (
            <RMDTable age={age} />
          )}
          {activeTab === 'ss' && (
            <SocialSecurityTaxTable filingStatus={filingStatus} />
          )}
          {activeTab === 'state' && (
            <StateTaxTable />
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-700 flex gap-4 text-xs text-slate-500">
          <button className="hover:text-slate-400">Download as CSV</button>
          <button className="hover:text-slate-400">Compare to Prior Year</button>
          <a href="https://www.irs.gov/pub/irs-pdf/p17.pdf" target="_blank"
             className="hover:text-slate-400">
            IRS Publication 17 ↗
          </a>
        </div>
      </div>
    </div>
  );
}
```

### Federal Brackets Table with "You Are Here"

**File**: `src/components/TaxTableViewer/FederalBracketsTable.jsx` (new)

```jsx
export function FederalBracketsTable({ taxableIncome, filingStatus = 'mfj', projectionYear = 2025 }) {
  // Get inflated brackets for the projection year
  const baseYear = 2024;
  const yearsToInflate = projectionYear - baseYear;
  const baseBrackets = filingStatus === 'single'
    ? FEDERAL_BRACKETS_SINGLE_2024
    : FEDERAL_BRACKETS_MFJ_2024;
  const brackets = inflateBrackets(baseBrackets, 0.028, yearsToInflate); // ~2.8% inflation

  // Find user's bracket
  const userBracketIndex = brackets.findIndex((b, i) => {
    const nextThreshold = brackets[i + 1]?.threshold || Infinity;
    return taxableIncome >= b.threshold && taxableIncome < nextThreshold;
  });

  // Calculate tax at each bracket boundary
  let cumulativeTax = 0;
  const bracketsWithTax = brackets.map((bracket, i) => {
    const result = { ...bracket, taxAtBottom: cumulativeTax };
    if (i > 0) {
      const prevBracket = brackets[i - 1];
      const incomeInBracket = bracket.threshold - prevBracket.threshold;
      cumulativeTax += incomeInBracket * prevBracket.rate;
    }
    result.taxAtBottom = cumulativeTax;
    return result;
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-slate-200 font-medium">
          Federal Income Tax Brackets ({projectionYear}, {filingStatus === 'single' ? 'Single' : 'MFJ'})
        </h3>
        <span className="text-slate-500 text-xs">
          Source: IRS Rev. Proc. 2024-40 + inflation adjustment
        </span>
      </div>

      {/* Visual bracket indicator */}
      {taxableIncome && (
        <div className="bg-slate-800 rounded p-3">
          <div className="text-slate-400 text-sm mb-2">Your Position:</div>
          <div className="flex h-6 rounded overflow-hidden">
            {bracketsWithTax.map((bracket, i) => {
              const nextThreshold = bracketsWithTax[i + 1]?.threshold || bracket.threshold * 1.5;
              const width = Math.min((nextThreshold - bracket.threshold) / 10000, 100);
              const isUserBracket = i === userBracketIndex;

              return (
                <div
                  key={i}
                  className={`relative ${isUserBracket ? 'bg-blue-600' : 'bg-slate-700'}`}
                  style={{ width: `${width}%`, minWidth: '30px' }}
                >
                  <span className="absolute inset-0 flex items-center justify-center text-xs">
                    {(bracket.rate * 100).toFixed(0)}%
                  </span>
                </div>
              );
            })}
          </div>
          <div className="text-emerald-400 text-sm mt-2">
            Taxable income: {formatCurrency(taxableIncome)} → {(bracketsWithTax[userBracketIndex]?.rate * 100).toFixed(0)}% marginal bracket
          </div>
        </div>
      )}

      {/* Table */}
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-500 border-b border-slate-700">
            <th className="py-2">Taxable Income Range</th>
            <th className="py-2 text-right">Rate</th>
            <th className="py-2 text-right">Tax at Bottom</th>
          </tr>
        </thead>
        <tbody>
          {bracketsWithTax.map((bracket, i) => {
            const nextThreshold = bracketsWithTax[i + 1]?.threshold;
            const isUserBracket = i === userBracketIndex;

            return (
              <tr
                key={i}
                className={`border-b border-slate-800 ${isUserBracket ? 'bg-blue-900/30' : ''}`}
              >
                <td className="py-2">
                  {formatCurrency(bracket.threshold)}
                  {nextThreshold ? ` - ${formatCurrency(nextThreshold - 1)}` : '+'}
                  {isUserBracket && (
                    <span className="ml-2 text-blue-400 text-xs">◄ You</span>
                  )}
                </td>
                <td className="py-2 text-right font-mono">
                  {(bracket.rate * 100).toFixed(0)}%
                </td>
                <td className="py-2 text-right font-mono text-slate-400">
                  {formatCurrency(bracket.taxAtBottom)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Standard deduction note */}
      <div className="text-slate-500 text-xs">
        Standard Deduction ({projectionYear} MFJ): {formatCurrency(STANDARD_DEDUCTION_MFJ_2024 * (1.028 ** yearsToInflate))}
        <br />
        Additional for 65+: {formatCurrency(SENIOR_BONUS_MFJ_2024)} per spouse
      </div>

      {/* Distance to next bracket */}
      {taxableIncome && userBracketIndex < bracketsWithTax.length - 1 && (
        <div className="bg-slate-800 rounded p-3 text-sm">
          <span className="text-slate-400">Distance to next bracket:</span>
          <span className="text-amber-400 ml-2 font-mono">
            {formatCurrency(bracketsWithTax[userBracketIndex + 1].threshold - taxableIncome)}
          </span>
          <span className="text-slate-500 ml-2">
            more taxable income to reach {(bracketsWithTax[userBracketIndex + 1].rate * 100).toFixed(0)}%
          </span>
        </div>
      )}
    </div>
  );
}
```

### IRMAA Table with "You Are Here"

**File**: `src/components/TaxTableViewer/IRMAATable.jsx` (new)

```jsx
export function IRMAATable({ magi, filingStatus = 'mfj' }) {
  const brackets = filingStatus === 'single'
    ? IRMAA_BRACKETS_SINGLE_2026
    : IRMAA_BRACKETS_MFJ_2026;

  // Find user's tier
  const userTierIndex = brackets.findIndex((b, i) => {
    const nextThreshold = brackets[i + 1]?.threshold || Infinity;
    return magi >= b.threshold && magi < nextThreshold;
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-slate-200 font-medium">
          IRMAA Medicare Premium Brackets (2026)
        </h3>
        <span className="text-slate-500 text-xs">
          Based on 2024 MAGI (2-year lookback)
        </span>
      </div>

      {magi && (
        <div className="bg-slate-800 rounded p-3 text-sm">
          <span className="text-slate-400">Your 2024 MAGI:</span>
          <span className="text-amber-400 ml-2 font-mono">{formatCurrency(magi)}</span>
          <span className="text-slate-500 ml-2">
            → Tier {userTierIndex} ({userTierIndex === 0 ? 'Standard' : `${(userTierIndex * 0.6 + 0.8).toFixed(1)}x`})
          </span>
        </div>
      )}

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-500 border-b border-slate-700">
            <th className="py-2">MAGI Threshold ({filingStatus === 'single' ? 'Single' : 'MFJ'})</th>
            <th className="py-2 text-right">Part B (/mo)</th>
            <th className="py-2 text-right">Part D (/mo)</th>
            <th className="py-2 text-right">Annual Total</th>
          </tr>
        </thead>
        <tbody>
          {brackets.map((bracket, i) => {
            const isUserTier = i === userTierIndex;
            const annualTotal = (bracket.partB + bracket.partD) * 12;
            const nextThreshold = brackets[i + 1]?.threshold;

            return (
              <tr
                key={i}
                className={`border-b border-slate-800 ${isUserTier ? 'bg-blue-900/30' : ''}`}
              >
                <td className="py-2">
                  {i === 0 ? (
                    `≤ ${formatCurrency(brackets[1]?.threshold - 1 || 0)}`
                  ) : nextThreshold ? (
                    `${formatCurrency(bracket.threshold)} - ${formatCurrency(nextThreshold - 1)}`
                  ) : (
                    `≥ ${formatCurrency(bracket.threshold)}`
                  )}
                  {isUserTier && (
                    <span className="ml-2 text-blue-400 text-xs">◄ You</span>
                  )}
                </td>
                <td className="py-2 text-right font-mono">${bracket.partB.toFixed(2)}</td>
                <td className="py-2 text-right font-mono">${bracket.partD.toFixed(2)}</td>
                <td className="py-2 text-right font-mono text-amber-400">
                  {formatCurrency(annualTotal)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Distance to next tier */}
      {magi && userTierIndex < brackets.length - 1 && (
        <div className="bg-slate-800 rounded p-3 text-sm">
          <span className="text-slate-400">Distance to next tier:</span>
          <span className="text-amber-400 ml-2 font-mono">
            {formatCurrency(brackets[userTierIndex + 1].threshold - magi)}
          </span>
          <span className="text-slate-500 ml-2">
            below Tier {userTierIndex + 1} threshold
          </span>
        </div>
      )}

      <div className="text-slate-500 text-xs">
        Note: IRMAA is based on MAGI from 2 years prior.
        Your 2026 premiums are based on your 2024 tax return.
      </div>
    </div>
  );
}
```

### RMD Table

**File**: `src/components/TaxTableViewer/RMDTable.jsx` (new)

```jsx
export function RMDTable({ age, iraBalance }) {
  // Show subset of table around user's age
  const startAge = Math.max(72, (age || 73) - 3);
  const endAge = Math.min(120, startAge + 15);

  const tableRows = [];
  for (let a = startAge; a <= endAge; a++) {
    if (RMD_TABLE[a]) {
      tableRows.push({
        age: a,
        factor: RMD_TABLE[a],
        rmdPercent: (100 / RMD_TABLE[a]).toFixed(2),
        rmdAmount: iraBalance ? Math.round(iraBalance / RMD_TABLE[a]) : null,
      });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-slate-200 font-medium">
          RMD Uniform Lifetime Table
        </h3>
        <span className="text-slate-500 text-xs">
          Source: IRS Publication 590-B, Table III
        </span>
      </div>

      {age && age >= 73 && iraBalance && (
        <div className="bg-slate-800 rounded p-3 text-sm">
          <div className="text-slate-400">Your RMD (Age {age}):</div>
          <div className="text-2xl font-mono text-amber-400 mt-1">
            {formatCurrency(Math.round(iraBalance / RMD_TABLE[age]))}
          </div>
          <div className="text-slate-500 text-xs mt-1">
            = {formatCurrency(iraBalance)} ÷ {RMD_TABLE[age]} factor
          </div>
        </div>
      )}

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-500 border-b border-slate-700">
            <th className="py-2">Age</th>
            <th className="py-2 text-right">Life Expectancy Factor</th>
            <th className="py-2 text-right">RMD % of Balance</th>
            {iraBalance && <th className="py-2 text-right">Your RMD</th>}
          </tr>
        </thead>
        <tbody>
          {tableRows.map(row => {
            const isUserAge = row.age === age;
            return (
              <tr
                key={row.age}
                className={`border-b border-slate-800 ${isUserAge ? 'bg-blue-900/30' : ''}`}
              >
                <td className="py-2">
                  {row.age}
                  {isUserAge && <span className="ml-2 text-blue-400 text-xs">◄ You</span>}
                </td>
                <td className="py-2 text-right font-mono">{row.factor}</td>
                <td className="py-2 text-right font-mono">{row.rmdPercent}%</td>
                {iraBalance && (
                  <td className="py-2 text-right font-mono text-amber-400">
                    {formatCurrency(row.rmdAmount)}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="text-slate-500 text-xs">
        RMDs begin at age 73 (SECURE 2.0 Act).
        The factor decreases each year, increasing the required distribution percentage.
      </div>
    </div>
  );
}
```

### Missing Table Components (Required)

**File**: `src/components/TaxTableViewer/CapitalGainsTable.jsx`

```jsx
export function CapitalGainsTable({ taxableIncome, filingStatus = 'mfj', projectionYear = 2025 }) {
  const baseBrackets = filingStatus === 'single'
    ? LTCG_BRACKETS_SINGLE_2024
    : LTCG_BRACKETS_MFJ_2024;
  const brackets = inflateBrackets(baseBrackets, 0.028, projectionYear - 2024);

  const userBracketIndex = brackets.findIndex((b, i) => {
    const next = brackets[i + 1]?.threshold || Infinity;
    return taxableIncome >= b.threshold && taxableIncome < next;
  });

  return (
    <div className="space-y-4">
      <h3 className="text-slate-200 font-medium">
        Long-Term Capital Gains Rates ({projectionYear})
      </h3>

      <div className="bg-slate-800 rounded p-3 text-sm">
        <span className="text-slate-400">Your rate:</span>
        <span className="text-emerald-400 ml-2 text-lg font-mono">
          {(brackets[userBracketIndex]?.rate * 100).toFixed(0)}%
        </span>
        <span className="text-slate-500 ml-2">
          (based on {formatCurrency(taxableIncome)} taxable income)
        </span>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-500 border-b border-slate-700">
            <th className="py-2">Taxable Income Range</th>
            <th className="py-2 text-right">LTCG Rate</th>
          </tr>
        </thead>
        <tbody>
          {brackets.map((b, i) => {
            const next = brackets[i + 1]?.threshold;
            const isUser = i === userBracketIndex;
            return (
              <tr key={i} className={isUser ? 'bg-blue-900/30' : ''}>
                <td className="py-2">
                  {formatCurrency(b.threshold)} - {next ? formatCurrency(next - 1) : '∞'}
                  {isUser && <span className="ml-2 text-blue-400 text-xs">◄ You</span>}
                </td>
                <td className="py-2 text-right font-mono">
                  {(b.rate * 100).toFixed(0)}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="text-slate-500 text-xs">
        Note: LTCG rates apply to the gain portion only. Your total income
        determines which rate applies to your capital gains.
      </div>
    </div>
  );
}
```

**File**: `src/components/TaxTableViewer/SocialSecurityTaxTable.jsx`

```jsx
export function SocialSecurityTaxTable({ combinedIncome, ssIncome, filingStatus = 'mfj' }) {
  const thresholds = filingStatus === 'single'
    ? SS_TAX_THRESHOLDS_SINGLE
    : SS_TAX_THRESHOLDS_MFJ;

  // Calculate taxable portion
  let taxablePercent = 0;
  if (combinedIncome > thresholds.tier2) {
    taxablePercent = 85;
  } else if (combinedIncome > thresholds.tier1) {
    taxablePercent = 50;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-slate-200 font-medium">
        Social Security Taxation Thresholds
      </h3>

      <div className="text-slate-500 text-xs mb-2">
        Combined Income = AGI + Nontaxable Interest + ½ of Social Security
      </div>

      {combinedIncome && (
        <div className="bg-slate-800 rounded p-3 text-sm">
          <div className="text-slate-400">Your Combined Income:</div>
          <div className="text-amber-400 text-lg font-mono">{formatCurrency(combinedIncome)}</div>
          <div className="text-emerald-400 mt-1">
            → {taxablePercent}% of your ${formatK(ssIncome)} SS is taxable
            = {formatCurrency(ssIncome * taxablePercent / 100)} taxable
          </div>
        </div>
      )}

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-500 border-b border-slate-700">
            <th className="py-2">Combined Income ({filingStatus === 'single' ? 'Single' : 'MFJ'})</th>
            <th className="py-2 text-right">SS Taxable</th>
          </tr>
        </thead>
        <tbody>
          <tr className={combinedIncome <= thresholds.tier1 ? 'bg-blue-900/30' : ''}>
            <td className="py-2">Below {formatCurrency(thresholds.tier1)}</td>
            <td className="py-2 text-right">0%</td>
          </tr>
          <tr className={combinedIncome > thresholds.tier1 && combinedIncome <= thresholds.tier2 ? 'bg-blue-900/30' : ''}>
            <td className="py-2">{formatCurrency(thresholds.tier1)} - {formatCurrency(thresholds.tier2)}</td>
            <td className="py-2 text-right">Up to 50%</td>
          </tr>
          <tr className={combinedIncome > thresholds.tier2 ? 'bg-blue-900/30' : ''}>
            <td className="py-2">Above {formatCurrency(thresholds.tier2)}</td>
            <td className="py-2 text-right">Up to 85%</td>
          </tr>
        </tbody>
      </table>

      <div className="text-slate-500 text-xs">
        Note: These thresholds are NOT indexed for inflation.
        Source: IRS Publication 915
      </div>
    </div>
  );
}
```

**File**: `src/components/TaxTableViewer/StateTaxTable.jsx`

```jsx
export function StateTaxTable({ stateIncome }) {
  return (
    <div className="space-y-4">
      <h3 className="text-slate-200 font-medium">
        Illinois State Income Tax
      </h3>

      <div className="bg-slate-800 rounded p-3">
        <div className="text-4xl font-mono text-amber-400">4.95%</div>
        <div className="text-slate-400 text-sm mt-1">Flat rate on taxable income</div>
      </div>

      {stateIncome > 0 && (
        <div className="bg-slate-800 rounded p-3 text-sm">
          <span className="text-slate-400">Your IL tax:</span>
          <span className="text-amber-400 ml-2 font-mono">
            {formatCurrency(stateIncome)} × 4.95% = {formatCurrency(stateIncome * 0.0495)}
          </span>
        </div>
      )}

      <div className="text-emerald-400 text-sm">
        ✓ Illinois exempts retirement income from state tax:
      </div>
      <ul className="text-slate-400 text-sm list-disc list-inside">
        <li>Social Security benefits</li>
        <li>IRA/401(k) distributions</li>
        <li>Pension income</li>
      </ul>
      <div className="text-slate-500 text-xs mt-2">
        Only investment income (capital gains, dividends, interest) is taxed.
      </div>
    </div>
  );
}
```

### Implementation Details (Critical)

**1. Year Selector for Tax Tables:**

Tax tables change year-to-year. Add a year selector in the header:

```jsx
// In TaxTableViewer
const [viewYear, setViewYear] = useState(context?.year || new Date().getFullYear());

// Header modification:
<div className="flex items-center justify-between p-4 border-b border-slate-700">
  <h2 className="text-lg font-medium">Tax Reference Tables</h2>
  <div className="flex items-center gap-4">
    <select
      value={viewYear}
      onChange={(e) => setViewYear(Number(e.target.value))}
      className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm"
    >
      {Array.from({ length: 30 }, (_, i) => 2025 + i).map(y => (
        <option key={y} value={y}>{y}</option>
      ))}
    </select>
    <button onClick={onClose}><X className="w-5 h-5" /></button>
  </div>
</div>

// Pass to child tables:
<FederalBracketsTable projectionYear={viewYear} ... />
```

**2. Context Object Structure:**

Define clearly what the TaxTableViewer expects:

```typescript
interface TaxTableContext {
  year: number;              // Current projection year being viewed
  age: number;               // User's age for RMD
  filingStatus: 'mfj' | 'single';  // From params or survivor scenario
  taxableIncome: number;     // For federal/LTCG bracket lookup
  magi: number;              // For IRMAA (2-year lookback applied)
  iraBalance: number;        // For RMD calculation
  ssIncome: number;          // For SS taxation
  combinedIncome: number;    // For SS taxation threshold
  stateIncome: number;       // For state tax (IL taxable portion)
}
```

**3. Open from Inspector Panel:**

Add context-aware open from the inspector:

```jsx
// In InspectorPanel
const openTaxTables = () => {
  // Determine which tab to open based on current field
  const fieldToTab = {
    federalTax: 'federal',
    ltcgTax: 'ltcg',
    irmaaTotal: 'irmaa',
    irmaaPartB: 'irmaa',
    irmaaPartD: 'irmaa',
    rmdRequired: 'rmd',
    taxableSS: 'ss',
    stateTax: 'state',
  };
  const initialTab = fieldToTab[activeField] || 'federal';

  setTaxTableState({
    isOpen: true,
    initialTab,
    context: {
      year: activeYear,
      age: activeData.age,
      filingStatus: getFilingStatusForYear(activeYear, params),
      taxableIncome: activeData.taxableOrdinary,
      magi: activeData.irmaaMAGI,
      iraBalance: activeData.iraBOY,
      ssIncome: activeData.ssAnnual,
      combinedIncome: activeData.ordinaryIncome + activeData.ssAnnual * 0.5,
      stateIncome: activeData.capitalGains, // IL only taxes investment income
    },
  });
};
```

### Success Criteria:

#### Automated Verification:
- [ ] `npm run build` succeeds
- [ ] Tax table data imports correctly
- [ ] Inflation adjustment calculates properly

#### Manual Verification:
- [ ] All 6 tax table tabs display correctly
- [ ] "You are here" indicator highlights correct bracket/tier
- [ ] "Distance to next bracket" shows meaningful information
- [ ] Source citations are accurate
- [ ] External links work (IRS publications)
- [ ] Year selector updates all tables
- [ ] Opening from inspector shows relevant tab

---

## Phase 6: Section Reorganization

### Overview
Reorganize the 10 current sections into 5 flow-centric sections that tell the story of a retirement year.

### New Section Structure

| New Section | Question | Contains |
|-------------|----------|----------|
| **Accounts** | What do you have? | BOY balances, EOY balances, cost basis |
| **Income & Withdrawals** | What's coming in? | SS, RMD, withdrawals, Roth conversions |
| **Expenses & Taxes** | What's going out? | Living expenses, taxes, IRMAA, property tax |
| **Legacy** | What's left for heirs? | Heir value calculation |
| **Metrics** | How is it trending? | Cumulative totals, rates, percentages |

### Row Organization with Visual Hierarchy

```
━━━ ACCOUNTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
│ Total Start       $1,800,000 │ ← Summary row (bold)
│ Total End         $1,790,000 │   (-$10K, -0.6%)
├─────────────────────────────────────────────────────────────────────────
│ ├─ Taxable           $400K → $385K │ ← Detail rows (normal)
│ ├─ Traditional IRA  $1,000K → $980K │
│ └─ Roth IRA          $400K → $425K │
│ Cost Basis           $250K → $240K │ ← Dim (advanced)

━━━ INCOME & WITHDRAWALS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
│ Total Cash In        $98,400 │ ← Summary
├─────────────────────────────────────────────────────────────────────────
│ ├─ Social Security   $38,400 │
│ ├─ RMD Required      $40,000 │
│ ├─ Total Withdrawal  $60,000 │
│   ├─ From Taxable    $20,000 │ ← Indented sub-detail
│   ├─ From IRA        $40,000 │
│   └─ From Roth          $0  │
│ Roth Conversion      $50,000 │ ← Highlighted (strategic)

━━━ EXPENSES & TAXES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
│ Total Cash Out       $98,400 │ ← Summary
├─────────────────────────────────────────────────────────────────────────
│ ├─ Living Expenses   $72,000 │
│ ├─ Total Tax         $14,200 │ ← Expandable subsection
│   ├─ Federal Tax      $8,200 │
│   ├─ LTCG Tax         $3,400 │
│   ├─ NIIT                $0  │
│   └─ State Tax        $2,600 │
│ ├─ Medicare/IRMAA    $12,200 │ ← Expandable subsection
│   ├─ Part B           $8,400 │
│   └─ Part D           $3,800 │
│ └─ Property Tax           $0 │

━━━ LEGACY ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
│ After-Tax to Heirs $1,650,000 │

━━━ METRICS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
│ Cumulative Tax       $180,000 │
│ Cumulative IRMAA      $24,000 │
│ Roth % of Portfolio      24%  │
│ Effective Tax Rate      9.5%  │
```

### Changes Required:

**File**: `src/components/ProjectionsTable/sectionConfig.js` (new)

```javascript
export const STORY_SECTIONS = [
  {
    id: 'accounts',
    title: 'ACCOUNTS',
    collapsed: false,
    summaryRows: [
      { key: 'totalBOY', label: 'Total Start', format: '$' },
      { key: 'totalEOY', label: 'Total End', format: '$', showDelta: true },
    ],
    detailRows: [
      { key: 'atBOY', label: 'Taxable', format: '$', pair: 'atEOY' },
      { key: 'iraBOY', label: 'Traditional IRA', format: '$', pair: 'iraEOY' },
      { key: 'rothBOY', label: 'Roth IRA', format: '$', pair: 'rothEOY' },
    ],
    advancedRows: [
      { key: 'costBasisBOY', label: 'Cost Basis', format: '$', pair: 'costBasisEOY', dim: true },
      { key: 'rothPercent', label: 'Roth %', format: '%', dim: true },
    ],
  },
  {
    id: 'income',
    title: 'INCOME & WITHDRAWALS',
    collapsed: false,
    summaryRows: [
      { key: 'totalCashIn', label: 'Total Cash In', format: '$', computed: true },
    ],
    detailRows: [
      { key: 'ssAnnual', label: 'Social Security', format: '$' },
      { key: 'rmdRequired', label: 'RMD Required', format: '$' },
      { key: 'totalWithdrawal', label: 'Total Withdrawal', format: '$' },
    ],
    nestedRows: {
      totalWithdrawal: [
        { key: 'atWithdrawal', label: 'From Taxable', format: '$' },
        { key: 'iraWithdrawal', label: 'From IRA', format: '$' },
        { key: 'rothWithdrawal', label: 'From Roth', format: '$' },
      ],
    },
    advancedRows: [
      { key: 'rothConversion', label: 'Roth Conversion', format: '$', highlight: true },
    ],
  },
  {
    id: 'expenses',
    title: 'EXPENSES & TAXES',
    collapsed: false,
    summaryRows: [
      { key: 'totalCashOut', label: 'Total Cash Out', format: '$', computed: true },
    ],
    detailRows: [
      { key: 'expenses', label: 'Living Expenses', format: '$' },
      { key: 'totalTax', label: 'Total Tax', format: '$', expandable: true },
      { key: 'irmaaTotal', label: 'Medicare/IRMAA', format: '$', expandable: true },
      { key: 'propertyTax', label: 'Property Tax', format: '$' },
    ],
    nestedRows: {
      totalTax: [
        { key: 'federalTax', label: 'Federal Tax', format: '$' },
        { key: 'ltcgTax', label: 'LTCG Tax', format: '$' },
        { key: 'niit', label: 'NIIT', format: '$' },
        { key: 'stateTax', label: 'State Tax', format: '$' },
      ],
      irmaaTotal: [
        { key: 'irmaaPartB', label: 'Part B', format: '$' },
        { key: 'irmaaPartD', label: 'Part D', format: '$' },
      ],
    },
    advancedRows: [
      { key: 'taxableSS', label: 'Taxable SS', format: '$', dim: true },
      { key: 'ordinaryIncome', label: 'Ordinary Income', format: '$', dim: true },
      { key: 'capitalGains', label: 'Capital Gains', format: '$', dim: true },
    ],
  },
  {
    id: 'legacy',
    title: 'LEGACY',
    collapsed: false,
    summaryRows: [
      { key: 'heirValue', label: 'After-Tax to Heirs', format: '$', highlight: true },
    ],
  },
  {
    id: 'metrics',
    title: 'METRICS',
    collapsed: true, // Start collapsed
    detailRows: [
      { key: 'cumulativeTax', label: 'Cumulative Tax', format: '$' },
      { key: 'cumulativeIRMAA', label: 'Cumulative IRMAA', format: '$' },
      { key: 'cumulativeCapitalGains', label: 'Cumulative Cap Gains', format: '$' },
      { key: 'effectiveTaxRate', label: 'Effective Tax Rate', format: '%', computed: true },
    ],
  },
];
```

### Implementation Details (Critical)

**1. Visual Hierarchy CSS:**

Define clear visual distinction between row types:

```jsx
// Row type styling
const rowStyles = {
  summary: 'font-semibold text-slate-100 bg-slate-800/50',
  detail: 'text-slate-300',
  nested: 'text-slate-400 text-sm pl-6', // Indented
  advanced: 'text-slate-500 text-sm italic', // Dimmer
  highlighted: 'bg-amber-900/20 text-amber-300', // Strategic actions
};

// Usage in row rendering:
<tr className={`${rowStyles[row.type]} ${row.highlight ? rowStyles.highlighted : ''}`}>
```

**2. Expandable Nested Rows:**

Implement expand/collapse for rows with children:

```jsx
const [expandedRows, setExpandedRows] = useState({
  totalTax: true,      // Start expanded
  irmaaTotal: true,    // Start expanded
  totalWithdrawal: false, // Start collapsed
});

const toggleRowExpand = (key) => {
  setExpandedRows(prev => ({ ...prev, [key]: !prev[key] }));
};

// In rendering:
{row.expandable && (
  <button
    onClick={(e) => { e.stopPropagation(); toggleRowExpand(row.key); }}
    className="mr-1"
  >
    {expandedRows[row.key] ? <ChevronDown /> : <ChevronRight />}
  </button>
)}

// Nested rows only shown when parent expanded:
{expandedRows[parentKey] && nestedRows[parentKey]?.map(nested => (
  <tr key={nested.key} className={rowStyles.nested}>...</tr>
))}
```

**3. BOY/EOY Paired Display:**

For account balances, show start → end in one row:

```jsx
// For rows with `pair` property
const renderPairedValue = (row, d) => {
  if (row.pair) {
    const startVal = d[row.key];
    const endVal = d[row.pair];
    const delta = endVal - startVal;
    const pct = startVal > 0 ? ((delta / startVal) * 100).toFixed(1) : 0;

    return (
      <span className="flex items-center gap-1">
        <span>{formatK(startVal)}</span>
        <span className="text-slate-600">→</span>
        <span>{formatK(endVal)}</span>
        <span className={`text-xs ${delta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          ({delta >= 0 ? '+' : ''}{formatK(delta)}, {pct}%)
        </span>
      </span>
    );
  }
  return formatK(d[row.key]);
};
```

**4. Advanced Rows Toggle:**

Add a "Show/Hide Advanced" toggle in section header:

```jsx
const [showAdvanced, setShowAdvanced] = useState(false);

// In section header:
<button
  onClick={() => setShowAdvanced(!showAdvanced)}
  className="text-xs text-slate-500 hover:text-slate-400"
>
  {showAdvanced ? 'Hide' : 'Show'} Advanced
</button>

// Only render advancedRows when toggled:
{showAdvanced && section.advancedRows?.map(row => ...)}
```

**5. Section Config Integration with Existing SECTIONS:**

The new `STORY_SECTIONS` config needs to map to existing field keys. Create a migration utility:

```jsx
// Validate all keys in STORY_SECTIONS exist in projections
const validateSectionConfig = (projectionSample) => {
  const allKeys = STORY_SECTIONS.flatMap(s => [
    ...(s.summaryRows || []).map(r => r.key),
    ...(s.detailRows || []).map(r => r.key),
    ...(s.advancedRows || []).map(r => r.key),
    ...Object.values(s.nestedRows || {}).flat().map(r => r.key),
  ]);

  const missing = allKeys.filter(k => !(k in projectionSample));
  if (missing.length > 0) {
    console.warn('Missing projection fields for new sections:', missing);
  }
  return missing.length === 0;
};
```

### Success Criteria:

#### Automated Verification:
- [ ] `npm run build` succeeds
- [ ] `npm run test:e2e` passes (update test expectations)
- [ ] All original data fields remain accessible
- [ ] Section config validation passes

#### Manual Verification:
- [ ] 5 sections tell a logical story
- [ ] Summary rows stand out visually (bold, background)
- [ ] Expandable subsections work (Tax, IRMAA)
- [ ] Advanced rows are dimmer but accessible
- [ ] BOY → EOY pairs show delta and percentage
- [ ] Show/Hide Advanced toggle works per section

---

## Phase 7: Hover Formula Preview

### Overview
Show a quick formula preview on hover without requiring a click.

### Accessibility Consideration
Hover-only tooltips are inaccessible to keyboard users. Implementation must support:
- **Keyboard**: Show tooltip when cell is focused (`onFocus`)
- **Touch**: Show tooltip on long-press (300ms hold)
- **Reduced motion**: No entrance animation, instant appear

```jsx
// Accessible tooltip trigger
const handleFocus = () => setShowTooltip(true);
const handleBlur = () => setShowTooltip(false);
const handleMouseEnter = () => hoverTimerRef.current = setTimeout(() => setShowTooltip(true), 300);
const handleMouseLeave = () => { clearTimeout(hoverTimerRef.current); setShowTooltip(false); };

<td
  tabIndex={0}
  onFocus={handleFocus}
  onBlur={handleBlur}
  onMouseEnter={handleMouseEnter}
  onMouseLeave={handleMouseLeave}
  aria-describedby={showTooltip ? `tooltip-${field}-${year}` : undefined}
>
  ...
</td>

{showTooltip && (
  <div id={`tooltip-${field}-${year}`} role="tooltip">
    ...
  </div>
)}
```

### Design

```
Hovering over totalTax cell:

┌────────────────────────────────────────────┐
│ Total Tax: $14,200                         │
│                                            │
│ = federalTax + ltcgTax + niit + stateTax   │
│ = $8,200 + $3,400 + $0 + $2,600            │
│                                            │
│ Effective rate: 9.5%                       │
│                                            │
│ [Click for full breakdown]                 │
└────────────────────────────────────────────┘
```

### Changes Required:

**File**: `src/components/ProjectionsTable/CellTooltip.jsx` (new)

```jsx
export function CellTooltip({ field, value, data, params, showPV }) {
  const calc = CALCULATIONS[field];
  if (!calc) return null;

  const computed = calc.compute(data, params, { showPV, discountRate: params.discountRate });

  return (
    <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2
                    w-72 bg-slate-800 border border-slate-600 rounded-lg
                    shadow-xl p-3 pointer-events-none">
      <div className="text-blue-400 font-medium text-sm">{calc.name}</div>
      <div className="text-2xl font-mono text-amber-400 mt-1">{computed.simple}</div>

      {computed.formula && (
        <div className="text-slate-400 text-xs font-mono mt-2">
          {computed.formula}
        </div>
      )}

      {computed.values && (
        <div className="text-slate-500 text-xs font-mono">
          = {computed.values}
        </div>
      )}

      {calc.backOfEnvelope && (
        <div className="text-slate-600 text-xs mt-2 italic">
          {calc.backOfEnvelope}
        </div>
      )}

      <div className="text-blue-400 text-xs mt-2">
        Click for full breakdown →
      </div>
    </div>
  );
}
```

### Implementation Details (Critical)

**1. Edge Detection for Tooltip Positioning:**

```jsx
const useTooltipPosition = (cellRef, tooltipRef) => {
  const [position, setPosition] = useState({ x: 0, y: 0, placement: 'top' });

  useEffect(() => {
    if (!cellRef.current || !tooltipRef.current) return;

    const cell = cellRef.current.getBoundingClientRect();
    const tooltip = tooltipRef.current.getBoundingClientRect();
    const viewport = { width: window.innerWidth, height: window.innerHeight };

    let placement = 'top';
    let x = cell.left + cell.width / 2 - tooltip.width / 2;
    let y = cell.top - tooltip.height - 8;

    // Flip to bottom if too close to top
    if (y < 0) {
      placement = 'bottom';
      y = cell.bottom + 8;
    }

    // Constrain horizontal to viewport
    x = Math.max(8, Math.min(x, viewport.width - tooltip.width - 8));

    setPosition({ x, y, placement });
  }, [cellRef, tooltipRef]);

  return position;
};
```

**2. Debounce Hover Events:**

Prevent rapid tooltip flickering:

```jsx
const useHoverDebounce = (delay = 300) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const timerRef = useRef(null);

  const handleMouseEnter = () => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setShowTooltip(true), delay);
  };

  const handleMouseLeave = () => {
    clearTimeout(timerRef.current);
    setShowTooltip(false);
  };

  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  return { showTooltip, handleMouseEnter, handleMouseLeave };
};
```

**3. Tooltip Portal:**

Render tooltip in a portal to avoid overflow:hidden issues:

```jsx
import { createPortal } from 'react-dom';

const TooltipPortal = ({ children, position }) => {
  return createPortal(
    <div
      className="fixed z-[9999]"
      style={{ left: position.x, top: position.y }}
    >
      {children}
    </div>,
    document.body
  );
};
```

**4. Click vs Hover Coordination:**

Ensure tooltip hides immediately on click:

```jsx
const handleClick = () => {
  clearTimeout(hoverTimerRef.current);
  setShowTooltip(false);
  onInspect(field, year, data);
};
```

### Implementation Notes:
- Show on hover with 300ms delay (avoid flicker)
- Hide when mouse leaves
- Position above cell by default, flip if near top edge
- Non-interactive (pointer-events: none)
- Use portal for rendering to avoid z-index/overflow issues

---

## Phase 8: Concise Term Reference

### Overview
Provide brief, technical definitions for financial terms on demand.

### Term Reference Component

**File**: `src/lib/termReference.js` (new)

```javascript
/**
 * Concise term definitions for technical users
 * Format: term -> { abbrev, definition, source? }
 */
export const TERM_REFERENCE = {
  // Tax & Income Terms
  RMD: {
    full: 'Required Minimum Distribution',
    definition: 'Minimum annual IRA withdrawal required by IRS after age 73. Calculated as: IRA balance ÷ Uniform Lifetime Table factor.',
    source: 'IRS Publication 590-B',
  },
  IRMAA: {
    full: 'Income-Related Monthly Adjustment Amount',
    definition: 'Medicare premium surcharge for higher earners. Based on MAGI from 2 years prior.',
    source: 'Medicare.gov',
  },
  MAGI: {
    full: 'Modified Adjusted Gross Income',
    definition: 'AGI plus certain deductions added back. Used for IRMAA, Roth eligibility, and ACA subsidies.',
    source: 'IRS Publication 590-A',
  },
  AGI: {
    full: 'Adjusted Gross Income',
    definition: 'Total income minus specific deductions (IRA contributions, student loan interest, etc.).',
    source: 'IRS Form 1040',
  },
  NIIT: {
    full: 'Net Investment Income Tax',
    definition: '3.8% surtax on investment income when MAGI exceeds $250K (MFJ) or $200K (single).',
    source: 'IRC Section 1411',
  },
  LTCG: {
    full: 'Long-Term Capital Gains',
    definition: 'Gains on assets held >1 year. Taxed at preferential rates: 0%, 15%, or 20%.',
    source: 'IRS Publication 550',
  },
  SALT: {
    full: 'State and Local Tax',
    definition: 'Deduction for state income, sales, and property taxes. Currently capped at $10,000.',
    source: 'IRS Publication 17',
  },

  // Filing Status
  MFJ: {
    full: 'Married Filing Jointly',
    definition: 'Tax filing status for married couples combining income and deductions.',
  },

  // Time-Based Terms
  BOY: {
    full: 'Beginning of Year',
    definition: 'Account balance on January 1.',
  },
  EOY: {
    full: 'End of Year',
    definition: 'Account balance on December 31.',
  },
  PV: {
    full: 'Present Value',
    definition: "Future amount discounted to today's dollars using the discount rate.",
  },
  FV: {
    full: 'Future Value',
    definition: 'Nominal dollar amount at the future date.',
  },

  // Social Security
  COLA: {
    full: 'Cost of Living Adjustment',
    definition: 'Annual Social Security increase based on CPI-W inflation index.',
    source: 'SSA.gov',
  },
  SS: {
    full: 'Social Security',
    definition: 'Federal retirement benefit program. Benefits based on 35 highest earning years.',
  },

  // Account Types
  IRA: {
    full: 'Individual Retirement Account',
    definition: 'Tax-advantaged retirement account. Traditional IRA: tax-deferred. Roth IRA: tax-free growth.',
  },
  AT: {
    full: 'After-Tax / Taxable',
    definition: 'Non-retirement investment accounts. Gains taxed as LTCG or STCG.',
  },
};
```

### Term Icon Component

**File**: `src/components/TermIcon/index.jsx` (new)

```jsx
export function TermIcon({ term }) {
  const ref = TERM_REFERENCE[term];
  const [showTooltip, setShowTooltip] = useState(false);
  const buttonRef = useRef(null);

  if (!ref) return null;

  return (
    <span className="relative inline-block">
      <button
        ref={buttonRef}
        className="text-blue-400/50 hover:text-blue-400 focus:text-blue-400 ml-1"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
        aria-label={`Definition of ${term}`}
        aria-describedby={showTooltip ? `term-tooltip-${term}` : undefined}
      >
        <Info className="w-3 h-3 inline" aria-hidden="true" />
      </button>

      {showTooltip && (
        <div
          id={`term-tooltip-${term}`}
          role="tooltip"
          className="absolute z-50 bottom-full left-0 mb-2
                     w-64 bg-slate-800 border border-slate-600 rounded p-2 shadow-lg"
        >
          <div className="text-blue-400 text-xs font-medium">{ref.full}</div>
          <div className="text-slate-300 text-xs mt-1">{ref.definition}</div>
          {ref.source && (
            <div className="text-slate-500 text-[10px] mt-1">Source: {ref.source}</div>
          )}
        </div>
      )}
    </span>
  );
}
```

### Implementation Details (Critical)

**1. Auto-Detect Terms in Labels:**

Instead of manually placing icons, auto-detect terms in row labels:

```jsx
const AUTO_TERM_PATTERNS = {
  RMD: /\bRMD\b/,
  IRMAA: /\bIRMAA\b/,
  MAGI: /\bMAGI\b/,
  NIIT: /\bNIIT\b/,
  LTCG: /\bLTCG\b|Long.?Term Capital/i,
  // ... etc
};

function LabelWithTerms({ label }) {
  // Find first matching term
  for (const [term, pattern] of Object.entries(AUTO_TERM_PATTERNS)) {
    if (pattern.test(label)) {
      return (
        <span>
          {label} <TermIcon term={term} />
        </span>
      );
    }
  }
  return label;
}
```

**2. Which Rows Get Term Icons:**

Add icons to rows with technical terms in their key or label:

```jsx
const ROWS_WITH_TERMS = {
  rmdRequired: 'RMD',
  irmaaTotal: 'IRMAA',
  irmaaPartB: 'IRMAA',
  irmaaPartD: 'IRMAA',
  irmaaMAGI: 'MAGI',
  niit: 'NIIT',
  ltcgTax: 'LTCG',
  taxableSS: 'SS',
  rothConversion: 'IRA',
};

// In row rendering:
<td className="...">
  {row.label}
  {ROWS_WITH_TERMS[row.key] && <TermIcon term={ROWS_WITH_TERMS[row.key]} />}
</td>
```

**3. Consolidated Glossary View:**

Add a "View All Terms" button that opens a modal with all terms:

```jsx
export function GlossaryModal({ isOpen, onClose }) {
  const terms = Object.entries(TERM_REFERENCE).sort((a, b) =>
    a[0].localeCompare(b[0])
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Term Glossary">
      <div className="space-y-3 max-h-[60vh] overflow-y-auto">
        {terms.map(([abbrev, ref]) => (
          <div key={abbrev} className="border-b border-slate-700 pb-2">
            <div className="flex items-baseline gap-2">
              <span className="text-blue-400 font-mono font-bold">{abbrev}</span>
              <span className="text-slate-300 text-sm">{ref.full}</span>
            </div>
            <p className="text-slate-400 text-sm mt-1">{ref.definition}</p>
            {ref.source && (
              <p className="text-slate-500 text-xs mt-1">Source: {ref.source}</p>
            )}
          </div>
        ))}
      </div>
    </Modal>
  );
}
```

Usage in row labels:
```jsx
<td>
  RMD Required <TermIcon term="RMD" />
</td>
```

---

## Migration & Deprecation Strategy

### Phase-by-Phase Migration

**Phase 1 (Side Panel Inspector) Migration:**

1. **Keep both during transition**: Existing modal `CalculationInspector` remains functional while building side panel
2. **Feature flag**: `ENABLE_SIDE_PANEL_INSPECTOR` allows toggling between old and new
3. **Deprecation timeline**:
   - Week 1-2: Build side panel, both available
   - Week 3: Default to side panel, modal available via settings
   - Week 4+: Remove modal code after user feedback

```jsx
// Feature flag in App.jsx
const useSidePanel = params.experimentalFeatures?.sidePanelInspector ?? true;

// Render appropriate component
{useSidePanel ? (
  <InspectorPanel ... />
) : (
  <CalculationInspector ... /> // Existing modal
)}
```

**Files to eventually remove:**
- `src/components/CalculationInspector/index.jsx` (after migration)
- Related modal styles and dependencies

### Section Reorganization Migration

The section reorganization (Phase 6) affects E2E tests that reference section names.

**Migration steps:**
1. Create `sectionConfig.js` with new structure
2. Update `INSPECTABLE_FIELDS` array to match new groupings
3. Run E2E tests → identify failures
4. Update test selectors to use new section names
5. Update any documentation referencing old section names

**Backwards compatibility for scenarios:**
```jsx
// Scenarios store field references - ensure mappings work
const FIELD_MIGRATION_MAP = {
  // Old name -> New name (if any changed)
  // Most should stay the same, this is for safety
};

const migrateFieldName = (field) => FIELD_MIGRATION_MAP[field] || field;
```

### Shared Component Extraction

Several components from this plan may be useful in `new-user-usability-improvements.md`:

| Component | Used In | Shared Location |
|-----------|---------|-----------------|
| `TermIcon` | Both plans | `src/components/shared/TermIcon/` |
| `ClickableValue` | This plan | `src/components/shared/ClickableValue/` |
| `TaxTableViewer` | Both plans | `src/components/TaxTableViewer/` |

### API/Data Structure Changes

**Existing infrastructure (no changes needed):**
- `CELL_DEPENDENCIES` in `calculationDependencies.js` - already has complete dependency graph
- `getReverseDependencies()` in `calculationDependencies.js` - already implemented
- `getDependencySign()` in `calculationDependencies.js` - for showing +/- in formulas
- `irmaaTotal` - already computed in projections
- `cumulativeCapitalGains` - already tracked

**New computed fields needed** (add to `projections.js`):
```javascript
// Add these for section summary rows:
totalCashIn: ssAnnual + totalWithdrawal,
totalCashOut: expenses + totalTax + irmaaTotal + (propertyTax || 0),
effectiveTaxRate: ordinaryIncome > 0 ? (totalTax / ordinaryIncome) : 0,
```

**Add to calculationDependencies.js:**
```javascript
// Add dependency definitions for new computed fields
totalCashIn: year => [
  { year, field: 'ssAnnual' },
  { year, field: 'totalWithdrawal' },
],
totalCashOut: year => [
  { year, field: 'expenses' },
  { year, field: 'totalTax' },
  { year, field: 'irmaaTotal' },
  { year, field: 'propertyTax' },
],
effectiveTaxRate: year => [
  { year, field: 'totalTax' },
  { year, field: 'ordinaryIncome' },
],
```

**Add to calculationDefinitions.js:**
```javascript
// Add human-readable definitions for new fields
totalCashIn: {
  name: 'Total Cash In',
  formula: 'Social Security + Total Withdrawal',
  // ...
},
totalCashOut: {
  name: 'Total Cash Out',
  formula: 'Expenses + Total Tax + IRMAA + Property Tax',
  // ...
},
effectiveTaxRate: {
  name: 'Effective Tax Rate',
  format: '%',
  formula: 'Total Tax ÷ Ordinary Income',
  // ...
},
```

---

## Implementation Priority

| Phase | Description | Effort | Impact | Priority |
|-------|-------------|--------|--------|----------|
| **1. Side Panel Inspector** | Replace modal, preserve table context | High | Very High | 1 |
| **2. Clickable Formula PV/FV** | Dual display, navigation | Medium | High | 2 |
| **3. Scroll-to-Cell** | Jump to off-screen dependencies | Low | High | 3 |
| **4. Dependency List** | Inputs/outputs with jump | Medium | High | 4 |
| **5. Tax Table Viewer** | All tables with "you are here" | High | Very High | 5 |
| **6. Section Reorganization** | 5 story-centric sections | Medium | Medium | 6 |
| **7. Hover Preview** | Quick formula peek | Low | Medium | 7 |
| **8. Term Reference** | Concise definitions | Low | Low | 8 |

---

## Testing Strategy

### Unit Tests
- PV/FV calculations in formula display
- Tax bracket inflation calculations
- Dependency resolution (`getReverseDependencies`, `CELL_DEPENDENCIES`)
- Term reference coverage
- Edge case handling (pre-RMD age, survivor scenario, missing data)

### Integration Tests
```javascript
describe('InspectorPanel integration', () => {
  it('navigates through dependency chain correctly', async () => {
    // Click totalTax → opens inspector
    // Click federalTax in dependencies → scrolls and updates
    // Click back button → returns to totalTax
  });

  it('handles survivor scenario filing status change', async () => {
    // Set survivorDeathYear
    // Navigate to year after death
    // Verify filing status shows "Single"
  });
});
```

### E2E Tests (Playwright)
```javascript
// Add to e2e/ci/inspector.spec.js
test('cell click opens side panel inspector', async ({ page }) => {
  await page.click('[data-cell="totalTax-2025"]');
  await expect(page.locator('[data-testid="inspector-panel"]')).toBeVisible();
  await expect(page.locator('[data-testid="inspector-title"]')).toContainText('Total Tax');
});

test('dependency navigation scrolls to cell', async ({ page }) => {
  await page.click('[data-cell="totalTax-2025"]');
  await page.click('[data-testid="dep-federalTax"]');
  await expect(page.locator('[data-cell="federalTax-2025"]')).toBeInViewport();
});

test('tax table viewer shows correct data', async ({ page }) => {
  await page.click('[data-testid="view-tax-tables"]');
  await expect(page.locator('[data-testid="tax-table-modal"]')).toBeVisible();
  await expect(page.locator('[data-testid="federal-tab"]')).toBeVisible();
});
```

### Accessibility Testing
```bash
# Run axe-core accessibility audit
npm run test:a11y

# Manual WCAG 2.1 AA checklist:
# - [ ] All interactive elements are keyboard accessible
# - [ ] Focus order is logical
# - [ ] Color contrast ratios meet 4.5:1 minimum
# - [ ] Tooltips work without mouse (focus-triggered)
# - [ ] Screen reader announces inspector content changes
# - [ ] Reduced motion preference is respected
```

### Performance Testing
```javascript
// Measure render time for inspector panel
performance.mark('inspector-start');
// ... render inspector
performance.mark('inspector-end');
performance.measure('inspector-render', 'inspector-start', 'inspector-end');

// Baseline: < 100ms for panel render
// Baseline: < 16ms for hover tooltip (60fps)
```

### Manual Testing Checklist

**Core Functionality:**
1. **Verification flow**: Can you trace how totalTax is calculated from inputs to result?
2. **Tax table check**: Do brackets match current IRS publications?
3. **Navigation test**: Click through 5+ dependencies without losing context
4. **PV/FV test**: Are both values visible and clearly labeled?
5. **Off-screen test**: Do dependencies that require scrolling work correctly?

**Responsive Testing:**
6. **Desktop (1920px)**: Side panel resizes correctly
7. **Laptop (1280px)**: Panel still fits alongside table
8. **Tablet (768px)**: Drawer mode works properly
9. **Mobile (375px)**: Full-screen inspector works

**Edge Case Testing:**
10. **Pre-RMD user**: RMD table doesn't show "You are here" incorrectly
11. **Survivor scenario**: Filing status changes mid-projection
12. **Year 2055+**: Extrapolation warning shown
13. **Empty projections**: Graceful error state

---

## Known Limitations & Risks

### Architectural Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Side panel on small screens** | Poor UX below 768px | Drawer/modal fallback for smaller screens |
| **Tax table data accuracy** | Incorrect calculations shown to user | Source citations, links to IRS publications |
| **Year extrapolation** | Brackets beyond 2054 are estimated | Show warning for extrapolated years |
| **Circular dependency** | Infinite loop if dependency graph has cycles | Already prevented in current codebase |

### User Experience Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Information overload** | User overwhelmed by formula details | Progressive disclosure, collapsed sections |
| **Click fatigue** | Too many clicks to verify calculation | Hover preview for quick check |
| **Navigation confusion** | Lost in dependency chain | Back button, breadcrumb trail |
| **PV/FV confusion** | User doesn't realize mode changed | Clear labels, color coding |

### Technical Limitations

| Limitation | Description |
|------------|-------------|
| **No deep linking** | Can't share URL to specific cell/calculation |
| **No comparison mode** | Can't view two cells side-by-side |
| **No calculation history** | Can't see how a value changed over edits |
| **Single browser tab** | Inspector state not synced across tabs |

### Future Considerations (Out of Scope)

These are explicitly NOT included in this plan but may be valuable later:

1. **Export to Excel with formulas** - Export cells with actual Excel formulas, not just values
2. **Scenario diff view** - Show which cells changed between scenarios
3. **Time-lapse visualization** - Animate account balance changes over projection years
4. **Custom formula verification** - Let users enter their own formula to check against
5. **External calculator links** - Link to IRS IRMAA calculator, SS estimator, etc.

---

## References

### Tax Sources
- IRS Publication 590-B: RMD tables
- IRS Rev. Proc. 2024-40: 2025 bracket inflation
- Medicare.gov: IRMAA brackets
- IRS Publication 915: Social Security taxation
- IRC Section 1411: NIIT

### UX Research
- Nielsen Norman Group: Progressive Disclosure
- Nielsen Norman Group: Data Tables
- Pencil & Paper: Enterprise Data Tables

### Existing Code
- `src/lib/taxTables.js`: All tax table data
- `src/lib/calculationDefinitions.js`: Calculation metadata
- `src/lib/calculationDependencies.js`: Dependency graph
- `src/components/CalculationInspector/`: Current inspector (modal)
