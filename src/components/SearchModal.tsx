import React, { useMemo, useState } from 'react';
import { Building2, CalendarClock, MapPin, Search } from 'lucide-react';
import type { EventSphereSnapshot } from '../types/eventsphere';
import { STATUS_HEX } from '../three/expoModels';
import { Modal, SearchInput } from './ui';

interface SearchModalProps {
  isOpen: boolean;
  snapshot: EventSphereSnapshot;
  onClose: () => void;
  onSelectBooth: (boothId: string) => void;
  onJumpToSession: () => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  snapshot,
  onClose,
  onSelectBooth,
  onJumpToSession,
}) => {
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matchedBooths = snapshot.booths.filter((b) => {
      if (!q) return true;
      return (
        b.number.toLowerCase().includes(q) ||
        b.zone.toLowerCase().includes(q) ||
        b.status.toLowerCase().includes(q) ||
        (b.exhibitorName || '').toLowerCase().includes(q)
      );
    });

    const matchedExhibitors = snapshot.exhibitors.filter((ex) => {
      if (!q) return true;
      return (
        ex.companyName.toLowerCase().includes(q) ||
        ex.category.toLowerCase().includes(q) ||
        ex.tagline.toLowerCase().includes(q) ||
        ex.products.some((p) => p.toLowerCase().includes(q))
      );
    });

    const matchedSessions = snapshot.sessions.filter((s) => {
      if (!q) return true;
      return (
        s.title.toLowerCase().includes(q) ||
        s.speaker.toLowerCase().includes(q) ||
        s.topic.toLowerCase().includes(q) ||
        s.location.toLowerCase().includes(q)
      );
    });

    return {
      booths: matchedBooths.slice(0, 6),
      exhibitors: matchedExhibitors.slice(0, 5),
      sessions: matchedSessions.slice(0, 5),
    };
  }, [query, snapshot]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="2xl"
      icon={<Search className="h-4 w-4" />}
      title="Search Floor Booths, Exhibitors & Schedule"
    >
      <div className="space-y-5">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search booths (A2, available), exhibitors (Lumina, Clean Energy), or sessions..."
        />

        <div>
          <div className="mb-2 flex items-center gap-1.5 font-mono text-[11px] font-bold text-[#466153] dark:text-[#8EAD9E]">
            <MapPin className="h-3.5 w-3.5 text-[#34D399]" />
            <span>3D Floor Booths ({results.booths.length})</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {results.booths.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => {
                  onSelectBooth(b.id);
                  onClose();
                }}
                className="flex items-center justify-between rounded-xl border border-[#10B981]/18 bg-[#E8EFEA]/80 px-3 py-2.5 text-left transition-colors hover:border-[#10B981] dark:border-[#10B981]/20 dark:bg-[#09120D]"
              >
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-xs"
                      style={{ backgroundColor: STATUS_HEX[b.status] }}
                    />
                    <span>Booth {b.number}</span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-[#466153] dark:text-[#8EAD9E]">
                    {b.exhibitorName || b.zone}
                  </div>
                </div>
                <span className="font-mono text-[11px] font-semibold text-[#059669] dark:text-[#34D399]">
                  ${b.priceUsd.toLocaleString()}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center gap-1.5 font-mono text-[11px] font-bold text-[#466153] dark:text-[#8EAD9E]">
            <Building2 className="h-3.5 w-3.5 text-[#F97362]" />
            <span>Exhibitors ({results.exhibitors.length})</span>
          </div>
          <div className="space-y-1.5">
            {results.exhibitors.map((ex) => {
              const assignedBooth = snapshot.booths.find((b) => b.exhibitorId === ex.id);
              return (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => {
                    if (assignedBooth) {
                      onSelectBooth(assignedBooth.id);
                    } else {
                      onJumpToSession();
                    }
                    onClose();
                  }}
                  className="flex w-full items-center justify-between rounded-xl border border-[#10B981]/18 bg-[#E8EFEA]/80 px-3 py-2.5 text-left hover:border-[#F97362] dark:border-[#10B981]/20 dark:bg-[#09120D]"
                >
                  <div>
                    <div className="text-xs font-bold">
                      {ex.companyName}{' '}
                      <span className="font-normal text-[#466153] dark:text-[#8EAD9E]">
                        · {ex.category}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#466153] dark:text-[#8EAD9E]">{ex.tagline}</div>
                  </div>
                  <span className="font-mono text-[11px] font-bold text-[#059669] dark:text-[#34D399]">
                    {assignedBooth ? `Booth ${assignedBooth.number}` : 'Unassigned'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center gap-1.5 font-mono text-[11px] font-bold text-[#466153] dark:text-[#8EAD9E]">
            <CalendarClock className="h-3.5 w-3.5 text-[#2DD4BF]" />
            <span>Schedule Sessions ({results.sessions.length})</span>
          </div>
          <div className="space-y-1.5">
            {results.sessions.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  onJumpToSession();
                  onClose();
                }}
                className="flex w-full items-center justify-between rounded-xl border border-[#10B981]/18 bg-[#E8EFEA]/80 px-3 py-2 text-left hover:border-[#10B981] dark:border-[#10B981]/20 dark:bg-[#09120D]"
              >
                <div>
                  <div className="text-xs font-bold">{s.title}</div>
                  <div className="text-[11px] text-[#466153] dark:text-[#8EAD9E]">
                    {s.speaker} · {s.location}
                  </div>
                </div>
                <span className="font-mono text-xs font-semibold text-[#059669] dark:text-[#34D399]">
                  {s.startTime}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
};
