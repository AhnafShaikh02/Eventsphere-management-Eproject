import React, { useEffect, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Compass,
  Grid3X3,
  Layers,
  Moon,
  RotateCcw,
  Sun,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { motion } from 'motion/react';
import type { StatusFilter } from '../three/ExpoHallCanvas';
import { Button } from './ui';

interface FloorExploreHudProps {
  nightMode: boolean;
  showFloorGrid: boolean;
  showTrussAndVisitors: boolean;
  statusFilter: StatusFilter;
  zoomPercent?: number;
  availableCount: number;
  reservedCount: number;
  occupiedCount: number;
  pendingCount: number;
  onToggleNightMode: () => void;
  onToggleFloorGrid: () => void;
  onToggleTrussAndVisitors: () => void;
  onChangeStatusFilter: (filter: StatusFilter) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  onFocusStage: () => void;
  onFocusPlaza: () => void;
  onFocusNextAvailable: () => void;
  onReturnVoyage: () => void;
}

export const FloorExploreHud: React.FC<FloorExploreHudProps> = ({
  nightMode,
  showFloorGrid,
  showTrussAndVisitors,
  statusFilter,
  zoomPercent = 100,
  availableCount,
  reservedCount,
  occupiedCount,
  pendingCount,
  onToggleNightMode,
  onToggleFloorGrid,
  onToggleTrussAndVisitors,
  onChangeStatusFilter,
  onZoomIn,
  onZoomOut,
  onResetView,
  onFocusStage,
  onFocusPlaza,
  onFocusNextAvailable,
  onReturnVoyage,
}) => {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (e.key.toLowerCase() === 'h') {
        setCollapsed((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const zoomTierLabel = zoomPercent >= 145 ? 'Detail' : zoomPercent <= 75 ? 'Overview' : 'Floor';

  if (collapsed) {
    return (
      <div className="no-print fixed bottom-3 left-1/2 z-30 -translate-x-1/2">
        <Button
          variant="outline"
          size="sm"
          leftIcon={<ChevronUp className="h-3.5 w-3.5 text-[#10B981]" />}
          onClick={() => setCollapsed(false)}
          className="surface-luxe shadow-md"
        >
          Show 3D Controls (H) · {zoomPercent}%
        </Button>
      </div>
    );
  }

  const total = availableCount + reservedCount + occupiedCount + pendingCount;

  return (
    <div className="no-print pointer-events-none fixed inset-x-0 bottom-3 z-30 flex justify-center px-3">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="surface-luxe pointer-events-auto w-full max-w-[min(64rem,94vw)] rounded-xl border border-[#104E35]/18 bg-[#EEF4F0]/90 px-3.5 py-2.5 text-[#091911] dark:border-[#2A6F52]/38 dark:bg-[#050A07]/90 dark:text-[#DDF2E7]"
      >
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Status Filter Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: 'all', label: `All (${total})`, color: '#8EAD9E' },
                { id: 'available', label: `Available (${availableCount})`, color: '#34D399' },
                { id: 'reserved', label: `Reserved (${reservedCount})`, color: '#F97362' },
                { id: 'occupied', label: `Occupied (${occupiedCount})`, color: '#38BDF8' },
                { id: 'pending', label: `Pending (${pendingCount})`, color: '#A78BFA' },
              ] as const
            ).map((item) => {
              const active = statusFilter === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onChangeStatusFilter(item.id)}
                  className={`inline-flex min-h-[32px] items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'border-[#059669]/55 bg-[#10B981]/14 text-[#091911] dark:border-[#34D399]/50 dark:bg-[#10B981]/16 dark:text-[#DDF2E7]'
                      : 'border-[#104E35]/16 bg-[#E4EDE7]/90 text-[#355243] hover:text-[#091911] dark:border-[#2A6F52]/32 dark:bg-[#08110C]/90 dark:text-[#8EAD9E]'
                  }`}
                >
                  <span
                    className="inline-block h-2 w-2 rounded-xs"
                    style={{ backgroundColor: item.color }}
                  />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Camera Zoom & Focus Presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            <Button variant="icon" size="sm" onClick={onZoomIn} title="Zoom in" aria-label="Zoom in">
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
            <span
              title="Live 3D zoom level — floor borders adapt automatically"
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#104E35]/18 bg-[#E4EDE7]/90 px-2 font-mono text-[11px] font-semibold text-[#059669] dark:border-[#2A6F52]/36 dark:bg-[#08110C]/90 dark:text-[#34D399]"
            >
              <span>{zoomPercent}%</span>
              <span className="hidden sm:inline text-[#355243] dark:text-[#8EAD9E]">· {zoomTierLabel}</span>
            </span>
            <Button variant="icon" size="sm" onClick={onZoomOut} title="Zoom out" aria-label="Zoom out">
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RotateCcw className="h-3 w-3" />}
              onClick={onResetView}
              title="Reset hall overview"
            >
              Overview
            </Button>
            <Button variant="outline" size="sm" onClick={onFocusStage}>
              Stage
            </Button>
            <Button variant="outline" size="sm" onClick={onFocusPlaza}>
              Plaza &amp; Cars
            </Button>
            <Button variant="primary" size="sm" onClick={onFocusNextAvailable}>
              Find Open Booth
            </Button>
          </div>

          {/* Layer Toggles & Collapse */}
          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              variant={showFloorGrid ? 'secondary' : 'outline'}
              size="sm"
              leftIcon={<Grid3X3 className="h-3.5 w-3.5" />}
              onClick={onToggleFloorGrid}
              title="Toggle floor grid"
            >
              <span className="hidden sm:inline">Grid</span>
            </Button>

            <Button
              variant={showTrussAndVisitors ? 'secondary' : 'outline'}
              size="sm"
              leftIcon={<Layers className="h-3.5 w-3.5" />}
              onClick={onToggleTrussAndVisitors}
              title="Toggle overhead truss and visitors"
            >
              <span className="hidden sm:inline">Crowd</span>
            </Button>

            <Button
              variant="icon"
              size="sm"
              onClick={onToggleNightMode}
              title="Toggle Obsidian / Alabaster hall"
              aria-label="Toggle color mode"
            >
              {nightMode ? <Sun className="h-3.5 w-3.5 text-[#34D399]" /> : <Moon className="h-3.5 w-3.5 text-[#059669]" />}
            </Button>

            <Button
              variant="outline"
              size="sm"
              leftIcon={<Compass className="h-3.5 w-3.5 text-[#10B981]" />}
              onClick={onReturnVoyage}
            >
              Scroll Tour
            </Button>

            <Button
              variant="icon"
              size="sm"
              onClick={() => setCollapsed(true)}
              title="Hide HUD (H)"
              aria-label="Hide 3D controls"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
