# Comprehensive Enhancement Plan - Retirement Planner

## Overview

This plan covers multiple enhancements to the retirement planner application:
1. Update default values to generic "90th percentile" example
2. Rename "Fresh" to "New" and improve session management
3. Add schema-versioned localStorage persistence with JSON export/import
4. Add AI agent with chat sessions and scenario tools
5. Remove "Balance Roth Ratio" optimizer target
6. Fix expense override year/age input bug
7. Update Roth conversion input to match expense override UX
8. Add "Create Scenario" from optimizer results

## Current State Analysis

### Key Files:
- `src/lib/taxTables.js` - DEFAULT_PARAMS with specific values for "Ira"
- `src/hooks/useProjections.js` - State management, localStorage persistence (no schema version)
- `src/components/InputPanel/index.jsx` - Expense overrides, Roth conversions (hardcoded years)
- `src/components/InputPanel/SmartYearInput.jsx` - Year/age detection (has silent validation bug)
- `src/components/Optimization/index.jsx` - Optimizer with 4 objectives including balanceRoth
- `src/App.jsx` - Main app with "Fresh" button

### Current localStorage Keys:
- `retirement-planner-state` - Current params/options
- `retirement-planner-saved-states` - Named saves
- `retirement-planner-settings` - Global settings
- `retirement-planner-scenarios` - Scenario comparison saves

## What We're NOT Doing

- Backend/server-side code (pure frontend app)
- Context window compaction for chat (user starts new session instead)
- Real-time collaboration features
- Mobile-specific optimizations

---

## Phase 1: Default Values and Session Management

### Overview
Update default values to represent a "90th percentile" retiree and improve the "New Session" UX.

### Changes Required:

#### 1. Update DEFAULT_PARAMS in taxTables.js
**File**: `src/lib/taxTables.js`
**Changes**: Replace specific values with generic 90th percentile example

```javascript
export const DEFAULT_PARAMS = {
  // Timeline
  startYear: 2025,
  endYear: 2054,
  birthYear: 1960, // Age 65 in 2025
  taxYear: 2025,

  // Starting Account Balances (90th percentile)
  afterTaxStart: 1500000,  // $1.5M after-tax
  iraStart: 3000000,       // $3M traditional IRA
  rothStart: 2000000,      // $2M Roth
  afterTaxCostBasis: 500000, // Reasonable cost basis

  // Return Assumptions
  returnMode: 'blended',
  atReturn: 0.05,
  iraReturn: 0.06,
  rothReturn: 0.07,

  // Risk-Based Returns
  lowRiskTarget: 2500000,
  modRiskTarget: 2500000,
  lowRiskReturn: 0.04,
  modRiskReturn: 0.06,
  highRiskReturn: 0.08,

  // Social Security
  socialSecurityMonthly: 4000, // Combined monthly
  ssCOLA: 0.025,

  // Expenses
  annualExpenses: 120000, // $120K annual
  expenseInflation: 0.03,
  expenseOverrides: {},

  // Tax Parameters
  stateTaxRate: 0.05,
  capitalGainsPercent: 0.70,
  bracketInflation: 0.025,
  exemptSSFromTax: false,

  // Roth Conversions (empty by default)
  rothConversions: {},

  // AT Harvest Overrides
  atHarvestOverrides: {},

  // MAGI History
  magi2023: 0,
  magi2024: 0,

  // Survivor Scenario
  survivorDeathYear: null,
  survivorSSPercent: 0.67,
  survivorExpensePercent: 0.70,

  // Heir Parameters
  heirFedRate: 0.32,
  heirStateRate: 0.05,
  heirs: [],
  heirDistributionStrategy: 'even',
  heirNormalizationYears: 10,

  // Calculation Options
  iterativeTax: true,
  maxIterations: 5,
  discountRate: 0.03,
};
```

#### 2. Update DEFAULT_SETTINGS in useProjections.js
**File**: `src/hooks/useProjections.js`
**Changes**: Use generic names

```javascript
const DEFAULT_SETTINGS = {
  primaryName: 'Primary',
  primaryBirthYear: 1960,
  spouseName: 'Spouse',
  spouseBirthYear: 1962,
  taxYear: 2025,
  ssExemptionMode: 'disabled',
  defaultPV: true,
  displayPrecision: 'sig3',
  customBrackets: null,
  customIRMAA: null,
};
```

#### 3. Update "Fresh" button to "New" in App.jsx
**File**: `src/App.jsx`
**Changes**: Rename button, add confirmation dialog

```jsx
// Change button text and add confirmation
<button
  onClick={() => {
    if (window.confirm('Start a new session? This will clear all current data.')) {
      resetToDefaults();
    }
  }}
  className="px-2 py-1 bg-amber-600 text-white rounded text-xs flex items-center gap-1 hover:bg-amber-500"
  title="Start a new session with default values"
>
  <RotateCcw className="w-3 h-3" />
  New
</button>
```

### Success Criteria:

#### Automated Verification:
- [x] Unit tests pass: `npm run test:unit`
- [x] Lint passes: `npm run lint`
- [x] Build succeeds: `npm run build`

#### Manual Verification:
- [x] Clicking "New" shows confirmation dialog
- [x] Default values show 90th percentile amounts
- [x] Profile names show "Primary" and "Spouse" instead of "Ira" and "Carol"

---

## Phase 2: Schema-Versioned Persistence with Export/Import

### Overview
Add schema versioning to localStorage and enable JSON export/import for cross-browser portability.

### Changes Required:

#### 1. Create new persistence module
**File**: `src/lib/persistence.js` (NEW)
**Changes**: Create schema-versioned persistence layer

```javascript
/**
 * Schema-Versioned Persistence Layer
 *
 * Handles saving/loading profiles with forward compatibility.
 * When loading older schemas, missing fields get defaults and
 * a migration message is shown.
 */

const CURRENT_SCHEMA_VERSION = 1;

// Storage keys
const STORAGE_KEYS = {
  currentProfile: 'rp-current-profile',
  profiles: 'rp-profiles',
  settings: 'rp-settings',
  chatSessions: 'rp-chat-sessions',
};

/**
 * Profile structure with schema version
 */
const createProfile = (data = {}) => ({
  schemaVersion: CURRENT_SCHEMA_VERSION,
  id: data.id || Date.now(),
  name: data.name || 'Untitled Profile',
  createdAt: data.createdAt || new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  params: data.params || {},
  options: data.options || {},
  settings: data.settings || {},
  scenarios: data.scenarios || [],
  chatSessions: data.chatSessions || [],
});

/**
 * Migrate profile from older schema versions
 */
const migrateProfile = (profile) => {
  const messages = [];
  let migrated = { ...profile };

  // Handle missing schema version (pre-versioning)
  if (!migrated.schemaVersion) {
    migrated.schemaVersion = 0;
    messages.push('Migrated from pre-versioned format');
  }

  // Migration from v0 to v1
  if (migrated.schemaVersion < 1) {
    // Add any new required fields with defaults
    migrated.chatSessions = migrated.chatSessions || [];
    migrated.scenarios = migrated.scenarios || [];
    migrated.schemaVersion = 1;
    messages.push('Added chat session and scenario support');
  }

  // Future migrations would go here
  // if (migrated.schemaVersion < 2) { ... }

  migrated.updatedAt = new Date().toISOString();

  return { profile: migrated, messages };
};

/**
 * Save profile to localStorage
 */
export const saveProfile = (profile) => {
  try {
    const fullProfile = createProfile(profile);
    localStorage.setItem(
      STORAGE_KEYS.currentProfile,
      JSON.stringify(fullProfile)
    );
    return { success: true };
  } catch (e) {
    console.error('Failed to save profile:', e);
    return { success: false, error: e.message };
  }
};

/**
 * Load profile from localStorage with migration
 */
export const loadProfile = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.currentProfile);
    if (!saved) return { profile: null, messages: [] };

    const parsed = JSON.parse(saved);
    const { profile, messages } = migrateProfile(parsed);

    // Auto-save migrated profile
    if (messages.length > 0) {
      saveProfile(profile);
    }

    return { profile, messages };
  } catch (e) {
    console.error('Failed to load profile:', e);
    return { profile: null, messages: [], error: e.message };
  }
};

/**
 * Export profile to JSON file (for sharing/backup)
 */
export const exportProfileToJSON = (profile, filename = 'retirement-profile') => {
  const fullProfile = createProfile(profile);
  const blob = new Blob(
    [JSON.stringify(fullProfile, null, 2)],
    { type: 'application/json' }
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

/**
 * Import profile from JSON file
 * Returns profile and any migration messages
 */
export const importProfileFromJSON = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        const { profile, messages } = migrateProfile(data);
        resolve({ profile, messages });
      } catch (err) {
        reject(new Error('Invalid JSON file: ' + err.message));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
};

/**
 * List all saved profiles
 */
export const listProfiles = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.profiles);
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    return [];
  }
};

/**
 * Save profile to named profiles list
 */
export const saveNamedProfile = (profile) => {
  const profiles = listProfiles();
  const existing = profiles.findIndex(p => p.id === profile.id);
  const fullProfile = createProfile(profile);

  if (existing >= 0) {
    profiles[existing] = fullProfile;
  } else {
    profiles.push(fullProfile);
  }

  localStorage.setItem(STORAGE_KEYS.profiles, JSON.stringify(profiles));
  return fullProfile;
};

/**
 * Delete a named profile
 */
export const deleteNamedProfile = (profileId) => {
  const profiles = listProfiles().filter(p => p.id !== profileId);
  localStorage.setItem(STORAGE_KEYS.profiles, JSON.stringify(profiles));
};

export { CURRENT_SCHEMA_VERSION, STORAGE_KEYS };
```

#### 2. Update useProjections hook
**File**: `src/hooks/useProjections.js`
**Changes**: Integrate new persistence layer, add profile management

Add imports and update the hook to use the new persistence layer. The existing localStorage logic will be migrated to use the new schema-versioned system.

#### 3. Add export/import UI in App.jsx header
**File**: `src/App.jsx`
**Changes**: Update Import/Export to use new persistence layer

The existing export menu will be updated to include "Export Profile (JSON)" option that exports the full profile including scenarios and chat sessions.

#### 4. Add migration notification component
**File**: `src/components/MigrationNotice.jsx` (NEW)
**Changes**: Show user-friendly message when profile is migrated

```jsx
export function MigrationNotice({ messages, onDismiss }) {
  if (!messages || messages.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 max-w-sm bg-blue-900/90 border border-blue-700 rounded-lg p-4 shadow-lg z-50">
      <div className="flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
        <div>
          <div className="text-blue-200 font-medium mb-1">Profile Updated</div>
          <div className="text-blue-300 text-sm mb-2">
            Your saved profile was from an older version. The following updates were applied:
          </div>
          <ul className="text-blue-300 text-xs space-y-1 mb-3">
            {messages.map((msg, i) => (
              <li key={i}>• {msg}</li>
            ))}
          </ul>
          <button
            onClick={onDismiss}
            className="px-3 py-1 bg-blue-700 text-white text-xs rounded hover:bg-blue-600"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
```

### Success Criteria:

#### Automated Verification:
- [x] Unit tests for persistence module: `npm run test:unit`
- [x] Lint passes: `npm run lint`
- [x] Build succeeds: `npm run build`

#### Manual Verification:
- [x] Export Profile creates valid JSON file with schemaVersion
- [x] Import Profile loads data and shows migration notice if needed
- [x] Older profiles (without schemaVersion) are auto-migrated
- [x] Profile includes scenarios and chat sessions when saved

---

## Phase 3: Fix Expense Override Bug

### Overview
Fix the silent validation failure in SmartYearInput when entering age/year values.

### Root Cause
In `SmartYearInput.jsx`, when user enters an age that converts to a year outside the valid range (e.g., age 70 with birthYear 1960 → year 2030, but if min=2025 it's valid; however age 64 → 2024 which is < min=2025), the `onChange` is silently not called, leaving the parent state unchanged while the user sees their input displayed.

### Changes Required:

#### 1. Update SmartYearInput to always call onChange
**File**: `src/components/InputPanel/SmartYearInput.jsx`
**Changes**: Add explicit error state and always communicate validation status

```jsx
export function SmartYearInput({
  value,
  onChange,
  onValidationError, // NEW: callback for validation errors
  birthYear = 1960,
  min = 2025,
  max = 2100,
  placeholder = 'Year or Age',
  className = '',
}) {
  const [inputValue, setInputValue] = useState(value?.toString() || '');
  const [mode, setMode] = useState('year');
  const [isFocused, setIsFocused] = useState(false);
  const [validationError, setValidationError] = useState(null);

  useEffect(() => {
    if (!isFocused && value) {
      setInputValue(value.toString());
      setValidationError(null);
    }
  }, [value, isFocused]);

  const handleChange = e => {
    const raw = e.target.value;
    setInputValue(raw);
    setValidationError(null);

    if (!raw.trim()) {
      onChange(null);
      return;
    }

    const detected = detectAgeOrYear(raw, birthYear);

    if (detected.type === 'year' || detected.type === 'age') {
      setMode(detected.type);

      // Validate the resulting year
      if (detected.value < min) {
        const error = `Year ${detected.value} is before ${min}`;
        setValidationError(error);
        onValidationError?.(error);
        return;
      }
      if (detected.value > max) {
        const error = `Year ${detected.value} is after ${max}`;
        setValidationError(error);
        onValidationError?.(error);
        return;
      }

      // Valid - call onChange
      onChange(detected.value);
    } else {
      setValidationError('Enter a year (2025-2100) or age (65-120)');
    }
  };

  // ... rest of component with validationError display
}
```

#### 2. Update InputPanel expense override section
**File**: `src/components/InputPanel/index.jsx`
**Changes**: Handle validation errors from SmartYearInput

Add error state and display validation feedback to user.

### Success Criteria:

#### Automated Verification:
- [x] Unit tests pass: `npm run test:unit`
- [x] Lint passes: `npm run lint`

#### Manual Verification:
- [x] Entering age 64 (with birth year 1960) shows "Year 2024 is before 2025"
- [x] Entering age 65 correctly adds 2025 expense override
- [x] Entering year 2030 directly works
- [x] Error message clears when valid input is entered

---

## Phase 4: Roth Conversion Input Enhancement

### Overview
Change Roth conversion entry to match expense override UX - supporting dynamic year/age entry instead of hardcoded year list.

### Changes Required:

#### 1. Update InputPanel Roth Conversions section
**File**: `src/components/InputPanel/index.jsx`
**Changes**: Replace hardcoded year inputs with dynamic add/remove pattern

```jsx
{/* Roth Conversions - Dynamic like Expense Overrides */}
<InputSection
  title="Roth Conversions"
  icon={Zap}
  expanded={expanded.includes('conversions')}
  onToggle={() => toggle('conversions')}
  color="blue"
>
  {Object.keys(params.rothConversions || {}).length === 0 ? (
    <div className="text-slate-500 text-xs mb-2">No conversions scheduled</div>
  ) : (
    Object.entries(params.rothConversions || {})
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([year, amount]) => (
        <div key={year} className="flex items-center gap-1 py-0.5">
          <span className="text-slate-400 text-xs w-10">{year}</span>
          <input
            type="text"
            value={`$${amount.toLocaleString()}`}
            onFocus={e => (e.target.value = amount.toString())}
            onBlur={e => {
              const parsed = parseFloat(e.target.value.replace(/[,$]/g, ''));
              if (!isNaN(parsed) && parsed >= 0) {
                updateRothConversion(Number(year), parsed);
              }
              e.target.value = `$${(parsed || amount).toLocaleString()}`;
            }}
            onKeyDown={e => e.key === 'Enter' && e.target.blur()}
            className="flex-1 text-right bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-xs"
          />
          <button
            onClick={() => updateRothConversion(Number(year), null)}
            className="p-0.5 text-slate-500 hover:text-red-400"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))
  )}

  {/* Add new conversion */}
  <div className="mt-2 pt-2 border-t border-slate-700">
    <div className="flex items-center gap-1">
      <div className="flex-1">
        <SmartYearInput
          value={newConversionYear ? parseInt(newConversionYear) : null}
          onChange={year => {
            if (year && !params.rothConversions?.[year]) {
              setNewConversionYear(year.toString());
            }
          }}
          birthYear={birthYear}
          min={params.startYear || 2025}
          max={params.endYear || 2060}
          placeholder="Year or Age"
        />
      </div>
      <button
        onClick={() => {
          const year = parseInt(newConversionYear);
          if (year && !params.rothConversions?.[year]) {
            updateRothConversion(year, 100000); // Default to $100K
            setNewConversionYear('');
          }
        }}
        className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs flex items-center gap-1 hover:bg-slate-600"
      >
        <Plus className="w-3 h-3" />
        Add
      </button>
    </div>
    <div className="text-slate-500 text-[10px] mt-1">
      Enter year or age. Conversion amount capped by available IRA balance.
    </div>
  </div>
</InputSection>
```

#### 2. Update useProjections hook
**File**: `src/hooks/useProjections.js`
**Changes**: Update `updateRothConversion` to handle null for deletion

```javascript
const updateRothConversion = useCallback((year, amount) => {
  setParams(prev => {
    const newConversions = { ...prev.rothConversions };
    if (amount === null || amount === 0) {
      delete newConversions[year]; // Remove conversion if cleared
    } else {
      newConversions[year] = amount;
    }
    return { ...prev, rothConversions: newConversions };
  });
}, []);
```

### Success Criteria:

#### Automated Verification:
- [x] Unit tests pass: `npm run test:unit`
- [x] Lint passes: `npm run lint`

#### Manual Verification:
- [x] Can add Roth conversion for any year by typing year or age
- [x] Can edit existing conversion amounts
- [x] Can delete conversions with X button
- [x] Conversions sort by year

---

## Phase 5: Remove "Balance Roth Ratio" Optimizer Target

### Overview
Remove the `balanceRoth` objective from the optimizer.

### Changes Required:

#### 1. Update OBJECTIVES array in Optimization component
**File**: `src/components/Optimization/index.jsx`
**Changes**: Remove balanceRoth objective and its associated UI

```javascript
// Remove this entry from OBJECTIVES:
// {
//   id: 'balanceRoth',
//   name: 'Balance Roth Ratio',
//   description: 'Target a specific Roth percentage (e.g., 50%)',
//   icon: BarChart2,
//   metric: 'finalRothPercent',
//   better: 'target',
//   target: 0.5,
// },

// Also remove the targetRoth state and slider UI
```

### Success Criteria:

#### Automated Verification:
- [x] Unit tests pass: `npm run test:unit`
- [x] Lint passes: `npm run lint`

#### Manual Verification:
- [x] Only 3 objectives shown: Maximize Heir Value, Minimize Lifetime Tax, Maximize Portfolio
- [x] No Roth % target slider visible

---

## Phase 6: Optimizer "Create Scenario" Feature

### Overview
Add ability to create a scenario from optimizer results for further exploration.

### Changes Required:

#### 1. Add "Create Scenario" button to optimizer results
**File**: `src/components/Optimization/index.jsx`
**Changes**: Add button and callback to create scenario from result

```jsx
// In the results table row, add:
<button
  onClick={() => createScenarioFromResult(s)}
  className="px-2 py-1 bg-purple-600 text-white rounded text-xs hover:bg-purple-500"
  title="Create scenario with these conversions"
>
  Create Scenario
</button>
```

#### 2. Pass createScenario callback from parent
**File**: `src/App.jsx`
**Changes**: Add callback to switch to Scenarios tab and create new scenario

```jsx
<Optimization
  params={params}
  projections={projections}
  summary={summary}
  updateParams={updateParams}
  onCreateScenario={(conversions, name) => {
    // Switch to scenarios tab and create scenario
    setActiveTab('scenarios');
    // Pass to ScenarioComparison via ref or context
  }}
/>
```

#### 3. Update ScenarioComparison to accept external scenario creation
**File**: `src/components/ScenarioComparison/index.jsx`
**Changes**: Add imperative handle or callback for external scenario creation

### Success Criteria:

#### Automated Verification:
- [x] Unit tests pass: `npm run test:unit`
- [x] Lint passes: `npm run lint`

#### Manual Verification:
- [x] "Create Scenario" button appears in optimizer results
- [x] Clicking button switches to Scenarios tab
- [x] New scenario is created with the selected conversion strategy
- [x] Scenario name includes the strategy description

---

## Phase 7: AI Agent with Chat Sessions

### Overview
Add AI-powered assistant that can answer questions, run scenarios, and perform calculations.

### Changes Required:

#### 1. Create AI service module
**File**: `src/lib/aiService.js` (NEW)
**Changes**: Create AI provider abstraction with tool definitions

```javascript
/**
 * AI Service - Handles communication with LLM providers
 *
 * Supports:
 * - Direct API keys (Anthropic, OpenAI)
 * - OpenRouter (proxy for multiple models)
 * - Custom endpoints (LM Studio, Ollama, etc.)
 */

// Tool definitions for the AI agent
export const AGENT_TOOLS = [
  {
    name: 'create_scenario',
    description: 'Create a new retirement scenario with specified parameters',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name for the scenario' },
        overrides: {
          type: 'object',
          description: 'Parameter overrides (rothConversions, expenses, etc.)'
        },
        duplicateFrom: {
          type: 'string',
          description: 'Optional: ID of existing scenario to duplicate'
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'run_projection',
    description: 'Run retirement projections with current or custom parameters',
    parameters: {
      type: 'object',
      properties: {
        overrides: { type: 'object', description: 'Optional parameter overrides' },
      },
    },
  },
  {
    name: 'get_current_state',
    description: 'Get current retirement plan parameters, projections, and summary',
    parameters: {
      type: 'object',
      properties: {
        include: {
          type: 'array',
          items: { type: 'string', enum: ['params', 'projections', 'summary', 'scenarios'] },
          description: 'What data to include',
        },
      },
    },
  },
  {
    name: 'calculate',
    description: 'Perform a calculation using JavaScript',
    parameters: {
      type: 'object',
      properties: {
        expression: { type: 'string', description: 'JavaScript expression to evaluate' },
      },
      required: ['expression'],
    },
  },
  {
    name: 'compare_scenarios',
    description: 'Compare multiple scenarios and summarize differences',
    parameters: {
      type: 'object',
      properties: {
        scenarioIds: { type: 'array', items: { type: 'string' } },
        metrics: {
          type: 'array',
          items: { type: 'string' },
          description: 'Metrics to compare (endingPortfolio, heirValue, totalTax, etc.)',
        },
      },
    },
  },
];

// Provider configurations
export const PROVIDERS = {
  anthropic: {
    name: 'Anthropic (Claude)',
    baseUrl: 'https://api.anthropic.com/v1/messages',
    models: ['claude-sonnet-4-20250514', 'claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022'],
    headers: (apiKey) => ({
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    }),
  },
  openai: {
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1/chat/completions',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
    headers: (apiKey) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    }),
  },
  openrouter: {
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
    models: ['anthropic/claude-sonnet-4', 'openai/gpt-4o', 'google/gemini-pro-1.5'],
    headers: (apiKey) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
    }),
  },
  custom: {
    name: 'Custom Endpoint',
    baseUrl: '', // User provides
    models: [], // User provides
    headers: (apiKey) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    }),
  },
};

/**
 * AI Service class
 */
export class AIService {
  constructor(config) {
    this.provider = config.provider || 'anthropic';
    this.apiKey = config.apiKey;
    this.model = config.model;
    this.customBaseUrl = config.customBaseUrl;
  }

  async sendMessage(messages, tools, onToolCall) {
    const providerConfig = PROVIDERS[this.provider];
    const baseUrl = this.customBaseUrl || providerConfig.baseUrl;

    // Format request based on provider
    const request = this.formatRequest(messages, tools);

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: providerConfig.headers(this.apiKey),
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'API request failed');
    }

    const data = await response.json();
    return this.parseResponse(data, onToolCall);
  }

  formatRequest(messages, tools) {
    if (this.provider === 'anthropic') {
      return {
        model: this.model,
        max_tokens: 4096,
        messages: messages.map(m => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        })),
        tools: tools?.map(t => ({
          name: t.name,
          description: t.description,
          input_schema: t.parameters,
        })),
      };
    } else {
      // OpenAI / OpenRouter format
      return {
        model: this.model,
        messages,
        tools: tools?.map(t => ({
          type: 'function',
          function: {
            name: t.name,
            description: t.description,
            parameters: t.parameters,
          },
        })),
      };
    }
  }

  parseResponse(data, onToolCall) {
    // Parse based on provider format
    // Handle tool calls, return assistant message
    // ...
  }
}
```

#### 2. Create Chat component
**File**: `src/components/Chat/index.jsx` (NEW)
**Changes**: Create chat UI with message history and input

```jsx
/**
 * Chat Component
 *
 * AI-powered chat interface for retirement planning assistance.
 * Features:
 * - Message history with user/assistant roles
 * - Tool call execution and results display
 * - Session management (save/load)
 * - Provider configuration
 */

export function Chat({
  params,
  projections,
  summary,
  scenarios,
  onCreateScenario,
  onUpdateParams,
  aiConfig,
  chatSession,
  onUpdateChatSession,
}) {
  const [messages, setMessages] = useState(chatSession?.messages || []);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // ... implementation
}
```

#### 3. Create AI Settings panel
**File**: `src/components/AISettings/index.jsx` (NEW)
**Changes**: Create configuration UI for AI providers

```jsx
/**
 * AI Settings Panel
 *
 * Configure AI provider, API key, and model selection.
 * Settings are saved to localStorage (encrypted for API keys).
 */

export function AISettings({ config, onUpdateConfig }) {
  // Provider selection
  // API key input (with show/hide toggle)
  // Model selection
  // Custom endpoint configuration
  // Test connection button
}
```

#### 4. Add Chat tab to main app
**File**: `src/App.jsx`
**Changes**: Add Chat tab and integrate AI service

Add new tab to TABS array and corresponding lazy-loaded component.

#### 5. Add AI config to settings persistence
**File**: `src/lib/persistence.js`
**Changes**: Include AI config in profile (with API key encryption)

```javascript
// Add simple encryption for API keys (not secure storage, just obfuscation)
const encryptApiKey = (key) => btoa(key);
const decryptApiKey = (encrypted) => atob(encrypted);
```

### Success Criteria:

#### Automated Verification:
- [x] Unit tests pass: `npm run test:unit`
- [x] Lint passes: `npm run lint`
- [x] Build succeeds: `npm run build`

#### Manual Verification:
- [x] Can configure Anthropic API key and send messages
- [x] Can configure OpenAI API key and send messages
- [x] Can configure OpenRouter and send messages
- [x] Can configure custom endpoint
- [x] AI can answer questions about current projections
- [x] AI can create new scenarios via tool calls
- [x] AI can perform calculations
- [x] Chat history is saved with profile
- [x] Context limit warning shown when approaching limit
- [x] "New Chat" button clears history

---

## Phase 8: Integration Testing

### Overview
End-to-end testing of all new features working together.

### Test Scenarios:

1. **New User Flow**
   - Start with "New" button
   - See default 90th percentile values
   - Configure AI provider
   - Ask AI to explain projections
   - Create scenario via AI

2. **Profile Migration Flow**
   - Import old JSON file (no schemaVersion)
   - See migration notice
   - Verify data loaded correctly
   - Export updated profile

3. **Optimizer to Scenario Flow**
   - Run optimization
   - Click "Create Scenario" on result
   - Verify scenario created in Scenarios tab
   - Compare with base case

4. **Full Export/Import Cycle**
   - Configure everything (params, scenarios, chat)
   - Export profile
   - Click "New" to reset
   - Import profile
   - Verify all data restored

### Success Criteria:

#### Automated Verification:
- [x] All unit tests pass: `npm run test:unit`
- [x] Lint passes: `npm run lint`
- [x] Build succeeds: `npm run build`
- [x] E2E tests pass: `npm run test:e2e` (if available)

#### Manual Verification:
- [x] All test scenarios complete successfully
- [x] No console errors
- [x] Performance acceptable (no lag on interactions)

---

## Implementation Order

Recommended sequence:
1. **Phase 1** - Default values (quick win, low risk)
2. **Phase 3** - Fix expense override bug (bug fix priority)
3. **Phase 4** - Roth conversion UX (builds on Phase 3 pattern)
4. **Phase 5** - Remove balanceRoth (quick change)
5. **Phase 2** - Schema versioning (foundational for Phase 7)
6. **Phase 6** - Optimizer create scenario
7. **Phase 7** - AI agent (largest feature, depends on Phase 2)
8. **Phase 8** - Integration testing

---

## References

- Current codebase: `/Users/smhanan/CascadeProjects/retirement-planner`
- Main state hook: `src/hooks/useProjections.js`
- Default params: `src/lib/taxTables.js`
- Input panel: `src/components/InputPanel/index.jsx`
- Optimizer: `src/components/Optimization/index.jsx`
- Main app: `src/App.jsx`
