import React, { useMemo, useState } from 'react';
import {
  Bookmark,
  Building2,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  MapPin,
  Plus,
  Send,
  Shield,
  Trash2,
  UserCheck,
  XCircle,
} from 'lucide-react';
import { motion } from 'motion/react';
import type {
  EventSphereSnapshot,
  ExhibitorProfile,
  ExpoBooth,
  ExpoEvent,
  ExpoSession,
  UserAccount,
  UserRole,
} from '../types/eventsphere';
import { STATUS_HEX } from '../three/expoModels';

interface PortalsWorkspaceProps {
  snapshot: EventSphereSnapshot;
  currentUser: UserAccount | null;
  activeTab: UserRole;
  onChangeTab: (role: UserRole) => void;
  onOpenAuth: (defaultRole?: 'exhibitor' | 'attendee') => void;
  onInspectBoothOnFloor: (boothId: string) => void;
  onRegisterExpo: (expoId: string) => Promise<void>;
  onToggleSessionRegister: (sessionId: string) => Promise<void>;
  onToggleSessionBookmark: (sessionId: string) => Promise<void>;
  onReserveBooth: (boothId: string) => Promise<void>;
  onReleaseBooth: (boothId: string) => Promise<void>;
  onSubmitApplication: (payload: {
    expoId: string;
    companyName: string;
    category: ExhibitorProfile['category'];
    productsSummary: string;
    documents: string[];
  }) => Promise<boolean>;
  onReviewApplication: (
    appId: string,
    status: 'approved' | 'rejected',
    rejectionReason?: string,
  ) => Promise<void>;
  onUpdateExhibitorProfile: (
    exhibitorId: string,
    payload: Partial<
      Pick<
        ExhibitorProfile,
        'companyName' | 'tagline' | 'description' | 'products' | 'staff' | 'website' | 'contactEmail' | 'logoColor'
      >
    >,
  ) => Promise<void>;
  onAdminUpdateBooth: (
    boothId: string,
    payload: { size?: ExpoBooth['size']; priceUsd?: number; status?: ExpoBooth['status']; exhibitorId?: string | null },
  ) => Promise<void>;
  onAdminCreateExpo: (payload: {
    title: string;
    date: string;
    endDate: string;
    location: string;
    description: string;
    theme: string;
  }) => Promise<boolean>;
  onAdminUpdateExpo: (
    expoId: string,
    payload: Partial<Pick<ExpoEvent, 'title' | 'date' | 'endDate' | 'location' | 'description' | 'theme'>>,
  ) => Promise<void>;
  onAdminDeleteExpo: (expoId: string) => Promise<void>;
  onAdminUpdateFeedback: (feedbackId: string, status: 'open' | 'resolved') => Promise<void>;
  onAdminCreateSession: (payload: {
    expoId: string;
    title: string;
    speaker: string;
    speakerRole: string;
    topic: string;
    startTime: string;
    endTime: string;
    location: string;
    capacity: number;
  }) => Promise<boolean>;
  onAdminUpdateSession: (
    sessionId: string,
    payload: Partial<Pick<ExpoSession, 'startTime' | 'location' | 'title' | 'speaker'>>,
  ) => Promise<void>;
  onAdminDeleteSession: (sessionId: string) => Promise<void>;
  onSendMessage: (channel: string, label: string, body: string) => Promise<boolean>;
}

const CATEGORIES: Array<'All' | ExhibitorProfile['category']> = [
  'All',
  'Robotics & AI',
  'Clean Energy',
  'Cloud & Security',
  'Spatial Computing',
  'Biotech & MedTech',
];

const LOGO_SWATCHES = ['#10B981', '#34D399', '#2DD4BF', '#7B5CFF', '#FF6B57', '#F59E0B'];

export const PortalsWorkspace: React.FC<PortalsWorkspaceProps> = ({
  snapshot,
  currentUser,
  activeTab,
  onChangeTab,
  onOpenAuth,
  onInspectBoothOnFloor,
  onRegisterExpo,
  onToggleSessionRegister,
  onToggleSessionBookmark,
  onReserveBooth,
  onReleaseBooth,
  onSubmitApplication,
  onReviewApplication,
  onUpdateExhibitorProfile,
  onAdminUpdateBooth,
  onAdminCreateExpo,
  onAdminUpdateExpo,
  onAdminDeleteExpo,
  onAdminUpdateFeedback,
  onAdminCreateSession,
  onAdminUpdateSession,
  onAdminDeleteSession,
  onSendMessage,
}) => {
  const [exhSearch, setExhSearch] = useState('');
  const [exhCategory, setExhCategory] = useState<'All' | ExhibitorProfile['category']>('All');
  const [inquiryExhibitorId, setInquiryExhibitorId] = useState<string | null>(null);
  const [inquiryBody, setInquiryBody] = useState('');

  const myExhibitor = useMemo(
    () =>
      currentUser
        ? snapshot.exhibitors.find((e) => e.userId === currentUser.id) || null
        : null,
    [snapshot.exhibitors, currentUser],
  );
  const [appCompany, setAppCompany] = useState('');
  const [appCategory, setAppCategory] = useState<ExhibitorProfile['category']>('Robotics & AI');
  const [appSummary, setAppSummary] = useState('');
  const [appDocs, setAppDocs] = useState('Safety-Compliance.pdf, Power-Load-Plan.pdf');

  const [editCompanyName, setEditCompanyName] = useState('');
  const [editTagline, setEditTagline] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editWebsite, setEditWebsite] = useState('');
  const [editLogoColor, setEditLogoColor] = useState('#10B981');
  const [editProducts, setEditProducts] = useState('');
  const [editStaff, setEditStaff] = useState('');

  React.useEffect(() => {
    if (myExhibitor) {
      setEditCompanyName(myExhibitor.companyName);
      setEditTagline(myExhibitor.tagline);
      setEditDesc(myExhibitor.description);
      setEditEmail(myExhibitor.contactEmail);
      setEditWebsite(myExhibitor.website);
      setEditLogoColor(myExhibitor.logoColor || '#10B981');
      setEditProducts(myExhibitor.products.join(', '));
      setEditStaff(myExhibitor.staff.join(', '));
    }
  }, [myExhibitor?.id]);

  const [chatChannel, setChatChannel] = useState('organizer');
  const [chatBody, setChatBody] = useState('');

  const [rejectReasonMap, setRejectReasonMap] = useState<Record<string, string>>({});
  const [newExpoTitle, setNewExpoTitle] = useState('');
  const [newExpoDate, setNewExpoDate] = useState('2026-12-15');
  const [newExpoLocation, setNewExpoLocation] = useState('Marina Bay Sands · Hall B');
  const [newExpoTheme, setNewExpoTheme] = useState('Industrial Automation');

  const [editingExpoId, setEditingExpoId] = useState<string | null>(null);
  const [editExpoTitle, setEditExpoTitle] = useState('');
  const [editExpoDate, setEditExpoDate] = useState('');
  const [editExpoLocation, setEditExpoLocation] = useState('');
  const [editExpoTheme, setEditExpoTheme] = useState('');

  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editSesTitle, setEditSesTitle] = useState('');
  const [editSesSpeaker, setEditSesSpeaker] = useState('');
  const [editSesStart, setEditSesStart] = useState('');
  const [editSesLocation, setEditSesLocation] = useState('');

  const [newSesTitle, setNewSesTitle] = useState('');
  const [newSesSpeaker, setNewSesSpeaker] = useState('');
  const [newSesStart, setNewSesStart] = useState('16:30');
  const [newSesLocation, setNewSesLocation] = useState('Main Keynote Stage');

  const [selectedAdminBoothId, setSelectedAdminBoothId] = useState(snapshot.booths[0]?.id || 'booth-A1');
  const adminBooth = snapshot.booths.find((b) => b.id === selectedAdminBoothId) || snapshot.booths[0];

  const filteredExhibitors = useMemo(() => {
    const q = exhSearch.trim().toLowerCase();
    return snapshot.exhibitors.filter((ex) => {
      if (exhCategory !== 'All' && ex.category !== exhCategory) return false;
      if (!q) return true;
      return (
        ex.companyName.toLowerCase().includes(q) ||
        ex.tagline.toLowerCase().includes(q) ||
        ex.products.some((p) => p.toLowerCase().includes(q))
      );
    });
  }, [snapshot.exhibitors, exhSearch, exhCategory]);

  const cardClass =
    'surface-luxe rounded-2xl border border-[#10B981]/20 bg-white p-5 dark:border-[#10B981]/22 dark:bg-[#09120D]';

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    if (!chatBody.trim()) return;
    const label =
      chatChannel === 'organizer'
        ? 'Organizer Desk'
        : snapshot.exhibitors.find((ex) => ex.id === chatChannel)?.companyName || 'Expo Channel';
    const ok = await onSendMessage(chatChannel, label, chatBody.trim());
    if (ok) setChatBody('');
  };

  return (
    <div className="relative z-20 min-h-screen bg-gradient-to-b from-[#F4F7F5]/97 via-[#EFF5F1]/97 to-[#E6EFE9]/97 px-4 pt-24 pb-16 text-[#09140E] dark:bg-gradient-to-b dark:from-[#040705]/97 dark:via-[#060E09]/97 dark:to-[#030604]/97 dark:text-[#ECFDF5] sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="mx-auto max-w-7xl space-y-6"
      >
        {/* Header + Role Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#10B981]/18 pb-5 dark:border-[#10B981]/20">
          <div>
            <p className="font-mono text-xs font-semibold tracking-wider text-[#059669] dark:text-[#34D399]">
              Multi-Stakeholder Live Workspace
            </p>
            <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
              EventSphere Role Portals
            </h1>
            <p className="mt-1 text-sm text-[#466153] dark:text-[#8EAD9E]">
              {currentUser
                ? `Signed in as ${currentUser.name} (${currentUser.role}) · Real-time Socket.io connected`
                : 'Browsing live hall state · Sign in to reserve booths, approve applications, or message teams.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                { id: 'attendee', label: 'Attendee Hub', bg: 'linear-gradient(135deg, #059669, #34D399)', ink: '#02120B' },
                { id: 'exhibitor', label: 'Exhibitor Portal', bg: 'linear-gradient(135deg, #EA580C, #F97362)', ink: '#1A0B09' },
                { id: 'admin', label: 'Organizer Admin', bg: 'linear-gradient(135deg, #10B981, #2DD4BF)', ink: '#02120B' },
              ] as const
            ).map((t) => {
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onChangeTab(t.id)}
                  className={`inline-flex min-h-[40px] items-center gap-2 rounded-xl border px-4 py-2 text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                    active
                      ? 'border-transparent shadow-sm shadow-[#10B981]/25'
                      : 'border-[#10B981]/22 bg-white text-[#466153] hover:border-[#10B981] dark:border-[#10B981]/22 dark:bg-[#09120D] dark:text-[#C4DFD1]'
                  }`}
                  style={active ? { backgroundImage: t.bg, color: t.ink } : undefined}
                >
                  <span>{t.label}</span>
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => onOpenAuth(activeTab === 'exhibitor' ? 'exhibitor' : 'attendee')}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[#10B981]/25 bg-white px-3.5 py-2 text-xs font-semibold hover:border-[#34D399] dark:border-[#10B981]/25 dark:bg-[#060B08] whitespace-nowrap shrink-0"
            >
              <UserCheck className="h-3.5 w-3.5 text-[#34D399]" />
              <span>{currentUser ? 'Switch Role / Account' : 'Sign In / Demo Role'}</span>
            </button>
          </div>
        </div>

        {/* ==================== ATTENDEE HUB ==================== */}
        {activeTab === 'attendee' && (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              {snapshot.expos.map((expo) => {
                const isRegistered = currentUser ? expo.registeredUserIds.includes(currentUser.id) : false;
                return (
                  <div key={expo.id} className={cardClass}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="font-mono text-xs font-semibold text-[#059669] dark:text-[#34D399]">
                          {expo.date} → {expo.endDate} · {expo.location}
                        </span>
                        <h2 className="mt-1 font-display text-xl font-bold">{expo.title}</h2>
                        <p className="mt-1 text-xs text-[#466153] dark:text-[#8EAD9E]">
                          {expo.description}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          currentUser ? onRegisterExpo(expo.id) : onOpenAuth('attendee')
                        }
                        className={`btn-luxe shrink-0 rounded-lg px-3.5 py-2 text-xs font-bold whitespace-nowrap ${
                          isRegistered
                            ? 'border border-[#34D399] bg-[#34D399]/14 text-emerald-900 dark:text-[#34D399]'
                            : 'bg-gradient-to-r from-[#059669] to-[#34D399] text-[#02120B]'
                        }`}
                      >
                        {isRegistered ? 'Registered' : 'Register Expo'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="grid gap-6 lg:grid-cols-12">
              <div className={`${cardClass} lg:col-span-7`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 font-display text-lg font-bold">
                    <Building2 className="h-4 w-4 text-[#F97362]" />
                    <span>Exhibitor Directory ({filteredExhibitors.length})</span>
                  </div>
                  <input
                    type="text"
                    value={exhSearch}
                    onChange={(e) => setExhSearch(e.target.value)}
                    placeholder="Filter by product or company..."
                    className="w-full rounded-lg border border-[#10B981]/25 bg-[#E8EFEA] px-3 py-1.5 text-xs focus:border-[#10B981] focus:outline-none dark:border-[#10B981]/20 dark:bg-[#040705] sm:w-56"
                  />
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setExhCategory(cat)}
                      className={`rounded-md border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                        exhCategory === cat
                          ? 'border-[#10B981] bg-gradient-to-r from-[#059669] to-[#34D399] text-[#02120B]'
                          : 'border-[#10B981]/18 bg-[#E8EFEA] text-[#466153] dark:border-[#10B981]/18 dark:bg-[#040705] dark:text-[#8EAD9E]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="mt-4 space-y-3">
                  {filteredExhibitors.map((ex) => {
                    const assignedBooth = snapshot.booths.find((b) => b.exhibitorId === ex.id);
                    const isInquiryOpen = inquiryExhibitorId === ex.id;
                    return (
                      <div
                        key={ex.id}
                        className="rounded-xl border border-[#10B981]/18 bg-[#E8EFEA]/80 p-3.5 dark:border-[#10B981]/18 dark:bg-[#040705]"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span
                                className="inline-block h-2.5 w-2.5 shrink-0 rounded-xs"
                                style={{ backgroundColor: ex.logoColor }}
                              />
                              <h3 className="truncate font-display text-sm font-bold">{ex.companyName}</h3>
                              <span className="font-mono text-[11px] text-[#466153] dark:text-[#8EAD9E]">
                                · {ex.category}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-[#466153] dark:text-[#8EAD9E]">{ex.tagline}</p>
                            <div className="mt-1.5 text-[11px] text-[#466153] dark:text-[#8EAD9E]">
                              {ex.products.join(' · ')}
                              {ex.contactEmail && ` · ${ex.contactEmail}`}
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setInquiryExhibitorId(isInquiryOpen ? null : ex.id)}
                              className="inline-flex items-center gap-1 rounded-lg border border-[#10B981]/30 bg-white px-2.5 py-1.5 text-xs font-semibold text-[#09140E] hover:border-[#34D399] dark:bg-[#09120D] dark:text-[#ECFDF5] whitespace-nowrap"
                            >
                              <Send className="h-3 w-3 text-[#10B981] dark:text-[#34D399]" />
                              <span>{isInquiryOpen ? 'Close' : 'Inquire / Book'}</span>
                            </button>
                            {assignedBooth && (
                              <button
                                type="button"
                                onClick={() => onInspectBoothOnFloor(assignedBooth.id)}
                                className="btn-luxe inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-[#059669] to-[#34D399] px-3 py-1.5 text-xs font-bold text-[#02120B] whitespace-nowrap"
                              >
                                <MapPin className="h-3.5 w-3.5" />
                                <span>Booth {assignedBooth.number}</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {isInquiryOpen && (
                          <form
                            onSubmit={async (e) => {
                              e.preventDefault();
                              if (!currentUser) {
                                onOpenAuth('attendee');
                                return;
                              }
                              if (!inquiryBody.trim()) return;
                              const ok = await onSendMessage(ex.id, ex.companyName, inquiryBody.trim());
                              if (ok) {
                                setInquiryBody('');
                                setInquiryExhibitorId(null);
                              }
                            }}
                            className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#10B981]/15 pt-3"
                          >
                            <input
                              type="text"
                              value={inquiryBody}
                              onChange={(e) => setInquiryBody(e.target.value)}
                              placeholder={`Request demo slot or ask ${ex.companyName}...`}
                              className="min-w-[200px] flex-1 rounded-lg border border-[#10B981]/25 bg-white px-3 py-1.5 text-xs dark:bg-[#09120D]"
                            />
                            <button
                              type="submit"
                              className="btn-luxe rounded-lg bg-gradient-to-r from-[#059669] to-[#34D399] px-3 py-1.5 text-xs font-bold text-[#02120B]"
                            >
                              Send Inquiry
                            </button>
                            {ex.contactEmail && (
                              <a
                                href={`mailto:${ex.contactEmail}?subject=${encodeURIComponent(`EventSphere Inquiry: ${ex.companyName}`)}`}
                                className="rounded-lg border border-[#10B981]/25 px-2.5 py-1.5 text-xs font-semibold text-[#059669] hover:underline dark:text-[#34D399]"
                              >
                                Email
                              </a>
                            )}
                          </form>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className={`${cardClass} lg:col-span-5`}>
                <div className="flex items-center gap-2 font-display text-lg font-bold">
                  <CalendarClock className="h-4 w-4 text-[#10B981] dark:text-[#34D399]" />
                  <span>Live Session Schedule</span>
                </div>
                <p className="mt-1 text-xs text-[#466153] dark:text-[#8EAD9E]">
                  Time or room updates broadcast from Organizer Admin appear here within 2 seconds.
                </p>

                <div className="mt-4 space-y-3">
                  {snapshot.sessions.map((ses) => {
                    const isReg = currentUser ? ses.registeredUserIds.includes(currentUser.id) : false;
                    const isBm = currentUser ? ses.bookmarkedUserIds.includes(currentUser.id) : false;
                    return (
                      <div
                        key={ses.id}
                        className="rounded-xl border border-[#10B981]/18 bg-[#E8EFEA]/80 p-3.5 dark:border-[#10B981]/18 dark:bg-[#040705]"
                      >
                        <div className="flex items-center justify-between gap-2 font-mono text-[11px] font-semibold text-[#059669] dark:text-[#34D399]">
                          <span>
                            {ses.startTime}–{ses.endTime} · {ses.location}
                          </span>
                          <span>
                            {ses.registeredUserIds.length}/{ses.capacity} seats
                          </span>
                        </div>
                        <h3 className="mt-1 text-sm font-bold">{ses.title}</h3>
                        <p className="text-xs text-[#466153] dark:text-[#8EAD9E]">
                          {ses.speaker} · {ses.speakerRole}
                        </p>
                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              currentUser ? onToggleSessionRegister(ses.id) : onOpenAuth('attendee')
                            }
                            className={`btn-luxe flex-1 rounded-lg py-1.5 text-xs font-bold ${
                              isReg
                                ? 'border border-[#34D399] bg-[#34D399]/14 text-emerald-900 dark:text-[#34D399]'
                                : 'bg-gradient-to-r from-[#059669] to-[#34D399] text-[#02120B]'
                            }`}
                          >
                            {isReg ? 'Seat Reserved' : 'Register Seat'}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              currentUser ? onToggleSessionBookmark(ses.id) : onOpenAuth('attendee')
                            }
                            className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                              isBm
                                ? 'border-[#F97362] bg-[#F97362]/14 text-[#F97362]'
                                : 'border-[#10B981]/25 dark:border-[#10B981]/22'
                            }`}
                          >
                            <Bookmark className="h-3.5 w-3.5" />
                            <span>{isBm ? 'Reminder On' : 'Remind'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== EXHIBITOR PORTAL ==================== */}
        {activeTab === 'exhibitor' && (
          <div className="space-y-6">
            {(!currentUser || (currentUser.role !== 'exhibitor' && currentUser.role !== 'admin')) && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#F97362]/45 bg-[#F97362]/10 px-4 py-3 text-xs">
                <span>
                  Sign in with an <strong>Exhibitor</strong> account to submit applications, edit
                  your showcase, and reserve booths.
                </span>
                <button
                  type="button"
                  onClick={() => onOpenAuth('exhibitor')}
                  className="rounded-lg bg-[#F97362] px-3 py-1.5 font-bold text-[#1A0B09]"
                >
                  Sign In as Exhibitor
                </button>
              </div>
            )}

            <div className="grid gap-6 lg:grid-cols-12">
              <div className={`${cardClass} lg:col-span-7`}>
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-display text-lg font-bold">Live 24-Booth Floor Picker</h2>
                  <span className="font-mono text-xs text-[#34D399]">
                    Click emerald booth to reserve · terracotta to inspect
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {snapshot.booths.map((b) => {
                    const isMine = myExhibitor && b.exhibitorId === myExhibitor.id;
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => onInspectBoothOnFloor(b.id)}
                        className="rounded-xl border border-[#10B981]/20 p-2.5 text-left transition-transform hover:scale-[1.03] dark:border-[#10B981]/22"
                        style={{
                          backgroundColor: `${STATUS_HEX[b.status]}1E`,
                          borderColor: isMine ? '#34D399' : STATUS_HEX[b.status],
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-display text-sm font-extrabold">{b.number}</span>
                          <span
                            className="h-2.5 w-2.5 rounded-xs"
                            style={{ backgroundColor: STATUS_HEX[b.status] }}
                          />
                        </div>
                        <div className="mt-1 truncate text-[10px] font-medium">
                          {b.exhibitorName || b.status.toUpperCase()}
                        </div>
                        <div className="font-mono text-[10px] opacity-80">
                          ${b.priceUsd.toLocaleString()}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-5 border-t border-[#10B981]/18 pt-4 dark:border-[#10B981]/20">
                  <div className="text-xs font-semibold text-[#466153] dark:text-[#8EAD9E]">
                    Your Assigned Booths &amp; Quick Reservation
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {snapshot.booths
                      .filter((b) => myExhibitor && b.exhibitorId === myExhibitor.id)
                      .map((b) => (
                        <div
                          key={b.id}
                          className="inline-flex items-center gap-2 rounded-lg border border-[#34D399]/50 bg-[#34D399]/12 px-3 py-1.5 text-xs"
                        >
                          <span className="font-bold">Booth {b.number} ({b.zone})</span>
                          <button
                            type="button"
                            onClick={() => onReleaseBooth(b.id)}
                            className="font-semibold text-[#F97362] hover:underline"
                          >
                            Release
                          </button>
                        </div>
                      ))}

                    {snapshot.booths
                      .filter((b) => b.status === 'available')
                      .slice(0, 3)
                      .map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() =>
                            currentUser ? onReserveBooth(b.id) : onOpenAuth('exhibitor')
                          }
                          className="btn-luxe rounded-lg bg-gradient-to-r from-[#059669] to-[#34D399] px-3 py-1.5 text-xs font-bold text-[#02120B]"
                        >
                          Reserve {b.number} (${b.priceUsd})
                        </button>
                      ))}
                  </div>
                </div>
              </div>

              <div className={`${cardClass} lg:col-span-5`}>
                <h2 className="font-display text-lg font-bold">Apply to Expo &amp; Track Status</h2>
                <div className="mt-3 space-y-2">
                  {snapshot.applications.map((a) => (
                    <div
                      key={a.id}
                      className="rounded-xl border border-[#10B981]/18 bg-[#E8EFEA]/80 p-3 text-xs dark:border-[#10B981]/18 dark:bg-[#040705]"
                    >
                      <div className="flex items-center justify-between gap-2 font-bold">
                        <span>{a.companyName}</span>
                        <span
                          className="font-mono uppercase"
                          style={{
                            color:
                              a.status === 'approved'
                                ? '#34D399'
                                : a.status === 'rejected'
                                  ? '#F97362'
                                  : '#2DD4BF',
                          }}
                        >
                          {a.status}
                        </span>
                      </div>
                      <p className="mt-1 text-[#466153] dark:text-[#8EAD9E]">{a.productsSummary}</p>
                      {a.rejectionReason && (
                        <p className="mt-1 text-[#F97362]">Reason: {a.rejectionReason}</p>
                      )}
                    </div>
                  ))}
                </div>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!currentUser) {
                      onOpenAuth('exhibitor');
                      return;
                    }
                    const ok = await onSubmitApplication({
                      expoId: snapshot.expos[0]?.id || 'expo-2026-global',
                      companyName: appCompany,
                      category: appCategory,
                      productsSummary: appSummary,
                      documents: appDocs
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    });
                    if (ok) {
                      setAppCompany('');
                      setAppSummary('');
                    }
                  }}
                  className="mt-4 space-y-2.5 border-t border-[#10B981]/18 pt-4 dark:border-[#10B981]/20"
                >
                  <div className="text-xs font-semibold text-[#466153] dark:text-[#8EAD9E]">
                    Submit New Application
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input
                      type="text"
                      required
                      value={appCompany}
                      onChange={(e) => setAppCompany(e.target.value)}
                      placeholder="Company Name"
                      className="rounded-lg border border-[#10B981]/25 bg-white px-3 py-2 text-xs dark:border-[#10B981]/20 dark:bg-[#040705]"
                    />
                    <select
                      value={appCategory}
                      onChange={(e) => setAppCategory(e.target.value as ExhibitorProfile['category'])}
                      className="rounded-lg border border-[#10B981]/25 bg-white px-3 py-2 text-xs dark:border-[#10B981]/20 dark:bg-[#040705]"
                    >
                      {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <input
                    type="text"
                    required
                    value={appSummary}
                    onChange={(e) => setAppSummary(e.target.value)}
                    placeholder="Products & live booth demo plan..."
                    className="w-full rounded-lg border border-[#10B981]/25 bg-white px-3 py-2 text-xs dark:border-[#10B981]/20 dark:bg-[#040705]"
                  />
                  <input
                    type="text"
                    value={appDocs}
                    onChange={(e) => setAppDocs(e.target.value)}
                    placeholder="Documents (comma separated filenames)"
                    className="w-full rounded-lg border border-[#10B981]/25 bg-white px-3 py-2 font-mono text-[11px] dark:border-[#10B981]/20 dark:bg-[#040705]"
                  />
                  <button
                    type="submit"
                    className="btn-luxe w-full rounded-lg bg-[#F97362] py-2 text-xs font-bold text-[#1A0B09]"
                  >
                    Submit Exhibitor Application
                  </button>
                </form>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className={cardClass}>
                <h2 className="font-display text-lg font-bold">Manage Exhibitor Booth Showcase</h2>
                {myExhibitor ? (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      await onUpdateExhibitorProfile(myExhibitor.id, {
                        companyName: editCompanyName,
                        tagline: editTagline,
                        description: editDesc,
                        contactEmail: editEmail,
                        website: editWebsite,
                        logoColor: editLogoColor,
                        products: editProducts
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean),
                        staff: editStaff
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean),
                      });
                    }}
                    className="mt-3 space-y-2.5"
                  >
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input
                        type="text"
                        value={editCompanyName}
                        onChange={(e) => setEditCompanyName(e.target.value)}
                        placeholder="Company Name"
                        className="rounded-lg border border-[#10B981]/25 bg-white px-3 py-2 text-xs dark:border-[#10B981]/20 dark:bg-[#040705]"
                      />
                      <input
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        placeholder="Contact Email"
                        className="rounded-lg border border-[#10B981]/25 bg-white px-3 py-2 text-xs dark:border-[#10B981]/20 dark:bg-[#040705]"
                      />
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input
                        type="text"
                        value={editWebsite}
                        onChange={(e) => setEditWebsite(e.target.value)}
                        placeholder="Website URL (https://...)"
                        className="rounded-lg border border-[#10B981]/25 bg-white px-3 py-2 text-xs dark:border-[#10B981]/20 dark:bg-[#040705]"
                      />
                      <div className="flex items-center gap-2 rounded-lg border border-[#10B981]/25 bg-white px-3 py-1.5 dark:border-[#10B981]/20 dark:bg-[#040705]">
                        <span className="text-[11px] text-[#466153] dark:text-[#8EAD9E]">Logo Mark:</span>
                        <div className="flex items-center gap-1.5">
                          {LOGO_SWATCHES.map((hex) => (
                            <button
                              key={hex}
                              type="button"
                              onClick={() => setEditLogoColor(hex)}
                              aria-label={`Select brand color ${hex}`}
                              className={`h-4 w-4 rounded-xs border ${
                                editLogoColor === hex ? 'border-white scale-110 ring-1 ring-[#34D399]' : 'border-transparent'
                              }`}
                              style={{ backgroundColor: hex }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <input
                      type="text"
                      value={editTagline}
                      onChange={(e) => setEditTagline(e.target.value)}
                      placeholder="Tagline"
                      className="w-full rounded-lg border border-[#10B981]/25 bg-white px-3 py-2 text-xs dark:border-[#10B981]/20 dark:bg-[#040705]"
                    />
                    <textarea
                      rows={2}
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      placeholder="Booth description"
                      className="w-full rounded-lg border border-[#10B981]/25 bg-white px-3 py-2 text-xs dark:border-[#10B981]/20 dark:bg-[#040705]"
                    />
                    <input
                      type="text"
                      value={editProducts}
                      onChange={(e) => setEditProducts(e.target.value)}
                      placeholder="Products (comma separated)"
                      className="w-full rounded-lg border border-[#10B981]/25 bg-white px-3 py-2 text-xs dark:border-[#10B981]/20 dark:bg-[#040705]"
                    />
                    <input
                      type="text"
                      value={editStaff}
                      onChange={(e) => setEditStaff(e.target.value)}
                      placeholder="On-booth staff names (comma separated)"
                      className="w-full rounded-lg border border-[#10B981]/25 bg-white px-3 py-2 text-xs dark:border-[#10B981]/20 dark:bg-[#040705]"
                    />
                    <button
                      type="submit"
                      className="btn-luxe rounded-lg bg-gradient-to-r from-[#059669] to-[#34D399] px-4 py-2 text-xs font-bold text-[#02120B]"
                    >
                      Save Exhibitor Showcase
                    </button>
                  </form>
                ) : (
                  <p className="mt-3 text-xs text-[#466153] dark:text-[#8EAD9E]">
                    Sign in as an Exhibitor to edit your booth showcase, brand mark, contact details, products, and staff roster.
                  </p>
                )}
              </div>

              <div className={cardClass}>
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-display text-lg font-bold">Organizer &amp; Neighbor Chat</h2>
                  <select
                    value={chatChannel}
                    onChange={(e) => setChatChannel(e.target.value)}
                    className="rounded-lg border border-[#10B981]/25 bg-[#E8EFEA] px-2.5 py-1 text-xs dark:border-[#10B981]/20 dark:bg-[#040705]"
                  >
                    <option value="organizer">Organizer Desk</option>
                    {snapshot.exhibitors.map((ex) => (
                      <option key={ex.id} value={ex.id}>
                        {ex.companyName}
                      </option>
                    ))}
                  </select>
                </div>

                {chatChannel !== 'organizer' && (() => {
                  const partner = snapshot.exhibitors.find((ex) => ex.id === chatChannel);
                  return partner ? (
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#10B981]/18 bg-[#E8EFEA]/60 px-3 py-1.5 font-mono text-[11px] dark:bg-[#040705]">
                      <span>Contact: {partner.contactEmail}</span>
                      {partner.website && (
                        <span className="text-[#059669] dark:text-[#34D399]">
                          {partner.website.replace(/^https?:\/\//, '')}
                        </span>
                      )}
                    </div>
                  ) : null;
                })()}

                <div className="mt-3 max-h-48 space-y-2 overflow-y-auto">
                  {snapshot.messages
                    .filter((m) => m.recipientChannel === chatChannel)
                    .slice(-8)
                    .map((m) => (
                      <div
                        key={m.id}
                        className="rounded-xl border border-[#10B981]/18 bg-[#E8EFEA]/80 p-2.5 text-xs dark:border-[#10B981]/18 dark:bg-[#040705]"
                      >
                        <div className="flex justify-between font-semibold">
                          <span>{m.senderName}</span>
                          <span className="font-mono text-[10px] opacity-70">{m.senderRole}</span>
                        </div>
                        <p className="mt-1 text-[#466153] dark:text-[#C4DFD1]">{m.body}</p>
                      </div>
                    ))}
                </div>

                <form onSubmit={handleChatSubmit} className="mt-3 flex gap-2">
                  <input
                    type="text"
                    value={chatBody}
                    onChange={(e) => setChatBody(e.target.value)}
                    placeholder="Send real-time message..."
                    className="flex-1 rounded-lg border border-[#10B981]/25 bg-white px-3 py-2 text-xs dark:border-[#10B981]/20 dark:bg-[#040705]"
                  />
                  <button
                    type="submit"
                    className="btn-luxe inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-[#059669] to-[#34D399] px-3.5 py-2 text-xs font-bold text-[#02120B]"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>Send</span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* ==================== ORGANIZER ADMIN ==================== */}
        {activeTab === 'admin' && (
          <div className="space-y-6">
            {(!currentUser || currentUser.role !== 'admin') && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#10B981]/40 bg-[#10B981]/10 px-4 py-3 text-xs">
                <span className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-[#10B981] dark:text-[#34D399]" />
                  <span>
                    Sign in as <strong>Organizer Admin</strong> to create expos, approve/reject
                    exhibitor applications, reassign booths, and push live schedule edits.
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => onOpenAuth()}
                  className="rounded-lg bg-gradient-to-r from-[#059669] to-[#34D399] px-3 py-1.5 font-bold text-[#02120B]"
                >
                  Sign In as Organizer
                </button>
              </div>
            )}

            <div className="grid gap-6 lg:grid-cols-12">
              <div className={`${cardClass} lg:col-span-6`}>
                <div className="flex items-center gap-2 font-display text-lg font-bold">
                  <ClipboardCheck className="h-4 w-4 text-[#10B981] dark:text-[#34D399]" />
                  <span>Exhibitor Applications ({snapshot.applications.length})</span>
                </div>
                <div className="mt-4 space-y-3">
                  {snapshot.applications.map((a) => (
                    <div
                      key={a.id}
                      className="rounded-xl border border-[#10B981]/18 bg-[#E8EFEA]/80 p-3.5 dark:border-[#10B981]/18 dark:bg-[#040705]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-display text-sm font-bold">{a.companyName}</span>
                        <span className="font-mono text-[11px] uppercase text-[#059669] dark:text-[#34D399]">
                          {a.status} · {a.submittedAt}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[#466153] dark:text-[#8EAD9E]">
                        {a.productsSummary}
                      </p>
                      <div className="mt-1 font-mono text-[10px] text-[#466153] dark:text-[#8EAD9E]">
                        Docs: {a.documents.join(', ')}
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onReviewApplication(a.id, 'approved')}
                          className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-[#059669] to-[#34D399] px-3 py-1.5 text-xs font-bold text-[#02120B]"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Approve</span>
                        </button>
                        <input
                          type="text"
                          value={rejectReasonMap[a.id] || ''}
                          onChange={(e) =>
                            setRejectReasonMap((prev) => ({ ...prev, [a.id]: e.target.value }))
                          }
                          placeholder="Rejection reason..."
                          className="flex-1 rounded-lg border border-[#10B981]/25 bg-white px-2.5 py-1 text-xs dark:border-[#10B981]/20 dark:bg-[#09120D]"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            onReviewApplication(
                              a.id,
                              'rejected',
                              rejectReasonMap[a.id] || 'Floor space allocation full',
                            )
                          }
                          className="inline-flex items-center gap-1 rounded-lg bg-[#F97362] px-3 py-1.5 text-xs font-bold text-[#1A0B09]"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          <span>Reject</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className={`${cardClass} lg:col-span-6`}>
                <h2 className="font-display text-lg font-bold">Booth Space Allocator</h2>
                {adminBooth && (
                  <div className="mt-3 space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="text-xs font-medium">Select Booth</label>
                        <select
                          value={adminBooth.id}
                          onChange={(e) => setSelectedAdminBoothId(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-[#10B981]/25 bg-[#E8EFEA] px-3 py-2 text-xs dark:border-[#10B981]/20 dark:bg-[#040705]"
                        >
                          {snapshot.booths.map((b) => (
                            <option key={b.id} value={b.id}>
                              Booth {b.number} ({b.status}) — {b.exhibitorName || 'Unassigned'}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium">Assign Exhibitor</label>
                        <select
                          value={adminBooth.exhibitorId || ''}
                          onChange={(e) =>
                            onAdminUpdateBooth(adminBooth.id, {
                              exhibitorId: e.target.value || null,
                            })
                          }
                          className="mt-1 w-full rounded-lg border border-[#10B981]/25 bg-[#E8EFEA] px-3 py-2 text-xs dark:border-[#10B981]/20 dark:bg-[#040705]"
                        >
                          <option value="">Unassigned (Available)</option>
                          {snapshot.exhibitors.map((ex) => (
                            <option key={ex.id} value={ex.id}>
                              {ex.companyName}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <div>
                        <label className="text-xs font-medium">Status</label>
                        <select
                          value={adminBooth.status}
                          onChange={(e) =>
                            onAdminUpdateBooth(adminBooth.id, {
                              status: e.target.value as ExpoBooth['status'],
                            })
                          }
                          className="mt-1 w-full rounded-lg border border-[#10B981]/25 bg-[#E8EFEA] px-3 py-2 text-xs dark:border-[#10B981]/20 dark:bg-[#040705]"
                        >
                          <option value="available">Available</option>
                          <option value="reserved">Reserved</option>
                          <option value="pending">Pending</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium">Dimensions</label>
                        <select
                          value={adminBooth.size}
                          onChange={(e) =>
                            onAdminUpdateBooth(adminBooth.id, {
                              size: e.target.value as ExpoBooth['size'],
                            })
                          }
                          className="mt-1 w-full rounded-lg border border-[#10B981]/25 bg-[#E8EFEA] px-3 py-2 text-xs dark:border-[#10B981]/20 dark:bg-[#040705]"
                        >
                          <option value="3x3m Standard">3x3m Standard</option>
                          <option value="6x3m Corner">6x3m Corner</option>
                          <option value="6x6m Island">6x6m Island</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium">Price (USD)</label>
                        <input
                          type="number"
                          value={adminBooth.priceUsd}
                          onChange={(e) =>
                            onAdminUpdateBooth(adminBooth.id, {
                              priceUsd: Number(e.target.value) || 2800,
                            })
                          }
                          className="mt-1 w-full rounded-lg border border-[#10B981]/25 bg-[#E8EFEA] px-3 py-2 font-mono text-xs dark:border-[#10B981]/20 dark:bg-[#040705]"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onInspectBoothOnFloor(adminBooth.id)}
                      className="btn-luxe inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#059669] to-[#34D399] px-3.5 py-2 text-xs font-bold text-[#02120B]"
                    >
                      <MapPin className="h-3.5 w-3.5" />
                      <span>Locate Booth {adminBooth.number} on 3D Hall</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-12">
              <div className={`${cardClass} lg:col-span-7`}>
                <h2 className="font-display text-lg font-bold">Real-Time Schedule Publisher</h2>
                <div className="mt-3 space-y-2.5">
                  {snapshot.sessions.map((s) => (
                    <div
                      key={s.id}
                      className="rounded-xl border border-[#10B981]/18 bg-[#E8EFEA]/80 p-3 text-xs dark:border-[#10B981]/18 dark:bg-[#040705]"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="font-bold">{s.title}</div>
                          <div className="font-mono text-[11px] text-[#466153] dark:text-[#8EAD9E]">
                            {s.startTime} · {s.location} · {s.speaker}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              if (editingSessionId === s.id) {
                                setEditingSessionId(null);
                              } else {
                                setEditingSessionId(s.id);
                                setEditSesTitle(s.title);
                                setEditSesSpeaker(s.speaker);
                                setEditSesStart(s.startTime);
                                setEditSesLocation(s.location);
                              }
                            }}
                            className="rounded-lg border border-[#10B981]/30 px-2.5 py-1 text-[11px] font-semibold hover:border-[#34D399]"
                          >
                            {editingSessionId === s.id ? 'Cancel' : 'Edit'}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onAdminUpdateSession(s.id, {
                                startTime: s.startTime === '09:30' ? '10:00' : '09:30',
                                location:
                                  s.location === 'Main Keynote Stage'
                                    ? 'Grand Arena Hall A'
                                    : 'Main Keynote Stage',
                              })
                            }
                            className="rounded-lg border border-[#10B981]/45 bg-[#10B981]/14 px-2.5 py-1 text-[11px] font-semibold text-[#059669] dark:text-[#34D399]"
                          >
                            Broadcast Time/Room Shift
                          </button>
                          <button
                            type="button"
                            onClick={() => onAdminDeleteSession(s.id)}
                            aria-label={`Delete ${s.title}`}
                            className="rounded-lg border border-[#10B981]/20 p-1.5 text-[#466153] hover:text-[#F97362] dark:border-[#10B981]/22"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {editingSessionId === s.id && (
                        <form
                          onSubmit={async (e) => {
                            e.preventDefault();
                            await onAdminUpdateSession(s.id, {
                              title: editSesTitle,
                              speaker: editSesSpeaker,
                              startTime: editSesStart,
                              location: editSesLocation,
                            });
                            setEditingSessionId(null);
                          }}
                          className="mt-2.5 grid gap-2 border-t border-[#10B981]/15 pt-2.5 sm:grid-cols-4"
                        >
                          <input
                            type="text"
                            required
                            value={editSesTitle}
                            onChange={(e) => setEditSesTitle(e.target.value)}
                            className="rounded-lg border border-[#10B981]/25 bg-white px-2 py-1.5 text-xs dark:bg-[#09120D] sm:col-span-2"
                          />
                          <input
                            type="text"
                            required
                            value={editSesSpeaker}
                            onChange={(e) => setEditSesSpeaker(e.target.value)}
                            className="rounded-lg border border-[#10B981]/25 bg-white px-2 py-1.5 text-xs dark:bg-[#09120D]"
                          />
                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              required
                              value={editSesStart}
                              onChange={(e) => setEditSesStart(e.target.value)}
                              className="w-16 rounded-lg border border-[#10B981]/25 bg-white px-2 py-1.5 font-mono text-xs dark:bg-[#09120D]"
                            />
                            <button
                              type="submit"
                              className="flex-1 rounded-lg bg-gradient-to-r from-[#059669] to-[#34D399] px-2.5 py-1.5 text-xs font-bold text-[#02120B]"
                            >
                              Save
                            </button>
                          </div>
                          <input
                            type="text"
                            required
                            value={editSesLocation}
                            onChange={(e) => setEditSesLocation(e.target.value)}
                            placeholder="Room / Stage"
                            className="rounded-lg border border-[#10B981]/25 bg-white px-2 py-1.5 text-xs dark:bg-[#09120D] sm:col-span-4"
                          />
                        </form>
                      )}
                    </div>
                  ))}
                </div>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const ok = await onAdminCreateSession({
                      expoId: snapshot.expos[0]?.id || 'expo-2026-global',
                      title: newSesTitle,
                      speaker: newSesSpeaker,
                      speakerRole: 'Featured Speaker',
                      topic: 'Live Demo',
                      startTime: newSesStart,
                      endTime: newSesStart,
                      location: newSesLocation,
                      capacity: 150,
                    });
                    if (ok) {
                      setNewSesTitle('');
                      setNewSesSpeaker('');
                    }
                  }}
                  className="mt-4 grid gap-2 border-t border-[#10B981]/18 pt-4 dark:border-[#10B981]/20 sm:grid-cols-4"
                >
                  <input
                    type="text"
                    required
                    value={newSesTitle}
                    onChange={(e) => setNewSesTitle(e.target.value)}
                    placeholder="New Session Title"
                    className="rounded-lg border border-[#10B981]/25 bg-white px-2.5 py-2 text-xs dark:border-[#10B981]/20 dark:bg-[#040705] sm:col-span-2"
                  />
                  <input
                    type="text"
                    required
                    value={newSesSpeaker}
                    onChange={(e) => setNewSesSpeaker(e.target.value)}
                    placeholder="Speaker Name"
                    className="rounded-lg border border-[#10B981]/25 bg-white px-2.5 py-2 text-xs dark:border-[#10B981]/20 dark:bg-[#040705]"
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={newSesStart}
                      onChange={(e) => setNewSesStart(e.target.value)}
                      className="w-20 rounded-lg border border-[#10B981]/25 bg-white px-2 py-2 font-mono text-xs dark:border-[#10B981]/20 dark:bg-[#040705]"
                    />
                    <button
                      type="submit"
                      className="btn-luxe flex-1 rounded-lg bg-gradient-to-r from-[#059669] to-[#34D399] px-3 py-2 text-xs font-bold text-[#02120B]"
                    >
                      <Plus className="mx-auto h-4 w-4" />
                    </button>
                  </div>
                </form>
              </div>

              <div className={`${cardClass} lg:col-span-5`}>
                <h2 className="font-display text-lg font-bold">Expos, Support Queue &amp; Audit Log</h2>
                <div className="mt-3 space-y-2">
                  {snapshot.expos.map((ex) => (
                    <div
                      key={ex.id}
                      className="rounded-lg border border-[#10B981]/18 bg-[#E8EFEA]/80 px-3 py-2 text-xs dark:border-[#10B981]/18 dark:bg-[#040705]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="font-bold">{ex.title}</div>
                          <div className="font-mono text-[10px] text-[#466153] dark:text-[#8EAD9E]">
                            {ex.date} · {ex.location}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              if (editingExpoId === ex.id) {
                                setEditingExpoId(null);
                              } else {
                                setEditingExpoId(ex.id);
                                setEditExpoTitle(ex.title);
                                setEditExpoDate(ex.date);
                                setEditExpoLocation(ex.location);
                                setEditExpoTheme(ex.theme);
                              }
                            }}
                            className="rounded border border-[#10B981]/30 px-2 py-0.5 text-[10px] font-semibold hover:border-[#34D399]"
                          >
                            {editingExpoId === ex.id ? 'Cancel' : 'Edit'}
                          </button>
                          {snapshot.expos.length > 1 && (
                            <button
                              type="button"
                              onClick={() => onAdminDeleteExpo(ex.id)}
                              className="text-[#466153] hover:text-[#F97362]"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {editingExpoId === ex.id && (
                        <form
                          onSubmit={async (e) => {
                            e.preventDefault();
                            await onAdminUpdateExpo(ex.id, {
                              title: editExpoTitle,
                              date: editExpoDate,
                              location: editExpoLocation,
                              theme: editExpoTheme,
                            });
                            setEditingExpoId(null);
                          }}
                          className="mt-2 space-y-1.5 border-t border-[#10B981]/15 pt-2"
                        >
                          <input
                            type="text"
                            required
                            value={editExpoTitle}
                            onChange={(e) => setEditExpoTitle(e.target.value)}
                            className="w-full rounded border border-[#10B981]/25 bg-white px-2 py-1 text-xs dark:bg-[#09120D]"
                          />
                          <div className="grid grid-cols-2 gap-1.5">
                            <input
                              type="date"
                              value={editExpoDate}
                              onChange={(e) => setEditExpoDate(e.target.value)}
                              className="rounded border border-[#10B981]/25 bg-white px-2 py-1 font-mono text-[11px] dark:bg-[#09120D]"
                            />
                            <input
                              type="text"
                              value={editExpoLocation}
                              onChange={(e) => setEditExpoLocation(e.target.value)}
                              className="rounded border border-[#10B981]/25 bg-white px-2 py-1 text-[11px] dark:bg-[#09120D]"
                            />
                          </div>
                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              value={editExpoTheme}
                              onChange={(e) => setEditExpoTheme(e.target.value)}
                              placeholder="Theme"
                              className="flex-1 rounded border border-[#10B981]/25 bg-white px-2 py-1 text-[11px] dark:bg-[#09120D]"
                            />
                            <button
                              type="submit"
                              className="rounded bg-gradient-to-r from-[#059669] to-[#34D399] px-2.5 py-1 text-[11px] font-bold text-[#02120B]"
                            >
                              Save
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  ))}
                </div>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const ok = await onAdminCreateExpo({
                      title: newExpoTitle,
                      date: newExpoDate,
                      endDate: newExpoDate,
                      location: newExpoLocation,
                      description: 'Live EventSphere managed trade show.',
                      theme: newExpoTheme,
                    });
                    if (ok) setNewExpoTitle('');
                  }}
                  className="mt-3 space-y-2 border-t border-[#10B981]/18 pt-3 dark:border-[#10B981]/20"
                >
                  <input
                    type="text"
                    required
                    value={newExpoTitle}
                    onChange={(e) => setNewExpoTitle(e.target.value)}
                    placeholder="Create New Expo Title..."
                    className="w-full rounded-lg border border-[#10B981]/25 bg-white px-3 py-2 text-xs dark:border-[#10B981]/20 dark:bg-[#040705]"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={newExpoDate}
                      onChange={(e) => setNewExpoDate(e.target.value)}
                      className="rounded-lg border border-[#10B981]/25 bg-white px-2.5 py-1.5 font-mono text-xs dark:border-[#10B981]/20 dark:bg-[#040705]"
                    />
                    <input
                      type="text"
                      value={newExpoLocation}
                      onChange={(e) => setNewExpoLocation(e.target.value)}
                      className="rounded-lg border border-[#10B981]/25 bg-white px-2.5 py-1.5 text-xs dark:border-[#10B981]/20 dark:bg-[#040705]"
                    />
                  </div>
                  <button
                    type="submit"
                    className="btn-luxe w-full rounded-lg bg-gradient-to-r from-[#059669] to-[#34D399] py-2 text-xs font-bold text-[#02120B]"
                  >
                    Publish New Expo
                  </button>
                </form>

                {/* Feedback & Support Queue */}
                <div className="mt-4 border-t border-[#10B981]/18 pt-3 dark:border-[#10B981]/20">
                  <div className="text-[11px] font-semibold text-[#466153] dark:text-[#8EAD9E]">
                    Support &amp; Feedback Queue ({snapshot.feedback.length})
                  </div>
                  <div className="mt-2 max-h-28 space-y-1.5 overflow-y-auto text-[11px]">
                    {snapshot.feedback.slice(0, 5).map((fb) => (
                      <div
                        key={fb.id}
                        className="flex items-center justify-between gap-2 rounded-lg border border-[#10B981]/15 bg-[#E8EFEA]/60 px-2.5 py-1.5 dark:bg-[#040705]"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="font-bold">{fb.userName}</span>{' '}
                          <span className="font-mono text-[10px] text-[#059669] dark:text-[#34D399]">
                            [{fb.category}]
                          </span>
                          <p className="truncate text-[#466153] dark:text-[#8EAD9E]">{fb.message}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            onAdminUpdateFeedback(fb.id, fb.status === 'open' ? 'resolved' : 'open')
                          }
                          className={`shrink-0 rounded px-2 py-0.5 font-mono text-[10px] font-bold uppercase ${
                            fb.status === 'resolved'
                              ? 'bg-[#34D399]/18 text-[#059669] dark:text-[#34D399]'
                              : 'bg-[#F97362]/20 text-[#F97362]'
                          }`}
                        >
                          {fb.status}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 border-t border-[#10B981]/18 pt-3 dark:border-[#10B981]/20">
                  <div className="text-[11px] font-semibold text-[#466153] dark:text-[#8EAD9E]">
                    Recent Activity Logs
                  </div>
                  <div className="mt-2 max-h-28 space-y-1.5 overflow-y-auto font-mono text-[11px]">
                    {snapshot.activityLogs.slice(0, 6).map((log) => (
                      <div key={log.id} className="text-[#466153] dark:text-[#8EAD9E]">
                        <span className="text-[#059669] dark:text-[#34D399]">{log.action}</span> ·{' '}
                        {log.detail}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
