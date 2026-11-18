import React, { useMemo, useState } from 'react';
import { Building2, CalendarClock, MapPin, Search } from 'lucide-react';
import { STATUS_HEX } from '../three/expoModels';
import { Modal, SearchInput } from './ui';

export const SearchModal = ({
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
          <div className="mb-2 flex items-center gap-1.5 font-mono text-[11px] font-bold text-[#525463] dark:text-[#9497A6]">
            <MapPin className="h-3.5 w-3.5 text-[#8A621C] dark:text-[#E8C987]" />
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
                className="flex items-center justify-between rounded-xl border border-[#272732]/18 bg-[#ECEEF3]/80 px-3 py-2.5 text-left transition-colors hover:border-[#8A621C] dark:border-[#E8C987]/20 dark:bg-[#131319] dark:hover:border-[#E8C987]"
              >
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-xs"
                      style={{ backgroundColor: STATUS_HEX[b.status] }}
                    />
                    <span>Booth {b.number}</span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-[#525463] dark:text-[#9497A6]">
                    {b.exhibitorName || b.zone}
                  </div>
                </div>
                <span className="font-mono text-[11px] font-semibold text-[#8A621C] dark:text-[#E8C987]">
                  ${b.priceUsd.toLocaleString()}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center gap-1.5 font-mono text-[11px] font-bold text-[#525463] dark:text-[#9497A6]">
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
                  className="flex w-full items-center justify-between rounded-xl border border-[#272732]/18 bg-[#ECEEF3]/80 px-3 py-2.5 text-left hover:border-[#F97362] dark:border-[#E8C987]/20 dark:bg-[#131319]"
                >
                  <div>
                    <div className="text-xs font-bold">
                      {ex.companyName}{' '}
                      <span className="font-normal text-[#525463] dark:text-[#9497A6]">
                        · {ex.category}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#525463] dark:text-[#9497A6]">{ex.tagline}</div>
                  </div>
                  <span className="font-mono text-[11px] font-bold text-[#8A621C] dark:text-[#E8C987]">
                    {assignedBooth ? `Booth ${assignedBooth.number}` : 'Unassigned'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center gap-1.5 font-mono text-[11px] font-bold text-[#525463] dark:text-[#9497A6]">
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
                className="flex w-full items-center justify-between rounded-xl border border-[#272732]/18 bg-[#ECEEF3]/80 px-3 py-2 text-left hover:border-[#8A621C] dark:border-[#E8C987]/20 dark:bg-[#131319] dark:hover:border-[#E8C987]"
              >
                <div>
                  <div className="text-xs font-bold">{s.title}</div>
                  <div className="text-[11px] text-[#525463] dark:text-[#9497A6]">
                    {s.speaker} · {s.location}
                  </div>
                </div>
                <span className="font-mono text-xs font-semibold text-[#8A621C] dark:text-[#E8C987]">
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
