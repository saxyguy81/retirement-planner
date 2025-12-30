/**
 * MigrationNotice Component
 *
 * Shows a user-friendly message when a profile has been migrated
 * from an older schema version.
 */

import { Info, X } from 'lucide-react';

export function MigrationNotice({ messages, onDismiss }) {
  if (!messages || messages.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 max-w-sm bg-blue-900/90 border border-blue-700 rounded-lg p-4 shadow-lg z-50">
      <div className="flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="text-blue-200 font-medium mb-1">Profile Updated</div>
          <div className="text-blue-300 text-sm mb-2">
            Your saved profile was from an older version. The following updates were applied:
          </div>
          <ul className="text-blue-300 text-xs space-y-1 mb-3">
            {messages.map((msg, i) => (
              <li key={i}>• {msg}</li>
            ))}
          </ul>
          <button
            onClick={onDismiss}
            className="px-3 py-1 bg-blue-700 text-white text-xs rounded hover:bg-blue-600"
          >
            Got it
          </button>
        </div>
        <button onClick={onDismiss} className="text-blue-400 hover:text-blue-300">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default MigrationNotice;
