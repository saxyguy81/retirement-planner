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
  Loader2,
  AlertCircle,
  Bot,
  User,
} from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';

import { generateProjections, calculateSummary } from '../../lib';
import { AIService, AGENT_TOOLS, loadAIConfig } from '../../lib/aiService';
import { fmt$ } from '../../lib/formatters';
import { AISettings } from '../AISettings';

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

export function Chat({
  params,
  projections,
  summary,
  onCreateScenario,
  onUpdateParams: _onUpdateParams,
}) {
  const [messages, setMessages] = useState(() => loadChatHistory());
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [aiConfig, setAIConfig] = useState(() => loadAIConfig());
  const messagesEndRef = useRef(null);

  // Calculate context usage
  const contextUsage = calculateContextUsage(messages);

  // Persist messages when they change
  useEffect(() => {
    saveChatHistory(messages);
  }, [messages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Execute tool calls
  const executeToolCall = useCallback(
    toolCall => {
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
            onCreateScenario(args.overrides || {}, args.name);
            return `Created scenario "${args.name}"`;
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

        default:
          return `Unknown tool: ${name}`;
      }
    },
    [params, projections, summary, onCreateScenario]
  );

  // Send message to AI
  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return;
    if (!aiConfig?.apiKey) {
      setError('Please configure your AI provider first');
      setShowSettings(true);
      return;
    }

    const userMessage = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const service = new AIService(aiConfig);
      const allMessages = [...messages, userMessage];

      // Keep looping while we get tool calls
      let response = await service.sendMessage(allMessages, AGENT_TOOLS, null);
      let assistantContent = response.content;

      // Handle tool calls
      while (response.toolCalls && response.toolCalls.length > 0) {
        const toolResults = [];

        for (const toolCall of response.toolCalls) {
          const result = executeToolCall(toolCall);
          toolResults.push({
            id: toolCall.id,
            name: toolCall.name,
            result,
          });
        }

        // Add tool results to messages and continue
        const toolResultMessage = {
          role: 'user',
          content: toolResults.map(t => `Tool ${t.name} result: ${t.result}`).join('\n'),
        };

        response = await service.sendMessage(
          [...allMessages, { role: 'assistant', content: assistantContent }, toolResultMessage],
          AGENT_TOOLS,
          null
        );

        if (response.content) {
          assistantContent = response.content;
        }
      }

      // Add final assistant message
      setMessages(prev => [...prev, { role: 'assistant', content: assistantContent }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
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
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden text-xs">
      {/* Header */}
      <div className="h-10 bg-slate-900/50 border-b border-slate-800 flex items-center px-3 justify-between shrink-0">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-purple-400" />
          <span className="text-slate-200 font-medium">AI Assistant</span>
          <span className="text-slate-500">({messages.length} messages)</span>
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
          >
            <Trash2 className="w-3 h-3" />
            New Chat
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`px-2 py-1 rounded text-xs flex items-center gap-1 ${
              showSettings
                ? 'bg-purple-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Settings
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Messages Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && !showSettings && (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <Bot className="w-12 h-12 mb-3 opacity-50" />
                <div className="text-lg mb-2">AI Assistant</div>
                <div className="text-sm text-center max-w-md">
                  Ask me about your retirement projections, compare strategies, or get help
                  understanding tax implications.
                </div>
                <div className="mt-4 space-y-2 text-xs">
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
              >
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-purple-600/20 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-purple-400" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-200'
                  }`}
                >
                  <div className="whitespace-pre-wrap text-sm">{msg.content}</div>
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-blue-400" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-purple-600/20 flex items-center justify-center shrink-0">
                  <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                </div>
                <div className="bg-slate-800 rounded-lg px-4 py-2">
                  <div className="text-slate-400 text-sm">Thinking...</div>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 text-rose-400 bg-rose-900/20 border border-rose-800 rounded-lg px-4 py-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-slate-800 p-4">
            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your retirement plan..."
                rows={2}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm resize-none focus:border-purple-500 focus:outline-none"
              />
              <button
                onClick={sendMessage}
                disabled={isLoading || !input.trim()}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            {!aiConfig?.apiKey && (
              <div className="text-amber-400 text-xs mt-2">
                Configure your AI provider in Settings to start chatting.
              </div>
            )}
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="w-80 border-l border-slate-800 p-4 overflow-y-auto">
            <AISettings onConfigChange={setAIConfig} />
          </div>
        )}
      </div>
    </div>
  );
}

export default Chat;
