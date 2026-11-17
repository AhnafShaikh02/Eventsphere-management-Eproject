import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Building2, Lock, Shield, Ticket } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { io } from 'socket.io-client';
import { AuthModal } from './components/AuthModal';
import { BoothInspectorDrawer } from './components/BoothInspectorDrawer';
import { CloudBackupModal } from './components/CloudBackupModal';
import { EventSphereAssistant } from './components/EventSphereAssistant';
import { EventVoyageView } from './components/EventVoyageView';
import { ExpoAnalyticsDashboard } from './components/ExpoAnalyticsDashboard';
import { FavoritesView } from './components/FavoritesView';
import { FloorExploreHud } from './components/FloorExploreHud';
import { NotificationAndFeedbackModal } from './components/NotificationAndFeedbackModal';
import { OfflineIndicator } from './components/PWAStatusWidgets';
import { AttendeePortal } from './components/portals/AttendeePortal';
import { ExhibitorPortal } from './components/portals/ExhibitorPortal';
import { OrganizerPortal } from './components/portals/OrganizerPortal';
import { SearchModal } from './components/SearchModal';
import { ShareModal } from './components/ShareModal';
import { type ActiveView, TopNav } from './components/TopNav';
import { Button, Card } from './components/ui';
import {
  type CloudSyncMeta,
  type LocalWorkspaceState,
  eventSphereApi,
  loadAuthSession,
  loadCachedSnapshot,
  loadSyncMeta,
  loadWorkspace,
  saveAuthSession,
  saveCachedSnapshot,
  saveSyncMeta,
  saveWorkspace,
} from './services/eventSphereClient';
import {
  ExpoHallCanvas,
  type ExpoHallCanvasHandle,
  type StatusFilter,
  type ZoomTelemetry,
} from './three/ExpoHallCanvas';
import type {
  AppNotification,
  ChatMessage,
  EventSphereSnapshot,
  ExhibitorProfile,
  ExpoBooth,
  FeedbackEntry,
  UserAccount,
  UserRole,
} from './types/eventsphere';

export default function App() {
  const canvasRef = useRef<ExpoHallCanvasHandle | null>(null);

  const [snapshot, setSnapshot] = useState<EventSphereSnapshot>(() => loadCachedSnapshot());
  const [workspace, setWorkspace] = useState<LocalWorkspaceState>(() => loadWorkspace());
  const [syncMeta, setSyncMeta] = useState<CloudSyncMeta>(() => loadSyncMeta());

  const initialAuth = useMemo(() => loadAuthSession(), []);
  const [authToken, setAuthToken] = useState<string | null>(initialAuth.token);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(initialAuth.user);
  const authTokenRef = useRef<string | null>(initialAuth.token);

  useEffect(() => {
    authTokenRef.current = authToken;
  }, [authToken]);

  const [activeView, setActiveView] = useState<ActiveView>('voyage');
  const [scrollProgress, setScrollProgress] = useState(0);
  const [zoomTelemetry, setZoomTelemetry] = useState<ZoomTelemetry>({
    distance: 26,
    zoomPercent: 100,
    zoomRatio: 0.35,
  });

  const [selectedBoothId, setSelectedBoothId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const [searchOpen, setSearchOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authDefaultRole, setAuthDefaultRole] = useState<UserRole>('attendee');
  const [authDefaultTab, setAuthDefaultTab] = useState<'role-select' | 'login' | 'register' | 'reset'>('role-select');
  const [routeToPortalAfterAuth, setRouteToPortalAfterAuth] = useState(false);
  const [cloudOpen, setCloudOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);

  const [shareTarget, setShareTarget] = useState<{
    booth: ExpoBooth;
    exhibitor: ExhibitorProfile | null;
    snapshotUrl: string | null;
  } | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 3400);
  }, []);

  const refreshStateFromServer = useCallback(async (tokenOverride?: string | null) => {
    const tokenToUse = tokenOverride !== undefined ? tokenOverride : authTokenRef.current;
    const res = await eventSphereApi.getState(tokenToUse);
    if (res.ok) {
      setSnapshot(res.data);
      saveCachedSnapshot(res.data);
    }
  }, []);

  // Sync Tailwind dark class with Night Mode preference
  useEffect(() => {
    document.documentElement.classList.toggle('dark', workspace.preferences.nightMode);
    saveWorkspace(workspace);
  }, [workspace]);

  useEffect(() => {
    saveSyncMeta(syncMeta);
  }, [syncMeta]);

  // Initial server state fetch + Socket.io real-time connection
  useEffect(() => {
    let active = true;

    eventSphereApi.getState(authToken).then((res) => {
      if (active && res.ok) {
        setSnapshot(res.data);
        saveCachedSnapshot(res.data);
      }
    });

    if (authToken) {
      eventSphereApi.getMe(authToken).then((res) => {
        if (active && res.ok) {
          setCurrentUser(res.data.user);
          saveAuthSession(authToken, res.data.user);
        } else if (active && !res.ok && res.status === 401) {
          setAuthToken(null);
          setCurrentUser(null);
          saveAuthSession(null, null);
        }
      });
    }

    const socket = io({
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
    });

    socket.on('state:sync', (nextPublicState: EventSphereSnapshot) => {
      if (!active) return;
      if (authTokenRef.current) {
        // Merge public slices immediately, then hydrate role-scoped records using JWT
        setSnapshot((prev) => ({
          ...prev,
          expos: nextPublicState.expos,
          booths: nextPublicState.booths,
          exhibitors: nextPublicState.exhibitors,
          sessions: nextPublicState.sessions,
          speakers: nextPublicState.speakers,
          analyticsSeries: nextPublicState.analyticsSeries,
          concurrentUsers: nextPublicState.concurrentUsers,
          notifications: nextPublicState.notifications,
        }));
        eventSphereApi.getState(authTokenRef.current).then((res) => {
          if (active && res.ok) {
            setSnapshot(res.data);
            saveCachedSnapshot(res.data);
          }
        });
      } else {
        setSnapshot(nextPublicState);
        saveCachedSnapshot(nextPublicState);
      }
    });

    socket.on('booth:updated', (updatedBooth: ExpoBooth) => {
      if (!active) return;
      setSnapshot((prev) => {
        const next = {
          ...prev,
          booths: prev.booths.map((b) => (b.id === updatedBooth.id ? updatedBooth : b)),
        };
        saveCachedSnapshot(next);
        return next;
      });
    });

    socket.on('presence:count', (count: number) => {
      if (!active) return;
      setSnapshot((prev) => ({ ...prev, concurrentUsers: Math.max(1, count) }));
    });

    socket.on('notification:new', (noti: AppNotification) => {
      if (!active) return;
      setSnapshot((prev) => ({
        ...prev,
        notifications: [noti, ...prev.notifications.filter((n) => n.id !== noti.id)].slice(0, 60),
      }));
      showToast(`${noti.title}: ${noti.message}`);
    });

    socket.on('chat:message', (msg: ChatMessage) => {
      if (!active) return;
      setSnapshot((prev) => {
        if (prev.messages.some((m) => m.id === msg.id)) return prev;
        return { ...prev, messages: [...prev.messages, msg].slice(-150) };
      });
    });

    return () => {
      active = false;
      socket.disconnect();
    };
  }, [authToken, showToast]);

  // Handle URL ?booth=... deep link
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const boothId = params.get('booth');
    if (boothId && snapshot.booths.some((b) => b.id === boothId)) {
      setActiveView('explore');
      setSelectedBoothId(boothId);
      setTimeout(() => canvasRef.current?.focusBooth(boothId), 200);
    }
  }, []);

  // Scroll progress tracking during Overview Voyage
  useEffect(() => {
    const onScroll = () => {
      if (activeView !== 'voyage') return;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const p = maxScroll > 0 ? Math.min(1, Math.max(0, window.scrollY / maxScroll)) : 0;
      setScrollProgress(p);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [activeView]);

  // Global keyboard shortcuts ('/' search, 'Escape' close overlays)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        if (e.key === 'Escape') {
          setSearchOpen(false);
          setAuthOpen(false);
          setCloudOpen(false);
          setAlertsOpen(false);
          setShareTarget(null);
        }
        return;
      }
      if (e.key === '/') {
        e.preventDefault();
        setSearchOpen(true);
      } else if (e.key === 'Escape') {
        setSearchOpen(false);
        setAuthOpen(false);
        setCloudOpen(false);
        setAlertsOpen(false);
        setShareTarget(null);
        setSelectedBoothId(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const selectedBooth = useMemo(
    () => snapshot.booths.find((b) => b.id === selectedBoothId) || null,
    [snapshot.booths, selectedBoothId],
  );

  const selectedExhibitor = useMemo(() => {
    if (!selectedBooth?.exhibitorId) return null;
    return snapshot.exhibitors.find((ex) => ex.id === selectedBooth.exhibitorId) || null;
  }, [snapshot.exhibitors, selectedBooth]);

  const unreadNotifications = useMemo(() => {
    const uid = currentUser?.id;
    return snapshot.notifications.filter((n) => !uid || !n.readBy.includes(uid)).length;
  }, [snapshot.notifications, currentUser?.id]);

  // Action Handlers
  const openAuthModal = useCallback(
    (
      role: UserRole = 'attendee',
      tab: 'role-select' | 'login' | 'register' | 'reset' = 'role-select',
      routeToPortal = false,
    ) => {
      setAuthDefaultRole(role);
      setAuthDefaultTab(tab);
      setRouteToPortalAfterAuth(routeToPortal);
      setAuthOpen(true);
    },
    [],
  );

  const handleLogout = useCallback(() => {
    setAuthToken(null);
    setCurrentUser(null);
    saveAuthSession(null, null);
    if (activeView === 'portals') {
      setActiveView('voyage');
    }
    showToast('Signed out');
  }, [activeView, showToast]);

  const handleNavigateSection = useCallback(
    (sectionId: string) => {
      if (activeView !== 'voyage') {
        setActiveView('voyage');
        window.setTimeout(() => {
          document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
        }, 120);
      } else {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
      }
    },
    [activeView],
  );

  const handleSelectBooth = useCallback(
    (boothId: string) => {
      setSelectedBoothId(boothId);
      canvasRef.current?.focusBooth(boothId);
      const booth = snapshot.booths.find((b) => b.id === boothId);
      if (booth?.exhibitorId) {
        eventSphereApi.recordExhibitorView(booth.exhibitorId).catch(() => {});
      }
    },
    [snapshot.booths],
  );

  const handleReserveBooth = useCallback(
    async (boothId: string) => {
      if (!authToken) {
        openAuthModal('exhibitor', 'role-select', false);
        return;
      }
      const res = await eventSphereApi.reserveBooth(authToken, boothId);
      if (!res.ok) {
        showToast(res.error);
        return;
      }
      showToast(`Booth ${res.data.number} reserved live!`);
      await refreshStateFromServer();
    },
    [authToken, openAuthModal, refreshStateFromServer, showToast],
  );

  const handleReleaseBooth = useCallback(
    async (boothId: string) => {
      if (!authToken) return;
      const res = await eventSphereApi.releaseBooth(authToken, boothId);
      if (!res.ok) {
        showToast(res.error);
        return;
      }
      showToast(`Booth ${res.data.number} released back to floor.`);
      await refreshStateFromServer();
    },
    [authToken, refreshStateFromServer, showToast],
  );

  const handleToggleFavoriteBooth = useCallback((boothId: string) => {
    setWorkspace((prev) => {
      const exists = prev.favoriteBoothIds.includes(boothId);
      const nextIds = exists
        ? prev.favoriteBoothIds.filter((id) => id !== boothId)
        : [...prev.favoriteBoothIds, boothId];
      return { ...prev, favoriteBoothIds: nextIds };
    });
  }, []);

  const handleSaveNote = useCallback(
    (boothId: string, note: string) => {
      setWorkspace((prev) => ({
        ...prev,
        notes: { ...prev.notes, [boothId]: note },
      }));
      showToast('Booth note saved locally');
    },
    [showToast],
  );

  const handleSendMessage = useCallback(
    async (channel: string, label: string, body: string): Promise<boolean> => {
      if (!authToken) {
        openAuthModal('attendee', 'role-select', false);
        return false;
      }
      const res = await eventSphereApi.sendMessage(authToken, {
        recipientChannel: channel,
        recipientLabel: label,
        body,
      });
      if (!res.ok) {
        showToast(res.error);
        return false;
      }
      await refreshStateFromServer();
      return true;
    },
    [authToken, openAuthModal, refreshStateFromServer, showToast],
  );

  const handleOpenPortals = useCallback(
    (preferredRole?: UserRole) => {
      if (!currentUser || !authToken) {
        openAuthModal(preferredRole || 'attendee', 'role-select', true);
        return;
      }
      setActiveView('portals');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [currentUser, authToken, openAuthModal],
  );

  const handleShareBooth = useCallback((booth: ExpoBooth, exhibitor: ExhibitorProfile | null) => {
    const snapshotUrl = canvasRef.current?.captureSnapshot() || null;
    setShareTarget({ booth, exhibitor, snapshotUrl });
  }, []);

  const availableCount = snapshot.booths.filter((b) => b.status === 'available').length;
  const reservedCount = snapshot.booths.filter((b) => b.status === 'reserved').length;
  const occupiedCount = snapshot.booths.filter((b) => b.status === 'occupied').length;
  const pendingCount = snapshot.booths.filter((b) => b.status === 'pending').length;

  return (
    <div className="min-h-screen bg-[#E9F0EC] text-[#091911] dark:bg-[#040705] dark:text-[#DDF2E7]">
      {/* Persistent 3D Expo Hall Canvas */}
      <ExpoHallCanvas
        ref={canvasRef}
        booths={snapshot.booths}
        selectedBoothId={selectedBoothId}
        cameraMode={activeView === 'explore' ? 'explore' : 'voyage'}
        scrollProgress={scrollProgress}
        nightMode={workspace.preferences.nightMode}
        showFloorGrid={workspace.preferences.showFloorGrid}
        showTrussAndVisitors={workspace.preferences.trussAndVisitors}
        statusFilter={statusFilter}
        onSelectBooth={handleSelectBooth}
        onZoomChange={setZoomTelemetry}
      />

      {/* Enterprise Navbar */}
      <TopNav
        activeView={activeView}
        currentUser={currentUser}
        nightMode={workspace.preferences.nightMode}
        favoriteCount={workspace.favoriteBoothIds.length}
        scrollProgress={scrollProgress}
        onChangeView={(v) => {
          if (v === 'portals' && (!currentUser || !authToken)) {
            openAuthModal('attendee', 'role-select', true);
            return;
          }
          setActiveView(v);
          if (v === 'voyage' || v === 'portals') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }}
        onNavigateSection={handleNavigateSection}
        onOpenSearch={() => setSearchOpen(true)}
        onOpenAuth={(tab) => openAuthModal('attendee', tab || 'role-select', tab !== 'login')}
        onOpenCloudSync={() => setCloudOpen(true)}
        onToggleNightMode={() =>
          setWorkspace((prev) => ({
            ...prev,
            preferences: { ...prev.preferences, nightMode: !prev.preferences.nightMode },
          }))
        }
        onLogout={handleLogout}
      />

      {/* Active Route View */}
      {activeView === 'voyage' && (
        <EventVoyageView
          snapshot={snapshot}
          currentUser={currentUser}
          unreadNotifications={unreadNotifications}
          nightMode={workspace.preferences.nightMode}
          showTrussAndVisitors={workspace.preferences.trussAndVisitors}
          favoriteCount={workspace.favoriteBoothIds.length}
          zoomTelemetry={zoomTelemetry}
          onToggleNightMode={() =>
            setWorkspace((prev) => ({
              ...prev,
              preferences: { ...prev.preferences, nightMode: !prev.preferences.nightMode },
            }))
          }
          onToggleTrussAndVisitors={() =>
            setWorkspace((prev) => ({
              ...prev,
              preferences: {
                ...prev.preferences,
                trussAndVisitors: !prev.preferences.trussAndVisitors,
              },
            }))
          }
          onEnterExplore={() => setActiveView('explore')}
          onFocusStage={() => {
            setActiveView('explore');
            window.setTimeout(() => canvasRef.current?.focusStage(), 120);
          }}
          onOpenAnalytics={() => setActiveView('analytics')}
          onOpenPortals={handleOpenPortals}
          onOpenAuth={(role, tab) => openAuthModal(role || 'attendee', tab || 'role-select', true)}
          onOpenFavorites={() => setActiveView('favorites')}
          onOpenCloudSync={() => setCloudOpen(true)}
          onOpenNotifications={() => setAlertsOpen(true)}
          onSelectBooth={handleSelectBooth}
          onRegisterExpo={async (expoId) => {
            if (!authToken) {
              openAuthModal('attendee', 'register', true);
              return;
            }
            const res = await eventSphereApi.registerForExpo(authToken, expoId);
            if (!res.ok) {
              showToast(res.error);
              return;
            }
            showToast(`Pass issued (${res.data.registration.ticketCode}) for ${res.data.expo.title}`);
            await refreshStateFromServer();
          }}
          onToggleSessionBookmark={async (sessionId) => {
            if (!authToken) {
              openAuthModal('attendee', 'login', false);
              return;
            }
            const res = await eventSphereApi.toggleSessionBookmark(authToken, sessionId);
            if (!res.ok) {
              showToast(res.error);
              return;
            }
            showToast('Session reminder updated');
            await refreshStateFromServer();
          }}
        />
      )}

      {activeView === 'explore' && (
        <FloorExploreHud
          nightMode={workspace.preferences.nightMode}
          showFloorGrid={workspace.preferences.showFloorGrid}
          showTrussAndVisitors={workspace.preferences.trussAndVisitors}
          statusFilter={statusFilter}
          zoomPercent={zoomTelemetry.zoomPercent}
          availableCount={availableCount}
          reservedCount={reservedCount}
          occupiedCount={occupiedCount}
          pendingCount={pendingCount}
          onToggleNightMode={() =>
            setWorkspace((prev) => ({
              ...prev,
              preferences: { ...prev.preferences, nightMode: !prev.preferences.nightMode },
            }))
          }
          onToggleFloorGrid={() =>
            setWorkspace((prev) => ({
              ...prev,
              preferences: { ...prev.preferences, showFloorGrid: !prev.preferences.showFloorGrid },
            }))
          }
          onToggleTrussAndVisitors={() =>
            setWorkspace((prev) => ({
              ...prev,
              preferences: {
                ...prev.preferences,
                trussAndVisitors: !prev.preferences.trussAndVisitors,
              },
            }))
          }
          onChangeStatusFilter={setStatusFilter}
          onZoomIn={() => canvasRef.current?.zoomIn()}
          onZoomOut={() => canvasRef.current?.zoomOut()}
          onResetView={() => canvasRef.current?.resetView()}
          onFocusStage={() => canvasRef.current?.focusStage()}
          onFocusPlaza={() => canvasRef.current?.focusPlaza()}
          onFocusNextAvailable={() => {
            const firstOpen = snapshot.booths.find((b) => b.status === 'available');
            if (firstOpen) handleSelectBooth(firstOpen.id);
          }}
          onReturnVoyage={() => setActiveView('voyage')}
        />
      )}

      {/* Role-Guarded Portals */}
      {activeView === 'portals' && (
        <>
          {!currentUser || !authToken ? (
            <div className="relative z-20 flex min-h-screen items-center justify-center bg-[#E9F0EC]/96 px-4 pt-24 pb-16 dark:bg-[#040705]/96">
              <Card padding="lg" className="w-full max-w-xl text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#10B981]/15 text-[#059669] dark:text-[#34D399]">
                  <Lock className="h-6 w-6" />
                </div>
                <h1 className="mt-4 font-display text-2xl font-extrabold tracking-tight">
                  Sign in to access your Role Portal
                </h1>
                <p className="mt-2 text-sm text-[#466153] dark:text-[#8EAD9E]">
                  EventSphere enforces role-based permissions. Choose your role to sign in or register an account.
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <Button
                    variant="outline"
                    leftIcon={<Shield className="h-4 w-4 text-[#10B981]" />}
                    onClick={() => openAuthModal('admin', 'login', true)}
                  >
                    Organizer
                  </Button>
                  <Button
                    variant="outline"
                    leftIcon={<Building2 className="h-4 w-4 text-[#F97362]" />}
                    onClick={() => openAuthModal('exhibitor', 'login', true)}
                  >
                    Exhibitor
                  </Button>
                  <Button
                    variant="outline"
                    leftIcon={<Ticket className="h-4 w-4 text-[#2DD4BF]" />}
                    onClick={() => openAuthModal('attendee', 'login', true)}
                  >
                    Attendee
                  </Button>
                </div>
                <div className="mt-4 flex justify-center gap-2">
                  <Button
                    variant="primary"
                    onClick={() => openAuthModal('attendee', 'role-select', true)}
                  >
                    Open Role Selector
                  </Button>
                  <Button variant="ghost" onClick={() => setActiveView('voyage')}>
                    Return Home
                  </Button>
                </div>
              </Card>
            </div>
          ) : currentUser.role === 'admin' ? (
            <OrganizerPortal
              snapshot={snapshot}
              currentUser={currentUser}
              authToken={authToken}
              unreadNotifications={unreadNotifications}
              onRefreshState={() => refreshStateFromServer()}
              onOpen3DFloor={() => setActiveView('explore')}
              onInspectBoothOnFloor={(boothId) => {
                setActiveView('explore');
                handleSelectBooth(boothId);
              }}
              onOpenAnalytics={() => setActiveView('analytics')}
              onOpenNotifications={() => setAlertsOpen(true)}
              onOpenProfileModal={() => openAuthModal('admin', 'login', false)}
              onLogout={handleLogout}
              onToast={showToast}
            />
          ) : currentUser.role === 'exhibitor' ? (
            <ExhibitorPortal
              snapshot={snapshot}
              currentUser={currentUser}
              authToken={authToken}
              unreadNotifications={unreadNotifications}
              onRefreshState={() => refreshStateFromServer()}
              onOpen3DFloor={() => setActiveView('explore')}
              onInspectBoothOnFloor={(boothId) => {
                setActiveView('explore');
                handleSelectBooth(boothId);
              }}
              onOpenNotifications={() => setAlertsOpen(true)}
              onOpenProfileModal={() => openAuthModal('exhibitor', 'login', false)}
              onLogout={handleLogout}
              onToast={showToast}
            />
          ) : (
            <AttendeePortal
              snapshot={snapshot}
              currentUser={currentUser}
              authToken={authToken}
              unreadNotifications={unreadNotifications}
              favoriteBoothIds={workspace.favoriteBoothIds}
              notes={workspace.notes}
              onRefreshState={() => refreshStateFromServer()}
              onOpen3DFloor={() => setActiveView('explore')}
              onInspectBoothOnFloor={(boothId) => {
                setActiveView('explore');
                handleSelectBooth(boothId);
              }}
              onOpenNotifications={() => setAlertsOpen(true)}
              onOpenProfileModal={() => openAuthModal('attendee', 'login', false)}
              onLogout={handleLogout}
              onToast={showToast}
            />
          )}
        </>
      )}

      {activeView === 'analytics' && (
        <ExpoAnalyticsDashboard
          snapshot={snapshot}
          onInspectBooth={(boothId) => {
            setActiveView('explore');
            handleSelectBooth(boothId);
          }}
        />
      )}

      {activeView === 'favorites' && (
        <FavoritesView
          snapshot={snapshot}
          favoriteBoothIds={workspace.favoriteBoothIds}
          notes={workspace.notes}
          currentUserId={currentUser?.id}
          onSelectBooth={(boothId) => {
            setActiveView('explore');
            handleSelectBooth(boothId);
          }}
          onRemoveBoothFavorite={handleToggleFavoriteBooth}
          onToggleSessionBookmark={async (sessionId) => {
            if (!authToken) {
              openAuthModal('attendee', 'login', false);
              return;
            }
            await eventSphereApi.toggleSessionBookmark(authToken, sessionId);
            await refreshStateFromServer();
          }}
          onOpenExplore={() => setActiveView('explore')}
        />
      )}

      {/* Booth Inspector Slide-over */}
      <BoothInspectorDrawer
        booth={selectedBooth}
        exhibitor={selectedExhibitor}
        currentUser={currentUser}
        isFavorite={selectedBooth ? workspace.favoriteBoothIds.includes(selectedBooth.id) : false}
        personalNote={selectedBooth ? workspace.notes[selectedBooth.id] || '' : ''}
        messages={snapshot.messages}
        onClose={() => setSelectedBoothId(null)}
        onFocus3D={(boothId) => {
          setActiveView('explore');
          canvasRef.current?.focusBooth(boothId);
        }}
        onReserveBooth={handleReserveBooth}
        onReleaseBooth={handleReleaseBooth}
        onToggleFavorite={handleToggleFavoriteBooth}
        onSaveNote={handleSaveNote}
        onSendMessage={handleSendMessage}
        onShare={handleShareBooth}
        onRequireAuth={() => openAuthModal('exhibitor', 'role-select', false)}
      />

      {/* Modals */}
      <SearchModal
        isOpen={searchOpen}
        snapshot={snapshot}
        onClose={() => setSearchOpen(false)}
        onSelectBooth={(boothId) => {
          setActiveView('explore');
          handleSelectBooth(boothId);
        }}
        onJumpToSession={() => {
          if (currentUser && authToken) {
            setActiveView('portals');
          } else {
            handleNavigateSection('schedule');
          }
        }}
      />

      <AuthModal
        isOpen={authOpen}
        currentUser={currentUser}
        token={authToken}
        defaultRole={authDefaultRole}
        defaultTab={authDefaultTab}
        onClose={() => setAuthOpen(false)}
        onAuthenticated={(tok, usr) => {
          authTokenRef.current = tok;
          setAuthToken(tok);
          setCurrentUser(usr);
          saveAuthSession(tok, usr);
          refreshStateFromServer(tok);
          if (routeToPortalAfterAuth) {
            setActiveView('portals');
            window.scrollTo({ top: 0, behavior: 'smooth' });
            setRouteToPortalAfterAuth(false);
          }
        }}
        onLogout={handleLogout}
        onToast={showToast}
      />

      <ShareModal
        isOpen={Boolean(shareTarget)}
        booth={shareTarget?.booth || null}
        exhibitor={shareTarget?.exhibitor || null}
        snapshotDataUrl={shareTarget?.snapshotUrl || null}
        onClose={() => setShareTarget(null)}
        onToast={showToast}
      />

      <CloudBackupModal
        isOpen={cloudOpen}
        workspace={workspace}
        syncMeta={syncMeta}
        onClose={() => setCloudOpen(false)}
        onUpdateSyncMeta={setSyncMeta}
        onRestoreWorkspace={(next) => {
          setWorkspace(next);
          saveWorkspace(next);
        }}
        onToast={showToast}
      />

      <NotificationAndFeedbackModal
        isOpen={alertsOpen}
        notifications={snapshot.notifications}
        currentUser={currentUser}
        onClose={() => setAlertsOpen(false)}
        onMarkAllRead={async () => {
          if (!authToken) return;
          await eventSphereApi.markNotificationsRead(authToken);
          await refreshStateFromServer();
          showToast('Notifications marked as read');
        }}
        onSubmitFeedback={async (payload: {
          userName: string;
          category: FeedbackEntry['category'];
          message: string;
        }) => {
          const res = await eventSphereApi.submitFeedback(payload);
          if (!res.ok) {
            showToast(res.error);
            return false;
          }
          showToast('Feedback received by Organizer team!');
          await refreshStateFromServer();
          return true;
        }}
      />

      {/* EventSphere Voice + Text Gemini Assistant */}
      <EventSphereAssistant
        booths={snapshot.booths}
        currentUser={currentUser}
        authToken={authToken}
        activeView={activeView}
        selectedBoothId={selectedBoothId}
        exploreHudVisible={activeView === 'explore'}
        onFocusBoothIn3D={(boothId) => {
          setActiveView('explore');
          handleSelectBooth(boothId);
        }}
        onToast={showToast}
      />

      {/* PWA Offline Indicator & Live Toast */}
      <OfflineIndicator />

      <AnimatePresence>
        {toastMessage && (
          <motion.div
            key={toastMessage}
            role="status"
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="no-print fixed bottom-16 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2.5 rounded-xl border border-[#059669]/45 bg-[#040705] px-4 py-2.5 text-xs font-semibold text-[#ECFDF5] shadow-[0_14px_34px_rgba(0,0,0,0.55)] dark:border-[#34D399]/50 dark:bg-gradient-to-r dark:from-[#059669] dark:to-[#34D399] dark:text-[#02120B]"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#34D399] dark:bg-[#02120B]" aria-hidden="true" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
