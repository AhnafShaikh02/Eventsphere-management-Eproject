import React, { useMemo } from 'react';
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Droplets,
  MapPin,
  Moon,
  RefreshCw,
  Sun,
  Thermometer,
  Wind,
} from 'lucide-react';

function formatTemp(celsius, unit) {
  const val = unit === 'F' ? (celsius * 9) / 5 + 32 : celsius;
  return `${Math.round(val)}°${unit}`;
}

function formatWind(kmh, unit) {
  if (unit === 'F') {
    return `${Math.round(kmh * 0.621371)} mph`;
  }
  return `${kmh} km/h`;
}

function formatVenueLocalTime(timezone) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timezone || 'UTC',
    }).format(new Date());
  } catch {
    return '';
  }
}

function WeatherConditionIcon({
  category,
  isDay,
  className = 'h-5 w-5',
}) {
  switch (category) {
    case 'clear':
      return isDay ? (
        <Sun className={`${className} text-[#D4AF63] dark:text-[#F3DCAA]`} />
      ) : (
        <Moon className={`${className} text-[#8A621C] dark:text-[#E8C987]`} />
      );
    case 'partly_cloudy':
      return <CloudSun className={`${className} text-[#C99E4E] dark:text-[#E8C987]`} />;
    case 'cloudy':
      return <Cloud className={`${className} text-[#525463] dark:text-[#B4B7C5]`} />;
    case 'fog':
      return <CloudFog className={`${className} text-[#525463] dark:text-[#9497A6]`} />;
    case 'drizzle':
      return <CloudDrizzle className={`${className} text-[#2DD4BF]`} />;
    case 'rain':
      return <CloudRain className={`${className} text-[#38BDF8]`} />;
    case 'snow':
      return <CloudSnow className={`${className} text-[#BAE6FD]`} />;
    case 'storm':
      return <CloudLightning className={`${className} text-[#F97362]`} />;
    default:
      return <CloudSun className={`${className} text-[#D4AF63] dark:text-[#E8C987]`} />;
  }
}

export const VenueWeatherWidget = ({
  expos,
  activeExpoId,
  onSelectExpo,
  weather,
  loading,
  error,
  unit,
  onToggleUnit,
  onRefresh,
  variant = 'banner',
  zoomBorderTone = 'border-[var(--es-border)]',
  onJumpToExpos,
}) => {
  const activeExpo = useMemo(
    () => expos.find((e) => e.id === activeExpoId) || expos[0] || null,
    [expos, activeExpoId],
  );

  const localTime = weather ? formatVenueLocalTime(weather.timezone) : '';

  if (variant === 'compact') {
    return (
      <div
        className={`hero-float-panel surface-luxe pointer-events-auto w-full max-w-[260px] rounded-2xl border ${zoomBorderTone} bg-[#F8F8FB]/92 p-3 text-[#0B0B0E] transition-colors hover:border-[var(--es-border-strong)] dark:bg-gradient-to-br dark:from-[#131319]/88 dark:to-[#08080B]/88 dark:text-[#F2F3F7]`}
        aria-label="Live venue weather telemetry"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-[#8A621C] dark:text-[#E8C987]">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">
              {weather?.resolvedCity || activeExpo?.location || 'Venue Weather'}
            </span>
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onToggleUnit}
              aria-label={`Switch temperature unit to ${unit === 'C' ? 'Fahrenheit' : 'Celsius'}`}
              className="rounded-md border border-[var(--es-border)] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[#525463] transition-colors hover:border-[var(--es-border-strong)] hover:text-[#0B0B0E] dark:text-[#B4B7C5] dark:hover:text-[#F2F3F7]"
            >
              °{unit}
            </button>
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              aria-label="Refresh venue weather"
              className="rounded-md border border-[var(--es-border)] p-1 text-[#525463] transition-colors hover:border-[var(--es-border-strong)] hover:text-[#8A621C] disabled:opacity-50 dark:text-[#B4B7C5] dark:hover:text-[#E8C987]"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {loading && !weather ? (
          <div className="mt-2.5 flex items-center justify-between gap-3">
            <div className="h-7 w-16 animate-pulse rounded-lg bg-[#D8DBE6] dark:bg-[#23232D]" />
            <div className="h-4 w-24 animate-pulse rounded-md bg-[#D8DBE6] dark:bg-[#23232D]" />
          </div>
        ) : error && !weather ? (
          <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-[#525463] dark:text-[#9497A6]">
            <span className="truncate">{error}</span>
            <button
              type="button"
              onClick={onRefresh}
              className="shrink-0 font-semibold text-[#8A621C] underline-offset-2 hover:underline dark:text-[#E8C987]"
            >
              Retry
            </button>
          </div>
        ) : weather ? (
          <button
            type="button"
            onClick={onJumpToExpos}
            className="mt-2 flex w-full items-center justify-between gap-2 text-left"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--es-border)] bg-[#EAEBF1]/90 dark:bg-[#17171F]">
                <WeatherConditionIcon
                  category={weather.conditionCategory}
                  isDay={weather.isDay}
                  className="h-5 w-5"
                />
              </div>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-display text-xl font-extrabold tabular-nums">
                    {formatTemp(weather.temperatureC, unit)}
                  </span>
                  <span className="text-[11px] font-medium text-[#525463] dark:text-[#B4B7C5]">
                    {weather.conditionLabel}
                  </span>
                </div>
                <p className="font-mono text-[10px] text-[#525463] dark:text-[#9497A6]">
                  {weather.humidityPct}% RH · {formatWind(weather.windSpeedKmh, unit)}
                  {localTime ? ` · ${localTime}` : ''}
                </p>
              </div>
            </div>
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className="mt-5 rounded-2xl border border-[var(--es-border)] bg-[#EAEBF1]/90 p-4 dark:bg-[#0E0E13]/92"
      aria-label="Real-time venue weather conditions"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#8A621C] dark:text-[#E8C987]">
            Live Venue Weather
          </span>
          {activeExpo && (
            <span className="font-mono text-[11px] text-[#525463] dark:text-[#9497A6]">
              · {activeExpo.location}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {expos.length > 1 &&
            expos.map((expo) => {
              const cityChip = expo.location.split('·').pop()?.trim() || expo.location;
              const isActive = expo.id === activeExpo?.id;
              return (
                <button
                  key={expo.id}
                  type="button"
                  onClick={() => onSelectExpo(expo.id)}
                  className={`rounded-lg border px-2.5 py-1 font-mono text-[11px] font-medium transition-colors ${
                    isActive
                      ? 'border-[var(--es-border-strong)] bg-[#E8C987]/20 text-[#8A621C] dark:bg-[#E8C987]/15 dark:text-[#E8C987]'
                      : 'border-[var(--es-border)] text-[#525463] hover:border-[var(--es-border-strong)] hover:text-[#0B0B0E] dark:text-[#9497A6] dark:hover:text-[#F2F3F7]'
                  }`}
                >
                  {cityChip}
                </button>
              );
            })}

          <button
            type="button"
            onClick={onToggleUnit}
            className="rounded-lg border border-[var(--es-border)] px-2.5 py-1 font-mono text-[11px] font-semibold text-[#525463] transition-colors hover:border-[var(--es-border-strong)] hover:text-[#0B0B0E] dark:text-[#B4B7C5] dark:hover:text-[#F2F3F7]"
          >
            °{unit}
          </button>

          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            aria-label="Refresh weather forecast"
            className="inline-flex items-center gap-1 rounded-lg border border-[var(--es-border)] px-2.5 py-1 font-mono text-[11px] text-[#525463] transition-colors hover:border-[var(--es-border-strong)] hover:text-[#8A621C] disabled:opacity-50 dark:text-[#B4B7C5] dark:hover:text-[#E8C987]"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {loading && !weather ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-4">
          <div className="h-12 animate-pulse rounded-xl bg-[#D8DBE6] dark:bg-[#191922]" />
          <div className="h-12 animate-pulse rounded-xl bg-[#D8DBE6] dark:bg-[#191922]" />
          <div className="h-12 animate-pulse rounded-xl bg-[#D8DBE6] dark:bg-[#191922]" />
          <div className="h-12 animate-pulse rounded-xl bg-[#D8DBE6] dark:bg-[#191922]" />
        </div>
      ) : error && !weather ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--es-border)] bg-[#F8F8FB]/75 px-3.5 py-2.5 text-xs text-[#525463] dark:bg-[#14141B] dark:text-[#9497A6]">
          <span>{error}</span>
          <button
            type="button"
            onClick={onRefresh}
            className="font-semibold text-[#8A621C] hover:underline dark:text-[#E8C987]"
          >
            Retry forecast
          </button>
        </div>
      ) : weather ? (
        <div className="mt-3.5 grid items-center gap-4 border-t border-[var(--es-divider)] pt-3.5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--es-border)] bg-[#F8F8FB] dark:bg-[#16161E]">
              <WeatherConditionIcon
                category={weather.conditionCategory}
                isDay={weather.isDay}
                className="h-6 w-6"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="font-display text-2xl font-extrabold tabular-nums">
                  {formatTemp(weather.temperatureC, unit)}
                </span>
                <span className="truncate text-xs font-semibold text-[#3E404D] dark:text-[#D4D6E0]">
                  {weather.conditionLabel}
                </span>
              </div>
              <p className="truncate font-mono text-[11px] text-[#525463] dark:text-[#9497A6]">
                {weather.resolvedCity}
                {weather.country ? `, ${weather.country}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 text-xs">
            <Thermometer className="h-4 w-4 shrink-0 text-[#8A621C] dark:text-[#E8C987]" />
            <div>
              <p className="font-semibold tabular-nums">
                Feels like {formatTemp(weather.apparentTemperatureC, unit)}
              </p>
              {weather.highC !== null && weather.lowC !== null && (
                <p className="font-mono text-[11px] text-[#525463] dark:text-[#9497A6]">
                  H {formatTemp(weather.highC, unit)} · L {formatTemp(weather.lowC, unit)}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5 text-xs">
            <Droplets className="h-4 w-4 shrink-0 text-[#2DD4BF]" />
            <div>
              <p className="font-semibold tabular-nums">{weather.humidityPct}% Humidity</p>
              <p className="font-mono text-[11px] text-[#525463] dark:text-[#9497A6]">
                Precip {weather.precipitationMm} mm
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 text-xs">
            <Wind className="h-4 w-4 shrink-0 text-[#8A621C] dark:text-[#D4AF63]" />
            <div>
              <p className="font-semibold tabular-nums">
                {formatWind(weather.windSpeedKmh, unit)} Wind
              </p>
              <p className="font-mono text-[11px] text-[#525463] dark:text-[#9497A6]">
                {localTime ? `Local time ${localTime}` : weather.timezone}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
