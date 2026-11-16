import React, { useState } from 'react';
import { Check, Copy, Download, Share2, X } from 'lucide-react';
import { motion } from 'motion/react';
import type { ExhibitorProfile, ExpoBooth } from '../types/eventsphere';

interface ShareModalProps {
  isOpen: boolean;
  booth: ExpoBooth | null;
  exhibitor: ExhibitorProfile | null;
  snapshotDataUrl: string | null;
  onClose: () => void;
  onToast: (msg: string) => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  booth,
  exhibitor,
  snapshotDataUrl,
  onClose,
  onToast,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !booth) return null;

  const shareText = exhibitor
    ? `Visiting ${exhibitor.companyName} at Booth ${booth.number} (${booth.zone}) during EventSphere NextGen Expo 2026.`
    : `Checking out Booth ${booth.number} (${booth.zone} · ${booth.size}) on the live 3D EventSphere floor plan.`;
  const shareUrl = `${window.location.origin}/?booth=${encodeURIComponent(booth.id)}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
      setCopied(true);
      onToast('Discovery link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onToast('Copy not permitted in this browser context');
    }
  };

  const handleDownloadSnapshot = () => {
    if (!snapshotDataUrl) return;
    const a = document.createElement('a');
    a.href = snapshotDataUrl;
    a.download = `eventsphere-booth-${booth.number}.png`;
    a.click();
    onToast(`Downloaded 3D floor snapshot for Booth ${booth.number}`);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `EventSphere · Booth ${booth.number}`,
          text: shareText,
          url: shareUrl,
        });
      } catch {
        // User dismissed native share sheet
      }
    } else {
      await handleCopy();
    }
  };

  return (
    <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="surface-luxe w-full max-w-md rounded-2xl border border-[#10B981]/25 bg-white p-6 text-[#09140E] dark:border-[#10B981]/25 dark:bg-[#040705] dark:text-[#ECFDF5]"
      >
        <div className="flex items-center justify-between border-b border-[#10B981]/18 pb-3 dark:border-[#10B981]/20">
          <div className="flex items-center gap-2">
            <Share2 className="h-4 w-4 text-[#10B981] dark:text-[#34D399]" />
            <h2 className="font-display text-lg font-bold">Share Booth {booth.number}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close share modal"
            className="rounded-lg p-1.5 text-[#466153] hover:bg-[#E8EFEA] dark:text-[#8EAD9E] dark:hover:bg-[#10B981]/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {snapshotDataUrl && (
          <div className="mt-4 overflow-hidden rounded-xl border border-[#10B981]/20 dark:border-[#10B981]/22">
            <img
              src={snapshotDataUrl}
              alt={`3D expo floor snapshot highlighting Booth ${booth.number}`}
              className="h-44 w-full object-cover"
            />
          </div>
        )}

        <p className="mt-4 rounded-xl border border-[#10B981]/18 bg-[#E8EFEA]/80 p-3 text-xs leading-relaxed text-[#466153] dark:border-[#10B981]/20 dark:bg-[#09120D] dark:text-[#C4DFD1]">
          {shareText}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#10B981]/25 bg-white py-2.5 text-xs font-semibold hover:border-[#10B981] dark:border-[#10B981]/22 dark:bg-[#09120D]"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-[#34D399]" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy Invite Link'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadSnapshot}
            disabled={!snapshotDataUrl}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#10B981]/25 bg-white py-2.5 text-xs font-semibold hover:border-[#34D399] disabled:opacity-50 dark:border-[#10B981]/22 dark:bg-[#09120D]"
          >
            <Download className="h-3.5 w-3.5 text-[#34D399]" />
            <span>Save 3D PNG</span>
          </button>
        </div>

        <button
          type="button"
          onClick={handleNativeShare}
          className="btn-luxe mt-2.5 w-full rounded-lg bg-gradient-to-r from-[#059669] to-[#34D399] py-2.5 text-xs font-bold text-[#02120B] shadow-md shadow-[#10B981]/20"
        >
          Post / Share Discovery
        </button>
      </motion.div>
    </div>
  );
};
