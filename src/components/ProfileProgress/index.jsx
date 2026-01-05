/**
 * ProfileProgress Component
 *
 * Shows profile completeness as a progress bar with hints.
 * Uses endowed progress (starts at 20%) for psychological momentum.
 * Hides at 100% to avoid nagging complete users.
 */

import { calculateCompleteness } from '../../lib/profileCompleteness';

export function ProfileProgress({ params, settings }) {
  const { percentage, remaining } = calculateCompleteness(params, settings);

  // Hide when complete - don't nag users who have finished
  if (percentage >= 100) return null;

  return (
    <div className="px-2 py-1.5 border-b border-slate-800 bg-slate-900/50">
      <div className="flex items-center justify-between mb-1">
        <span className="text-slate-400 text-xs">Plan completeness</span>
        <span className="text-blue-400 text-xs font-medium">{percentage}%</span>
      </div>
      <div
        className="h-1 bg-slate-700 rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin="0"
        aria-valuemax="100"
        aria-label={`Plan ${percentage}% complete`}
      >
        <div
          className="h-full bg-blue-500 transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
      {remaining.length > 0 && (
        <div className="mt-1 text-slate-500 text-[10px]">
          Optional: Add {remaining[0].label} for more accuracy
        </div>
      )}
    </div>
  );
}

export default ProfileProgress;
