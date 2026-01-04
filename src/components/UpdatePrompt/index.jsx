import { RefreshCw, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export default function UpdatePrompt() {
  const [showPrompt, setShowPrompt] = useState(false);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, r) {
      // Check for updates every hour
      if (r) {
        setInterval(
          () => {
            r.update();
          },
          60 * 60 * 1000
        );
      }
    },
    onRegisterError(error) {
      console.error('SW registration error:', error);
    },
  });

  useEffect(() => {
    setShowPrompt(needRefresh);
  }, [needRefresh]);

  const handleUpdate = () => {
    updateServiceWorker(true);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setNeedRefresh(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 bg-blue-600 text-white px-4 py-3 rounded-lg shadow-lg">
      <RefreshCw className="w-5 h-5" />
      <span className="text-sm font-medium">New version available!</span>
      <button
        onClick={handleUpdate}
        className="bg-white text-blue-600 px-3 py-1 rounded text-sm font-medium hover:bg-blue-50 transition-colors"
      >
        Refresh
      </button>
      <button
        onClick={handleDismiss}
        className="text-white/80 hover:text-white transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
