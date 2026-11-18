import React, { useState } from 'react';
import { Bell, BookOpen, CheckCheck, MessageSquarePlus } from 'lucide-react';
import { Badge, Button, Input, Modal, Select, Tabs, Textarea } from './ui';

export const NotificationAndFeedbackModal = ({
  isOpen,
  notifications,
  currentUser,
  onClose,
  onMarkAllRead,
  onSubmitFeedback,
}) => {
  const [tab, setTab] = useState('alerts');
  const [category, setCategory] = useState('Suggestion');
  const [message, setMessage] = useState('');
  const [userName, setUserName] = useState(currentUser?.name || '');
  const [busy, setBusy] = useState(false);

  React.useEffect(() => {
    if (currentUser?.name) setUserName(currentUser.name);
  }, [currentUser?.name]);

  const handleSendFeedback = async (e) => {
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="lg"
      icon={<Bell className="h-4 w-4 text-[#F97362]" />}
      title="Live Alerts, Support & Guide"
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Tabs
            activeId={tab}
            onChange={(id) => setTab(id)}
            items={[
              { id: 'alerts', label: 'Notifications', count: notifications.length },
              {
                id: 'feedback',
                label: 'Feedback',
                icon: <MessageSquarePlus className="h-3.5 w-3.5" />,
              },
              {
                id: 'guide',
                label: 'User Guide',
                icon: <BookOpen className="h-3.5 w-3.5" />,
              },
            ]}
          />

          {tab === 'alerts' && currentUser && (
            <Button
              variant="text"
              leftIcon={<CheckCheck className="h-3.5 w-3.5" />}
              onClick={onMarkAllRead}
            >
              Mark Read
            </Button>
          )}
        </div>

        {tab === 'alerts' ? (
          <div className="max-h-80 space-y-2.5 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-xs text-[#525463] dark:text-[#9497A6]">No active alerts.</p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className="rounded-xl border border-[#272732]/16 bg-[#EAEBF1] p-3 dark:border-[#2D2D3A]/34 dark:bg-[#121217]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold">{n.title}</span>
                    <Badge tone={n.kind === 'schedule' ? 'teal' : 'emerald'}>{n.kind}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-[#525463] dark:text-[#9497A6]">{n.message}</p>
                </div>
              ))
            )}
          </div>
        ) : tab === 'feedback' ? (
          <form onSubmit={handleSendFeedback} className="space-y-3.5">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Your Name"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Expo Visitor"
              />
              <Select
                label="Topic"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                options={[
                  { value: 'Suggestion', label: 'Suggestion' },
                  { value: 'Technical Issue', label: 'Technical Issue' },
                  { value: 'Booth Inquiry', label: 'Booth Inquiry' },
                ]}
              />
            </div>
            <Textarea
              label="Message for Organizer Team"
              rows={3}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe any hall issue, accessibility need, or exhibitor question..."
            />
            <Button type="submit" variant="primary" fullWidth loading={busy}>
              Submit to Organizer Support Queue
            </Button>
          </form>
        ) : (
          <div className="max-h-80 space-y-3 overflow-y-auto text-xs">
            <div className="rounded-xl border border-[#272732]/16 bg-[#EAEBF1] p-3 dark:border-[#2D2D3A]/34 dark:bg-[#121217]">
              <div className="font-display font-bold text-[#8A621C] dark:text-[#E8C987]">
                1. 3D Floor Navigation &amp; Shortcuts
              </div>
              <p className="mt-1 text-[#3E404D] dark:text-[#9497A6]">
                Switch to <strong>3D Floor</strong> to orbit, zoom, filter booth availability, and inspect booths. Press <kbd className="rounded border border-[#272732]/25 px-1 font-mono dark:border-[#2D2D3A]/40">/</kbd> anywhere to search booths, exhibitors, or sessions, and <kbd className="rounded border border-[#272732]/25 px-1 font-mono dark:border-[#2D2D3A]/40">Esc</kbd> to close drawers.
              </p>
            </div>
            <div className="rounded-xl border border-[#272732]/16 bg-[#EAEBF1] p-3 dark:border-[#2D2D3A]/34 dark:bg-[#121217]">
              <div className="font-display font-bold text-[#8A621C] dark:text-[#E8C987]">
                2. Attendee Workflow
              </div>
              <p className="mt-1 text-[#3E404D] dark:text-[#9497A6]">
                Register for expos to generate QR passes, filter exhibitors by sector, bookmark sessions for reminders, and save booth notes offline.
              </p>
            </div>
            <div className="rounded-xl border border-[#272732]/16 bg-[#EAEBF1] p-3 dark:border-[#2D2D3A]/34 dark:bg-[#121217]">
              <div className="font-display font-bold text-[#8A621C] dark:text-[#E8C987]">
                3. Exhibitor &amp; Organizer Workflows
              </div>
              <p className="mt-1 text-[#3E404D] dark:text-[#9497A6]">
                Exhibitors submit expo applications, customize showcase details, reserve open booths atomically, and message organizers. Organizers manage expos, approve exhibitors, configure booths, and export reports.
              </p>
            </div>
            <div className="rounded-xl border border-[#272732]/16 bg-[#EAEBF1] p-3 dark:border-[#2D2D3A]/34 dark:bg-[#121217]">
              <div className="font-display font-bold text-[#8A621C] dark:text-[#E8C987]">
                4. Security, Privacy &amp; Backups
              </div>
              <p className="mt-1 text-[#525463] dark:text-[#9497A6]">
                Passwords use bcrypt hashing, sessions authenticate via signed JWTs, GDPR consent is enforced on registration, and automated backups + cross-device sync protect your workspace.
              </p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
