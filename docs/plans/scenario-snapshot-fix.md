# Scenario Snapshot Fix Implementation Plan

## Overview

Fix the scenario management system so that saved scenarios are **complete snapshots** that don't change when the user modifies base input parameters.

## Current State Analysis

### Current Behavior (Bug)
Scenarios only store "overrides" (deltas from base), not complete state:

```javascript
// ScenarioComparison/index.jsx:578-594
const mergedParams = {
  ...params,           // Current live params (changes when user edits inputs)
  ...scenario.overrides,  // Only stores fields that differ from base
};
```

**Problem example:**
1. Base has `rothConversions: { 2026: 50000 }`
2. User creates "Custom" scenario → stores `overrides: {}`
3. User changes base to `rothConversions: { 2026: 100000 }`
4. Scenario now shows 100000 because it has no override for rothConversions!

### Root Cause
- Scenarios store only `overrides` object, not full params
- Calculation merges current `params` with scenario `overrides`
- Any field not in `overrides` uses the current base value

## Desired End State

When a scenario is created:
1. **Capture full params snapshot** (deep clone at creation time)
2. **Store complete params** with the scenario, not just overrides
3. **Calculate using stored params** directly, not merged with base
4. **Scenarios are immutable** - changing base inputs never affects saved scenarios

### Verification
- Create a scenario, note the Roth conversion values
- Change base Roth conversions
- Saved scenario should still show original values
- Run `npm test` and `npm run test:e2e`

## What We're NOT Doing

- Not changing the preset system (presets still define overrides that get applied to current base at creation time)
- Not adding a "relative vs absolute" mode toggle
- Not changing how optimizer creates scenarios
- Not migrating existing localStorage scenarios (they'll continue to work but will use new snapshot behavior on next save)

## Implementation Approach

Store both `baseParams` (full snapshot) and `overrides` (for display purposes showing what differs from creation-time base). Use `baseParams` for calculations.

## Phase 1: Add Deep Clone Utility

### Overview
Create a utility function for deep cloning params to avoid shared references.

### Changes Required:

#### 1. Create deep clone utility
**File**: `src/lib/utils.js` (new file)

```javascript
/**
 * Deep clone an object, handling nested objects and arrays
 * Used for creating independent scenario snapshots
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item));
  }

  const cloned = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  return cloned;
}
```

### Success Criteria:

#### Automated Verification:
- [ ] `npm run lint` passes
- [ ] File exists at `src/lib/utils.js`

#### Manual Verification:
- [ ] N/A for this phase

---

## Phase 2: Update Scenario Creation to Store Full Snapshot

### Overview
Modify scenario creation to capture and store the complete params state.

### Changes Required:

#### 1. Update ScenarioComparison to receive and store full params
**File**: `src/components/ScenarioComparison/index.jsx`

**Change createScenario function (around line 755):**

```javascript
import { deepClone } from '../../lib/utils';

// Update createScenario to capture full snapshot
const createScenario = useCallback(
  (preset, customName = null) => {
    const newId = Date.now();

    // Deep clone current params as the base snapshot
    const baseSnapshot = deepClone(params);

    // Apply preset overrides to the snapshot if provided
    const finalParams = preset?.overrides
      ? { ...baseSnapshot, ...preset.overrides }
      : baseSnapshot;

    const newScenario = {
      id: newId,
      name: customName || (preset ? preset.name : getDefaultScenarioName('custom')),
      description: preset?.description || '',
      // Store both for different purposes:
      baseParams: finalParams,      // Full snapshot for calculations
      overrides: preset?.overrides || {},  // Keep for display (what was changed from base at creation)
    };
    setScenarios(prev => [...prev, newScenario]);
    setSelectedScenarioIds(prev => new Set([...prev, newId]));
    setShowPresets(false);
    setNamingScenario(null);
  },
  [getDefaultScenarioName, params]  // Add params to dependencies
);
```

#### 2. Update pendingScenario handler (around line 551)
**File**: `src/components/ScenarioComparison/index.jsx`

```javascript
useEffect(() => {
  if (pendingScenario) {
    const newId = pendingScenario.createdAt || Date.now();

    // Deep clone current params and apply overrides
    const baseSnapshot = deepClone(params);
    const finalParams = pendingScenario.overrides
      ? { ...baseSnapshot, ...pendingScenario.overrides }
      : baseSnapshot;

    const newScenario = {
      id: newId,
      name: pendingScenario.name || 'From Optimizer',
      description: pendingScenario.description || '',
      baseParams: finalParams,
      overrides: pendingScenario.overrides || {},
    };
    setScenarios(prev => [...prev, newScenario]);
    setSelectedScenarioIds(prev => new Set([...prev, newId]));
    onPendingScenarioConsumed?.();
  }
}, [pendingScenario, onPendingScenarioConsumed, params]);
```

#### 3. Update duplicateScenario function (around line 798)
**File**: `src/components/ScenarioComparison/index.jsx`

```javascript
const duplicateScenario = scenario => {
  const newScenario = {
    id: Date.now(),
    name: `${scenario.name} (Copy)`,
    description: scenario.description,
    baseParams: deepClone(scenario.baseParams),  // Deep clone the snapshot
    overrides: deepClone(scenario.overrides),    // Deep clone overrides too
  };
  setScenarios([...scenarios, newScenario]);
};
```

### Success Criteria:

#### Automated Verification:
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds

#### Manual Verification:
- [ ] Creating a scenario captures current params

---

## Phase 3: Update Scenario Calculation to Use Stored Snapshot

### Overview
Modify the scenario results calculation to use the stored `baseParams` instead of merging with current params.

### Changes Required:

#### 1. Update scenarioResults calculation (around line 569)
**File**: `src/components/ScenarioComparison/index.jsx`

```javascript
const scenarioResults = useMemo(() => {
  const results = scenarios.map(scenario => {
    // Use stored baseParams if available, otherwise fall back to legacy merge behavior
    let mergedParams;

    if (scenario.baseParams) {
      // New behavior: use the stored snapshot directly
      mergedParams = {
        ...scenario.baseParams,
        ...options,  // Still apply current calculation options
        // Compute exemptSSFromTax function same as useProjections
        getExemptSSForYear: year => {
          const mode = settings.ssExemptionMode || 'disabled';
          if (mode === 'disabled') return false;
          if (mode === 'permanent') return true;
          return year >= 2025 && year <= 2028;
        },
        exemptSSFromTax: (() => {
          const mode = settings.ssExemptionMode || 'disabled';
          if (mode === 'disabled') return false;
          if (mode === 'permanent') return true;
          const startYear = scenario.baseParams.startYear || 2026;
          return startYear >= 2025 && startYear <= 2028;
        })(),
        customBrackets: settings.customBrackets || null,
        customIRMAA: settings.customIRMAA || null,
        taxYear: settings.taxYear || 2025,
      };
    } else {
      // Legacy behavior for old scenarios without baseParams
      const getExemptSSForYear = year => {
        const mode = settings.ssExemptionMode || 'disabled';
        if (mode === 'disabled') return false;
        if (mode === 'permanent') return true;
        return year >= 2025 && year <= 2028;
      };

      mergedParams = {
        ...params,
        ...options,
        heirs: params.heirs || [],
        discountRate: params.discountRate || 0.03,
        heirDistributionStrategy: params.heirDistributionStrategy || 'even',
        heirNormalizationYears: params.heirNormalizationYears || 10,
        getExemptSSForYear,
        exemptSSFromTax: getExemptSSForYear(params.startYear || 2026),
        birthYear: settings.primaryBirthYear || params.birthYear,
        customBrackets: settings.customBrackets || null,
        customIRMAA: settings.customIRMAA || null,
        taxYear: settings.taxYear || 2025,
        ...scenario.overrides,
      };
    }

    const proj = generateProjections(mergedParams);
    const sum = calculateSummary(proj);
    return { ...scenario, projections: proj, summary: sum };
  });
  return results;
}, [params, scenarios, settings, options]);
```

### Success Criteria:

#### Automated Verification:
- [ ] `npm run build` succeeds
- [ ] `npm test` passes
- [ ] `npm run test:e2e` passes

#### Manual Verification:
- [ ] Create scenario with specific Roth conversions
- [ ] Change base Roth conversions
- [ ] Verify scenario still shows original values
- [ ] Verify base case shows new values

---

## Phase 4: Update Save/Load to Persist Full Snapshot

### Overview
Ensure the full `baseParams` is saved to localStorage and restored correctly.

### Changes Required:

#### 1. Update saveScenarioSet function (around line 834)
**File**: `src/components/ScenarioComparison/index.jsx`

```javascript
const saveScenarioSet = () => {
  if (!saveSetName.trim() || scenarios.length === 0) return;

  const newSet = {
    id: Date.now(),
    name: saveSetName.trim(),
    createdAt: new Date().toISOString(),
    scenarios: scenarios.map(s => ({
      name: s.name,
      description: s.description,
      baseParams: s.baseParams,  // Include full snapshot
      overrides: s.overrides,
    })),
  };

  const updated = [...savedScenarioSets, newSet];
  setSavedScenarioSets(updated);
  saveScenarios(updated);
  setSaveSetName('');
  setShowSaveDialog(false);
};
```

#### 2. Update loadScenarioSet function (around line 856)
**File**: `src/components/ScenarioComparison/index.jsx`

```javascript
const loadScenarioSet = set => {
  const loadedScenarios = set.scenarios.map((s, sIdx) => ({
    ...s,
    id: Date.now() + sIdx,
    // baseParams will be loaded from storage if present
    // Legacy scenarios without baseParams will use merge behavior
  }));
  setScenarios(loadedScenarios);
  setShowLoadDialog(false);
};
```

#### 3. Update exportScenarios function (around line 873)
**File**: `src/components/ScenarioComparison/index.jsx`

```javascript
const exportScenarios = () => {
  if (scenarios.length === 0) return;

  const data = {
    exportedAt: new Date().toISOString(),
    version: 2,  // Version to indicate new format with baseParams
    scenarios: scenarios.map(s => ({
      name: s.name,
      description: s.description,
      baseParams: s.baseParams,
      overrides: s.overrides,
    })),
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `scenarios-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
};
```

#### 4. Update importScenarios function (around line 895)
**File**: `src/components/ScenarioComparison/index.jsx`

```javascript
const importScenarios = useCallback(
  e => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      try {
        const data = JSON.parse(event.target.result);
        if (data.scenarios && Array.isArray(data.scenarios)) {
          const imported = data.scenarios.map((s, sIdx) => ({
            ...s,
            id: Date.now() + sIdx,
            // If importing old format without baseParams, create snapshot from current params + overrides
            baseParams: s.baseParams || { ...params, ...s.overrides },
          }));
          setScenarios([...scenarios, ...imported]);
        }
      } catch (err) {
        alert('Failed to import scenarios: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  },
  [scenarios, params]
);
```

### Success Criteria:

#### Automated Verification:
- [ ] `npm run build` succeeds
- [ ] `npm run test:e2e` passes

#### Manual Verification:
- [ ] Save a scenario set, reload page, verify scenarios still show original values
- [ ] Export scenarios to JSON, import them, verify values preserved
- [ ] Import old-format scenarios (without baseParams), verify they work

---

## Phase 5: Update onScenariosChange Callback

### Overview
Update the callback that reports scenarios to the Chat component.

### Changes Required:

#### 1. Update onScenariosChange effect (around line 636)
**File**: `src/components/ScenarioComparison/index.jsx`

```javascript
useEffect(() => {
  if (onScenariosChange) {
    onScenariosChange(
      scenarioResults.map(s => ({
        name: s.name,
        baseParams: s.baseParams,  // Include for AI context
        overrides: s.overrides,
        summary: s.summary,
      }))
    );
  }
}, [scenarioResults, onScenariosChange]);
```

### Success Criteria:

#### Automated Verification:
- [ ] `npm run build` succeeds

#### Manual Verification:
- [ ] AI chat can still access scenario information

---

## Testing Strategy

### Unit Tests:
- Test deepClone function with nested objects
- Test that scenario creation captures full params
- Test that changing params doesn't affect stored baseParams

### E2E Tests:
- Existing scenario tests should pass
- Add test: create scenario, change base params, verify scenario unchanged

### Manual Testing Steps:
1. Create a "Custom" scenario with current Roth conversions
2. Note the scenario's displayed values
3. Change the base Roth conversion amounts
4. Verify the scenario still shows original values
5. Verify the base case shows new values
6. Save the scenario set, reload page
7. Verify scenarios still show correct original values

## Migration Notes

- **Backward compatible**: Old scenarios without `baseParams` will fall back to legacy merge behavior
- **No data migration needed**: Scenarios will get `baseParams` when re-created or re-saved
- **Version flag in exports**: Exported JSON includes version number for future compatibility

## References

- Original issue: Scenarios affected by base input changes
- Related file: `src/components/ScenarioComparison/index.jsx`
- Related file: `src/hooks/useProjections.js`
