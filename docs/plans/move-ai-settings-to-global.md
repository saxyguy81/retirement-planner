# Move AI Settings to Global Settings Panel

## Overview

Move AI configuration from the Chat component's embedded side panel to the global Settings tab, eliminating nested settings menus and improving discoverability.

## Current State Analysis

### Current Structure:
- `src/components/AISettings/index.jsx` - Standalone component with:
  - Provider selection (Anthropic, OpenAI, OpenRouter, Custom)
  - API key input with show/hide toggle
  - Model selection (dropdown or text input for custom)
  - Custom base URL (for custom provider)
  - Test connection button with status
  - Uses `loadAIConfig()`/`saveAIConfig()` from `lib/aiService.js`

- `src/components/Chat/index.jsx` - Currently:
  - Has "Settings" button in header that toggles side panel
  - Embeds `<AISettings onConfigChange={setAIConfig} />` in side panel
  - Maintains local `aiConfig` state

- `src/components/SettingsPanel/index.jsx` - Currently has:
  - Tax Settings section
  - Display Preferences section
  - Tax Brackets (Advanced) section
  - IRMAA Brackets (Advanced) section

### Key Files:
- `src/components/AISettings/index.jsx:13-185` - AISettings component
- `src/components/Chat/index.jsx:85,334-338` - aiConfig state and Settings panel
- `src/components/SettingsPanel/index.jsx:76-262` - SettingsPanel component
- `src/lib/aiService.js:286-309` - loadAIConfig/saveAIConfig functions

## Desired End State

- AI settings appear as a collapsible section in global Settings tab
- Chat component has no settings button or side panel
- Chat reads AI config directly from localStorage on mount
- Single place to configure AI provider settings

## What We're NOT Doing

- Changing the AI config storage format
- Modifying how the Chat component uses AIService
- Adding new AI configuration options

---

## Phase 1: Add AI Section to SettingsPanel

### Overview
Add "AI Assistant" as a new collapsible section in SettingsPanel, importing the AISettings content.

### Changes Required:

#### 1. Update SettingsPanel to include AI section
**File**: `src/components/SettingsPanel/index.jsx`
**Changes**:
- Import Bot icon from lucide-react
- Import AI-related items from aiService
- Add new "AI Assistant" section with provider, API key, model, and test connection

```jsx
// Add to imports
import { Bot } from 'lucide-react';
import { PROVIDERS, AIService, saveAIConfig, loadAIConfig } from '../../lib/aiService';

// Add AI state inside SettingsPanel component
const [aiConfig, setAiConfig] = useState(() => loadAIConfig() || {
  provider: 'anthropic',
  apiKey: '',
  model: 'claude-sonnet-4-20250514',
  customBaseUrl: '',
});
const [showApiKey, setShowApiKey] = useState(false);
const [testStatus, setTestStatus] = useState(null);
const [testMessage, setTestMessage] = useState('');

// Add AI config update handler
const updateAiConfig = (updates) => {
  const newConfig = { ...aiConfig, ...updates };
  setAiConfig(newConfig);
  saveAIConfig(newConfig);
  setTestStatus(null);
};

const handleTestConnection = async () => {
  if (!aiConfig.apiKey && aiConfig.provider !== 'custom') {
    setTestStatus('error');
    setTestMessage('Please enter an API key');
    return;
  }
  setTestStatus('testing');
  const service = new AIService(aiConfig);
  const result = await service.testConnection();
  setTestStatus(result.success ? 'success' : 'error');
  setTestMessage(result.success ? 'Connected!' : result.message);
};

// Add new section after Display Preferences
<SettingsSection
  title="AI Assistant"
  icon={Bot}
  expanded={expanded.includes('ai')}
  onToggle={() => toggle('ai')}
  color="purple"
>
  {/* Provider, API Key, Model, Custom URL, Test Connection */}
</SettingsSection>
```

### Success Criteria:

#### Automated Verification:
- [x] Lint passes: `npm run lint`
- [x] Build succeeds: `npm run build`
- [x] Tests pass: `npm run test:unit`

#### Manual Verification:
- [x] AI Assistant section appears in Settings tab
- [x] Can select provider and enter API key
- [x] Test connection works
- [x] Settings persist after page reload

---

## Phase 2: Remove Settings from Chat Component

### Overview
Remove the embedded settings panel from Chat, keeping only the chat functionality.

### Changes Required:

#### 1. Simplify Chat component
**File**: `src/components/Chat/index.jsx`
**Changes**:
- Remove `showSettings` state
- Remove "Settings" button from header
- Remove settings panel from render
- Load aiConfig directly on mount (already does this)

```jsx
// Remove these:
// - const [showSettings, setShowSettings] = useState(false);
// - Settings button in header
// - {showSettings && <div className="w-80..."><AISettings .../></div>}
// - Import of AISettings
```

#### 2. Update Chat header
**File**: `src/components/Chat/index.jsx`
**Changes**: Remove Settings button, keep only New Chat button

### Success Criteria:

#### Automated Verification:
- [x] Lint passes: `npm run lint`
- [x] Build succeeds: `npm run build`

#### Manual Verification:
- [x] Chat tab has no Settings button
- [x] Chat still works with configured AI provider
- [x] No nested settings menus anywhere

---

## Phase 3: Cleanup

### Overview
Remove unused AISettings component if no longer needed elsewhere.

### Changes Required:

#### 1. Check if AISettings is used elsewhere
If not used anywhere else, the component can remain for potential future use or be removed.

#### 2. Update exports if needed
Ensure no broken imports.

### Success Criteria:

#### Automated Verification:
- [x] Lint passes: `npm run lint`
- [x] Build succeeds: `npm run build`
- [x] Tests pass: `npm run test:unit`

#### Manual Verification:
- [x] App works correctly end-to-end
- [x] Can configure AI in Settings, use in Chat

---

## Testing Strategy

### Manual Testing Steps:
1. Go to Settings tab
2. Expand "AI Assistant" section
3. Select a provider (e.g., Custom Endpoint)
4. Enter base URL: `http://localhost:4000/api/v1/chat/completions`
5. Enter model: `claude-sonnet-4-20250514`
6. Click "Test Connection" - should succeed
7. Go to AI Chat tab
8. Send a message - should work with configured provider
9. Refresh page - settings should persist

---

## References

- AISettings component: `src/components/AISettings/index.jsx`
- SettingsPanel: `src/components/SettingsPanel/index.jsx`
- Chat component: `src/components/Chat/index.jsx`
- AI service: `src/lib/aiService.js`
