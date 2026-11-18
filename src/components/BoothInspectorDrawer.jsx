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
import { STATUS_HEX } from '../three/expoModels';
import { Badge, Button, Input, Textarea } from './ui';

export const BoothInspectorDrawer = ({
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
    (booth.status === 'reserved' || booth.status === 'occupied') &&
    currentUser &&
    (currentUser.role === 'admin' ||
      booth.exhibitorId === currentUser.id ||
      (exhibitor && exhibitor.userId === currentUser.id));

  const statusTone =
    booth.status === 'available'
      ? 'emerald'
      : booth.status === 'reserved'
        ? 'coral'
        : booth.status === 'occupied'
          ? 'teal'
          : 'violet';

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

  const handleSend = async (e) => {
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
      className="no-print fixed top-16 right-0 bottom-0 z-40 flex w-full max-w-md flex-col border-l border-[#272732]/20 bg-[#FFFFFF] text-[#0B0B0E] shadow-2xl dark:border-[#2D2D3A]/40 dark:bg-[#0E0E13] dark:text-[#F2F3F7]"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-[#272732]/16 px-5 py-4 dark:border-[#2D2D3A]/32">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-xs"
              style={{ backgroundColor: STATUS_HEX[booth.status] }}
            />
            <Badge tone={statusTone}>{booth.status}</Badge>
            <span className="font-mono text-xs text-[#525463] dark:text-[#9497A6]">
              {booth.zone}
            </span>
          </div>
          <h2 className="mt-1.5 font-display text-2xl font-extrabold tracking-tight">
            Booth {booth.number}
          </h2>
          <p className="font-mono text-xs text-[#8A621C] dark:text-[#E8C987]">
            {booth.size} · ${booth.priceUsd.toLocaleString()} · {booth.trafficCount} visits
          </p>
        </div>

        <Button variant="icon" size="sm" onClick={onClose} aria-label="Close booth inspector">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
        {/* Quick Actions Row */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<MapPin className="h-3.5 w-3.5 text-[#8A621C] dark:text-[#D4AF63]" />}
            onClick={() => onFocus3D(booth.id)}
          >
            Fly Camera Here
          </Button>

          <Button
            variant={isFavorite ? 'secondary' : 'outline'}
            size="sm"
            leftIcon={<Bookmark className="h-3.5 w-3.5" />}
            onClick={() => onToggleFavorite(booth.id)}
          >
            {isFavorite ? 'Bookmarked' : 'Bookmark'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            leftIcon={<Share2 className="h-3.5 w-3.5 text-[#8A621C] dark:text-[#E8C987]" />}
            onClick={() => onShare(booth, exhibitor)}
          >
            Share 3D Card
          </Button>
        </div>

        {/* Reservation CTA */}
        <div className="rounded-xl border border-[#272732]/16 bg-[#EAEBF1] p-4 dark:border-[#2D2D3A]/34 dark:bg-[#121217]">
          {booth.status === 'available' ? (
            <>
              <div className="text-sm font-semibold">Open for Immediate Allocation</div>
              <p className="mt-1 text-xs text-[#525463] dark:text-[#9497A6]">
                Reservations lock atomically on the server and update every connected floor map in real time.
              </p>
              <Button
                variant="primary"
                size="md"
                fullWidth
                loading={busy}
                leftIcon={<CheckCircle2 className="h-4 w-4" />}
                onClick={handleReserve}
                className="mt-3"
              >
                {currentUser ? `Reserve Booth ${booth.number}` : 'Sign In to Reserve Booth'}
              </Button>
            </>
          ) : booth.status === 'reserved' || booth.status === 'occupied' ? (
            <>
              <div className="text-sm font-semibold">
                {booth.status === 'occupied' ? 'Occupied' : 'Reserved'} by{' '}
                {booth.exhibitorName || 'Assigned Exhibitor'}
              </div>
              <p className="mt-1 text-xs text-[#525463] dark:text-[#9497A6]">
                Space locked for live showcase.
              </p>
              {canRelease && (
                <Button
                  variant="destructive"
                  size="sm"
                  fullWidth
                  loading={busy}
                  onClick={handleRelease}
                  className="mt-3"
                >
                  Release Booth Space
                </Button>
              )}
            </>
          ) : (
            <div>
              <div className="text-sm font-semibold text-[#C58B3B]">Pending Organizer Allocation</div>
              <p className="mt-1 text-xs text-[#525463] dark:text-[#9497A6]">
                Reserved for an exhibitor application currently under review.
              </p>
            </div>
          )}
        </div>

        {/* Exhibitor Showcase Details */}
        {exhibitor && (
          <div className="rounded-xl border border-[#272732]/16 bg-[#EAEBF1] p-4 dark:border-[#2D2D3A]/34 dark:bg-[#121217]/90">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-[#8A621C] dark:text-[#E8C987]" />
                <h3 className="font-display text-base font-bold">{exhibitor.companyName}</h3>
              </div>
              <span className="font-mono text-[11px] text-[#525463] dark:text-[#9497A6]">
                {exhibitor.category}
              </span>
            </div>
            <p className="mt-1.5 text-xs font-medium text-[#0B0B0E] dark:text-[#F3DCAA]">
              {exhibitor.tagline}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-[#525463] dark:text-[#9497A6]">
              {exhibitor.description}
            </p>

            {exhibitor.products.length > 0 && (
              <div className="mt-3 text-[11px] font-semibold text-[#525463] dark:text-[#9497A6]">
                Showcased products: {exhibitor.products.join(' · ')}
              </div>
            )}

            {exhibitor.staff.length > 0 && (
              <div className="mt-2 flex items-center gap-2 text-xs text-[#525463] dark:text-[#9497A6]">
                <Users className="h-3.5 w-3.5 shrink-0" />
                <span>On-booth staff: {exhibitor.staff.join(', ')}</span>
              </div>
            )}

            <div className="mt-3 flex items-center justify-between border-t border-[#272732]/14 pt-2.5 text-xs dark:border-[#2D2D3A]/28">
              <span className="font-mono text-[#525463] dark:text-[#9497A6]">
                {exhibitor.profileViews} profile views
              </span>
              {exhibitor.website && (
                <span className="inline-flex items-center gap-1 text-[#8A621C] dark:text-[#E8C987]">
                  <ExternalLink className="h-3 w-3" />
                  <span>{exhibitor.website.replace(/^https?:\/\//, '')}</span>
                </span>
              )}
            </div>
          </div>
        )}

        {/* Personal Field Notes */}
        <div className="rounded-xl border border-[#272732]/16 bg-[#EAEBF1] p-4 dark:border-[#2D2D3A]/34 dark:bg-[#121217]/90">
          <Textarea
            label="Personal Booth Notes (Synced Offline & Cloud)"
            rows={2}
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            placeholder="Record follow-up contacts, power specs, or demo times..."
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSaveNote(booth.id, noteDraft)}
            className="mt-2.5"
          >
            Save Note
          </Button>
        </div>

        {/* Live Direct Messaging */}
        <div className="rounded-xl border border-[#272732]/16 bg-[#EAEBF1] p-4 dark:border-[#2D2D3A]/34 dark:bg-[#121217]/90">
          <div className="text-xs font-semibold text-[#3E404D] dark:text-[#9497A6]">
            Live Message · {channelLabel}
          </div>
          <div className="mt-2 max-h-36 space-y-2 overflow-y-auto">
            {threadMessages.length === 0 ? (
              <p className="text-xs text-[#3E404D] dark:text-[#9497A6]">
                No messages yet. Start a live thread with {channelLabel}.
              </p>
            ) : (
              threadMessages.map((m) => (
                <div
                  key={m.id}
                  className="rounded-lg border border-[#272732]/16 bg-[#FFFFFF] p-2.5 text-xs dark:border-[#2D2D3A]/30 dark:bg-[#0E0E13]"
                >
                  <div className="flex items-center justify-between gap-2 font-semibold">
                    <span>{m.senderName}</span>
                    <span className="font-mono text-[10px] text-[#9497A6]">
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="mt-1 text-[#525463] dark:text-[#D4D6E0]">{m.body}</p>
                </div>
              ))
            )}
          </div>
          <form onSubmit={handleSend} className="mt-2.5 flex items-center gap-2">
            <div className="flex-1">
              <Input
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                placeholder={currentUser ? `Message ${channelLabel}...` : 'Sign in to send message'}
              />
            </div>
            <Button type="submit" variant="primary" size="md" loading={busy} aria-label="Send message">
              <Send className="h-3.5 w-3.5" />
            </Button>
          </form>
        </div>
      </div>
    </motion.aside>
  );
};
