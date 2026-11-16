import React from 'react';
import { Search } from 'lucide-react';
import { motion } from 'motion/react';

export type ActiveView = 'voyage' | 'explore' | 'portals' | 'analytics' | 'favorites';

interface TopNavProps {
  activeView: ActiveView;
  onChangeView: (view: ActiveView) => void;
  onOpenSearch: () => void;
  scrollProgress: number;
}

export const TopNav: React.FC<TopNavProps> = ({
  activeView,
  onChangeView,
  onOpenSearch,
  scrollProgress,
}) => {
  const navItems: Array<{ id: ActiveView; label: string }> = [
    { id: 'voyage', label: 'Overview' },
    { id: 'explore', label: '3D Floor' },
    { id: 'portals', label: 'Portals' },
    { id: 'analytics', label: 'Analytics' },
  ];

  return (
    <header className="no-print fixed top-0 left-0 right-0 z-40 px-3 pt-2.5 sm:px-6">
      <nav
        aria-label="Primary navigation"
        className="surface-luxe relative mx-auto flex max-w-7xl items-center justify-between gap-8 overflow-hidden rounded-2xl border border-slate-200/90 bg-white/94 px-4 py-2.5 text-[#09140E] dark:border-[#10B981]/22 dark:bg-[#060C08]/92 dark:text-[#ECFDF5] sm:px-6"
      >
        {/* Hairline emerald-mint scroll progress indicator along bottom edge */}
        <div
          className="pointer-events-none absolute right-0 bottom-0 left-0 h-[2px] origin-left transition-transform duration-150"
          style={{
            background: 'linear-gradient(90deg, #059669, #10B981, #6EE7B7)',
            transform: `scaleX(${activeView === 'voyage' ? scrollProgress : 1})`,
            opacity: activeView === 'voyage' ? 0.95 : 0.4,
          }}
        />

        {/* Zone 1: Brand Wordmark with miniature luminous 3D emerald orb emblem */}
        <button
          type="button"
          onClick={() => onChangeView('voyage')}
          className="inline-flex items-center gap-2.5 font-display text-lg font-extrabold tracking-tight whitespace-nowrap shrink-0 text-[#09140E] transition-colors hover:text-[#059669] dark:text-[#ECFDF5] dark:hover:text-[#34D399] sm:text-xl"
        >
          <span
            aria-hidden="true"
            className="h-5 w-5 rounded-full shadow-[0_0_16px_rgba(16,185,129,0.65)]"
            style={{
              background:
                'radial-gradient(circle at 32% 30%, #ECFDF5 0%, #34D399 34%, #065F46 74%, #020805 100%)',
            }}
          />
          <span>EventSphere</span>
        </button>

        {/* Zone 2: 4 Clean Editorial Text Links with Animated Underline */}
        <div className="flex items-center gap-3 overflow-x-auto sm:gap-7">
          {navItems.map((item) => {
            const active = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onChangeView(item.id)}
                className={`relative min-h-[38px] px-1 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 sm:text-sm ${
                  active
                    ? 'text-[#09140E] dark:text-[#ECFDF5]'
                    : 'text-[#466153] hover:text-[#09140E] dark:text-[#8EAD9E] dark:hover:text-[#ECFDF5]'
                }`}
              >
                <span>{item.label}</span>
                {active && (
                  <motion.span
                    layoutId="nav-active-underline"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    className="absolute right-0 bottom-0 left-0 h-[2px] bg-[#059669] dark:bg-[#34D399]"
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Zone 3: Single Primary Action */}
        <button
          type="button"
          onClick={onOpenSearch}
          className="btn-luxe inline-flex min-h-[38px] items-center gap-2 rounded-xl border border-slate-300/90 bg-[#F4F7F5] px-3.5 py-1.5 text-xs font-semibold text-[#09140E] hover:border-[#059669] dark:border-[#10B981]/25 dark:bg-[#0A140F] dark:text-[#ECFDF5] dark:hover:border-[#34D399] whitespace-nowrap shrink-0 sm:text-sm"
          title="Search booths, exhibitors, and sessions (/)"
        >
          <Search className="h-3.5 w-3.5 text-[#059669] dark:text-[#34D399]" aria-hidden="true" />
          <span>Search</span>
          <kbd className="hidden rounded border border-slate-300 px-1.5 py-0.5 font-mono text-[10px] text-[#466153] dark:border-[#10B981]/25 dark:text-[#8EAD9E] sm:inline">
            /
          </kbd>
        </button>
      </nav>
    </header>
  );
};
