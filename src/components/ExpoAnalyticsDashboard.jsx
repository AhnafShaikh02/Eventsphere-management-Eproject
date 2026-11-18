import React, { useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { BarChart3, Download, FileJson, Printer } from 'lucide-react';
import { STATUS_HEX } from '../three/expoModels';
import { Button, Card, Input, StatCard } from './ui';

gsap.registerPlugin(ScrollTrigger);

export const ExpoAnalyticsDashboard = ({
  snapshot,
  onInspectBooth,
}) => {
  const series = snapshot.analyticsSeries;
  const minDate = series[0]?.date || '2026-01-01';
  const maxDate = series[series.length - 1]?.date || '2026-12-31';

  const [fromDate, setFromDate] = useState(() => {
    const idx = Math.max(0, series.length - 14);
    return series[idx]?.date || minDate;
  });
  const [toDate, setToDate] = useState(maxDate);
  const [hoverIdx, setHoverIdx] = useState(null);

  const rootRef = useRef(null);
  const chartCardRef = useRef(null);
  const progressRef = useRef(null);

  const filteredSeries = useMemo(() => {
    return series.filter((pt) => pt.date >= fromDate && pt.date <= toDate);
  }, [series, fromDate, toDate]);

  const applyPresetDays = (days) => {
    const startIdx = Math.max(0, series.length - days);
    setFromDate(series[startIdx]?.date || minDate);
    setToDate(maxDate);
  };

  const kpis = useMemo(() => {
    const totalTraffic = filteredSeries.reduce((sum, p) => sum + p.boothTraffic, 0);
    const totalBookmarks = filteredSeries.reduce((sum, p) => sum + p.sessionBookmarks, 0);
    const totalViews = filteredSeries.reduce((sum, p) => sum + p.profileViews, 0);
    const reservedOrOccupied = snapshot.booths.filter(
      (b) => b.status === 'reserved' || b.status === 'occupied',
    );
    const occupancyPct = snapshot.booths.length
      ? Math.round((reservedOrOccupied.length / snapshot.booths.length) * 100)
      : 0;
    const potentialRevenue = reservedOrOccupied.reduce((sum, b) => sum + b.priceUsd, 0);
    return {
      totalTraffic,
      totalBookmarks,
      totalViews,
      reservedCount: reservedOrOccupied.length,
      occupancyPct,
      potentialRevenue,
    };
  }, [filteredSeries, snapshot.booths]);

  // Mount & ScrollTrigger choreography
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      if (progressRef.current) progressRef.current.style.transform = 'scaleX(1)';
      return;
    }

    const ctx = gsap.context(() => {
      // Top scroll-linked progress glow bar
      if (progressRef.current) {
        gsap.fromTo(
          progressRef.current,
          { scaleX: 0.06 },
          {
            scaleX: 1,
            ease: 'none',
            scrollTrigger: {
              trigger: root,
              start: 'top top',
              end: 'bottom bottom',
              scrub: 0.25,
            },
          },
        );
      }

      // Header text & toolbar stagger
      gsap.fromTo(
        '.analytics-text-reveal',
        { y: 18, opacity: 0, filter: 'blur(6px)' },
        {
          y: 0,
          opacity: 1,
          filter: 'blur(0px)',
          duration: 0.6,
          stagger: 0.07,
          ease: 'power3.out',
          clearProps: 'transform,opacity,filter',
        },
      );

      // KPI cards stagger
      gsap.fromTo(
        '[data-gsap-stat="true"]',
        { y: 22, opacity: 0, scale: 0.97 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.56,
          delay: 0.08,
          stagger: 0.06,
          ease: 'power3.out',
          clearProps: 'transform,opacity',
        },
      );

      // Scroll-triggered bottom cards, table rows & animated session popularity bars
      const scrollSections = gsap.utils.toArray('.analytics-scroll-card');
      scrollSections.forEach((sec) => {
        gsap.fromTo(
          sec,
          { y: 26, opacity: 0, scale: 0.985 },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            duration: 0.58,
            ease: 'power3.out',
            clearProps: 'transform,opacity',
            scrollTrigger: {
              trigger: sec,
              start: 'top 90%',
              once: true,
            },
          },
        );
      });

      const bars = gsap.utils.toArray('.analytics-bar-fill');
      if (bars.length > 0) {
        gsap.fromTo(
          bars,
          { scaleX: 0 },
          {
            scaleX: 1,
            duration: 0.85,
            stagger: 0.07,
            ease: 'power3.out',
            transformOrigin: 'left center',
            clearProps: 'transform',
            scrollTrigger: {
              trigger: '.analytics-bars-group',
              start: 'top 90%',
              once: true,
            },
          },
        );
      }

      const rows = gsap.utils.toArray('.analytics-booth-row');
      if (rows.length > 0) {
        gsap.fromTo(
          rows,
          { x: -12, opacity: 0 },
          {
            x: 0,
            opacity: 1,
            duration: 0.42,
            stagger: 0.045,
            ease: 'power2.out',
            clearProps: 'transform,opacity',
            scrollTrigger: {
              trigger: '.analytics-booth-table',
              start: 'top 90%',
              once: true,
            },
          },
        );
      }

      ScrollTrigger.refresh();
    }, root);

    return () => ctx.revert();
  }, []);

  // Re-draw SVG trend polylines whenever date range changes
  useEffect(() => {
    const chartEl = chartCardRef.current;
    if (!chartEl) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;

    const ctx = gsap.context(() => {
      const lines = Array.from(chartEl.querySelectorAll('.analytics-polyline'));
      lines.forEach((line, idx) => {
        const length = typeof line.getTotalLength === 'function' ? line.getTotalLength() : 900;
        gsap.fromTo(
          line,
          { strokeDasharray: length, strokeDashoffset: length },
          {
            strokeDashoffset: 0,
            duration: 0.95,
            delay: idx * 0.1,
            ease: 'power2.out',
            clearProps: 'strokeDasharray,strokeDashoffset',
          },
        );
      });

      gsap.fromTo(
        chartEl.querySelectorAll('.analytics-node'),
        { scale: 0, opacity: 0 },
        {
          scale: 1,
          opacity: 1,
          duration: 0.35,
          stagger: 0.025,
          delay: 0.2,
          ease: 'back.out(1.6)',
          transformOrigin: 'center center',
          clearProps: 'transform,opacity',
        },
      );
    }, chartEl);

    return () => ctx.revert();
  }, [filteredSeries]);

  const handleExportCsv = () => {
    const headers = ['Date', 'BoothTraffic', 'SessionBookmarks', 'ExhibitorProfileViews'];
    const rows = filteredSeries.map((r) => [r.date, r.boothTraffic, r.sessionBookmarks, r.profileViews]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eventsphere-analytics-${fromDate}-to-${toDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJson = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      range: { fromDate, toDate },
      kpis,
      series: filteredSeries,
      booths: snapshot.booths,
      sessions: snapshot.sessions,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eventsphere-report-${fromDate}-to-${toDate}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const svgW = 760;
  const svgH = 220;
  const padX = 36;
  const padY = 20;
  const maxVal = Math.max(
    100,
    ...filteredSeries.map((p) => Math.max(p.boothTraffic, p.profileViews, p.sessionBookmarks)),
  );

  const buildPolyline = (pick) => {
    if (filteredSeries.length === 0) return '';
    return filteredSeries
      .map((pt, i) => {
        const x =
          filteredSeries.length === 1
            ? svgW / 2
            : padX + (i / (filteredSeries.length - 1)) * (svgW - padX * 2);
        const y = svgH - padY - (pick(pt) / maxVal) * (svgH - padY * 2);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  };

  const hoveredPoint = hoverIdx !== null ? filteredSeries[hoverIdx] : null;

  return (
    <div
      ref={rootRef}
      style={{ '--portal-accent': '#D4AF63' }}
      className="relative z-20 min-h-screen bg-[#F3F4F7]/96 px-4 pt-24 pb-16 text-[#0B0B0E] dark:bg-[#0B0B0E]/96 dark:text-[#F2F3F7] sm:px-6"
    >
      <div
        ref={progressRef}
        aria-hidden="true"
        className="portal-scroll-progress fixed top-16 right-0 left-0 z-30"
        style={{ transform: 'scaleX(0.06)' }}
      />

      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header & Export Toolbar */}
        <div className="portal-shell-card surface-luxe relative flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#272732]/18 bg-[#FFFFFF]/90 px-5 py-5 dark:border-[#2D2D3A]/34 dark:bg-[#121217]/90">
          <div aria-hidden="true" className="portal-aura-orb absolute -top-12 right-10 h-32 w-56 rounded-full" />
          <div className="relative z-10">
            <p className="analytics-text-reveal font-mono text-xs font-semibold tracking-wider text-[#8A621C] dark:text-[#E8C987]">
              Telemetry &amp; Reporting
            </p>
            <h1 className="analytics-text-reveal mt-1 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
              Live Expo Analytics
            </h1>
          </div>

          <div className="no-print relative z-10 flex flex-wrap items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Download className="h-3.5 w-3.5" />}
              onClick={handleExportCsv}
            >
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<FileJson className="h-3.5 w-3.5 text-[#8A621C] dark:text-[#E8C987]" />}
              onClick={handleExportJson}
            >
              Export JSON
            </Button>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Printer className="h-3.5 w-3.5 text-[#2DD4BF]" />}
              onClick={() => window.print()}
            >
              Print Report
            </Button>
          </div>
        </div>

        {/* Date Range Filters */}
        <Card padding="sm" className="no-print analytics-text-reveal flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-semibold text-[#525463] dark:text-[#9497A6]">
              Date Range:
            </span>
            {[7, 14, 30].map((d) => (
              <Button key={d} variant="outline" size="sm" onClick={() => applyPresetDays(d)}>
                Last {d}D
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-auto font-mono"
            />
            <span>→</span>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-auto font-mono"
            />
          </div>
        </Card>

        {/* KPI Strip (Animated via GSAP StatCard) */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Booth Occupancy"
            value={`${kpis.occupancyPct}%`}
            sublabel={`${kpis.reservedCount} / ${snapshot.booths.length} booked · $${kpis.potentialRevenue.toLocaleString()}`}
            tone="emerald"
          />
          <StatCard
            label="Booth Floor Traffic"
            value={kpis.totalTraffic.toLocaleString()}
            sublabel={`Across ${filteredSeries.length} selected days`}
            tone="emerald"
          />
          <StatCard
            label="Session Bookmarks"
            value={kpis.totalBookmarks.toLocaleString()}
            sublabel={`${snapshot.sessions.length} live scheduled tracks`}
            tone="teal"
          />
          <StatCard
            label="Concurrent Users"
            value={snapshot.concurrentUsers}
            sublabel={`${kpis.totalViews.toLocaleString()} exhibitor profile views`}
            tone="violet"
          />
        </div>

        {/* Interactive Trend Chart */}
        <div ref={chartCardRef} className="analytics-scroll-card">
          <Card padding="lg">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 font-display text-lg font-bold">
                <BarChart3 className="h-4 w-4 text-[#8A621C] dark:text-[#E8C987]" />
                <span>Engagement &amp; Traffic Velocity</span>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-xs bg-[#D4AF63]" /> Booth Traffic
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-xs bg-[#F3DCAA]" /> Profile Views
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-xs bg-[#2DD4BF]" /> Session Bookmarks
                </span>
              </div>
            </div>

            <div className="relative mt-4 overflow-x-auto">
              <svg viewBox={`0 0 ${svgW} ${svgH}`} className="h-56 w-full min-w-[540px]">
                {[0.25, 0.5, 0.75, 1].map((frac) => {
                  const y = svgH - padY - frac * (svgH - padY * 2);
                  return (
                    <line
                      key={frac}
                      x1={padX}
                      x2={svgW - padX}
                      y1={y}
                      y2={y}
                      stroke="currentColor"
                      strokeOpacity={0.1}
                      strokeDasharray="4 4"
                    />
                  );
                })}

                <polyline
                  className="analytics-polyline"
                  fill="none"
                  stroke="#D4AF63"
                  strokeWidth="3"
                  style={{ filter: 'drop-shadow(0 0 6px rgba(212,175,99,0.42))' }}
                  points={buildPolyline((p) => p.boothTraffic)}
                />
                <polyline
                  className="analytics-polyline"
                  fill="none"
                  stroke="#F3DCAA"
                  strokeWidth="2.5"
                  points={buildPolyline((p) => p.profileViews)}
                />
                <polyline
                  className="analytics-polyline"
                  fill="none"
                  stroke="#2DD4BF"
                  strokeWidth="2.5"
                  points={buildPolyline((p) => p.sessionBookmarks)}
                />

                {filteredSeries.map((pt, i) => {
                  const x =
                    filteredSeries.length === 1
                      ? svgW / 2
                      : padX + (i / (filteredSeries.length - 1)) * (svgW - padX * 2);
                  const y = svgH - padY - (pt.boothTraffic / maxVal) * (svgH - padY * 2);
                  return (
                    <g key={pt.date}>
                      <circle
                        cx={x}
                        cy={y}
                        r={hoverIdx === i ? 6 : 3.5}
                        fill="#E8C987"
                        onMouseEnter={() => setHoverIdx(i)}
                        onMouseLeave={() => setHoverIdx(null)}
                        className="analytics-node cursor-pointer"
                      />
                    </g>
                  );
                })}
              </svg>

              {hoveredPoint && (
                <div className="mt-2 flex flex-wrap items-center gap-4 rounded-lg border border-[#272732]/18 bg-[#E6E7EE] px-3 py-2 font-mono text-xs dark:border-[#2D2D3A]/36 dark:bg-[#0E0E13]">
                  <span className="font-bold">{hoveredPoint.date}</span>
                  <span className="text-[#8A621C] dark:text-[#D4AF63]">Traffic: {hoveredPoint.boothTraffic}</span>
                  <span className="text-[#9E7836] dark:text-[#F3DCAA]">Profile Views: {hoveredPoint.profileViews}</span>
                  <span className="text-[#0F766E] dark:text-[#2DD4BF]">Bookmarks: {hoveredPoint.sessionBookmarks}</span>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Breakdown Tables */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card padding="lg" className="analytics-scroll-card analytics-booth-table">
            <h2 className="font-display text-lg font-bold">Top Booth Traffic &amp; Allocation</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[#272732]/16 font-mono text-[11px] text-[#3E404D] dark:border-[#2D2D3A]/32 dark:text-[#9497A6]">
                  <tr>
                    <th className="py-2">Booth</th>
                    <th className="py-2">Exhibitor</th>
                    <th className="py-2">Status</th>
                    <th className="py-2 text-right">Visits</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#272732]/12 dark:divide-[#2D2D3A]/24">
                  {[...snapshot.booths]
                    .sort((a, b) => b.trafficCount - a.trafficCount)
                    .slice(0, 8)
                    .map((b) => (
                      <tr
                        key={b.id}
                        onClick={() => onInspectBooth(b.id)}
                        className="analytics-booth-row cursor-pointer hover:bg-[#E6E7EE] dark:hover:bg-[#E8C987]/8"
                      >
                        <td className="py-2 font-mono font-bold">{b.number}</td>
                        <td className="py-2">{b.exhibitorName || b.zone}</td>
                        <td className="py-2">
                          <span
                            className="font-mono text-[11px] font-semibold capitalize"
                            style={{ color: STATUS_HEX[b.status] }}
                          >
                            {b.status}
                          </span>
                        </td>
                        <td className="py-2 text-right font-mono tabular-nums">{b.trafficCount}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card padding="lg" className="analytics-scroll-card analytics-bars-group">
            <h2 className="font-display text-lg font-bold">Session Registration &amp; Popularity</h2>
            <div className="mt-3 space-y-3">
              {snapshot.sessions.map((s) => {
                const fillPct = Math.min(
                  100,
                  Math.round(
                    ((s.registeredUserIds.length + s.bookmarkedUserIds.length) /
                      Math.max(1, s.capacity)) *
                      100,
                  ) + 18,
                );
                return (
                  <div key={s.id} className="space-y-1">
                    <div className="flex justify-between gap-2 text-xs font-semibold">
                      <span className="truncate">{s.title}</span>
                      <span className="shrink-0 font-mono text-[11px] text-[#525463] dark:text-[#9497A6]">
                        {s.registeredUserIds.length} reg · {s.bookmarkedUserIds.length} saved
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[#ECEEF3] dark:bg-[#0B0B0E]">
                      <div
                        className="analytics-bar-fill h-full rounded-full bg-gradient-to-r from-[#B88B3D] to-[#F3DCAA]"
                        style={{
                          width: `${fillPct}%`,
                          boxShadow: '0 0 12px rgba(232, 201, 135, 0.45)',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
