import React, { useMemo, useState } from 'react';
import {
  Bell,
  Bookmark,
  Building2,
  Calendar,
  CalendarClock,
  CheckCircle2,
  Compass,
  LayoutDashboard,
  MessageSquarePlus,
  Printer,
  QrCode,
  Settings,
  Ticket,
} from 'lucide-react';
import { STATUS_HEX } from '../../three/expoModels';
import { eventSphereApi } from '../../services/eventSphereClient';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  SearchInput,
  Select,
  StatCard,
  Textarea,
} from '../ui';
import { PrivacyAndComplianceCard } from '../PrivacyAndComplianceCard';
import { DashboardLayout } from './DashboardLayout';

const TicketQRMatrix = ({ code }) => {
  const cells = useMemo(() => {
    let seed = 0;
    for (let i = 0; i < code.length; i++) seed = (seed * 31 + code.charCodeAt(i)) % 9973;
    const grid = [];
    for (let i = 0; i < 49; i++) {
      const r = Math.floor(i / 7);
      const c = i % 7;
      const isCorner = (r < 2 && c < 2) || (r < 2 && c > 4) || (r > 4 && c < 2);
      grid.push(isCorner || ((seed + i * 17) % 3 !== 0));
    }
    return grid;
  }, [code]);

  return (
    <div className="grid h-20 w-20 grid-cols-7 gap-0.5 rounded-lg border border-[#272732]/20 bg-[#EAEBF1] p-1.5 shadow-inner dark:border-[#2D2D3A]/38">
      {cells.map((filled, idx) => (
        <span
          key={idx}
          className={filled ? 'rounded-[1px] bg-[#0B0B0E]' : 'bg-transparent'}
        />
      ))}
    </div>
  );
};

export const AttendeePortal = ({
  snapshot,
  currentUser,
  authToken,
  unreadNotifications,
  favoriteBoothIds,
  notes,
  onRefreshState,
  onOpen3DFloor,
  onInspectBoothOnFloor,
  onOpenNotifications,
  onOpenProfileModal,
  onLogout,
  onToast,
}) => {
  const [section, setSection] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [sectorFilter, setSectorFilter] = useState('All');
  const [busy, setBusy] = useState(false);
  const [cancelExpoId, setCancelExpoId] = useState(null);

  const [feedbackCat, setFeedbackCat] = useState('Suggestion');
  const [feedbackMsg, setFeedbackMsg] = useState('');

  const registeredExpos = useMemo(
    () => snapshot.expos.filter((e) => e.registeredUserIds.includes(currentUser.id)),
    [snapshot.expos, currentUser.id],
  );

  const myTickets = useMemo(
    () =>
      snapshot.registrations.filter(
        (r) => r.userId === currentUser.id && r.status === 'confirmed',
      ),
    [snapshot.registrations, currentUser.id],
  );

  const bookmarkedSessions = useMemo(
    () => snapshot.sessions.filter((s) => s.bookmarkedUserIds.includes(currentUser.id)),
    [snapshot.sessions, currentUser.id],
  );

  const savedBooths = useMemo(
    () => snapshot.booths.filter((b) => favoriteBoothIds.includes(b.id)),
    [snapshot.booths, favoriteBoothIds],
  );

  const navItems = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="h-4 w-4" /> },
    { id: 'events', label: 'Explore Events', icon: <Calendar className="h-4 w-4" /> },
    { id: 'registrations', label: 'My Registrations', icon: <CheckCircle2 className="h-4 w-4" />, badgeCount: registeredExpos.length },
    { id: 'tickets', label: 'Digital Tickets', icon: <Ticket className="h-4 w-4" />, badgeCount: myTickets.length },
    { id: 'exhibitors', label: 'Exhibitors', icon: <Building2 className="h-4 w-4" /> },
    { id: 'floor-plans', label: 'Floor Plans', icon: <Compass className="h-4 w-4" /> },
    { id: 'schedule', label: 'Schedule', icon: <CalendarClock className="h-4 w-4" /> },
    { id: 'bookmarks', label: 'Bookmarks & Notes', icon: <Bookmark className="h-4 w-4" />, badgeCount: bookmarkedSessions.length + savedBooths.length },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="h-4 w-4" />, badgeCount: unreadNotifications },
    { id: 'feedback', label: 'Feedback & Support', icon: <MessageSquarePlus className="h-4 w-4" /> },
    { id: 'settings', label: 'Profile Settings', icon: <Settings className="h-4 w-4" /> },
  ];

  const handleRegisterExpo = async (expoId) => {
    setBusy(true);
    const res = await eventSphereApi.registerForExpo(authToken, expoId);
    setBusy(false);
    if (!res.ok) return onToast(res.error);
    onToast(`Ticket confirmed: ${res.data.registration.ticketCode}`);
    await onRefreshState();
  };

  return (
    <DashboardLayout
      roleTitle="Attendee Hub"
      roleAccent="#2DD4BF"
      currentUser={currentUser}
      navItems={navItems}
      activeSection={section}
      unreadNotifications={unreadNotifications}
      onSelectSection={(id) => {
        setSection(id);
        setSearchQuery('');
      }}
      onOpen3DFloor={onOpen3DFloor}
      onOpenNotifications={onOpenNotifications}
      onLogout={onLogout}
    >
      {section === 'overview' && (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Registered Expos"
              value={registeredExpos.length}
              sublabel={`${snapshot.expos.length} live & upcoming`}
              icon={<Calendar className="h-5 w-5" />}
              tone="emerald"
            />
            <StatCard
              label="Digital Passes"
              value={myTickets.length}
              sublabel="Ready for QR entry"
              icon={<Ticket className="h-5 w-5" />}
              tone="teal"
            />
            <StatCard
              label="Bookmarked Sessions"
              value={bookmarkedSessions.length}
              sublabel="15-min reminders active"
              icon={<CalendarClock className="h-5 w-5" />}
              tone="violet"
            />
            <StatCard
              label="Saved Floor Booths"
              value={savedBooths.length}
              sublabel="Synced offline & cloud"
              icon={<Bookmark className="h-5 w-5" />}
              tone="coral"
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card padding="md">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-base font-bold">Your Upcoming Agenda</h2>
                <Button variant="text" onClick={() => setSection('schedule')}>
                  Full Schedule
                </Button>
              </div>
              <div className="mt-3 space-y-2.5">
                {snapshot.sessions.slice(0, 3).map((s) => {
                  const saved = s.bookmarkedUserIds.includes(currentUser.id);
                  return (
                    <div
                      key={s.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-[#272732]/18 bg-[#E6E7EE] p-3 text-xs dark:border-[#2D2D3A]/34 dark:bg-[#0E0E13]"
                    >
                      <div className="min-w-0">
                        <div className="font-mono text-[11px] font-semibold text-[#8A621C] dark:text-[#E8C987]">
                          {s.startTime}–{s.endTime} · {s.location}
                        </div>
                        <div className="truncate font-bold">{s.title}</div>
                      </div>
                      <Button
                        size="sm"
                        variant={saved ? 'secondary' : 'outline'}
                        onClick={async () => {
                          await eventSphereApi.toggleSessionBookmark(authToken, s.id);
                          await onRefreshState();
                        }}
                      >
                        {saved ? 'Saved' : 'Save'}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card padding="md">
              <h2 className="font-display text-base font-bold">Explore Campus</h2>
              <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                <Button variant="primary" onClick={onOpen3DFloor}>
                  Walk 3D Expo Hall
                </Button>
                <Button variant="secondary" onClick={() => setSection('tickets')}>
                  View Digital Passes ({myTickets.length})
                </Button>
                <Button variant="outline" onClick={() => setSection('exhibitors')}>
                  Browse {snapshot.exhibitors.length} Exhibitors
                </Button>
                <Button variant="outline" onClick={() => setSection('feedback')}>
                  Contact Organizer Desk
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {section === 'events' && (
        <div className="space-y-4">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search expos by title, city, or theme..."
            className="w-full sm:w-80"
          />
          <div className="grid gap-4 md:grid-cols-2">
            {snapshot.expos
              .filter((e) =>
                !searchQuery
                  ? true
                  : `${e.title} ${e.location} ${e.theme}`.toLowerCase().includes(searchQuery.toLowerCase()),
              )
              .map((expo) => {
                const registered = expo.registeredUserIds.includes(currentUser.id);
                return (
                  <Card key={expo.id} padding="md" className="flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <Badge tone={expo.status === 'live' ? 'emerald' : 'teal'}>{expo.status}</Badge>
                        <span className="font-mono text-xs text-[#525463] dark:text-[#9497A6]">
                          {expo.date}
                        </span>
                      </div>
                      <h3 className="mt-2 font-display text-lg font-bold">{expo.title}</h3>
                      <p className="mt-1 text-xs text-[#525463] dark:text-[#9497A6]">
                        {expo.location} · {expo.registeredUserIds.length} attendees registered
                      </p>
                      <p className="mt-2 text-xs leading-relaxed text-[#525463] dark:text-[#9497A6]">
                        {expo.description}
                      </p>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2 border-t border-[#272732]/16 pt-3 dark:border-[#2D2D3A]/30">
                      {registered ? (
                        <>
                          <Button size="sm" variant="secondary" onClick={() => setSection('tickets')}>
                            View Pass
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setCancelExpoId(expo.id)}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="primary"
                          loading={busy}
                          onClick={() => handleRegisterExpo(expo.id)}
                        >
                          Claim Free Pass
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={onOpen3DFloor}>
                        3D Floor
                      </Button>
                    </div>
                  </Card>
                );
              })}
          </div>
        </div>
      )}

      {section === 'registrations' && (
        <div className="space-y-3">
          {registeredExpos.length === 0 ? (
            <EmptyState
              icon={<Calendar className="h-5 w-5" />}
              title="No active expo registrations"
              description="Register for an upcoming expo to unlock your digital pass."
              action={
                <Button variant="primary" onClick={() => setSection('events')}>
                  Explore Expos
                </Button>
              }
            />
          ) : (
            registeredExpos.map((expo) => (
              <Card key={expo.id} padding="md">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-display text-base font-bold">{expo.title}</h3>
                    <p className="text-xs text-[#525463] dark:text-[#9497A6]">
                      {expo.date} → {expo.endDate} · {expo.location}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="primary" onClick={() => setSection('tickets')}>
                      Open QR Pass
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setCancelExpoId(expo.id)}
                    >
                      Cancel Registration
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {section === 'tickets' && (
        <div className="space-y-4">
          {myTickets.length === 0 ? (
            <EmptyState
              icon={<QrCode className="h-5 w-5" />}
              title="No digital passes generated yet"
              description="Claim a pass on any expo to generate your QR entry badge."
              action={
                <Button variant="primary" onClick={() => setSection('events')}>
                  Browse Events
                </Button>
              }
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {myTickets.map((ticket) => {
                const expo = snapshot.expos.find((e) => e.id === ticket.expoId);
                return (
                  <Card key={ticket.id} padding="lg" className="relative overflow-hidden">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1.5">
                        <Badge tone="emerald">Confirmed Pass</Badge>
                        <h3 className="font-display text-lg font-bold">
                          {expo?.title || 'EventSphere Expo'}
                        </h3>
                        <p className="text-xs text-[#525463] dark:text-[#9497A6]">
                          {expo?.location} · {expo?.date}
                        </p>
                        <div className="pt-2 font-mono text-xs">
                          <div className="text-[#525463] dark:text-[#9497A6]">Pass Holder</div>
                          <div className="font-bold">{ticket.userName}</div>
                        </div>
                        <div className="font-mono text-sm font-extrabold text-[#8A621C] dark:text-[#E8C987]">
                          {ticket.ticketCode}
                        </div>
                      </div>
                      <TicketQRMatrix code={ticket.ticketCode} />
                    </div>
                    <div className="mt-4 flex justify-end border-t border-[#272732]/16 pt-3 dark:border-[#2D2D3A]/30">
                      <Button
                        size="sm"
                        variant="outline"
                        leftIcon={<Printer className="h-3.5 w-3.5" />}
                        onClick={() => window.print()}
                      >
                        Print Badge
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {section === 'exhibitors' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search exhibitors or products..."
              className="w-full sm:w-72"
            />
            <div className="flex flex-wrap gap-1.5">
              {['All', 'Robotics & AI', 'Clean Energy', 'Cloud & Security', 'Spatial Computing', 'Biotech & MedTech'].map(
                (cat) => (
                  <Button
                    key={cat}
                    size="sm"
                    variant={sectorFilter === cat ? 'primary' : 'outline'}
                    onClick={() => setSectorFilter(cat)}
                  >
                    {cat}
                  </Button>
                ),
              )}
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {snapshot.exhibitors
              .filter((ex) => {
                if (sectorFilter !== 'All' && ex.category !== sectorFilter) return false;
                if (
                  searchQuery &&
                  !`${ex.companyName} ${ex.tagline} ${ex.products.join(' ')}`
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase())
                ) {
                  return false;
                }
                return true;
              })
              .map((ex) => {
                const booth = snapshot.booths.find((b) => b.exhibitorId === ex.id);
                return (
                  <Card key={ex.id} padding="md" className="flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="font-display text-base font-bold">{ex.companyName}</h3>
                        <Badge tone="teal">{ex.category}</Badge>
                      </div>
                      <p className="mt-1 text-xs font-medium text-[#8A621C] dark:text-[#E8C987]">
                        {ex.tagline}
                      </p>
                      <p className="mt-2 text-xs text-[#525463] dark:text-[#9497A6]">{ex.description}</p>
                      <div className="mt-2 font-mono text-[11px] text-[#525463] dark:text-[#9497A6]">
                        Products: {ex.products.join(' · ') || 'Showcasing live'}
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-[#272732]/16 pt-3 dark:border-[#2D2D3A]/30">
                      <span className="font-mono text-xs">
                        {booth ? `Booth ${booth.number}` : 'Virtual Partner'}
                      </span>
                      {booth && (
                        <Button size="sm" variant="primary" onClick={() => onInspectBoothOnFloor(booth.id)}>
                          Inspect &amp; Chat
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
          </div>
        </div>
      )}

      {section === 'floor-plans' && (
        <Card padding="lg">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold">Interactive Floor Plan Directory</h2>
              <p className="text-xs text-[#525463] dark:text-[#9497A6]">
                Select any booth tile to focus the 3D camera directly on that exhibitor.
              </p>
            </div>
            <Button variant="primary" onClick={onOpen3DFloor}>
              Open 3D Floor Explorer
            </Button>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2.5 sm:grid-cols-6">
            {snapshot.booths.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => onInspectBoothOnFloor(b.id)}
                className={`booth-tile-wrap booth-status-${b.status} text-left`}
              >
                <span className="booth-tile-inner flex-col items-start p-3">
                  <div className="flex w-full items-center justify-between">
                    <span className="font-mono text-xs font-bold">{b.number}</span>
                    <span className="h-2 w-2 rounded-xs" style={{ backgroundColor: STATUS_HEX[b.status] }} />
                  </div>
                  <span className="mt-1.5 truncate w-full text-[11px] text-[#3E404D] dark:text-[#9497A6]">
                    {b.exhibitorName || b.status}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </Card>
      )}

      {section === 'schedule' && (
        <div className="space-y-4">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search sessions, speakers, or rooms..."
            className="w-full sm:w-80"
          />
          <div className="grid gap-4 md:grid-cols-2">
            {snapshot.sessions
              .filter((s) =>
                !searchQuery
                  ? true
                  : `${s.title} ${s.speaker} ${s.location}`.toLowerCase().includes(searchQuery.toLowerCase()),
              )
              .map((s) => {
                const reg = s.registeredUserIds.includes(currentUser.id);
                const saved = s.bookmarkedUserIds.includes(currentUser.id);
                return (
                  <Card key={s.id} padding="md" className="flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-semibold text-[#8A621C] dark:text-[#E8C987]">
                          {s.startTime}–{s.endTime} · {s.location}
                        </span>
                        <Badge tone="teal">{s.topic}</Badge>
                      </div>
                      <h3 className="mt-2 font-display text-base font-bold">{s.title}</h3>
                      <p className="mt-1 text-xs text-[#525463] dark:text-[#9497A6]">
                        {s.speaker} · {s.speakerRole}
                      </p>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2 border-t border-[#272732]/16 pt-3 dark:border-[#2D2D3A]/30">
                      <Button
                        size="sm"
                        variant={reg ? 'secondary' : 'primary'}
                        onClick={async () => {
                          await eventSphereApi.toggleSessionRegister(authToken, s.id);
                          onToast(reg ? 'Seat released' : 'Seat reserved');
                          await onRefreshState();
                        }}
                      >
                        {reg ? 'Registered' : 'Reserve Seat'}
                      </Button>
                      <Button
                        size="sm"
                        variant={saved ? 'secondary' : 'outline'}
                        leftIcon={<Bookmark className="h-3.5 w-3.5" />}
                        onClick={async () => {
                          await eventSphereApi.toggleSessionBookmark(authToken, s.id);
                          onToast(saved ? 'Bookmark removed' : 'Reminder scheduled');
                          await onRefreshState();
                        }}
                      >
                        {saved ? 'Bookmarked' : 'Bookmark'}
                      </Button>
                    </div>
                  </Card>
                );
              })}
          </div>
        </div>
      )}

      {section === 'bookmarks' && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card padding="md">
            <h2 className="font-display text-base font-bold">Saved Booths ({savedBooths.length})</h2>
            <div className="mt-3 space-y-2.5">
              {savedBooths.length === 0 ? (
                <p className="text-xs text-[#525463] dark:text-[#9497A6]">No bookmarked booths yet.</p>
              ) : (
                savedBooths.map((b) => (
                  <div
                    key={b.id}
                    className="rounded-xl border border-[#272732]/18 bg-[#E6E7EE] p-3 text-xs dark:border-[#2D2D3A]/34 dark:bg-[#0E0E13]"
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span>Booth {b.number} · {b.exhibitorName || b.zone}</span>
                      <Button size="sm" variant="text" onClick={() => onInspectBoothOnFloor(b.id)}>
                        Inspect 3D
                      </Button>
                    </div>
                    {notes[b.id] && (
                      <p className="mt-1 text-[#525463] dark:text-[#9497A6]">Note: {notes[b.id]}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card padding="md">
            <h2 className="font-display text-base font-bold">Bookmarked Sessions ({bookmarkedSessions.length})</h2>
            <div className="mt-3 space-y-2.5">
              {bookmarkedSessions.length === 0 ? (
                <p className="text-xs text-[#525463] dark:text-[#9497A6]">No sessions bookmarked yet.</p>
              ) : (
                bookmarkedSessions.map((s) => (
                  <div
                    key={s.id}
                    className="rounded-xl border border-[#272732]/18 bg-[#E6E7EE] p-3 text-xs dark:border-[#2D2D3A]/34 dark:bg-[#0E0E13]"
                  >
                    <div className="font-mono text-[11px] text-[#8A621C] dark:text-[#E8C987]">
                      {s.startTime}–{s.endTime} · {s.location}
                    </div>
                    <div className="mt-0.5 font-bold">{s.title}</div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      )}

      {section === 'notifications' && (
        <Card padding="md" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-bold">Live Alerts &amp; Reminders</h2>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                await eventSphereApi.markNotificationsRead(authToken);
                onToast('Notifications marked read');
                await onRefreshState();
              }}
            >
              Mark All Read
            </Button>
          </div>
          {snapshot.notifications.map((n) => (
            <div key={n.id} className="rounded-xl border border-[#272732]/18 bg-[#E6E7EE] p-3 text-xs dark:border-[#2D2D3A]/34 dark:bg-[#0E0E13]">
              <div className="flex justify-between font-bold">
                <span>{n.title}</span>
                <Badge tone="teal">{n.kind}</Badge>
              </div>
              <p className="mt-1 text-[#525463] dark:text-[#9497A6]">{n.message}</p>
            </div>
          ))}
        </Card>
      )}

      {section === 'feedback' && (
        <Card padding="lg">
          <h2 className="font-display text-lg font-bold">Feedback &amp; Organizer Support</h2>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!feedbackMsg.trim()) return;
              setBusy(true);
              const res = await eventSphereApi.submitFeedback({
                userName: currentUser.name,
                category: feedbackCat,
                message: feedbackMsg.trim(),
              });
              setBusy(false);
              if (!res.ok) return onToast(res.error);
              setFeedbackMsg('');
              onToast('Submitted to Organizer queue');
              await onRefreshState();
            }}
            className="mt-4 space-y-3"
          >
            <Select
              label="Category"
              value={feedbackCat}
              onChange={(e) => setFeedbackCat(e.target.value)}
              options={[
                { value: 'Suggestion', label: 'Suggestion' },
                { value: 'Technical Issue', label: 'Technical Issue' },
                { value: 'Booth Inquiry', label: 'Booth Inquiry' },
              ]}
            />
            <Textarea
              label="Message"
              rows={3}
              required
              value={feedbackMsg}
              onChange={(e) => setFeedbackMsg(e.target.value)}
              placeholder="Share feedback or request assistance at the venue..."
            />
            <Button type="submit" variant="primary" loading={busy}>
              Send Feedback
            </Button>
          </form>
        </Card>
      )}

      {section === 'settings' && (
        <div className="space-y-5">
          <Card padding="lg" className="space-y-4">
            <h2 className="font-display text-lg font-bold">Profile Settings</h2>
            <p className="text-xs text-[#525463] dark:text-[#9497A6]">
              Signed in as <strong>{currentUser.name}</strong> ({currentUser.email}).
            </p>
            <Button variant="primary" onClick={onOpenProfileModal}>
              Edit Attendee Profile
            </Button>
          </Card>

          <PrivacyAndComplianceCard
            currentUser={currentUser}
            authToken={authToken}
            onRefreshState={onRefreshState}
            onLogout={onLogout}
            onToast={onToast}
          />
        </div>
      )}

      <ConfirmDialog
        isOpen={Boolean(cancelExpoId)}
        title="Cancel Expo Registration?"
        description="Your digital pass for this expo will be deactivated."
        confirmLabel="Cancel Registration"
        busy={busy}
        onCancel={() => setCancelExpoId(null)}
        onConfirm={async () => {
          if (!cancelExpoId) return;
          setBusy(true);
          const res = await eventSphereApi.cancelExpoRegistration(authToken, cancelExpoId);
          setBusy(false);
          setCancelExpoId(null);
          if (!res.ok) return onToast(res.error);
          onToast('Registration cancelled');
          await onRefreshState();
        }}
      />
    </DashboardLayout>
  );
};
