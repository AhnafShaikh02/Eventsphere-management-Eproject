import React from 'react';
import { Bookmark, CalendarClock, MapPin, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import type { EventSphereSnapshot } from '../types/eventsphere';
import { STATUS_HEX } from '../three/expoModels';
import { Button, Card, EmptyState } from './ui';

interface FavoritesViewProps {
  snapshot: EventSphereSnapshot;
  favoriteBoothIds: string[];
  notes: Record<string, string>;
  currentUserId?: string;
  onSelectBooth: (boothId: string) => void;
  onRemoveBoothFavorite: (boothId: string) => void;
  onToggleSessionBookmark: (sessionId: string) => void;
  onOpenExplore: () => void;
}

export const FavoritesView: React.FC<FavoritesViewProps> = ({
  snapshot,
  favoriteBoothIds,
  notes,
  currentUserId,
  onSelectBooth,
  onRemoveBoothFavorite,
  onToggleSessionBookmark,
  onOpenExplore,
}) => {
  const savedBooths = snapshot.booths.filter((b) => favoriteBoothIds.includes(b.id));
  const savedSessions = snapshot.sessions.filter((s) =>
    currentUserId ? s.bookmarkedUserIds.includes(currentUserId) : false,
  );

  return (
    <div className="relative z-20 min-h-screen bg-gradient-to-b from-[#F4F7F5]/97 via-[#EFF5F1]/97 to-[#E6EFE9]/97 px-4 pt-24 pb-16 text-[#09140E] dark:bg-gradient-to-b dark:from-[#040705]/97 dark:via-[#060E09]/97 dark:to-[#030604]/97 dark:text-[#ECFDF5] sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="mx-auto max-w-6xl space-y-8"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#10B981]/18 pb-5 dark:border-[#10B981]/20">
          <div>
            <p className="font-mono text-xs font-semibold tracking-wider text-[#059669] dark:text-[#34D399]">
              Offline-Ready Bookmarks
            </p>
            <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
              Saved Booths &amp; Sessions
            </h1>
            <p className="mt-1 text-sm text-[#466153] dark:text-[#8EAD9E]">
              Your bookmarked expo booths, personal notes, and session reminders stay available offline.
            </p>
          </div>
          <Button variant="primary" size="md" onClick={onOpenExplore}>
            Back to 3D Floor
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card padding="lg">
            <div className="flex items-center gap-2 font-display text-lg font-bold">
              <Bookmark className="h-4 w-4 text-[#10B981] dark:text-[#34D399]" />
              <span>Bookmarked Booths ({savedBooths.length})</span>
            </div>

            <div className="mt-4 space-y-3">
              {savedBooths.length === 0 ? (
                <EmptyState
                  icon={<MapPin className="h-5 w-5" />}
                  title="No booths bookmarked yet"
                  description="Click any booth in the 3D Expo Hall and choose Bookmark to keep field notes offline."
                  action={
                    <Button variant="outline" size="sm" onClick={onOpenExplore}>
                      Explore 3D Floor
                    </Button>
                  }
                />
              ) : (
                savedBooths.map((b) => (
                  <div
                    key={b.id}
                    className="rounded-xl border border-slate-200 bg-[#F4F7F5] p-4 dark:border-[#10B981]/18 dark:bg-[#040705]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-block h-2.5 w-2.5 rounded-xs"
                            style={{ backgroundColor: STATUS_HEX[b.status] }}
                          />
                          <span className="font-display text-base font-bold">
                            Booth {b.number} · {b.exhibitorName || 'Open Space'}
                          </span>
                        </div>
                        <div className="mt-1 font-mono text-xs text-[#466153] dark:text-[#8EAD9E]">
                          {b.zone} · {b.size} · ${b.priceUsd.toLocaleString()}
                        </div>
                        {notes[b.id] && (
                          <p className="mt-2 rounded-lg border border-slate-200 bg-white p-2 text-xs text-[#09140E] dark:border-[#10B981]/18 dark:bg-[#09120D] dark:text-[#C4DFD1]">
                            Note: {notes[b.id]}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="primary"
                          size="sm"
                          leftIcon={<MapPin className="h-3.5 w-3.5" />}
                          onClick={() => onSelectBooth(b.id)}
                        >
                          Inspect
                        </Button>
                        <Button
                          variant="icon"
                          size="sm"
                          onClick={() => onRemoveBoothFavorite(b.id)}
                          aria-label={`Remove Booth ${b.number}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card padding="lg">
            <div className="flex items-center gap-2 font-display text-lg font-bold">
              <CalendarClock className="h-4 w-4 text-[#2DD4BF]" />
              <span>Bookmarked Sessions ({savedSessions.length})</span>
            </div>
            <div className="mt-4 space-y-3">
              {savedSessions.length === 0 ? (
                <EmptyState
                  icon={<CalendarClock className="h-5 w-5" />}
                  title="No sessions bookmarked"
                  description="Sign in and bookmark sessions to receive live schedule updates and reminders."
                />
              ) : (
                savedSessions.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-[#F4F7F5] p-4 dark:border-[#10B981]/18 dark:bg-[#040705]"
                  >
                    <div>
                      <div className="font-mono text-xs font-semibold text-[#059669] dark:text-[#34D399]">
                        {s.startTime}–{s.endTime} · {s.location}
                      </div>
                      <div className="mt-0.5 text-sm font-bold">{s.title}</div>
                      <div className="text-xs text-[#466153] dark:text-[#8EAD9E]">{s.speaker}</div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onToggleSessionBookmark(s.id)}
                    >
                      Remove
                    </Button>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </motion.div>
    </div>
  );
};
