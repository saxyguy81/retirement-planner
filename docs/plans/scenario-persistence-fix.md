# Scenario Persistence Fix Implementation Plan

## Overview

Fix two issues with scenario persistence:
1. **Tab Switching Bug**: Scenarios disappear when switching to other tabs (e.g., Projections) because scenario state is local to the `ScenarioComparison` component
2. **Save Button Bug**: Scenarios are not included in the Save/Load functionality (both localStorage and JSON file export)

## Current State Analysis

### Problem 1: Scenarios don't persist when switching tabs

**Location**: `src/components/ScenarioComparison/index.jsx:532`
```javascript
const [scenarios, setScenarios] = useState([]);
```

This is **local component state**. When the user switches tabs, the ScenarioComparison component unmounts, and when it remounts, the state resets to an empty array.

### Problem 2: Save button doesn't include scenarios

**Location 1**: `src/App.jsx:214-255` - `handleSaveToFile`
```javascript
const saveData = {
  params: { ...params },
  options: { ...options },
  settings: { ...settings },
  aiConfig: loadAIConfig(),
  // ❌ scenarios NOT included
};
```

**Location 2**: `src/hooks/useProjections.js:251-266` - `saveState`
```javascript
const newState = {
  params: { ...params },
  options: { ...options },
  // ❌ scenarios NOT included
};
```

## Desired End State

1. Scenarios persist when switching tabs (same session)
2. Scenarios auto-save to localStorage (like params/options)
3. Scenarios are included in "Save to JSON file"
4. Scenarios are restored when "Load from JSON file"
5. Scenarios are included in browser localStorage saves
6. Scenarios are restored from browser localStorage saves

### Verification Steps:
1. Create 2-3 scenarios on Scenarios tab
2. Switch to Projections tab, then back to Scenarios - scenarios still exist
3. Click Save → JSON File - verify downloaded JSON includes `scenarios` array
4. Refresh browser - scenarios persist (auto-save to localStorage)
5. Click New (reset), then Load saved JSON - scenarios restored

## What We're NOT Doing

- Not changing the ScenarioComparison internal UI/UX
- Not modifying how savedScenarioSets (named scenario sets) work
- Not changing scenario calculation logic
- Not modifying AI/Chat scenario integration (already uses `chatScenarios` which is fine)

## Implementation Approach

Lift scenario state from ScenarioComparison to App.jsx, then integrate with existing persistence flows.

---

## Phase 1: Lift Scenario State to App.jsx

### Overview
Move the working scenarios state from ScenarioComparison to App.jsx so it persists across tab switches.

### Changes Required:

#### 1. Add localStorage key for working scenarios
**File**: `src/App.jsx`
**Changes**: Add constant at top of file

```javascript
const SCENARIOS_STORAGE_KEY = 'retirement-planner-working-scenarios';
```

#### 2. Add state for working scenarios
**File**: `src/App.jsx`
**Changes**: Add useState with localStorage initialization (near line 111)

```javascript
// Working scenarios state (persists across tab switches and page reloads)
const [workingScenarios, setWorkingScenarios] = useState(() => {
  try {
    const saved = localStorage.getItem(SCENARIOS_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    console.error('Failed to load working scenarios:', e);
    return [];
  }
});
```

#### 3. Add auto-save effect for working scenarios
**File**: `src/App.jsx`
**Changes**: Add useEffect after existing effects (near line 178)

```javascript
// Auto-save working scenarios to localStorage
useEffect(() => {
  try {
    localStorage.setItem(SCENARIOS_STORAGE_KEY, JSON.stringify(workingScenarios));
  } catch (e) {
    console.error('Failed to save working scenarios:', e);
  }
}, [workingScenarios]);
```

#### 4. Update ScenarioComparison props
**File**: `src/App.jsx`
**Changes**: Pass scenarios state to ScenarioComparison (around line 867-880)

```jsx
<ScenarioComparison
  params={params}
  projections={projections}
  summary={summary}
  showPV={showPV}
  pendingScenario={pendingScenario}
  onPendingScenarioConsumed={() => setPendingScenario(null)}
  onScenariosChange={handleScenariosChange}
  onApplyScenario={updateParams}
  settings={settings}
  options={options}
  scenarios={workingScenarios}           // NEW
  setScenarios={setWorkingScenarios}     // NEW
/>
```

#### 5. Update ScenarioComparison to use lifted state
**File**: `src/components/ScenarioComparison/index.jsx`
**Changes**:
- Add `scenarios` and `setScenarios` to props
- Remove local useState for scenarios

**Before** (line 520-532):
```javascript
export function ScenarioComparison({
  params,
  projections,
  summary,
  showPV = true,
  pendingScenario = null,
  onPendingScenarioConsumed = null,
  onScenariosChange = null,
  onApplyScenario = null,
  settings = {},
  options = {},
}) {
  const [scenarios, setScenarios] = useState([]);
```

**After**:
```javascript
export function ScenarioComparison({
  params,
  projections,
  summary,
  showPV = true,
  pendingScenario = null,
  onPendingScenarioConsumed = null,
  onScenariosChange = null,
  onApplyScenario = null,
  settings = {},
  options = {},
  scenarios = [],           // NEW - lifted from parent
  setScenarios = null,      // NEW - update function from parent
}) {
  // REMOVE: const [scenarios, setScenarios] = useState([]);
  // Keep the rest of the component unchanged - it already uses scenarios/setScenarios
```

### Success Criteria:

#### Automated Verification:
- [x] `npm run build` succeeds
- [x] `npm run lint` passes
- [x] `npm test` passes

#### Manual Verification:
- [ ] Create scenarios on Scenarios tab
- [ ] Switch to Projections tab, then back - scenarios persist
- [ ] Refresh browser - scenarios persist (via localStorage)

---

## Phase 2: Include Scenarios in Save/Load Flow

### Overview
Add scenarios to JSON file save/load and browser localStorage save/load.

### Changes Required:

#### 1. Update handleSaveToFile to include scenarios
**File**: `src/App.jsx`
**Changes**: Add scenarios to saveData object (line 214-224)

**Before**:
```javascript
const saveData = {
  schemaVersion: 1,
  exportedAt: new Date().toISOString(),
  type: 'retirement-planner-config',
  params: { ...params },
  options: { ...options },
  settings: { ...settings },
  aiConfig: loadAIConfig(),
};
```

**After**:
```javascript
const saveData = {
  schemaVersion: 1,
  exportedAt: new Date().toISOString(),
  type: 'retirement-planner-config',
  params: { ...params },
  options: { ...options },
  settings: { ...settings },
  aiConfig: loadAIConfig(),
  scenarios: workingScenarios,  // NEW
};
```

#### 2. Update handleLoadFromFile to restore scenarios
**File**: `src/App.jsx`
**Changes**: Add scenario restoration in both code paths (lines 276-291)

**In the File System Access API path** (around line 287-291):
```javascript
updateParams(data.params);
if (data.options) setOptions(prev => ({ ...prev, ...data.options }));
if (data.settings) updateSettings(data.settings);
if (data.aiConfig) saveAIConfig(data.aiConfig);
if (data.scenarios) setWorkingScenarios(data.scenarios);  // NEW
```

**In the fallback path** (around line 276-280):
```javascript
updateParams(data.params);
if (data.options) setOptions(prev => ({ ...prev, ...data.options }));
if (data.settings) updateSettings(data.settings);
if (data.aiConfig) saveAIConfig(data.aiConfig);
if (data.scenarios) setWorkingScenarios(data.scenarios);  // NEW
```

#### 3. Update handleConfigImport (fallback file input) to restore scenarios
**File**: `src/App.jsx`
**Changes**: Add scenario restoration (lines 313-326)

**Both code paths** (data.type check and else):
```javascript
// Add after other restore lines
if (data.scenarios) setWorkingScenarios(data.scenarios);
```

#### 4. Update useProjections saveState to include scenarios
**File**: `src/hooks/useProjections.js`
**Changes**:
- Add scenarios parameter to saveState
- Include scenarios in saved state

This requires modifying the hook to accept scenarios from the caller since scenarios state lives in App.jsx.

**Alternative approach**: Pass scenarios through the saveState function as a parameter.

**Before** (line 251-266):
```javascript
const saveState = useCallback(
  (name = '') => {
    const newState = {
      id: Date.now(),
      name: name.trim() || `Saved ${new Date().toLocaleString()}`,
      createdAt: new Date().toISOString(),
      params: { ...params },
      options: { ...options },
    };
```

**After**:
```javascript
const saveState = useCallback(
  (name = '', scenarios = []) => {
    const newState = {
      id: Date.now(),
      name: name.trim() || `Saved ${new Date().toLocaleString()}`,
      createdAt: new Date().toISOString(),
      params: { ...params },
      options: { ...options },
      scenarios: scenarios,  // NEW
    };
```

#### 5. Update useProjections loadState to return scenarios
**File**: `src/hooks/useProjections.js`
**Changes**: Return scenarios from loaded state

**Before** (line 269-278):
```javascript
const loadState = useCallback(
  stateId => {
    const state = savedStates.find(s => s.id === stateId);
    if (state) {
      setParams({ ...DEFAULT_PARAMS, ...state.params });
      setOptions({ ...DEFAULT_OPTIONS, ...state.options });
    }
  },
  [savedStates]
);
```

**After**:
```javascript
const loadState = useCallback(
  stateId => {
    const state = savedStates.find(s => s.id === stateId);
    if (state) {
      setParams({ ...DEFAULT_PARAMS, ...state.params });
      setOptions({ ...DEFAULT_OPTIONS, ...state.options });
      return state.scenarios || [];  // NEW - return scenarios for caller
    }
    return [];
  },
  [savedStates]
);
```

#### 6. Update App.jsx to use modified saveState/loadState
**File**: `src/App.jsx`
**Changes**: Update Save and Load handlers

**handleSave** (line 181-185):
```javascript
const handleSave = useCallback(() => {
  saveState(saveName, workingScenarios);  // Pass scenarios
  setSaveName('');
  setShowSaveDialog(false);
}, [saveState, saveName, workingScenarios]);
```

**Load handler** (around line 584-587):
```javascript
onClick={() => {
  const scenarios = loadState(state.id);
  setWorkingScenarios(scenarios);
  setShowLoadMenu(false);
}}
```

#### 7. Update resetToDefaults to clear scenarios
**File**: `src/App.jsx`
**Changes**: Clear scenarios when user clicks "New"

Find the New button handler (around line 611-616):
```javascript
onClick={() => {
  if (window.confirm('Start a new session? This will clear all current data.')) {
    resetToDefaults();
    setWorkingScenarios([]);  // NEW - also clear scenarios
  }
}}
```

### Success Criteria:

#### Automated Verification:
- [x] `npm run build` succeeds
- [x] `npm run lint` passes
- [x] `npm test` passes
- [x] `npm run test:e2e` passes

#### Manual Verification:
- [ ] Create scenarios, click Save → JSON File, verify JSON contains `scenarios` array
- [ ] Load saved JSON file, verify scenarios are restored
- [ ] Click Save → Browser, then Load that save, verify scenarios restored
- [ ] Click New button, verify scenarios are cleared

---

## Testing Strategy

### Unit Tests:
- Not strictly required for UI state changes
- Existing tests should continue to pass

### E2E Tests:
- Existing scenario E2E tests in `e2e/ci/scenarios.spec.js` should still pass
- May want to add a test for tab-switch persistence

### Manual Testing Steps:
1. Create 2-3 scenarios with different names
2. Switch to Projections tab, then back to Scenarios - verify all scenarios persist
3. Refresh the browser - verify scenarios persist
4. Click Save → JSON File - download and inspect JSON has `scenarios` array
5. Click New to reset everything
6. Click Load → JSON File and select saved file - verify scenarios restored
7. Create scenarios, Save → Browser with a name
8. Click New to reset
9. Click Load → select the browser save - verify scenarios restored

## References

- Scenario state: `src/components/ScenarioComparison/index.jsx:532`
- Save to file: `src/App.jsx:214-255`
- Load from file: `src/App.jsx:258-334`
- useProjections hook: `src/hooks/useProjections.js`
- Persistence layer: `src/lib/persistence.js` (has `scenarios` in schema)
