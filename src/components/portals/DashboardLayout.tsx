import React, { useState } from 'react';
import { Bell, Compass, LogOut, Menu, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import type { UserAccount } from '../../types/eventsphere';
import { getRoleLabel } from '../../services/eventSphereClient';
import { Badge, Button } from '../ui';

export interface PortalNavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badgeCount?: number;
}

interface DashboardLayoutProps {
  roleTitle: string;
  roleAccent: string;
  currentUser: UserAccount;
  navItems: PortalNavItem[];
  activeSection: string;
  unreadNotifications?: number;
  onSelectSection: (id: string) => void;
  onOpen3DFloor: () => void;
  onOpenNotifications: () => void;
  onLogout: () => void;
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  roleTitle,
  roleAccent,
  currentUser,
  navItems,
  activeSection,
  unreadNotifications = 0,
  onSelectSection,
  onOpen3DFloor,
  onOpenNotifications,
  onLogout,
  children,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const activeItem = navItems.find((item) => item.id === activeSection) || navItems[0];

  const renderNavList = (onPick?: () => void) => (
    <nav aria-label={`${roleTitle} navigation`} className="flex-1 space-y-1 overflow-y-auto px-2.5 py-3">
      {navItems.map((item) => {
        const active = item.id === activeSection;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              onSelectSection(item.id);
              onPick?.();
            }}
            title={collapsed ? item.label : undefined}
            className={`flex w-full items-center justify-between gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition-all ${
              active
                ? 'bg-gradient-to-r from-[#059669]/18 to-[#34D399]/14 text-[#047857] shadow-xs dark:from-[#10B981]/22 dark:to-[#34D399]/10 dark:text-[#ECFDF5]'
                : 'text-[#466153] hover:bg-[#E8EFEA] hover:text-[#09140E] dark:text-[#8EAD9E] dark:hover:bg-[#10B981]/10 dark:hover:text-[#ECFDF5]'
            }`}
          >
            <span className="flex items-center gap-2.5 min-w-0">
              <span
                className="shrink-0"
                style={active ? { color: roleAccent } : undefined}
              >
                {item.icon}
              </span>
              {!collapsed && <span className="truncate">{item.label}</span>}
            </span>
            {!collapsed && item.badgeCount !== undefined && item.badgeCount > 0 && (
              <span className="rounded-md bg-[#10B981]/18 px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#047857] dark:text-[#34D399]">
                {item.badgeCount}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );

  return (
    <div className="relative z-20 min-h-screen bg-[#E9F0EC]/97 pt-20 text-[#091911] dark:bg-[#040705]/97 dark:text-[#DDF2E7]">
      <div className="mx-auto flex max-w-[1440px] gap-0 px-3 pb-10 sm:px-6 lg:gap-6">
        {/* Desktop Sidebar */}
        <aside
          className={`surface-luxe sticky top-24 hidden h-[calc(100vh-7rem)] shrink-0 flex-col rounded-2xl border border-[#104E35]/18 bg-[#F0F5F2] transition-all duration-200 dark:border-[#2A6F52]/36 dark:bg-[#08110C] lg:flex ${
            collapsed ? 'w-[72px]' : 'w-64'
          }`}
        >
          <div className="flex items-center justify-between gap-2 border-b border-[#104E35]/16 px-3.5 py-3.5 dark:border-[#2A6F52]/30">
            {!collapsed && (
              <div className="min-w-0">
                <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#059669] dark:text-[#34D399]">
                  {getRoleLabel(currentUser.role)} Portal
                </div>
                <div className="truncate font-display text-sm font-bold">{roleTitle}</div>
              </div>
            )}
            <Button
              variant="icon"
              size="sm"
              onClick={() => setCollapsed((c) => !c)}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? (
                <PanelLeftOpen className="h-3.5 w-3.5" />
              ) : (
                <PanelLeftClose className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>

          {renderNavList()}

          <div className="border-t border-[#104E35]/16 p-3 dark:border-[#2A6F52]/30">
            {!collapsed && (
              <div className="mb-2.5 truncate px-1 text-xs">
                <div className="font-semibold truncate">{currentUser.name}</div>
                <div className="font-mono text-[10px] text-[#466153] dark:text-[#8EAD9E] truncate">
                  {currentUser.email}
                </div>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              fullWidth
              onClick={onLogout}
              leftIcon={<LogOut className="h-3.5 w-3.5" />}
            >
              {!collapsed ? 'Sign Out' : undefined}
            </Button>
          </div>
        </aside>

        {/* Mobile Drawer Overlay */}
        {mobileDrawerOpen && (
          <div
            className="fixed inset-0 z-50 flex bg-black/70 lg:hidden"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setMobileDrawerOpen(false);
            }}
          >
            <div className="flex h-full w-72 flex-col border-r border-[#104E35]/20 bg-[#F0F5F2] text-[#091911] dark:border-[#2A6F52]/38 dark:bg-[#040705] dark:text-[#DDF2E7]">
              <div className="flex items-center justify-between border-b border-[#104E35]/16 px-4 py-4 dark:border-[#2A6F52]/30">
                <div>
                  <div className="font-mono text-[10px] font-bold uppercase text-[#059669] dark:text-[#34D399]">
                    {getRoleLabel(currentUser.role)} Portal
                  </div>
                  <div className="font-display text-base font-bold">{roleTitle}</div>
                </div>
                <Button
                  variant="icon"
                  size="sm"
                  onClick={() => setMobileDrawerOpen(false)}
                  aria-label="Close portal menu"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              {renderNavList(() => setMobileDrawerOpen(false))}
              <div className="border-t border-[#104E35]/16 p-4 dark:border-[#2A6F52]/30">
                <Button
                  variant="destructive"
                  size="sm"
                  fullWidth
                  onClick={onLogout}
                  leftIcon={<LogOut className="h-3.5 w-3.5" />}
                >
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Main Workspace Canvas */}
        <main className="min-w-0 flex-1 space-y-5 pt-2">
          {/* Top Portal Breadcrumb & Actions */}
          <div className="surface-luxe flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#104E35]/18 bg-[#F0F5F2] px-4 py-3 dark:border-[#2A6F52]/36 dark:bg-[#08110C] sm:px-5">
            <div className="flex items-center gap-3">
              <Button
                variant="icon"
                size="sm"
                className="lg:hidden"
                onClick={() => setMobileDrawerOpen(true)}
                aria-label="Open portal sidebar"
              >
                <Menu className="h-4 w-4" />
              </Button>
              <div>
                <div className="flex items-center gap-2 text-[11px] font-mono text-[#466153] dark:text-[#8EAD9E]">
                  <span>{roleTitle}</span>
                  <span>/</span>
                  <span className="font-semibold text-[#059669] dark:text-[#34D399]">
                    {activeItem?.label}
                  </span>
                </div>
                <h1 className="font-display text-lg font-extrabold tracking-tight sm:text-xl">
                  {activeItem?.label}
                </h1>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="emerald">{getRoleLabel(currentUser.role)}</Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenNotifications}
                leftIcon={<Bell className="h-3.5 w-3.5 text-[#F97362]" />}
              >
                Alerts{unreadNotifications > 0 ? ` (${unreadNotifications})` : ''}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={onOpen3DFloor}
                leftIcon={<Compass className="h-3.5 w-3.5" />}
              >
                3D Floor
              </Button>
            </div>
          </div>

          {children}
        </main>
      </div>
    </div>
  );
};
