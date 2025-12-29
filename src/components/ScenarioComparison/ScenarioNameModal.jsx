/**
 * ScenarioNameModal Component
 *
 * Modal dialog for naming custom scenarios before creation.
 * Features:
 * - Input for scenario name with default name generation
 * - Focus and select input on mount
 * - Enter to submit, Escape to cancel
 * - Confirm and Cancel buttons
 */

import { X } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';

export function ScenarioNameModal({ defaultName, onConfirm, onCancel }) {
  const [name, setName] = useState(defaultName);
  const inputRef = useRef(null);

  // Focus and select input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  const handleSubmit = e => {
    e.preventDefault();
    onConfirm(name.trim() || defaultName);
  };

  const handleKeyDown = e => {
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      onClick={onCancel}
      onKeyDown={handleKeyDown}
    >
      <div
        className="bg-slate-900 rounded-lg border border-slate-700 w-80 p-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-slate-200">Name Your Scenario</h3>
          <button onClick={onCancel} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Scenario name"
            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-200
                       focus:border-blue-500 focus:outline-none mb-4"
            maxLength={40}
          />

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1.5 text-sm text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-500"
            >
              Create Scenario
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ScenarioNameModal;
