/**
 * ThinkingIndicator - Animated loading state for AI responses
 *
 * Features:
 * - Animated brain/thinking icon
 * - Rotating status messages
 * - Smooth transitions
 * - Elapsed time display
 */

import { Brain, Sparkles, Lightbulb, Calculator, Search } from 'lucide-react';
import { useState, useEffect } from 'react';

const THINKING_MESSAGES = [
  { text: 'Analyzing your question...', icon: Brain },
  { text: 'Crunching the numbers...', icon: Calculator },
  { text: 'Searching for insights...', icon: Search },
  { text: 'Formulating response...', icon: Lightbulb },
  { text: 'Almost there...', icon: Sparkles },
];

const MESSAGE_ROTATE_INTERVAL = 3000; // 3 seconds

export function ThinkingIndicator({ startTime }) {
  const [messageIndex, setMessageIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  // Rotate messages
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % THINKING_MESSAGES.length);
    }, MESSAGE_ROTATE_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  // Track elapsed time
  useEffect(() => {
    if (!startTime) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const currentMessage = THINKING_MESSAGES[messageIndex];
  const Icon = currentMessage.icon;

  return (
    <div className="flex gap-3 justify-start" data-testid="thinking-indicator">
      {/* Animated avatar */}
      <div className="w-8 h-8 rounded-full bg-purple-600/20 flex items-center justify-center shrink-0 relative">
        <div className="absolute inset-0 rounded-full bg-purple-500/20 animate-ping" />
        <Brain className="w-4 h-4 text-purple-400 animate-pulse" />
      </div>

      {/* Message bubble */}
      <div className="bg-slate-800 rounded-lg px-4 py-3 max-w-[80%]">
        {/* Animated dots */}
        <div className="flex items-center gap-2 mb-2">
          <div className="flex gap-1">
            <span
              className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
              style={{ animationDelay: '0ms' }}
            />
            <span
              className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
              style={{ animationDelay: '150ms' }}
            />
            <span
              className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
              style={{ animationDelay: '300ms' }}
            />
          </div>
        </div>

        {/* Rotating message with icon */}
        <div className="flex items-center gap-2 text-slate-300 text-sm transition-all duration-300">
          <Icon className="w-4 h-4 text-purple-400 shrink-0" />
          <span className="animate-fade-in">{currentMessage.text}</span>
        </div>

        {/* Elapsed time (show after 5 seconds) */}
        {elapsed >= 5 && <div className="text-xs text-slate-500 mt-2">{elapsed}s elapsed</div>}
      </div>
    </div>
  );
}

export default ThinkingIndicator;
