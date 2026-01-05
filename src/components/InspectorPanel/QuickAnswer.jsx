/**
 * QuickAnswer - Displays the quick summary/back-of-envelope result
 */

/**
 * QuickAnswer component
 *
 * @param {Object} props
 * @param {Object} props.computed - The computed result from calc.compute()
 * @param {boolean} props.showPV - Whether PV mode is active
 */
export function QuickAnswer({ computed, showPV }) {
  if (!computed) return null;

  return (
    <div className="bg-slate-800 rounded-lg p-4 text-center">
      {/* Show secondary value (PV annotation) if in PV mode */}
      {showPV && computed.simpleSecondary && (
        <div className="text-slate-400 text-sm mb-1">{computed.simpleSecondary}</div>
      )}

      {/* Main value */}
      <div className="text-3xl font-mono text-blue-400">{computed.simple}</div>

      {/* Label */}
      <div className="text-slate-500 text-xs mt-1">
        {showPV ? 'Present Value' : 'Back-of-envelope'}
      </div>
    </div>
  );
}

export default QuickAnswer;
