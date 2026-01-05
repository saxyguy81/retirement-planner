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
  X,
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

// Maximum tool call iterations to prevent infinite loops
// 25 iterations allows complex multi-step queries while preventing runaway loops
const MAX_TOOL_ITERATIONS = 25;

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
  scenarios,
  onCreateScenario,
  onUpdateParams,
  onNavigate,
  settings = {},
  options = {},
  // Panel mode props
  panelMode = false,
  onClose,
  onDragStart,
  isDragging = false,
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

  // Helper to build projection params consistent with useProjections.js
  // This ensures Chat's run_projection, analyze, and stress_test use the same
  // settings (birthYear, customBrackets, taxYear, etc.) as the base case
  const buildProjectionParams = useCallback(
    (overrides = {}) => {
      const getExemptSSForYear = year => {
        const mode = settings.ssExemptionMode || 'disabled';
        if (mode === 'disabled') return false;
        if (mode === 'permanent') return true;
        return year >= 2025 && year <= 2028;
      };

      return {
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
        // Apply overrides LAST so they take precedence
        ...overrides,
      };
    },
    [params, options, settings]
  );

  // Execute tool calls
  const executeToolCall = useCallback(
    async toolCall => {
      const { name, arguments: args } = toolCall;

      switch (name) {
        case 'get_current_state': {
          const include = args.include || ['params', 'summary'];
          const result = {};

          // Basic params
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
              riskAllocation: params.riskAllocation,
              expectedReturn: params.expectedReturn,
            };
          }

          // All params
          if (include.includes('all_params')) {
            result.allParams = { ...params };
          }

          // Summary
          if (include.includes('summary')) {
            result.summary = {
              endingPortfolio: summary.endingPortfolio,
              endingHeirValue: summary.endingHeirValue,
              totalTaxPaid: summary.totalTaxPaid,
              finalRothPercent: summary.finalRothPercent,
              yearsProjected: projections.length,
              startYear: projections[0]?.year,
              endYear: projections[projections.length - 1]?.year,
            };
          }

          // Projections with flexible range
          if (include.includes('projections')) {
            let projs = [...projections];

            // Apply range filter
            if (args.projectionRange === 'first5') {
              projs = projs.slice(0, 5);
            } else if (args.projectionRange === 'last5') {
              projs = projs.slice(-5);
            } else if (args.projectionRange === 'custom' && (args.startYear || args.endYear)) {
              projs = projs.filter(p => {
                if (args.startYear && p.year < args.startYear) return false;
                if (args.endYear && p.year > args.endYear) return false;
                return true;
              });
            }
            // 'all' returns everything

            // Select columns
            const defaultCols = [
              'year',
              'age',
              'totalEOY',
              'heirValue',
              'totalTax',
              'rothConversion',
            ];
            const cols = args.columns || defaultCols;

            result.projections = projs.map(p => {
              const row = {};
              cols.forEach(c => {
                row[c] = p[c];
              });
              return row;
            });
          }

          // IRMAA years detection
          if (include.includes('irmaa_years')) {
            result.irmaaYears = projections
              .filter(p => p.irmaa && p.irmaa > 0)
              .map(p => ({ year: p.year, irmaa: p.irmaa, magi: p.magi || p.agi }));
          }

          // Tax brackets hit
          if (include.includes('tax_brackets')) {
            result.taxBrackets = projections.map(p => ({
              year: p.year,
              marginalRate: p.marginalRate,
              effectiveRate: p.totalTax / (p.agi || 1),
              agi: p.agi,
            }));
          }

          // Scenarios
          if (include.includes('scenarios') && scenarios) {
            result.scenarios = scenarios.map(s => ({
              name: s.name,
              summary: s.summary,
            }));
          }

          return JSON.stringify(result, null, 2);
        }

        case 'run_projection': {
          const overrides = args.overrides || {};
          const testParams = buildProjectionParams(overrides);
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

        case 'compare_scenarios': {
          const { scenarioNames, metrics } = args;

          if (!scenarios || scenarios.length === 0) {
            return 'No scenarios available yet. Use create_scenario to create some scenarios first, then I can compare them.';
          }

          // Include base case in comparison
          const baseCase = {
            name: 'Base Case (Current Plan)',
            summary: {
              endingPortfolio: summary.endingPortfolio,
              endingHeirValue: summary.endingHeirValue,
              totalTaxPaid: summary.totalTaxPaid,
            },
          };

          let toCompare = [baseCase, ...scenarios];

          // Filter by names if specified
          if (scenarioNames && scenarioNames.length > 0) {
            toCompare = toCompare.filter(s =>
              scenarioNames.some(n => s.name.toLowerCase().includes(n.toLowerCase()))
            );
          }

          if (toCompare.length === 0) {
            const available = scenarios.map(s => s.name).join(', ');
            return `No matching scenarios found. Available scenarios: ${available}`;
          }

          // Build comparison
          const metricsToCompare = metrics || [
            'endingPortfolio',
            'endingHeirValue',
            'totalTaxPaid',
          ];

          const comparison = toCompare.map(s => {
            const row = { name: s.name };
            metricsToCompare.forEach(m => {
              row[m] = s.summary?.[m] ?? 'N/A';
            });
            return row;
          });

          // Format as markdown table
          let table = '| Scenario | ' + metricsToCompare.join(' | ') + ' |\n';
          table += '|----------|' + metricsToCompare.map(() => '--------').join('|') + '|\n';
          comparison.forEach(row => {
            table += `| ${row.name} | `;
            table += metricsToCompare
              .map(m => {
                const val = row[m];
                return typeof val === 'number' ? `$${val.toLocaleString()}` : val;
              })
              .join(' | ');
            table += ' |\n';
          });

          return table;
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

        case 'find_optimal': {
          const { parameter, year, metric, direction, minValue, maxValue, constraint } = args;

          // Set search bounds
          let min = minValue ?? 0;
          let max = maxValue ?? (parameter === 'rothConversion' ? params.iraStart : 500000);

          // Binary search for optimal value
          const iterations = 10; // log2(1M) ≈ 20, 10 iterations = ~$1K precision
          let bestValue = min;
          let _bestMetric = null; // Used for tracking during search

          const evaluate = testValue => {
            const overrides = {};

            if (parameter === 'rothConversion') {
              if (year) {
                // Single year
                overrides.rothConversions = { ...params.rothConversions, [year]: testValue };
              } else {
                // Uniform across all years
                const years = {};
                for (let y = params.startYear; y <= params.endYear; y++) {
                  years[y] = testValue;
                }
                overrides.rothConversions = years;
              }
            } else if (parameter === 'expenses') {
              overrides.annualExpenses = testValue;
            }

            const testParams = buildProjectionParams(overrides);
            const proj = generateProjections(testParams);
            const sum = calculateSummary(proj);

            // Check constraint
            if (constraint === 'avoidIrmaa') {
              const hasIrmaa = proj.some(p => p.irmaa > 0);
              if (hasIrmaa) return null; // Violates constraint
            }
            if (constraint === 'stayIn22Bracket' || constraint === 'stayIn24Bracket') {
              const targetRate = constraint === 'stayIn22Bracket' ? 0.22 : 0.24;
              const exceeds = proj.some(p => p.marginalRate > targetRate);
              if (exceeds) return null;
            }

            return sum[
              metric === 'endingHeirValue'
                ? 'endingHeirValue'
                : metric === 'endingPortfolio'
                  ? 'endingPortfolio'
                  : metric === 'totalTaxPaid'
                    ? 'totalTaxPaid'
                    : 'endingHeirValue'
            ];
          };

          // Binary search
          for (let i = 0; i < iterations; i++) {
            const mid = Math.floor((min + max) / 2);
            const midValue = evaluate(mid);
            const midPlusValue = evaluate(mid + 1000);

            if (midValue === null && midPlusValue === null) {
              // Both violate constraint, need to go lower
              max = mid;
            } else if (midValue === null) {
              max = mid;
            } else if (midPlusValue === null) {
              // Found the boundary
              bestValue = mid;
              _bestMetric = midValue;
              break;
            } else {
              const midBetter =
                direction === 'maximize' ? midValue >= midPlusValue : midValue <= midPlusValue;
              if (midBetter) {
                max = mid;
                bestValue = mid;
                _bestMetric = midValue;
              } else {
                min = mid;
                bestValue = mid + 1000;
                _bestMetric = midPlusValue;
              }
            }
          }

          // Final evaluation
          const finalMetric = evaluate(bestValue);

          return JSON.stringify(
            {
              parameter,
              year: year || 'all years',
              optimalValue: bestValue,
              metric,
              direction,
              resultingMetricValue: finalMetric,
              constraint: constraint || 'none',
              searchRange: { min: minValue ?? 0, max: maxValue ?? max },
            },
            null,
            2
          );
        }

        case 'run_risk_scenarios': {
          const defaultScenarios = [
            { name: 'Worst Case (2% real)', returnRate: 0.02 },
            { name: 'Average Case (5% real)', returnRate: 0.05 },
            { name: 'Best Case (8% real)', returnRate: 0.08 },
          ];

          const scenariosToRun = args.scenarios || defaultScenarios;
          const metrics = args.metrics || ['endingPortfolio', 'endingHeirValue', 'totalTaxPaid'];

          const results = scenariosToRun.map(scenario => {
            const testParams = buildProjectionParams({
              expectedReturn: scenario.returnRate,
            });
            const proj = generateProjections(testParams);
            const sum = calculateSummary(proj);

            const result = {
              name: scenario.name,
              returnRate: `${(scenario.returnRate * 100).toFixed(1)}%`,
            };
            metrics.forEach(m => {
              result[m] = sum[m];
            });

            // Add years until depletion if applicable
            const depletionYear = proj.find(p => p.totalEOY <= 0);
            result.runsOutOfMoney = depletionYear ? depletionYear.year : 'Never';

            return result;
          });

          // Format as markdown table
          let table = '| Scenario | Return | ';
          table += metrics.map(m => m.replace(/([A-Z])/g, ' $1').trim()).join(' | ');
          table += ' | Runs Out |\n';

          table += '|----------|--------|';
          table += metrics.map(() => '--------').join('|');
          table += '|----------|\n';

          results.forEach(r => {
            table += `| ${r.name} | ${r.returnRate} | `;
            table += metrics
              .map(m => {
                const val = r[m];
                return typeof val === 'number' ? `$${Math.round(val).toLocaleString()}` : val;
              })
              .join(' | ');
            table += ` | ${r.runsOutOfMoney} |\n`;
          });

          return table;
        }

        case 'explain_calculation': {
          const { year, calculation } = args;

          const yearData = projections.find(p => p.year === year);
          if (!yearData) {
            return `Year ${year} not found. Available: ${projections[0]?.year} - ${projections[projections.length - 1]?.year}`;
          }

          const fmt = n => (typeof n === 'number' ? `$${Math.round(n).toLocaleString()}` : 'N/A');

          const explanations = {
            federal_tax: () => ({
              title: 'Federal Income Tax Calculation',
              year,
              steps: [
                {
                  step: 1,
                  description: 'Calculate Adjusted Gross Income (AGI)',
                  value: fmt(yearData.agi),
                },
                {
                  step: 2,
                  description: 'Subtract Standard Deduction',
                  value: fmt(yearData.standardDeduction || 29200),
                },
                { step: 3, description: 'Taxable Income', value: fmt(yearData.taxableIncome) },
                {
                  step: 4,
                  description: 'Apply Tax Brackets (10%, 12%, 22%, 24%, etc.)',
                  value: 'Progressive',
                },
                { step: 5, description: 'Federal Tax', value: fmt(yearData.federalTax) },
              ],
              marginalBracket: `${((yearData.marginalRate || 0.22) * 100).toFixed(0)}%`,
              effectiveRate: `${((yearData.federalTax / (yearData.agi || 1)) * 100).toFixed(1)}%`,
            }),

            heir_value: () => ({
              title: 'Heir Value Calculation',
              year,
              steps: [
                { step: 1, description: 'IRA Balance', value: fmt(yearData.iraEOY) },
                {
                  step: 2,
                  description: 'Less: Heir Tax on IRA (income tax)',
                  value: `-${fmt(yearData.iraEOY * (params.heirFedRate + params.heirStateRate))}`,
                },
                {
                  step: 3,
                  description: 'Net IRA to Heirs',
                  value: fmt(yearData.iraEOY * (1 - params.heirFedRate - params.heirStateRate)),
                },
                {
                  step: 4,
                  description: 'Plus: Roth Balance (tax-free)',
                  value: `+${fmt(yearData.rothEOY)}`,
                },
                {
                  step: 5,
                  description: 'Plus: After-Tax Balance',
                  value: `+${fmt(yearData.afterTaxEOY)}`,
                },
                {
                  step: 6,
                  description: 'Less: Cap Gains on After-Tax',
                  value: `-${fmt(yearData.afterTaxEOY * 0.15)}`,
                },
                { step: 7, description: 'Total Heir Value', value: fmt(yearData.heirValue) },
              ],
              heirTaxRates: {
                federal: `${(params.heirFedRate * 100).toFixed(0)}%`,
                state: `${(params.heirStateRate * 100).toFixed(0)}%`,
              },
            }),

            rmd: () => ({
              title: 'Required Minimum Distribution',
              year,
              age: yearData.age,
              rmdRequired: yearData.age >= 73,
              steps:
                yearData.age >= 73
                  ? [
                      {
                        step: 1,
                        description: 'Prior Year-End IRA Balance',
                        value: fmt(yearData.iraEOY),
                      },
                      {
                        step: 2,
                        description: 'Life Expectancy Factor',
                        value: yearData.rmdFactor || 'See IRS table',
                      },
                      { step: 3, description: 'RMD = Balance / Factor', value: fmt(yearData.rmd) },
                    ]
                  : [
                      { step: 1, description: 'Age Check', value: `Age ${yearData.age} < 73` },
                      { step: 2, description: 'RMD Required?', value: 'No' },
                    ],
              note: 'RMDs begin at age 73 under SECURE 2.0 Act (was 72, will be 75 for those born 1960+)',
            }),

            irmaa: () => ({
              title: 'IRMAA (Medicare Income-Related Monthly Adjustment)',
              year,
              steps: [
                {
                  step: 1,
                  description: 'MAGI from 2 years prior',
                  value: fmt(yearData.irmaaLookbackMagi || yearData.magi),
                },
                { step: 2, description: 'Compare to IRMAA Thresholds', value: 'See bracket table' },
                {
                  step: 3,
                  description: 'Monthly Part B Surcharge',
                  value: fmt((yearData.irmaa || 0) / 12),
                },
                { step: 4, description: 'Annual IRMAA', value: fmt(yearData.irmaa) },
              ],
              triggered: (yearData.irmaa || 0) > 0,
              note: 'IRMAA looks at income from 2 years prior. High Roth conversions today affect Medicare premiums in 2 years.',
            }),

            social_security_tax: () => ({
              title: 'Social Security Benefit Taxation',
              year,
              steps: [
                { step: 1, description: 'Annual SS Benefit', value: fmt(yearData.socialSecurity) },
                {
                  step: 2,
                  description: 'Calculate Provisional Income',
                  value: 'AGI + 50% of SS + tax-exempt interest',
                },
                {
                  step: 3,
                  description: 'Provisional Income',
                  value: fmt(yearData.provisionalIncome || yearData.agi),
                },
                {
                  step: 4,
                  description: 'Taxable Portion (0%, 50%, or 85%)',
                  value: `${((yearData.ssTaxablePercent || 0.85) * 100).toFixed(0)}%`,
                },
                { step: 5, description: 'Taxable SS Amount', value: fmt(yearData.ssTaxable) },
              ],
              note: 'Up to 85% of SS can be taxable if provisional income exceeds thresholds.',
            }),
          };

          const explainer = explanations[calculation];
          if (!explainer) {
            return `Unknown calculation: ${calculation}. Available: ${Object.keys(explanations).join(', ')}`;
          }

          return JSON.stringify(explainer(), null, 2);
        }

        default:
          return `Unknown tool: ${name}`;
      }
    },
    [params, projections, summary, scenarios, onCreateScenario, onUpdateParams]
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
      let toolIterations = 0;
      while (response.toolCalls && response.toolCalls.length > 0) {
        toolIterations++;

        if (toolIterations > MAX_TOOL_ITERATIONS) {
          console.warn(
            `Tool call limit (${MAX_TOOL_ITERATIONS}) reached. Generating final response.`
          );
          assistantContent +=
            '\n\n*Note: I reached my tool call limit. If you need more analysis, please ask a follow-up question.*';
          break;
        }

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

        // Clear previous streaming content before new streaming phase
        setStreamingContent('');

        // Use streaming for tool result follow-up (enables cancellation + shows progress)
        response = await service.sendMessageStreaming(
          [...allMessages, assistantMessage, toolResultMessage],
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
      <div
        className={`h-10 bg-slate-900/50 border-b border-slate-800 flex items-center px-3 justify-between shrink-0 ${
          panelMode ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : ''
        }`}
        onMouseDown={panelMode ? onDragStart : undefined}
      >
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-purple-400" />
          <span className="text-slate-200 font-medium">AI Assistant</span>
          {panelMode && <span className="text-slate-500 text-[10px]">(drag to reposition)</span>}
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
            onMouseDown={e => e.stopPropagation()}
          >
            <Trash2 className="w-3 h-3" />
            New Chat
          </button>
          {/* Close button - only in panel mode */}
          {panelMode && onClose && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-slate-200"
              title="Close panel (toggle with AI Chat tab)"
              onMouseDown={e => e.stopPropagation()}
            >
              <X className="w-4 h-4" />
            </button>
          )}
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
