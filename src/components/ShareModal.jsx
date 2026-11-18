import React, { useState } from 'react';
import { Check, Copy, Download, Share2 } from 'lucide-react';
import { Button, Modal } from './ui';

export const ShareModal = ({
  isOpen,
  booth,
  exhibitor,
  snapshotDataUrl,
  onClose,
  onToast,
}) => {
  const [copied, setCopied] = useState(false);

  if (!booth) return null;

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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="md"
      icon={<Share2 className="h-4 w-4" />}
      title={`Share Booth ${booth.number}`}
    >
      <div className="space-y-4">
        {snapshotDataUrl && (
          <div className="overflow-hidden rounded-xl border border-[#272732]/18 dark:border-[#2D2D3A]/38">
            <img
              src={snapshotDataUrl}
              alt={`3D expo floor snapshot highlighting Booth ${booth.number}`}
              className="h-44 w-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        )}

        <p className="rounded-xl border border-[#272732]/16 bg-[#EAEBF1] p-3 text-xs leading-relaxed text-[#3E404D] dark:border-[#2D2D3A]/34 dark:bg-[#121217] dark:text-[#D4D6E0]">
          {shareText}
        </p>

        <div className="grid grid-cols-2 gap-2.5">
          <Button
            variant="outline"
            size="md"
            leftIcon={
              copied ? <Check className="h-3.5 w-3.5 text-[#8A621C] dark:text-[#E8C987]" /> : <Copy className="h-3.5 w-3.5" />
            }
            onClick={handleCopy}
          >
            {copied ? 'Copied!' : 'Copy Invite Link'}
          </Button>

          <Button
            variant="outline"
            size="md"
            disabled={!snapshotDataUrl}
            leftIcon={<Download className="h-3.5 w-3.5 text-[#8A621C] dark:text-[#E8C987]" />}
            onClick={handleDownloadSnapshot}
          >
            Save 3D PNG
          </Button>
        </div>

        <Button variant="primary" size="md" fullWidth onClick={handleNativeShare}>
          Post / Share Discovery
        </Button>
      </div>
    </Modal>
  );
};
