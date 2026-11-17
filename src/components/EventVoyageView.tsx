import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Bell,
  Bookmark,
  Building2,
  Calendar,
  CalendarClock,
  CheckCircle2,
  Cloud,
  Compass,
  Eye,
  EyeOff,
  Layers,
  MapPin,
  Moon,
  Shield,
  Sun,
  Ticket,
  UserCheck,
  Users,
} from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { EventSphereSnapshot, UserAccount, UserRole } from '../types/eventsphere';
import type { ZoomTelemetry } from '../three/ExpoHallCanvas';
import { STATUS_HEX } from '../three/expoModels';
import { PWAInstallButton } from './PWAStatusWidgets';
import { PublicFooter } from './PublicFooter';
import { Badge, Button, Card } from './ui';

gsap.registerPlugin(ScrollTrigger);

interface EventVoyageViewProps {
  snapshot: EventSphereSnapshot;
  currentUser: UserAccount | null;
  unreadNotifications: number;
  nightMode: boolean;
  showTrussAndVisitors: boolean;
  favoriteCount: number;
  zoomTelemetry?: ZoomTelemetry;
  onToggleNightMode: () => void;
  onToggleTrussAndVisitors: () => void;
  onEnterExplore: () => void;
  onFocusStage: () => void;
  onOpenAnalytics: () => void;
  onOpenPortals: (preferredRole?: UserRole) => void;
  onOpenAuth: (defaultRole?: UserRole, tab?: 'role-select' | 'login' | 'register') => void;
  onOpenFavorites: () => void;
  onOpenCloudSync: () => void;
  onOpenNotifications: () => void;
  onSelectBooth: (boothId: string) => void;
  onRegisterExpo: (expoId: string) => Promise<void>;
  onToggleSessionBookmark: (sessionId: string) => Promise<void>;
}

export const EventVoyageView: React.FC<EventVoyageViewProps> = ({
  snapshot,
  currentUser,
  unreadNotifications,
  nightMode,
  showTrussAndVisitors,
  favoriteCount,
  zoomTelemetry,
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
  onRegisterExpo,
  onToggleSessionBookmark,
}) => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [peekFloor, setPeekFloor] = useState(false);
  const [statSync, setStatSync] = useState(2);
  const [statUsers, setStatUsers] = useState(300);
  const [statUptime, setStatUptime] = useState(99);

  // GSAP + ScrollTrigger entrance & section reveal choreography
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const rvTargets = Array.from(root.querySelectorAll('.rv'));

    if (reduce) {
      rvTargets.forEach((el) => el.classList.add('go'));
      return;
    }

    const ctx = gsap.context(() => {
      gsap.from('.hero-stagger', {
        y: 24,
        opacity: 0,
        duration: 0.72,
        stagger: 0.08,
        ease: 'power3.out',
        clearProps: 'transform,opacity',
      });

      gsap.from('.hero-float-panel', {
        scale: 0.96,
        opacity: 0,
        duration: 0.75,
        delay: 0.14,
        stagger: 0.1,
        ease: 'power3.out',
        clearProps: 'transform,opacity',
      });

      gsap.utils.toArray<HTMLElement>('.gsap-section').forEach((section) => {
        gsap.from(section, {
          y: 28,
          opacity: 0,
          duration: 0.65,
          ease: 'power2.out',
          clearProps: 'transform,opacity',
          scrollTrigger: {
            trigger: section,
            start: 'top 84%',
            once: true,
          },
        });
      });

      ScrollTrigger.create({
        trigger: '[data-stats-trigger="true"]',
        start: 'top 82%',
        once: true,
        onEnter: () => {
          const obj = { s: 0, u: 0, p: 0 };
          gsap.to(obj, {
            s: 2,
            u: 300,
            p: 99,
            duration: 1.1,
            ease: 'power2.out',
            onUpdate: () => {
              setStatSync(Math.max(1, Math.round(obj.s)));
              setStatUsers(Math.round(obj.u));
              setStatUptime(Math.round(obj.p));
            },
          });
        },
      });
    }, root);

    // Reveal CSS kinetic headlines as they enter viewport
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('go');
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.15 },
    );
    rvTargets.forEach((el) => io.observe(el));

    return () => {
      io.disconnect();
      ctx.revert();
    };
  }, []);

  const totalBooths = Math.max(1, snapshot.booths.length);
  const availableCount = snapshot.booths.filter((b) => b.status === 'available').length;
  const reservedCount = snapshot.booths.filter((b) => b.status === 'reserved' || b.status === 'occupied').length;
  const pendingCount = snapshot.booths.filter((b) => b.status === 'pending').length;

  const availablePct = Math.round((availableCount / totalBooths) * 100);
  const reservedPct = Math.round((reservedCount / totalBooths) * 100);
  const pendingPct = Math.max(4, Math.round((pendingCount / totalBooths) * 100));

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

  const categories = useMemo(() => {
    const set = new Set<string>(['All']);
    snapshot.expos.forEach((e) => set.add(e.category || 'Robotics & AI'));
    snapshot.exhibitors.forEach((ex) => set.add(ex.category));
    return Array.from(set);
  }, [snapshot.expos, snapshot.exhibitors]);

  const filteredExpos = useMemo(() => {
    if (selectedCategory === 'All') return snapshot.expos;
    return snapshot.expos.filter(
      (e) => e.category === selectedCategory || e.theme.toLowerCase().includes(selectedCategory.toLowerCase()),
    );
  }, [snapshot.expos, selectedCategory]);

  const filteredExhibitors = useMemo(() => {
    if (selectedCategory === 'All') return snapshot.exhibitors;
    return snapshot.exhibitors.filter((ex) => ex.category === selectedCategory);
  }, [snapshot.exhibitors, selectedCategory]);

  const scrollToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
  };

  const zoomPercent = zoomTelemetry?.zoomPercent ?? 100;
  const zoomBorderTone =
    zoomPercent >= 140
      ? 'border-[#104E35]/22 dark:border-[#2A6F52]/42'
      : zoomPercent <= 75
        ? 'border-[#104E35]/12 dark:border-[#2A6F52]/24'
        : 'border-[#104E35]/16 dark:border-[#2A6F52]/34';

  const panelClass =
    `surface-luxe zoom-adaptive-frame pointer-events-auto ${zoomBorderTone} bg-[#EEF4F0]/92 text-[#091911] dark:bg-[#07100B]/88 dark:text-[#DDF2E7]`;

  return (
    <div ref={rootRef} className="relative z-10 pointer-events-none">
      {/* Bottom-left Booth Status Key & Live Zoom Readout */}
      <div
        aria-label="Booth status key"
        className={`no-print surface-luxe pointer-events-auto fixed bottom-4 left-4 z-30 hidden items-center gap-3.5 rounded-xl border ${zoomBorderTone} bg-[#EEF4F0]/90 px-3 py-1.5 text-xs font-medium text-[#355243] dark:bg-[#050A07]/88 dark:text-[#8EAD9E] xl:flex`}
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
        <span className="border-l border-[#104E35]/16 pl-3 font-mono text-[11px] text-[#059669] dark:border-[#2A6F52]/32 dark:text-[#34D399]">
          {zoomPercent}% view
        </span>
      </div>

      {/* SECTION 1: HERO — ASYMMETRIC SHOWCASE FRAMING LIVE 3D GEODESIC EXPO SPHERE */}
      <section className="zoom-adaptive-section flex min-h-[100svh] flex-col justify-center pt-22 pb-10">
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            onClick={() => setPeekFloor((v) => !v)}
            className={`pointer-events-auto inline-flex items-center gap-1.5 rounded-lg border ${zoomBorderTone} bg-[#EEF4F0]/90 px-3 py-1.5 text-xs font-semibold text-[#091911] transition-colors hover:border-[#059669]/50 dark:bg-[#07100B]/86 dark:text-[#DDF2E7]`}
          >
            {peekFloor ? (
              <>
                <Eye className="h-3.5 w-3.5 text-[#10B981]" />
                <span>Show Hero Panels</span>
              </>
            ) : (
              <>
                <EyeOff className="h-3.5 w-3.5 text-[#059669] dark:text-[#34D399]" />
                <span>Peek Unobstructed 3D Floor</span>
              </>
            )}
          </button>
        </div>

        <div
          className={`grid items-center gap-6 transition-all duration-300 lg:grid-cols-12 ${
            peekFloor ? 'pointer-events-none opacity-10 scale-[0.985]' : 'opacity-100 scale-100'
          }`}
        >
          {/* LEFT COLUMN */}
          <div className={`surface-luxe zoom-adaptive-frame pointer-events-auto border ${zoomBorderTone} bg-[#EEF4F0]/90 text-[#091911] dark:bg-gradient-to-br dark:from-[#060C08]/88 dark:via-[#08150E]/84 dark:to-[#040705]/88 dark:text-[#DDF2E7] lg:col-span-5`}>
            <div className="rv go">
              <p className="hero-stagger font-mono text-xs font-semibold tracking-wider text-[#059669] dark:text-[#34D399]">
                {snapshot.expos[0]?.title || 'Global Expo Operations'} · Real-Time 3D Floor
              </p>

              <h1 className="hero-stagger mt-3 font-display text-4xl font-extrabold tracking-tight leading-[0.98] sm:text-5xl lg:text-[3.5rem]">
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

              <p className="hero-stagger mt-5 max-w-xl text-base leading-relaxed text-[#466153] dark:text-[#A7C4B5]">
                Plan, manage, and scale virtual, hybrid, and live expos from one interactive 3D
                floor plan—with atomic booth reservations, digital attendee passes, and instant
                WebSocket schedule updates.
              </p>

              {/* Primary + Secondary CTAs */}
              <div className="hero-stagger mt-7 flex flex-wrap items-center gap-3">
                <Button
                  variant="primary"
                  size="lg"
                  leftIcon={<Compass className="h-4 w-4" />}
                  onClick={() => scrollToSection('expos')}
                >
                  Explore Expos
                </Button>

                <Button
                  variant="outline"
                  size="lg"
                  rightIcon={<ArrowRight className="h-4 w-4 text-[#059669] dark:text-[#34D399]" />}
                  onClick={() =>
                    currentUser ? onOpenPortals(currentUser.role) : onOpenAuth('attendee', 'role-select')
                  }
                >
                  {currentUser ? 'Open My Portal' : 'Register Now'}
                </Button>

                <Button variant="ghost" size="lg" onClick={onEnterExplore}>
                  3D Floor Map
                </Button>
              </div>

              {/* Trust Bar */}
              <div className="hero-stagger mt-7 flex flex-wrap items-center gap-4 rounded-2xl border border-[#104E35]/16 bg-[#E4EDE7]/90 px-4 py-3.5 dark:border-[#2A6F52]/34 dark:bg-[#08120D]/92">
                <div className="flex -space-x-2.5 shrink-0" aria-hidden="true">
                  {[
                    { label: 'OR', bg: '#10B981', fg: '#02120B' },
                    { label: 'EX', bg: '#34D399', fg: '#02120B' },
                    { label: 'AT', bg: '#2DD4BF', fg: '#02120B' },
                    { label: 'SP', bg: '#059669', fg: '#DDF2E7' },
                  ].map((av) => (
                    <span
                      key={av.label}
                      className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#E4EDE7] font-mono text-[11px] font-bold dark:border-[#060C08]"
                      style={{ backgroundColor: av.bg, color: av.fg }}
                    >
                      {av.label}
                    </span>
                  ))}
                </div>
                <div className="min-w-0 text-xs leading-snug text-[#355243] dark:text-[#A7C4B5]">
                  <p className="font-semibold text-[#091911] dark:text-[#DDF2E7]">
                    {snapshot.expos.length} active expos · {snapshot.exhibitors.length} verified exhibitors
                  </p>
                  <p className="mt-0.5 text-[11px] tabular-nums">
                    {snapshot.concurrentUsers} live online · {availableCount} booths open · &lt;2s sync
                  </p>
                </div>
              </div>

              {/* Compact Quick-Control Utility Dock */}
              <div className="hero-stagger mt-6 flex flex-wrap items-center gap-2 border-t border-[#104E35]/14 pt-4 dark:border-[#2A6F52]/28">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onToggleNightMode}
                  leftIcon={
                    nightMode ? (
                      <Sun className="h-3.5 w-3.5 text-[#34D399]" />
                    ) : (
                      <Moon className="h-3.5 w-3.5 text-[#059669]" />
                    )
                  }
                >
                  {nightMode ? 'Obsidian Hall' : 'Alabaster Hall'}
                </Button>

                <Button
                  variant={showTrussAndVisitors ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={onToggleTrussAndVisitors}
                  leftIcon={<Layers className="h-3.5 w-3.5" />}
                >
                  Crowd
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={onOpenFavorites}
                  leftIcon={<Bookmark className="h-3.5 w-3.5 text-[#34D399]" />}
                >
                  Saved ({favoriteCount})
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={onOpenNotifications}
                  leftIcon={<Bell className="h-3.5 w-3.5 text-[#F97362]" />}
                >
                  Alerts{unreadNotifications > 0 ? ` · ${unreadNotifications}` : ''}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={onOpenCloudSync}
                  leftIcon={<Cloud className="h-3.5 w-3.5 text-[#059669] dark:text-[#34D399]" />}
                >
                  Sync
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onOpenAuth('attendee', currentUser ? 'login' : 'role-select')}
                  leftIcon={<UserCheck className="h-3.5 w-3.5 text-[#10B981]" />}
                >
                  {currentUser ? currentUser.name : 'Portal Sign In'}
                </Button>

                <PWAInstallButton />
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: FLOATING LIVE-DATA CARDS FRAMING UNOBSTRUCTED 3D SPHERE */}
          <div className="pointer-events-none relative flex min-h-[430px] flex-col justify-between gap-4 lg:col-span-7 lg:min-h-[520px] lg:pl-14">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <button
                type="button"
                onClick={onFocusStage}
                className={`hero-float-panel surface-luxe pointer-events-auto inline-flex items-center gap-2 rounded-xl border ${zoomBorderTone} bg-[#EEF4F0]/90 px-3.5 py-2 text-xs font-semibold text-[#091911] transition-transform hover:-translate-y-0.5 hover:border-[#059669]/55 dark:bg-[#07100B]/86 dark:text-[#DDF2E7]`}
              >
                <span className="h-2 w-2 rounded-xs bg-[#34D399]" aria-hidden="true" />
                <span>Main Stage</span>
                <ArrowRight className="h-3.5 w-3.5 text-[#34D399]" />
              </button>

              <button
                type="button"
                onClick={onOpenAnalytics}
                className={`hero-float-panel float-card surface-luxe pointer-events-auto w-full max-w-[255px] rounded-2xl border ${zoomBorderTone} bg-[#EEF4F0]/90 p-3.5 text-left text-[#091911] transition-colors hover:border-[#059669]/55 dark:bg-gradient-to-br dark:from-[#08120D]/88 dark:to-[#040806]/88 dark:text-[#DDF2E7]`}
              >
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span>Live Analytics</span>
                  <span className="font-mono text-[11px] font-bold text-[#34D399]">
                    Live telemetry
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
                    Online Now · Open Report
                  </span>
                </div>
              </button>
            </div>

            <div className="flex items-center justify-end pr-1">
              <button
                type="button"
                onClick={onEnterExplore}
                className={`hero-float-panel surface-luxe pointer-events-auto inline-flex items-center gap-2 rounded-xl border ${zoomBorderTone} bg-[#EEF4F0]/90 px-3.5 py-2 text-xs font-semibold text-[#091911] transition-transform hover:-translate-y-0.5 hover:border-[#059669]/55 dark:bg-[#07100B]/86 dark:text-[#DDF2E7]`}
              >
                <span className="h-2 w-2 rounded-xs bg-[#10B981]" aria-hidden="true" />
                <span>Expo Hall · {snapshot.booths.length} Booths</span>
                <Compass className="h-3.5 w-3.5 text-[#10B981]" />
              </button>
            </div>

            <div className="grid gap-3.5 sm:grid-cols-2">
              <div className={`hero-float-panel float-card-alt surface-luxe pointer-events-auto rounded-2xl border ${zoomBorderTone} bg-[#EEF4F0]/90 p-3.5 text-[#091911] dark:bg-gradient-to-br dark:from-[#08120D]/88 dark:to-[#040806]/88 dark:text-[#DDF2E7]`}>
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
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-[#E4EDE7] font-mono text-[9px] font-bold text-[#040705] dark:border-[#070E0A]"
                        style={{ backgroundColor: ex.logoColor || '#34D399' }}
                        title={ex.companyName}
                      >
                        {ex.companyName.slice(0, 2).toUpperCase()}
                      </span>
                    ))}
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() =>
                      currentUser ? onOpenPortals('attendee') : onOpenAuth('attendee', 'role-select')
                    }
                  >
                    Join Session
                  </Button>
                </div>

                <p className="mt-2.5 truncate text-[11px] text-[#355243] dark:text-[#8EAD9E]">
                  {featuredSession ? featuredSession.title : 'Keynote & Exhibitor Networking'}
                </p>
              </div>

              <button
                type="button"
                onClick={onEnterExplore}
                className={`hero-float-panel surface-luxe pointer-events-auto rounded-2xl border ${zoomBorderTone} bg-[#EEF4F0]/90 p-3.5 text-left text-[#091911] transition-colors hover:border-[#059669]/55 dark:bg-gradient-to-br dark:from-[#08120D]/88 dark:to-[#040806]/88 dark:text-[#DDF2E7]`}
              >
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span>Exhibitor Roster</span>
                  <span className="font-mono text-[10px] text-[#355243] dark:text-[#8EAD9E]">
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
                      <span className="w-16 shrink-0 text-[#355243] dark:text-[#8EAD9E]">
                        {row.label}
                      </span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#D3E2D8] dark:bg-[#2A6F52]/28">
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
          </div>
        </div>
      </section>

      {/* SECTION 2: FEATURED EXPOS & CATEGORY FILTER */}
      <section id="expos" className="gsap-section zoom-adaptive-section py-14">
        <div className={panelClass}>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-mono text-xs font-semibold uppercase tracking-wider text-[#059669] dark:text-[#34D399]">
                Featured Expos
              </p>
              <h2 className="mt-1 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
                Upcoming &amp; Live Exhibitions
              </h2>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {categories.map((cat) => (
                <Button
                  key={cat}
                  size="sm"
                  variant={selectedCategory === cat ? 'primary' : 'outline'}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </Button>
              ))}
            </div>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filteredExpos.map((expo) => {
              const isRegistered = currentUser ? expo.registeredUserIds.includes(currentUser.id) : false;
              return (
                <Card key={expo.id} interactive padding="md" className="flex flex-col justify-between bg-[#E6EFE9] dark:bg-[#050A07]">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <Badge tone={expo.status === 'live' ? 'emerald' : 'teal'}>
                        {expo.status}
                      </Badge>
                      <span className="font-mono text-[11px] text-[#355243] dark:text-[#8EAD9E]">
                        {expo.category}
                      </span>
                    </div>
                    <h3 className="mt-3 font-display text-lg font-bold tracking-tight">
                      {expo.title}
                    </h3>
                    <div className="mt-2 space-y-1 text-xs text-[#355243] dark:text-[#8EAD9E]">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-[#10B981]" />
                        <span>
                          {expo.date} → {expo.endDate}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-[#34D399]" />
                        <span>{expo.location}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-[#2DD4BF]" />
                        <span>{expo.registeredUserIds.length} registered attendees</span>
                      </div>
                    </div>
                    <p className="mt-3 text-xs leading-relaxed text-[#355243] dark:text-[#8EAD9E]">
                      {expo.description}
                    </p>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[#104E35]/14 pt-4 dark:border-[#2A6F52]/28">
                    {isRegistered ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        leftIcon={<CheckCircle2 className="h-3.5 w-3.5 text-[#10B981]" />}
                        onClick={() => onOpenPortals('attendee')}
                      >
                        Registered · View Pass
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() =>
                          currentUser ? onRegisterExpo(expo.id) : onOpenAuth('attendee', 'register')
                        }
                      >
                        Register Pass
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={onEnterExplore}>
                      Inspect Floor
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* SECTION 3: FEATURED EXHIBITORS & INTERACTIVE BOOTH MATRIX */}
      <section id="exhibitors" className="gsap-section zoom-adaptive-section py-10">
        <div className={panelClass}>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-mono text-xs font-semibold uppercase tracking-wider text-[#F97362]">
                Verified Directory
              </p>
              <h2 className="mt-1 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
                Featured Exhibitors &amp; Live Floor Matrix
              </h2>
            </div>
            <Button variant="outline" size="sm" onClick={onEnterExplore}>
              Open Full 3D Hall
            </Button>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-12">
            <div className="grid gap-4 sm:grid-cols-2 lg:col-span-7">
              {filteredExhibitors.slice(0, 4).map((ex) => {
                const booth = snapshot.booths.find((b) => b.exhibitorId === ex.id);
                return (
                  <Card key={ex.id} interactive padding="md" className="bg-[#E6EFE9] dark:bg-[#050A07]">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-mono text-xs font-bold text-[#02120B]"
                          style={{ backgroundColor: ex.logoColor || '#10B981' }}
                        >
                          {ex.companyName.slice(0, 2).toUpperCase()}
                        </span>
                        <div>
                          <h3 className="font-display text-sm font-bold">{ex.companyName}</h3>
                          <div className="font-mono text-[11px] text-[#355243] dark:text-[#8EAD9E]">
                            {ex.category}
                          </div>
                        </div>
                      </div>
                      {booth && <Badge tone="emerald">Booth {booth.number}</Badge>}
                    </div>
                    <p className="mt-2.5 text-xs leading-relaxed text-[#355243] dark:text-[#8EAD9E]">
                      {ex.tagline}
                    </p>
                    <div className="mt-3 flex items-center justify-between border-t border-[#104E35]/14 pt-2.5 text-xs dark:border-[#2A6F52]/28">
                      <span className="font-mono text-[11px] text-[#355243] dark:text-[#8EAD9E]">
                        {ex.products.length} products · {ex.profileViews} views
                      </span>
                      {booth && (
                        <Button variant="text" onClick={() => onSelectBooth(booth.id)}>
                          Inspect in 3D
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Interactive 24-Booth Matrix */}
            <Card padding="md" className="flex flex-col justify-between bg-[#E6EFE9] dark:bg-[#050A07] lg:col-span-5">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-base font-bold">Live 24-Booth Floor Matrix</h3>
                  <span className="font-mono text-[11px] text-[#059669] dark:text-[#34D399]">
                    Click any booth
                  </span>
                </div>
                <p className="mt-1 text-xs text-[#355243] dark:text-[#8EAD9E]">
                  Synchronized with server state over Socket.io. Emerald spaces are open for instant reservation.
                </p>
                <div className="mt-4 grid grid-cols-6 gap-2 rounded-xl border border-[#104E35]/16 bg-[#F0F5F2] p-3 dark:border-[#2A6F52]/34 dark:bg-[#08110C]">
                  {snapshot.booths.slice(0, 24).map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => onSelectBooth(b.id)}
                      title={`Booth ${b.number} · ${b.status}${b.exhibitorName ? ` (${b.exhibitorName})` : ''}`}
                      className="flex h-10 items-center justify-center rounded-lg font-mono text-[11px] font-bold text-[#040705] transition-transform hover:scale-105"
                      style={{ backgroundColor: STATUS_HEX[b.status] }}
                    >
                      {b.number}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#466153] dark:text-[#8EAD9E]">
                <span>{availableCount} available · {reservedCount} booked</span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    currentUser ? onOpenPortals('exhibitor') : onOpenAuth('exhibitor', 'role-select')
                  }
                >
                  Apply as Exhibitor
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* SECTION 4: LIVE EVENT SCHEDULE */}
      <section id="schedule" className="gsap-section zoom-adaptive-section py-10">
        <div className={panelClass}>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-mono text-xs font-semibold uppercase tracking-wider text-[#2DD4BF]">
                Live Timetable
              </p>
              <h2 className="mt-1 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
                Keynotes &amp; Technical Sessions
              </h2>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                currentUser ? onOpenPortals(currentUser.role) : onOpenAuth('attendee', 'role-select')
              }
            >
              Manage Personal Schedule
            </Button>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {snapshot.sessions.map((s) => {
              const bookmarked = currentUser ? s.bookmarkedUserIds.includes(currentUser.id) : false;
              return (
                <Card key={s.id} padding="md" className="flex flex-col justify-between bg-[#E6EFE9] dark:bg-[#050A07]">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-[#059669] dark:text-[#34D399]">
                        <CalendarClock className="h-3.5 w-3.5" />
                        {s.startTime}–{s.endTime}
                      </span>
                      <Badge tone="teal">{s.topic}</Badge>
                    </div>
                    <h3 className="mt-2 font-display text-base font-bold">{s.title}</h3>
                    <p className="mt-1 text-xs text-[#355243] dark:text-[#8EAD9E]">
                      {s.speaker} · {s.speakerRole}
                    </p>
                    <p className="mt-1 font-mono text-[11px] text-[#355243] dark:text-[#8EAD9E]">
                      {s.location} · {s.registeredUserIds.length}/{s.capacity} seats
                    </p>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-[#104E35]/14 pt-3 dark:border-[#2A6F52]/28">
                    <span className="font-mono text-[11px] text-[#466153] dark:text-[#8EAD9E]">
                      {s.bookmarkedUserIds.length} bookmarked
                    </span>
                    <Button
                      size="sm"
                      variant={bookmarked ? 'secondary' : 'outline'}
                      leftIcon={<Bookmark className="h-3.5 w-3.5" />}
                      onClick={() =>
                        currentUser ? onToggleSessionBookmark(s.id) : onOpenAuth('attendee', 'login')
                      }
                    >
                      {bookmarked ? 'Bookmarked' : 'Bookmark Reminder'}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* SECTION 5: HOW IT WORKS + PLATFORM METRICS + ROLE PORTALS */}
      <section id="about" className="gsap-section zoom-adaptive-section py-10">
        <div className={panelClass} data-stats-trigger="true">
          <div className="text-center">
            <p className="font-mono text-xs font-semibold uppercase tracking-wider text-[#059669] dark:text-[#34D399]">
              How EventSphere Works
            </p>
            <h2 className="mt-1 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
              From Application to Opening Day
            </h2>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { step: '01', title: 'Apply Online', copy: 'Exhibitors register with company profiles, product catalogs, and compliance docs.' },
              { step: '02', title: 'Organizer Review', copy: 'Admins review submissions, request info, or approve with structured notifications.' },
              { step: '03', title: 'Reserve Booths', copy: 'Approved exhibitors lock open emerald booths atomically on the 3D floor.' },
              { step: '04', title: 'Engage Visitors', copy: 'Attendees generate digital passes, bookmark sessions, and chat with exhibitors.' },
            ].map((item) => (
              <div
                key={item.step}
                className="rounded-xl border border-[#104E35]/16 bg-[#E6EFE9] p-5 dark:border-[#2A6F52]/32 dark:bg-[#050A07]"
              >
                <div className="font-mono text-xs font-bold text-[#059669] dark:text-[#34D399]">
                  {item.step}
                </div>
                <h3 className="mt-2 font-display text-lg font-bold">{item.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-[#355243] dark:text-[#8EAD9E]">
                  {item.copy}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-10 grid gap-6 border-t border-[#104E35]/14 pt-8 text-center dark:border-[#2A6F52]/28 sm:grid-cols-3">
            <div>
              <div className="font-display text-5xl font-extrabold tabular-nums">
                {statSync}
                <span className="text-[#34D399]">s</span>
              </div>
              <p className="mt-1 text-xs text-[#355243] dark:text-[#8EAD9E]">
                for schedule &amp; booth changes to reach every connected screen
              </p>
            </div>
            <div>
              <div className="font-display text-5xl font-extrabold tabular-nums">
                {statUsers}
                <span className="text-[#10B981]">+</span>
              </div>
              <p className="mt-1 text-xs text-[#355243] dark:text-[#8EAD9E]">
                concurrent floor users supported · {snapshot.concurrentUsers} live now
              </p>
            </div>
            <div>
              <div className="font-display text-5xl font-extrabold tabular-nums">
                {statUptime}
                <span className="text-[#2DD4BF]">%</span>
              </div>
              <p className="mt-1 text-xs text-[#355243] dark:text-[#8EAD9E]">
                availability target with offline PWA &amp; automated daily backups
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 6: FAQ + ROLE ONBOARDING CARDS */}
      <section id="faq" className="gsap-section zoom-adaptive-section py-10 pb-20">
        <div className="grid gap-6 lg:grid-cols-5">
          <div className={`${panelClass} lg:col-span-2`}>
            <h2 className="font-display text-2xl font-extrabold tracking-tight">
              Questions, answered.
            </h2>
            <div className="mt-5 grid gap-2.5 text-sm">
              {[
                {
                  q: 'How are Organizer accounts protected?',
                  a: 'Organizer registration requires a server-verified provisioning invite code alongside bcrypt password hashing and role-enforced JWT verification.',
                },
                {
                  q: 'Can two exhibitors book the same booth?',
                  a: 'No. Reservations execute atomically on the server with 409 conflict protection and broadcast instantly via Socket.io.',
                },
                {
                  q: 'Do attendees get digital event passes?',
                  a: 'Yes. Registering for any expo issues a unique pass code and QR ticket in the Attendee Portal.',
                },
                {
                  q: 'Does it work offline in convention halls?',
                  a: 'Yes. EventSphere caches the floor plan, schedules, and favorites locally as an installable PWA.',
                },
              ].map((item) => (
                <details
                  key={item.q}
                  className="rounded-xl border border-[#104E35]/16 bg-[#E6EFE9] px-4 py-3 dark:border-[#2A6F52]/32 dark:bg-[#050A07]"
                >
                  <summary className="cursor-pointer font-semibold">{item.q}</summary>
                  <p className="mt-2 text-xs leading-relaxed text-[#355243] dark:text-[#8EAD9E]">
                    {item.a}
                  </p>
                </details>
              ))}
            </div>
          </div>

          <div className={`${panelClass} lg:col-span-3`}>
            <h2 className="font-display text-2xl font-extrabold tracking-tight">
              Choose your EventSphere workspace.
            </h2>
            <p className="mt-1 text-sm text-[#355243] dark:text-[#8EAD9E]">
              Enter a dedicated role portal with guarded access and tailored workflows.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {[
                {
                  role: 'admin' as UserRole,
                  title: 'Organizer',
                  icon: <Shield className="h-5 w-5" />,
                  accent: '#10B981',
                  copy: 'Create expos, review exhibitors, allocate booths, and export reports.',
                },
                {
                  role: 'exhibitor' as UserRole,
                  title: 'Exhibitor',
                  icon: <Building2 className="h-5 w-5" />,
                  accent: '#F97362',
                  copy: 'Apply for expos, reserve open booths, manage staff and products.',
                },
                {
                  role: 'attendee' as UserRole,
                  title: 'Attendee',
                  icon: <Ticket className="h-5 w-5" />,
                  accent: '#2DD4BF',
                  copy: 'Browse expos, get digital passes, bookmark sessions, and chat.',
                },
              ].map((card) => (
                <div
                  key={card.role}
                  className="flex flex-col justify-between rounded-xl border border-[#104E35]/16 bg-[#E6EFE9] p-5 dark:border-[#2A6F52]/34 dark:bg-[#050A07]"
                >
                  <div>
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-xl text-[#02120B]"
                      style={{ backgroundColor: card.accent }}
                    >
                      {card.icon}
                    </div>
                    <h3 className="mt-3 font-display text-lg font-bold">{card.title}</h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-[#466153] dark:text-[#8EAD9E]">
                      {card.copy}
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    fullWidth
                    className="mt-5"
                    onClick={() =>
                      currentUser?.role === card.role
                        ? onOpenPortals(card.role)
                        : onOpenAuth(card.role, 'role-select')
                    }
                  >
                    Enter {card.title}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <PublicFooter
        onOpenSection={scrollToSection}
        onOpenExplore={onEnterExplore}
        onOpenAnalytics={onOpenAnalytics}
        onOpenPortal={(role) =>
          currentUser ? onOpenPortals(role || currentUser.role) : onOpenAuth(role || 'attendee', 'role-select')
        }
        onOpenSupport={onOpenNotifications}
      />
    </div>
  );
};
