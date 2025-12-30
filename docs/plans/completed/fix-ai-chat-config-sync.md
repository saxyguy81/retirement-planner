# Fix AI Chat Config Sync on Startup

## Overview

Fix issue where the AI chat doesn't work immediately when an endpoint is already configured, requiring the user to visit Settings and click "Test Connection" before chatting works.

## Current State Analysis

### The Problem

The Chat component only reloads AI config on two events:
1. `storage` event - only fires for **cross-tab** localStorage changes (not same-tab)
2. `focus` event - only fires when **window** gains focus (not when switching tabs within the app)

**File**: `src/components/Chat/index.jsx:186-198`
```javascript
useEffect(() => {
  const handleStorageChange = () => {
    setAIConfig(loadAIConfig() || getDefaultAIConfig());
  };
  window.addEventListener('storage', handleStorageChange);
  const handleFocus = () => setAIConfig(loadAIConfig() || getDefaultAIConfig());
  window.addEventListener('focus', handleFocus);
  // ...
}, []);
```

### Secondary Issue: Default Config Mismatch

When no config is saved, Chat and Settings use different defaults:
- **Chat** (`src/components/Chat/index.jsx:42-47`): Google Gemini with pre-set API key
- **Settings** (`src/components/SettingsPanel/index.jsx:86-94`): Anthropic with empty API key

This can cause confusion if one component thinks AI is configured and the other doesn't.

## Desired End State

1. Chat immediately works on startup if AI config exists in localStorage
2. Chat picks up config changes when user switches back from Settings tab
3. Both components use consistent default AI config
4. No manual "Test Connection" click required to start chatting

## What We're NOT Doing

- Adding global state management (Context) for AI config (overkill for this issue)
- Changing how the API keys are stored or encrypted
- Modifying the AIService class

## Implementation Approach

Use a custom event to notify Chat when Settings saves AI config, and reload config when Chat tab becomes visible.

---

## Phase 1: Add Custom Event for Config Changes

### Overview
Create a centralized config change notification mechanism using a custom DOM event.

### Changes Required

#### 1. Add Custom Event in aiService.js
**File**: `src/lib/aiService.js`

Update `saveAIConfig` to dispatch a custom event after saving:

```javascript
// Add this constant near the top
export const AI_CONFIG_CHANGED_EVENT = 'ai-config-changed';

// Update saveAIConfig to dispatch event
export const saveAIConfig = config => {
  const toSave = {
    ...config,
    apiKey: encryptApiKey(config.apiKey),
  };
  localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(toSave));

  // Dispatch custom event for same-tab listeners
  window.dispatchEvent(new CustomEvent(AI_CONFIG_CHANGED_EVENT));
};
```

#### 2. Update Chat to Listen for Config Changes
**File**: `src/components/Chat/index.jsx`

Update the useEffect to listen for the custom event and tab visibility:

```javascript
import {
  // ... existing imports
  AI_CONFIG_CHANGED_EVENT,
} from '../../lib/aiService';

// In the Chat component, update the useEffect:
useEffect(() => {
  const reloadConfig = () => {
    setAIConfig(loadAIConfig() || getDefaultAIConfig());
  };

  // Cross-tab storage changes
  window.addEventListener('storage', reloadConfig);

  // Window focus (covers browser tab switches)
  window.addEventListener('focus', reloadConfig);

  // Same-tab config changes (from Settings panel)
  window.addEventListener(AI_CONFIG_CHANGED_EVENT, reloadConfig);

  // Visibility change (covers internal tab switches)
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      reloadConfig();
    }
  };
  document.addEventListener('visibilitychange', handleVisibilityChange);

  return () => {
    window.removeEventListener('storage', reloadConfig);
    window.removeEventListener('focus', reloadConfig);
    window.removeEventListener(AI_CONFIG_CHANGED_EVENT, reloadConfig);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}, []);
```

### Success Criteria

#### Automated Verification:
- [x] Build passes: `npm run build`
- [x] Lint passes: `npm run lint`
- [x] Unit tests pass: `npm test`
- [x] E2E tests pass: `npx playwright test e2e/ci/ai-config-sync.spec.js --project=ci`
  - Config saved in Settings is immediately available in Chat
  - Chat picks up config changes when switching from Settings tab
  - Config persists after page reload
  - Chat loads config immediately on page load (no Settings visit required)

---

## Phase 2: Unify Default AI Config

### Overview
Ensure both Chat and Settings use the same default AI config for consistency.

### Changes Required

#### 1. Export Default Config from aiService.js
**File**: `src/lib/aiService.js`

Add a shared default config constant:

```javascript
// Default AI config (Google Gemini with API key for easy out-of-box experience)
export const DEFAULT_AI_CONFIG = {
  provider: 'google',
  apiKey: 'AIzaSyB1qt6ZBrhh64lslHGmDXv26FUahxWHQ70', // Default Gemini key
  model: 'gemini-2.5-flash',
  customBaseUrl: '',
};
```

#### 2. Update Chat to Use Shared Default
**File**: `src/components/Chat/index.jsx`

Remove local default and import from aiService:

```javascript
import {
  AIService,
  AGENT_TOOLS,
  TOOL_UI_CONFIG,
  getToolCapabilities,
  loadAIConfig,
  DEFAULT_AI_CONFIG,
  AI_CONFIG_CHANGED_EVENT,
} from '../../lib/aiService';

// Remove these lines:
// const DEFAULT_GEMINI_API_KEY = '...';
// const getDefaultAIConfig = () => ({ ... });

// Update useState initialization:
const [aiConfig, setAIConfig] = useState(() => loadAIConfig() || DEFAULT_AI_CONFIG);

// Update useEffect reloadConfig:
const reloadConfig = () => {
  setAIConfig(loadAIConfig() || DEFAULT_AI_CONFIG);
};
```

#### 3. Update SettingsPanel to Use Shared Default
**File**: `src/components/SettingsPanel/index.jsx`

Update the import and default:

```javascript
import { PROVIDERS, AIService, saveAIConfig, loadAIConfig, DEFAULT_AI_CONFIG } from '../../lib/aiService';

// Update useState initialization:
const [aiConfig, setAiConfig] = useState(() => loadAIConfig() || DEFAULT_AI_CONFIG);
```

### Success Criteria

#### Automated Verification:
- [x] Build passes: `npm run build`
- [x] Lint passes: `npm run lint`
- [x] Unit tests pass: `npm test`
- [x] E2E tests pass: `npx playwright test e2e/ci/ai-config-sync.spec.js --project=ci`
  - Chat shows default Gemini config on fresh start (no localStorage)
  - Settings shows same default Gemini config on fresh start
  - Custom provider works without API key

---

## Testing Strategy

All verification is automated via E2E tests in `e2e/ci/ai-config-sync.spec.js`:

| Test Case | Description |
|-----------|-------------|
| Chat shows default Gemini config on fresh start | Clears localStorage, verifies Chat works with default |
| Settings shows same default Gemini config | Verifies both components use same defaults |
| Config saved in Settings is immediately available in Chat | Tests same-tab sync via custom event |
| Config persists after page reload | Tests localStorage persistence |
| Chat loads config immediately on page load | Tests no Settings visit required |
| Chat picks up config changes when switching tabs | Tests config sync on tab switch |
| Chat shows warning only when API key missing | Tests validation logic |
| Custom provider works without API key | Tests custom endpoint handling |

Run all tests:
```bash
npx playwright test e2e/ci/ai-config-sync.spec.js --project=ci
```

## References

- Chat component: `src/components/Chat/index.jsx`
- Settings component: `src/components/SettingsPanel/index.jsx`
- AI Service: `src/lib/aiService.js`
