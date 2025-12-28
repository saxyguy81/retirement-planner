/**
 * SplitPanel Component
 *
 * Allows viewing two analyses side-by-side with a draggable divider.
 * Features:
 * - Horizontal split with resizable panels
 * - Panel selectors for choosing which view to display
 * - Collapse/expand individual panels
 * - Remembers panel sizes
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GripVertical, Maximize2, Minimize2, X } from 'lucide-react';

const MIN_PANEL_WIDTH = 200; // Minimum width in pixels

export function SplitPanel({
  children,
  views,
  defaultLeftView = 'projections',
  defaultRightView = 'charts',
  onViewChange
}) {
  const [leftView, setLeftView] = useState(defaultLeftView);
  const [rightView, setRightView] = useState(defaultRightView);
  const [splitPosition, setSplitPosition] = useState(50); // Percentage
  const [isDragging, setIsDragging] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const containerRef = useRef(null);

  // Handle drag start
  const handleDragStart = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  // Handle drag
  const handleDrag = useCallback((e) => {
    if (!isDragging || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = (x / rect.width) * 100;

    // Clamp between min widths
    const minPercentage = (MIN_PANEL_WIDTH / rect.width) * 100;
    const maxPercentage = 100 - minPercentage;
    setSplitPosition(Math.max(minPercentage, Math.min(maxPercentage, percentage)));
  }, [isDragging]);

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add mouse event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleDrag);
      document.addEventListener('mouseup', handleDragEnd);
      return () => {
        document.removeEventListener('mousemove', handleDrag);
        document.removeEventListener('mouseup', handleDragEnd);
      };
    }
  }, [isDragging, handleDrag, handleDragEnd]);

  // Notify parent of view changes
  useEffect(() => {
    if (onViewChange) {
      onViewChange({ left: leftView, right: rightView });
    }
  }, [leftView, rightView, onViewChange]);

  // Toggle right panel collapse
  const toggleRightPanel = () => {
    setRightCollapsed(!rightCollapsed);
  };

  // Get the view component for a panel
  const getViewComponent = (viewId) => {
    const view = views.find(v => v.id === viewId);
    return view ? view.component : null;
  };

  // View selector dropdown
  const ViewSelector = ({ value, onChange, exclude }) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-slate-800 text-xs rounded px-2 py-1 border border-slate-700 focus:border-blue-500 focus:outline-none"
    >
      {views.map(view => (
        <option
          key={view.id}
          value={view.id}
          disabled={view.id === exclude}
        >
          {view.label}
        </option>
      ))}
    </select>
  );

  return (
    <div
      ref={containerRef}
      className="flex-1 flex overflow-hidden"
      style={{ cursor: isDragging ? 'col-resize' : 'auto' }}
    >
      {/* Left Panel */}
      <div
        className="flex flex-col overflow-hidden bg-slate-950"
        style={{
          width: rightCollapsed ? '100%' : `${splitPosition}%`,
          transition: isDragging ? 'none' : 'width 0.2s ease'
        }}
      >
        {/* Left panel header */}
        <div className="h-8 bg-slate-900 border-b border-slate-700 flex items-center justify-between px-2 shrink-0">
          <ViewSelector
            value={leftView}
            onChange={setLeftView}
            exclude={rightView}
          />
          {rightCollapsed && (
            <button
              onClick={toggleRightPanel}
              className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-slate-200"
              title="Show right panel"
            >
              <Maximize2 className="w-3 h-3" />
            </button>
          )}
        </div>
        {/* Left panel content */}
        <div className="flex-1 overflow-hidden">
          {getViewComponent(leftView)}
        </div>
      </div>

      {/* Resize handle */}
      {!rightCollapsed && (
        <div
          className={`w-1 bg-slate-700 hover:bg-blue-500 cursor-col-resize flex items-center justify-center group shrink-0 ${
            isDragging ? 'bg-blue-500' : ''
          }`}
          onMouseDown={handleDragStart}
        >
          <GripVertical className="w-3 h-3 text-slate-500 group-hover:text-white" />
        </div>
      )}

      {/* Right Panel */}
      {!rightCollapsed && (
        <div
          className="flex flex-col overflow-hidden bg-slate-950"
          style={{
            width: `${100 - splitPosition}%`,
            transition: isDragging ? 'none' : 'width 0.2s ease'
          }}
        >
          {/* Right panel header */}
          <div className="h-8 bg-slate-900 border-b border-slate-700 flex items-center justify-between px-2 shrink-0">
            <ViewSelector
              value={rightView}
              onChange={setRightView}
              exclude={leftView}
            />
            <button
              onClick={toggleRightPanel}
              className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-slate-200"
              title="Collapse right panel"
            >
              <Minimize2 className="w-3 h-3" />
            </button>
          </div>
          {/* Right panel content */}
          <div className="flex-1 overflow-hidden">
            {getViewComponent(rightView)}
          </div>
        </div>
      )}
    </div>
  );
}

export default SplitPanel;
