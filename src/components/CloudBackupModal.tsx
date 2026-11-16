import React, { useState } from 'react';
import { Cloud, Download, RefreshCw, Upload, X } from 'lucide-react';
import { motion } from 'motion/react';
import {
  type CloudSyncMeta,
  type LocalWorkspaceState,
  generateSyncKey,
  pullCloudBackup,
  pushCloudBackup,
} from '../services/eventSphereClient';

interface CloudBackupModalProps {
  isOpen: boolean;
  workspace: LocalWorkspaceState;
  syncMeta: CloudSyncMeta;
  onClose: () => void;
  onUpdateSyncMeta: (next: CloudSyncMeta) => void;
  onRestoreWorkspace: (next: LocalWorkspaceState) => void;
  onToast: (msg: string) => void;
}

export const CloudBackupModal: React.FC<CloudBackupModalProps> = ({
  isOpen,
  workspace,
  syncMeta,
  onClose,
  onUpdateSyncMeta,
  onRestoreWorkspace,
  onToast,
}) => {
  const [keyInput, setKeyInput] = useState(syncMeta.syncKey);
  const [busy, setBusy] = useState(false);

  React.useEffect(() => {
    setKeyInput(syncMeta.syncKey);
  }, [syncMeta.syncKey]);

  if (!isOpen) return null;

  const handlePush = async () => {
    setBusy(true);
    const cleanKey = keyInput.toUpperCase().trim();
    const res = await pushCloudBackup(cleanKey, workspace);
    setBusy(false);
    if (!res.ok) {
      onToast(res.error || 'Failed to sync to server');
      return;
    }
    onUpdateSyncMeta({
      syncKey: cleanKey,
      lastSyncedAt: res.updatedAt || new Date().toISOString(),
      pendingSync: false,
      checksum: res.checksum || null,
    });
    onToast(`Cloud backup synced (${res.checksum})`);
  };

  const handlePull = async () => {
    setBusy(true);
    const cleanKey = keyInput.toUpperCase().trim();
    const res = await pullCloudBackup(cleanKey);
    setBusy(false);
    if (!res.ok || !res.payload) {
      onToast(res.error || 'No backup found for that sync key');
      return;
    }
    onRestoreWorkspace(res.payload);
    onUpdateSyncMeta({
      syncKey: cleanKey,
      lastSyncedAt: res.updatedAt || new Date().toISOString(),
      pendingSync: false,
      checksum: res.checksum || null,
    });
    onToast('Restored workspace bookmarks and notes from cloud');
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify({ syncKey: syncMeta.syncKey, workspace }, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eventsphere-backup-${syncMeta.syncKey}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onToast('Exported local backup JSON');
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as { workspace?: LocalWorkspaceState };
        if (parsed.workspace && Array.isArray(parsed.workspace.favoriteBoothIds)) {
          onRestoreWorkspace(parsed.workspace);
          onToast('Imported workspace backup from JSON');
        } else {
          onToast('Invalid EventSphere backup file');
        }
      } catch {
        onToast('Could not parse JSON backup');
      }
    };
    reader.readAsText(file);
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
            <Cloud className="h-5 w-5 text-[#10B981] dark:text-[#34D399]" />
            <h2 className="font-display text-lg font-bold">Cross-Device Cloud Sync</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close cloud backup modal"
            className="rounded-lg p-1.5 text-[#466153] hover:bg-[#E8EFEA] dark:text-[#8EAD9E] dark:hover:bg-[#10B981]/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-[#466153] dark:text-[#8EAD9E]">
          Back up your bookmarked booths, field notes, and hall preferences to the EventSphere sync
          vault so you can resume seamlessly on mobile or desktop.
        </p>

        <div className="mt-4">
          <label className="text-xs font-semibold text-[#466153] dark:text-[#8EAD9E]">
            Sync Key
          </label>
          <div className="mt-1.5 flex gap-2">
            <input
              type="text"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value.toUpperCase())}
              className="flex-1 rounded-lg border border-[#10B981]/25 bg-white px-3 py-2 font-mono text-sm uppercase dark:border-[#10B981]/20 dark:bg-[#09120D]"
            />
            <button
              type="button"
              onClick={() => setKeyInput(generateSyncKey())}
              className="rounded-lg border border-[#10B981]/25 px-3 py-2 text-xs font-semibold hover:border-[#10B981] dark:border-[#10B981]/22"
            >
              New Key
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            disabled={busy}
            onClick={handlePush}
            className="btn-luxe inline-flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-[#059669] to-[#34D399] py-2.5 text-xs font-bold text-[#02120B] disabled:opacity-50"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Push to Cloud</span>
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={handlePull}
            className="btn-luxe inline-flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-[#10B981] to-[#2DD4BF] py-2.5 text-xs font-bold text-[#02120B] disabled:opacity-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Pull &amp; Restore</span>
          </button>
        </div>

        {syncMeta.lastSyncedAt && (
          <div className="mt-3 rounded-lg border border-[#10B981]/18 bg-[#E8EFEA] px-3 py-2 font-mono text-[11px] text-[#466153] dark:border-[#10B981]/20 dark:bg-[#09120D] dark:text-[#8EAD9E]">
            Last synced: {new Date(syncMeta.lastSyncedAt).toLocaleString()} · SHA {syncMeta.checksum}
          </div>
        )}

        <div className="mt-5 flex items-center justify-between border-t border-[#10B981]/18 pt-4 text-xs dark:border-[#10B981]/20">
          <button
            type="button"
            onClick={handleExportJson}
            className="inline-flex items-center gap-1.5 font-semibold text-[#059669] hover:underline dark:text-[#34D399]"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export JSON File</span>
          </button>

          <label className="cursor-pointer font-semibold text-[#466153] hover:underline dark:text-[#8EAD9E]">
            Import JSON
            <input type="file" accept=".json,application/json" onChange={handleImportJson} className="hidden" />
          </label>
        </div>
      </motion.div>
    </div>
  );
};
