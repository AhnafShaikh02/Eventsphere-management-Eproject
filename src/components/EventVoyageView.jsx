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
import { STATUS_HEX } from '../three/expoModels';
import { eventSphereApi } from '../services/eventSphereClient';
import { PWAInstallButton } from './PWAStatusWidgets';
import { PublicFooter } from './PublicFooter';
import { VenueWeatherWidget } from './VenueWeatherWidget';
import { Badge, Button, Card } from './ui';

gsap.registerPlugin(ScrollTrigger);

export const EventVoyageView = ({
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
  const rootRef = useRef(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [peekFloor, setPeekFloor] = useState(false);
  const [statSync, setStatSync] = useState(2);
  const [statUsers, setStatUsers] = useState(300);
  const [statUptime, setStatUptime] = useState(99);
  const [activeWeatherExpoId, setActiveWeatherExpoId] = useState(
    () => snapshot.expos[0]?.id || '',
  );
  const [weatherData, setWeatherData] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState(null);
  const [tempUnit, setTempUnit] = useState('C');
  const [weatherRefreshNonce, setWeatherRefreshNonce] = useState(0);

  const activeWeatherExpo = useMemo(
    () => snapshot.expos.find((e) => e.id === activeWeatherExpoId) || snapshot.expos[0] || null,
    [snapshot.expos, activeWeatherExpoId],
  );

  useEffect(() => {
    if (!activeWeatherExpo?.id) return;
    if (activeWeatherExpo.id !== activeWeatherExpoId) {
      setActiveWeatherExpoId(activeWeatherExpo.id);
    }
  }, [activeWeatherExpo?.id, activeWeatherExpoId]);

  useEffect(() => {
    const location = activeWeatherExpo?.location?.trim();
    if (!location) return;
    let cancelled = false;
    const isManualRefresh = weatherRefreshNonce > 0;

    setWeatherLoading(true);
    setWeatherError(null);

    void eventSphereApi.getVenueWeather(location, isManualRefresh).then((res) => {
      if (cancelled) return;
      setWeatherLoading(false);
      if (res.ok) {
        setWeatherData(res.data);
        setWeatherError(null);
      } else {
        setWeatherError(res.error);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [activeWeatherExpo?.location, weatherRefreshNonce]);

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

      gsap.utils.toArray('.gsap-section').forEach((section) => {
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
    const set = new Set(['All']);
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

  const scrollToSection = (sectionId) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
  };

  const zoomPercent = zoomTelemetry?.zoomPercent ?? 100;
  const zoomBorderTone =
    zoomPercent >= 140
      ? 'border-[var(--es-border-strong)]'
      : zoomPercent <= 75
        ? 'border-[var(--es-divider)]'
        : 'border-[var(--es-border)]';

  const panelClass =
    `surface-luxe zoom-adaptive-frame pointer-events-auto ${zoomBorderTone} bg-[#F8F8FB]/92 text-[#0B0B0E] dark:bg-[#101015]/88 dark:text-[#F2F3F7]`;

  return (
    <div ref={rootRef} className="relative z-10 pointer-events-none">
      {/* Bottom-left Booth Status Key & Live Zoom Readout */}
      <div
        aria-label="Booth status key"
        className={`no-print surface-luxe pointer-events-auto fixed bottom-4 left-4 z-30 hidden items-center gap-3.5 rounded-xl border ${zoomBorderTone} bg-[#F8F8FB]/90 px-3 py-1.5 text-xs font-medium text-[#3E404D] dark:bg-[#0E0E13]/88 dark:text-[#9497A6] xl:flex`}
      >
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-xs bg-[#E8C987]" />
          Available ({availableCount})
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-xs bg-[#F97362]" />
          Reserved ({reservedCount})
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-xs bg-[#C58B3B]" />
          Pending ({pendingCount})
        </span>
        <span className="border-l border-[var(--es-divider)] pl-3 font-mono text-[11px] text-[#8A621C] dark:text-[#E8C987]">
          {zoomPercent}% view
        </span>
      </div>

      {/* SECTION 1: HERO — ASYMMETRIC SHOWCASE FRAMING LIVE 3D GEODESIC EXPO SPHERE */}
      <section className="zoom-adaptive-section flex min-h-[100svh] flex-col justify-center pt-22 pb-10">
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            onClick={() => setPeekFloor((v) => !v)}
            className={`surface-luxe pointer-events-auto inline-flex items-center gap-1.5 rounded-lg border ${zoomBorderTone} bg-[#F8F8FB]/90 px-3 py-1.5 text-xs font-semibold text-[#0B0B0E] transition-colors hover:border-[var(--es-border-strong)] dark:bg-[#101015]/86 dark:text-[#F2F3F7]`}
          >
            {peekFloor ? (
              <>
                <Eye className="h-3.5 w-3.5 text-[#8A621C] dark:text-[#E8C987]" />
                <span>Show Hero Panels</span>
              </>
            ) : (
              <>
                <EyeOff className="h-3.5 w-3.5 text-[#8A621C] dark:text-[#E8C987]" />
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
          <div className={`surface-luxe zoom-adaptive-frame pointer-events-auto border ${zoomBorderTone} bg-[#F8F8FB]/90 text-[#0B0B0E] dark:bg-gradient-to-br dark:from-[#0D0D11]/88 dark:via-[#14141B]/84 dark:to-[#0B0B0E]/88 dark:text-[#F2F3F7] lg:col-span-5`}>
            <div className="rv go">
              <p className="hero-stagger font-mono text-xs font-semibold tracking-wider text-[#8A621C] dark:text-[#E8C987]">
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

              <p className="hero-stagger mt-5 max-w-xl text-base leading-relaxed text-[#525463] dark:text-[#B4B7C5]">
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
                  rightIcon={<ArrowRight className="h-4 w-4 text-[#8A621C] dark:text-[#E8C987]" />}
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
              <div className="hero-stagger mt-7 flex flex-wrap items-center gap-4 rounded-2xl border border-[var(--es-border)] bg-[#E6E7EE]/90 px-4 py-3.5 dark:bg-[#131319]/92">
                <div className="flex -space-x-2.5 shrink-0" aria-hidden="true">
                  {[
                    { label: 'OR', bg: '#D4AF63', fg: '#0B0B0E' },
                    { label: 'EX', bg: '#E8C987', fg: '#0B0B0E' },
                    { label: 'AT', bg: '#F3DCAA', fg: '#0B0B0E' },
                    { label: 'SP', bg: '#8A621C', fg: '#F8F9FC' },
                  ].map((av) => (
                    <span
                      key={av.label}
                      className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#E6E7EE] font-mono text-[11px] font-bold dark:border-[#0D0D11]"
                      style={{ backgroundColor: av.bg, color: av.fg }}
                    >
                      {av.label}
                    </span>
                  ))}
                </div>
                <div className="min-w-0 text-xs leading-snug text-[#3E404D] dark:text-[#B4B7C5]">
                  <p className="font-semibold text-[#0B0B0E] dark:text-[#F2F3F7]">
                    {snapshot.expos.length} active expos · {snapshot.exhibitors.length} verified exhibitors
                  </p>
                  <p className="mt-0.5 text-[11px] tabular-nums">
                    {snapshot.concurrentUsers} live online · {availableCount} booths open · &lt;2s sync
                  </p>
                </div>
              </div>

              {/* Compact Quick-Control Utility Dock */}
              <div className="hero-stagger mt-6 flex flex-wrap items-center gap-2 border-t border-[var(--es-divider)] pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onToggleNightMode}
                  leftIcon={
                    nightMode ? (
                      <Sun className="h-3.5 w-3.5 text-[#E8C987]" />
                    ) : (
                      <Moon className="h-3.5 w-3.5 text-[#8A621C]" />
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
                  leftIcon={<Bookmark className="h-3.5 w-3.5 text-[#8A621C] dark:text-[#E8C987]" />}
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
                  leftIcon={<Cloud className="h-3.5 w-3.5 text-[#8A621C] dark:text-[#E8C987]" />}
                >
                  Sync
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onOpenAuth('attendee', currentUser ? 'login' : 'role-select')}
                  leftIcon={<UserCheck className="h-3.5 w-3.5 text-[#8A621C] dark:text-[#E8C987]" />}
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
              <div className="flex flex-col items-start gap-2.5">
                <button
                  type="button"
                  onClick={onFocusStage}
                  className={`hero-float-panel surface-luxe pointer-events-auto inline-flex items-center gap-2 rounded-xl border ${zoomBorderTone} bg-[#F8F8FB]/90 px-3.5 py-2 text-xs font-semibold text-[#0B0B0E] transition-transform hover:-translate-y-0.5 hover:border-[var(--es-border-strong)] dark:bg-[#101015]/86 dark:text-[#F2F3F7]`}
                >
                  <span className="h-2 w-2 rounded-xs bg-[#E8C987]" aria-hidden="true" />
                  <span>Main Stage</span>
                  <ArrowRight className="h-3.5 w-3.5 text-[#8A621C] dark:text-[#E8C987]" />
                </button>

                <VenueWeatherWidget
                  variant="compact"
                  expos={snapshot.expos}
                  activeExpoId={activeWeatherExpo?.id || ''}
                  onSelectExpo={setActiveWeatherExpoId}
                  weather={weatherData}
                  loading={weatherLoading}
                  error={weatherError}
                  unit={tempUnit}
                  onToggleUnit={() => setTempUnit((u) => (u === 'C' ? 'F' : 'C'))}
                  onRefresh={() => setWeatherRefreshNonce((n) => n + 1)}
                  zoomBorderTone={zoomBorderTone}
                  onJumpToExpos={() => scrollToSection('expos')}
                />
              </div>

              <button
                type="button"
                onClick={onOpenAnalytics}
                className={`hero-float-panel float-card surface-luxe pointer-events-auto w-full max-w-[255px] rounded-2xl border ${zoomBorderTone} bg-[#F8F8FB]/90 p-3.5 text-left text-[#0B0B0E] transition-colors hover:border-[var(--es-border-strong)] dark:bg-gradient-to-br dark:from-[#131319]/88 dark:to-[#08080B]/88 dark:text-[#F2F3F7]`}
              >
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span>Live Analytics</span>
                  <span className="font-mono text-[11px] font-bold text-[#8A621C] dark:text-[#E8C987]">
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
                      <stop offset="0%" stopColor="#8A621C" />
                      <stop offset="52%" stopColor="#D4AF63" />
                      <stop offset="100%" stopColor="#F3DCAA" />
                    </linearGradient>
                    <linearGradient id="heroSparkFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#D4AF63" stopOpacity="0.38" />
                      <stop offset="100%" stopColor="#8A621C" stopOpacity="0.02" />
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
                  <span className="text-[11px] text-[#525463] dark:text-[#9497A6]">
                    Online Now · Open Report
                  </span>
                </div>
              </button>
            </div>

            <div className="flex items-center justify-end pr-1">
              <button
                type="button"
                onClick={onEnterExplore}
                className={`hero-float-panel surface-luxe pointer-events-auto inline-flex items-center gap-2 rounded-xl border ${zoomBorderTone} bg-[#F8F8FB]/90 px-3.5 py-2 text-xs font-semibold text-[#0B0B0E] transition-transform hover:-translate-y-0.5 hover:border-[var(--es-border-strong)] dark:bg-[#101015]/86 dark:text-[#F2F3F7]`}
              >
                <span className="h-2 w-2 rounded-xs bg-[#D4AF63]" aria-hidden="true" />
                <span>Expo Hall · {snapshot.booths.length} Booths</span>
                <Compass className="h-3.5 w-3.5 text-[#8A621C] dark:text-[#E8C987]" />
              </button>
            </div>

            <div className="grid gap-3.5 sm:grid-cols-2">
              <div className={`hero-float-panel float-card-alt surface-luxe pointer-events-auto rounded-2xl border ${zoomBorderTone} bg-[#F8F8FB]/90 p-3.5 text-[#0B0B0E] dark:bg-gradient-to-br dark:from-[#131319]/88 dark:to-[#08080B]/88 dark:text-[#F2F3F7]`}>
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span>Networking Lounge</span>
                  <span className="font-mono text-[10px] text-[#8A621C] dark:text-[#E8C987]">
                    {featuredSession?.startTime || 'Live'}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <div className="flex -space-x-2" aria-hidden="true">
                    {snapshot.exhibitors.slice(0, 4).map((ex) => (
                      <span
                        key={ex.id}
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-[#E6E7EE] font-mono text-[9px] font-bold text-[#0B0B0E] dark:border-[#0B0B0E]"
                        style={{ backgroundColor: ex.logoColor || '#E8C987' }}
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

                <p className="mt-2.5 truncate text-[11px] text-[#3E404D] dark:text-[#9497A6]">
                  {featuredSession ? featuredSession.title : 'Keynote & Exhibitor Networking'}
                </p>
              </div>

              <button
                type="button"
                onClick={onEnterExplore}
                className={`hero-float-panel surface-luxe pointer-events-auto rounded-2xl border ${zoomBorderTone} bg-[#F8F8FB]/90 p-3.5 text-left text-[#0B0B0E] transition-colors hover:border-[var(--es-border-strong)] dark:bg-gradient-to-br dark:from-[#131319]/88 dark:to-[#08080B]/88 dark:text-[#F2F3F7]`}
              >
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span>Exhibitor Roster</span>
                  <span className="font-mono text-[10px] text-[#3E404D] dark:text-[#9497A6]">
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
                      grad: 'linear-gradient(90deg, #B88B3D, #F3DCAA)',
                    },
                    {
                      label: 'Pending',
                      pct: pendingPct,
                      grad: 'linear-gradient(90deg, #9E7836, #C58B3B)',
                    },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center gap-2">
                      <span className="w-16 shrink-0 text-[#3E404D] dark:text-[#9497A6]">
                        {row.label}
                      </span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#D8DBE6] dark:bg-[#2D2D3A]/28">
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
              <p className="font-mono text-xs font-semibold uppercase tracking-wider text-[#8A621C] dark:text-[#E8C987]">
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

          <VenueWeatherWidget
            variant="banner"
            expos={snapshot.expos}
            activeExpoId={activeWeatherExpo?.id || ''}
            onSelectExpo={setActiveWeatherExpoId}
            weather={weatherData}
            loading={weatherLoading}
            error={weatherError}
            unit={tempUnit}
            onToggleUnit={() => setTempUnit((u) => (u === 'C' ? 'F' : 'C'))}
            onRefresh={() => setWeatherRefreshNonce((n) => n + 1)}
          />

          <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filteredExpos.map((expo) => {
              const isRegistered = currentUser ? expo.registeredUserIds.includes(currentUser.id) : false;
              const isWeatherSelected = activeWeatherExpo?.id === expo.id;
              return (
                <Card key={expo.id} interactive padding="md" className="flex flex-col justify-between bg-[#EAEBF1] dark:bg-[#0E0E13]">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <Badge tone={expo.status === 'live' ? 'emerald' : 'teal'}>
                        {expo.status}
                      </Badge>
                      <span className="font-mono text-[11px] text-[#3E404D] dark:text-[#9497A6]">
                        {expo.category}
                      </span>
                    </div>
                    <h3 className="mt-3 font-display text-lg font-bold tracking-tight">
                      {expo.title}
                    </h3>
                    <div className="mt-2 space-y-1 text-xs text-[#3E404D] dark:text-[#9497A6]">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-[#8A621C] dark:text-[#D4AF63]" />
                        <span>
                          {expo.date} → {expo.endDate}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveWeatherExpoId(expo.id)}
                        className={`flex items-center gap-1.5 text-left transition-colors hover:text-[#8A621C] dark:hover:text-[#E8C987] ${
                          isWeatherSelected ? 'font-semibold text-[#8A621C] dark:text-[#E8C987]' : ''
                        }`}
                        title="Show live weather for this venue"
                      >
                        <MapPin className="h-3.5 w-3.5 text-[#8A621C] dark:text-[#E8C987]" />
                        <span>{expo.location}</span>
                      </button>
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-[#2DD4BF]" />
                        <span>{expo.registeredUserIds.length} registered attendees</span>
                      </div>
                    </div>
                    <p className="mt-3 text-xs leading-relaxed text-[#3E404D] dark:text-[#9497A6]">
                      {expo.description}
                    </p>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[var(--es-divider)] pt-4">
                    {isRegistered ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        leftIcon={<CheckCircle2 className="h-3.5 w-3.5 text-[#8A621C] dark:text-[#E8C987]" />}
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
                  <Card key={ex.id} interactive padding="md" className="bg-[#EAEBF1] dark:bg-[#0E0E13]">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-mono text-xs font-bold text-[#0B0B0E]"
                          style={{ backgroundColor: ex.logoColor || '#E8C987' }}
                        >
                          {ex.companyName.slice(0, 2).toUpperCase()}
                        </span>
                        <div>
                          <h3 className="font-display text-sm font-bold">{ex.companyName}</h3>
                          <div className="font-mono text-[11px] text-[#3E404D] dark:text-[#9497A6]">
                            {ex.category}
                          </div>
                        </div>
                      </div>
                      {booth && <Badge tone="emerald">Booth {booth.number}</Badge>}
                    </div>
                    <p className="mt-2.5 text-xs leading-relaxed text-[#3E404D] dark:text-[#9497A6]">
                      {ex.tagline}
                    </p>
                    <div className="mt-3 flex items-center justify-between border-t border-[var(--es-divider)] pt-2.5 text-xs">
                      <span className="font-mono text-[11px] text-[#3E404D] dark:text-[#9497A6]">
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
            <Card padding="md" className="flex flex-col justify-between bg-[#EAEBF1] dark:bg-[#0E0E13] lg:col-span-5">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-base font-bold">Live 24-Booth Floor Matrix</h3>
                  <span className="font-mono text-[11px] text-[#8A621C] dark:text-[#E8C987]">
                    Click any booth
                  </span>
                </div>
                <p className="mt-1 text-xs text-[#3E404D] dark:text-[#9497A6]">
                  Synchronized with server state over Socket.io. Champagne Gold spaces are open for instant reservation.
                </p>
                <div className="mt-4 grid grid-cols-6 gap-2 rounded-xl border border-[var(--es-border)] bg-[#FFFFFF] p-3 dark:bg-[#121217]">
                  {snapshot.booths.slice(0, 24).map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => onSelectBooth(b.id)}
                      title={`Booth ${b.number} · ${b.status}${b.exhibitorName ? ` (${b.exhibitorName})` : ''}`}
                      className={`booth-tile-wrap booth-status-${b.status} group h-10 text-center`}
                    >
                      <span className="booth-tile-inner items-center justify-center gap-1 px-1 font-mono text-[11px] font-bold">
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ backgroundColor: STATUS_HEX[b.status] }}
                        />
                        <span>{b.number}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#525463] dark:text-[#9497A6]">
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
                <Card key={s.id} padding="md" className="flex flex-col justify-between bg-[#EAEBF1] dark:bg-[#0E0E13]">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-[#8A621C] dark:text-[#E8C987]">
                        <CalendarClock className="h-3.5 w-3.5" />
                        {s.startTime}–{s.endTime}
                      </span>
                      <Badge tone="teal">{s.topic}</Badge>
                    </div>
                    <h3 className="mt-2 font-display text-base font-bold">{s.title}</h3>
                    <p className="mt-1 text-xs text-[#3E404D] dark:text-[#9497A6]">
                      {s.speaker} · {s.speakerRole}
                    </p>
                    <p className="mt-1 font-mono text-[11px] text-[#3E404D] dark:text-[#9497A6]">
                      {s.location} · {s.registeredUserIds.length}/{s.capacity} seats
                    </p>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-[var(--es-divider)] pt-3">
                    <span className="font-mono text-[11px] text-[#525463] dark:text-[#9497A6]">
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
            <p className="font-mono text-xs font-semibold uppercase tracking-wider text-[#8A621C] dark:text-[#E8C987]">
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
              { step: '03', title: 'Reserve Booths', copy: 'Approved exhibitors lock open champagne booths atomically on the 3D floor.' },
              { step: '04', title: 'Engage Visitors', copy: 'Attendees generate digital passes, bookmark sessions, and chat with exhibitors.' },
            ].map((item) => (
              <div
                key={item.step}
                className="rounded-xl border border-[var(--es-border)] bg-[#EAEBF1] p-5 dark:bg-[#0E0E13]"
              >
                <div className="font-mono text-xs font-bold text-[#8A621C] dark:text-[#E8C987]">
                  {item.step}
                </div>
                <h3 className="mt-2 font-display text-lg font-bold">{item.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-[#3E404D] dark:text-[#9497A6]">
                  {item.copy}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-10 grid gap-6 border-t border-[var(--es-divider)] pt-8 text-center sm:grid-cols-3">
            <div>
              <div className="font-display text-5xl font-extrabold tabular-nums">
                {statSync}
                <span className="text-[#E8C987]">s</span>
              </div>
              <p className="mt-1 text-xs text-[#3E404D] dark:text-[#9497A6]">
                for schedule &amp; booth changes to reach every connected screen
              </p>
            </div>
            <div>
              <div className="font-display text-5xl font-extrabold tabular-nums">
                {statUsers}
                <span className="text-[#D4AF63]">+</span>
              </div>
              <p className="mt-1 text-xs text-[#3E404D] dark:text-[#9497A6]">
                concurrent floor users supported · {snapshot.concurrentUsers} live now
              </p>
            </div>
            <div>
              <div className="font-display text-5xl font-extrabold tabular-nums">
                {statUptime}
                <span className="text-[#F3DCAA]">%</span>
              </div>
              <p className="mt-1 text-xs text-[#3E404D] dark:text-[#9497A6]">
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
                  className="rounded-xl border border-[var(--es-border)] bg-[#EAEBF1] px-4 py-3 dark:bg-[#0E0E13]"
                >
                  <summary className="cursor-pointer font-semibold">{item.q}</summary>
                  <p className="mt-2 text-xs leading-relaxed text-[#3E404D] dark:text-[#9497A6]">
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
            <p className="mt-1 text-sm text-[#3E404D] dark:text-[#9497A6]">
              Enter a dedicated role portal with guarded access and tailored workflows.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {[
                {
                  role: 'admin',
                  title: 'Organizer',
                  icon: <Shield className="h-5 w-5" />,
                  accent: '#D4AF63',
                  copy: 'Create expos, review exhibitors, allocate booths, and export reports.',
                },
                {
                  role: 'exhibitor',
                  title: 'Exhibitor',
                  icon: <Building2 className="h-5 w-5" />,
                  accent: '#F97362',
                  copy: 'Apply for expos, reserve open booths, manage staff and products.',
                },
                {
                  role: 'attendee',
                  title: 'Attendee',
                  icon: <Ticket className="h-5 w-5" />,
                  accent: '#2DD4BF',
                  copy: 'Browse expos, get digital passes, bookmark sessions, and chat.',
                },
              ].map((card) => (
                <div
                  key={card.role}
                  className="flex flex-col justify-between rounded-xl border border-[var(--es-border)] bg-[#EAEBF1] p-5 dark:bg-[#0E0E13]"
                >
                  <div>
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-xl text-[#0B0B0E]"
                      style={{ backgroundColor: card.accent }}
                    >
                      {card.icon}
                    </div>
                    <h3 className="mt-3 font-display text-lg font-bold">{card.title}</h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-[#525463] dark:text-[#9497A6]">
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
