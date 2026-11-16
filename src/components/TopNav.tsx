import React, { useState } from 'react';
import {
  Bookmark,
  ChevronDown,
  Cloud,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Search,
  Sun,
  User,
  X,
} from 'lucide-react';
import { motion } from 'motion/react';
import type { UserAccount } from '../types/eventsphere';
import { getRoleLabel } from '../services/eventSphereClient';
import { Button, DropdownMenu } from './ui';

export type ActiveView = 'voyage' | 'explore' | 'portals' | 'analytics' | 'favorites';

interface TopNavProps {
  activeView: ActiveView;
  currentUser: UserAccount | null;
  nightMode: boolean;
  favoriteCount: number;
  scrollProgress: number;
  onChangeView: (view: ActiveView) => void;
  onNavigateSection: (sectionId: string) => void;
  onOpenSearch: () => void;
  onOpenAuth: (tab?: 'role-select' | 'login' | 'register') => void;
  onOpenCloudSync: () => void;
  onToggleNightMode: () => void;
  onLogout: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  activeView,
  currentUser,
  nightMode,
  favoriteCount,
  scrollProgress,
  onChangeView,
  onNavigateSection,
  onOpenSearch,
  onOpenAuth,
  onOpenCloudSync,
  onToggleNightMode,
  onLogout,
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks: Array<{
    id: string;
    label: string;
    active: boolean;
    onClick: () => void;
  }> = [
    {
      id: 'home',
      label: 'Home',
      active: activeView === 'voyage',
      onClick: () => {
        onChangeView('voyage');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
    },
    {
      id: 'expos',
      label: 'Explore Expos',
      active: false,
      onClick: () => onNavigateSection('expos'),
    },
    {
      id: 'floor',
      label: '3D Floor',
      active: activeView === 'explore',
      onClick: () => onChangeView('explore'),
    },
    {
      id: 'exhibitors',
      label: 'Exhibitors',
      active: false,
      onClick: () => onNavigateSection('exhibitors'),
    },
    {
      id: 'schedule',
      label: 'Schedule',
      active: false,
      onClick: () => onNavigateSection('schedule'),
    },
    {
      id: 'analytics',
      label: 'Analytics',
      active: activeView === 'analytics',
      onClick: () => onChangeView('analytics'),
    },
  ];

  const isScrolled = activeView !== 'voyage' || scrollProgress > 0.02;

  return (
    <header className="no-print fixed top-0 left-0 right-0 z-40 px-3 pt-2.5 sm:px-6">
      <nav
        aria-label="Primary navigation"
        className={`surface-luxe relative mx-auto flex max-w-7xl items-center justify-between gap-4 rounded-2xl border px-4 py-2.5 transition-all duration-200 sm:px-5 ${
          isScrolled
            ? 'border-slate-200/95 bg-white/96 text-[#09140E] shadow-lg dark:border-[#10B981]/25 dark:bg-[#060C08]/95 dark:text-[#ECFDF5]'
            : 'border-slate-200/85 bg-white/92 text-[#09140E] dark:border-[#10B981]/20 dark:bg-[#060C08]/90 dark:text-[#ECFDF5]'
        }`}
      >
        {/* Scroll progress hairline */}
        <div
          className="pointer-events-none absolute right-2 bottom-0 left-2 h-[2px] origin-left rounded-full transition-transform duration-150"
          style={{
            background: 'linear-gradient(90deg, #059669, #10B981, #6EE7B7)',
            transform: `scaleX(${activeView === 'voyage' ? scrollProgress : 1})`,
            opacity: activeView === 'voyage' ? 0.95 : 0.45,
          }}
        />

        {/* Brand */}
        <button
          type="button"
          onClick={() => {
            onChangeView('voyage');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="inline-flex items-center gap-2.5 font-display text-lg font-extrabold tracking-tight whitespace-nowrap shrink-0 text-[#09140E] transition-colors hover:text-[#059669] dark:text-[#ECFDF5] dark:hover:text-[#34D399]"
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

        {/* Desktop Nav Links */}
        <div className="hidden items-center gap-5 lg:flex">
          {navLinks.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={item.onClick}
              className={`relative min-h-[36px] px-1 py-1 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 sm:text-sm ${
                item.active
                  ? 'text-[#09140E] dark:text-[#ECFDF5]'
                  : 'text-[#466153] hover:text-[#09140E] dark:text-[#8EAD9E] dark:hover:text-[#ECFDF5]'
              }`}
            >
              <span>{item.label}</span>
              {item.active && (
                <motion.span
                  layoutId="nav-active-underline"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  className="absolute right-0 bottom-0 left-0 h-[2px] bg-[#059669] dark:bg-[#34D399]"
                />
              )}
            </button>
          ))}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="icon"
            size="sm"
            onClick={onOpenSearch}
            title="Search booths, exhibitors, and sessions (/)"
            aria-label="Open global search"
          >
            <Search className="h-3.5 w-3.5 text-[#059669] dark:text-[#34D399]" />
          </Button>

          <Button
            variant="icon"
            size="sm"
            onClick={onToggleNightMode}
            title="Toggle dark / light theme"
            aria-label="Toggle color theme"
            className="hidden sm:inline-flex"
          >
            {nightMode ? (
              <Sun className="h-3.5 w-3.5 text-[#34D399]" />
            ) : (
              <Moon className="h-3.5 w-3.5 text-[#059669]" />
            )}
          </Button>

          {currentUser ? (
            <div className="hidden items-center gap-2 sm:flex">
              <Button
                variant={activeView === 'portals' ? 'primary' : 'outline'}
                size="sm"
                leftIcon={<LayoutDashboard className="h-3.5 w-3.5" />}
                onClick={() => onChangeView('portals')}
              >
                {getRoleLabel(currentUser.role)} Portal
              </Button>

              <DropdownMenu
                trigger={
                  <button
                    type="button"
                    className="inline-flex min-h-[34px] items-center gap-2 rounded-xl border border-slate-300 bg-[#F4F7F5] px-2.5 py-1 text-xs font-semibold text-[#09140E] hover:border-[#10B981] dark:border-[#10B981]/25 dark:bg-[#09120D] dark:text-[#ECFDF5] whitespace-nowrap shrink-0"
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-[#059669] to-[#34D399] font-mono text-[10px] font-bold text-[#02120B]">
                      {currentUser.name.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="max-w-[96px] truncate">{currentUser.name}</span>
                    <ChevronDown className="h-3.5 w-3.5 text-[#466153] dark:text-[#8EAD9E]" />
                  </button>
                }
              >
                <div className="border-b border-slate-200 px-3 py-2 dark:border-[#10B981]/18">
                  <div className="text-xs font-bold">{currentUser.name}</div>
                  <div className="font-mono text-[10px] text-[#466153] dark:text-[#8EAD9E]">
                    {currentUser.email} · {getRoleLabel(currentUser.role)}
                  </div>
                </div>
                <div className="mt-1 space-y-0.5">
                  <button
                    type="button"
                    onClick={() => onChangeView('portals')}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold hover:bg-[#F4F7F5] dark:hover:bg-[#10B981]/12"
                  >
                    <LayoutDashboard className="h-3.5 w-3.5 text-[#10B981]" />
                    <span>My Portal Dashboard</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onChangeView('favorites')}
                    className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold hover:bg-[#F4F7F5] dark:hover:bg-[#10B981]/12"
                  >
                    <span className="flex items-center gap-2">
                      <Bookmark className="h-3.5 w-3.5 text-[#34D399]" />
                      <span>Saved Bookmarks</span>
                    </span>
                    <span className="font-mono text-[10px] text-[#466153] dark:text-[#8EAD9E]">
                      {favoriteCount}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={onOpenCloudSync}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold hover:bg-[#F4F7F5] dark:hover:bg-[#10B981]/12"
                  >
                    <Cloud className="h-3.5 w-3.5 text-[#2DD4BF]" />
                    <span>Cloud Sync Vault</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenAuth('login')}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold hover:bg-[#F4F7F5] dark:hover:bg-[#10B981]/12"
                  >
                    <User className="h-3.5 w-3.5 text-[#10B981]" />
                    <span>Account Profile</span>
                  </button>
                  <button
                    type="button"
                    onClick={onLogout}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-[#C2410C] hover:bg-[#F97362]/12 dark:text-[#FDA4AF]"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </DropdownMenu>
            </div>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Button variant="ghost" size="sm" onClick={() => onOpenAuth('role-select')}>
                Login
              </Button>
              <Button variant="primary" size="sm" onClick={() => onOpenAuth('register')}>
                Sign Up
              </Button>
            </div>
          )}

          <Button
            variant="icon"
            size="sm"
            className="lg:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>
      </nav>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="surface-luxe mx-auto mt-2 max-w-7xl rounded-2xl border border-slate-200 bg-white p-4 text-[#09140E] shadow-2xl dark:border-[#10B981]/25 dark:bg-[#060C08] dark:text-[#ECFDF5] lg:hidden">
          <div className="grid gap-1.5">
            {navLinks.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  item.onClick();
                  setMobileOpen(false);
                }}
                className={`rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold ${
                  item.active
                    ? 'bg-[#10B981]/14 text-[#047857] dark:text-[#34D399]'
                    : 'hover:bg-[#F4F7F5] dark:hover:bg-[#10B981]/10'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3 dark:border-[#10B981]/18">
            {currentUser ? (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    onChangeView('portals');
                    setMobileOpen(false);
                  }}
                >
                  Open {getRoleLabel(currentUser.role)} Portal
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onLogout();
                    setMobileOpen(false);
                  }}
                >
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onOpenAuth('role-select');
                    setMobileOpen(false);
                  }}
                >
                  Login
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    onOpenAuth('register');
                    setMobileOpen(false);
                  }}
                >
                  Sign Up
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
