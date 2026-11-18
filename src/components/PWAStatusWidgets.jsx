import React, { useState } from 'react';
import { Download, WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton = () => {
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
        className="inline-flex min-h-[38px] items-center gap-2 rounded-lg border border-[var(--es-border)] bg-[#D4AF63]/12 px-3 py-1.5 text-xs font-semibold text-[#8A621C] transition-colors hover:border-[var(--es-border-strong)] hover:bg-[#D4AF63]/22 dark:bg-[#E8C987]/12 dark:text-[#E8C987] dark:hover:bg-[#E8C987]/22 whitespace-nowrap shrink-0"
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
          className="inline-flex min-h-[38px] items-center gap-2 rounded-lg border border-[var(--es-border)] bg-[#E6E7EE] px-3 py-1.5 text-xs font-medium text-[#0B0B0E] hover:border-[var(--es-border-strong)] hover:bg-[#D8DBE6] dark:bg-[#121217] dark:text-[#F2F3F7] whitespace-nowrap shrink-0"
        >
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Install on iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="surface-luxe w-full max-w-sm rounded-2xl border border-[#272732]/22 bg-[#FFFFFF] p-6 text-[#0B0B0E] shadow-2xl dark:border-[#2D2D3A]/40 dark:bg-[#121217] dark:text-[#F2F3F7]">
              <h3 className="font-display text-lg font-bold">Install EventSphere</h3>
              <p className="mt-2 text-sm text-[#525463] dark:text-[#9497A6]">
                1. Tap the <strong>Share</strong> icon in Safari.<br />
                2. Choose <strong>Add to Home Screen</strong> for offline floor plan &amp; schedule access.
              </p>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="btn-luxe mt-4 w-full rounded-lg bg-[#0B0B0E] py-2.5 text-sm font-semibold text-[#F8F9FC] dark:bg-gradient-to-r dark:from-[#B88B3D] dark:to-[#F3DCAA] dark:text-[#0B0B0E]"
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

export const OfflineIndicator = () => {
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
