/**
 * TaxBracketEditor Component
 *
 * Allows editing of federal tax brackets and capital gains brackets.
 * Supports both Single and Married Filing Jointly (MFJ) thresholds.
 */

import React, { useState, useMemo } from 'react';
import { Plus, Trash2, RotateCcw, AlertCircle } from 'lucide-react';
import {
  FEDERAL_BRACKETS_MFJ_2024,
  FEDERAL_BRACKETS_SINGLE_2024,
  LTCG_BRACKETS_MFJ_2024,
  LTCG_BRACKETS_SINGLE_2024,
} from '../../lib/taxTables';

// Build default brackets structure from separate single/MFJ arrays
function buildDefaultBrackets() {
  // Combine federal brackets
  const federal = FEDERAL_BRACKETS_MFJ_2024.map((mfjBracket, i) => ({
    rate: mfjBracket.rate,
    singleThreshold: FEDERAL_BRACKETS_SINGLE_2024[i]?.threshold ?? 0,
    mfjThreshold: mfjBracket.threshold,
  }));

  // Combine capital gains brackets
  const capitalGains = LTCG_BRACKETS_MFJ_2024.map((mfjBracket, i) => ({
    rate: mfjBracket.rate,
    singleThreshold: LTCG_BRACKETS_SINGLE_2024[i]?.threshold ?? 0,
    mfjThreshold: mfjBracket.threshold,
  }));

  return { federal, capitalGains };
}

const DEFAULT_BRACKETS = buildDefaultBrackets();

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

// Parse currency string to number
function parseCurrency(str) {
  const num = parseInt(str.replace(/[^0-9-]/g, ''), 10);
  return isNaN(num) ? 0 : num;
}

// Parse percentage string to decimal
function parseRate(str) {
  const num = parseFloat(str.replace(/[^0-9.]/g, ''));
  return isNaN(num) ? 0 : num / 100;
}

export function TaxBracketEditor({ brackets, onUpdate, taxYear }) {
  const [activeTab, setActiveTab] = useState('federal');
  const [editingCell, setEditingCell] = useState(null);

  // Use provided brackets or fall back to defaults
  const currentBrackets = useMemo(() => {
    if (!brackets || (!brackets.federal && !brackets.capitalGains)) {
      return DEFAULT_BRACKETS;
    }
    return {
      federal: brackets.federal || DEFAULT_BRACKETS.federal,
      capitalGains: brackets.capitalGains || DEFAULT_BRACKETS.capitalGains,
    };
  }, [brackets]);

  const activeBrackets = currentBrackets[activeTab] || [];

  // Check if current brackets differ from defaults
  const hasCustomizations = useMemo(() => {
    if (!brackets) return false;
    const currentStr = JSON.stringify(currentBrackets);
    const defaultStr = JSON.stringify(DEFAULT_BRACKETS);
    return currentStr !== defaultStr;
  }, [brackets, currentBrackets]);

  // Update a specific bracket field
  const updateBracket = (index, field, value) => {
    const newBrackets = [...activeBrackets];
    newBrackets[index] = { ...newBrackets[index], [field]: value };

    // Sort by rate to maintain order
    newBrackets.sort((a, b) => a.rate - b.rate);

    onUpdate({
      ...currentBrackets,
      [activeTab]: newBrackets,
    });
  };

  // Add a new bracket
  const addBracket = () => {
    const lastBracket = activeBrackets[activeBrackets.length - 1];
    const newRate = lastBracket ? Math.min(lastBracket.rate + 0.05, 0.99) : 0.10;
    const newSingleThreshold = lastBracket ? lastBracket.singleThreshold + 50000 : 0;
    const newMfjThreshold = lastBracket ? lastBracket.mfjThreshold + 100000 : 0;

    const newBrackets = [
      ...activeBrackets,
      {
        rate: newRate,
        singleThreshold: newSingleThreshold,
        mfjThreshold: newMfjThreshold,
      },
    ];

    onUpdate({
      ...currentBrackets,
      [activeTab]: newBrackets,
    });
  };

  // Remove a bracket
  const removeBracket = (index) => {
    if (activeBrackets.length <= 1) return; // Keep at least one bracket

    const newBrackets = activeBrackets.filter((_, i) => i !== index);
    onUpdate({
      ...currentBrackets,
      [activeTab]: newBrackets,
    });
  };

  // Reset to defaults
  const resetToDefaults = () => {
    onUpdate(null); // Pass null to clear custom brackets
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
    if (field === 'rate') {
      value = parseRate(rawValue);
    } else {
      value = parseCurrency(rawValue);
    }
    updateBracket(rowIndex, field, value);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  return (
    <div className="space-y-3">
      {/* Tab selector */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('federal')}
          className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
            activeTab === 'federal'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          Federal Income
        </button>
        <button
          onClick={() => setActiveTab('capitalGains')}
          className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
            activeTab === 'capitalGains'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          Capital Gains
        </button>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-2 p-2 bg-slate-800 rounded border border-slate-700">
        <AlertCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <div className="text-slate-400 text-xs">
          {activeTab === 'federal'
            ? `Federal ordinary income tax brackets (${taxYear} base). Thresholds are inflated annually by bracket inflation rate.`
            : `Long-term capital gains brackets (${taxYear} base). 0% rate applies up to the first threshold.`}
        </div>
      </div>

      {/* Bracket table */}
      <div className="border border-slate-700 rounded overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-800 border-b border-slate-700">
              <th className="px-2 py-2 text-left text-slate-400 font-medium">Rate %</th>
              <th className="px-2 py-2 text-left text-slate-400 font-medium">Single Min $</th>
              <th className="px-2 py-2 text-left text-slate-400 font-medium">MFJ Min $</th>
              <th className="px-2 py-2 text-center text-slate-400 font-medium w-10"></th>
            </tr>
          </thead>
          <tbody>
            {activeBrackets.map((bracket, index) => (
              <tr
                key={index}
                className="border-b border-slate-700 last:border-b-0 hover:bg-slate-800/50"
              >
                {/* Rate */}
                <td className="px-2 py-1.5">
                  {editingCell?.rowIndex === index && editingCell?.field === 'rate' ? (
                    <input
                      type="text"
                      defaultValue={(bracket.rate * 100).toFixed(0)}
                      onBlur={handleCellBlur}
                      onChange={(e) => handleCellChange(index, 'rate', e.target.value)}
                      onKeyDown={handleKeyDown}
                      autoFocus
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
                    />
                  ) : (
                    <span
                      onClick={() => handleCellClick(index, 'rate')}
                      className="cursor-pointer text-slate-200 hover:text-blue-400 px-2 py-1 block"
                    >
                      {(bracket.rate * 100).toFixed(0)}%
                    </span>
                  )}
                </td>

                {/* Single Threshold */}
                <td className="px-2 py-1.5">
                  {editingCell?.rowIndex === index && editingCell?.field === 'singleThreshold' ? (
                    <input
                      type="text"
                      defaultValue={bracket.singleThreshold}
                      onBlur={handleCellBlur}
                      onChange={(e) => handleCellChange(index, 'singleThreshold', e.target.value)}
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
                      onChange={(e) => handleCellChange(index, 'mfjThreshold', e.target.value)}
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

                {/* Delete button */}
                <td className="px-2 py-1.5 text-center">
                  <button
                    onClick={() => removeBracket(index)}
                    disabled={activeBrackets.length <= 1}
                    className={`p-1 rounded transition-colors ${
                      activeBrackets.length <= 1
                        ? 'text-slate-600 cursor-not-allowed'
                        : 'text-slate-400 hover:text-red-400 hover:bg-slate-700'
                    }`}
                    title={activeBrackets.length <= 1 ? 'Cannot delete last bracket' : 'Delete bracket'}
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
          Using custom brackets. Reset to restore {taxYear} defaults.
        </div>
      )}
    </div>
  );
}

export default TaxBracketEditor;
