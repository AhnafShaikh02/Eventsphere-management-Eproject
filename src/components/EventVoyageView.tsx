import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Bell,
  Bookmark,
  Cloud,
  Compass,
  Layers,
  MessageSquarePlus,
  Moon,
  Sun,
  UserCheck,
} from 'lucide-react';
import { motion } from 'motion/react';
import type { EventSphereSnapshot, UserAccount, UserRole } from '../types/eventsphere';
import { STATUS_HEX } from '../three/expoModels';
import { PWAInstallButton } from './PWAStatusWidgets';

interface EventVoyageViewProps {
  snapshot: EventSphereSnapshot;
  currentUser: UserAccount | null;
  unreadNotifications: number;
  nightMode: boolean;
  showTrussAndVisitors: boolean;
  favoriteCount: number;
  onToggleNightMode: () => void;
  onToggleTrussAndVisitors: () => void;
  onEnterExplore: () => void;
  onFocusStage: () => void;
  onOpenAnalytics: () => void;
  onOpenPortals: (preferredRole?: UserRole) => void;
  onOpenAuth: (defaultRole?: 'exhibitor' | 'attendee') => void;
  onOpenFavorites: () => void;
  onOpenCloudSync: () => void;
  onOpenNotifications: () => void;
  onSelectBooth: (boothId: string) => void;
}

export const EventVoyageView: React.FC<EventVoyageViewProps> = ({
  snapshot,
  currentUser,
  unreadNotifications,
  nightMode,
  showTrussAndVisitors,
  favoriteCount,
  onToggleNightMode,
  onToggleTrussAndVisitors,
  onEnterExplore,
  onFocusStage,
  onOpenAnalytics,
  onOpenPortals,
  onOpenAuth,
  onOpenFavorites,
  onOpenCloudSync,
  onOpenNotifications,
  onSelectBooth,
}) => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [statSync, setStatSync] = useState(0);
  const [statUsers, setStatUsers] = useState(0);
  const [statUptime, setStatUptime] = useState(0);
  const [statsStarted, setStatsStarted] = useState(false);

  // IntersectionObserver for kinetic masked reveals & tabular counters
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const targets = Array.from(root.querySelectorAll('.rv'));

    if (reduce) {
      targets.forEach((el) => el.classList.add('go'));
      setStatSync(2);
      setStatUsers(300);
      setStatUptime(99);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('go');
            if ((entry.target as HTMLElement).dataset.statsTrigger === 'true') {
              setStatsStarted(true);
            }
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.2 },
    );

    targets.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!statsStarted) return;
    const start = performance.now();
    const duration = 1250;
    let raf = 0;
    const tick = (now: number) => {
      const k = Math.min(1, (now - start) / duration);
      const ease = 1 - Math.pow(1 - k, 3);
      setStatSync(Math.max(1, Math.round(2 * ease)));
      setStatUsers(Math.round(300 * ease));
      setStatUptime(Math.round(99 * ease));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [statsStarted]);

  const handleTiltMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const ry = ((e.clientX - r.left) / r.width - 0.5) * 9;
    const rx = (0.5 - (e.clientY - r.top) / r.height) * 9;
    el.style.transform = `perspective(950px) rotateX(${rx}deg) rotateY(${ry}deg)`;
  };

  const handleTiltLeave = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = 'perspective(950px) rotateX(0deg) rotateY(0deg)';
  };

  const totalBooths = Math.max(1, snapshot.booths.length);
  const availableCount = snapshot.booths.filter((b) => b.status === 'available').length;
  const reservedCount = snapshot.booths.filter((b) => b.status === 'reserved').length;
  const pendingCount = snapshot.booths.filter((b) => b.status === 'pending').length;

  const availablePct = Math.round((availableCount / totalBooths) * 100);
  const reservedPct = Math.round((reservedCount / totalBooths) * 100);
  const pendingPct = Math.max(4, Math.round((pendingCount / totalBooths) * 100));

  // Build real SVG sparkline points from snapshot.analyticsSeries
  const sparkPoints = snapshot.analyticsSeries.slice(-7);
  const maxTraffic = Math.max(100, ...sparkPoints.map((p) => p.boothTraffic));
  const sparkCoords = sparkPoints.map((p, idx) => {
    const x = sparkPoints.length > 1 ? (idx / (sparkPoints.length - 1)) * 220 : 110;
    const y = 66 - (p.boothTraffic / maxTraffic) * 48;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const sparkPath = sparkCoords.length > 1 ? `M ${sparkCoords.join(' L ')}` : 'M 0,40 L 220,25';
  const sparkAreaPath = `${sparkPath} L 220,76 L 0,76 Z`;
  const featuredSession = snapshot.sessions[0];

  const panelClass =
    'surface-luxe pointer-events-auto rounded-2xl border border-slate-200/90 bg-white/93 p-7 text-[#09140E] dark:border-[#10B981]/20 dark:bg-[#070E0A]/92 dark:text-[#ECFDF5] sm:p-9';

  return (
    <div ref={rootRef} className="relative z-10 pointer-events-none">
      {/* Bottom-left Booth Status Key */}
      <div
        aria-label="Booth status key"
        className="no-print surface-luxe pointer-events-auto fixed bottom-4 left-4 z-30 hidden items-center gap-4 rounded-xl border border-slate-200/90 bg-white/94 px-3.5 py-2 text-xs font-medium text-[#466153] dark:border-[#10B981]/20 dark:bg-[#040705]/94 dark:text-[#8EAD9E] xl:flex"
      >
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-xs bg-[#34D399]" />
          Available ({availableCount})
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-xs bg-[#F97362]" />
          Reserved ({reservedCount})
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-xs bg-[#A78BFA]" />
          Pending ({pendingCount})
        </span>
      </div>

      {/* SECTION 1: HERO — ASYMMETRIC SHOWCASE FRAMING LIVE 3D GEODESIC EXPO SPHERE */}
      <section className="mx-auto flex min-h-[100svh] max-w-7xl flex-col justify-center px-4 pt-24 pb-12 sm:px-6">
        <div className="grid items-center gap-10 lg:grid-cols-12">
          {/* LEFT COLUMN: TYPOGRAPHIC HERO & ACTION ANCHOR */}
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.72, ease: [0.16, 1, 0.3, 1] }}
            className="surface-luxe pointer-events-auto rounded-3xl border border-slate-200/90 bg-white/92 p-7 text-[#09140E] dark:border-[#10B981]/22 dark:bg-gradient-to-br dark:from-[#060C08]/94 dark:via-[#08150E]/90 dark:to-[#040705]/94 dark:text-[#ECFDF5] sm:p-10 lg:col-span-6"
          >
            <div className="rv go">
              <p className="font-mono text-xs font-semibold tracking-wider text-[#059669] dark:text-[#34D399]">
                {snapshot.expos[0]?.title || 'Global Expo Operations'} · Real-Time 3D Floor
              </p>

              <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight leading-[0.98] sm:text-5xl lg:text-[3.75rem]">
                <span className="ln">
                  <span>The Ultimate</span>
                </span>
                <span className="ln">
                  <span>
                    <span className="text-sphere-prism">Sphere</span> For Your
                  </span>
                </span>
                <span className="ln">
                  <span>
                    Next Big <span className="text-champagne-shimmer">Expo</span>
                  </span>
                </span>
              </h1>

              <p className="rv-fade mt-5 max-w-xl text-base leading-relaxed text-[#466153] dark:text-[#A7C4B5]">
                Plan, manage, and scale virtual, hybrid, and live expos from one interactive 3D
                floor plan—with atomic booth reservations, instant WebSocket schedule shifts, and
                real-time hall telemetry.
              </p>

              {/* Primary + Secondary CTAs */}
              <div className="rv-fade mt-7 flex flex-wrap items-center gap-3.5">
                <button
                  type="button"
                  onClick={onEnterExplore}
                  className="btn-luxe inline-flex min-h-[46px] items-center gap-2.5 rounded-full px-6 py-3 text-sm font-bold text-[#02120B] shadow-[0_12px_32px_rgba(16,185,129,0.34)] whitespace-nowrap shrink-0"
                  style={{
                    background: 'linear-gradient(110deg, #059669 0%, #10B981 48%, #6EE7B7 100%)',
                  }}
                >
                  <Compass className="h-4 w-4" />
                  <span>Explore 3D Expo Hall</span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenPortals()}
                  className="btn-luxe inline-flex min-h-[46px] items-center gap-2.5 rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-[#09140E] hover:border-[#059669] dark:border-[#10B981]/28 dark:bg-[#0A150F] dark:text-[#ECFDF5] dark:hover:border-[#34D399] whitespace-nowrap shrink-0"
                >
                  <span>Open Role Portals</span>
                  <ArrowRight className="h-4 w-4 text-[#059669] dark:text-[#34D399]" />
                </button>
              </div>

              {/* Organizer Proof & Live Trust Card */}
              <div className="mt-7 flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200/90 bg-[#F4F7F5]/90 px-4 py-3.5 dark:border-[#10B981]/18 dark:bg-[#08120D]/92">
                <div className="flex -space-x-2.5 shrink-0" aria-hidden="true">
                  {[
                    { label: 'OR', bg: '#10B981', fg: '#02120B' },
                    { label: 'EX', bg: '#34D399', fg: '#02120B' },
                    { label: 'AT', bg: '#2DD4BF', fg: '#02120B' },
                    { label: 'SP', bg: '#059669', fg: '#ECFDF5' },
                  ].map((av) => (
                    <span
                      key={av.label}
                      className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white font-mono text-[11px] font-bold dark:border-[#060C08]"
                      style={{ backgroundColor: av.bg, color: av.fg }}
                    >
                      {av.label}
                    </span>
                  ))}
                </div>
                <div className="min-w-0 text-xs leading-snug text-[#466153] dark:text-[#A7C4B5]">
                  <p className="font-semibold text-[#09140E] dark:text-[#ECFDF5]">
                    Trusted across {snapshot.expos.length} live expos &amp; {snapshot.exhibitors.length} verified exhibitors
                  </p>
                  <p className="mt-0.5 text-[11px] tabular-nums">
                    {snapshot.concurrentUsers} active attendees · {availableCount} booths open · &lt;2s sync
                  </p>
                </div>
              </div>

              {/* Compact Quick-Control Utility Dock */}
              <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-slate-200/80 pt-4 dark:border-[#10B981]/15">
                <button
                  type="button"
                  onClick={onToggleNightMode}
                  className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-slate-300/90 bg-[#F4F7F5] px-2.5 py-1 text-xs font-semibold text-[#09140E] transition-colors hover:border-[#059669] dark:border-[#10B981]/22 dark:bg-[#09140E] dark:text-[#ECFDF5] whitespace-nowrap shrink-0"
                  title="Toggle Obsidian Emerald / Alabaster Hall"
                >
                  {nightMode ? (
                    <Sun className="h-3.5 w-3.5 text-[#34D399]" />
                  ) : (
                    <Moon className="h-3.5 w-3.5 text-[#059669]" />
                  )}
                  <span>{nightMode ? 'Obsidian Hall' : 'Alabaster Hall'}</span>
                </button>

                <button
                  type="button"
                  onClick={onToggleTrussAndVisitors}
                  className={`inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    showTrussAndVisitors
                      ? 'border-[#059669]/45 bg-[#10B981]/14 text-[#047857] dark:border-[#34D399]/40 dark:bg-[#10B981]/15 dark:text-[#34D399]'
                      : 'border-slate-300/90 bg-[#F4F7F5] text-[#466153] dark:border-[#10B981]/18 dark:bg-[#09140E] dark:text-[#8EAD9E]'
                  }`}
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span>Crowd</span>
                </button>

                <button
                  type="button"
                  onClick={onOpenFavorites}
                  className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-slate-300/90 bg-[#F4F7F5] px-2.5 py-1 text-xs font-semibold text-[#09140E] transition-colors hover:border-[#34D399] dark:border-[#10B981]/22 dark:bg-[#09140E] dark:text-[#ECFDF5] whitespace-nowrap shrink-0"
                >
                  <Bookmark className="h-3.5 w-3.5 text-[#34D399]" />
                  <span>Saved ({favoriteCount})</span>
                </button>

                <button
                  type="button"
                  onClick={onOpenNotifications}
                  className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-slate-300/90 bg-[#F4F7F5] px-2.5 py-1 text-xs font-semibold text-[#09140E] transition-colors hover:border-[#F97362] dark:border-[#10B981]/22 dark:bg-[#09140E] dark:text-[#ECFDF5] whitespace-nowrap shrink-0"
                >
                  <Bell className="h-3.5 w-3.5 text-[#F97362]" />
                  <span>Alerts</span>
                  {unreadNotifications > 0 && (
                    <span className="font-mono text-[11px] font-bold text-[#F97362]">
                      · {unreadNotifications}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={onOpenCloudSync}
                  className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-slate-300/90 bg-[#F4F7F5] px-2.5 py-1 text-xs font-semibold text-[#09140E] transition-colors hover:border-[#34D399] dark:border-[#10B981]/22 dark:bg-[#09140E] dark:text-[#ECFDF5] whitespace-nowrap shrink-0"
                >
                  <Cloud className="h-3.5 w-3.5 text-[#059669] dark:text-[#34D399]" />
                  <span>Sync</span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenAuth()}
                  className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-[#34D399]/45 bg-[#34D399]/12 px-2.5 py-1 text-xs font-semibold text-emerald-900 transition-colors hover:bg-[#34D399]/22 dark:text-[#34D399] whitespace-nowrap shrink-0"
                >
                  <UserCheck className="h-3.5 w-3.5" />
                  <span>{currentUser ? `${currentUser.name}` : 'Sign In'}</span>
                </button>

                <PWAInstallButton />
              </div>
            </div>
          </motion.div>

          {/* RIGHT COLUMN: FLOATING LIVE-DATA CARDS FRAMING THE LIVE 3D EXPO SPHERE */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.85, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-none relative flex min-h-[470px] flex-col justify-between gap-4 lg:col-span-6 lg:min-h-[540px]"
          >
            {/* Top Row: Stage Landmark Callout + Live Analytics Sparkline Card */}
            <div className="flex flex-wrap items-start justify-between gap-4">
              <button
                type="button"
                onClick={onFocusStage}
                className="surface-luxe pointer-events-auto inline-flex items-center gap-2 rounded-xl border border-slate-200/90 bg-white/94 px-3.5 py-2 text-xs font-semibold text-[#09140E] transition-transform hover:-translate-y-0.5 hover:border-[#34D399] dark:border-[#10B981]/25 dark:bg-[#070E0A]/92 dark:text-[#ECFDF5]"
                title="Focus 3D camera on the Main Keynote Stage"
              >
                <span className="h-2 w-2 rounded-xs bg-[#34D399]" aria-hidden="true" />
                <span>Main Stage</span>
                <ArrowRight className="h-3.5 w-3.5 text-[#34D399]" />
              </button>

              {/* Floating Card 1: Live Analytics Sparkline */}
              <button
                type="button"
                onClick={onOpenAnalytics}
                className="float-card surface-luxe pointer-events-auto w-full max-w-[270px] rounded-2xl border border-slate-200/90 bg-white/94 p-4 text-left text-[#09140E] transition-colors hover:border-[#34D399] dark:border-[#10B981]/25 dark:bg-gradient-to-br dark:from-[#08120D]/94 dark:to-[#040806]/94 dark:text-[#ECFDF5]"
              >
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span>Live Analytics</span>
                  <span className="font-mono text-[11px] font-bold text-[#34D399]">
                    +24% traffic
                  </span>
                </div>

                <svg
                  viewBox="0 0 220 76"
                  className="mt-2.5 h-16 w-full overflow-visible"
                  aria-label="Real-time expo booth traffic trend"
                >
                  <defs>
                    <linearGradient id="heroSparkStroke" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#059669" />
                      <stop offset="52%" stopColor="#10B981" />
                      <stop offset="100%" stopColor="#6EE7B7" />
                    </linearGradient>
                    <linearGradient id="heroSparkFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity="0.38" />
                      <stop offset="100%" stopColor="#059669" stopOpacity="0.02" />
                    </linearGradient>
                  </defs>
                  <path d={sparkAreaPath} fill="url(#heroSparkFill)" />
                  <path
                    d={sparkPath}
                    fill="none"
                    stroke="url(#heroSparkStroke)"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>

                <div className="mt-2 flex items-baseline justify-between gap-2">
                  <span className="font-display text-2xl font-extrabold tabular-nums">
                    {snapshot.concurrentUsers}
                  </span>
                  <span className="text-[11px] text-[#466153] dark:text-[#8EAD9E]">
                    Attendees Live · Open Report
                  </span>
                </div>
              </button>
            </div>

            {/* Center Open Window over the 3D Sphere + Interactive Expo Hall Callout */}
            <div className="flex items-center justify-end pr-2">
              <button
                type="button"
                onClick={onEnterExplore}
                className="surface-luxe pointer-events-auto inline-flex items-center gap-2 rounded-xl border border-slate-200/90 bg-white/94 px-3.5 py-2 text-xs font-semibold text-[#09140E] transition-transform hover:-translate-y-0.5 hover:border-[#10B981] dark:border-[#10B981]/25 dark:bg-[#070E0A]/92 dark:text-[#ECFDF5]"
                title="Enter free-orbit 3D Expo Hall Explorer"
              >
                <span className="h-2 w-2 rounded-xs bg-[#10B981]" aria-hidden="true" />
                <span>Expo Hall · {snapshot.booths.length} Booths</span>
                <Compass className="h-3.5 w-3.5 text-[#10B981]" />
              </button>
            </div>

            {/* Bottom Row: Networking & Sessions Lounge + Exhibitor Booth Roster */}
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Floating Card 2: Networking & Session Lounge */}
              <div className="float-card-alt surface-luxe pointer-events-auto rounded-2xl border border-slate-200/90 bg-white/94 p-4 text-[#09140E] dark:border-[#10B981]/25 dark:bg-gradient-to-br dark:from-[#08120D]/94 dark:to-[#040806]/94 dark:text-[#ECFDF5]">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span>Networking Lounge</span>
                  <span className="font-mono text-[10px] text-[#059669] dark:text-[#34D399]">
                    {featuredSession?.startTime || 'Live'}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <div className="flex -space-x-2" aria-hidden="true">
                    {snapshot.exhibitors.slice(0, 4).map((ex) => (
                      <span
                        key={ex.id}
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-white font-mono text-[9px] font-bold text-[#040705] dark:border-[#070E0A]"
                        style={{ backgroundColor: ex.logoColor || '#34D399' }}
                        title={ex.companyName}
                      >
                        {ex.companyName.slice(0, 2).toUpperCase()}
                      </span>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenPortals('attendee')}
                    className="btn-luxe rounded-full px-3.5 py-1.5 text-[11px] font-bold text-[#02120B] whitespace-nowrap shrink-0"
                    style={{
                      background: 'linear-gradient(110deg, #059669, #34D399)',
                    }}
                  >
                    Join Session
                  </button>
                </div>

                <p className="mt-2.5 truncate text-[11px] text-[#466153] dark:text-[#8EAD9E]">
                  {featuredSession ? featuredSession.title : 'Keynote & Exhibitor Networking'}
                </p>
              </div>

              {/* Floating Card 3: Live Exhibitor & Booth Roster */}
              <button
                type="button"
                onClick={onEnterExplore}
                className="surface-luxe pointer-events-auto rounded-2xl border border-slate-200/90 bg-white/94 p-4 text-left text-[#09140E] transition-colors hover:border-[#34D399] dark:border-[#10B981]/25 dark:bg-gradient-to-br dark:from-[#08120D]/94 dark:to-[#040806]/94 dark:text-[#ECFDF5]"
              >
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span>Exhibitor Roster</span>
                  <span className="font-mono text-[10px] text-[#466153] dark:text-[#8EAD9E]">
                    {snapshot.booths.length} booths
                  </span>
                </div>

                <div className="mt-3 grid gap-2 text-[11px]">
                  {[
                    {
                      label: 'Reserved',
                      pct: reservedPct,
                      grad: 'linear-gradient(90deg, #EA580C, #F97362)',
                    },
                    {
                      label: 'Available',
                      pct: availablePct,
                      grad: 'linear-gradient(90deg, #059669, #34D399)',
                    },
                    {
                      label: 'Pending',
                      pct: pendingPct,
                      grad: 'linear-gradient(90deg, #0D9488, #2DD4BF)',
                    },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center gap-2">
                      <span className="w-16 shrink-0 text-[#466153] dark:text-[#8EAD9E]">
                        {row.label}
                      </span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${row.pct}%`, background: row.grad }}
                        />
                      </div>
                      <span className="w-8 text-right font-mono font-bold tabular-nums">
                        {row.pct}%
                      </span>
                    </div>
                  ))}
                </div>
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* SECTION 2: 01. ORGANIZER CONTROL */}
      <section id="organizers" className="mx-auto flex min-h-[90svh] max-w-7xl items-center px-4 py-16 sm:px-6">
        <div className={`${panelClass} rv max-w-xl`}>
          <p className="font-mono text-xs font-semibold tracking-wider text-[#059669] dark:text-[#34D399]">
            01. Organizer Control
          </p>
          <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight leading-tight sm:text-5xl">
            <span className="ln">
              <span>Build the hall once.</span>
            </span>
            <span className="ln">
              <span>Change it live.</span>
            </span>
          </h2>
          <p className="rv-fade mt-4 text-sm leading-relaxed text-[#466153] dark:text-[#8EAD9E] sm:text-base">
            Create expos, allocate booth sizes and pricing, review exhibitor applications with
            reasons, and push schedule updates across every screen in under two seconds.
          </p>
          <ul className="rv-fade mt-5 grid gap-2.5 text-sm">
            <li className="flex items-start gap-2.5">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-xs bg-[#10B981]" />
              <span>Approve or reject exhibitor applications with structured audit notes</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-xs bg-[#10B981]" />
              <span>Allocate booths, pricing tiers, and assignments on the live 3D floor</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-xs bg-[#10B981]" />
              <span>Track booth traffic, session bookmarks, and export CSV reports</span>
            </li>
          </ul>
          <button
            type="button"
            onClick={() => onOpenPortals('admin')}
            className="btn-luxe mt-6 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#059669] to-[#34D399] px-4 py-2 text-xs font-bold text-[#02120B] whitespace-nowrap shrink-0"
          >
            <span>Launch Organizer Portal</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </section>

      {/* SECTION 3: 02. EXHIBITOR PORTAL */}
      <section
        id="exhibitors"
        className="mx-auto flex min-h-[90svh] max-w-7xl items-center justify-end px-4 py-16 sm:px-6"
      >
        <div className={`${panelClass} rv max-w-xl`}>
          <p className="font-mono text-xs font-semibold tracking-wider text-[#F97362]">
            02. Exhibitor Portal
          </p>
          <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight leading-tight sm:text-5xl">
            <span className="ln">
              <span>Pick your booth</span>
            </span>
            <span className="ln">
              <span>on the map.</span>
            </span>
          </h2>
          <p className="rv-fade mt-4 text-sm leading-relaxed text-[#466153] dark:text-[#8EAD9E] sm:text-base">
            Apply with company documents, see live availability with zero double-booking risk,
            manage products and staff, and message organizers or neighbouring booths directly.
          </p>
          <ul className="rv-fade mt-5 grid gap-2.5 text-sm">
            <li className="flex items-start gap-2.5">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-xs bg-[#F97362]" />
              <span>Atomic server-enforced booth reservations broadcast over WebSockets</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-xs bg-[#F97362]" />
              <span>Editable exhibitor showcase: tagline, products catalog, and on-site staff</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-xs bg-[#F97362]" />
              <span>Real-time chat with organizers and nearby booth teams</span>
            </li>
          </ul>
          <button
            type="button"
            onClick={() => onOpenPortals('exhibitor')}
            className="btn-luxe mt-6 inline-flex items-center gap-2 rounded-lg bg-[#F97362] px-4 py-2 text-xs font-bold text-[#1A0B09] whitespace-nowrap shrink-0"
          >
            <span>Open Exhibitor Portal</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </section>

      {/* SECTION 4: 03. ATTENDEE EXPERIENCE */}
      <section id="attendees" className="mx-auto flex min-h-[90svh] max-w-7xl items-center px-4 py-16 sm:px-6">
        <div className={`${panelClass} rv max-w-xl`}>
          <p className="font-mono text-xs font-semibold tracking-wider text-[#2DD4BF]">
            03. Attendee Experience
          </p>
          <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight leading-tight sm:text-5xl">
            <span className="ln">
              <span>Find who to meet.</span>
            </span>
            <span className="ln">
              <span>Plan what to see.</span>
            </span>
          </h2>
          <p className="rv-fade mt-4 text-sm leading-relaxed text-[#466153] dark:text-[#8EAD9E] sm:text-base">
            Filter exhibitors by category or keyword, inspect booths in 3D, register for sessions
            in one click, and get instant reminders if any workshop moves rooms.
          </p>
          <ul className="rv-fade mt-5 grid gap-2.5 text-sm">
            <li className="flex items-start gap-2.5">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-xs bg-[#2DD4BF]" />
              <span>Instant search across booths, products, speakers, and time slots</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-xs bg-[#2DD4BF]" />
              <span>One-tap workshop registration, favorites, and offline schedule access</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-xs bg-[#2DD4BF]" />
              <span>Direct inquiry messaging to any exhibitor booth team</span>
            </li>
          </ul>
          <button
            type="button"
            onClick={() => onOpenPortals('attendee')}
            className="btn-luxe mt-6 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#10B981] to-[#2DD4BF] px-4 py-2 text-xs font-bold text-[#02120B] whitespace-nowrap shrink-0"
          >
            <span>Open Attendee Hub</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </section>

      {/* SECTION 5: LIVE SYSTEM PREVIEWS */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className={`${panelClass} rv`}>
          <div className="text-center">
            <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-5xl">
              <span className="ln">
                <span>Three views, one live system.</span>
              </span>
            </h2>
            <p className="rv-fade mx-auto mt-2 max-w-xl text-sm text-[#466153] dark:text-[#8EAD9E]">
              Every module below reads directly from your live EventSphere database and updates over WebSockets.
            </p>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {/* Screen 1: Live Traffic Bars */}
            <div className="rounded-xl border border-slate-200 bg-[#F4F7F5] p-4 dark:border-[#10B981]/16 dark:bg-[#040705]">
              <div className="flex h-36 items-end gap-2 rounded-lg border border-slate-200 bg-white p-3 dark:border-[#10B981]/14 dark:bg-[#09120D]">
                {snapshot.analyticsSeries.slice(-6).map((pt, idx) => {
                  const pct = Math.max(24, Math.min(96, Math.round((pt.boothTraffic / 420) * 100)));
                  return (
                    <div
                      key={pt.date}
                      className="flex-1 rounded-t-md transition-all duration-700"
                      style={{
                        height: `${pct}%`,
                        background:
                          idx === 4
                            ? 'linear-gradient(#34D399, #047857)'
                            : 'linear-gradient(#10B981, #064E3B)',
                      }}
                      title={`${pt.date}: ${pt.boothTraffic} visits`}
                    />
                  );
                })}
              </div>
              <h3 className="mt-3 font-display text-lg font-bold">Organizer Telemetry</h3>
              <p className="mt-1 text-xs text-[#466153] dark:text-[#8EAD9E]">
                Live booth traffic, session bookmarks, and profile engagement trends.
              </p>
            </div>

            {/* Screen 2: Clickable Live 24-Booth Floor Matrix */}
            <div className="rounded-xl border border-slate-200 bg-[#F4F7F5] p-4 dark:border-[#10B981]/16 dark:bg-[#040705]">
              <div className="grid h-36 grid-cols-6 gap-1.5 rounded-lg border border-slate-200 bg-white p-3 dark:border-[#10B981]/14 dark:bg-[#09120D]">
                {snapshot.booths.slice(0, 24).map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => onSelectBooth(b.id)}
                    title={`Booth ${b.number} · ${b.status}${b.exhibitorName ? ` (${b.exhibitorName})` : ''}`}
                    className="flex items-center justify-center rounded-sm font-mono text-[9px] font-bold text-[#040705] transition-transform hover:scale-110"
                    style={{ backgroundColor: STATUS_HEX[b.status] }}
                  >
                    {b.number}
                  </button>
                ))}
              </div>
              <h3 className="mt-3 font-display text-lg font-bold">Live Booth Matrix</h3>
              <p className="mt-1 text-xs text-[#466153] dark:text-[#8EAD9E]">
                Click any booth cell above or in the 3D hall to inspect or reserve immediately.
              </p>
            </div>

            {/* Screen 3: Live Session Feed */}
            <div className="rounded-xl border border-slate-200 bg-[#F4F7F5] p-4 dark:border-[#10B981]/16 dark:bg-[#040705]">
              <div className="flex h-36 flex-col justify-center gap-2 rounded-lg border border-slate-200 bg-white p-3 dark:border-[#10B981]/14 dark:bg-[#09120D]">
                {snapshot.sessions.slice(0, 3).map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between gap-2 rounded-md bg-[#F4F7F5] px-2.5 py-1.5 text-xs dark:bg-[#10B981]/10"
                  >
                    <span className="truncate font-medium">
                      <span className="font-mono text-[#059669] dark:text-[#34D399]">{s.startTime}</span>{' '}
                      {s.title}
                    </span>
                    <span className="shrink-0 font-mono text-[10px] text-[#466153] dark:text-[#8EAD9E]">
                      {s.registeredUserIds.length} reg
                    </span>
                  </div>
                ))}
              </div>
              <h3 className="mt-3 font-display text-lg font-bold">Synchronized Schedule</h3>
              <p className="mt-1 text-xs text-[#466153] dark:text-[#8EAD9E]">
                Bookmark sessions, reserve seats, and receive instant room-change alerts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 6: WORKFLOW & SCALE METRICS */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className={`${panelClass} rv`} data-stats-trigger="true">
          <h2 className="text-center font-display text-3xl font-extrabold tracking-tight sm:text-5xl">
            <span className="ln">
              <span>From application to opening day.</span>
            </span>
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { step: '01', title: 'Apply', copy: 'Exhibitors register with company profile, products, and compliance docs.' },
              { step: '02', title: 'Get Approved', copy: 'Organizers review submissions and approve or decline with clear reasons.' },
              { step: '03', title: 'Reserve a Booth', copy: 'Approved exhibitors claim available emerald booths on the live 3D floor.' },
              { step: '04', title: 'Meet Visitors', copy: 'Attendees bookmark sessions, search products, and message booths directly.' },
            ].map((item) => (
              <div
                key={item.step}
                className="rounded-xl border border-slate-200 bg-[#F4F7F5] p-5 transition-colors hover:border-[#059669]/60 dark:border-[#10B981]/16 dark:bg-[#040705] dark:hover:border-[#34D399]/45"
              >
                <div className="font-mono text-xs font-bold tracking-wider text-[#059669] dark:text-[#34D399]">
                  {item.step}
                </div>
                <h3 className="mt-2 font-display text-lg font-bold">{item.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-[#466153] dark:text-[#8EAD9E]">
                  {item.copy}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-10 grid gap-6 border-t border-slate-200 pt-8 text-center dark:border-[#10B981]/15 sm:grid-cols-3">
            <div>
              <div className="font-display text-5xl font-extrabold tabular-nums">
                {statSync}
                <span className="text-[#34D399]">s</span>
              </div>
              <p className="mt-1 text-xs text-[#466153] dark:text-[#8EAD9E]">
                for schedule &amp; booth changes to reach every connected screen
              </p>
            </div>
            <div>
              <div className="font-display text-5xl font-extrabold tabular-nums">
                {statUsers}
                <span className="text-[#10B981]">+</span>
              </div>
              <p className="mt-1 text-xs text-[#466153] dark:text-[#8EAD9E]">
                concurrent floor users supported · {snapshot.concurrentUsers} live now
              </p>
            </div>
            <div>
              <div className="font-display text-5xl font-extrabold tabular-nums">
                {statUptime}
                <span className="text-[#2DD4BF]">%</span>
              </div>
              <p className="mt-1 text-xs text-[#466153] dark:text-[#8EAD9E]">
                availability target with offline PWA &amp; cloud sync backups
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 7: FAQ + CHOOSE HOW YOU'LL JOIN */}
      <section id="faq" className="mx-auto max-w-7xl px-4 py-12 pb-28 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-5">
          <div className={`${panelClass} lg:col-span-2`}>
            <h2 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
              Questions, answered.
            </h2>
            <div className="mt-5 grid gap-2.5 text-sm">
              {[
                {
                  q: 'Who can create an expo?',
                  a: 'Only Organizer (Admin) accounts. Exhibitors and attendees self-register with GDPR consent.',
                },
                {
                  q: 'How are passwords and sessions protected?',
                  a: 'Passwords are hashed with bcrypt, API routes enforce role-checked JWTs, and password resets issue expiring one-time codes.',
                },
                {
                  q: 'Can two exhibitors book the same booth?',
                  a: 'No. Reservations execute atomically on the server and broadcast instantly via Socket.io.',
                },
                {
                  q: 'Does it work offline in convention halls?',
                  a: 'Yes. EventSphere caches the floor plan, schedules, and favorites locally as an installable PWA.',
                },
              ].map((item) => (
                <details
                  key={item.q}
                  className="rounded-xl border border-slate-200 bg-[#F4F7F5] px-4 py-3 dark:border-[#10B981]/16 dark:bg-[#040705]"
                >
                  <summary className="cursor-pointer font-semibold">{item.q}</summary>
                  <p className="mt-2 text-xs leading-relaxed text-[#466153] dark:text-[#8EAD9E]">
                    {item.a}
                  </p>
                </details>
              ))}
            </div>
          </div>

          <div className={`${panelClass} lg:col-span-3`}>
            <h2 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
              Choose how you’ll join.
            </h2>
            <p className="mt-1 text-sm text-[#466153] dark:text-[#8EAD9E]">
              Enter a dedicated role portal or sign in with instant verification.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {[
                {
                  role: 'admin' as UserRole,
                  title: 'Organizer',
                  accent: '#10B981',
                  grad: 'linear-gradient(110deg, #059669, #34D399)',
                  btnText: 'text-[#02120B]',
                  copy: 'Create expos, approve exhibitors, allocate booths, and run schedules.',
                },
                {
                  role: 'exhibitor' as UserRole,
                  title: 'Exhibitor',
                  accent: '#F97362',
                  grad: 'linear-gradient(110deg, #EA580C, #F97362)',
                  btnText: 'text-[#1A0B09]',
                  copy: 'Apply for expos, reserve available booths, and message attendees.',
                },
                {
                  role: 'attendee' as UserRole,
                  title: 'Attendee',
                  accent: '#34D399',
                  grad: 'linear-gradient(110deg, #10B981, #2DD4BF)',
                  btnText: 'text-[#02120B]',
                  copy: 'Browse the 3D hall, register for sessions, and chat with booths.',
                },
              ].map((card) => (
                <div
                  key={card.role}
                  onPointerMove={handleTiltMove}
                  onPointerLeave={handleTiltLeave}
                  className="flex flex-col justify-between rounded-xl border border-slate-200 bg-[#F4F7F5] p-5 transition-transform duration-200 dark:border-[#10B981]/18 dark:bg-[#040705]"
                >
                  <div>
                    <div
                      className="h-1 w-9 rounded-xs"
                      style={{ background: card.grad }}
                    />
                    <h3 className="mt-3 font-display text-xl font-bold">{card.title}</h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-[#466153] dark:text-[#8EAD9E]">
                      {card.copy}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenPortals(card.role)}
                    className={`btn-luxe mt-5 w-full rounded-lg px-3 py-2 text-xs font-bold whitespace-nowrap ${card.btnText}`}
                    style={{ background: card.grad }}
                  >
                    Open {card.title}
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 text-xs text-[#466153] dark:border-[#10B981]/15 dark:text-[#8EAD9E]">
              <span>EventSphere Management · Real-time 3D Floor &amp; Operations</span>
              <button
                type="button"
                onClick={() => onOpenNotifications()}
                className="inline-flex items-center gap-1.5 font-semibold text-[#059669] hover:underline dark:text-[#34D399]"
              >
                <MessageSquarePlus className="h-3.5 w-3.5" />
                <span>Submit Hall Feedback</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
