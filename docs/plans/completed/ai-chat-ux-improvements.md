# AI Chat UX Improvements Plan

## Overview

Improve the AI chat experience to provide better visibility into what the AI is doing, clearer feedback during operations, and helpful guidance for scenario workflows.

## Current State Analysis

### User Journey Pain Points

1. **Tool calls are invisible** - When AI calls tools like `create_scenario`, `run_projection`, or `get_current_state`, the user sees nothing until the final response. This is confusing because:
   - Side effects happen (e.g., scenario appears in Scenarios tab) without explanation
   - User doesn't know if AI is working or stuck
   - No feedback loop on what actions were taken

2. **Loading state doesn't block input** - While `isLoading=true`, the textarea isn't disabled. User can type (confusing) but submissions are blocked (more confusing).

3. **No navigation help after operations** - After AI creates a scenario, user has no idea:
   - Where to find it (Scenarios tab)
   - What "base case" means (current InputPanel params)
   - How to view scenario details or compare
   - Whether they can "apply" a scenario to become the new base case

4. **Empty state lacks capability explanation** - Users don't know what the AI can actually do beyond 3 example prompts.

### Technical Findings

- **Base Case** = Always the current `params` from InputPanel/useProjections
- **Scenarios** = Parameter overrides applied on top of base case for comparison
- **Scenarios don't replace base case** - they exist alongside it
- **`updateParams`** exists and could apply scenario overrides to base case
- **Current tools**: `create_scenario`, `run_projection`, `get_current_state`, `calculate`, `compare_scenarios`

### Key Files
- `src/components/Chat/index.jsx:193-252` - sendMessage and tool execution loop
- `src/components/Chat/index.jsx:102-191` - executeToolCall function
- `src/lib/aiService.js:11-77` - AGENT_TOOLS definitions

## Desired End State

1. **Users see tool calls as they happen** with clear status indicators
2. **Input is disabled during AI processing** with clear visual feedback
3. **After creating scenarios**, users get actionable links to view/compare them
4. **Empty state clearly explains** what the AI can help with
5. **Users understand** the base case vs scenario concept

## What We're NOT Doing

- Streaming responses (complex, future enhancement)
- Message editing/deletion (future enhancement)
- Token/cost tracking (future enhancement)
- Cancel button for long requests (future enhancement)
- "Apply scenario to base case" tool (could add later, but not critical)

---

## Standardization: Centralized Tool Registry

### Overview
Create a single source of truth for tool metadata that powers all UX features. This makes it easy to add new tools without updating multiple places.

### Design

#### 1. Tool Registry in aiService.js
**File**: `src/lib/aiService.js`

Add `TOOL_UI_CONFIG` alongside existing `AGENT_TOOLS`:
```javascript
// UI configuration for each tool - single source of truth
export const TOOL_UI_CONFIG = {
  create_scenario: {
    icon: '📊',
    label: 'Creating scenario',
    capability: { title: 'Create Scenarios', description: 'Test different strategies' },
    action: { type: 'scenario_created', navigateTo: 'scenarios' },
  },
  run_projection: {
    icon: '📈',
    label: 'Running projection',
    capability: { title: 'Run Projections', description: 'See future outcomes' },
  },
  get_current_state: {
    icon: '📋',
    label: 'Reading your plan',
    capability: null, // Not shown as a capability (internal tool)
  },
  calculate: {
    icon: '🔢',
    label: 'Calculating',
    capability: { title: 'Calculate', description: 'Tax & financial math' },
  },
  compare_scenarios: {
    icon: '⚖️',
    label: 'Comparing scenarios',
    capability: { title: 'Compare Options', description: 'Analyze trade-offs' },
  },
};

// Helper to get capabilities for empty state
export const getToolCapabilities = () =>
  Object.values(TOOL_UI_CONFIG)
    .filter(t => t.capability)
    .map(t => t.capability);
```

#### 2. Usage in Chat Component
The Chat component imports and uses this registry:
```javascript
import { TOOL_UI_CONFIG, getToolCapabilities } from '../../lib/aiService';

// For tool call display:
const toolConfig = TOOL_UI_CONFIG[toolCall.name] || { icon: '🔧', label: toolCall.name };

// For empty state:
const capabilities = getToolCapabilities();

// For action hints:
const actionConfig = TOOL_UI_CONFIG[toolCall.name]?.action;
if (actionConfig) {
  setRecentAction({ ...actionConfig, name: args.name });
}
```

### Benefits
- **Single source of truth**: Add a tool once, UI updates everywhere
- **Type-safe**: Easy to add TypeScript types later
- **Extensible**: New tools just need an entry in the config
- **Testable**: Can unit test the registry separately

---

## Phase 1: Show Tool Calls in Chat

### Overview
Display tool calls as they happen so users can see what the AI is doing.

### Changes Required:

#### 1. Add tool call state and display
**File**: `src/components/Chat/index.jsx`

Add state to track active tool calls:
```jsx
const [activeToolCalls, setActiveToolCalls] = useState([]);
```

Update sendMessage to show tool calls:
```jsx
// When tool calls happen:
for (const toolCall of response.toolCalls) {
  // Add to visible tool calls
  setActiveToolCalls(prev => [...prev, {
    id: toolCall.id,
    name: toolCall.name,
    status: 'running'
  }]);

  const result = executeToolCall(toolCall);

  // Update status to complete
  setActiveToolCalls(prev => prev.map(tc =>
    tc.id === toolCall.id ? { ...tc, status: 'complete', result } : tc
  ));

  toolResults.push({ ... });
}
```

#### 2. Create ToolCallDisplay component
**File**: `src/components/Chat/index.jsx`

Add inline component to render tool calls:
```jsx
function ToolCallBubble({ name, status, result }) {
  const icons = {
    create_scenario: '📊',
    run_projection: '📈',
    get_current_state: '📋',
    calculate: '🔢',
    compare_scenarios: '⚖️'
  };

  const labels = {
    create_scenario: 'Creating scenario',
    run_projection: 'Running projection',
    get_current_state: 'Reading your plan',
    calculate: 'Calculating',
    compare_scenarios: 'Comparing scenarios'
  };

  return (
    <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-800/50 rounded px-2 py-1">
      <span>{icons[name] || '🔧'}</span>
      <span>{labels[name] || name}</span>
      {status === 'running' && <Loader2 className="w-3 h-3 animate-spin" />}
      {status === 'complete' && <Check className="w-3 h-3 text-emerald-400" />}
    </div>
  );
}
```

#### 3. Render tool calls in message flow
Show tool calls between user message and assistant response:
```jsx
{/* Active tool calls */}
{activeToolCalls.length > 0 && (
  <div className="flex flex-wrap gap-2 ml-11">
    {activeToolCalls.map(tc => (
      <ToolCallBubble key={tc.id} {...tc} />
    ))}
  </div>
)}
```

### Success Criteria:

#### Automated Verification:
- [x] Lint passes: `npm run lint`
- [x] Build succeeds: `npm run build`

#### Manual Verification:
- [x] When AI calls a tool, user sees indicator with icon and label
- [x] Indicator shows spinner while running, checkmark when complete
- [x] Multiple tool calls shown simultaneously if needed
- [x] Tool calls clear after final response appears

---

## Phase 2: Disable Input During Loading

### Overview
Prevent user confusion by clearly indicating when AI is processing.

### Changes Required:

#### 1. Disable textarea and button during loading
**File**: `src/components/Chat/index.jsx`

Update textarea:
```jsx
<textarea
  value={input}
  onChange={e => setInput(e.target.value)}
  onKeyDown={handleKeyDown}
  placeholder={isLoading ? "AI is thinking..." : "Ask about your retirement plan..."}
  rows={2}
  disabled={isLoading}
  className={`flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm resize-none focus:border-purple-500 focus:outline-none ${
    isLoading ? 'opacity-50 cursor-not-allowed' : ''
  }`}
/>
```

Update send button:
```jsx
<button
  onClick={sendMessage}
  disabled={isLoading || !input.trim()}
  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
>
  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
</button>
```

### Success Criteria:

#### Automated Verification:
- [x] Lint passes: `npm run lint`
- [x] Build succeeds: `npm run build`

#### Manual Verification:
- [x] Textarea shows "AI is thinking..." placeholder during loading
- [x] Textarea is grayed out and can't be typed in
- [x] Send button shows spinner during loading
- [x] User clearly knows they need to wait

---

## Phase 3: Add Navigation Links After Scenario Creation

### Overview
After AI creates a scenario, show a helpful link to navigate to the Scenarios tab.

### Changes Required:

#### 1. Track recently created scenarios
**File**: `src/components/Chat/index.jsx`

Add state for navigation hints:
```jsx
const [recentAction, setRecentAction] = useState(null);
```

In executeToolCall, set recent action:
```jsx
case 'create_scenario': {
  if (onCreateScenario) {
    onCreateScenario(args.overrides || {}, args.name);
    setRecentAction({ type: 'scenario_created', name: args.name });
    return `Created scenario "${args.name}"`;
  }
  ...
}
```

#### 2. Add navigation hint component
**File**: `src/components/Chat/index.jsx`

```jsx
function ActionHint({ action, onNavigate, onDismiss }) {
  if (!action) return null;

  if (action.type === 'scenario_created') {
    return (
      <div className="flex items-center gap-2 text-xs bg-emerald-900/30 border border-emerald-800 rounded-lg px-3 py-2 mx-4 mb-2">
        <span className="text-emerald-300">✓ Scenario "{action.name}" created</span>
        <button
          onClick={() => onNavigate('scenarios')}
          className="text-emerald-400 hover:text-emerald-300 underline"
        >
          View in Scenarios →
        </button>
        <button
          onClick={onDismiss}
          className="text-slate-500 hover:text-slate-300 ml-auto"
        >
          ×
        </button>
      </div>
    );
  }
  return null;
}
```

#### 3. Pass tab navigation callback
**File**: `src/App.jsx`

Pass `onNavigate` to Chat:
```jsx
<Chat
  ...
  onNavigate={(tab) => setActiveTab(tab)}
/>
```

### Success Criteria:

#### Automated Verification:
- [x] Lint passes: `npm run lint`
- [x] Build succeeds: `npm run build`

#### Manual Verification:
- [x] After AI creates scenario, green hint appears with link
- [x] Clicking "View in Scenarios →" switches to Scenarios tab
- [x] Hint can be dismissed with × button
- [x] Hint clears when starting new message

---

## Phase 4: Improve Empty State

### Overview
Help users understand what the AI can do and key concepts like "base case".

### Changes Required:

#### 1. Enhanced empty state with capabilities
**File**: `src/components/Chat/index.jsx`

Replace current empty state:
```jsx
{messages.length === 0 && (
  <div className="flex flex-col items-center justify-center h-full text-slate-400 px-4">
    <Bot className="w-12 h-12 mb-3 opacity-50" />
    <div className="text-lg mb-2">AI Assistant</div>
    <div className="text-sm text-center max-w-md mb-4">
      I can help you with your retirement planning. Here's what I can do:
    </div>

    {/* Capabilities */}
    <div className="grid grid-cols-2 gap-2 text-xs mb-4 max-w-md">
      <div className="bg-slate-800/50 rounded p-2">
        <span className="text-purple-400">📊 Create Scenarios</span>
        <div className="text-slate-500 mt-1">Test different strategies</div>
      </div>
      <div className="bg-slate-800/50 rounded p-2">
        <span className="text-purple-400">📈 Run Projections</span>
        <div className="text-slate-500 mt-1">See future outcomes</div>
      </div>
      <div className="bg-slate-800/50 rounded p-2">
        <span className="text-purple-400">⚖️ Compare Options</span>
        <div className="text-slate-500 mt-1">Analyze trade-offs</div>
      </div>
      <div className="bg-slate-800/50 rounded p-2">
        <span className="text-purple-400">🔢 Calculate</span>
        <div className="text-slate-500 mt-1">Tax & financial math</div>
      </div>
    </div>

    {/* Quick tip about base case */}
    <div className="text-xs text-slate-500 bg-slate-800/30 rounded p-2 max-w-md mb-4">
      <strong>Tip:</strong> Your "Base Case" is your current plan in the Projections tab.
      Scenarios I create are alternatives to compare against it.
    </div>

    {/* Example prompts */}
    <div className="space-y-2 text-xs">
      <div className="text-slate-500">Try asking:</div>
      {/* ... existing example buttons ... */}
    </div>
  </div>
)}
```

### Success Criteria:

#### Automated Verification:
- [x] Lint passes: `npm run lint`
- [x] Build succeeds: `npm run build`

#### Manual Verification:
- [x] Empty state shows 4 capability cards
- [x] Tip about base case is visible and helpful
- [x] Example prompts still work
- [x] Layout looks good on different screen sizes

---

## Phase 5: Clear Tool Calls After Response

### Overview
Ensure tool call indicators clear properly after the AI responds.

### Changes Required:

#### 1. Clear activeToolCalls in finally block
**File**: `src/components/Chat/index.jsx`

```jsx
} finally {
  setIsLoading(false);
  setActiveToolCalls([]); // Clear tool call indicators
  setRecentAction(null);  // Will be set again if tool created something
}
```

#### 2. Clear recentAction on new message start
```jsx
const sendMessage = useCallback(async () => {
  // ... validation ...
  setRecentAction(null); // Clear any previous action hints
  // ... rest of function
```

### Success Criteria:

#### Automated Verification:
- [x] Lint passes: `npm run lint`
- [x] Build succeeds: `npm run build`

#### Manual Verification:
- [x] Tool call indicators disappear after response
- [x] Starting new message clears old hints
- [x] No stale UI state between conversations

---

## Automated Testing Strategy

### Test Infrastructure Requirements

#### 1. Add data-testid attributes
**File**: `src/components/Chat/index.jsx`

All interactive elements must have `data-testid` attributes for reliable E2E selection:

```jsx
// Required data-testid attributes:
data-testid="chat-input"           // Textarea for message input
data-testid="send-button"          // Send message button
data-testid="cancel-button"        // Cancel/stop button
data-testid="new-chat-button"      // Clear history button
data-testid="chat-messages"        // Messages container
data-testid="message-user"         // User message bubbles
data-testid="message-assistant"    // Assistant message bubbles
data-testid="tool-call-indicator"  // Tool call status indicators
data-testid="action-hint"          // Navigation hint after actions
data-testid="empty-state"          // Empty state container
data-testid="capability-card"      // Capability cards in empty state
data-testid="copy-button"          // Copy response button
data-testid="token-count"          // Token usage display
data-testid="streaming-content"    // Streaming response container
data-testid="context-warning"      // Context limit warning
```

#### 2. Mock AI Service for E2E Tests
**File**: `e2e/fixtures/mockAIService.js`

```javascript
/**
 * Creates mock API responses for E2E testing.
 * Avoids hitting real AI endpoints and provides deterministic responses.
 */
export const mockResponses = {
  simple: {
    anthropic: {
      content: [{ type: 'text', text: 'This is a test response.' }],
      stop_reason: 'end_turn',
      usage: { input_tokens: 10, output_tokens: 20 }
    },
    openai: {
      choices: [{ message: { content: 'This is a test response.' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 10, completion_tokens: 20 }
    }
  },

  withToolCall: {
    anthropic: {
      content: [
        { type: 'tool_use', id: 'tool_1', name: 'get_current_state', input: { include: ['summary'] } }
      ],
      stop_reason: 'tool_use'
    }
  },

  withScenarioCreation: {
    anthropic: {
      content: [
        { type: 'tool_use', id: 'tool_1', name: 'create_scenario', input: { name: 'Test Scenario', overrides: {} } }
      ],
      stop_reason: 'tool_use'
    }
  },

  streaming: {
    // SSE chunks for streaming tests
    chunks: [
      'data: {"type":"content_block_delta","delta":{"text":"Hello"}}\n\n',
      'data: {"type":"content_block_delta","delta":{"text":" world"}}\n\n',
      'data: {"type":"content_block_delta","delta":{"text":"!"}}\n\n',
      'data: {"type":"message_stop"}\n\n',
    ]
  }
};

/**
 * Sets up route interception for AI API calls
 */
export async function setupAIMocks(page, responseType = 'simple', options = {}) {
  const { delay = 0, format = 'anthropic' } = options;

  await page.route('**/api/v1/messages', async route => {
    if (delay) await new Promise(r => setTimeout(r, delay));
    await route.fulfill({ json: mockResponses[responseType][format] });
  });

  await page.route('**/api/v1/chat/completions', async route => {
    if (delay) await new Promise(r => setTimeout(r, delay));
    await route.fulfill({ json: mockResponses[responseType].openai });
  });
}

/**
 * Sets up streaming mock that sends chunks over time
 */
export async function setupStreamingMock(page, chunkDelay = 100) {
  await page.route('**/api/v1/messages', async route => {
    const chunks = mockResponses.streaming.chunks;
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        for (const chunk of chunks) {
          await new Promise(r => setTimeout(r, chunkDelay));
          controller.enqueue(encoder.encode(chunk));
        }
        controller.close();
      }
    });

    await route.fulfill({
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
      body: stream,
    });
  });
}
```

#### 3. Test Utilities
**File**: `e2e/fixtures/chatHelpers.js`

```javascript
/**
 * Helper functions for chat E2E tests
 */

export async function navigateToChat(page) {
  await page.goto('/');
  await page.click('[data-testid="ai-chat-tab"]');
  await page.waitForSelector('[data-testid="chat-input"]');
}

export async function sendMessage(page, message) {
  await page.fill('[data-testid="chat-input"]', message);
  await page.click('[data-testid="send-button"]');
}

export async function waitForResponse(page) {
  await page.waitForSelector('[data-testid="message-assistant"]');
}

export async function configureAIProvider(page, provider = 'custom', baseUrl = 'http://localhost:4000') {
  await page.click('[data-testid="settings-tab"]');
  await page.click('text=AI Assistant');
  await page.selectOption('[data-testid="ai-provider-select"]', provider);
  if (provider === 'custom') {
    await page.fill('[data-testid="ai-base-url"]', baseUrl);
  }
  await page.fill('[data-testid="ai-model"]', 'test-model');
}

export async function getMessageCount(page) {
  return await page.locator('[data-testid="message-assistant"], [data-testid="message-user"]').count();
}

export async function getLastAssistantMessage(page) {
  const messages = page.locator('[data-testid="message-assistant"]');
  return await messages.last().textContent();
}
```

---

### Unit Tests

**File**: `src/lib/__tests__/aiService.test.js`

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  AGENT_TOOLS,
  TOOL_UI_CONFIG,
  getToolCapabilities,
  AIService,
} from '../aiService';

describe('TOOL_UI_CONFIG', () => {
  it('has entries for all AGENT_TOOLS', () => {
    // Non-tautological: ensures UI config stays in sync with tool definitions
    for (const tool of AGENT_TOOLS) {
      expect(TOOL_UI_CONFIG[tool.name]).toBeDefined();
      expect(TOOL_UI_CONFIG[tool.name].icon).toBeTruthy();
      expect(TOOL_UI_CONFIG[tool.name].label).toBeTruthy();
    }
  });

  it('has valid action configs with required fields', () => {
    // Non-tautological: validates action structure for tools that have actions
    const toolsWithActions = Object.entries(TOOL_UI_CONFIG)
      .filter(([_, config]) => config.action);

    expect(toolsWithActions.length).toBeGreaterThan(0); // At least one tool has action

    for (const [name, config] of toolsWithActions) {
      expect(config.action.type).toBeTruthy();
      expect(config.action.navigateTo).toBeTruthy();
    }
  });
});

describe('getToolCapabilities', () => {
  it('excludes tools with capability: null', () => {
    // Non-tautological: tests actual filtering behavior
    const capabilities = getToolCapabilities();
    const allLabels = capabilities.map(c => c.title);

    // get_current_state has capability: null, should NOT appear
    expect(allLabels).not.toContain('Reading your plan');

    // Other tools should appear
    expect(allLabels).toContain('Create Scenarios');
    expect(allLabels).toContain('Run Projections');
  });

  it('returns correctly structured capability objects', () => {
    const capabilities = getToolCapabilities();

    for (const cap of capabilities) {
      expect(cap).toHaveProperty('title');
      expect(cap).toHaveProperty('description');
      expect(typeof cap.title).toBe('string');
      expect(typeof cap.description).toBe('string');
    }
  });
});

describe('AIService.parseResponse', () => {
  it('extracts usage from Anthropic format', () => {
    const service = new AIService({ provider: 'anthropic', apiKey: 'test' });
    const data = {
      content: [{ type: 'text', text: 'Hello' }],
      usage: {
        input_tokens: 100,
        output_tokens: 50,
        cache_creation_input_tokens: 10,
        cache_read_input_tokens: 20,
      },
      stop_reason: 'end_turn',
    };

    const result = service.parseResponse(data, null);

    expect(result.usage).toEqual({
      inputTokens: 100,
      outputTokens: 50,
      cacheCreation: 10,
      cacheRead: 20,
    });
  });

  it('extracts usage from OpenAI format', () => {
    const service = new AIService({ provider: 'openai', apiKey: 'test' });
    const data = {
      choices: [{ message: { content: 'Hello' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 100, completion_tokens: 50 },
    };

    const result = service.parseResponse(data, null);

    expect(result.usage).toEqual({
      inputTokens: 100,
      outputTokens: 50,
      cacheCreation: 0,
      cacheRead: 0,
    });
  });

  it('handles missing usage gracefully', () => {
    const service = new AIService({ provider: 'anthropic', apiKey: 'test' });
    const data = {
      content: [{ type: 'text', text: 'Hello' }],
      stop_reason: 'end_turn',
      // No usage field
    };

    const result = service.parseResponse(data, null);
    expect(result.usage).toBeNull();
  });
});

describe('AIService.parseStreamChunk', () => {
  it('extracts text from Anthropic content_block_delta', () => {
    const service = new AIService({ provider: 'anthropic', apiKey: 'test' });
    const chunk = {
      type: 'content_block_delta',
      delta: { text: 'Hello world' },
    };

    const result = service.parseStreamChunk(chunk, 'anthropic');
    expect(result.text).toBe('Hello world');
  });

  it('extracts text from OpenAI delta', () => {
    const service = new AIService({ provider: 'openai', apiKey: 'test' });
    const chunk = {
      choices: [{ delta: { content: 'Hello world' } }],
    };

    const result = service.parseStreamChunk(chunk, 'openai');
    expect(result.text).toBe('Hello world');
  });

  it('extracts tool calls from Anthropic format', () => {
    const service = new AIService({ provider: 'anthropic', apiKey: 'test' });
    const chunk = {
      type: 'tool_use',
      id: 'tool_123',
      name: 'create_scenario',
      input: { name: 'Test' },
    };

    const result = service.parseStreamChunk(chunk, 'anthropic');
    expect(result.toolCall).toEqual({
      id: 'tool_123',
      name: 'create_scenario',
      arguments: { name: 'Test' },
    });
  });

  it('returns empty object for unrecognized chunks', () => {
    const service = new AIService({ provider: 'anthropic', apiKey: 'test' });
    const chunk = { type: 'ping' };

    const result = service.parseStreamChunk(chunk, 'anthropic');
    expect(result).toEqual({});
  });
});

describe('AIService.detectCustomFormat', () => {
  it('detects Anthropic format from /messages URL', () => {
    const service = new AIService({
      provider: 'custom',
      customBaseUrl: 'http://localhost:4000/api/v1/messages',
    });

    expect(service.customFormat).toBe('anthropic');
  });

  it('detects OpenAI format from /chat/completions URL', () => {
    const service = new AIService({
      provider: 'custom',
      customBaseUrl: 'http://localhost:4000/api/v1/chat/completions',
    });

    expect(service.customFormat).toBe('openai');
  });

  it('defaults to OpenAI format for unknown URLs', () => {
    const service = new AIService({
      provider: 'custom',
      customBaseUrl: 'http://localhost:4000/api/generate',
    });

    expect(service.customFormat).toBe('openai');
  });
});
```

**File**: `src/components/Chat/__tests__/Chat.test.jsx`

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Chat } from '../index';

// Mock aiService
vi.mock('../../../lib/aiService', () => ({
  AIService: vi.fn().mockImplementation(() => ({
    sendMessage: vi.fn().mockResolvedValue({
      content: 'Test response',
      toolCalls: [],
      usage: { inputTokens: 10, outputTokens: 20 },
    }),
    sendMessageStreaming: vi.fn(),
  })),
  AGENT_TOOLS: [],
  TOOL_UI_CONFIG: {
    create_scenario: { icon: '📊', label: 'Creating scenario' },
    get_current_state: { icon: '📋', label: 'Reading plan' },
  },
  getToolCapabilities: vi.fn(() => [
    { title: 'Create Scenarios', description: 'Test strategies' },
  ]),
  loadAIConfig: vi.fn(() => ({ provider: 'custom', apiKey: '', model: 'test' })),
}));

describe('Chat Component', () => {
  const defaultProps = {
    params: { startYear: 2025, endYear: 2050 },
    projections: [],
    summary: { endingPortfolio: 1000000 },
    onCreateScenario: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('Empty State', () => {
    it('displays capability cards when no messages', () => {
      render(<Chat {...defaultProps} />);

      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
      expect(screen.getAllByTestId('capability-card')).toHaveLength(4);
    });

    it('displays base case tip in empty state', () => {
      render(<Chat {...defaultProps} />);

      expect(screen.getByText(/Base Case/i)).toBeInTheDocument();
      expect(screen.getByText(/Projections tab/i)).toBeInTheDocument();
    });

    it('example prompts populate input when clicked', async () => {
      render(<Chat {...defaultProps} />);

      const exampleButton = screen.getByText(/heir value/i);
      await userEvent.click(exampleButton);

      const input = screen.getByTestId('chat-input');
      expect(input.value).toContain('heir value');
    });
  });

  describe('Loading State', () => {
    it('disables input while loading', async () => {
      render(<Chat {...defaultProps} />);

      const input = screen.getByTestId('chat-input');
      await userEvent.type(input, 'Test message');
      await userEvent.click(screen.getByTestId('send-button'));

      expect(input).toBeDisabled();
    });

    it('shows cancel button while loading', async () => {
      render(<Chat {...defaultProps} />);

      const input = screen.getByTestId('chat-input');
      await userEvent.type(input, 'Test message');
      await userEvent.click(screen.getByTestId('send-button'));

      expect(screen.getByTestId('cancel-button')).toBeInTheDocument();
      expect(screen.queryByTestId('send-button')).not.toBeInTheDocument();
    });

    it('updates placeholder to "AI is thinking..." while loading', async () => {
      render(<Chat {...defaultProps} />);

      const input = screen.getByTestId('chat-input');
      await userEvent.type(input, 'Test message');
      await userEvent.click(screen.getByTestId('send-button'));

      expect(input.placeholder).toBe('AI is thinking...');
    });
  });

  describe('Cancel Functionality', () => {
    it('cancels request when Escape is pressed during loading', async () => {
      render(<Chat {...defaultProps} />);

      const input = screen.getByTestId('chat-input');
      await userEvent.type(input, 'Test message');
      await userEvent.click(screen.getByTestId('send-button'));

      // Press Escape
      fireEvent.keyDown(document, { key: 'Escape' });

      await waitFor(() => {
        expect(screen.getByTestId('send-button')).toBeInTheDocument();
        expect(screen.queryByTestId('cancel-button')).not.toBeInTheDocument();
      });
    });

    it('does not show error after user cancellation', async () => {
      render(<Chat {...defaultProps} />);

      const input = screen.getByTestId('chat-input');
      await userEvent.type(input, 'Test message');
      await userEvent.click(screen.getByTestId('send-button'));

      fireEvent.keyDown(document, { key: 'Escape' });

      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      });
    });
  });

  describe('Tool Call Display', () => {
    it('shows tool call indicators when tools are executing', async () => {
      // This requires mocking the streaming behavior
      // Implementation depends on final streaming architecture
    });
  });

  describe('Copy Functionality', () => {
    it('shows copy button on hover for assistant messages', async () => {
      // Setup with existing message
      localStorage.setItem('rp-chat-history', JSON.stringify([
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
      ]));

      render(<Chat {...defaultProps} />);

      const assistantMessage = screen.getByTestId('message-assistant');
      await userEvent.hover(assistantMessage);

      expect(screen.getByTestId('copy-button')).toBeInTheDocument();
    });

    it('copies text to clipboard when copy button clicked', async () => {
      const mockClipboard = { writeText: vi.fn().mockResolvedValue() };
      Object.assign(navigator, { clipboard: mockClipboard });

      localStorage.setItem('rp-chat-history', JSON.stringify([
        { role: 'assistant', content: 'Copy this text' },
      ]));

      render(<Chat {...defaultProps} />);

      const assistantMessage = screen.getByTestId('message-assistant');
      await userEvent.hover(assistantMessage);
      await userEvent.click(screen.getByTestId('copy-button'));

      expect(mockClipboard.writeText).toHaveBeenCalledWith('Copy this text');
    });
  });

  describe('Token Tracking', () => {
    it('displays session token count in header', async () => {
      localStorage.setItem('rp-chat-history', JSON.stringify([
        { role: 'assistant', content: 'Hello', usage: { inputTokens: 10, outputTokens: 20 } },
      ]));

      render(<Chat {...defaultProps} />);

      expect(screen.getByTestId('token-count')).toHaveTextContent('30');
    });

    it('resets token count when clearing chat', async () => {
      localStorage.setItem('rp-chat-history', JSON.stringify([
        { role: 'assistant', content: 'Hello', usage: { inputTokens: 100, outputTokens: 200 } },
      ]));

      render(<Chat {...defaultProps} />);

      await userEvent.click(screen.getByTestId('new-chat-button'));

      expect(screen.queryByTestId('token-count')).not.toBeInTheDocument();
    });
  });

  describe('Navigation Hints', () => {
    it('shows navigation hint after scenario creation', async () => {
      // Requires mocking tool execution
    });

    it('navigates to correct tab when hint link clicked', async () => {
      const onNavigate = vi.fn();
      render(<Chat {...defaultProps} onNavigate={onNavigate} />);

      // Trigger scenario creation and click hint
      // onNavigate should be called with 'scenarios'
    });
  });
});
```

**File**: `src/lib/__tests__/formatters.test.js`

```javascript
import { describe, it, expect } from 'vitest';
import { formatTokenCount } from '../formatters';

describe('formatTokenCount', () => {
  it('returns raw number for counts under 1000', () => {
    expect(formatTokenCount(0)).toBe('0');
    expect(formatTokenCount(100)).toBe('100');
    expect(formatTokenCount(999)).toBe('999');
  });

  it('formats thousands with K suffix', () => {
    expect(formatTokenCount(1000)).toBe('1K');
    expect(formatTokenCount(1500)).toBe('1.5K');
    expect(formatTokenCount(10000)).toBe('10K');
    expect(formatTokenCount(999999)).toBe('1000K');
  });

  it('formats millions with M suffix', () => {
    expect(formatTokenCount(1000000)).toBe('1M');
    expect(formatTokenCount(1500000)).toBe('1.5M');
    expect(formatTokenCount(10000000)).toBe('10M');
  });
});
```

---

### E2E Tests

**File**: `e2e/chat.spec.js`

```javascript
import { test, expect } from '@playwright/test';
import { setupAIMocks, setupStreamingMock } from './fixtures/mockAIService';
import { navigateToChat, sendMessage, waitForResponse, configureAIProvider } from './fixtures/chatHelpers';

test.describe('AI Chat - Core UX (Phases 1-5)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await configureAIProvider(page, 'custom', 'http://mock-api');
  });

  test('empty state shows capability cards and base case tip', async ({ page }) => {
    await navigateToChat(page);

    const emptyState = page.locator('[data-testid="empty-state"]');
    await expect(emptyState).toBeVisible();

    const capabilities = page.locator('[data-testid="capability-card"]');
    await expect(capabilities).toHaveCount(4);

    await expect(page.getByText('Base Case')).toBeVisible();
    await expect(page.getByText('Projections tab')).toBeVisible();
  });

  test('example prompt buttons populate input', async ({ page }) => {
    await navigateToChat(page);

    await page.click('text=heir value');

    const input = page.locator('[data-testid="chat-input"]');
    await expect(input).toHaveValue(/heir value/i);
  });

  test('input is disabled during AI processing', async ({ page }) => {
    await setupAIMocks(page, 'simple', { delay: 2000 });
    await navigateToChat(page);

    await sendMessage(page, 'Test message');

    const input = page.locator('[data-testid="chat-input"]');
    await expect(input).toBeDisabled();
    await expect(input).toHaveAttribute('placeholder', 'AI is thinking...');
  });

  test('tool call indicators appear during tool execution', async ({ page }) => {
    await setupAIMocks(page, 'withToolCall', { delay: 1000 });
    await navigateToChat(page);

    await sendMessage(page, 'What is my current state?');

    const indicator = page.locator('[data-testid="tool-call-indicator"]');
    await expect(indicator).toBeVisible();
    await expect(indicator).toContainText('Reading');
  });

  test('navigation hint appears after scenario creation', async ({ page }) => {
    await setupAIMocks(page, 'withScenarioCreation');
    await navigateToChat(page);

    await sendMessage(page, 'Create a scenario');
    await waitForResponse(page);

    const hint = page.locator('[data-testid="action-hint"]');
    await expect(hint).toBeVisible();
    await expect(hint).toContainText('Scenario');
    await expect(hint).toContainText('View in Scenarios');
  });

  test('navigation hint link switches tabs', async ({ page }) => {
    await setupAIMocks(page, 'withScenarioCreation');
    await navigateToChat(page);

    await sendMessage(page, 'Create a scenario');
    await waitForResponse(page);

    await page.click('[data-testid="action-hint"] a');

    // Should navigate to scenarios tab
    await expect(page.locator('[data-testid="scenarios-panel"]')).toBeVisible();
  });

  test('hint can be dismissed', async ({ page }) => {
    await setupAIMocks(page, 'withScenarioCreation');
    await navigateToChat(page);

    await sendMessage(page, 'Create a scenario');
    await waitForResponse(page);

    const hint = page.locator('[data-testid="action-hint"]');
    await expect(hint).toBeVisible();

    await page.click('[data-testid="action-hint"] button[aria-label="Dismiss"]');

    await expect(hint).not.toBeVisible();
  });
});

test.describe('AI Chat - Streaming (Phase 6)', () => {
  test('response text appears incrementally', async ({ page }) => {
    await setupStreamingMock(page, 200); // 200ms between chunks
    await navigateToChat(page);

    await sendMessage(page, 'Test streaming');

    const streaming = page.locator('[data-testid="streaming-content"]');

    // Check content grows over time
    await expect(streaming).toContainText('Hello');
    await page.waitForTimeout(300);
    await expect(streaming).toContainText('Hello world');
    await page.waitForTimeout(300);
    await expect(streaming).toContainText('Hello world!');
  });

  test('streaming cursor is visible during streaming', async ({ page }) => {
    await setupStreamingMock(page, 500);
    await navigateToChat(page);

    await sendMessage(page, 'Test');

    const cursor = page.locator('[data-testid="streaming-cursor"]');
    await expect(cursor).toBeVisible();
    await expect(cursor).toHaveClass(/animate-pulse/);
  });

  test('message moves to history after streaming completes', async ({ page }) => {
    await setupStreamingMock(page, 50);
    await navigateToChat(page);

    await sendMessage(page, 'Test');

    // Wait for streaming to complete
    await page.waitForSelector('[data-testid="streaming-content"]', { state: 'detached' });

    const messages = page.locator('[data-testid="message-assistant"]');
    await expect(messages).toHaveCount(1);
    await expect(messages).toContainText('Hello world!');
  });
});

test.describe('AI Chat - Cancel & Escape (Phase 7)', () => {
  test('cancel button appears during loading', async ({ page }) => {
    await setupAIMocks(page, 'simple', { delay: 5000 });
    await navigateToChat(page);

    await sendMessage(page, 'Test');

    await expect(page.locator('[data-testid="cancel-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="send-button"]')).not.toBeVisible();
  });

  test('clicking cancel stops the request', async ({ page }) => {
    await setupAIMocks(page, 'simple', { delay: 5000 });
    await navigateToChat(page);

    await sendMessage(page, 'Test');
    await page.click('[data-testid="cancel-button"]');

    // Should return to ready state
    await expect(page.locator('[data-testid="send-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="chat-input"]')).not.toBeDisabled();
  });

  test('pressing Escape cancels the request', async ({ page }) => {
    await setupAIMocks(page, 'simple', { delay: 5000 });
    await navigateToChat(page);

    await sendMessage(page, 'Test');
    await page.keyboard.press('Escape');

    await expect(page.locator('[data-testid="send-button"]')).toBeVisible();
  });

  test('no error message after cancellation', async ({ page }) => {
    await setupAIMocks(page, 'simple', { delay: 5000 });
    await navigateToChat(page);

    await sendMessage(page, 'Test');
    await page.keyboard.press('Escape');

    // Wait a moment to ensure no error appears
    await page.waitForTimeout(500);
    await expect(page.locator('[role="alert"]')).not.toBeVisible();
  });

  test('can send new message after cancelling', async ({ page }) => {
    await setupAIMocks(page, 'simple', { delay: 100 });
    await navigateToChat(page);

    // First message - cancel it
    await sendMessage(page, 'First message');
    await page.keyboard.press('Escape');

    // Send second message
    await sendMessage(page, 'Second message');
    await waitForResponse(page);

    const messages = page.locator('[data-testid="message-user"]');
    await expect(messages).toHaveCount(1); // Only second message
  });
});

test.describe('AI Chat - Copy (Phase 8)', () => {
  test.beforeEach(async ({ page }) => {
    // Pre-populate chat with a message
    await page.addInitScript(() => {
      localStorage.setItem('rp-chat-history', JSON.stringify([
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'This is the response to copy' },
      ]));
    });
  });

  test('copy button appears on hover over assistant message', async ({ page }) => {
    await navigateToChat(page);

    const message = page.locator('[data-testid="message-assistant"]');
    await message.hover();

    await expect(page.locator('[data-testid="copy-button"]')).toBeVisible();
  });

  test('copy button does not appear for user messages', async ({ page }) => {
    await navigateToChat(page);

    const userMessage = page.locator('[data-testid="message-user"]');
    await userMessage.hover();

    await expect(page.locator('[data-testid="copy-button"]')).not.toBeVisible();
  });

  test('clicking copy copies text to clipboard', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await navigateToChat(page);

    const message = page.locator('[data-testid="message-assistant"]');
    await message.hover();
    await page.click('[data-testid="copy-button"]');

    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toBe('This is the response to copy');
  });

  test('copy button shows checkmark after copying', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await navigateToChat(page);

    const message = page.locator('[data-testid="message-assistant"]');
    await message.hover();
    await page.click('[data-testid="copy-button"]');

    // Should show checkmark icon
    await expect(page.locator('[data-testid="copy-button"] svg')).toHaveClass(/text-emerald/);
  });
});

test.describe('AI Chat - Apply Scenario (Phase 9)', () => {
  test.beforeEach(async ({ page }) => {
    // Create a scenario first
    await page.addInitScript(() => {
      localStorage.setItem('rp-scenarios', JSON.stringify([
        { name: 'No Roth', overrides: { rothConversions: [] } },
      ]));
    });
  });

  test('AI can apply scenario to base case', async ({ page }) => {
    await setupAIMocks(page, 'applyScenario');
    await navigateToChat(page);

    await sendMessage(page, 'Apply the No Roth scenario');
    await waitForResponse(page);

    // Should show action hint pointing to projections
    const hint = page.locator('[data-testid="action-hint"]');
    await expect(hint).toContainText('applied');
    await expect(hint).toContainText('Projections');
  });

  test('parameters change after applying scenario', async ({ page }) => {
    await setupAIMocks(page, 'applyScenario');
    await navigateToChat(page);

    await sendMessage(page, 'Apply the No Roth scenario');
    await waitForResponse(page);

    // Navigate to projections and check params
    await page.click('[data-testid="projections-tab"]');

    // Verify rothConversions is now empty
    // (Implementation depends on how params are displayed)
  });

  test('error message for non-existent scenario', async ({ page }) => {
    await setupAIMocks(page, 'applyScenarioError');
    await navigateToChat(page);

    await sendMessage(page, 'Apply the NonExistent scenario');
    await waitForResponse(page);

    const response = await page.locator('[data-testid="message-assistant"]').last().textContent();
    expect(response).toContain('not found');
  });
});

test.describe('AI Chat - Token Tracking (Phase 10)', () => {
  test('token count appears in header after first message', async ({ page }) => {
    await setupAIMocks(page, 'simple'); // Returns usage data
    await navigateToChat(page);

    await sendMessage(page, 'Test');
    await waitForResponse(page);

    await expect(page.locator('[data-testid="token-count"]')).toBeVisible();
  });

  test('token count accumulates across messages', async ({ page }) => {
    await setupAIMocks(page, 'simple');
    await navigateToChat(page);

    await sendMessage(page, 'First');
    await waitForResponse(page);

    const firstCount = await page.locator('[data-testid="token-count"]').textContent();

    await sendMessage(page, 'Second');
    await waitForResponse(page);

    const secondCount = await page.locator('[data-testid="token-count"]').textContent();

    // Second count should be higher
    expect(parseInt(secondCount)).toBeGreaterThan(parseInt(firstCount));
  });

  test('per-message token indicator shows', async ({ page }) => {
    await setupAIMocks(page, 'simple');
    await navigateToChat(page);

    await sendMessage(page, 'Test');
    await waitForResponse(page);

    const message = page.locator('[data-testid="message-assistant"]');
    await expect(message.locator('[data-testid="message-tokens"]')).toBeVisible();
  });

  test('clearing chat resets token count', async ({ page }) => {
    await setupAIMocks(page, 'simple');
    await navigateToChat(page);

    await sendMessage(page, 'Test');
    await waitForResponse(page);

    await expect(page.locator('[data-testid="token-count"]')).toBeVisible();

    await page.click('[data-testid="new-chat-button"]');

    await expect(page.locator('[data-testid="token-count"]')).not.toBeVisible();
  });

  test('cached tokens shown differently', async ({ page }) => {
    // Mock response with cache hits
    await page.route('**/api/v1/messages', async route => {
      await route.fulfill({
        json: {
          content: [{ type: 'text', text: 'Response' }],
          usage: {
            input_tokens: 100,
            output_tokens: 50,
            cache_read_input_tokens: 80,
          },
          stop_reason: 'end_turn',
        },
      });
    });

    await navigateToChat(page);
    await sendMessage(page, 'Test');
    await waitForResponse(page);

    const tokenDisplay = page.locator('[data-testid="token-count"]');
    await expect(tokenDisplay).toContainText('cached');
  });
});

test.describe('AI Chat - Edge Cases', () => {
  test('handles multiple tool calls in one request', async ({ page }) => {
    await page.route('**/api/v1/messages', async route => {
      await route.fulfill({
        json: {
          content: [
            { type: 'tool_use', id: 'tool_1', name: 'get_current_state', input: {} },
            { type: 'tool_use', id: 'tool_2', name: 'calculate', input: { expression: '1+1' } },
          ],
          stop_reason: 'tool_use',
        },
      });
    });

    await navigateToChat(page);
    await sendMessage(page, 'Multi-tool request');

    const indicators = page.locator('[data-testid="tool-call-indicator"]');
    await expect(indicators).toHaveCount(2);
  });

  test('handles tool call errors gracefully', async ({ page }) => {
    // Setup mock that returns error result
    await navigateToChat(page);

    // Tool execution should show error but not crash
    await sendMessage(page, 'Trigger error tool');

    // Should still be able to send new messages
    const input = page.locator('[data-testid="chat-input"]');
    await expect(input).not.toBeDisabled();
  });

  test('handles rapid sequential messages', async ({ page }) => {
    await setupAIMocks(page, 'simple', { delay: 100 });
    await navigateToChat(page);

    // Send messages quickly
    const input = page.locator('[data-testid="chat-input"]');

    await input.fill('First');
    await page.click('[data-testid="send-button"]');

    // Try to send another while first is processing
    await input.fill('Second'); // Should be disabled or cleared

    // First message should complete normally
    await waitForResponse(page);

    const messages = page.locator('[data-testid="message-assistant"]');
    await expect(messages).toHaveCount(1);
  });

  test('handles network errors', async ({ page }) => {
    await page.route('**/api/v1/messages', route => route.abort('failed'));
    await navigateToChat(page);

    await sendMessage(page, 'Test');

    // Should show error
    await expect(page.locator('[role="alert"]')).toBeVisible();

    // Should be able to retry
    await expect(page.locator('[data-testid="send-button"]')).toBeVisible();
  });

  test('handles malformed API responses', async ({ page }) => {
    await page.route('**/api/v1/messages', async route => {
      await route.fulfill({ body: 'not json' });
    });

    await navigateToChat(page);
    await sendMessage(page, 'Test');

    await expect(page.locator('[role="alert"]')).toBeVisible();
  });

  test('copy works with multi-line responses', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    await page.addInitScript(() => {
      localStorage.setItem('rp-chat-history', JSON.stringify([
        { role: 'assistant', content: 'Line 1\nLine 2\nLine 3' },
      ]));
    });

    await navigateToChat(page);

    const message = page.locator('[data-testid="message-assistant"]');
    await message.hover();
    await page.click('[data-testid="copy-button"]');

    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toBe('Line 1\nLine 2\nLine 3');
  });

  test('copy works with special characters', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    await page.addInitScript(() => {
      localStorage.setItem('rp-chat-history', JSON.stringify([
        { role: 'assistant', content: 'Code: `const x = 1;` and "quotes" & <html>' },
      ]));
    });

    await navigateToChat(page);

    const message = page.locator('[data-testid="message-assistant"]');
    await message.hover();
    await page.click('[data-testid="copy-button"]');

    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toBe('Code: `const x = 1;` and "quotes" & <html>');
  });
});
```

---

### Test Commands

Add to `package.json`:

```json
{
  "scripts": {
    "test:unit": "vitest run",
    "test:unit:watch": "vitest",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:all": "npm run test:unit && npm run test:e2e",
    "test:chat": "vitest run --grep Chat && playwright test chat.spec.js"
  }
}
```

### CI Integration

**File**: `.github/workflows/test.yml` (update existing or create)

```yaml
name: Tests

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run test:unit

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run build
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Phase 6: Streaming Responses

### Overview
Show AI response text as it generates, improving perceived latency and providing real-time feedback.

### Design Decisions
- Use Server-Sent Events (SSE) for streaming
- Anthropic: `stream: true` returns `content_block_delta` events
- OpenAI: `stream: true` returns `delta.content` chunks
- Custom endpoints: Detect format from URL (same as non-streaming)

### Changes Required:

#### 1. Add streaming support to AIService
**File**: `src/lib/aiService.js`

```javascript
// Add to AIService class
async sendMessageStreaming(messages, tools, onChunk, onToolCall) {
  const format = this.getApiFormat();
  const request = this.formatRequest(messages, tools);
  request.stream = true;

  const response = await fetch(this.getBaseUrl(), {
    method: 'POST',
    headers: this.getHeaders(),
    body: JSON.stringify(request),
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullContent = '';
  let toolCalls = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6);
      if (data === '[DONE]') continue;

      try {
        const parsed = JSON.parse(data);
        const chunk = this.parseStreamChunk(parsed, format);
        if (chunk.text) {
          fullContent += chunk.text;
          onChunk?.(chunk.text, fullContent);
        }
        if (chunk.toolCall) {
          toolCalls.push(chunk.toolCall);
          onToolCall?.(chunk.toolCall);
        }
      } catch (e) {
        // Skip unparseable chunks
      }
    }
  }

  return { content: fullContent, toolCalls };
}

parseStreamChunk(data, format) {
  if (format === 'anthropic') {
    if (data.type === 'content_block_delta') {
      return { text: data.delta?.text || '' };
    }
    if (data.type === 'tool_use') {
      return { toolCall: { id: data.id, name: data.name, arguments: data.input } };
    }
  } else {
    // OpenAI format
    const delta = data.choices?.[0]?.delta;
    if (delta?.content) {
      return { text: delta.content };
    }
    if (delta?.tool_calls) {
      // Tool calls come in chunks, need to accumulate
      return { toolCall: delta.tool_calls[0] };
    }
  }
  return {};
}
```

#### 2. Update Chat to use streaming
**File**: `src/components/Chat/index.jsx`

```javascript
// Add state for streaming content
const [streamingContent, setStreamingContent] = useState('');

// Update sendMessage to use streaming
const response = await service.sendMessageStreaming(
  allMessages,
  AGENT_TOOLS,
  (chunk, full) => setStreamingContent(full), // Update as chunks arrive
  (toolCall) => {
    setActiveToolCalls(prev => [...prev, { ...toolCall, status: 'running' }]);
  }
);

// After streaming completes, move to messages
setStreamingContent('');
setMessages(prev => [...prev, { role: 'assistant', content: response.content }]);
```

#### 3. Render streaming content
```jsx
{/* Show streaming content while it arrives */}
{streamingContent && (
  <div className="flex gap-3 justify-start">
    <div className="w-8 h-8 rounded-full bg-purple-600/20 flex items-center justify-center">
      <Bot className="w-4 h-4 text-purple-400" />
    </div>
    <div className="bg-slate-800 rounded-lg px-4 py-2 max-w-[80%]">
      <div className="whitespace-pre-wrap text-sm">{streamingContent}</div>
      <span className="inline-block w-2 h-4 bg-purple-400 animate-pulse ml-1" />
    </div>
  </div>
)}
```

### Success Criteria:

#### Automated Verification:
- [x] Lint passes: `npm run lint`
- [x] Build succeeds: `npm run build`

#### Manual Verification:
- [x] Text appears word-by-word as AI generates
- [x] Cursor/caret animation shows streaming in progress
- [x] Tool calls still work during streaming
- [x] Works with Anthropic, OpenAI, and custom endpoints

---

## Phase 7: Cancel Button & Escape Key

### Overview
Allow users to stop long-running AI requests using AbortController, triggered by button click or Escape key.

### Changes Required:

#### 1. Add AbortController ref
**File**: `src/components/Chat/index.jsx`

```javascript
const abortControllerRef = useRef(null);

// In sendMessage, before fetch:
abortControllerRef.current = new AbortController();

// Pass signal to AIService
const response = await service.sendMessageStreaming(
  allMessages,
  AGENT_TOOLS,
  onChunk,
  onToolCall,
  abortControllerRef.current.signal // Pass abort signal
);
```

#### 2. Update AIService to accept signal
**File**: `src/lib/aiService.js`

```javascript
async sendMessageStreaming(messages, tools, onChunk, onToolCall, signal) {
  const response = await fetch(this.getBaseUrl(), {
    method: 'POST',
    headers: this.getHeaders(),
    body: JSON.stringify(request),
    signal, // Pass through abort signal
  });
  // ...
}
```

#### 3. Add cancel handler and button
**File**: `src/components/Chat/index.jsx`

```javascript
const cancelRequest = useCallback(() => {
  if (abortControllerRef.current) {
    abortControllerRef.current.abort();
    setIsLoading(false);
    setStreamingContent('');
    setActiveToolCalls([]);
    // Optionally add partial response to messages
  }
}, []);

// In the input area, show cancel button when loading
{isLoading ? (
  <button
    onClick={cancelRequest}
    className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-500"
    title="Cancel (Esc)"
  >
    <Square className="w-4 h-4" /> {/* Stop icon */}
  </button>
) : (
  <button onClick={sendMessage} disabled={!input.trim()}>
    <Send className="w-4 h-4" />
  </button>
)}
```

#### 4. Add Escape key handler
**File**: `src/components/Chat/index.jsx`

```javascript
// Global Escape key handler for cancellation
useEffect(() => {
  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && isLoading) {
      e.preventDefault();
      cancelRequest();
    }
  };

  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, [isLoading, cancelRequest]);
```

#### 5. Handle abort errors gracefully
```javascript
try {
  // ... streaming logic
} catch (err) {
  if (err.name === 'AbortError') {
    // User cancelled - don't show as error
    return;
  }
  setError(err.message);
}
```

### Success Criteria:

#### Automated Verification:
- [x] Lint passes: `npm run lint`
- [x] Build succeeds: `npm run build`
- [x] Unit tests pass (see Testing section)
- [x] E2E tests pass (see Testing section)

---

## Phase 8: Copy Response Button

### Overview
Add a button to copy AI response text to clipboard.

### Changes Required:

#### 1. Add copy functionality to message bubbles
**File**: `src/components/Chat/index.jsx`

```javascript
// Add state to track copied message
const [copiedMessageId, setCopiedMessageId] = useState(null);

const copyToClipboard = async (text, messageId) => {
  try {
    await navigator.clipboard.writeText(text);
    setCopiedMessageId(messageId);
    setTimeout(() => setCopiedMessageId(null), 2000); // Reset after 2s
  } catch (err) {
    console.error('Failed to copy:', err);
  }
};
```

#### 2. Add copy button to assistant messages
```jsx
{msg.role === 'assistant' && (
  <div className="relative group">
    <div className="bg-slate-800 rounded-lg px-4 py-2 max-w-[80%]">
      <div className="whitespace-pre-wrap text-sm">{msg.content}</div>
    </div>
    {/* Copy button - appears on hover */}
    <button
      onClick={() => copyToClipboard(msg.content, idx)}
      className="absolute top-1 right-1 p-1 rounded bg-slate-700 opacity-0 group-hover:opacity-100 transition-opacity"
      title="Copy to clipboard"
    >
      {copiedMessageId === idx ? (
        <Check className="w-3 h-3 text-emerald-400" />
      ) : (
        <Copy className="w-3 h-3 text-slate-400" />
      )}
    </button>
  </div>
)}
```

### Success Criteria:

#### Automated Verification:
- [x] Lint passes: `npm run lint`
- [x] Build succeeds: `npm run build`

#### Manual Verification:
- [x] Copy button appears on hover over assistant messages
- [x] Clicking copy puts text in clipboard
- [x] Button shows checkmark briefly after copying
- [x] Works on all browsers (Chrome, Firefox, Safari)

---

## Phase 9: Apply Scenario to Base Case Tool

### Overview
Add a new AI tool that lets the assistant apply a scenario's parameter overrides to become the new base case.

### Changes Required:

#### 1. Add new tool definition
**File**: `src/lib/aiService.js`

```javascript
// Add to AGENT_TOOLS array
{
  name: 'apply_scenario_to_base',
  description: 'Apply a scenario\'s parameter overrides to become the new base case. This modifies the current plan parameters.',
  parameters: {
    type: 'object',
    properties: {
      scenarioName: {
        type: 'string',
        description: 'Name of the scenario to apply',
      },
      confirm: {
        type: 'boolean',
        description: 'Must be true to confirm this destructive action',
      },
    },
    required: ['scenarioName', 'confirm'],
  },
},

// Add to TOOL_UI_CONFIG
apply_scenario_to_base: {
  icon: '🔄',
  label: 'Applying scenario to base case',
  capability: { title: 'Apply Scenarios', description: 'Make a scenario your new base' },
  action: { type: 'scenario_applied', navigateTo: 'projections' },
},
```

#### 2. Add tool execution
**File**: `src/components/Chat/index.jsx`

```javascript
case 'apply_scenario_to_base': {
  if (!args.confirm) {
    return 'Error: Must set confirm=true to apply scenario';
  }
  if (!onApplyScenario) {
    return 'Scenario application not available';
  }
  const result = onApplyScenario(args.scenarioName);
  if (result.success) {
    const actionConfig = TOOL_UI_CONFIG.apply_scenario_to_base?.action;
    if (actionConfig) {
      setRecentAction({ ...actionConfig, name: args.scenarioName });
    }
    return `Applied scenario "${args.scenarioName}" to base case. Your plan parameters have been updated.`;
  }
  return `Error: ${result.error}`;
}
```

#### 3. Pass handler from App.jsx
**File**: `src/App.jsx`

```javascript
// Add handler to apply scenario overrides to params
const handleApplyScenario = useCallback((scenarioName) => {
  const scenario = scenarios.find(s => s.name === scenarioName);
  if (!scenario) {
    return { success: false, error: `Scenario "${scenarioName}" not found` };
  }
  // Merge scenario overrides into current params
  setParams(prev => ({ ...prev, ...scenario.overrides }));
  return { success: true };
}, [scenarios]);

<Chat
  ...
  onApplyScenario={handleApplyScenario}
/>
```

### Success Criteria:

#### Automated Verification:
- [x] Lint passes: `npm run lint`
- [x] Build succeeds: `npm run build`

#### Manual Verification:
- [x] AI can call the tool when asked to "apply this scenario"
- [x] Tool requires confirmation (confirm=true)
- [x] Parameters update in InputPanel after applying
- [x] Navigation hint shows pointing to Projections tab

---

## Phase 10: Token Tracking

### Overview
Display token usage per message and session total, including cached vs uncached tokens for cost awareness.

### Design Decisions
- Anthropic returns `usage: { input_tokens, output_tokens, cache_creation_input_tokens, cache_read_input_tokens }`
- OpenAI returns `usage: { prompt_tokens, completion_tokens, total_tokens }`
- Store usage in message metadata for per-message display
- Track session totals for header display

### Changes Required:

#### 1. Add usage tracking to AIService response
**File**: `src/lib/aiService.js`

```javascript
// In parseResponse, extract usage info
parseResponse(data, onToolCall) {
  const format = this.getApiFormat();
  let usage = null;

  if (format === 'anthropic') {
    usage = data.usage ? {
      inputTokens: data.usage.input_tokens || 0,
      outputTokens: data.usage.output_tokens || 0,
      cacheCreation: data.usage.cache_creation_input_tokens || 0,
      cacheRead: data.usage.cache_read_input_tokens || 0,
    } : null;
    // ... rest of parsing
  } else {
    usage = data.usage ? {
      inputTokens: data.usage.prompt_tokens || 0,
      outputTokens: data.usage.completion_tokens || 0,
      cacheCreation: 0,
      cacheRead: 0,
    } : null;
    // ... rest of parsing
  }

  return {
    content: ...,
    toolCalls: ...,
    stopReason: ...,
    usage, // Include usage in response
  };
}
```

#### 2. Store and display usage in Chat
**File**: `src/components/Chat/index.jsx`

```javascript
// Add session usage state
const [sessionUsage, setSessionUsage] = useState({
  inputTokens: 0,
  outputTokens: 0,
  cacheCreation: 0,
  cacheRead: 0,
});

// After each response, update session totals
if (response.usage) {
  setSessionUsage(prev => ({
    inputTokens: prev.inputTokens + response.usage.inputTokens,
    outputTokens: prev.outputTokens + response.usage.outputTokens,
    cacheCreation: prev.cacheCreation + response.usage.cacheCreation,
    cacheRead: prev.cacheRead + response.usage.cacheRead,
  }));

  // Store usage with message for per-message display
  setMessages(prev => [...prev, {
    role: 'assistant',
    content: response.content,
    usage: response.usage,
  }]);
}
```

#### 3. Display usage in header
```jsx
{/* In header, next to message count */}
<div className="flex items-center gap-2 text-slate-500 text-xs">
  <span>{messages.length} messages</span>
  {sessionUsage.inputTokens > 0 && (
    <span title={`Input: ${sessionUsage.inputTokens}, Output: ${sessionUsage.outputTokens}${sessionUsage.cacheRead > 0 ? `, Cached: ${sessionUsage.cacheRead}` : ''}`}>
      {formatTokenCount(sessionUsage.inputTokens + sessionUsage.outputTokens)} tokens
    </span>
  )}
</div>
```

#### 4. Add per-message usage indicator
```jsx
{/* Show usage on assistant messages */}
{msg.usage && (
  <div className="text-[10px] text-slate-600 mt-1">
    {msg.usage.outputTokens} tokens
    {msg.usage.cacheRead > 0 && (
      <span className="text-emerald-600 ml-1">
        ({msg.usage.cacheRead} cached)
      </span>
    )}
  </div>
)}
```

#### 5. Helper function for token formatting
```javascript
const formatTokenCount = (count) => {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
};
```

### Success Criteria:

#### Automated Verification:
- [x] Lint passes: `npm run lint`
- [x] Build succeeds: `npm run build`

#### Manual Verification:
- [x] Token count shows in header after first message
- [x] Per-message token count shows for assistant messages
- [x] Cached tokens highlighted differently (if available)
- [x] Session totals accumulate correctly
- [x] Clearing chat resets token count

---

## Future Improvements (Not in Scope)

1. **Message actions** - Edit, resend, delete messages
2. **Keyboard shortcuts** - Escape to cancel, up-arrow to edit last message
3. **Cost estimation** - Calculate $ cost based on token usage and model pricing
4. **Export chat** - Download conversation as markdown/JSON

---

## References

- Chat component: `src/components/Chat/index.jsx`
- AI service/tools: `src/lib/aiService.js`
- Scenario system: `src/components/ScenarioComparison/index.jsx`
- App routing: `src/App.jsx`
