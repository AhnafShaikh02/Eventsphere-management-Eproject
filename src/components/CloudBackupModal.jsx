import React, { useState } from 'react';
import { Cloud, Download, RefreshCw, Upload } from 'lucide-react';
import {
  generateSyncKey,
  pullCloudBackup,
  pushCloudBackup,
} from '../services/eventSphereClient';
import { Button, Input, Modal } from './ui';

export const CloudBackupModal = ({
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

  const handleImportJson = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="md"
      icon={<Cloud className="h-5 w-5" />}
      title="Cross-Device Cloud Sync"
    >
      <div className="space-y-4">
        <p className="text-xs leading-relaxed text-[#525463] dark:text-[#9497A6]">
          Back up your bookmarked booths, field notes, and hall preferences to the EventSphere sync
          vault so you can resume seamlessly on mobile or desktop.
        </p>

        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Input
              label="Sync Key"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value.toUpperCase())}
              className="font-mono uppercase"
            />
          </div>
          <Button variant="outline" size="md" onClick={() => setKeyInput(generateSyncKey())}>
            New Key
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <Button
            variant="primary"
            size="md"
            loading={busy}
            leftIcon={<Upload className="h-3.5 w-3.5" />}
            onClick={handlePush}
          >
            Push to Cloud
          </Button>
          <Button
            variant="secondary"
            size="md"
            loading={busy}
            leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
            onClick={handlePull}
          >
            Pull &amp; Restore
          </Button>
        </div>

        {syncMeta.lastSyncedAt && (
          <div className="rounded-xl border border-[#272732]/16 bg-[#EAEBF1] px-3 py-2 font-mono text-[11px] text-[#3E404D] dark:border-[#2D2D3A]/34 dark:bg-[#121217] dark:text-[#9497A6]">
            Last synced: {new Date(syncMeta.lastSyncedAt).toLocaleString()} · SHA {syncMeta.checksum}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-[#272732]/16 pt-4 text-xs dark:border-[#2D2D3A]/32">
          <Button
            variant="text"
            leftIcon={<Download className="h-3.5 w-3.5" />}
            onClick={handleExportJson}
          >
            Export JSON File
          </Button>

          <label className="cursor-pointer font-semibold text-[#525463] hover:underline dark:text-[#9497A6]">
            Import JSON
            <input type="file" accept=".json,application/json" onChange={handleImportJson} className="hidden" />
          </label>
        </div>
      </div>
    </Modal>
  );
};
