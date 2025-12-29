/**
 * YearSelector - Interactive year range picker
 *
 * Features:
 * - Preset modes (brief, moderate, detailed, all)
 * - Visual timeline with clickable/draggable years (mode A)
 * - Text-based range input (mode C)
 * - Custom year selection with multi-select
 */

import { Calendar, Type } from 'lucide-react';
import { useState, useCallback, useRef, useEffect } from 'react';

// Preset configurations
const PRESETS = {
  brief: { label: 'Brief', description: 'Years 1-2, final' },
  moderate: { label: 'Moderate', description: '1-3, +10, +20, +30' },
  detailed: { label: 'Detailed', description: 'Every 5th year' },
  all: { label: 'All', description: 'All years' },
  custom: { label: 'Custom', description: 'Select years' },
};

// Parse text input like "2026-2030, 2040, 2055"
function parseYearRanges(text, allYears) {
  const years = new Set();
  const parts = text
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  for (const part of parts) {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(s => parseInt(s.trim()));
      if (!isNaN(start) && !isNaN(end)) {
        for (let y = start; y <= end; y++) {
          if (allYears.includes(y)) years.add(y);
        }
      }
    } else {
      const year = parseInt(part);
      if (!isNaN(year) && allYears.includes(year)) {
        years.add(year);
      }
    }
  }

  return [...years].sort((a, b) => a - b);
}

// Format selected years to text
function formatYearRanges(years) {
  if (years.length === 0) return '';

  const sorted = [...years].sort((a, b) => a - b);
  const ranges = [];
  let start = sorted[0];
  let end = sorted[0];

  for (let i = 1; i <= sorted.length; i++) {
    if (i < sorted.length && sorted[i] === end + 1) {
      end = sorted[i];
    } else {
      if (start === end) {
        ranges.push(start.toString());
      } else if (end === start + 1) {
        ranges.push(start.toString(), end.toString());
      } else {
        ranges.push(`${start}-${end}`);
      }
      if (i < sorted.length) {
        start = sorted[i];
        end = sorted[i];
      }
    }
  }

  return ranges.join(', ');
}

export function YearSelector({
  years, // Array of all available years
  selectedYears, // Currently selected years
  onChange, // Callback when selection changes
  mode, // Current mode
  onModeChange, // Callback when mode changes
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [textInput, setTextInput] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const timelineRef = useRef(null);

  // Sync text input with selection
  useEffect(() => {
    if (mode === 'custom' && !isDragging) {
      setTextInput(formatYearRanges(selectedYears));
    }
  }, [selectedYears, mode, isDragging]);

  // Generate years based on mode
  const getYearsForMode = useCallback(
    m => {
      if (!years || years.length === 0) return [];
      if (m === 'all') return years;
      if (m === 'brief') {
        return [years[0], years[1], years[years.length - 1]].filter(Boolean);
      }
      if (m === 'moderate') {
        const result = [years[0], years[1], years[2]];
        const idx10 = years.findIndex(y => y >= years[0] + 10);
        const idx20 = years.findIndex(y => y >= years[0] + 20);
        const idx30 = years.findIndex(y => y >= years[0] + 30);
        if (idx10 >= 0) result.push(years[idx10]);
        if (idx20 >= 0) result.push(years[idx20]);
        if (idx30 >= 0) result.push(years[idx30]);
        if (!result.includes(years[years.length - 1])) {
          result.push(years[years.length - 1]);
        }
        return [...new Set(result)].filter(Boolean);
      }
      if (m === 'detailed') {
        return years.filter((_, i) => i < 5 || i % 5 === 0 || i === years.length - 1);
      }
      return selectedYears;
    },
    [years, selectedYears]
  );

  // Handle mode change
  const handleModeChange = newMode => {
    onModeChange(newMode);
    if (newMode !== 'custom') {
      onChange(getYearsForMode(newMode));
    }
  };

  // Handle year click (toggle in custom mode)
  const handleYearClick = year => {
    if (mode !== 'custom') {
      onModeChange('custom');
      onChange([...selectedYears, year].sort((a, b) => a - b));
    } else {
      const newSelection = selectedYears.includes(year)
        ? selectedYears.filter(y => y !== year)
        : [...selectedYears, year].sort((a, b) => a - b);
      onChange(newSelection);
    }
  };

  // Handle drag to select range
  const handleDragStart = (year, e) => {
    e.preventDefault();
    if (mode !== 'custom') {
      onModeChange('custom');
    }
    setIsDragging(true);
    setDragStart(year);
  };

  const handleDragEnter = year => {
    if (!isDragging || dragStart === null) return;
    const start = Math.min(dragStart, year);
    const end = Math.max(dragStart, year);
    const rangeYears = years.filter(y => y >= start && y <= end);
    onChange([...new Set([...rangeYears])].sort((a, b) => a - b));
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDragStart(null);
  };

  // Handle text input
  const handleTextSubmit = () => {
    const parsed = parseYearRanges(textInput, years);
    if (parsed.length > 0) {
      onModeChange('custom');
      onChange(parsed);
    }
    setShowTextInput(false);
  };

  const handleTextKeyDown = e => {
    if (e.key === 'Enter') {
      handleTextSubmit();
    } else if (e.key === 'Escape') {
      setShowTextInput(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Mode selector */}
      <div className="flex items-center gap-1">
        <Calendar className="w-3 h-3 text-slate-400" />
        <select
          value={mode}
          onChange={e => handleModeChange(e.target.value)}
          className="bg-slate-800 rounded px-1.5 py-0.5 text-xs border border-slate-700"
        >
          {Object.entries(PRESETS).map(([key, { label }]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Visual timeline */}
      <div
        ref={timelineRef}
        className="flex items-center gap-px select-none"
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
      >
        {years.map((year, idx) => {
          const isSelected = selectedYears.includes(year);
          const isFirst = idx === 0;
          const isLast = idx === years.length - 1;
          const isDecade = year % 10 === 0;

          return (
            <div key={year} className="relative group">
              <button
                className={`h-4 transition-all ${
                  isSelected ? 'bg-blue-500 w-2' : 'bg-slate-700 hover:bg-slate-600 w-1.5'
                } ${isFirst || isLast ? 'rounded-sm' : ''}`}
                onMouseDown={e => handleDragStart(year, e)}
                onMouseEnter={() => handleDragEnter(year)}
                onClick={() => !isDragging && handleYearClick(year)}
                title={`${year}${isSelected ? ' (selected)' : ''}`}
              />
              {/* Year label on hover or for key years */}
              {(isFirst || isLast || isDecade) && (
                <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[9px] text-slate-500 whitespace-nowrap">
                  {year}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Text input toggle */}
      <button
        onClick={() => setShowTextInput(!showTextInput)}
        className={`p-1 rounded ${showTextInput ? 'bg-blue-600' : 'bg-slate-700 hover:bg-slate-600'}`}
        title="Enter year ranges as text"
      >
        <Type className="w-3 h-3" />
      </button>

      {/* Text input field */}
      {showTextInput && (
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={textInput}
            onChange={e => setTextInput(e.target.value)}
            onKeyDown={handleTextKeyDown}
            onBlur={handleTextSubmit}
            placeholder="2026-2030, 2040, 2055"
            className="w-40 bg-slate-800 border border-slate-600 rounded px-2 py-0.5 text-xs focus:border-blue-500 focus:outline-none"
            autoFocus
          />
        </div>
      )}

      {/* Year count */}
      <span className="text-slate-500 text-xs">{selectedYears.length} yrs</span>
    </div>
  );
}

export default YearSelector;
