import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Bell, Compass, LogOut, Menu, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import { getRoleLabel } from '../../services/eventSphereClient';
import { Badge, Button } from '../ui';

gsap.registerPlugin(ScrollTrigger);

export const DashboardLayout = ({
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

  const shellRef = useRef(null);
  const sidebarRef = useRef(null);
  const mainRef = useRef(null);
  const contentRef = useRef(null);
  const scrollBarRef = useRef(null);
  const auraOrbRef = useRef(null);

  const activeItem = navItems.find((item) => item.id === activeSection) || navItems[0];

  // Portal shell mount: sidebar nav stagger + continuous ambient glow orb
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !shellRef.current) return;

    const ctx = gsap.context(() => {
      const navButtons = sidebarRef.current?.querySelectorAll('.portal-nav-btn');
      if (navButtons && navButtons.length > 0) {
        gsap.from(navButtons, {
          x: -14,
          opacity: 0,
          duration: 0.42,
          stagger: 0.03,
          ease: 'power3.out',
          clearProps: 'transform,opacity',
        });
      }

      if (auraOrbRef.current) {
        gsap.fromTo(
          auraOrbRef.current,
          { opacity: 0.28, scale: 0.9 },
          {
            opacity: 0.56,
            scale: 1.15,
            duration: 3.4,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut',
          },
        );
      }
    }, shellRef);

    return () => ctx.revert();
  }, [roleTitle]);

  // Section switch + ScrollTrigger choreography (scroll text, cards, booths, rows, glow)
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const mainEl = mainRef.current;
    const contentEl = contentRef.current;
    if (!mainEl || !contentEl) return;

    if (reduce) {
      if (scrollBarRef.current) scrollBarRef.current.style.transform = 'scaleX(1)';
      return;
    }

    const ctx = gsap.context(() => {
      // 1. Header kinetic text reveal on section switch
      const headerEls = mainEl.querySelectorAll('.portal-header-crumb, .portal-header-title');
      if (headerEls.length > 0) {
        gsap.fromTo(
          headerEls,
          { y: 14, opacity: 0, filter: 'blur(6px)' },
          {
            y: 0,
            opacity: 1,
            filter: 'blur(0px)',
            duration: 0.52,
            stagger: 0.06,
            ease: 'power3.out',
            clearProps: 'transform,opacity,filter',
          },
        );
      }

      // 2. Scroll progress glow bar tied to workspace scroll
      if (scrollBarRef.current) {
        gsap.fromTo(
          scrollBarRef.current,
          { scaleX: 0.08 },
          {
            scaleX: 1,
            ease: 'none',
            scrollTrigger: {
              trigger: contentEl,
              start: 'top 140px',
              end: 'bottom bottom',
              scrub: 0.25,
            },
          },
        );
      }

      // 3. KPI StatCards stagger + subtle luminous glow arrival
      const statCards = Array.from(contentEl.querySelectorAll('[data-gsap-stat="true"]'));
      if (statCards.length > 0) {
        gsap.fromTo(
          statCards,
          { y: 20, opacity: 0, scale: 0.97 },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            duration: 0.55,
            stagger: 0.06,
            ease: 'power3.out',
            clearProps: 'transform,opacity',
          },
        );
      }

      // 4. Cards & section panels: above-fold stagger + below-fold ScrollTrigger reveal with glow pulse
      const cards = Array.from(contentEl.querySelectorAll('.surface-luxe:not([data-gsap-stat="true"])'));
      const aboveFoldCards = [];
      const belowFoldCards = [];

      cards.forEach((card) => {
        const rect = card.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.92) {
          aboveFoldCards.push(card);
        } else {
          belowFoldCards.push(card);
        }
      });

      if (aboveFoldCards.length > 0) {
        gsap.fromTo(
          aboveFoldCards,
          { y: 20, opacity: 0, scale: 0.985 },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            duration: 0.56,
            delay: 0.05,
            stagger: 0.055,
            ease: 'power3.out',
            clearProps: 'transform,opacity',
          },
        );
      }

      belowFoldCards.forEach((card) => {
        gsap.fromTo(
          card,
          { y: 26, opacity: 0, scale: 0.985 },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            duration: 0.58,
            ease: 'power3.out',
            clearProps: 'transform,opacity',
            scrollTrigger: {
              trigger: card,
              start: 'top 90%',
              once: true,
            },
          },
        );
      });

      // 5. Scroll-triggered kinetic text reveal for h2 / h3 section headings inside portals
      const headings = Array.from(contentEl.querySelectorAll('h2, h3'));
      headings.forEach((heading, idx) => {
        const rect = heading.getBoundingClientRect();
        const animateIn = () => {
          gsap.fromTo(
            heading,
            { y: 14, opacity: 0, filter: 'blur(5px)' },
            {
              y: 0,
              opacity: 1,
              filter: 'blur(0px)',
              duration: 0.5,
              delay: rect.top < window.innerHeight * 0.92 ? Math.min(idx * 0.04, 0.24) : 0,
              ease: 'power3.out',
              clearProps: 'transform,opacity,filter',
            },
          );
        };

        if (rect.top < window.innerHeight * 0.92) {
          animateIn();
        } else {
          ScrollTrigger.create({
            trigger: heading,
            start: 'top 92%',
            once: true,
            onEnter: animateIn,
          });
        }
      });

      // 6. Booth matrix tiles wave reveal
      const boothTiles = Array.from(contentEl.querySelectorAll('.booth-tile-wrap'));
      if (boothTiles.length > 0) {
        gsap.fromTo(
          boothTiles,
          { y: 14, opacity: 0, scale: 0.92 },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            duration: 0.44,
            stagger: { amount: 0.42, from: 'start' },
            ease: 'power2.out',
            clearProps: 'transform,opacity',
          },
        );
      }

      // 7. Data table row scroll stagger
      const tableRows = Array.from(contentEl.querySelectorAll('tbody tr'));
      if (tableRows.length > 0) {
        gsap.fromTo(
          tableRows.slice(0, 24),
          { x: -10, opacity: 0 },
          {
            x: 0,
            opacity: 1,
            duration: 0.38,
            stagger: 0.025,
            ease: 'power2.out',
            clearProps: 'transform,opacity',
          },
        );
      }

      ScrollTrigger.refresh();
    }, mainEl);

    return () => ctx.revert();
  }, [activeSection, roleTitle]);

  const renderNavList = (onPick) => (
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
            style={
              active
                ? {
                    boxShadow: `0 0 18px -6px ${roleAccent}55`,
                  }
                : undefined
            }
            className={`portal-nav-btn flex w-full items-center justify-between gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition-all ${
              active
                ? 'bg-gradient-to-r from-[#B88B3D]/18 to-[#E8C987]/14 text-[#8A621C] shadow-xs dark:from-[#E8C987]/20 dark:to-[#D4AF63]/10 dark:text-[#F8F9FC]'
                : 'text-[#525463] hover:bg-[#ECEEF3] hover:text-[#0B0B0E] dark:text-[#9497A6] dark:hover:bg-[#E8C987]/10 dark:hover:text-[#F8F9FC]'
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
              <span className="rounded-md bg-[#D4AF63]/18 px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#8A621C] dark:text-[#E8C987]">
                {item.badgeCount}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );

  return (
    <div
      ref={shellRef}
      style={{ '--portal-accent': roleAccent }}
      className="relative z-20 min-h-screen bg-[#F3F4F7]/97 pt-20 text-[#0B0B0E] dark:bg-[#0B0B0E]/97 dark:text-[#F2F3F7]"
    >
      <div className="mx-auto flex max-w-[1440px] gap-0 px-3 pb-10 sm:px-6 lg:gap-6">
        {/* Desktop Sidebar */}
        <aside
          ref={sidebarRef}
          className={`surface-luxe portal-shell-card sticky top-24 hidden h-[calc(100vh-7rem)] shrink-0 flex-col rounded-2xl border border-[#272732]/18 bg-[#FFFFFF] transition-all duration-200 dark:border-[#2D2D3A]/36 dark:bg-[#121217] lg:flex ${
            collapsed ? 'w-[72px]' : 'w-64'
          }`}
        >
          <div className="flex items-center justify-between gap-2 border-b border-[#272732]/16 px-3.5 py-3.5 dark:border-[#2D2D3A]/30">
            {!collapsed && (
              <div className="min-w-0">
                <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#8A621C] dark:text-[#E8C987]">
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

          <div className="border-t border-[#272732]/16 p-3 dark:border-[#2D2D3A]/30">
            {!collapsed && (
              <div className="mb-2.5 truncate px-1 text-xs">
                <div className="font-semibold truncate">{currentUser.name}</div>
                <div className="font-mono text-[10px] text-[#525463] dark:text-[#9497A6] truncate">
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
            <div className="flex h-full w-72 flex-col border-r border-[#272732]/20 bg-[#FFFFFF] text-[#0B0B0E] dark:border-[#2D2D3A]/38 dark:bg-[#0B0B0E] dark:text-[#F2F3F7]">
              <div className="flex items-center justify-between border-b border-[#272732]/16 px-4 py-4 dark:border-[#2D2D3A]/30">
                <div>
                  <div className="font-mono text-[10px] font-bold uppercase text-[#8A621C] dark:text-[#E8C987]">
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
              <div className="border-t border-[#272732]/16 p-4 dark:border-[#2D2D3A]/30">
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
        <main ref={mainRef} className="min-w-0 flex-1 space-y-5 pt-2">
          {/* Top Portal Breadcrumb & Actions with Ambient Role Glow + Scroll Progress Bar */}
          <div className="surface-luxe portal-shell-card sticky top-20 z-20 rounded-2xl border border-[#272732]/18 bg-[#FFFFFF]/95 px-4 py-3 backdrop-blur-md dark:border-[#2D2D3A]/36 dark:bg-[#121217]/95 sm:px-5">
            <div
              ref={auraOrbRef}
              aria-hidden="true"
              className="portal-aura-orb absolute -top-10 right-16 h-28 w-44 rounded-full"
            />
            <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
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
                  <div className="portal-header-crumb flex items-center gap-2 text-[11px] font-mono text-[#525463] dark:text-[#9497A6]">
                    <span>{roleTitle}</span>
                    <span>/</span>
                    <span className="font-semibold text-[#8A621C] dark:text-[#E8C987]">
                      {activeItem?.label}
                    </span>
                  </div>
                  <h1 className="portal-header-title font-display text-lg font-extrabold tracking-tight sm:text-xl">
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
            <div
              ref={scrollBarRef}
              aria-hidden="true"
              className="portal-scroll-progress absolute right-3 bottom-0 left-3 rounded-full"
              style={{ transform: 'scaleX(0.08)' }}
            />
          </div>

          <div ref={contentRef} className="space-y-5">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
