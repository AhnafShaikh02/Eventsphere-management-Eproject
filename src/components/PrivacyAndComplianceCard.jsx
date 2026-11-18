import React, { useState } from 'react';
import { Download, Lock, ShieldCheck, Trash2 } from 'lucide-react';
import { eventSphereApi } from '../services/eventSphereClient';
import { Button, Card, ConfirmDialog } from './ui';

export const PrivacyAndComplianceCard = ({
  currentUser,
  authToken,
  onRefreshState,
  onLogout,
  onToast,
}) => {
  const [analyticsTelemetry, setAnalyticsTelemetry] = useState(
    currentUser.analyticsTelemetry ?? true,
  );
  const [marketingEmails, setMarketingEmails] = useState(
    currentUser.marketingEmails ?? true,
  );
  const [busy, setBusy] = useState(false);
  const [eraseModalOpen, setEraseModalOpen] = useState(false);

  const handleSaveConsent = async (nextAnalytics, nextMarketing) => {
    setAnalyticsTelemetry(nextAnalytics);
    setMarketingEmails(nextMarketing);
    setBusy(true);
    const res = await eventSphereApi.updatePrivacyConsent(authToken, {
      gdprConsent: true,
      analyticsTelemetry: nextAnalytics,
      marketingEmails: nextMarketing,
    });
    setBusy(false);
    if (!res.ok) return onToast(res.error);
    onToast('Privacy consent preferences saved');
    await onRefreshState();
  };

  const handleExportPersonalData = async () => {
    setBusy(true);
    const res = await eventSphereApi.exportPrivacyData(authToken);
    setBusy(false);
    if (!res.ok) return onToast(res.error);

    const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eventsphere-gdpr-data-${currentUser.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onToast('Personal GDPR archive downloaded');
  };

  return (
    <Card padding="lg" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-[#8A621C] dark:text-[#D4AF63]" />
          <h2 className="font-display text-lg font-bold">GDPR Privacy &amp; Data Controls</h2>
        </div>
        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-[#8A621C] dark:text-[#E8C987]">
          <Lock className="h-3.5 w-3.5" />
          AES-256-GCM PII Encryption Active
        </span>
      </div>

      <p className="text-xs leading-relaxed text-[#525463] dark:text-[#9497A6]">
        Manage your data processing consent, download a portable copy of your records (GDPR Article 20), or exercise your right to permanent account erasure.
      </p>

      <div className="space-y-2.5 rounded-xl border border-[var(--es-border)] bg-[#E6E7EE]/70 p-3.5 dark:bg-[#0E0E13]/70">
        <label className="flex cursor-pointer items-center justify-between gap-3 text-xs">
          <div>
            <div className="font-semibold">Expo Engagement Telemetry</div>
            <div className="text-[11px] text-[#525463] dark:text-[#9497A6]">
              Include session bookmark and floor visit metrics in aggregate organizer analytics.
            </div>
          </div>
          <input
            type="checkbox"
            checked={analyticsTelemetry}
            disabled={busy}
            onChange={(e) => handleSaveConsent(e.target.checked, marketingEmails)}
            className="h-4 w-4 accent-[#D4AF63]"
          />
        </label>

        <div className="border-t border-[var(--es-divider)] pt-2.5">
          <label className="flex cursor-pointer items-center justify-between gap-3 text-xs">
            <div>
              <div className="font-semibold">Event Schedule &amp; Pass Notifications</div>
              <div className="text-[11px] text-[#525463] dark:text-[#9497A6]">
                Receive email confirmations, ticket updates, and schedule changes via SMTP.
              </div>
            </div>
            <input
              type="checkbox"
              checked={marketingEmails}
              disabled={busy}
              onChange={(e) => handleSaveConsent(analyticsTelemetry, e.target.checked)}
              className="h-4 w-4 accent-[#D4AF63]"
            />
          </label>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 pt-1">
        <Button
          variant="outline"
          size="sm"
          loading={busy}
          leftIcon={<Download className="h-3.5 w-3.5" />}
          onClick={handleExportPersonalData}
        >
          Export My Data (JSON)
        </Button>
        <Button
          variant="destructive"
          size="sm"
          leftIcon={<Trash2 className="h-3.5 w-3.5" />}
          onClick={() => setEraseModalOpen(true)}
        >
          Delete Account &amp; Erase PII
        </Button>
      </div>

      <ConfirmDialog
        isOpen={eraseModalOpen}
        title="Permanently Delete Account & Personal Data?"
        description="This immediately erases your profile, phone number, bookmarks, and active expo registrations under GDPR Right to Erasure. This cannot be undone."
        confirmLabel="Erase My Data"
        busy={busy}
        onCancel={() => setEraseModalOpen(false)}
        onConfirm={async () => {
          setBusy(true);
          const res = await eventSphereApi.deleteAccount(authToken);
          setBusy(false);
          setEraseModalOpen(false);
          if (!res.ok) return onToast(res.error);
          onToast('Account erased under GDPR');
          onLogout();
        }}
      />
    </Card>
  );
};
