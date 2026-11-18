import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export const Card = ({
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
        'surface-luxe portal-card-glow rounded-2xl border border-[var(--es-border)] bg-[#FFFFFF] text-[#0B0B0E] dark:bg-[#121217] dark:text-[#F2F3F7]',
        interactive ? 'transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--es-border-strong)]' : '',
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

const BADGE_TONES = {
  emerald:
    'border-[#D4AF63]/40 bg-[#D4AF63]/14 text-[#8A621C] dark:border-[#E8C987]/35 dark:bg-[#E8C987]/14 dark:text-[#E8C987]',
  coral:
    'border-[#F97362]/40 bg-[#F97362]/14 text-[#C2410C] dark:border-[#F97362]/40 dark:bg-[#F97362]/14 dark:text-[#FDA4AF]',
  teal:
    'border-[#2DD4BF]/35 bg-[#2DD4BF]/12 text-[#0F766E] dark:border-[#2DD4BF]/35 dark:bg-[#2DD4BF]/14 dark:text-[#5EEAD4]',
  violet:
    'border-[#C58B3B]/40 bg-[#C58B3B]/14 text-[#8A5A19] dark:border-[#C58B3B]/40 dark:bg-[#C58B3B]/15 dark:text-[#F0C98D]',
  amber:
    'border-amber-500/35 bg-amber-500/12 text-amber-800 dark:border-amber-400/35 dark:bg-amber-400/14 dark:text-amber-300',
  neutral:
    'border-[#272732]/20 bg-[#EAEBF1] text-[#3E404D] dark:border-[#2D2D3A]/40 dark:bg-[#0E0E13] dark:text-[#9497A6]',
};

export const Badge = ({ tone = 'neutral', children, className = '' }) => (
  <span
    className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[11px] font-semibold capitalize whitespace-nowrap shrink-0 ${BADGE_TONES[tone]} ${className}`}
  >
    {children}
  </span>
);

function parseAnimatedStat(raw) {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return {
      isNumeric: true,
      prefix: '',
      target: raw,
      suffix: '',
      decimals: Number.isInteger(raw) ? 0 : 1,
      useLocale: true,
    };
  }

  const str = String(raw ?? '').trim();
  const match = str.match(/^([^\d-]*)(-?[\d,]+(?:\.\d+)?)(.*)$/);
  if (!match) {
    return { isNumeric: false, raw: str };
  }

  const [, prefix, numPart, suffix] = match;
  const numeric = Number(numPart.replace(/,/g, ''));
  if (!Number.isFinite(numeric)) {
    return { isNumeric: false, raw: str };
  }

  const dotIdx = numPart.indexOf('.');
  return {
    isNumeric: true,
    prefix,
    target: numeric,
    suffix,
    decimals: dotIdx >= 0 ? numPart.length - dotIdx - 1 : 0,
    useLocale: numPart.includes(',') || numeric >= 1000,
  };
}

export const StatCard = ({ label, value, sublabel, icon, tone = 'emerald' }) => {
  const accentMap = {
    emerald: '#D4AF63',
    coral: '#F97362',
    teal: '#2DD4BF',
    violet: '#C58B3B',
  };
  const glowMap = {
    emerald: 'rgba(212, 175, 99, 0.36)',
    coral: 'rgba(249, 115, 98, 0.34)',
    teal: 'rgba(45, 212, 191, 0.36)',
    violet: 'rgba(197, 139, 59, 0.36)',
  };

  const cardRef = useRef(null);
  const valRef = useRef(null);
  const glowRef = useRef(null);
  const prevNumRef = useRef(0);
  const parsed = parseAnimatedStat(value);
  const [displayValue, setDisplayValue] = useState(String(value));

  useEffect(() => {
    const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!parsed.isNumeric || parsed.target === undefined) {
      setDisplayValue(String(value));
      if (!reduce && valRef.current) {
        gsap.fromTo(
          valRef.current,
          { y: 10, opacity: 0, filter: 'blur(4px)' },
          { y: 0, opacity: 1, filter: 'blur(0px)', duration: 0.45, ease: 'power3.out', clearProps: 'transform,opacity,filter' },
        );
      }
      return;
    }

    if (reduce) {
      prevNumRef.current = parsed.target;
      setDisplayValue(String(value));
      return;
    }

    const startVal = prevNumRef.current;
    const endVal = parsed.target;
    const stateObj = { current: startVal };

    const formatNumber = (val) => {
      const rounded = parsed.decimals > 0 ? Number(val.toFixed(parsed.decimals)) : Math.round(val);
      const formatted = parsed.useLocale ? rounded.toLocaleString() : String(rounded);
      return `${parsed.prefix}${formatted}${parsed.suffix}`;
    };

    const ctx = gsap.context(() => {
      const runTween = () => {
        gsap.to(stateObj, {
          current: endVal,
          duration: startVal === 0 ? 0.95 : 0.6,
          ease: 'power3.out',
          onUpdate: () => {
            setDisplayValue(formatNumber(stateObj.current));
          },
          onComplete: () => {
            prevNumRef.current = endVal;
            setDisplayValue(String(value));
          },
        });
      };

      if (cardRef.current) {
        const rect = cardRef.current.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.95) {
          runTween();
        } else {
          ScrollTrigger.create({
            trigger: cardRef.current,
            start: 'top 92%',
            once: true,
            onEnter: runTween,
          });
        }
      } else {
        runTween();
      }

      if (glowRef.current) {
        gsap.fromTo(
          glowRef.current,
          { opacity: 0.16, scale: 0.85 },
          {
            opacity: 0.34,
            scale: 1.08,
            duration: 2.8,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut',
          },
        );
      }
    }, cardRef);

    return () => ctx.revert();
  }, [value, parsed.isNumeric, parsed.target, parsed.prefix, parsed.suffix, parsed.decimals, parsed.useLocale]);

  return (
    <div
      ref={cardRef}
      data-gsap-stat="true"
      style={{ '--stat-glow': glowMap[tone] }}
      className="surface-luxe portal-stat-card relative overflow-hidden rounded-2xl border border-[var(--es-border)] bg-[#FFFFFF] p-5 text-[#0B0B0E] dark:bg-[#121217] dark:text-[#F2F3F7]"
    >
      <div
        ref={glowRef}
        aria-hidden="true"
        className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full opacity-25 blur-2xl"
        style={{ background: accentMap[tone] }}
      />
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-semibold text-[#525463] dark:text-[#9497A6]">{label}</div>
          <div
            ref={valRef}
            className="mt-1.5 font-display text-2xl font-extrabold tracking-tight tabular-nums sm:text-3xl"
          >
            {displayValue}
          </div>
          {sublabel && (
            <div className="mt-1 font-mono text-[11px] text-[#525463] dark:text-[#9497A6]">
              {sublabel}
            </div>
          )}
        </div>
        {icon && (
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#272732]/18 bg-[#EAEBF1] shadow-inner dark:border-[#2D2D3A]/38 dark:bg-[#0B0B0E]"
            style={{
              color: accentMap[tone],
              boxShadow: `0 0 18px -6px ${glowMap[tone]}`,
            }}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};

export const Tabs = ({ items, activeId, onChange, className = '' }) => (
  <div
    role="tablist"
    className={`inline-flex flex-wrap gap-1.5 rounded-xl border border-[#272732]/18 bg-[#EAEBF1] p-1 dark:border-[#2D2D3A]/38 dark:bg-[#0B0B0E] ${className}`}
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
              ? 'bg-gradient-to-r from-[#B88B3D] to-[#F3DCAA] text-[#0B0B0E] shadow-sm'
              : 'text-[#525463] hover:text-[#0B0B0E] dark:text-[#9497A6] dark:hover:text-[#F8F9FC]'
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

export const Tooltip = ({ content, children }) => (
  <span className="group relative inline-flex">
    {children}
    <span
      role="tooltip"
      className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 rounded-lg border border-[#E8C987]/28 bg-[#0B0B0E] px-2.5 py-1 text-[11px] font-medium text-[#F8F9FC] opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100 whitespace-nowrap"
    >
      {content}
    </span>
  </span>
);

export const EmptyState = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#272732]/24 bg-[#EAEBF1]/65 px-6 py-10 text-center dark:border-[#2D2D3A]/40 dark:bg-[#0B0B0E]/70">
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#272732]/22 bg-[#FFFFFF] text-[#8A621C] dark:border-[#2D2D3A]/40 dark:bg-[#121217] dark:text-[#E8C987]">
      {icon}
    </div>
    <h3 className="mt-3 font-display text-base font-bold">{title}</h3>
    <p className="mt-1 max-w-md text-xs leading-relaxed text-[#525463] dark:text-[#9497A6]">
      {description}
    </p>
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export const Skeleton = ({ className = 'h-4 w-full' }) => (
  <div
    className={`rounded-lg bg-[#DFE1EA] dark:bg-[#E8C987]/12 ${className}`}
    aria-hidden="true"
  />
);

export const DropdownMenu = ({ trigger, children, align = 'right' }) => {
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    const onDocClick = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) {
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
          className={`surface-luxe absolute top-full z-50 mt-2 min-w-[220px] rounded-2xl border border-[#272732]/20 bg-[#FFFFFF] p-1.5 text-[#0B0B0E] shadow-2xl dark:border-[#2D2D3A]/40 dark:bg-[#121217] dark:text-[#F2F3F7] ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {children}
        </div>
      )}
    </div>
  );
};
