# UI Input Panel Reorganization Implementation Plan

## Overview

Reorganize the InputPanel sections for better logical grouping and add `endYear` as an editable model input parameter. Also consolidate Tax Brackets and IRMAA into a tabbed interface in Settings.

## Current State Analysis

### InputPanel Sections (13 sections currently):
1. Profile - Primary/spouse names and birth years
2. Starting Accounts - AT, IRA, Roth, Cost Basis
3. Roth Conversions - Year/amount pairs
4. Returns & Risk - Account-based or risk-based returns
5. Social Security - Monthly benefit, COLA
6. Expenses - Annual expenses, inflation
7. Expense Overrides - Year-specific overrides
8. AT Harvest (Cap Gains) - Year/amount pairs
9. Tax Parameters - State rate, bracket inflation, MAGI history
10. Property Taxes - Annual property tax
11. Calculation Options - Iterative tax, discount rate
12. Survivor Scenario - Death year, survivor SS%, survivor expense%
13. Heirs - Multi-heir configuration

### Settings Panel Sections (5 sections):
1. Tax Settings - Tax year, SS exemption mode
2. Display Preferences - PV toggle, precision
3. AI Assistant - Provider, API key, model
4. Tax Brackets (Advanced) - TaxBracketEditor (Federal + LTCG tabs)
5. IRMAA Brackets (Advanced) - IRMAAEditor (separate section)

### Key Files:
- `src/components/InputPanel/index.jsx` - Main input panel (1060 lines)
- `src/components/SettingsPanel/index.jsx` - Settings panel (430 lines)
- `src/components/SettingsPanel/TaxBracketEditor.jsx` - Tax bracket editor
- `src/components/SettingsPanel/IRMAAEditor.jsx` - IRMAA editor
- `src/lib/taxTables.js` - DEFAULT_PARAMS (line 288-362)

## Desired End State

### InputPanel New Section Order (10 sections):

| # | Section | Icon | Color | Contents |
|---|---------|------|-------|----------|
| 1 | **Timeline** | Calendar | blue | Start Year, End Year |
| 2 | **Profile & Life Events** | User | blue | Names, birth years, survivor scenario (death year, SS%, expense%) |
| 3 | **Starting Accounts** | DollarSign | emerald | AT, IRA, Roth, Cost Basis |
| 4 | **Social Security** | DollarSign | cyan | Monthly benefit, COLA |
| 5 | **Expenses** | BarChart3 | rose | Annual expenses, inflation, + year-specific overrides |
| 6 | **Returns & Risk** | TrendingUp | purple | Account-based or risk-based returns |
| 7 | **Tax Strategies** | Zap | blue | Roth Conversions + AT Harvest (Cap Gains) |
| 8 | **Tax Parameters** | Percent | orange | State rate, bracket inflation, MAGI history |
| 9 | **Property Taxes** | Home | orange | Annual property tax |
| 10 | **Calculation Options** | Calculator | purple | Iterative tax, discount rate |
| 11 | **Heirs** | Users | indigo | Multi-heir configuration |

### Settings Panel Changes:
- Merge "Tax Brackets (Advanced)" and "IRMAA Brackets (Advanced)" into single section
- New section: **"Tax Tables (Advanced)"** with 3 tabs: Federal | Capital Gains | IRMAA

## What We're NOT Doing

- Not changing any calculation logic
- Not changing data model structure (params still has same fields)
- Not changing save/load functionality
- Not adding new parameters beyond exposing existing `startYear`/`endYear`
- Not changing the Heirs section (already complex enough)

## Implementation Approach

Make surgical edits to reorganize sections while preserving all existing functionality. The data model stays the same - only the UI grouping changes.

---

## Phase 1: Add Timeline Section to InputPanel

### Overview
Add a new "Timeline" section at the top of InputPanel with Start Year and End Year inputs.

### Changes Required:

#### 1. InputPanel - Add Timeline Section
**File**: `src/components/InputPanel/index.jsx`

Add new section after the "Model Inputs" header (around line 265):

```jsx
{/* Timeline Section */}
<InputSection
  title="Timeline"
  icon={Calendar}
  expanded={expanded.includes('timeline')}
  onToggle={() => toggle('timeline')}
  color="blue"
>
  <div className="grid grid-cols-2 gap-2">
    <div>
      <label className="block text-slate-500 text-[10px] mb-0.5">Start Year</label>
      <input
        type="number"
        value={params.startYear || 2025}
        onChange={e => updateParam('startYear', parseInt(e.target.value) || 2025)}
        className="w-full bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
      />
    </div>
    <div>
      <label className="block text-slate-500 text-[10px] mb-0.5">End Year</label>
      <input
        type="number"
        value={params.endYear || 2054}
        onChange={e => updateParam('endYear', parseInt(e.target.value) || 2054)}
        className="w-full bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
      />
    </div>
  </div>
  <div className="text-slate-500 text-[10px] mt-1">
    Planning horizon: {(params.endYear || 2054) - (params.startYear || 2025) + 1} years
  </div>
</InputSection>
```

Update default expanded state (line 218):
```jsx
const [expanded, setExpanded] = useState(['timeline', 'profile', 'accounts']);
```

### Success Criteria:

#### Automated Verification:
- [x] Build succeeds: `npm run build`
- [x] Unit tests pass: `npm test`
- [x] Linting passes: `npm run lint`

#### Manual Verification:
- [x] Timeline section appears at top of InputPanel
- [x] Start Year and End Year are editable
- [x] Changes to years update projections correctly
- [x] Planning horizon displays correctly

---

## Phase 2: Combine Profile + Survivor Scenario

### Overview
Merge the Profile section and Survivor Scenario section into "Profile & Life Events".

### Changes Required:

#### 1. InputPanel - Merge Sections
**File**: `src/components/InputPanel/index.jsx`

Rename Profile section to "Profile & Life Events" and add survivor fields at the bottom:

```jsx
{/* Profile & Life Events Section */}
<InputSection
  title="Profile & Life Events"
  icon={User}
  expanded={expanded.includes('profile')}
  onToggle={() => toggle('profile')}
  color="blue"
>
  {/* Existing profile fields (names, birth years) */}
  ...

  {/* Survivor Scenario - moved from separate section */}
  <div className="mt-3 pt-3 border-t border-slate-700">
    <div className="text-slate-400 text-xs font-medium mb-2">Survivor Scenario</div>
    <div className="flex items-center justify-between py-0.5">
      <span className="text-slate-400 text-xs">Death Year</span>
      <input
        type="text"
        value={params.survivorDeathYear || ''}
        onChange={e => updateParam('survivorDeathYear', e.target.value ? parseInt(e.target.value) : null)}
        placeholder="none"
        className="w-20 text-right bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-xs"
      />
    </div>
    <ParamInput label="Survivor SS %" value={params.survivorSSPercent} onChange={v => updateParam('survivorSSPercent', v)} format="%" />
    <ParamInput label="Survivor Exp %" value={params.survivorExpensePercent} onChange={v => updateParam('survivorExpensePercent', v)} format="%" />
  </div>
</InputSection>
```

Remove the standalone Survivor Scenario section (lines 843-876).

### Success Criteria:

#### Automated Verification:
- [x] Build succeeds: `npm run build`
- [x] Unit tests pass: `npm test`

#### Manual Verification:
- [x] Profile & Life Events section shows all fields
- [x] Survivor scenario inputs work correctly
- [x] No duplicate sections

---

## Phase 3: Combine Expenses + Expense Overrides

### Overview
Merge Expenses and Expense Overrides into a single "Expenses" section with overrides shown below the main inputs.

### Changes Required:

#### 1. InputPanel - Merge Expenses Sections
**File**: `src/components/InputPanel/index.jsx`

Combine the two expenses sections:

```jsx
{/* Expenses Section (Combined) */}
<InputSection
  title="Expenses"
  icon={BarChart3}
  expanded={expanded.includes('expenses')}
  onToggle={() => toggle('expenses')}
  color="rose"
>
  {/* Base expenses */}
  <ParamInput label="Annual" value={params.annualExpenses} onChange={v => updateParam('annualExpenses', v)} />
  <ParamInput label="Inflation" value={params.expenseInflation} onChange={v => updateParam('expenseInflation', v)} format="%" />

  {/* Year-specific overrides */}
  <div className="mt-3 pt-3 border-t border-slate-700">
    <div className="text-slate-400 text-xs font-medium mb-2">Year-Specific Overrides</div>
    {/* Existing override list and add button */}
    ...
  </div>
</InputSection>
```

Remove the standalone Expense Overrides section (lines 562-637).

### Success Criteria:

#### Automated Verification:
- [x] Build succeeds: `npm run build`
- [x] Unit tests pass: `npm test`

#### Manual Verification:
- [x] Single Expenses section with all fields
- [x] Override add/remove works correctly
- [x] No duplicate sections

---

## Phase 4: Combine Roth Conversions + AT Harvest into Tax Strategies

### Overview
Create a new "Tax Strategies" section containing both Roth Conversions and AT Harvest.

### Changes Required:

#### 1. InputPanel - Create Tax Strategies Section
**File**: `src/components/InputPanel/index.jsx`

```jsx
{/* Tax Strategies Section */}
<InputSection
  title="Tax Strategies"
  icon={Zap}
  expanded={expanded.includes('taxStrategies')}
  onToggle={() => toggle('taxStrategies')}
  color="blue"
>
  {/* Roth Conversions */}
  <div className="mb-4">
    <div className="text-slate-400 text-xs font-medium mb-2">Roth Conversions</div>
    {/* Existing Roth conversion list and add button */}
    ...
  </div>

  {/* AT Harvest (Cap Gains) */}
  <div className="pt-3 border-t border-slate-700">
    <div className="text-slate-400 text-xs font-medium mb-2">Capital Gains Harvesting</div>
    {/* Existing AT harvest list and add button */}
    ...
  </div>
</InputSection>
```

Remove standalone Roth Conversions (lines 365-441) and AT Harvest (lines 639-714) sections.

### Success Criteria:

#### Automated Verification:
- [x] Build succeeds: `npm run build`
- [x] Unit tests pass: `npm test`

#### Manual Verification:
- [x] Single Tax Strategies section with both subsections
- [x] Roth conversion add/remove works
- [x] AT harvest add/remove works
- [x] No duplicate sections

---

## Phase 5: Reorder InputPanel Sections

### Overview
Apply the final section ordering after all merges are complete.

### Changes Required:

#### 1. InputPanel - Section Ordering
**File**: `src/components/InputPanel/index.jsx`

Reorder the JSX sections to match the new order:
1. Timeline
2. Profile & Life Events
3. Starting Accounts
4. Social Security
5. Expenses
6. Returns & Risk
7. Tax Strategies
8. Tax Parameters
9. Property Taxes
10. Calculation Options
11. Heirs

Update default expanded state:
```jsx
const [expanded, setExpanded] = useState(['timeline', 'profile', 'accounts']);
```

### Success Criteria:

#### Automated Verification:
- [x] Build succeeds: `npm run build`
- [x] Linting passes: `npm run lint`

#### Manual Verification:
- [x] Sections appear in correct order
- [x] Default expanded sections are Timeline, Profile, Accounts

---

## Phase 6: Create Tabbed Tax Tables Interface in Settings

### Overview
Merge Tax Brackets and IRMAA Brackets into a single "Tax Tables (Advanced)" section with tabs.

### Changes Required:

#### 1. SettingsPanel - Create Tabbed Interface
**File**: `src/components/SettingsPanel/index.jsx`

Replace the two separate sections with a single tabbed section:

```jsx
{/* Tax Tables (Advanced) Section */}
<SettingsSection
  title="Tax Tables (Advanced)"
  icon={Calculator}
  expanded={expanded.includes('taxTables')}
  onToggle={() => toggle('taxTables')}
  color="amber"
>
  {/* Tab buttons */}
  <div className="flex gap-1 mb-4">
    {['federal', 'capitalGains', 'irmaa'].map(tab => (
      <button
        key={tab}
        onClick={() => setActiveTaxTab(tab)}
        className={`px-3 py-1.5 rounded text-xs ${
          activeTaxTab === tab
            ? 'bg-amber-600 text-white'
            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
        }`}
      >
        {tab === 'federal' ? 'Federal' : tab === 'capitalGains' ? 'Capital Gains' : 'IRMAA'}
      </button>
    ))}
  </div>

  {/* Tab content */}
  {activeTaxTab === 'federal' && (
    <TaxBracketEditor brackets={settings.customBrackets} onUpdate={...} taxYear={...} type="federal" />
  )}
  {activeTaxTab === 'capitalGains' && (
    <TaxBracketEditor brackets={settings.customBrackets} onUpdate={...} taxYear={...} type="ltcg" />
  )}
  {activeTaxTab === 'irmaa' && (
    <IRMAAEditor brackets={settings.customIRMAA} onUpdate={...} taxYear={...} />
  )}
</SettingsSection>
```

Add state for active tab:
```jsx
const [activeTaxTab, setActiveTaxTab] = useState('federal');
```

Remove standalone Tax Brackets (lines 395-408) and IRMAA Brackets (lines 410-423) sections.

#### 2. TaxBracketEditor - Support Type Prop
**File**: `src/components/SettingsPanel/TaxBracketEditor.jsx`

May need to add a `type` prop to filter which brackets to show (federal vs LTCG). Check current implementation first.

### Success Criteria:

#### Automated Verification:
- [x] Build succeeds: `npm run build`
- [x] E2E tests pass: `npm run test:e2e -- --grep "Settings"`

#### Manual Verification:
- [x] Single "Tax Tables (Advanced)" section in Settings
- [x] Three tabs: Federal, Capital Gains, IRMAA
- [x] Tab switching works correctly
- [x] Bracket editing works in each tab
- [x] No duplicate sections

---

## Testing Strategy

### Unit Tests:
- Existing tests should continue to pass (no logic changes)

### E2E Tests:
- Navigation tests should still work
- AI config tests should still work
- May need to update any tests that look for specific section titles

### Manual Testing Steps:
1. Open app, verify InputPanel sections appear in new order
2. Expand Timeline section, change Start/End Year, verify projections update
3. Expand Profile & Life Events, verify survivor scenario inputs work
4. Expand Expenses, verify overrides can be added/removed
5. Expand Tax Strategies, verify both Roth and AT Harvest work
6. Go to Settings > Tax Tables, verify tabbed interface works
7. Test save/load functionality with new section organization

## Performance Considerations

- No performance impact expected (UI reorganization only)
- Same number of inputs, just grouped differently

## Migration Notes

- No data migration needed (params structure unchanged)
- User's saved scenarios will load correctly
- localStorage data unaffected

## References

- Original request: User conversation
- Current InputPanel: `src/components/InputPanel/index.jsx:1-1060`
- Current SettingsPanel: `src/components/SettingsPanel/index.jsx:1-430`
- DEFAULT_PARAMS: `src/lib/taxTables.js:288-362`
