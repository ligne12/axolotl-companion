"use client";

import { useQuery } from "@tanstack/react-query";
import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, Sun, Wind } from "lucide-react";

import { moonPhaseFraction, moonPhaseLabel, moonPhaseName } from "@/lib/moon";

const GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

type GeoHit = { latitude: number; longitude: number; name: string; country_code?: string };
type GeoResponse = { results?: GeoHit[] };

type CurrentWeather = {
  current: {
    temperature_2m: number;
    weather_code: number;
    is_day: 0 | 1;
    wind_speed_10m: number;
  };
};

type WeatherKind = "clear" | "partly" | "cloud" | "fog" | "drizzle" | "rain" | "snow" | "storm";

/** Map a WMO code to a normalised weather kind + short label. */
function mapWeather(code: number): { kind: WeatherKind; label: string } {
  if (code === 0) return { kind: "clear", label: "Clear" };
  if (code === 1 || code === 2) return { kind: "partly", label: "Partly" };
  if (code === 3) return { kind: "cloud", label: "Cloudy" };
  if (code === 45 || code === 48) return { kind: "fog", label: "Fog" };
  if (code >= 51 && code <= 57) return { kind: "drizzle", label: "Drizzle" };
  if (code >= 61 && code <= 67) return { kind: "rain", label: "Rain" };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { kind: "snow", label: "Snow" };
  if (code >= 80 && code <= 82) return { kind: "rain", label: "Showers" };
  if (code >= 95) return { kind: "storm", label: "Storm" };
  return { kind: "cloud", label: "—" };
}

/** Pick a lucide (outline) glyph for day-time weather. */
function dayIcon(kind: WeatherKind) {
  switch (kind) {
    case "clear": return Sun;
    case "partly": return CloudSun;
    case "cloud": return Cloud;
    case "fog": return CloudFog;
    case "drizzle": return CloudDrizzle;
    case "rain": return CloudRain;
    case "snow": return CloudSnow;
    case "storm": return CloudLightning;
  }
}

/**
 * Filled mini glyph used as the bottom-right overlay on the moon at night.
 * Lucide icons are stroke-only and read as two ink outlines when layered on
 * the moon disc; these custom filled silhouettes read as a single solid
 * shape. All drawn in a 12×10 viewBox with ``currentColor`` fill.
 */
function WeatherOverlay({ kind, className, style }: {
  kind: WeatherKind;
  className?: string;
  style?: React.CSSProperties;
}) {
  if (kind === "clear") return null;
  // Shared cloud silhouette (fills 6 → 10 Y, covers most of width).
  const CLOUD_PATH =
    "M3.5 4 Q4 1.5 6 1.5 Q7.5 1 8.5 2.2 Q10.2 2 10.6 3.8 Q11.5 4.2 11.5 5.5 Q11.5 7 10 7 L3 7 Q1 7 1 5.3 Q1 4 3 4 Z";
  // Two strokes:
  //   1. Outer halo in ``--background`` — creates a crisp separation
  //      between the cloud and the moon without the blur of a drop-shadow.
  //   2. Inner ink stroke — defines the cloud silhouette on the unlit
  //      (transparent) side of the moon.
  // Fill is ``--card`` so the cloud reads as a bright cutout against the
  // dark lit side.
  return (
    <svg
      width="12"
      height="10"
      viewBox="0 0 12 10"
      className={className}
      style={style}
      aria-hidden
    >
      <path
        d={CLOUD_PATH}
        fill="none"
        stroke="var(--background)"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path
        d={CLOUD_PATH}
        fill="var(--card)"
        stroke="currentColor"
        strokeWidth="0.9"
        strokeLinejoin="round"
      />
      {kind === "rain" && (
        <>
          <rect x="4" y="7.5" width="0.9" height="2.2" fill="currentColor" />
          <rect x="6" y="8" width="0.9" height="2.2" fill="currentColor" />
          <rect x="8" y="7.5" width="0.9" height="2.2" fill="currentColor" />
        </>
      )}
      {kind === "drizzle" && (
        <>
          <rect x="5" y="8" width="0.9" height="1.4" fill="currentColor" />
          <rect x="7" y="8" width="0.9" height="1.4" fill="currentColor" />
        </>
      )}
      {kind === "snow" && (
        <>
          <circle cx="4.5" cy="8.5" r="0.7" fill="currentColor" />
          <circle cx="6.5" cy="9" r="0.7" fill="currentColor" />
          <circle cx="8.5" cy="8.5" r="0.7" fill="currentColor" />
        </>
      )}
      {kind === "storm" && (
        <polygon points="6,7.3 4,10 5.5,8.5 4.5,10 7,7.3" fill="currentColor" />
      )}
      {kind === "fog" && (
        <>
          <rect x="2.5" y="8" width="7" height="0.8" fill="currentColor" />
          <rect x="3.5" y="9" width="5" height="0.8" fill="currentColor" />
        </>
      )}
    </svg>
  );
}

/**
 * Phase-aware moon — two-layer render: crisp outline ring (full disc
 * silhouette, always visible) + filled lit portion. No dim base — that
 * read as "grey smudge" at small sizes.
 */
function MoonIcon({ className }: { className?: string }) {
  const fraction = moonPhaseFraction();
  const label = moonPhaseLabel(moonPhaseName(fraction));
  const r = 6.2;
  const cx = 7;
  const cy = 7;
  const angle = fraction * 2 * Math.PI;
  const ellipseRx = r * Math.abs(Math.cos(angle));
  const litOnRight = fraction < 0.5;
  const outerSweep = litOnRight ? 1 : 0;
  const innerSweep = Math.cos(angle) > 0 ? outerSweep : 1 - outerSweep;
  const path =
    `M ${cx},${cy - r} ` +
    `A ${r},${r} 0 0,${outerSweep} ${cx},${cy + r} ` +
    `A ${ellipseRx || 0.001},${r} 0 0,${innerSweep} ${cx},${cy - r} Z`;
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      className={className}
      role="img"
      aria-label={`Moon phase: ${label}`}
    >
      <title>{label}</title>
      <path d={path} fill="currentColor" />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
      />
    </svg>
  );
}

export function WeatherPill({
  locality,
  unit = "C",
}: {
  locality: string | null;
  unit?: "C" | "F";
}) {
  // 1. Resolve locality → lat/lng (cached ~ forever)
  const geo = useQuery({
    queryKey: ["geocode", locality],
    queryFn: async (): Promise<GeoHit | null> => {
      if (!locality) return null;
      const res = await fetch(
        `${GEOCODE_URL}?name=${encodeURIComponent(locality)}&count=1&language=en&format=json`,
      );
      if (!res.ok) return null;
      const data = (await res.json()) as GeoResponse;
      return data.results?.[0] ?? null;
    },
    enabled: Boolean(locality),
    staleTime: 24 * 60 * 60 * 1000,
    retry: 1,
  });

  // 2. Current weather at lat/lng (refreshed every 15 min)
  const forecast = useQuery({
    queryKey: ["weather", geo.data?.latitude, geo.data?.longitude, unit],
    queryFn: async (): Promise<CurrentWeather | null> => {
      const g = geo.data;
      if (!g) return null;
      const params = new URLSearchParams({
        latitude: String(g.latitude),
        longitude: String(g.longitude),
        current: "temperature_2m,weather_code,is_day,wind_speed_10m",
        timezone: "auto",
      });
      if (unit === "F") params.set("temperature_unit", "fahrenheit");
      const res = await fetch(`${FORECAST_URL}?${params.toString()}`);
      if (!res.ok) return null;
      return (await res.json()) as CurrentWeather;
    },
    enabled: Boolean(geo.data),
    staleTime: 15 * 60 * 1000,
    retry: 1,
  });

  if (!locality || !forecast.data) return null;

  const { temperature_2m, weather_code, is_day, wind_speed_10m } = forecast.data.current;
  const isDay = is_day === 1;
  const { kind, label } = mapWeather(weather_code);
  const DayIcon = isDay ? dayIcon(kind) : null;
  const tempRounded = Math.round(temperature_2m);
  const windy = wind_speed_10m >= 35;

  const Icon = isDay ? (
    DayIcon && <DayIcon className="size-4 shrink-0" aria-hidden />
  ) : (
    // Night: cloud in the foreground (the useful weather info), smaller
    // phase-aware moon peeking from the top-left behind it. Clear skies →
    // just the moon centred.
    <span className="relative inline-flex h-4 w-[22px] shrink-0 items-center">
      <MoonIcon
        className={kind === "clear" ? "absolute left-1 size-4" : "absolute left-0 top-0 size-[11px]"}
      />
      {kind !== "clear" && (
        <WeatherOverlay
          kind={kind}
          className="absolute right-0 top-0.5 size-[15px]"
        />
      )}
    </span>
  );

  return (
    <>
      <span className="text-muted-foreground">·</span>
      <span className="inline-flex items-center gap-1.5 text-foreground">
        {Icon}
        <span className="font-mono tabular-nums normal-case tracking-normal">
          {tempRounded}°{unit}
        </span>
        {/* Verbal label + wind hint only on wider screens — too noisy in
        the narrow mobile terminal bar. */}
        <span className="hidden md:inline text-muted-foreground">{label}</span>
        {windy && (
          <>
            <span className="hidden md:inline text-muted-foreground">·</span>
            <Wind className="hidden md:inline-block size-3.5 shrink-0" aria-hidden />
          </>
        )}
      </span>
    </>
  );
}
