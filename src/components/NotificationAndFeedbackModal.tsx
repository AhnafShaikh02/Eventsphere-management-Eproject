import React, { useState } from 'react';
import { Bell, BookOpen, CheckCheck, MessageSquarePlus, X } from 'lucide-react';
import { motion } from 'motion/react';
import type { AppNotification, FeedbackEntry, UserAccount } from '../types/eventsphere';

interface NotificationAndFeedbackModalProps {
  isOpen: boolean;
  notifications: AppNotification[];
  currentUser: UserAccount | null;
  onClose: () => void;
  onMarkAllRead: () => Promise<void>;
  onSubmitFeedback: (payload: {
    userName: string;
    category: FeedbackEntry['category'];
    message: string;
  }) => Promise<boolean>;
}

export const NotificationAndFeedbackModal: React.FC<NotificationAndFeedbackModalProps> = ({
  isOpen,
  notifications,
  currentUser,
  onClose,
  onMarkAllRead,
  onSubmitFeedback,
}) => {
  const [tab, setTab] = useState<'alerts' | 'feedback' | 'guide'>('alerts');
  const [category, setCategory] = useState<FeedbackEntry['category']>('Suggestion');
  const [message, setMessage] = useState('');
  const [userName, setUserName] = useState(currentUser?.name || '');
  const [busy, setBusy] = useState(false);

  React.useEffect(() => {
    if (currentUser?.name) setUserName(currentUser.name);
  }, [currentUser?.name]);

  if (!isOpen) return null;

  const handleSendFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setBusy(true);
    const ok = await onSubmitFeedback({
      userName: userName.trim() || 'Expo Visitor',
      category,
      message: message.trim(),
    });
    setBusy(false);
    if (ok) {
      setMessage('');
      setTab('alerts');
    }
  };

  return (
    <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="surface-luxe w-full max-w-lg rounded-2xl border border-[#10B981]/25 bg-white p-6 text-[#09140E] dark:border-[#10B981]/25 dark:bg-[#040705] dark:text-[#ECFDF5]"
      >
        <div className="flex items-center justify-between border-b border-[#10B981]/18 pb-3 dark:border-[#10B981]/20">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-[#F97362]" />
            <h2 className="font-display text-lg font-bold">Live Alerts, Support &amp; Guide</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close notifications modal"
            className="rounded-lg p-1.5 text-[#466153] hover:bg-[#E8EFEA] dark:text-[#8EAD9E] dark:hover:bg-[#10B981]/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setTab('alerts')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                tab === 'alerts'
                  ? 'bg-gradient-to-r from-[#059669] to-[#34D399] text-[#02120B]'
                  : 'bg-[#E8EFEA] text-[#466153] dark:bg-[#09120D] dark:text-[#8EAD9E]'
              }`}
            >
              Notifications ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setTab('feedback')}
              className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                tab === 'feedback'
                  ? 'bg-gradient-to-r from-[#10B981] to-[#2DD4BF] text-[#02120B]'
                  : 'bg-[#E8EFEA] text-[#466153] dark:bg-[#09120D] dark:text-[#8EAD9E]'
              }`}
            >
              <MessageSquarePlus className="h-3.5 w-3.5" />
              <span>Feedback</span>
            </button>
            <button
              type="button"
              onClick={() => setTab('guide')}
              className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                tab === 'guide'
                  ? 'bg-gradient-to-r from-[#059669] to-[#34D399] text-[#02120B]'
                  : 'bg-[#E8EFEA] text-[#466153] dark:bg-[#09120D] dark:text-[#8EAD9E]'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>User Guide</span>
            </button>
          </div>

          {tab === 'alerts' && currentUser && (
            <button
              type="button"
              onClick={onMarkAllRead}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#059669] hover:underline dark:text-[#34D399]"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              <span>Mark Read</span>
            </button>
          )}
        </div>

        {tab === 'alerts' ? (
          <div className="mt-4 max-h-80 space-y-2.5 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-xs text-[#466153] dark:text-[#8EAD9E]">No active alerts.</p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className="rounded-xl border border-[#10B981]/18 bg-[#E8EFEA]/80 p-3 dark:border-[#10B981]/20 dark:bg-[#09120D]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold">{n.title}</span>
                    <span className="font-mono text-[10px] uppercase text-[#059669] dark:text-[#34D399]">
                      {n.kind}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[#466153] dark:text-[#8EAD9E]">{n.message}</p>
                </div>
              ))
            )}
          </div>
        ) : tab === 'feedback' ? (
          <form onSubmit={handleSendFeedback} className="mt-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium">Your Name</label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Expo Visitor"
                  className="mt-1 w-full rounded-lg border border-[#10B981]/25 bg-white px-3 py-2 text-xs dark:border-[#10B981]/20 dark:bg-[#09120D]"
                />
              </div>
              <div>
                <label className="text-xs font-medium">Topic</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as FeedbackEntry['category'])}
                  className="mt-1 w-full rounded-lg border border-[#10B981]/25 bg-white px-3 py-2 text-xs dark:border-[#10B981]/20 dark:bg-[#09120D]"
                >
                  <option value="Suggestion">Suggestion</option>
                  <option value="Technical Issue">Technical Issue</option>
                  <option value="Booth Inquiry">Booth Inquiry</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium">Message for Organizer Team</label>
              <textarea
                rows={3}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe any hall issue, accessibility need, or exhibitor question..."
                className="mt-1 w-full rounded-lg border border-[#10B981]/25 bg-white px-3 py-2 text-xs dark:border-[#10B981]/20 dark:bg-[#09120D]"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="btn-luxe w-full rounded-lg bg-gradient-to-r from-[#059669] to-[#34D399] py-2.5 text-xs font-bold text-[#02120B] disabled:opacity-50"
            >
              Submit to Organizer Support Queue
            </button>
          </form>
        ) : (
          <div className="mt-4 max-h-80 space-y-3 overflow-y-auto text-xs">
            <div className="rounded-xl border border-[#10B981]/18 bg-[#E8EFEA]/80 p-3 dark:border-[#10B981]/20 dark:bg-[#09120D]">
              <div className="font-display font-bold text-[#059669] dark:text-[#34D399]">
                1. 3D Floor Navigation &amp; Shortcuts
              </div>
              <p className="mt-1 text-[#466153] dark:text-[#8EAD9E]">
                Switch to <strong>3D Floor</strong> to orbit, zoom, filter booth availability, and inspect booths. Press <kbd className="rounded border px-1 font-mono">/</kbd> anywhere to search booths, exhibitors, or sessions, and <kbd className="rounded border px-1 font-mono">Esc</kbd> to close drawers.
              </p>
            </div>
            <div className="rounded-xl border border-[#10B981]/18 bg-[#E8EFEA]/80 p-3 dark:border-[#10B981]/20 dark:bg-[#09120D]">
              <div className="font-display font-bold text-[#059669] dark:text-[#34D399]">
                2. Attendee Workflow
              </div>
              <p className="mt-1 text-[#466153] dark:text-[#8EAD9E]">
                Register for expos, filter exhibitors by sector, send appointment inquiries via live chat or email, bookmark sessions for 15-minute reminders, and save booth notes offline.
              </p>
            </div>
            <div className="rounded-xl border border-[#10B981]/18 bg-[#E8EFEA]/80 p-3 dark:border-[#10B981]/20 dark:bg-[#09120D]">
              <div className="font-display font-bold text-[#059669] dark:text-[#34D399]">
                3. Exhibitor &amp; Organizer Workflows
              </div>
              <p className="mt-1 text-[#466153] dark:text-[#8EAD9E]">
                Exhibitors submit expo applications, customize showcase details/logo colors/contacts, reserve open booths atomically, and message organizers or neighbors. Organizers manage expos, approve applications, reallocate booths, resolve feedback, and export CSV/JSON analytics.
              </p>
            </div>
            <div className="rounded-xl border border-[#10B981]/18 bg-[#E8EFEA]/80 p-3 dark:border-[#10B981]/20 dark:bg-[#09120D]">
              <div className="font-display font-bold text-[#059669] dark:text-[#34D399]">
                4. Security, Privacy &amp; Backups
              </div>
              <p className="mt-1 text-[#466153] dark:text-[#8EAD9E]">
                Passwords use bcrypt hashing, sessions authenticate via signed JWTs, GDPR consent is enforced on registration, and automated daily snapshots + cross-device sync vault protect your data.
              </p>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
