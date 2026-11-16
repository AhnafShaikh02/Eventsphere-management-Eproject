import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { io } from 'socket.io-client';
import { AuthModal } from './components/AuthModal';
import { BoothInspectorDrawer } from './components/BoothInspectorDrawer';
import { CloudBackupModal } from './components/CloudBackupModal';
import { EventVoyageView } from './components/EventVoyageView';
import { ExpoAnalyticsDashboard } from './components/ExpoAnalyticsDashboard';
import { FavoritesView } from './components/FavoritesView';
import { FloorExploreHud } from './components/FloorExploreHud';
import { NotificationAndFeedbackModal } from './components/NotificationAndFeedbackModal';
import { OfflineIndicator } from './components/PWAStatusWidgets';
import { PortalsWorkspace } from './components/PortalsWorkspace';
import { SearchModal } from './components/SearchModal';
import { ShareModal } from './components/ShareModal';
import { type ActiveView, TopNav } from './components/TopNav';
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
import { ExpoHallCanvas, type ExpoHallCanvasHandle, type StatusFilter } from './three/ExpoHallCanvas';
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

  const [activeView, setActiveView] = useState<ActiveView>('voyage');
  const [portalTab, setPortalTab] = useState<UserRole>('attendee');
  const [scrollProgress, setScrollProgress] = useState(0);

  const [selectedBoothId, setSelectedBoothId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const [searchOpen, setSearchOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authDefaultRole, setAuthDefaultRole] = useState<'exhibitor' | 'attendee'>('attendee');
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
    }, 3200);
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

    eventSphereApi.getState().then((res) => {
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

    socket.on('state:sync', (nextState: EventSphereSnapshot) => {
      if (!active) return;
      setSnapshot(nextState);
      saveCachedSnapshot(nextState);
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

  const refreshStateFromServer = useCallback(async () => {
    const res = await eventSphereApi.getState();
    if (res.ok) {
      setSnapshot(res.data);
      saveCachedSnapshot(res.data);
    }
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
        setAuthDefaultRole('exhibitor');
        setAuthOpen(true);
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
    [authToken, refreshStateFromServer, showToast],
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
        setAuthOpen(true);
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
    [authToken, refreshStateFromServer, showToast],
  );

  const handleOpenPortals = useCallback((preferredRole?: UserRole) => {
    if (preferredRole) setPortalTab(preferredRole);
    setActiveView('portals');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleShareBooth = useCallback((booth: ExpoBooth, exhibitor: ExhibitorProfile | null) => {
    const snapshotUrl = canvasRef.current?.captureSnapshot() || null;
    setShareTarget({ booth, exhibitor, snapshotUrl });
  }, []);

  const availableCount = snapshot.booths.filter((b) => b.status === 'available').length;
  const reservedCount = snapshot.booths.filter((b) => b.status === 'reserved').length;
  const pendingCount = snapshot.booths.filter((b) => b.status === 'pending').length;

  return (
    <div className="min-h-screen bg-[#F4F7F5] text-[#09140E] dark:bg-[#040705] dark:text-[#ECFDF5]">
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
      />

      {/* 3-Zone Top Navigation */}
      <TopNav
        activeView={activeView}
        onChangeView={(v) => {
          setActiveView(v);
          if (v === 'voyage') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }}
        onOpenSearch={() => setSearchOpen(true)}
        scrollProgress={scrollProgress}
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
          onOpenAuth={(role) => {
            if (role) setAuthDefaultRole(role);
            setAuthOpen(true);
          }}
          onOpenFavorites={() => setActiveView('favorites')}
          onOpenCloudSync={() => setCloudOpen(true)}
          onOpenNotifications={() => setAlertsOpen(true)}
          onSelectBooth={handleSelectBooth}
        />
      )}

      {activeView === 'explore' && (
        <FloorExploreHud
          nightMode={workspace.preferences.nightMode}
          showFloorGrid={workspace.preferences.showFloorGrid}
          showTrussAndVisitors={workspace.preferences.trussAndVisitors}
          statusFilter={statusFilter}
          availableCount={availableCount}
          reservedCount={reservedCount}
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

      {activeView === 'portals' && (
        <PortalsWorkspace
          snapshot={snapshot}
          currentUser={currentUser}
          activeTab={portalTab}
          onChangeTab={setPortalTab}
          onOpenAuth={(role) => {
            if (role) setAuthDefaultRole(role);
            setAuthOpen(true);
          }}
          onInspectBoothOnFloor={(boothId) => {
            setActiveView('explore');
            handleSelectBooth(boothId);
          }}
          onRegisterExpo={async (expoId) => {
            if (!authToken) return;
            const res = await eventSphereApi.registerForExpo(authToken, expoId);
            if (!res.ok) return showToast(res.error);
            showToast('Expo registration confirmed!');
            await refreshStateFromServer();
          }}
          onToggleSessionRegister={async (sessionId) => {
            if (!authToken) return;
            const res = await eventSphereApi.toggleSessionRegister(authToken, sessionId);
            if (!res.ok) return showToast(res.error);
            showToast('Session registration updated');
            await refreshStateFromServer();
          }}
          onToggleSessionBookmark={async (sessionId) => {
            if (!authToken) return;
            const res = await eventSphereApi.toggleSessionBookmark(authToken, sessionId);
            if (!res.ok) return showToast(res.error);
            showToast('Session bookmark & reminder updated');
            await refreshStateFromServer();
          }}
          onReserveBooth={handleReserveBooth}
          onReleaseBooth={handleReleaseBooth}
          onSubmitApplication={async (payload) => {
            if (!authToken) {
              setAuthOpen(true);
              return false;
            }
            const res = await eventSphereApi.submitApplication(authToken, payload);
            if (!res.ok) {
              showToast(res.error);
              return false;
            }
            showToast('Exhibitor application submitted for review');
            await refreshStateFromServer();
            return true;
          }}
          onReviewApplication={async (appId, status, rejectionReason) => {
            if (!authToken) {
              setAuthOpen(true);
              return;
            }
            const res = await eventSphereApi.reviewApplication(authToken, appId, {
              status,
              rejectionReason,
            });
            if (!res.ok) return showToast(res.error);
            showToast(`Application marked ${status}`);
            await refreshStateFromServer();
          }}
          onUpdateExhibitorProfile={async (exhibitorId, payload) => {
            if (!authToken) {
              setAuthOpen(true);
              return;
            }
            const res = await eventSphereApi.updateExhibitorProfile(authToken, exhibitorId, payload);
            if (!res.ok) return showToast(res.error);
            showToast('Exhibitor showcase updated');
            await refreshStateFromServer();
          }}
          onAdminUpdateBooth={async (boothId, payload) => {
            if (!authToken) {
              setAuthOpen(true);
              return;
            }
            const res = await eventSphereApi.updateBooth(authToken, boothId, payload);
            if (!res.ok) return showToast(res.error);
            showToast(`Booth ${res.data.number} updated`);
            await refreshStateFromServer();
          }}
          onAdminCreateExpo={async (payload) => {
            if (!authToken) {
              setAuthOpen(true);
              return false;
            }
            const res = await eventSphereApi.createExpo(authToken, payload);
            if (!res.ok) {
              showToast(res.error);
              return false;
            }
            showToast(`Published "${res.data.title}"`);
            await refreshStateFromServer();
            return true;
          }}
          onAdminUpdateExpo={async (expoId, payload) => {
            if (!authToken) {
              setAuthOpen(true);
              return;
            }
            const res = await eventSphereApi.updateExpo(authToken, expoId, payload);
            if (!res.ok) return showToast(res.error);
            showToast(`Updated expo "${res.data.title}"`);
            await refreshStateFromServer();
          }}
          onAdminDeleteExpo={async (expoId) => {
            if (!authToken) return;
            const res = await eventSphereApi.deleteExpo(authToken, expoId);
            if (!res.ok) return showToast(res.error);
            showToast('Expo deleted');
            await refreshStateFromServer();
          }}
          onAdminUpdateFeedback={async (feedbackId, status) => {
            if (!authToken) {
              setAuthOpen(true);
              return;
            }
            const res = await eventSphereApi.updateFeedbackStatus(authToken, feedbackId, status);
            if (!res.ok) return showToast(res.error);
            showToast(`Feedback marked ${status}`);
            await refreshStateFromServer();
          }}
          onAdminCreateSession={async (payload) => {
            if (!authToken) {
              setAuthOpen(true);
              return false;
            }
            const res = await eventSphereApi.createSession(authToken, payload);
            if (!res.ok) {
              showToast(res.error);
              return false;
            }
            showToast('Session published to live schedule');
            await refreshStateFromServer();
            return true;
          }}
          onAdminUpdateSession={async (sessionId, payload) => {
            if (!authToken) {
              setAuthOpen(true);
              return;
            }
            const res = await eventSphereApi.updateSession(authToken, sessionId, payload);
            if (!res.ok) return showToast(res.error);
            showToast('Live schedule update broadcast to all attendees!');
            await refreshStateFromServer();
          }}
          onAdminDeleteSession={async (sessionId) => {
            if (!authToken) return;
            const res = await eventSphereApi.deleteSession(authToken, sessionId);
            if (!res.ok) return showToast(res.error);
            showToast('Session removed');
            await refreshStateFromServer();
          }}
          onSendMessage={handleSendMessage}
        />
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
              setAuthOpen(true);
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
        onRequireAuth={() => setAuthOpen(true)}
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
          setPortalTab('attendee');
          setActiveView('portals');
        }}
      />

      <AuthModal
        isOpen={authOpen}
        currentUser={currentUser}
        token={authToken}
        defaultRole={authDefaultRole}
        onClose={() => setAuthOpen(false)}
        onAuthenticated={(tok, usr) => {
          setAuthToken(tok);
          setCurrentUser(usr);
          saveAuthSession(tok, usr);
        }}
        onLogout={() => {
          setAuthToken(null);
          setCurrentUser(null);
          saveAuthSession(null, null);
        }}
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
