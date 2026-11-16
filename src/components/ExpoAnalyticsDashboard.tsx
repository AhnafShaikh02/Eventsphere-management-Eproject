import React, { useMemo, useState } from 'react';
import { BarChart3, Download, FileJson, Printer } from 'lucide-react';
import { motion } from 'motion/react';
import type { EventSphereSnapshot } from '../types/eventsphere';
import { STATUS_HEX } from '../three/expoModels';
import { Button, Card, Input, StatCard } from './ui';

interface ExpoAnalyticsDashboardProps {
  snapshot: EventSphereSnapshot;
  onInspectBooth: (boothId: string) => void;
}

export const ExpoAnalyticsDashboard: React.FC<ExpoAnalyticsDashboardProps> = ({
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
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const filteredSeries = useMemo(() => {
    return series.filter((pt) => pt.date >= fromDate && pt.date <= toDate);
  }, [series, fromDate, toDate]);

  const applyPresetDays = (days: number) => {
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

  const buildPolyline = (pick: (p: (typeof filteredSeries)[number]) => number) => {
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
    <div className="relative z-20 min-h-screen bg-[#F4F7F5]/96 px-4 pt-24 pb-16 text-[#09140E] dark:bg-[#040705]/96 dark:text-[#ECFDF5] sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="mx-auto max-w-7xl space-y-6"
      >
        {/* Header & Export Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5 dark:border-[#10B981]/18">
          <div>
            <p className="font-mono text-xs font-semibold tracking-wider text-[#059669] dark:text-[#34D399]">
              Telemetry &amp; Reporting
            </p>
            <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
              Live Expo Analytics
            </h1>
          </div>

          <div className="no-print flex flex-wrap items-center gap-2">
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
              leftIcon={<FileJson className="h-3.5 w-3.5 text-[#34D399]" />}
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
        <Card padding="sm" className="no-print flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-semibold text-[#466153] dark:text-[#8EAD9E]">
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

        {/* KPI Strip */}
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
        <Card padding="lg">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 font-display text-lg font-bold">
              <BarChart3 className="h-4 w-4 text-[#34D399]" />
              <span>Engagement &amp; Traffic Velocity</span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-[#10B981]" /> Booth Traffic
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-[#6EE7B7]" /> Profile Views
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
                fill="none"
                stroke="#10B981"
                strokeWidth="3"
                points={buildPolyline((p) => p.boothTraffic)}
              />
              <polyline
                fill="none"
                stroke="#6EE7B7"
                strokeWidth="2.5"
                points={buildPolyline((p) => p.profileViews)}
              />
              <polyline
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
                      fill="#34D399"
                      onMouseEnter={() => setHoverIdx(i)}
                      onMouseLeave={() => setHoverIdx(null)}
                      className="cursor-pointer"
                    />
                  </g>
                );
              })}
            </svg>

            {hoveredPoint && (
              <div className="mt-2 flex flex-wrap items-center gap-4 rounded-lg border border-slate-200 bg-[#F4F7F5] px-3 py-2 font-mono text-xs dark:border-[#10B981]/20 dark:bg-[#040705]">
                <span className="font-bold">{hoveredPoint.date}</span>
                <span className="text-[#10B981]">Traffic: {hoveredPoint.boothTraffic}</span>
                <span className="text-[#6EE7B7]">Profile Views: {hoveredPoint.profileViews}</span>
                <span className="text-[#2DD4BF]">Bookmarks: {hoveredPoint.sessionBookmarks}</span>
              </div>
            )}
          </div>
        </Card>

        {/* Breakdown Tables */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card padding="lg">
            <h2 className="font-display text-lg font-bold">Top Booth Traffic &amp; Allocation</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 font-mono text-[11px] text-[#466153] dark:border-[#10B981]/18 dark:text-[#8EAD9E]">
                  <tr>
                    <th className="py-2">Booth</th>
                    <th className="py-2">Exhibitor</th>
                    <th className="py-2">Status</th>
                    <th className="py-2 text-right">Visits</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/6">
                  {[...snapshot.booths]
                    .sort((a, b) => b.trafficCount - a.trafficCount)
                    .slice(0, 8)
                    .map((b) => (
                      <tr
                        key={b.id}
                        onClick={() => onInspectBooth(b.id)}
                        className="cursor-pointer hover:bg-[#F4F7F5] dark:hover:bg-[#10B981]/8"
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

          <Card padding="lg">
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
                      <span className="shrink-0 font-mono text-[11px] text-[#466153] dark:text-[#8EAD9E]">
                        {s.registeredUserIds.length} reg · {s.bookmarkedUserIds.length} saved
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[#E8EFEA] dark:bg-[#040705]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#059669] to-[#34D399]"
                        style={{ width: `${fillPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </motion.div>
    </div>
  );
};
