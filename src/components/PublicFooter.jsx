import React from 'react';
import { Globe2, ShieldCheck, Wifi } from 'lucide-react';

export const PublicFooter = ({
  onOpenSection,
  onOpenExplore,
  onOpenAnalytics,
  onOpenPortal,
  onOpenSupport,
}) => {
  return (
    <footer className="pointer-events-auto relative z-10 border-t border-[#272732]/18 bg-[#F8F8FB]/95 text-[#0B0B0E] dark:border-[#2D2D3A]/36 dark:bg-[#0B0B0E]/96 dark:text-[#F2F3F7]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2.5 font-display text-lg font-extrabold tracking-tight">
              <span
                aria-hidden="true"
                className="h-5 w-5 rounded-full shadow-[0_0_16px_rgba(232,201,135,0.55)]"
                style={{
                  background:
                    'radial-gradient(circle at 32% 30%, #FFF7E0 0%, #F0D290 36%, #9E7836 74%, #1A1307 100%)',
                }}
              />
              <span>EventSphere</span>
            </div>
            <p className="text-xs leading-relaxed text-[#525463] dark:text-[#9497A6]">
              Enterprise 3D exhibition operations platform uniting organizers, verified exhibitors,
              and attendees on one live synchronized floor plan.
            </p>
            <div className="flex flex-wrap gap-3 pt-1 font-mono text-[11px] text-[#8A621C] dark:text-[#E8C987]">
              <span className="inline-flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" /> JWT + bcrypt
              </span>
              <span className="inline-flex items-center gap-1">
                <Wifi className="h-3.5 w-3.5" /> Socket.io Live
              </span>
              <span className="inline-flex items-center gap-1">
                <Globe2 className="h-3.5 w-3.5" /> Offline PWA
              </span>
            </div>
          </div>

          <div>
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#525463] dark:text-[#9497A6]">
              Platform
            </h3>
            <ul className="mt-3 space-y-2 text-xs font-medium">
              <li>
                <button
                  type="button"
                  onClick={() => onOpenSection('expos')}
                  className="hover:text-[#8A621C] dark:hover:text-[#E8C987]"
                >
                  Explore Expos
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={onOpenExplore}
                  className="hover:text-[#8A621C] dark:hover:text-[#E8C987]"
                >
                  Interactive 3D Floor
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenSection('exhibitors')}
                  className="hover:text-[#8A621C] dark:hover:text-[#E8C987]"
                >
                  Exhibitor Directory
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenSection('schedule')}
                  className="hover:text-[#8A621C] dark:hover:text-[#E8C987]"
                >
                  Live Schedule
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={onOpenAnalytics}
                  className="hover:text-[#8A621C] dark:hover:text-[#E8C987]"
                >
                  Expo Analytics
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#525463] dark:text-[#9497A6]">
              Role Portals
            </h3>
            <ul className="mt-3 space-y-2 text-xs font-medium">
              <li>
                <button
                  type="button"
                  onClick={() => onOpenPortal('admin')}
                  className="hover:text-[#8A621C] dark:hover:text-[#E8C987]"
                >
                  Organizer Command Center
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenPortal('exhibitor')}
                  className="hover:text-[#8A621C] dark:hover:text-[#E8C987]"
                >
                  Exhibitor Portal
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenPortal('attendee')}
                  className="hover:text-[#8A621C] dark:hover:text-[#E8C987]"
                >
                  Attendee Hub &amp; Passes
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#525463] dark:text-[#9497A6]">
              Support &amp; Compliance
            </h3>
            <ul className="mt-3 space-y-2 text-xs font-medium">
              <li>
                <button
                  type="button"
                  onClick={onOpenSupport}
                  className="hover:text-[#8A621C] dark:hover:text-[#E8C987]"
                >
                  Organizer Support Desk
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenSection('faq')}
                  className="hover:text-[#8A621C] dark:hover:text-[#E8C987]"
                >
                  Platform FAQ &amp; Security
                </button>
              </li>
              <li className="text-[#525463] dark:text-[#9497A6]">
                Automated 7-Day Snapshots &amp; GDPR Consent
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-[#272732]/16 pt-6 text-xs text-[#3E404D] dark:border-[#2D2D3A]/30 dark:text-[#9497A6]">
          <span>© {new Date().getFullYear()} EventSphere Management. Enterprise Expo Platform.</span>
          <span className="font-mono text-[11px]">
            Real-time 3D Floor · Atomic Reservations · Role-Based Access
          </span>
        </div>
      </div>
    </footer>
  );
};
