import React, { useEffect, useRef, useState } from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
  interactive?: boolean;
}

export const Card: React.FC<CardProps> = ({
  padding = 'md',
  interactive = false,
  className = '',
  children,
  ...rest
}) => {
  const padMap = {
    none: '',
    sm: 'p-4',
    md: 'p-5',
    lg: 'p-6 sm:p-7',
  };
  return (
    <div
      className={[
        'surface-luxe rounded-2xl border border-[#104E35]/18 bg-[#F0F5F2] text-[#091911] dark:border-[#2A6F52]/38 dark:bg-[#08110C] dark:text-[#DDF2E7]',
        interactive ? 'transition-all duration-200 hover:-translate-y-0.5 hover:border-[#059669]/45 dark:hover:border-[#34D399]/45' : '',
        padMap[padding],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </div>
  );
};

export type BadgeTone = 'emerald' | 'coral' | 'teal' | 'violet' | 'amber' | 'neutral';

const BADGE_TONES: Record<BadgeTone, string> = {
  emerald:
    'border-[#10B981]/35 bg-[#10B981]/12 text-[#047857] dark:border-[#34D399]/35 dark:bg-[#10B981]/16 dark:text-[#34D399]',
  coral:
    'border-[#F97362]/40 bg-[#F97362]/14 text-[#C2410C] dark:border-[#F97362]/40 dark:bg-[#F97362]/14 dark:text-[#FDA4AF]',
  teal:
    'border-[#2DD4BF]/35 bg-[#2DD4BF]/12 text-[#0F766E] dark:border-[#2DD4BF]/35 dark:bg-[#2DD4BF]/14 dark:text-[#5EEAD4]',
  violet:
    'border-[#A78BFA]/35 bg-[#A78BFA]/12 text-[#5B21B6] dark:border-[#A78BFA]/35 dark:bg-[#A78BFA]/15 dark:text-[#C4B5FD]',
  amber:
    'border-amber-500/35 bg-amber-500/12 text-amber-800 dark:border-amber-400/35 dark:bg-amber-400/14 dark:text-amber-300',
  neutral:
    'border-[#104E35]/20 bg-[#E4EDE7] text-[#355243] dark:border-[#2A6F52]/38 dark:bg-[#050A07] dark:text-[#8EAD9E]',
};

export const Badge: React.FC<{
  tone?: BadgeTone;
  children: React.ReactNode;
  className?: string;
}> = ({ tone = 'neutral', children, className = '' }) => (
  <span
    className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[11px] font-semibold capitalize whitespace-nowrap shrink-0 ${BADGE_TONES[tone]} ${className}`}
  >
    {children}
  </span>
);

export const StatCard: React.FC<{
  label: string;
  value: string | number;
  sublabel?: string;
  icon?: React.ReactNode;
  tone?: 'emerald' | 'coral' | 'teal' | 'violet';
}> = ({ label, value, sublabel, icon, tone = 'emerald' }) => {
  const accentMap = {
    emerald: '#10B981',
    coral: '#F97362',
    teal: '#2DD4BF',
    violet: '#A78BFA',
  };
  return (
    <Card padding="md" className="relative overflow-hidden">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold text-[#466153] dark:text-[#8EAD9E]">{label}</div>
          <div className="mt-1.5 font-display text-2xl font-extrabold tracking-tight tabular-nums sm:text-3xl">
            {value}
          </div>
          {sublabel && (
            <div className="mt-1 font-mono text-[11px] text-[#466153] dark:text-[#8EAD9E]">
              {sublabel}
            </div>
          )}
        </div>
        {icon && (
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#104E35]/18 bg-[#E4EDE7] dark:border-[#2A6F52]/38 dark:bg-[#050A07]"
            style={{ color: accentMap[tone] }}
          >
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
};

export interface TabItem {
  id: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

export const Tabs: React.FC<{
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}> = ({ items, activeId, onChange, className = '' }) => (
  <div
    role="tablist"
    className={`inline-flex flex-wrap gap-1.5 rounded-xl border border-[#104E35]/18 bg-[#E4EDE7] p-1 dark:border-[#2A6F52]/38 dark:bg-[#050A07] ${className}`}
  >
    {items.map((item) => {
      const active = item.id === activeId;
      return (
        <button
          key={item.id}
          role="tab"
          aria-selected={active}
          type="button"
          onClick={() => onChange(item.id)}
          className={`inline-flex min-h-[34px] items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
            active
              ? 'bg-gradient-to-r from-[#059669] to-[#34D399] text-[#02120B] shadow-sm'
              : 'text-[#466153] hover:text-[#09140E] dark:text-[#8EAD9E] dark:hover:text-[#ECFDF5]'
          }`}
        >
          {item.icon}
          <span>{item.label}</span>
          {item.count !== undefined && (
            <span className={`font-mono text-[10px] ${active ? 'opacity-85' : 'opacity-70'}`}>
              ({item.count})
            </span>
          )}
        </button>
      );
    })}
  </div>
);

export const Tooltip: React.FC<{
  content: string;
  children: React.ReactNode;
}> = ({ content, children }) => (
  <span className="group relative inline-flex">
    {children}
    <span
      role="tooltip"
      className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 rounded-lg border border-[#10B981]/25 bg-[#040705] px-2.5 py-1 text-[11px] font-medium text-[#ECFDF5] opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100 whitespace-nowrap"
    >
      {content}
    </span>
  </span>
);

export const EmptyState: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}> = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#104E35]/24 bg-[#E4EDE7]/65 px-6 py-10 text-center dark:border-[#2A6F52]/40 dark:bg-[#050A07]/70">
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#104E35]/22 bg-[#F0F5F2] text-[#059669] dark:border-[#2A6F52]/40 dark:bg-[#08110C] dark:text-[#34D399]">
      {icon}
    </div>
    <h3 className="mt-3 font-display text-base font-bold">{title}</h3>
    <p className="mt-1 max-w-md text-xs leading-relaxed text-[#355243] dark:text-[#8EAD9E]">
      {description}
    </p>
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export const Skeleton: React.FC<{ className?: string }> = ({ className = 'h-4 w-full' }) => (
  <div
    className={`rounded-lg bg-[#D3E2D8] dark:bg-[#10B981]/12 ${className}`}
    aria-hidden="true"
  />
);

export const DropdownMenu: React.FC<{
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: 'left' | 'right';
}> = ({ trigger, children, align = 'right' }) => {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  return (
    <div ref={boxRef} className="relative inline-block">
      <div onClick={() => setOpen((o) => !o)}>{trigger}</div>
      {open && (
        <div
          onClick={() => setOpen(false)}
          className={`surface-luxe absolute top-full z-50 mt-2 min-w-[220px] rounded-2xl border border-[#104E35]/20 bg-[#F0F5F2] p-1.5 text-[#091911] shadow-2xl dark:border-[#2A6F52]/40 dark:bg-[#08110C] dark:text-[#DDF2E7] ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {children}
        </div>
      )}
    </div>
  );
};
