/**
 * ToolCallProgress - Animated tool execution visualization
 *
 * Shows what the AI is doing with engaging animations
 */

import { Check, Loader2 } from 'lucide-react';
import { TOOL_UI_CONFIG } from '../../lib/aiService';

function ToolStep({ tool, isActive, isComplete }) {
  const config = TOOL_UI_CONFIG[tool.name] || { icon: '&#128295;', label: tool.name };

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-300
        ${isActive ? 'bg-purple-900/30 border border-purple-700 scale-105' : ''}
        ${isComplete ? 'bg-emerald-900/20 border border-emerald-800' : ''}
        ${!isActive && !isComplete ? 'bg-slate-800/50 opacity-60' : ''}
      `}
      data-testid="tool-step"
    >
      {/* Icon */}
      <span className="text-lg">{config.icon}</span>

      {/* Label */}
      <span
        className={`text-sm flex-1 ${isActive ? 'text-purple-200' : isComplete ? 'text-emerald-200' : 'text-slate-400'}`}
      >
        {config.label}
      </span>

      {/* Status indicator */}
      {isActive && (
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
          <span className="text-xs text-purple-400">Running...</span>
        </div>
      )}
      {isComplete && (
        <div className="flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span className="text-xs text-emerald-400">Done</span>
        </div>
      )}
    </div>
  );
}

export function ToolCallProgress({ toolCalls }) {
  if (!toolCalls || toolCalls.length === 0) return null;

  return (
    <div className="flex gap-3 justify-start" data-testid="tool-progress">
      {/* Avatar */}
      <div className="w-8 h-8 rounded-full bg-purple-600/20 flex items-center justify-center shrink-0">
        <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
      </div>

      {/* Tool steps */}
      <div className="flex-1 max-w-[80%]">
        <div className="text-xs text-slate-400 mb-2">Working on your request...</div>
        <div className="space-y-2">
          {toolCalls.map((tool, idx) => (
            <ToolStep
              key={tool.id || idx}
              tool={tool}
              isActive={tool.status === 'running'}
              isComplete={tool.status === 'complete'}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default ToolCallProgress;
