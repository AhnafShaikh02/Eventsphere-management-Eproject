import React, { useState } from 'react';
import { Download, WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="inline-flex min-h-[38px] items-center gap-2 rounded-lg border border-[#059669]/40 bg-[#059669]/10 px-3 py-1.5 text-xs font-semibold text-[#047857] transition-colors hover:bg-[#059669]/20 dark:border-[#10B981]/40 dark:bg-[#10B981]/10 dark:text-[#34D399] dark:hover:bg-[#10B981]/20 whitespace-nowrap shrink-0"
      >
        <Download className="h-3.5 w-3.5" aria-hidden="true" />
        <span>Install Offline App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex min-h-[38px] items-center gap-2 rounded-lg border border-[#104E35]/20 bg-[#E4EDE7] px-3 py-1.5 text-xs font-medium text-[#091911] hover:bg-[#D4E3DA] dark:border-[#2A6F52]/40 dark:bg-[#08110C] dark:text-[#DDF2E7] whitespace-nowrap shrink-0"
        >
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Install on iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="surface-luxe w-full max-w-sm rounded-2xl border border-[#104E35]/22 bg-[#F0F5F2] p-6 text-[#091911] shadow-2xl dark:border-[#2A6F52]/40 dark:bg-[#08110C] dark:text-[#DDF2E7]">
              <h3 className="font-display text-lg font-bold">Install EventSphere</h3>
              <p className="mt-2 text-sm text-[#466153] dark:text-[#8EAD9E]">
                1. Tap the <strong>Share</strong> icon in Safari.<br />
                2. Choose <strong>Add to Home Screen</strong> for offline floor plan &amp; schedule access.
              </p>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="btn-luxe mt-4 w-full rounded-lg bg-[#09140E] py-2.5 text-sm font-semibold text-[#ECFDF5] dark:bg-gradient-to-r dark:from-[#10B981] dark:to-[#34D399] dark:text-[#02120B]"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="no-print fixed bottom-4 left-4 z-40 flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/95 px-3 py-1.5 text-xs font-semibold text-slate-950 shadow-lg"
    >
      <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
      <span>Offline Mode — Cached expo floor &amp; 3D hall active</span>
    </div>
  );
};
