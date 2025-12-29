# State Persistence Implementation Plan

> **STATUS: COMPLETED** - Implemented 2025-12-28
> All phases fully implemented. Auto-restore, save/load UI, and reset functionality working.

## Overview

Add localStorage-based state persistence to the retirement planner app, allowing users to save, restore, and manage multiple named configurations. The app will auto-restore the last used state on load, with an option to start fresh.

## Current State Analysis

- **State location**: `useProjections` hook manages `params` (~30 fields) and `options` (2 fields)
- **Existing pattern**: ScenarioComparison already uses localStorage for scenario sets
- **Default params**: Defined in `src/lib/taxTables.js:144-204`

## Desired End State

1. App auto-restores last used state on load
2. Users can save current state with optional name
3. Users can view, load, and delete saved states
4. "Start Fresh" button resets to defaults
5. State includes both `params` and `options`

## What We're NOT Doing

- Cloud sync or cross-device persistence
- Undo/redo history
- Automatic periodic saves
- Migration of old saved states (if structure changes)

## Implementation Approach

Modify the `useProjections` hook to handle persistence, and add UI controls to the App header.

---

## Phase 1: Add Persistence Logic to useProjections Hook

### Overview
Add localStorage read/write functions and auto-restore on initialization.

### Changes Required:

#### 1. Update useProjections Hook
**File**: `src/hooks/useProjections.js`

Add storage key and helper functions, modify initialization to auto-restore:

```javascript
// Add at top of file
const STORAGE_KEY = 'retirement-planner-state';
const SAVED_STATES_KEY = 'retirement-planner-saved-states';

// Helper: Load last state from localStorage
const loadLastState = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        params: { ...DEFAULT_PARAMS, ...parsed.params },
        options: { iterativeTax: true, maxIterations: 5, ...parsed.options },
      };
    }
  } catch (e) {
    console.error('Failed to load saved state:', e);
  }
  return null;
};

// Helper: Save current state to localStorage
const saveCurrentState = (params, options) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ params, options }));
  } catch (e) {
    console.error('Failed to save state:', e);
  }
};

// Helper: Load all saved states
const loadSavedStates = () => {
  try {
    const saved = localStorage.getItem(SAVED_STATES_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load saved states:', e);
  }
  return [];
};

// Helper: Save states list
const saveSavedStates = (states) => {
  try {
    localStorage.setItem(SAVED_STATES_KEY, JSON.stringify(states));
  } catch (e) {
    console.error('Failed to save states list:', e);
  }
};
```

Modify the hook to use auto-restore and expose new functions:

```javascript
export function useProjections(initialParams = {}) {
  // Auto-restore last state or use defaults
  const [params, setParams] = useState(() => {
    const restored = loadLastState();
    if (restored) {
      return restored.params;
    }
    return { ...DEFAULT_PARAMS, ...initialParams };
  });

  const [options, setOptions] = useState(() => {
    const restored = loadLastState();
    if (restored) {
      return restored.options;
    }
    return { iterativeTax: true, maxIterations: 5 };
  });

  const [savedStates, setSavedStates] = useState(() => loadSavedStates());

  // Auto-save whenever params or options change
  useEffect(() => {
    saveCurrentState(params, options);
  }, [params, options]);

  // ... existing projections/summary useMemo ...

  // Save current state with optional name
  const saveState = useCallback((name = '') => {
    const newState = {
      id: Date.now(),
      name: name.trim() || `Saved ${new Date().toLocaleString()}`,
      createdAt: new Date().toISOString(),
      params: { ...params },
      options: { ...options },
    };
    const updated = [...savedStates, newState];
    setSavedStates(updated);
    saveSavedStates(updated);
    return newState;
  }, [params, options, savedStates]);

  // Load a saved state
  const loadState = useCallback((stateId) => {
    const state = savedStates.find(s => s.id === stateId);
    if (state) {
      setParams({ ...DEFAULT_PARAMS, ...state.params });
      setOptions({ iterativeTax: true, maxIterations: 5, ...state.options });
    }
  }, [savedStates]);

  // Delete a saved state
  const deleteState = useCallback((stateId) => {
    const updated = savedStates.filter(s => s.id !== stateId);
    setSavedStates(updated);
    saveSavedStates(updated);
  }, [savedStates]);

  // Reset to defaults (start fresh)
  const resetToDefaults = useCallback(() => {
    setParams({ ...DEFAULT_PARAMS });
    setOptions({ iterativeTax: true, maxIterations: 5 });
  }, []);

  return {
    // Existing exports
    params,
    options,
    projections,
    summary,
    updateParam,
    updateParams,
    updateRothConversion,
    toggleIterative,
    setMaxIterations,
    // New exports
    savedStates,
    saveState,
    loadState,
    deleteState,
    resetToDefaults,
  };
}
```

### Success Criteria:

#### Automated Verification:
- [ ] Build succeeds: `npm run build`
- [ ] No TypeScript/linting errors: `npm run lint` (if configured)

#### Manual Verification:
- [ ] App loads with last used state (change a param, refresh, verify it persists)
- [ ] Changing params auto-saves to localStorage
- [ ] `resetToDefaults()` clears to default params

---

## Phase 2: Add UI Controls to App Header

### Overview
Add Save/Load dropdown and "Start Fresh" button to the header.

### Changes Required:

#### 1. Update App.jsx
**File**: `src/App.jsx`

Add new state and UI for save/load functionality:

```javascript
// Add to imports
import { Save, FolderOpen, RotateCcw, Trash2 } from 'lucide-react';

// Add to destructured hook returns (around line 55)
const {
  // ... existing ...
  savedStates,
  saveState,
  loadState,
  deleteState,
  resetToDefaults,
} = useProjections();

// Add new state for UI
const [showSaveDialog, setShowSaveDialog] = useState(false);
const [showLoadMenu, setShowLoadMenu] = useState(false);
const [saveName, setSaveName] = useState('');
const loadMenuRef = useRef(null);

// Add click-outside handler for load menu (similar to export menu)
useEffect(() => {
  const handleClickOutside = (e) => {
    if (loadMenuRef.current && !loadMenuRef.current.contains(e.target)) {
      setShowLoadMenu(false);
    }
  };
  document.addEventListener('mousedown', handleClickOutside);
  return () => document.removeEventListener('mousedown', handleClickOutside);
}, []);

// Save handler
const handleSave = () => {
  saveState(saveName);
  setSaveName('');
  setShowSaveDialog(false);
};
```

Add UI in header (after Import button, before Export button):

```jsx
{/* State Management Buttons */}
<button
  onClick={() => setShowSaveDialog(true)}
  className="px-2 py-1 bg-slate-700 text-white rounded text-xs flex items-center gap-1 hover:bg-slate-600"
  title="Save current state"
>
  <Save className="w-3 h-3" />
  Save
</button>

<div className="relative" ref={loadMenuRef}>
  <button
    onClick={() => setShowLoadMenu(!showLoadMenu)}
    className="px-2 py-1 bg-slate-700 text-white rounded text-xs flex items-center gap-1 hover:bg-slate-600"
    title="Load saved state"
  >
    <FolderOpen className="w-3 h-3" />
    Load
    <ChevronDown className="w-3 h-3" />
  </button>
  {showLoadMenu && (
    <div className="absolute right-0 mt-1 w-64 bg-slate-800 border border-slate-700 rounded shadow-lg z-50 max-h-64 overflow-y-auto">
      {savedStates.length === 0 ? (
        <div className="px-3 py-2 text-slate-400 text-xs">No saved states</div>
      ) : (
        savedStates.map(state => (
          <div
            key={state.id}
            className="px-3 py-2 hover:bg-slate-700 flex items-center justify-between group"
          >
            <button
              onClick={() => { loadState(state.id); setShowLoadMenu(false); }}
              className="flex-1 text-left"
            >
              <div className="text-slate-200 text-xs">{state.name}</div>
              <div className="text-slate-500 text-xs">
                {new Date(state.createdAt).toLocaleDateString()}
              </div>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); deleteState(state.id); }}
              className="p-1 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))
      )}
    </div>
  )}
</div>

<button
  onClick={resetToDefaults}
  className="px-2 py-1 bg-amber-600 text-white rounded text-xs flex items-center gap-1 hover:bg-amber-500"
  title="Start fresh with defaults"
>
  <RotateCcw className="w-3 h-3" />
  Fresh
</button>

{/* Save Dialog Modal */}
{showSaveDialog && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 w-80">
      <div className="text-slate-200 font-medium mb-3">Save Current State</div>
      <input
        type="text"
        value={saveName}
        onChange={(e) => setSaveName(e.target.value)}
        placeholder="Optional name (or leave blank)"
        className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm mb-3 focus:border-blue-500 focus:outline-none"
        autoFocus
        onKeyDown={(e) => e.key === 'Enter' && handleSave()}
      />
      <div className="flex justify-end gap-2">
        <button
          onClick={() => { setShowSaveDialog(false); setSaveName(''); }}
          className="px-3 py-1.5 bg-slate-700 text-slate-300 rounded text-xs hover:bg-slate-600"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-500"
        >
          Save
        </button>
      </div>
    </div>
  </div>
)}
```

### Success Criteria:

#### Automated Verification:
- [ ] Build succeeds: `npm run build`

#### Manual Verification:
- [ ] Save button opens dialog
- [ ] Can save with custom name
- [ ] Can save without name (auto-generates timestamp name)
- [ ] Load dropdown shows all saved states
- [ ] Clicking a saved state loads it
- [ ] Delete button removes saved state
- [ ] "Fresh" button resets to defaults
- [ ] State persists across browser refresh
- [ ] Multiple saved states work correctly

---

## Testing Strategy

### Manual Testing Steps:
1. Load app fresh - verify default params
2. Change several params (expenses, returns, etc.)
3. Refresh browser - verify params persisted
4. Click "Save" - enter a name - verify appears in Load menu
5. Click "Fresh" - verify reset to defaults
6. Load the saved state - verify params restored
7. Save another state without a name - verify auto-name
8. Delete a saved state - verify removed from list
9. Close browser completely, reopen - verify last state restored

## References

- Existing localStorage pattern: `src/components/ScenarioComparison/index.jsx:73-93`
- Default params: `src/lib/taxTables.js:144-204`
- useProjections hook: `src/hooks/useProjections.js`
