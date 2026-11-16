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

interface FloorExploreHudProps {
  nightMode: boolean;
  showFloorGrid: boolean;
  showTrussAndVisitors: boolean;
  statusFilter: StatusFilter;
  availableCount: number;
  reservedCount: number;
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
  availableCount,
  reservedCount,
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

  if (collapsed) {
    return (
      <div className="no-print fixed bottom-4 right-4 z-30">
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="surface-luxe inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-slate-300 bg-white/95 px-4 py-2 text-xs font-semibold text-[#09140E] dark:border-[#10B981]/25 dark:bg-[#040705]/95 dark:text-[#ECFDF5]"
        >
          <ChevronUp className="h-4 w-4 text-[#10B981]" />
          <span>Show 3D Controls (H)</span>
        </button>
      </div>
    );
  }

  return (
    <div className="no-print pointer-events-none fixed inset-x-0 bottom-3 z-30 flex justify-center px-3">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="surface-luxe pointer-events-auto w-full max-w-5xl rounded-2xl border border-slate-200/90 bg-white/95 px-4 py-3 text-[#09140E] dark:border-[#10B981]/22 dark:bg-[#040705]/95 dark:text-[#ECFDF5]"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Status Filter Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: 'all', label: `All (${availableCount + reservedCount + pendingCount})`, color: '#8EAD9E' },
                { id: 'available', label: `Available (${availableCount})`, color: '#34D399' },
                { id: 'reserved', label: `Reserved (${reservedCount})`, color: '#F97362' },
                { id: 'pending', label: `Pending (${pendingCount})`, color: '#A78BFA' },
              ] as const
            ).map((item) => {
              const active = statusFilter === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onChangeStatusFilter(item.id)}
                  className={`inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'border-[#059669] bg-[#10B981]/16 text-[#09140E] dark:border-[#34D399] dark:bg-[#10B981]/18 dark:text-[#ECFDF5]'
                      : 'border-slate-200 bg-[#F4F7F5] text-[#466153] hover:text-[#09140E] dark:border-[#10B981]/15 dark:bg-[#09120D] dark:text-[#8EAD9E]'
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
            <button
              type="button"
              onClick={onZoomIn}
              title="Zoom in"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-[#F4F7F5] text-[#09140E] hover:border-[#10B981] dark:border-[#10B981]/20 dark:bg-[#09120D] dark:text-[#ECFDF5]"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onZoomOut}
              title="Zoom out"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-[#F4F7F5] text-[#09140E] hover:border-[#10B981] dark:border-[#10B981]/20 dark:bg-[#09120D] dark:text-[#ECFDF5]"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onResetView}
              title="Reset hall overview"
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-[#F4F7F5] px-2.5 text-xs font-semibold text-[#09140E] hover:border-[#10B981] dark:border-[#10B981]/20 dark:bg-[#09120D] dark:text-[#ECFDF5] whitespace-nowrap"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Overview</span>
            </button>
            <button
              type="button"
              onClick={onFocusStage}
              className="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-[#F4F7F5] px-2.5 text-xs font-semibold text-[#09140E] hover:border-[#10B981] dark:border-[#10B981]/20 dark:bg-[#09120D] dark:text-[#ECFDF5] whitespace-nowrap"
            >
              Stage
            </button>
            <button
              type="button"
              onClick={onFocusPlaza}
              className="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-[#F4F7F5] px-2.5 text-xs font-semibold text-[#09140E] hover:border-[#10B981] dark:border-[#10B981]/20 dark:bg-[#09120D] dark:text-[#ECFDF5] whitespace-nowrap"
            >
              Plaza & Cars
            </button>
            <button
              type="button"
              onClick={onFocusNextAvailable}
              className="btn-luxe inline-flex h-8 items-center rounded-lg bg-gradient-to-r from-[#059669] to-[#34D399] px-3 text-xs font-bold text-[#02120B] whitespace-nowrap"
            >
              Find Open Booth
            </button>
          </div>

          {/* Layer Toggles & Collapse */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={onToggleFloorGrid}
              title="Toggle floor grid"
              className={`inline-flex h-8 items-center gap-1 rounded-lg border px-2.5 text-xs font-semibold ${
                showFloorGrid
                  ? 'border-[#34D399]/50 bg-[#34D399]/14 text-emerald-900 dark:text-[#34D399]'
                  : 'border-slate-200 bg-[#F4F7F5] text-[#466153] dark:border-[#10B981]/20 dark:bg-[#09120D] dark:text-[#8EAD9E]'
              }`}
            >
              <Grid3X3 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Grid</span>
            </button>

            <button
              type="button"
              onClick={onToggleTrussAndVisitors}
              title="Toggle overhead truss and visitors"
              className={`inline-flex h-8 items-center gap-1 rounded-lg border px-2.5 text-xs font-semibold ${
                showTrussAndVisitors
                  ? 'border-[#059669]/50 bg-[#10B981]/14 text-[#047857] dark:border-[#34D399]/40 dark:bg-[#10B981]/15 dark:text-[#34D399]'
                  : 'border-slate-200 bg-[#F4F7F5] text-[#466153] dark:border-[#10B981]/20 dark:bg-[#09120D] dark:text-[#8EAD9E]'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Crowd</span>
            </button>

            <button
              type="button"
              onClick={onToggleNightMode}
              title="Toggle Obsidian / Alabaster hall"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-[#F4F7F5] text-[#09140E] dark:border-[#10B981]/20 dark:bg-[#09120D] dark:text-[#ECFDF5]"
            >
              {nightMode ? <Sun className="h-3.5 w-3.5 text-[#34D399]" /> : <Moon className="h-3.5 w-3.5 text-[#059669]" />}
            </button>

            <button
              type="button"
              onClick={onReturnVoyage}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold text-[#09140E] dark:border-[#10B981]/25 dark:bg-[#09120D] dark:text-[#ECFDF5] whitespace-nowrap"
            >
              <Compass className="h-3.5 w-3.5 text-[#10B981]" />
              <span>Scroll Tour</span>
            </button>

            <button
              type="button"
              onClick={() => setCollapsed(true)}
              title="Hide HUD (H)"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-[#F4F7F5] text-[#466153] dark:border-[#10B981]/20 dark:bg-[#09120D] dark:text-[#8EAD9E]"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
