import React, { useState } from 'react';
import {
  Bookmark,
  Building2,
  CheckCircle2,
  ExternalLink,
  MapPin,
  Send,
  Share2,
  Users,
  X,
} from 'lucide-react';
import { motion } from 'motion/react';
import type { ChatMessage, ExhibitorProfile, ExpoBooth, UserAccount } from '../types/eventsphere';
import { STATUS_HEX } from '../three/expoModels';

interface BoothInspectorDrawerProps {
  booth: ExpoBooth | null;
  exhibitor: ExhibitorProfile | null;
  currentUser: UserAccount | null;
  isFavorite: boolean;
  personalNote: string;
  messages: ChatMessage[];
  onClose: () => void;
  onFocus3D: (boothId: string) => void;
  onReserveBooth: (boothId: string) => Promise<void>;
  onReleaseBooth: (boothId: string) => Promise<void>;
  onToggleFavorite: (boothId: string) => void;
  onSaveNote: (boothId: string, note: string) => void;
  onSendMessage: (channel: string, label: string, body: string) => Promise<boolean>;
  onShare: (booth: ExpoBooth, exhibitor: ExhibitorProfile | null) => void;
  onRequireAuth: () => void;
}

export const BoothInspectorDrawer: React.FC<BoothInspectorDrawerProps> = ({
  booth,
  exhibitor,
  currentUser,
  isFavorite,
  personalNote,
  messages,
  onClose,
  onFocus3D,
  onReserveBooth,
  onReleaseBooth,
  onToggleFavorite,
  onSaveNote,
  onSendMessage,
  onShare,
  onRequireAuth,
}) => {
  const [noteDraft, setNoteDraft] = useState(personalNote);
  const [chatText, setChatText] = useState('');
  const [busy, setBusy] = useState(false);

  React.useEffect(() => {
    setNoteDraft(personalNote);
  }, [booth?.id, personalNote]);

  if (!booth) return null;

  const channelId = exhibitor ? exhibitor.id : 'organizer';
  const channelLabel = exhibitor ? exhibitor.companyName : 'Organizer Desk';
  const threadMessages = messages.filter((m) => m.recipientChannel === channelId).slice(-6);

  const canRelease =
    booth.status === 'reserved' &&
    currentUser &&
    (currentUser.role === 'admin' ||
      booth.exhibitorId === currentUser.id ||
      (exhibitor && exhibitor.userId === currentUser.id));

  const handleReserve = async () => {
    if (!currentUser) {
      onRequireAuth();
      return;
    }
    setBusy(true);
    await onReserveBooth(booth.id);
    setBusy(false);
  };

  const handleRelease = async () => {
    setBusy(true);
    await onReleaseBooth(booth.id);
    setBusy(false);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onRequireAuth();
      return;
    }
    if (!chatText.trim()) return;
    setBusy(true);
    const ok = await onSendMessage(channelId, channelLabel, chatText.trim());
    if (ok) setChatText('');
    setBusy(false);
  };

  return (
    <motion.aside
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      aria-label={`Booth ${booth.number} inspector`}
      className="no-print fixed top-16 right-0 bottom-0 z-40 flex w-full max-w-md flex-col border-l border-slate-200 bg-white text-[#09140E] shadow-2xl dark:border-[#10B981]/22 dark:bg-[#040705] dark:text-[#ECFDF5]"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-[#10B981]/16">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-xs"
              style={{ backgroundColor: STATUS_HEX[booth.status] }}
            />
            <span className="font-mono text-xs font-semibold capitalize text-[#466153] dark:text-[#8EAD9E]">
              {booth.status} · {booth.zone}
            </span>
          </div>
          <h2 className="mt-1 font-display text-2xl font-extrabold tracking-tight">
            Booth {booth.number}
          </h2>
          <p className="font-mono text-xs text-[#059669] dark:text-[#34D399]">
            {booth.size} · ${booth.priceUsd.toLocaleString()} · {booth.trafficCount} visits
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close booth inspector"
          className="rounded-lg border border-slate-200 p-2 text-[#466153] hover:bg-[#F4F7F5] hover:text-[#09140E] dark:border-[#10B981]/20 dark:text-[#8EAD9E] dark:hover:bg-[#10B981]/10 dark:hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
        {/* Quick Actions Row */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onFocus3D(booth.id)}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-300 bg-[#F4F7F5] px-3 py-1.5 text-xs font-semibold text-[#09140E] hover:border-[#10B981] dark:border-[#10B981]/20 dark:bg-[#09120D] dark:text-[#ECFDF5]"
          >
            <MapPin className="h-3.5 w-3.5 text-[#10B981]" />
            <span>Fly Camera Here</span>
          </button>

          <button
            type="button"
            onClick={() => onToggleFavorite(booth.id)}
            className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold ${
              isFavorite
                ? 'border-[#34D399] bg-[#34D399]/14 text-emerald-900 dark:text-[#34D399]'
                : 'border-slate-300 bg-[#F4F7F5] text-[#09140E] dark:border-[#10B981]/20 dark:bg-[#09120D] dark:text-[#ECFDF5]'
            }`}
          >
            <Bookmark className="h-3.5 w-3.5" />
            <span>{isFavorite ? 'Bookmarked' : 'Bookmark'}</span>
          </button>

          <button
            type="button"
            onClick={() => onShare(booth, exhibitor)}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-300 bg-[#F4F7F5] px-3 py-1.5 text-xs font-semibold text-[#09140E] hover:border-[#34D399] dark:border-[#10B981]/20 dark:bg-[#09120D] dark:text-[#ECFDF5]"
          >
            <Share2 className="h-3.5 w-3.5 text-[#34D399]" />
            <span>Share 3D Card</span>
          </button>
        </div>

        {/* Reservation CTA */}
        <div className="rounded-xl border border-slate-200 bg-[#F4F7F5] p-4 dark:border-[#10B981]/18 dark:bg-[#09120D]">
          {booth.status === 'available' ? (
            <>
              <div className="text-sm font-semibold">Open for Immediate Allocation</div>
              <p className="mt-1 text-xs text-[#466153] dark:text-[#8EAD9E]">
                Reservations lock atomically on the server and update every connected floor map in real time.
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={handleReserve}
                className="btn-luxe mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#059669] to-[#34D399] py-2.5 text-xs font-bold text-[#02120B] disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>{currentUser ? `Reserve Booth ${booth.number}` : 'Sign In to Reserve Booth'}</span>
              </button>
            </>
          ) : booth.status === 'reserved' ? (
            <>
              <div className="text-sm font-semibold">
                Reserved by {booth.exhibitorName || 'Assigned Exhibitor'}
              </div>
              <p className="mt-1 text-xs text-[#466153] dark:text-[#8EAD9E]">
                Space locked for live showcase.
              </p>
              {canRelease && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleRelease}
                  className="mt-3 w-full rounded-lg border border-[#F97362]/60 bg-[#F97362]/14 py-2 text-xs font-bold text-[#F97362] hover:bg-[#F97362]/24"
                >
                  Release Booth Space
                </button>
              )}
            </>
          ) : (
            <div>
              <div className="text-sm font-semibold text-[#A78BFA]">Pending Organizer Allocation</div>
              <p className="mt-1 text-xs text-[#466153] dark:text-[#8EAD9E]">
                Reserved for an exhibitor application currently under review.
              </p>
            </div>
          )}
        </div>

        {/* Exhibitor Showcase Details */}
        {exhibitor && (
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-[#10B981]/18 dark:bg-[#09120D]/80">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-[#34D399]" />
                <h3 className="font-display text-base font-bold">{exhibitor.companyName}</h3>
              </div>
              <span className="font-mono text-[11px] text-[#466153] dark:text-[#8EAD9E]">
                {exhibitor.category}
              </span>
            </div>
            <p className="mt-1.5 text-xs font-medium text-[#09140E] dark:text-[#D1FAE5]">
              {exhibitor.tagline}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-[#466153] dark:text-[#8EAD9E]">
              {exhibitor.description}
            </p>

            {exhibitor.products.length > 0 && (
              <div className="mt-3">
                <div className="text-[11px] font-semibold text-[#466153] dark:text-[#8EAD9E]">
                  Showcased products: {exhibitor.products.join(' · ')}
                </div>
              </div>
            )}

            {exhibitor.staff.length > 0 && (
              <div className="mt-2 flex items-center gap-2 text-xs text-[#466153] dark:text-[#8EAD9E]">
                <Users className="h-3.5 w-3.5 shrink-0" />
                <span>On-booth staff: {exhibitor.staff.join(', ')}</span>
              </div>
            )}

            <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-2.5 text-xs dark:border-[#10B981]/15">
              <span className="font-mono text-[#466153] dark:text-[#8EAD9E]">
                {exhibitor.profileViews} profile views
              </span>
              {exhibitor.website && (
                <span className="inline-flex items-center gap-1 text-[#059669] dark:text-[#34D399]">
                  <ExternalLink className="h-3 w-3" />
                  <span>{exhibitor.website.replace(/^https?:\/\//, '')}</span>
                </span>
              )}
            </div>
          </div>
        )}

        {/* Personal Field Notes */}
        <div className="rounded-xl border border-slate-200 bg-[#F4F7F5] p-4 dark:border-[#10B981]/18 dark:bg-[#09120D]/80">
          <label className="block text-xs font-semibold text-[#466153] dark:text-[#8EAD9E]">
            Personal Booth Notes (Synced Offline &amp; Cloud)
          </label>
          <textarea
            rows={2}
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            placeholder="Record follow-up contacts, power specs, or demo times..."
            className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-[#09140E] focus:border-[#10B981] focus:outline-none dark:border-[#10B981]/20 dark:bg-[#040705] dark:text-[#ECFDF5]"
          />
          <button
            type="button"
            onClick={() => onSaveNote(booth.id, noteDraft)}
            className="mt-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold hover:border-[#34D399] dark:border-[#10B981]/20 dark:bg-[#040705]"
          >
            Save Note
          </button>
        </div>

        {/* Live Direct Messaging */}
        <div className="rounded-xl border border-slate-200 bg-[#F4F7F5] p-4 dark:border-[#10B981]/18 dark:bg-[#09120D]/80">
          <div className="text-xs font-semibold text-[#466153] dark:text-[#8EAD9E]">
            Live Message · {channelLabel}
          </div>
          <div className="mt-2 max-h-36 space-y-2 overflow-y-auto">
            {threadMessages.length === 0 ? (
              <p className="text-xs text-[#466153] dark:text-[#8EAD9E]">
                No messages yet. Start a live thread with {channelLabel}.
              </p>
            ) : (
              threadMessages.map((m) => (
                <div
                  key={m.id}
                  className="rounded-lg border border-slate-200 bg-white p-2.5 text-xs dark:border-[#10B981]/15 dark:bg-[#040705]"
                >
                  <div className="flex items-center justify-between gap-2 font-semibold">
                    <span>{m.senderName}</span>
                    <span className="font-mono text-[10px] text-[#8EAD9E]">
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="mt-1 text-[#466153] dark:text-[#C5DFD0]">{m.body}</p>
                </div>
              ))
            )}
          </div>
          <form onSubmit={handleSend} className="mt-2.5 flex gap-2">
            <input
              type="text"
              value={chatText}
              onChange={(e) => setChatText(e.target.value)}
              placeholder={currentUser ? `Message ${channelLabel}...` : 'Sign in to send message'}
              className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-[#09140E] focus:border-[#10B981] focus:outline-none dark:border-[#10B981]/20 dark:bg-[#040705] dark:text-[#ECFDF5]"
            />
            <button
              type="submit"
              disabled={busy}
              className="btn-luxe inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-[#059669] to-[#34D399] px-3 py-2 text-xs font-bold text-[#02120B] disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </div>
    </motion.aside>
  );
};
