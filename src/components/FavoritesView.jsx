import React from 'react';
import { Bookmark, CalendarClock, MapPin, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { STATUS_HEX } from '../three/expoModels';
import { Button, Card, EmptyState } from './ui';

export const FavoritesView = ({
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
    <div className="relative z-20 min-h-screen bg-gradient-to-b from-[#F3F4F7]/97 via-[#EEEEF3]/97 to-[#E2E4EC]/97 px-4 pt-24 pb-16 text-[#0B0B0E] dark:bg-gradient-to-b dark:from-[#0B0B0E]/97 dark:via-[#0E0E13]/97 dark:to-[#070709]/97 dark:text-[#F2F3F7] sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="mx-auto max-w-6xl space-y-8"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#272732]/18 pb-5 dark:border-[#2D2D3A]/34">
          <div>
            <p className="font-mono text-xs font-semibold tracking-wider text-[#8A621C] dark:text-[#E8C987]">
              Offline-Ready Bookmarks
            </p>
            <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
              Saved Booths &amp; Sessions
            </h1>
            <p className="mt-1 text-sm text-[#525463] dark:text-[#9497A6]">
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
              <Bookmark className="h-4 w-4 text-[#8A621C] dark:text-[#E8C987]" />
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
                    className="rounded-xl border border-[#272732]/16 bg-[#EAEBF1] p-4 dark:border-[#2D2D3A]/34 dark:bg-[#0E0E13]"
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
                        <div className="mt-1 font-mono text-xs text-[#3E404D] dark:text-[#9497A6]">
                          {b.zone} · {b.size} · ${b.priceUsd.toLocaleString()}
                        </div>
                        {notes[b.id] && (
                          <p className="mt-2 rounded-lg border border-[#272732]/16 bg-[#FFFFFF] p-2 text-xs text-[#0B0B0E] dark:border-[#2D2D3A]/32 dark:bg-[#121217] dark:text-[#D4D6E0]">
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
                    className="flex items-center justify-between gap-3 rounded-xl border border-[#272732]/16 bg-[#EAEBF1] p-4 dark:border-[#2D2D3A]/34 dark:bg-[#0E0E13]"
                  >
                    <div>
                      <div className="font-mono text-xs font-semibold text-[#8A621C] dark:text-[#E8C987]">
                        {s.startTime}–{s.endTime} · {s.location}
                      </div>
                      <div className="mt-0.5 text-sm font-bold">{s.title}</div>
                      <div className="text-xs text-[#525463] dark:text-[#9497A6]">{s.speaker}</div>
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
