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
            ? 'border-[var(--es-border-strong)] bg-[#F8F8FB]/96 text-[#0B0B0E] shadow-lg dark:bg-[#0D0D11]/95 dark:text-[#F2F3F7]'
            : 'border-[var(--es-border)] bg-[#F8F8FB]/90 text-[#0B0B0E] dark:bg-[#0D0D11]/90 dark:text-[#F2F3F7]'
        }`}
      >
        {/* Scroll progress hairline */}
        <div
          className="pointer-events-none absolute right-2 bottom-0 left-2 h-[2px] origin-left rounded-full transition-transform duration-150"
          style={{
            background: 'linear-gradient(90deg, #8A621C, #D4AF63, #F3DCAA)',
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
          className="inline-flex items-center gap-2.5 font-display text-lg font-extrabold tracking-tight whitespace-nowrap shrink-0 text-[#0B0B0E] transition-colors hover:text-[#8A621C] dark:text-[#F8F9FC] dark:hover:text-[#E8C987]"
        >
          <span
            aria-hidden="true"
            className="h-5 w-5 rounded-full shadow-[0_0_16px_rgba(232,201,135,0.65)]"
            style={{
              background:
                'radial-gradient(circle at 32% 30%, #FFF7E0 0%, #F0D290 36%, #9E7836 74%, #1A1307 100%)',
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
                  ? 'text-[#0B0B0E] dark:text-[#F8F9FC]'
                  : 'text-[#525463] hover:text-[#0B0B0E] dark:text-[#9497A6] dark:hover:text-[#F8F9FC]'
              }`}
            >
              <span>{item.label}</span>
              {item.active && (
                <motion.span
                  layoutId="nav-active-underline"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  className="absolute right-0 bottom-0 left-0 h-[2px] bg-[#8A621C] dark:bg-[#E8C987]"
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
            <Search className="h-3.5 w-3.5 text-[#8A621C] dark:text-[#E8C987]" />
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
              <Sun className="h-3.5 w-3.5 text-[#E8C987]" />
            ) : (
              <Moon className="h-3.5 w-3.5 text-[#8A621C]" />
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
                    className="inline-flex min-h-[34px] items-center gap-2 rounded-xl border border-[#272732]/20 bg-[#E6E7EE] px-2.5 py-1 text-xs font-semibold text-[#0B0B0E] hover:border-[#8A621C]/55 dark:border-[#2D2D3A]/40 dark:bg-[#121217] dark:text-[#F2F3F7] whitespace-nowrap shrink-0"
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-[#B88B3D] to-[#F3DCAA] font-mono text-[10px] font-bold text-[#0B0B0E]">
                      {currentUser.name.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="max-w-[96px] truncate">{currentUser.name}</span>
                    <ChevronDown className="h-3.5 w-3.5 text-[#3E404D] dark:text-[#9497A6]" />
                  </button>
                }
              >
                <div className="border-b border-[#272732]/16 px-3 py-2 dark:border-[#2D2D3A]/32">
                  <div className="text-xs font-bold">{currentUser.name}</div>
                  <div className="font-mono text-[10px] text-[#525463] dark:text-[#9497A6]">
                    {currentUser.email} · {getRoleLabel(currentUser.role)}
                  </div>
                </div>
                <div className="mt-1 space-y-0.5">
                  <button
                    type="button"
                    onClick={() => onChangeView('portals')}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold hover:bg-[#F3F4F8] dark:hover:bg-[#E8C987]/12"
                  >
                    <LayoutDashboard className="h-3.5 w-3.5 text-[#8A621C] dark:text-[#E8C987]" />
                    <span>My Portal Dashboard</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onChangeView('favorites')}
                    className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold hover:bg-[#F3F4F8] dark:hover:bg-[#E8C987]/12"
                  >
                    <span className="flex items-center gap-2">
                      <Bookmark className="h-3.5 w-3.5 text-[#8A621C] dark:text-[#E8C987]" />
                      <span>Saved Bookmarks</span>
                    </span>
                    <span className="font-mono text-[10px] text-[#525463] dark:text-[#9497A6]">
                      {favoriteCount}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={onOpenCloudSync}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold hover:bg-[#F3F4F8] dark:hover:bg-[#E8C987]/12"
                  >
                    <Cloud className="h-3.5 w-3.5 text-[#2DD4BF]" />
                    <span>Cloud Sync Vault</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenAuth('login')}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold hover:bg-[#F3F4F8] dark:hover:bg-[#E8C987]/12"
                  >
                    <User className="h-3.5 w-3.5 text-[#8A621C] dark:text-[#E8C987]" />
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
        <div className="surface-luxe mx-auto mt-2 max-w-7xl rounded-2xl border border-[#272732]/20 bg-[#FFFFFF] p-4 text-[#0B0B0E] shadow-2xl dark:border-[#2D2D3A]/40 dark:bg-[#0D0D11] dark:text-[#F2F3F7] lg:hidden">
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
                    ? 'bg-[#D4AF63]/14 text-[#8A621C] dark:text-[#E8C987]'
                    : 'hover:bg-[#E6E7EE] dark:hover:bg-[#E8C987]/10'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#272732]/16 pt-3 dark:border-[#2D2D3A]/32">
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
