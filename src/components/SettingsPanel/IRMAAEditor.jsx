/**
 * IRMAAEditor Component
 *
 * Allows editing of IRMAA (Income-Related Monthly Adjustment Amount) brackets.
 * Supports both Single and Married Filing Jointly (MFJ) thresholds.
 * Includes Part B premium and Part D surcharge editing.
 */

import { Plus, Trash2, RotateCcw, AlertCircle } from 'lucide-react';
import { useState, useMemo } from 'react';

import { IRMAA_BRACKETS_MFJ_2024, IRMAA_BRACKETS_SINGLE_2024 } from '../../lib/taxTables';

// Build default IRMAA brackets structure from separate single/MFJ arrays
function buildDefaultIRMAA() {
  // Combine MFJ and Single brackets (they have same number of tiers)
  const brackets = IRMAA_BRACKETS_MFJ_2024.map((mfjBracket, i) => ({
    singleThreshold: IRMAA_BRACKETS_SINGLE_2024[i]?.threshold ?? 0,
    mfjThreshold: mfjBracket.threshold,
    partB: mfjBracket.partB,
    partD: mfjBracket.partD,
  }));

  return brackets;
}

const DEFAULT_IRMAA = buildDefaultIRMAA();

// Format number as currency
function formatCurrency(value) {
  if (value === 0) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// Format number as decimal currency (for monthly premiums)
function formatPremium(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

// Parse currency string to number
function parseCurrency(str) {
  const num = parseInt(str.replace(/[^0-9-]/g, ''), 10);
  return isNaN(num) ? 0 : num;
}

// Parse premium string to decimal
function parsePremium(str) {
  const num = parseFloat(str.replace(/[^0-9.]/g, ''));
  return isNaN(num) ? 0 : num;
}

export function IRMAAEditor({ brackets, onUpdate, taxYear }) {
  const [editingCell, setEditingCell] = useState(null);

  // Use provided brackets or fall back to defaults
  const currentBrackets = useMemo(() => {
    if (!brackets || !Array.isArray(brackets) || brackets.length === 0) {
      return DEFAULT_IRMAA;
    }
    return brackets;
  }, [brackets]);

  // Check if current brackets differ from defaults
  const hasCustomizations = useMemo(() => {
    if (!brackets) return false;
    const currentStr = JSON.stringify(currentBrackets);
    const defaultStr = JSON.stringify(DEFAULT_IRMAA);
    return currentStr !== defaultStr;
  }, [brackets, currentBrackets]);

  // Update a specific bracket field
  const updateBracket = (index, field, value) => {
    const newBrackets = [...currentBrackets];
    newBrackets[index] = { ...newBrackets[index], [field]: value };

    // Sort by MFJ threshold to maintain order
    newBrackets.sort((a, b) => a.mfjThreshold - b.mfjThreshold);

    onUpdate(newBrackets);
  };

  // Add a new bracket
  const addBracket = () => {
    const lastBracket = currentBrackets[currentBrackets.length - 1];
    const newSingleThreshold = lastBracket ? lastBracket.singleThreshold + 100000 : 0;
    const newMfjThreshold = lastBracket ? lastBracket.mfjThreshold + 200000 : 0;
    const newPartB = lastBracket ? lastBracket.partB + 50 : 174.7;
    const newPartD = lastBracket ? lastBracket.partD + 10 : 0;

    const newBrackets = [
      ...currentBrackets,
      {
        singleThreshold: newSingleThreshold,
        mfjThreshold: newMfjThreshold,
        partB: newPartB,
        partD: newPartD,
      },
    ];

    onUpdate(newBrackets);
  };

  // Remove a bracket
  const removeBracket = index => {
    if (currentBrackets.length <= 1) return; // Keep at least one bracket

    const newBrackets = currentBrackets.filter((_, i) => i !== index);
    onUpdate(newBrackets);
  };

  // Reset to defaults
  const resetToDefaults = () => {
    onUpdate(null); // Pass null to clear custom IRMAA
  };

  // Handle cell editing
  const handleCellClick = (rowIndex, field) => {
    setEditingCell({ rowIndex, field });
  };

  const handleCellBlur = () => {
    setEditingCell(null);
  };

  const handleCellChange = (rowIndex, field, rawValue) => {
    let value;
    if (field === 'partB' || field === 'partD') {
      value = parsePremium(rawValue);
    } else {
      value = parseCurrency(rawValue);
    }
    updateBracket(rowIndex, field, value);
  };

  const handleKeyDown = e => {
    if (e.key === 'Enter' || e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  return (
    <div className="space-y-3">
      {/* Info banner */}
      <div className="flex items-start gap-2 p-2 bg-slate-800 rounded border border-slate-700">
        <AlertCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <div className="text-slate-400 text-xs">
          IRMAA brackets ({taxYear} base). Part B/D amounts are monthly. IRMAA uses MAGI from 2
          years prior.
        </div>
      </div>

      {/* Bracket table */}
      <div className="border border-slate-700 rounded overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-800 border-b border-slate-700">
              <th className="px-2 py-2 text-left text-slate-400 font-medium">Single MAGI</th>
              <th className="px-2 py-2 text-left text-slate-400 font-medium">MFJ MAGI</th>
              <th className="px-2 py-2 text-left text-slate-400 font-medium">Part B/mo</th>
              <th className="px-2 py-2 text-left text-slate-400 font-medium">Part D/mo</th>
              <th className="px-2 py-2 text-center text-slate-400 font-medium w-10"></th>
            </tr>
          </thead>
          <tbody>
            {currentBrackets.map((bracket, index) => (
              <tr
                key={index}
                className="border-b border-slate-700 last:border-b-0 hover:bg-slate-800/50"
              >
                {/* Single Threshold */}
                <td className="px-2 py-1.5">
                  {editingCell?.rowIndex === index && editingCell?.field === 'singleThreshold' ? (
                    <input
                      type="text"
                      defaultValue={bracket.singleThreshold}
                      onBlur={handleCellBlur}
                      onChange={e => handleCellChange(index, 'singleThreshold', e.target.value)}
                      onKeyDown={handleKeyDown}
                      autoFocus
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
                    />
                  ) : (
                    <span
                      onClick={() => handleCellClick(index, 'singleThreshold')}
                      className="cursor-pointer text-slate-200 hover:text-blue-400 px-2 py-1 block"
                    >
                      {formatCurrency(bracket.singleThreshold)}
                    </span>
                  )}
                </td>

                {/* MFJ Threshold */}
                <td className="px-2 py-1.5">
                  {editingCell?.rowIndex === index && editingCell?.field === 'mfjThreshold' ? (
                    <input
                      type="text"
                      defaultValue={bracket.mfjThreshold}
                      onBlur={handleCellBlur}
                      onChange={e => handleCellChange(index, 'mfjThreshold', e.target.value)}
                      onKeyDown={handleKeyDown}
                      autoFocus
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
                    />
                  ) : (
                    <span
                      onClick={() => handleCellClick(index, 'mfjThreshold')}
                      className="cursor-pointer text-slate-200 hover:text-blue-400 px-2 py-1 block"
                    >
                      {formatCurrency(bracket.mfjThreshold)}
                    </span>
                  )}
                </td>

                {/* Part B Premium */}
                <td className="px-2 py-1.5">
                  {editingCell?.rowIndex === index && editingCell?.field === 'partB' ? (
                    <input
                      type="text"
                      defaultValue={bracket.partB}
                      onBlur={handleCellBlur}
                      onChange={e => handleCellChange(index, 'partB', e.target.value)}
                      onKeyDown={handleKeyDown}
                      autoFocus
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
                    />
                  ) : (
                    <span
                      onClick={() => handleCellClick(index, 'partB')}
                      className="cursor-pointer text-slate-200 hover:text-blue-400 px-2 py-1 block"
                    >
                      {formatPremium(bracket.partB)}
                    </span>
                  )}
                </td>

                {/* Part D Surcharge */}
                <td className="px-2 py-1.5">
                  {editingCell?.rowIndex === index && editingCell?.field === 'partD' ? (
                    <input
                      type="text"
                      defaultValue={bracket.partD}
                      onBlur={handleCellBlur}
                      onChange={e => handleCellChange(index, 'partD', e.target.value)}
                      onKeyDown={handleKeyDown}
                      autoFocus
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
                    />
                  ) : (
                    <span
                      onClick={() => handleCellClick(index, 'partD')}
                      className="cursor-pointer text-slate-200 hover:text-blue-400 px-2 py-1 block"
                    >
                      {formatPremium(bracket.partD)}
                    </span>
                  )}
                </td>

                {/* Delete button */}
                <td className="px-2 py-1.5 text-center">
                  <button
                    onClick={() => removeBracket(index)}
                    disabled={currentBrackets.length <= 1}
                    className={`p-1 rounded transition-colors ${
                      currentBrackets.length <= 1
                        ? 'text-slate-600 cursor-not-allowed'
                        : 'text-slate-400 hover:text-red-400 hover:bg-slate-700'
                    }`}
                    title={
                      currentBrackets.length <= 1 ? 'Cannot delete last bracket' : 'Delete bracket'
                    }
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 justify-between">
        <button
          onClick={addBracket}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 text-slate-300 rounded text-xs hover:bg-slate-600 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Bracket
        </button>

        {hasCustomizations && (
          <button
            onClick={resetToDefaults}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600/20 text-amber-400 border border-amber-600/40 rounded text-xs hover:bg-amber-600/30 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset to Defaults
          </button>
        )}
      </div>

      {/* Customization indicator */}
      {hasCustomizations && (
        <div className="text-xs text-amber-400 flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5" />
          Using custom IRMAA brackets. Reset to restore {taxYear} defaults.
        </div>
      )}

      {/* Annual cost summary */}
      <div className="p-2 bg-slate-800 rounded border border-slate-700 text-xs text-slate-400">
        <div className="font-medium text-slate-300 mb-1">
          Annual Cost at Each Tier (per person):
        </div>
        {currentBrackets.map((bracket, index) => {
          const annualPartB = bracket.partB * 12;
          const annualPartD = bracket.partD * 12;
          const total = annualPartB + annualPartD;
          return (
            <div key={index} className="flex justify-between py-0.5">
              <span>{index === 0 ? 'Base' : `>${formatCurrency(bracket.mfjThreshold)} MFJ`}:</span>
              <span className="text-slate-200">
                {formatCurrency(total)}/yr ({formatPremium(bracket.partB)} B +{' '}
                {formatPremium(bracket.partD)} D)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default IRMAAEditor;
