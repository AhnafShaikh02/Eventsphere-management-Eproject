import React from 'react';
import { Globe2, ShieldCheck, Wifi } from 'lucide-react';
import type { UserRole } from '../types/eventsphere';

interface PublicFooterProps {
  onOpenSection: (sectionId: string) => void;
  onOpenExplore: () => void;
  onOpenAnalytics: () => void;
  onOpenPortal: (role?: UserRole) => void;
  onOpenSupport: () => void;
}

export const PublicFooter: React.FC<PublicFooterProps> = ({
  onOpenSection,
  onOpenExplore,
  onOpenAnalytics,
  onOpenPortal,
  onOpenSupport,
}) => {
  return (
    <footer className="pointer-events-auto relative z-10 border-t border-[#104E35]/18 bg-[#EEF4F0]/95 text-[#091911] dark:border-[#2A6F52]/36 dark:bg-[#040705]/96 dark:text-[#DDF2E7]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2.5 font-display text-lg font-extrabold tracking-tight">
              <span
                aria-hidden="true"
                className="h-5 w-5 rounded-full shadow-[0_0_16px_rgba(16,185,129,0.55)]"
                style={{
                  background:
                    'radial-gradient(circle at 32% 30%, #ECFDF5 0%, #34D399 34%, #065F46 74%, #020805 100%)',
                }}
              />
              <span>EventSphere</span>
            </div>
            <p className="text-xs leading-relaxed text-[#466153] dark:text-[#8EAD9E]">
              Enterprise 3D exhibition operations platform uniting organizers, verified exhibitors,
              and attendees on one live synchronized floor plan.
            </p>
            <div className="flex flex-wrap gap-3 pt-1 font-mono text-[11px] text-[#059669] dark:text-[#34D399]">
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
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#466153] dark:text-[#8EAD9E]">
              Platform
            </h3>
            <ul className="mt-3 space-y-2 text-xs font-medium">
              <li>
                <button
                  type="button"
                  onClick={() => onOpenSection('expos')}
                  className="hover:text-[#059669] dark:hover:text-[#34D399]"
                >
                  Explore Expos
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={onOpenExplore}
                  className="hover:text-[#059669] dark:hover:text-[#34D399]"
                >
                  Interactive 3D Floor
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenSection('exhibitors')}
                  className="hover:text-[#059669] dark:hover:text-[#34D399]"
                >
                  Exhibitor Directory
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenSection('schedule')}
                  className="hover:text-[#059669] dark:hover:text-[#34D399]"
                >
                  Live Schedule
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={onOpenAnalytics}
                  className="hover:text-[#059669] dark:hover:text-[#34D399]"
                >
                  Expo Analytics
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#466153] dark:text-[#8EAD9E]">
              Role Portals
            </h3>
            <ul className="mt-3 space-y-2 text-xs font-medium">
              <li>
                <button
                  type="button"
                  onClick={() => onOpenPortal('admin')}
                  className="hover:text-[#059669] dark:hover:text-[#34D399]"
                >
                  Organizer Command Center
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenPortal('exhibitor')}
                  className="hover:text-[#059669] dark:hover:text-[#34D399]"
                >
                  Exhibitor Portal
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenPortal('attendee')}
                  className="hover:text-[#059669] dark:hover:text-[#34D399]"
                >
                  Attendee Hub &amp; Passes
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#466153] dark:text-[#8EAD9E]">
              Support &amp; Compliance
            </h3>
            <ul className="mt-3 space-y-2 text-xs font-medium">
              <li>
                <button
                  type="button"
                  onClick={onOpenSupport}
                  className="hover:text-[#059669] dark:hover:text-[#34D399]"
                >
                  Organizer Support Desk
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenSection('faq')}
                  className="hover:text-[#059669] dark:hover:text-[#34D399]"
                >
                  Platform FAQ &amp; Security
                </button>
              </li>
              <li className="text-[#466153] dark:text-[#8EAD9E]">
                Automated 7-Day Snapshots &amp; GDPR Consent
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-[#104E35]/16 pt-6 text-xs text-[#355243] dark:border-[#2A6F52]/30 dark:text-[#8EAD9E]">
          <span>© {new Date().getFullYear()} EventSphere Management. Enterprise Expo Platform.</span>
          <span className="font-mono text-[11px]">
            Real-time 3D Floor · Atomic Reservations · Role-Based Access
          </span>
        </div>
      </div>
    </footer>
  );
};
