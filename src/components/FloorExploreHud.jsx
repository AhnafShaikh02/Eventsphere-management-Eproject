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
import { Button } from './ui';

export const FloorExploreHud = ({
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
    const onKey = (e) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (e.key.toLowerCase() === 'h') {
        setCollapsed((v) => !v);
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        onZoomIn();
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        onZoomOut();
      } else if (e.key === '0') {
        e.preventDefault();
        onResetView();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onResetView, onZoomIn, onZoomOut]);

  const zoomTierLabel = zoomPercent >= 145 ? 'Detail' : zoomPercent <= 75 ? 'Overview' : 'Floor';

  if (collapsed) {
    return (
      <div className="no-print fixed bottom-3 left-1/2 z-30 -translate-x-1/2">
        <Button
          variant="outline"
          size="sm"
          leftIcon={<ChevronUp className="h-3.5 w-3.5 text-[#8A621C] dark:text-[#E8C987]" />}
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
        className="surface-luxe pointer-events-auto w-full max-w-[min(64rem,94vw)] rounded-xl border border-[#272732]/18 bg-[#F8F8FB]/90 px-3.5 py-2.5 text-[#0B0B0E] dark:border-[#E8C987]/22 dark:bg-[#0B0B0E]/92 dark:text-[#F2F3F7]"
      >
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Status Filter Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'all', label: `All (${total})`, color: '#E8C987' },
              { id: 'available', label: `Available (${availableCount})`, color: '#D4AF63' },
              { id: 'reserved', label: `Reserved (${reservedCount})`, color: '#F97362' },
              { id: 'occupied', label: `Occupied (${occupiedCount})`, color: '#38BDF8' },
              { id: 'pending', label: `Pending (${pendingCount})`, color: '#C58B3B' },
            ].map((item) => {
              const active = statusFilter === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onChangeStatusFilter(item.id)}
                  className={`inline-flex min-h-[32px] items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'border-[#8A621C]/55 bg-[#D4AF63]/14 text-[#0B0B0E] dark:border-[#E8C987]/55 dark:bg-[#E8C987]/14 dark:text-[#F2F3F7]'
                      : 'border-[#272732]/16 bg-[#E6E7EE]/90 text-[#3E404D] hover:text-[#0B0B0E] dark:border-[#2D2D3A]/36 dark:bg-[#121217]/90 dark:text-[#9497A6]'
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
            <Button
              variant="icon"
              size="sm"
              onClick={onZoomIn}
              title="Zoom in (+)"
              aria-label="Zoom in"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
            <span
              title="Live 3D zoom level — wheel, pinch, or +/- keys"
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#272732]/18 bg-[#E6E7EE]/90 px-2 font-mono text-[11px] font-semibold text-[#8A621C] dark:border-[#E8C987]/25 dark:bg-[#121217]/90 dark:text-[#E8C987]"
            >
              <span>{zoomPercent}%</span>
              <span className="hidden sm:inline text-[#3E404D] dark:text-[#9497A6]">· {zoomTierLabel}</span>
            </span>
            <Button
              variant="icon"
              size="sm"
              onClick={onZoomOut}
              title="Zoom out (-)"
              aria-label="Zoom out"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RotateCcw className="h-3 w-3" />}
              onClick={onResetView}
              title="Reset hall overview (0)"
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
              {nightMode ? <Sun className="h-3.5 w-3.5 text-[#E8C987]" /> : <Moon className="h-3.5 w-3.5 text-[#8A621C]" />}
            </Button>

            <Button
              variant="outline"
              size="sm"
              leftIcon={<Compass className="h-3.5 w-3.5 text-[#8A621C] dark:text-[#E8C987]" />}
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
