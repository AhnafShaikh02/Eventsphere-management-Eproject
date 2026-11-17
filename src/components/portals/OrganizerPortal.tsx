import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  Building2,
  Calendar,
  CalendarClock,
  CheckCircle2,
  Compass,
  Edit3,
  FileCheck2,
  Grid,
  LayoutDashboard,
  MessageSquare,
  Mic,
  Plus,
  Send,
  Settings,
  Trash2,
  Users,
  XCircle,
} from 'lucide-react';
import type {
  AdminAttendeeRow,
  AdminMonitoringSummary,
  BoothStatus,
  EventSphereSnapshot,
  ExhibitorApplication,
  ExhibitorProfile,
  ExpoBooth,
  ExpoEvent,
  ExpoSession,
  SpeakerRecord,
  UserAccount,
} from '../../types/eventsphere';
import { STATUS_HEX } from '../../three/expoModels';
import { eventSphereApi } from '../../services/eventSphereClient';
import { PrivacyAndComplianceCard } from '../PrivacyAndComplianceCard';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  DataTable,
  EmptyState,
  Input,
  Modal,
  SearchInput,
  Select,
  StatCard,
  Textarea,
} from '../ui';
import { DashboardLayout, type PortalNavItem } from './DashboardLayout';

interface OrganizerPortalProps {
  snapshot: EventSphereSnapshot;
  currentUser: UserAccount;
  authToken: string;
  unreadNotifications: number;
  onRefreshState: () => Promise<void>;
  onOpen3DFloor: () => void;
  onInspectBoothOnFloor: (boothId: string) => void;
  onOpenAnalytics: () => void;
  onOpenNotifications: () => void;
  onOpenProfileModal: () => void;
  onLogout: () => void;
  onToast: (msg: string) => void;
}

export const OrganizerPortal: React.FC<OrganizerPortalProps> = ({
  snapshot,
  currentUser,
  authToken,
  unreadNotifications,
  onRefreshState,
  onOpen3DFloor,
  onInspectBoothOnFloor,
  onOpenAnalytics,
  onOpenNotifications,
  onOpenProfileModal,
  onLogout,
  onToast,
}) => {
  const [section, setSection] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [appFilter, setAppFilter] = useState<'all' | ExhibitorApplication['status']>('all');
  const [boothStatusFilter, setBoothStatusFilter] = useState<'all' | BoothStatus>('all');
  const [busy, setBusy] = useState(false);

  // Attendees & system monitoring fetched from admin-only endpoints
  const [attendees, setAttendees] = useState<AdminAttendeeRow[]>([]);
  const [monitoring, setMonitoring] = useState<AdminMonitoringSummary | null>(null);
  useEffect(() => {
    eventSphereApi.getAdminAttendees(authToken).then((res) => {
      if (res.ok) setAttendees(res.data.attendees);
    });
  }, [authToken, snapshot.expos]);

  useEffect(() => {
    if (section !== 'settings') return;
    eventSphereApi.getAdminMonitoring(authToken).then((res) => {
      if (res.ok) setMonitoring(res.data);
    });
  }, [authToken, section]);

  // Modals
  const [expoModal, setExpoModal] = useState<{ mode: 'create' | 'edit'; expo?: ExpoEvent } | null>(null);
  const [expoForm, setExpoForm] = useState({
    title: '',
    date: '2026-12-15',
    endDate: '2026-12-17',
    location: '',
    theme: '',
    category: 'Robotics & AI',
    status: 'upcoming' as ExpoEvent['status'],
    capacity: 800,
    description: '',
  });

  const [boothModal, setBoothModal] = useState<{ mode: 'create' | 'edit'; booth?: ExpoBooth } | null>(null);
  const [boothForm, setBoothForm] = useState({
    number: '',
    zone: 'Central Atrium',
    size: '3x3m Standard' as ExpoBooth['size'],
    priceUsd: 2800,
    status: 'available' as BoothStatus,
    exhibitorId: '',
  });

  const [sessionModal, setSessionModal] = useState<{ mode: 'create' | 'edit'; session?: ExpoSession } | null>(null);
  const [sessionForm, setSessionForm] = useState({
    expoId: snapshot.expos[0]?.id || 'expo-2026-global',
    title: '',
    speaker: '',
    speakerRole: '',
    topic: 'Robotics & AI',
    startTime: '10:00',
    endTime: '11:00',
    location: 'Main Keynote Stage',
    capacity: 150,
  });

  const [speakerModal, setSpeakerModal] = useState<{ mode: 'create' | 'edit'; speaker?: SpeakerRecord } | null>(null);
  const [speakerForm, setSpeakerForm] = useState({
    expoId: snapshot.expos[0]?.id || 'expo-2026-global',
    name: '',
    role: '',
    company: '',
    topic: 'Innovation',
    bio: '',
  });

  const [editExhibitor, setEditExhibitor] = useState<ExhibitorProfile | null>(null);
  const [exhForm, setExhForm] = useState({
    companyName: '',
    category: 'Robotics & AI' as ExhibitorProfile['category'],
    tagline: '',
    contactEmail: '',
    phone: '',
    website: '',
  });

  const [reviewActionModal, setReviewActionModal] = useState<{
    app: ExhibitorApplication;
    mode: 'reject' | 'info';
  } | null>(null);
  const [reviewNoteText, setReviewNoteText] = useState('');

  const [confirmDelete, setConfirmDelete] = useState<{
    title: string;
    description: string;
    onConfirm: () => Promise<void>;
  } | null>(null);

  const [chatChannel, setChatChannel] = useState('organizer');
  const [chatDraft, setChatDraft] = useState('');

  const pendingApps = snapshot.applications.filter((a) => a.status === 'pending').length;
  const openFeedback = snapshot.feedback.filter((f) => f.status === 'open').length;
  const bookedBooths = snapshot.booths.filter((b) => b.status === 'reserved' || b.status === 'occupied').length;

  const navItems: PortalNavItem[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="h-4 w-4" /> },
    { id: 'expos', label: 'Expo Management', icon: <Calendar className="h-4 w-4" />, badgeCount: snapshot.expos.length },
    { id: 'applications', label: 'Exhibitor Applications', icon: <FileCheck2 className="h-4 w-4" />, badgeCount: pendingApps },
    { id: 'exhibitors', label: 'Exhibitors', icon: <Building2 className="h-4 w-4" /> },
    { id: 'booths', label: 'Booth Management', icon: <Grid className="h-4 w-4" /> },
    { id: 'floor-plan', label: 'Floor Plan', icon: <Compass className="h-4 w-4" /> },
    { id: 'schedule', label: 'Schedule Management', icon: <CalendarClock className="h-4 w-4" /> },
    { id: 'speakers', label: 'Speakers', icon: <Mic className="h-4 w-4" /> },
    { id: 'attendees', label: 'Attendees', icon: <Users className="h-4 w-4" />, badgeCount: attendees.length },
    { id: 'analytics', label: 'Analytics & Reports', icon: <BarChart3 className="h-4 w-4" /> },
    { id: 'messages', label: 'Messages', icon: <MessageSquare className="h-4 w-4" /> },
    { id: 'feedback', label: 'Feedback Queue', icon: <Activity className="h-4 w-4" />, badgeCount: openFeedback },
    { id: 'settings', label: 'Settings', icon: <Settings className="h-4 w-4" /> },
  ];

  const openCreateExpo = () => {
    setExpoForm({
      title: '',
      date: '2026-12-15',
      endDate: '2026-12-17',
      location: '',
      theme: '',
      category: 'Robotics & AI',
      status: 'upcoming',
      capacity: 800,
      description: '',
    });
    setExpoModal({ mode: 'create' });
  };

  const openEditExpo = (expo: ExpoEvent) => {
    setExpoForm({
      title: expo.title,
      date: expo.date,
      endDate: expo.endDate,
      location: expo.location,
      theme: expo.theme,
      category: expo.category || 'Robotics & AI',
      status: expo.status || 'upcoming',
      capacity: expo.capacity || 800,
      description: expo.description,
    });
    setExpoModal({ mode: 'edit', expo });
  };

  const handleSaveExpo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expoModal) return;
    setBusy(true);
    const res =
      expoModal.mode === 'create'
        ? await eventSphereApi.createExpo(authToken, expoForm)
        : await eventSphereApi.updateExpo(authToken, expoModal.expo!.id, expoForm);
    setBusy(false);
    if (!res.ok) return onToast(res.error);
    onToast(expoModal.mode === 'create' ? 'Expo created' : 'Expo updated');
    setExpoModal(null);
    await onRefreshState();
  };

  const handleSaveBooth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!boothModal) return;
    setBusy(true);
    const res =
      boothModal.mode === 'create'
        ? await eventSphereApi.createBooth(authToken, {
            number: boothForm.number,
            zone: boothForm.zone,
            size: boothForm.size,
            priceUsd: Number(boothForm.priceUsd),
          })
        : await eventSphereApi.updateBooth(authToken, boothModal.booth!.id, {
            zone: boothForm.zone,
            size: boothForm.size,
            priceUsd: Number(boothForm.priceUsd),
            status: boothForm.status,
            exhibitorId: boothForm.exhibitorId || null,
          });
    setBusy(false);
    if (!res.ok) return onToast(res.error);
    onToast(boothModal.mode === 'create' ? 'Booth created' : 'Booth updated');
    setBoothModal(null);
    await onRefreshState();
  };

  const handleSaveSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionModal) return;
    setBusy(true);
    const res =
      sessionModal.mode === 'create'
        ? await eventSphereApi.createSession(authToken, sessionForm)
        : await eventSphereApi.updateSession(authToken, sessionModal.session!.id, sessionForm);
    setBusy(false);
    if (!res.ok) return onToast(res.error);
    onToast('Schedule synchronized to all attendees');
    setSessionModal(null);
    await onRefreshState();
  };

  const handleSaveSpeaker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!speakerModal) return;
    setBusy(true);
    const res =
      speakerModal.mode === 'create'
        ? await eventSphereApi.createSpeaker(authToken, speakerForm)
        : await eventSphereApi.updateSpeaker(authToken, speakerModal.speaker!.id, speakerForm);
    setBusy(false);
    if (!res.ok) return onToast(res.error);
    onToast(speakerModal.mode === 'create' ? 'Speaker added' : 'Speaker updated');
    setSpeakerModal(null);
    await onRefreshState();
  };

  const filteredApps = useMemo(() => {
    return snapshot.applications.filter((a) => {
      if (appFilter !== 'all' && a.status !== appFilter) return false;
      if (searchQuery && !a.companyName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [snapshot.applications, appFilter, searchQuery]);

  const filteredBooths = useMemo(() => {
    return snapshot.booths.filter((b) => {
      if (boothStatusFilter !== 'all' && b.status !== boothStatusFilter) return false;
      if (
        searchQuery &&
        !`${b.number} ${b.zone} ${b.exhibitorName || ''}`
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [snapshot.booths, boothStatusFilter, searchQuery]);

  return (
    <DashboardLayout
      roleTitle="Organizer Command Center"
      roleAccent="#10B981"
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              label="Total Expos"
              value={snapshot.expos.length}
              sublabel={`${snapshot.expos.filter((e) => e.status === 'live').length} live now`}
              icon={<Calendar className="h-5 w-5" />}
              tone="emerald"
            />
            <StatCard
              label="Verified Exhibitors"
              value={snapshot.exhibitors.length}
              sublabel={`${pendingApps} applications pending review`}
              icon={<Building2 className="h-5 w-5" />}
              tone="coral"
            />
            <StatCard
              label="Floor Booth Occupancy"
              value={`${bookedBooths}/${snapshot.booths.length}`}
              sublabel={`${snapshot.booths.filter((b) => b.status === 'available').length} booths open`}
              icon={<Grid className="h-5 w-5" />}
              tone="teal"
            />
            <StatCard
              label="Registered Attendees"
              value={attendees.length || snapshot.registrations.length}
              sublabel={`${snapshot.concurrentUsers} connected live`}
              icon={<Users className="h-5 w-5" />}
              tone="violet"
            />
            <StatCard
              label="Scheduled Sessions"
              value={snapshot.sessions.length}
              sublabel={`${snapshot.speakers.length} confirmed speakers`}
              icon={<CalendarClock className="h-5 w-5" />}
              tone="emerald"
            />
            <StatCard
              label="Open Support Tickets"
              value={openFeedback}
              sublabel={`${snapshot.feedback.length} total submissions`}
              icon={<Activity className="h-5 w-5" />}
              tone="coral"
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card padding="md">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-base font-bold">Recent Activity Audit Log</h2>
                <Button variant="text" onClick={() => setSection('applications')}>
                  Review Queue ({pendingApps})
                </Button>
              </div>
              <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
                {snapshot.activityLogs.slice(0, 8).map((log) => (
                  <div
                    key={log.id}
                    className="rounded-xl border border-[#104E35]/18 bg-[#E4EDE7] p-3 text-xs dark:border-[#2A6F52]/34 dark:bg-[#050A07]"
                  >
                    <div className="flex items-center justify-between gap-2 font-mono text-[10px]">
                      <span className="font-bold text-[#059669] dark:text-[#34D399]">{log.action}</span>
                      <span className="text-[#466153] dark:text-[#8EAD9E]">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="mt-1 font-semibold">{log.detail}</div>
                    <div className="mt-0.5 text-[11px] text-[#466153] dark:text-[#8EAD9E]">
                      Actor: {log.actor}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card padding="md">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-base font-bold">Quick Actions</h2>
                <Button variant="text" onClick={onOpenAnalytics}>
                  Full Analytics
                </Button>
              </div>
              <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />} onClick={openCreateExpo}>
                  New Expo Event
                </Button>
                <Button
                  variant="secondary"
                  leftIcon={<Plus className="h-4 w-4" />}
                  onClick={() => {
                    setSessionForm({
                      expoId: snapshot.expos[0]?.id || 'expo-2026-global',
                      title: '',
                      speaker: '',
                      speakerRole: '',
                      topic: 'Robotics & AI',
                      startTime: '14:00',
                      endTime: '15:00',
                      location: 'Central Atrium Stage',
                      capacity: 150,
                    });
                    setSessionModal({ mode: 'create' });
                  }}
                >
                  Publish Session
                </Button>
                <Button variant="outline" onClick={() => setSection('floor-plan')}>
                  Open Floor Plan Matrix
                </Button>
                <Button variant="outline" onClick={() => setSection('feedback')}>
                  Support Tickets ({openFeedback})
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {section === 'expos' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search expos by title or location..."
              className="w-full sm:w-80"
            />
            <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />} onClick={openCreateExpo}>
              Create Expo
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {snapshot.expos
              .filter((e) =>
                !searchQuery
                  ? true
                  : `${e.title} ${e.location} ${e.theme}`.toLowerCase().includes(searchQuery.toLowerCase()),
              )
              .map((expo) => (
                <Card key={expo.id} padding="md" className="flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <Badge tone={expo.status === 'live' ? 'emerald' : 'teal'}>{expo.status}</Badge>
                      <span className="font-mono text-xs text-[#466153] dark:text-[#8EAD9E]">
                        {expo.date} → {expo.endDate}
                      </span>
                    </div>
                    <h3 className="mt-2.5 font-display text-lg font-bold">{expo.title}</h3>
                    <p className="mt-0.5 text-xs text-[#466153] dark:text-[#8EAD9E]">
                      {expo.location} · {expo.category} · {expo.registeredUserIds.length} registered
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-[#466153] dark:text-[#8EAD9E]">
                      {expo.description}
                    </p>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-[#104E35]/16 pt-3 dark:border-[#2A6F52]/30">
                    <Button
                      variant="outline"
                      size="sm"
                      leftIcon={<Edit3 className="h-3.5 w-3.5" />}
                      onClick={() => openEditExpo(expo)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                      onClick={() =>
                        setConfirmDelete({
                          title: `Delete "${expo.title}"?`,
                          description: 'This permanently removes the expo listing from the public catalog.',
                          onConfirm: async () => {
                            await eventSphereApi.deleteExpo(authToken, expo.id);
                            onToast('Expo deleted');
                            await onRefreshState();
                          },
                        })
                      }
                    >
                      Delete
                    </Button>
                  </div>
                </Card>
              ))}
          </div>
        </div>
      )}

      {section === 'applications' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Filter applications by company..."
              className="w-full sm:w-72"
            />
            <div className="flex flex-wrap gap-1.5">
              {(['all', 'pending', 'info_requested', 'approved', 'rejected'] as const).map((st) => (
                <Button
                  key={st}
                  size="sm"
                  variant={appFilter === st ? 'primary' : 'outline'}
                  onClick={() => setAppFilter(st)}
                >
                  {st.replace('_', ' ')}
                </Button>
              ))}
            </div>
          </div>

          {filteredApps.length === 0 ? (
            <EmptyState
              icon={<FileCheck2 className="h-5 w-5" />}
              title="No matching applications"
              description="No exhibitor applications match the active filter."
            />
          ) : (
            <div className="grid gap-4">
              {filteredApps.map((app) => (
                <Card key={app.id} padding="md">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-base font-bold">{app.companyName}</h3>
                        <Badge
                          tone={
                            app.status === 'approved'
                              ? 'emerald'
                              : app.status === 'rejected'
                                ? 'coral'
                                : app.status === 'info_requested'
                                  ? 'amber'
                                  : 'violet'
                          }
                        >
                          {app.status.replace('_', ' ')}
                        </Badge>
                        <span className="font-mono text-xs text-[#466153] dark:text-[#8EAD9E]">
                          {app.category} · Submitted {app.submittedAt}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed text-[#466153] dark:text-[#8EAD9E]">
                        {app.productsSummary}
                      </p>
                      <div className="font-mono text-[11px] text-[#059669] dark:text-[#34D399]">
                        Docs: {app.documents.join(', ')}
                      </div>
                      {(app.rejectionReason || app.reviewerNote) && (
                        <div className="mt-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-800 dark:text-amber-300">
                          Note: {app.rejectionReason || app.reviewerNote}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="primary"
                        leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
                        loading={busy}
                        onClick={async () => {
                          setBusy(true);
                          const res = await eventSphereApi.reviewApplication(authToken, app.id, {
                            status: 'approved',
                          });
                          setBusy(false);
                          if (!res.ok) return onToast(res.error);
                          onToast(`Approved ${app.companyName}`);
                          await onRefreshState();
                        }}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setReviewNoteText(app.reviewerNote || 'Please upload updated safety certification.');
                          setReviewActionModal({ app, mode: 'info' });
                        }}
                      >
                        Request Info
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        leftIcon={<XCircle className="h-3.5 w-3.5" />}
                        onClick={() => {
                          setReviewNoteText('Floor capacity / safety review');
                          setReviewActionModal({ app, mode: 'reject' });
                        }}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {section === 'exhibitors' && (
        <div className="space-y-4">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search exhibitors by company or sector..."
            className="w-full sm:w-80"
          />
          <DataTable
            columns={[
              {
                key: 'company',
                header: 'Company',
                render: (ex) => (
                  <div className="flex items-center gap-2.5">
                    <span
                      className="h-3 w-3 rounded-xs shrink-0"
                      style={{ backgroundColor: ex.logoColor }}
                    />
                    <div>
                      <div className="font-semibold">{ex.companyName}</div>
                      <div className="text-[11px] text-[#466153] dark:text-[#8EAD9E]">{ex.contactEmail}</div>
                    </div>
                  </div>
                ),
              },
              { key: 'category', header: 'Sector', render: (ex) => <Badge tone="teal">{ex.category}</Badge> },
              {
                key: 'booth',
                header: 'Booth(s)',
                render: (ex) => {
                  const assigned = snapshot.booths.filter((b) => b.exhibitorId === ex.id);
                  return assigned.length ? assigned.map((b) => b.number).join(', ') : 'Unassigned';
                },
              },
              { key: 'views', header: 'Views', align: 'right', render: (ex) => <span className="font-mono">{ex.profileViews}</span> },
              {
                key: 'actions',
                header: 'Actions',
                align: 'right',
                render: (ex) => (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditExhibitor(ex);
                      setExhForm({
                        companyName: ex.companyName,
                        category: ex.category,
                        tagline: ex.tagline,
                        contactEmail: ex.contactEmail,
                        phone: ex.phone || '',
                        website: ex.website,
                      });
                    }}
                  >
                    Edit Record
                  </Button>
                ),
              },
            ]}
            rows={snapshot.exhibitors.filter((ex) =>
              !searchQuery
                ? true
                : `${ex.companyName} ${ex.category} ${ex.tagline}`.toLowerCase().includes(searchQuery.toLowerCase()),
            )}
          />
        </div>
      )}

      {section === 'booths' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search booth number or exhibitor..."
                className="w-64"
              />
              {(['all', 'available', 'reserved', 'occupied', 'pending'] as const).map((st) => (
                <Button
                  key={st}
                  size="sm"
                  variant={boothStatusFilter === st ? 'primary' : 'outline'}
                  onClick={() => setBoothStatusFilter(st)}
                >
                  {st}
                </Button>
              ))}
            </div>
            <Button
              variant="primary"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => {
                setBoothForm({
                  number: `E${snapshot.booths.length + 1}`,
                  zone: 'Central Atrium',
                  size: '3x3m Standard',
                  priceUsd: 2800,
                  status: 'available',
                  exhibitorId: '',
                });
                setBoothModal({ mode: 'create' });
              }}
            >
              Add Booth
            </Button>
          </div>

          <DataTable
            columns={[
              { key: 'number', header: 'Booth', render: (b) => <span className="font-mono font-bold">{b.number}</span> },
              { key: 'zone', header: 'Zone', render: (b) => b.zone },
              { key: 'size', header: 'Size', render: (b) => b.size },
              { key: 'price', header: 'Price', render: (b) => <span className="font-mono">${b.priceUsd.toLocaleString()}</span> },
              {
                key: 'status',
                header: 'Status',
                render: (b) => (
                  <Badge
                    tone={
                      b.status === 'available'
                        ? 'emerald'
                        : b.status === 'reserved'
                          ? 'coral'
                          : b.status === 'occupied'
                            ? 'teal'
                            : 'violet'
                    }
                  >
                    {b.status}
                  </Badge>
                ),
              },
              { key: 'exhibitor', header: 'Assigned Exhibitor', render: (b) => b.exhibitorName || '—' },
              {
                key: 'actions',
                header: 'Actions',
                align: 'right',
                render: (b) => (
                  <div className="flex justify-end gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setBoothForm({
                          number: b.number,
                          zone: b.zone,
                          size: b.size,
                          priceUsd: b.priceUsd,
                          status: b.status,
                          exhibitorId: b.exhibitorId || '',
                        });
                        setBoothModal({ mode: 'edit', booth: b });
                      }}
                    >
                      Allocate
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => onInspectBoothOnFloor(b.id)}>
                      3D
                    </Button>
                  </div>
                ),
              },
            ]}
            rows={filteredBooths}
          />
        </div>
      )}

      {section === 'floor-plan' && (
        <Card padding="lg">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold">Interactive 2D &amp; 3D Expo Hall Matrix</h2>
              <p className="text-xs text-[#466153] dark:text-[#8EAD9E]">
                Click any booth tile to inspect or modify its live 3D hall assignment.
              </p>
            </div>
            <Button variant="primary" leftIcon={<Compass className="h-4 w-4" />} onClick={onOpen3DFloor}>
              Launch 3D Campus
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
                <span className="booth-tile-inner flex-col items-start justify-between p-3">
                  <div className="flex w-full items-center justify-between">
                    <span className="font-mono text-sm font-bold">{b.number}</span>
                    <span className="h-2.5 w-2.5 rounded-xs" style={{ backgroundColor: STATUS_HEX[b.status] }} />
                  </div>
                  <div className="mt-2 truncate w-full text-[11px] font-semibold">
                    {b.exhibitorName || b.status}
                  </div>
                  <div className="font-mono text-[10px] text-[#466153] dark:text-[#8EAD9E]">
                    ${b.priceUsd.toLocaleString()}
                  </div>
                </span>
              </button>
            ))}
          </div>
        </Card>
      )}

      {section === 'schedule' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search sessions or rooms..."
              className="w-full sm:w-80"
            />
            <Button
              variant="primary"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => {
                setSessionForm({
                  expoId: snapshot.expos[0]?.id || 'expo-2026-global',
                  title: '',
                  speaker: '',
                  speakerRole: '',
                  topic: 'Robotics & AI',
                  startTime: '14:00',
                  endTime: '15:00',
                  location: 'Central Atrium Stage',
                  capacity: 150,
                });
                setSessionModal({ mode: 'create' });
              }}
            >
              Add Session
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {snapshot.sessions
              .filter((s) =>
                !searchQuery
                  ? true
                  : `${s.title} ${s.speaker} ${s.location}`.toLowerCase().includes(searchQuery.toLowerCase()),
              )
              .map((s) => (
                <Card key={s.id} padding="md" className="flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-semibold text-[#059669] dark:text-[#34D399]">
                        {s.startTime}–{s.endTime} · {s.location}
                      </span>
                      <Badge tone="teal">{s.registeredUserIds.length}/{s.capacity}</Badge>
                    </div>
                    <h3 className="mt-2 font-display text-base font-bold">{s.title}</h3>
                    <p className="mt-1 text-xs text-[#466153] dark:text-[#8EAD9E]">
                      {s.speaker} · {s.speakerRole}
                    </p>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-[#104E35]/16 pt-3 dark:border-[#2A6F52]/30">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSessionForm({
                          expoId: s.expoId,
                          title: s.title,
                          speaker: s.speaker,
                          speakerRole: s.speakerRole,
                          topic: s.topic,
                          startTime: s.startTime,
                          endTime: s.endTime,
                          location: s.location,
                          capacity: s.capacity,
                        });
                        setSessionModal({ mode: 'edit', session: s });
                      }}
                    >
                      Edit &amp; Broadcast
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() =>
                        setConfirmDelete({
                          title: `Remove session "${s.title}"?`,
                          description: 'Attendees will no longer see this session on the timetable.',
                          onConfirm: async () => {
                            await eventSphereApi.deleteSession(authToken, s.id);
                            onToast('Session deleted');
                            await onRefreshState();
                          },
                        })
                      }
                    >
                      Delete
                    </Button>
                  </div>
                </Card>
              ))}
          </div>
        </div>
      )}

      {section === 'speakers' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search speakers..."
              className="w-full sm:w-80"
            />
            <Button
              variant="primary"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => {
                setSpeakerForm({
                  expoId: snapshot.expos[0]?.id || 'expo-2026-global',
                  name: '',
                  role: '',
                  company: '',
                  topic: 'Innovation',
                  bio: '',
                });
                setSpeakerModal({ mode: 'create' });
              }}
            >
              Add Speaker
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {snapshot.speakers
              .filter((sp) =>
                !searchQuery
                  ? true
                  : `${sp.name} ${sp.company} ${sp.topic}`.toLowerCase().includes(searchQuery.toLowerCase()),
              )
              .map((sp) => (
                <Card key={sp.id} padding="md" className="flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-base font-bold">{sp.name}</h3>
                      <Badge tone="emerald">{sp.topic}</Badge>
                    </div>
                    <p className="mt-0.5 text-xs font-medium text-[#059669] dark:text-[#34D399]">
                      {sp.role} · {sp.company}
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-[#466153] dark:text-[#8EAD9E]">
                      {sp.bio}
                    </p>
                  </div>
                  <div className="mt-4 flex gap-2 border-t border-[#104E35]/16 pt-3 dark:border-[#2A6F52]/30">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSpeakerForm({
                          expoId: sp.expoId,
                          name: sp.name,
                          role: sp.role,
                          company: sp.company,
                          topic: sp.topic,
                          bio: sp.bio,
                        });
                        setSpeakerModal({ mode: 'edit', speaker: sp });
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() =>
                        setConfirmDelete({
                          title: `Remove speaker "${sp.name}"?`,
                          description: 'Removes this speaker profile from the directory.',
                          onConfirm: async () => {
                            await eventSphereApi.deleteSpeaker(authToken, sp.id);
                            onToast('Speaker removed');
                            await onRefreshState();
                          },
                        })
                      }
                    >
                      Remove
                    </Button>
                  </div>
                </Card>
              ))}
          </div>
        </div>
      )}

      {section === 'attendees' && (
        <div className="space-y-4">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search attendees by name, email, or company..."
            className="w-full sm:w-80"
          />
          <DataTable
            columns={[
              {
                key: 'name',
                header: 'Attendee',
                render: (a) => (
                  <div>
                    <div className="font-semibold">{a.name}</div>
                    <div className="text-[11px] text-[#466153] dark:text-[#8EAD9E]">{a.email}</div>
                  </div>
                ),
              },
              { key: 'company', header: 'Organization', render: (a) => a.company || '—' },
              { key: 'expos', header: 'Registered Expos', render: (a) => <span className="font-mono">{a.registeredExpoIds.length}</span> },
              { key: 'bookmarks', header: 'Session Bookmarks', render: (a) => <span className="font-mono">{a.bookmarkedSessionCount}</span> },
              { key: 'joined', header: 'Joined', render: (a) => <span className="font-mono text-xs">{a.createdAt.slice(0, 10)}</span> },
            ]}
            rows={attendees.filter((a) =>
              !searchQuery
                ? true
                : `${a.name} ${a.email} ${a.company || ''}`.toLowerCase().includes(searchQuery.toLowerCase()),
            )}
          />
        </div>
      )}

      {section === 'analytics' && (
        <Card padding="lg" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold">Executive Telemetry &amp; Exports</h2>
              <p className="text-xs text-[#466153] dark:text-[#8EAD9E]">
                Inspect full date-range traffic charts, booth heatmaps, and export CSV/JSON reports.
              </p>
            </div>
            <Button variant="primary" onClick={onOpenAnalytics}>
              Open Full Analytics Suite
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="30-Day Booth Visits" value={snapshot.analyticsSeries.reduce((s, p) => s + p.boothTraffic, 0).toLocaleString()} />
            <StatCard label="Total Profile Views" value={snapshot.exhibitors.reduce((s, e) => s + e.profileViews, 0).toLocaleString()} />
            <StatCard label="Session Bookmarks" value={snapshot.sessions.reduce((s, se) => s + se.bookmarkedUserIds.length, 0)} />
          </div>
        </Card>
      )}

      {section === 'messages' && (
        <Card padding="md" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-base font-bold">Organizer Communications Hub</h2>
            <Select
              value={chatChannel}
              onChange={(e) => setChatChannel(e.target.value)}
              className="w-60"
              options={[
                { value: 'organizer', label: 'Organizer Desk' },
                { value: 'hall-general', label: 'Hall General Broadcast' },
                ...snapshot.exhibitors.map((ex) => ({ value: ex.id, label: ex.companyName })),
              ]}
            />
          </div>
          <div className="max-h-72 space-y-2 overflow-y-auto rounded-xl border border-[#104E35]/18 bg-[#E4EDE7] p-3 dark:border-[#2A6F52]/34 dark:bg-[#050A07]">
            {snapshot.messages
              .filter((m) => m.recipientChannel === chatChannel)
              .map((m) => (
                <div key={m.id} className="rounded-lg border border-[#104E35]/16 bg-[#F0F5F2] p-2.5 text-xs dark:border-[#2A6F52]/30 dark:bg-[#09120D]">
                  <div className="flex justify-between font-semibold">
                    <span>{m.senderName}</span>
                    <span className="font-mono text-[10px] text-[#466153] dark:text-[#8EAD9E]">
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="mt-1 text-[#466153] dark:text-[#C5DFD0]">{m.body}</p>
                </div>
              ))}
          </div>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!chatDraft.trim()) return;
              const label =
                chatChannel === 'organizer'
                  ? 'Organizer Desk'
                  : chatChannel === 'hall-general'
                    ? 'Hall General'
                    : snapshot.exhibitors.find((ex) => ex.id === chatChannel)?.companyName || 'Exhibitor';
              const res = await eventSphereApi.sendMessage(authToken, {
                recipientChannel: chatChannel,
                recipientLabel: label,
                body: chatDraft.trim(),
              });
              if (res.ok) {
                setChatDraft('');
                await onRefreshState();
              } else {
                onToast(res.error);
              }
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={chatDraft}
              onChange={(e) => setChatDraft(e.target.value)}
              placeholder="Send real-time organizer message..."
              className="flex-1 rounded-xl border border-[#104E35]/20 bg-[#EEF4F0] px-3.5 py-2 text-sm text-[#091911] placeholder:text-[#577363] focus:border-[#10B981] focus:outline-none dark:border-[#2A6F52]/38 dark:bg-[#050A07] dark:text-[#DDF2E7] dark:placeholder:text-[#6D907E]"
            />
            <Button type="submit" variant="primary" leftIcon={<Send className="h-3.5 w-3.5" />}>
              Send
            </Button>
          </form>
        </Card>
      )}

      {section === 'feedback' && (
        <div className="space-y-3">
          {snapshot.feedback.map((fb) => (
            <Card key={fb.id} padding="md">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{fb.userName}</span>
                    <Badge tone="neutral">{fb.category}</Badge>
                    <Badge tone={fb.status === 'resolved' ? 'emerald' : 'coral'}>{fb.status}</Badge>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-[#466153] dark:text-[#8EAD9E]">
                    {fb.message}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={fb.status === 'resolved' ? 'outline' : 'primary'}
                  onClick={async () => {
                    const next = fb.status === 'resolved' ? 'open' : 'resolved';
                    const res = await eventSphereApi.updateFeedbackStatus(authToken, fb.id, next);
                    if (!res.ok) return onToast(res.error);
                    onToast(`Feedback marked ${next}`);
                    await onRefreshState();
                  }}
                >
                  {fb.status === 'resolved' ? 'Reopen' : 'Mark Resolved'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {section === 'settings' && (
        <div className="space-y-5">
          <Card padding="lg" className="space-y-4">
            <h2 className="font-display text-lg font-bold">Organizer Account &amp; Governance</h2>
            <p className="text-xs text-[#466153] dark:text-[#8EAD9E]">
              Signed in as <strong>{currentUser.name}</strong> ({currentUser.email}). Organizer setup invite verification, AES-256-GCM encryption at rest, and automated backups are active.
            </p>
            <Button variant="primary" onClick={onOpenProfileModal}>
              Edit Account Profile
            </Button>
          </Card>

          <Card padding="lg" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-bold">Reliability, Performance Monitoring &amp; Backups</h2>
                <p className="text-xs text-[#466153] dark:text-[#8EAD9E]">
                  Live telemetry across API latency, MongoDB/JSON storage, memory usage, and snapshot backups.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                loading={busy}
                onClick={async () => {
                  setBusy(true);
                  const res = await eventSphereApi.triggerManualBackup(authToken);
                  if (res.ok) {
                    onToast(`Snapshot saved: ${res.data.filename}`);
                    const mRes = await eventSphereApi.getAdminMonitoring(authToken);
                    if (mRes.ok) setMonitoring(mRes.data);
                  } else {
                    onToast(res.error);
                  }
                  setBusy(false);
                }}
              >
                Create Snapshot Backup
              </Button>
            </div>

            {monitoring && (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-[var(--es-border)] bg-[#E4EDE7]/70 p-3 text-xs dark:bg-[#050A07]/70">
                  <div className="font-mono text-[10px] text-[#466153] dark:text-[#8EAD9E]">LATENCY (AVG / P95)</div>
                  <div className="mt-1 font-mono text-sm font-bold tabular-nums">
                    {monitoring.avgLatencyMs}ms / {monitoring.p95LatencyMs}ms
                  </div>
                </div>
                <div className="rounded-xl border border-[var(--es-border)] bg-[#E4EDE7]/70 p-3 text-xs dark:bg-[#050A07]/70">
                  <div className="font-mono text-[10px] text-[#466153] dark:text-[#8EAD9E]">DATABASE ENGINE</div>
                  <div className="mt-1 font-mono text-sm font-bold">
                    {monitoring.database.mode} {monitoring.database.database ? `(${monitoring.database.database})` : ''}
                  </div>
                </div>
                <div className="rounded-xl border border-[var(--es-border)] bg-[#E4EDE7]/70 p-3 text-xs dark:bg-[#050A07]/70">
                  <div className="font-mono text-[10px] text-[#466153] dark:text-[#8EAD9E]">ERROR RATE &amp; MEMORY</div>
                  <div className="mt-1 font-mono text-sm font-bold tabular-nums">
                    {monitoring.errorRatePct}% · {monitoring.memoryRssMb} MB RSS
                  </div>
                </div>
                <div className="rounded-xl border border-[var(--es-border)] bg-[#E4EDE7]/70 p-3 text-xs dark:bg-[#050A07]/70">
                  <div className="font-mono text-[10px] text-[#466153] dark:text-[#8EAD9E]">SNAPSHOT BACKUPS</div>
                  <div className="mt-1 font-mono text-sm font-bold tabular-nums">
                    {monitoring.backupFiles.length} snapshots · {monitoring.encryptionAtRest.toUpperCase()}
                  </div>
                </div>
              </div>
            )}
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

      {/* Modals */}
      <Modal
        isOpen={Boolean(expoModal)}
        onClose={() => setExpoModal(null)}
        title={expoModal?.mode === 'create' ? 'Create New Expo' : 'Edit Expo Details'}
      >
        <form onSubmit={handleSaveExpo} className="space-y-3">
          <Input
            label="Expo Title"
            required
            value={expoForm.title}
            onChange={(e) => setExpoForm((p) => ({ ...p, title: e.target.value }))}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Start Date"
              type="date"
              required
              value={expoForm.date}
              onChange={(e) => setExpoForm((p) => ({ ...p, date: e.target.value }))}
            />
            <Input
              label="End Date"
              type="date"
              required
              value={expoForm.endDate}
              onChange={(e) => setExpoForm((p) => ({ ...p, endDate: e.target.value }))}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Venue Location"
              required
              value={expoForm.location}
              onChange={(e) => setExpoForm((p) => ({ ...p, location: e.target.value }))}
            />
            <Select
              label="Status"
              value={expoForm.status}
              onChange={(e) => setExpoForm((p) => ({ ...p, status: e.target.value as ExpoEvent['status'] }))}
              options={[
                { value: 'upcoming', label: 'Upcoming' },
                { value: 'live', label: 'Live' },
                { value: 'completed', label: 'Completed' },
              ]}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Theme"
              value={expoForm.theme}
              onChange={(e) => setExpoForm((p) => ({ ...p, theme: e.target.value }))}
            />
            <Input
              label="Category"
              value={expoForm.category}
              onChange={(e) => setExpoForm((p) => ({ ...p, category: e.target.value }))}
            />
          </div>
          <Textarea
            label="Description"
            rows={3}
            value={expoForm.description}
            onChange={(e) => setExpoForm((p) => ({ ...p, description: e.target.value }))}
          />
          <Button type="submit" variant="primary" fullWidth loading={busy}>
            {expoModal?.mode === 'create' ? 'Publish Expo' : 'Save Expo Changes'}
          </Button>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(boothModal)}
        onClose={() => setBoothModal(null)}
        title={boothModal?.mode === 'create' ? 'Create Floor Booth' : `Manage Booth ${boothModal?.booth?.number}`}
      >
        <form onSubmit={handleSaveBooth} className="space-y-3">
          {boothModal?.mode === 'create' && (
            <Input
              label="Booth Code"
              required
              value={boothForm.number}
              onChange={(e) => setBoothForm((p) => ({ ...p, number: e.target.value }))}
            />
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Hall Zone"
              value={boothForm.zone}
              onChange={(e) => setBoothForm((p) => ({ ...p, zone: e.target.value }))}
            />
            <Select
              label="Booth Size"
              value={boothForm.size}
              onChange={(e) => setBoothForm((p) => ({ ...p, size: e.target.value as ExpoBooth['size'] }))}
              options={[
                { value: '3x3m Standard', label: '3x3m Standard' },
                { value: '6x3m Corner', label: '6x3m Corner' },
                { value: '6x6m Island', label: '6x6m Island' },
              ]}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Price (USD)"
              type="number"
              min={500}
              value={boothForm.priceUsd}
              onChange={(e) => setBoothForm((p) => ({ ...p, priceUsd: Number(e.target.value) }))}
            />
            {boothModal?.mode === 'edit' && (
              <Select
                label="Status"
                value={boothForm.status}
                onChange={(e) => setBoothForm((p) => ({ ...p, status: e.target.value as BoothStatus }))}
                options={[
                  { value: 'available', label: 'Available' },
                  { value: 'reserved', label: 'Reserved' },
                  { value: 'occupied', label: 'Occupied' },
                  { value: 'pending', label: 'Pending' },
                ]}
              />
            )}
          </div>
          {boothModal?.mode === 'edit' && (
            <Select
              label="Assign Exhibitor"
              value={boothForm.exhibitorId}
              onChange={(e) => setBoothForm((p) => ({ ...p, exhibitorId: e.target.value }))}
              options={[
                { value: '', label: 'Unassigned' },
                ...snapshot.exhibitors.map((ex) => ({ value: ex.id, label: ex.companyName })),
              ]}
            />
          )}
          <Button type="submit" variant="primary" fullWidth loading={busy}>
            Save Booth Configuration
          </Button>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(sessionModal)}
        onClose={() => setSessionModal(null)}
        title={sessionModal?.mode === 'create' ? 'Add Live Session' : 'Edit & Broadcast Session'}
      >
        <form onSubmit={handleSaveSession} className="space-y-3">
          <Input
            label="Session Title"
            required
            value={sessionForm.title}
            onChange={(e) => setSessionForm((p) => ({ ...p, title: e.target.value }))}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Speaker"
              required
              value={sessionForm.speaker}
              onChange={(e) => setSessionForm((p) => ({ ...p, speaker: e.target.value }))}
            />
            <Input
              label="Speaker Title / Org"
              value={sessionForm.speakerRole}
              onChange={(e) => setSessionForm((p) => ({ ...p, speakerRole: e.target.value }))}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Input
              label="Start"
              type="time"
              required
              value={sessionForm.startTime}
              onChange={(e) => setSessionForm((p) => ({ ...p, startTime: e.target.value }))}
            />
            <Input
              label="End"
              type="time"
              required
              value={sessionForm.endTime}
              onChange={(e) => setSessionForm((p) => ({ ...p, endTime: e.target.value }))}
            />
            <Input
              label="Capacity"
              type="number"
              value={sessionForm.capacity}
              onChange={(e) => setSessionForm((p) => ({ ...p, capacity: Number(e.target.value) }))}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Location / Room"
              required
              value={sessionForm.location}
              onChange={(e) => setSessionForm((p) => ({ ...p, location: e.target.value }))}
            />
            <Input
              label="Topic"
              value={sessionForm.topic}
              onChange={(e) => setSessionForm((p) => ({ ...p, topic: e.target.value }))}
            />
          </div>
          <Button type="submit" variant="primary" fullWidth loading={busy}>
            Save &amp; Broadcast Update
          </Button>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(speakerModal)}
        onClose={() => setSpeakerModal(null)}
        title={speakerModal?.mode === 'create' ? 'Add Speaker' : 'Edit Speaker'}
      >
        <form onSubmit={handleSaveSpeaker} className="space-y-3">
          <Input
            label="Speaker Name"
            required
            value={speakerForm.name}
            onChange={(e) => setSpeakerForm((p) => ({ ...p, name: e.target.value }))}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Role"
              value={speakerForm.role}
              onChange={(e) => setSpeakerForm((p) => ({ ...p, role: e.target.value }))}
            />
            <Input
              label="Company"
              value={speakerForm.company}
              onChange={(e) => setSpeakerForm((p) => ({ ...p, company: e.target.value }))}
            />
          </div>
          <Input
            label="Topic"
            value={speakerForm.topic}
            onChange={(e) => setSpeakerForm((p) => ({ ...p, topic: e.target.value }))}
          />
          <Textarea
            label="Bio"
            rows={3}
            value={speakerForm.bio}
            onChange={(e) => setSpeakerForm((p) => ({ ...p, bio: e.target.value }))}
          />
          <Button type="submit" variant="primary" fullWidth loading={busy}>
            Save Speaker
          </Button>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(editExhibitor)}
        onClose={() => setEditExhibitor(null)}
        title={`Edit ${editExhibitor?.companyName || 'Exhibitor'}`}
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!editExhibitor) return;
            setBusy(true);
            const res = await eventSphereApi.updateExhibitorProfile(authToken, editExhibitor.id, exhForm);
            setBusy(false);
            if (!res.ok) return onToast(res.error);
            onToast('Exhibitor record updated');
            setEditExhibitor(null);
            await onRefreshState();
          }}
          className="space-y-3"
        >
          <Input
            label="Company Name"
            required
            value={exhForm.companyName}
            onChange={(e) => setExhForm((p) => ({ ...p, companyName: e.target.value }))}
          />
          <Select
            label="Sector"
            value={exhForm.category}
            onChange={(e) => setExhForm((p) => ({ ...p, category: e.target.value as ExhibitorProfile['category'] }))}
            options={[
              { value: 'Robotics & AI', label: 'Robotics & AI' },
              { value: 'Clean Energy', label: 'Clean Energy' },
              { value: 'Cloud & Security', label: 'Cloud & Security' },
              { value: 'Spatial Computing', label: 'Spatial Computing' },
              { value: 'Biotech & MedTech', label: 'Biotech & MedTech' },
            ]}
          />
          <Input
            label="Tagline"
            value={exhForm.tagline}
            onChange={(e) => setExhForm((p) => ({ ...p, tagline: e.target.value }))}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Contact Email"
              value={exhForm.contactEmail}
              onChange={(e) => setExhForm((p) => ({ ...p, contactEmail: e.target.value }))}
            />
            <Input
              label="Phone"
              value={exhForm.phone}
              onChange={(e) => setExhForm((p) => ({ ...p, phone: e.target.value }))}
            />
          </div>
          <Button type="submit" variant="primary" fullWidth loading={busy}>
            Save Exhibitor Record
          </Button>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(reviewActionModal)}
        onClose={() => setReviewActionModal(null)}
        title={
          reviewActionModal?.mode === 'info'
            ? `Request Info · ${reviewActionModal.app.companyName}`
            : `Reject Application · ${reviewActionModal?.app.companyName}`
        }
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!reviewActionModal) return;
            setBusy(true);
            const res =
              reviewActionModal.mode === 'info'
                ? await eventSphereApi.requestApplicationInfo(authToken, reviewActionModal.app.id, reviewNoteText)
                : await eventSphereApi.reviewApplication(authToken, reviewActionModal.app.id, {
                    status: 'rejected',
                    rejectionReason: reviewNoteText,
                  });
            setBusy(false);
            if (!res.ok) return onToast(res.error);
            onToast(reviewActionModal.mode === 'info' ? 'Info request sent to exhibitor' : 'Application rejected');
            setReviewActionModal(null);
            await onRefreshState();
          }}
          className="space-y-4"
        >
          <Textarea
            label={reviewActionModal?.mode === 'info' ? 'Information Needed' : 'Rejection Reason'}
            rows={3}
            required
            value={reviewNoteText}
            onChange={(e) => setReviewNoteText(e.target.value)}
          />
          <Button
            type="submit"
            variant={reviewActionModal?.mode === 'reject' ? 'destructive' : 'primary'}
            fullWidth
            loading={busy}
          >
            {reviewActionModal?.mode === 'info' ? 'Send Request to Exhibitor' : 'Confirm Rejection'}
          </Button>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(confirmDelete)}
        title={confirmDelete?.title || ''}
        description={confirmDelete?.description || ''}
        confirmLabel="Confirm Delete"
        busy={busy}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={async () => {
          if (!confirmDelete) return;
          setBusy(true);
          await confirmDelete.onConfirm();
          setBusy(false);
          setConfirmDelete(null);
        }}
      />
    </DashboardLayout>
  );
};
