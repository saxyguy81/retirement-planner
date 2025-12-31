/**
 * Chat Component
 *
 * AI-powered chat interface for retirement planning assistance.
 * Features:
 * - Message history with user/assistant roles
 * - Tool call execution and results display
 * - Session management (clear history)
 * - Provider configuration
 * - Persistent chat history
 * - Context limit warning
 */

import {
  AlertTriangle,
  MessageCircle,
  Send,
  Trash2,
  AlertCircle,
  Bot,
  User,
  Check,
  Square,
  Copy,
} from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';

import MarkdownMessage from './MarkdownMessage';
import ThinkingIndicator from './ThinkingIndicator';
import ToolCallProgress from './ToolCallProgress';

import { generateProjections, calculateSummary } from '../../lib';
import {
  AIService,
  AGENT_TOOLS,
  getToolCapabilities,
  loadAIConfig,
  DEFAULT_AI_CONFIG,
  AI_CONFIG_CHANGED_EVENT,
} from '../../lib/aiService';
import { fmt$ } from '../../lib/formatters';

// Storage key for chat history
const CHAT_STORAGE_KEY = 'rp-chat-history';

// Approximate token limit (characters * 0.25 as rough estimate)
// Most models have 100-200K context, using conservative 100K char limit (~25K tokens)
const CONTEXT_CHAR_LIMIT = 80000;
const CONTEXT_WARNING_THRESHOLD = 0.75; // Warn at 75% usage

// Load chat history from localStorage
const loadChatHistory = () => {
  try {
    const saved = localStorage.getItem(CHAT_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (e) {
    console.error('Failed to load chat history:', e);
  }
  return [];
};

// Save chat history to localStorage
const saveChatHistory = messages => {
  try {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
  } catch (e) {
    console.error('Failed to save chat history:', e);
  }
};

// Calculate approximate context usage
const calculateContextUsage = messages => {
  const totalChars = messages.reduce((sum, m) => sum + (m.content?.length || 0), 0);
  return {
    chars: totalChars,
    percent: totalChars / CONTEXT_CHAR_LIMIT,
    isWarning: totalChars / CONTEXT_CHAR_LIMIT >= CONTEXT_WARNING_THRESHOLD,
    isCritical: totalChars / CONTEXT_CHAR_LIMIT >= 0.9,
  };
};

// Navigation hint component for after scenario creation or parameter updates
function ActionHint({ action, onNavigate, onDismiss }) {
  if (!action) return null;

  if (action.type === 'scenario_created') {
    return (
      <div
        className="flex items-center gap-2 text-xs bg-emerald-900/30 border border-emerald-800 rounded-lg px-3 py-2 mx-4 mb-2"
        data-testid="action-hint"
      >
        <span className="text-emerald-300">✓ Scenario &quot;{action.name}&quot; created</span>
        <button
          onClick={() => onNavigate('scenarios')}
          className="text-emerald-400 hover:text-emerald-300 underline"
        >
          View in Scenarios →
        </button>
        <button
          onClick={onDismiss}
          className="text-slate-500 hover:text-slate-300 ml-auto"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    );
  }

  if (action.type === 'params_updated') {
    return (
      <div
        className="flex items-center gap-2 text-xs bg-blue-900/30 border border-blue-800 rounded-lg px-3 py-2 mx-4 mb-2"
        data-testid="action-hint"
      >
        <span className="text-blue-300">✓ {action.description || 'Base case updated'}</span>
        <button
          onClick={() => onNavigate('projections')}
          className="text-blue-400 hover:text-blue-300 underline"
        >
          View Projections →
        </button>
        <button
          onClick={onDismiss}
          className="text-slate-500 hover:text-slate-300 ml-auto"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    );
  }

  return null;
}

export function Chat({
  params,
  projections,
  summary,
  onCreateScenario,
  onUpdateParams,
  onNavigate,
}) {
  const [messages, setMessages] = useState(() => loadChatHistory());
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [aiConfig, setAIConfig] = useState(() => loadAIConfig() || DEFAULT_AI_CONFIG);
  const [activeToolCalls, setActiveToolCalls] = useState([]);
  const [recentAction, setRecentAction] = useState(null);
  const [streamingContent, setStreamingContent] = useState('');
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  const [sessionTokens, setSessionTokens] = useState({ input: 0, output: 0 });
  const [loadingStartTime, setLoadingStartTime] = useState(null);
  const messagesEndRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Reload AI config when it might have changed (e.g., user configured in Settings)
  useEffect(() => {
    const reloadConfig = () => {
      setAIConfig(loadAIConfig() || DEFAULT_AI_CONFIG);
    };

    // Cross-tab storage changes
    window.addEventListener('storage', reloadConfig);

    // Window focus (covers browser tab switches)
    window.addEventListener('focus', reloadConfig);

    // Same-tab config changes (from Settings panel via custom event)
    window.addEventListener(AI_CONFIG_CHANGED_EVENT, reloadConfig);

    // Visibility change (covers internal tab switches within the app)
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

  // Calculate context usage
  const contextUsage = calculateContextUsage(messages);

  // Persist messages when they change
  useEffect(() => {
    saveChatHistory(messages);
  }, [messages]);

  // Auto-scroll to bottom when new messages arrive or streaming content updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  // Execute tool calls
  const executeToolCall = useCallback(
    async toolCall => {
      const { name, arguments: args } = toolCall;

      switch (name) {
        case 'get_current_state': {
          const include = args.include || ['params', 'summary'];
          const result = {};
          if (include.includes('params')) {
            result.params = {
              startYear: params.startYear,
              endYear: params.endYear,
              birthYear: params.birthYear,
              afterTaxStart: params.afterTaxStart,
              iraStart: params.iraStart,
              rothStart: params.rothStart,
              annualExpenses: params.annualExpenses,
              socialSecurityMonthly: params.socialSecurityMonthly,
              rothConversions: params.rothConversions,
            };
          }
          if (include.includes('summary')) {
            result.summary = {
              endingPortfolio: summary.endingPortfolio,
              endingHeirValue: summary.endingHeirValue,
              totalTaxPaid: summary.totalTaxPaid,
              finalRothPercent: summary.finalRothPercent,
            };
          }
          if (include.includes('projections')) {
            result.projections = projections.slice(0, 5).map(p => ({
              year: p.year,
              totalEOY: p.totalEOY,
              heirValue: p.heirValue,
            }));
          }
          return JSON.stringify(result, null, 2);
        }

        case 'run_projection': {
          const overrides = args.overrides || {};
          const testParams = { ...params, ...overrides };
          const proj = generateProjections(testParams);
          const sum = calculateSummary(proj);
          return JSON.stringify({
            endingPortfolio: fmt$(sum.endingPortfolio),
            endingHeirValue: fmt$(sum.endingHeirValue),
            totalTaxPaid: fmt$(sum.totalTaxPaid),
            finalRothPercent: `${(sum.finalRothPercent * 100).toFixed(1)}%`,
          });
        }

        case 'create_scenario': {
          if (onCreateScenario) {
            // Create scenario but DON'T trigger navigation - stay in chat
            onCreateScenario(args.overrides || {}, args.name);
            // Show inline notification with optional navigation link
            setRecentAction({
              type: 'scenario_created',
              name: args.name,
              // No navigateTo - stay in chat, user can click to navigate if desired
            });
            return `Created scenario "${args.name}". You can view it in the Scenarios tab when ready.`;
          }
          return 'Scenario creation not available';
        }

        case 'calculate': {
          try {
            // Safe evaluation (limited scope)
            const safeEval = new Function('return ' + args.expression);
            const result = safeEval();
            return String(result);
          } catch (e) {
            return `Error: ${e.message}`;
          }
        }

        case 'apply_scenario_to_base': {
          if (onUpdateParams) {
            onUpdateParams(args.overrides || {});
            // Show inline notification with optional navigation link - stay in chat
            setRecentAction({
              type: 'params_updated',
              description: args.description || 'Parameters updated',
              // No navigateTo - stay in chat, user can click to navigate if desired
            });
            return `Applied changes to base case: ${args.description || 'Parameters updated'}. You can view updated projections in the Projections tab.`;
          }
          return 'Parameter update not available';
        }

        case 'read_source_code': {
          const { getSourceCode } = await import('../../lib/sourceCodeProvider');
          const source = getSourceCode(args.target);
          return JSON.stringify(source, null, 2);
        }

        case 'grep_codebase': {
          const { grepCodebase } = await import('../../lib/sourceCodeProvider');
          const results = grepCodebase(args.pattern, args.context);
          return JSON.stringify(results, null, 2);
        }

        case 'capture_snapshot': {
          const { captureTableAsMarkdown, captureSummaryAsMarkdown, captureYearRange } =
            await import('../../lib/snapshotCapture');

          if (args.type === 'summary') {
            return captureSummaryAsMarkdown(summary);
          }

          if (args.type === 'projections') {
            return captureTableAsMarkdown(projections, args.columns);
          }

          if (args.type === 'year_range') {
            return captureYearRange(projections, args.startYear, args.endYear, args.columns);
          }

          return 'Unknown snapshot type';
        }

        case 'web_search': {
          const { webSearch } = await import('../../lib/aiService');
          const results = await webSearch(args.query);
          return results;
        }

        case 'fetch_page': {
          const { fetchPage } = await import('../../lib/aiService');
          const content = await fetchPage(args.url);
          return content;
        }

        default:
          return `Unknown tool: ${name}`;
      }
    },
    [params, projections, summary, onCreateScenario, onUpdateParams]
  );

  // Cancel the current request
  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setStreamingContent('');
    setActiveToolCalls([]);
  }, []);

  // Global Escape key handler for cancellation
  useEffect(() => {
    const handleKeyDown = e => {
      if (e.key === 'Escape' && isLoading) {
        e.preventDefault();
        cancelRequest();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isLoading, cancelRequest]);

  // Copy to clipboard
  const copyToClipboard = useCallback(async (text, messageId) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, []);

  // Send message to AI
  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return;
    if (!aiConfig?.apiKey && aiConfig?.provider !== 'custom') {
      setError('Please configure your AI provider in the Settings tab');
      return;
    }

    const userMessage = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setLoadingStartTime(Date.now());
    setError(null);
    setRecentAction(null); // Clear any previous action hints
    setStreamingContent('');

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();

    try {
      const service = new AIService(aiConfig);
      const allMessages = [...messages, userMessage];

      // Use streaming for initial response
      let response = await service.sendMessageStreaming(
        allMessages,
        AGENT_TOOLS,
        (chunk, full) => setStreamingContent(full),
        toolCall => {
          setActiveToolCalls(prev => [
            ...prev,
            { id: toolCall.id, name: toolCall.name, status: 'running' },
          ]);
        },
        abortControllerRef.current.signal
      );

      let assistantContent = response.content;

      // If assistant responded with tool calls but no text content,
      // create a placeholder to preserve context (prevents message from being filtered out)
      if (!assistantContent && response.toolCalls && response.toolCalls.length > 0) {
        assistantContent = response.toolCalls.map(tc => `[Calling ${tc.name}...]`).join(' ');
      }

      setStreamingContent(''); // Clear streaming content

      // Handle tool calls (non-streaming for tool loop)
      while (response.toolCalls && response.toolCalls.length > 0) {
        const toolResults = [];

        for (const toolCall of response.toolCalls) {
          const result = await executeToolCall(toolCall);

          // Update status to complete
          setActiveToolCalls(prev =>
            prev.map(tc => (tc.id === toolCall.id ? { ...tc, status: 'complete' } : tc))
          );

          toolResults.push({
            id: toolCall.id,
            name: toolCall.name,
            result,
          });
        }

        // Add tool results to messages and continue
        // Include toolCalls in assistant message for proper Anthropic formatting
        const assistantMessage = {
          role: 'assistant',
          content: assistantContent,
          toolCalls: response.toolCalls, // Preserve for Anthropic tool_use blocks
        };

        const toolResultMessage = {
          role: 'user',
          content: toolResults.map(t => `Tool ${t.name} result: ${t.result}`).join('\n\n'),
          toolResults, // Preserve for Anthropic tool_result blocks
        };

        // Use non-streaming for tool result follow-up
        response = await service.sendMessage(
          [...allMessages, assistantMessage, toolResultMessage],
          AGENT_TOOLS,
          null
        );

        // Update assistant content for next iteration
        if (response.content) {
          assistantContent = response.content;
        } else if (response.toolCalls && response.toolCalls.length > 0) {
          // Another round of tool calls with no text - preserve context
          assistantContent = response.toolCalls.map(tc => `[Calling ${tc.name}...]`).join(' ');
        }
      }

      // Add final assistant message with usage data
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: assistantContent, usage: response.usage },
      ]);

      // Update session token counts
      if (response.usage) {
        setSessionTokens(prev => ({
          input: prev.input + (response.usage.inputTokens || 0),
          output: prev.output + (response.usage.outputTokens || 0),
        }));
      }
    } catch (err) {
      // Don't show error for user-initiated cancellation
      if (err.name === 'AbortError') {
        return;
      }
      setError(err.message);
    } finally {
      setIsLoading(false);
      setLoadingStartTime(null);
      setActiveToolCalls([]); // Clear tool call indicators
      setStreamingContent('');
      abortControllerRef.current = null;
    }
  }, [input, messages, isLoading, aiConfig, executeToolCall]);

  // Handle Enter key
  const handleKeyDown = e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Clear chat history
  const clearHistory = () => {
    setMessages([]);
    setError(null);
    setSessionTokens({ input: 0, output: 0 }); // Reset token counts
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden text-xs">
      {/* Header */}
      <div className="h-10 bg-slate-900/50 border-b border-slate-800 flex items-center px-3 justify-between shrink-0">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-purple-400" />
          <span className="text-slate-200 font-medium">AI Assistant</span>
          <span className="text-slate-500">({messages.length} messages)</span>
          {/* Token usage indicator */}
          {(sessionTokens.input > 0 || sessionTokens.output > 0) && (
            <div
              className="text-slate-500 text-xs"
              title={`Input: ${sessionTokens.input.toLocaleString()} | Output: ${sessionTokens.output.toLocaleString()}`}
              data-testid="token-usage"
            >
              {((sessionTokens.input + sessionTokens.output) / 1000).toFixed(1)}K tokens
            </div>
          )}
          {/* Context usage indicator */}
          {contextUsage.isWarning && (
            <div
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
                contextUsage.isCritical
                  ? 'bg-rose-900/50 text-rose-300 border border-rose-700'
                  : 'bg-amber-900/50 text-amber-300 border border-amber-700'
              }`}
              title={`Context usage: ${Math.round(contextUsage.percent * 100)}%. Start a new chat to reset.`}
            >
              <AlertTriangle className="w-3 h-3" />
              {contextUsage.isCritical ? 'Context nearly full' : 'High context usage'}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={clearHistory}
            className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs flex items-center gap-1 hover:bg-slate-600"
            title="Start a new chat session (clears history)"
            data-testid="new-chat-button"
          >
            <Trash2 className="w-3 h-3" />
            New Chat
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Messages Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-4" data-testid="chat-messages">
            {messages.length === 0 && (
              <div
                className="flex flex-col items-center justify-center h-full text-slate-400 px-4"
                data-testid="empty-state"
              >
                <Bot className="w-12 h-12 mb-3 opacity-50" />
                <div className="text-lg mb-2">AI Assistant</div>
                <div className="text-sm text-center max-w-md mb-4">
                  I can help you with your retirement planning. Here&apos;s what I can do:
                </div>

                {/* Capabilities */}
                <div className="grid grid-cols-2 gap-2 text-xs mb-4 max-w-md">
                  {getToolCapabilities().map((cap, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-800/50 rounded p-2"
                      data-testid="capability-card"
                    >
                      <span className="text-purple-400">{cap.title}</span>
                      <div className="text-slate-500 mt-1">{cap.description}</div>
                    </div>
                  ))}
                </div>

                {/* Quick tip about base case */}
                <div className="text-xs text-slate-500 bg-slate-800/30 rounded p-2 max-w-md mb-4">
                  <strong>Tip:</strong> Your &quot;Base Case&quot; is your current plan in the
                  Projections tab. Scenarios I create are alternatives to compare against it.
                </div>

                {/* Example prompts */}
                <div className="space-y-2 text-xs">
                  <div className="text-slate-500">Try asking:</div>
                  <button
                    onClick={() => setInput("What's my current projected heir value?")}
                    className="block px-3 py-1.5 bg-slate-800 rounded hover:bg-slate-700"
                  >
                    {'"'}What{"'"}s my current projected heir value?{'"'}
                  </button>
                  <button
                    onClick={() =>
                      setInput('How much would I save in taxes with no Roth conversions?')
                    }
                    className="block px-3 py-1.5 bg-slate-800 rounded hover:bg-slate-700"
                  >
                    {'"'}How much would I save in taxes with no Roth conversions?{'"'}
                  </button>
                  <button
                    onClick={() =>
                      setInput('Create a scenario with $500K conversions in 2026-2028')
                    }
                    className="block px-3 py-1.5 bg-slate-800 rounded hover:bg-slate-700"
                  >
                    {'"'}Create a scenario with $500K conversions in 2026-2028{'"'}
                  </button>
                </div>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                data-testid={msg.role === 'user' ? 'message-user' : 'message-assistant'}
              >
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-purple-600/20 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-purple-400" />
                  </div>
                )}
                <div className="relative group max-w-[80%]">
                  <div
                    className={`rounded-lg px-4 py-2 ${
                      msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-200'
                    }`}
                  >
                    {msg.role === 'assistant' ? (
                      <MarkdownMessage content={msg.content} onNavigate={onNavigate} />
                    ) : (
                      <div className="whitespace-pre-wrap text-sm">{msg.content}</div>
                    )}
                  </div>
                  {/* Copy button - appears on hover for assistant messages */}
                  {msg.role === 'assistant' && (
                    <button
                      onClick={() => copyToClipboard(msg.content, idx)}
                      className="absolute top-1 right-1 p-1 rounded bg-slate-700 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Copy to clipboard"
                      data-testid="copy-button"
                    >
                      {copiedMessageId === idx ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3 text-slate-400" />
                      )}
                    </button>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-blue-400" />
                  </div>
                )}
              </div>
            ))}

            {/* Active tool calls */}
            {activeToolCalls.length > 0 && <ToolCallProgress toolCalls={activeToolCalls} />}

            {/* Streaming content display */}
            {streamingContent && (
              <div className="flex gap-3 justify-start" data-testid="streaming-content">
                <div className="w-8 h-8 rounded-full bg-purple-600/20 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-purple-400" />
                </div>
                <div className="bg-slate-800 rounded-lg px-4 py-2 max-w-[80%]">
                  <div className="text-sm text-slate-200">
                    <MarkdownMessage content={streamingContent} onNavigate={onNavigate} />
                    <span
                      className="inline-block w-2 h-4 bg-purple-400 animate-pulse ml-1"
                      data-testid="streaming-cursor"
                    />
                  </div>
                </div>
              </div>
            )}

            {isLoading && !streamingContent && activeToolCalls.length === 0 && (
              <ThinkingIndicator startTime={loadingStartTime} />
            )}

            {error && (
              <div
                className="flex items-center gap-2 text-rose-400 bg-rose-900/20 border border-rose-800 rounded-lg px-4 py-2"
                role="alert"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Navigation hint after scenario creation */}
            <ActionHint
              action={recentAction}
              onNavigate={tab => {
                if (onNavigate) onNavigate(tab);
              }}
              onDismiss={() => setRecentAction(null)}
            />

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-slate-800 p-4">
            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isLoading ? 'AI is thinking...' : 'Ask about your retirement plan...'}
                rows={2}
                disabled={isLoading}
                data-testid="chat-input"
                className={`flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm resize-none focus:border-purple-500 focus:outline-none ${
                  isLoading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              />
              {isLoading ? (
                <button
                  onClick={cancelRequest}
                  data-testid="cancel-button"
                  className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-500"
                  title="Cancel (Esc)"
                >
                  <Square className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={sendMessage}
                  disabled={!input.trim()}
                  data-testid="send-button"
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                </button>
              )}
            </div>
            {!aiConfig?.apiKey && aiConfig?.provider !== 'custom' && (
              <div className="text-amber-400 text-xs mt-2">
                Configure your AI provider in the Settings tab to start chatting.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Chat;
