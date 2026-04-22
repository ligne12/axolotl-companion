"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Sun,
  Wind,
} from "lucide-react";
import { useMemo } from "react";

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

/** Map WMO weather codes to a lucide icon + short label. */
function weatherIcon(code: number, isDay: boolean) {
  // Clear / sunny
  if (code === 0) return { Icon: isDay ? Sun : MoonIcon, label: isDay ? "Clear" : "Clear" };
  if (code === 1 || code === 2) return { Icon: isDay ? CloudSun : MoonIcon, label: "Partly" };
  if (code === 3) return { Icon: Cloud, label: "Cloudy" };
  if (code === 45 || code === 48) return { Icon: CloudFog, label: "Fog" };
  if (code >= 51 && code <= 57) return { Icon: CloudDrizzle, label: "Drizzle" };
  if (code >= 61 && code <= 67) return { Icon: CloudRain, label: "Rain" };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86)
    return { Icon: CloudSnow, label: "Snow" };
  if (code >= 80 && code <= 82) return { Icon: CloudRain, label: "Showers" };
  if (code >= 95) return { Icon: CloudLightning, label: "Storm" };
  return { Icon: Cloud, label: "—" };
}

/**
 * Custom SVG moon — 14×14, renders the illuminated portion based on the
 * current phase fraction. ``currentColor`` inherits from the surrounding
 * text, so it lines up with the rest of the terminal footer's foreground.
 */
function MoonIcon({ className }: { className?: string }) {
  const fraction = moonPhaseFraction();
  // Convert 0-1 phase into a waxing (0 → full) / waning (full → 0) bool.
  const waxing = fraction <= 0.5;
  const illumination = Math.abs(0.5 - fraction) * 2; // 0 = full, 1 = new
  // SVG: draw the moon disc, then overlay a shadow ellipse whose width is
  // proportional to (1 - illumination).
  const shadowRx = 7 * (1 - illumination);
  const shadowCx = waxing ? 7 - shadowRx : 7 + shadowRx;
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      className={className}
      aria-hidden="true"
    >
      <circle cx="7" cy="7" r="6" fill="currentColor" />
      <ellipse cx={shadowCx} cy="7" rx={Math.max(shadowRx, 0.01)} ry="6" fill="var(--card)" />
    </svg>
  );
}

export function WeatherPill({ locality }: { locality: string | null }) {
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
    queryKey: ["weather", geo.data?.latitude, geo.data?.longitude],
    queryFn: async (): Promise<CurrentWeather | null> => {
      const g = geo.data;
      if (!g) return null;
      const params = new URLSearchParams({
        latitude: String(g.latitude),
        longitude: String(g.longitude),
        current: "temperature_2m,weather_code,is_day,wind_speed_10m",
        timezone: "auto",
      });
      const res = await fetch(`${FORECAST_URL}?${params.toString()}`);
      if (!res.ok) return null;
      return (await res.json()) as CurrentWeather;
    },
    enabled: Boolean(geo.data),
    staleTime: 15 * 60 * 1000,
    retry: 1,
  });

  const phase = useMemo(() => moonPhaseName(moonPhaseFraction()), []);

  if (!locality || !forecast.data) return null;

  const { temperature_2m, weather_code, is_day, wind_speed_10m } = forecast.data.current;
  const isDay = is_day === 1;
  const { Icon, label } = weatherIcon(weather_code, isDay);
  const tempRounded = Math.round(temperature_2m);
  const windy = wind_speed_10m >= 35; // km/h — "windy" threshold

  return (
    <>
      <span className="text-muted-foreground">·</span>
      <span className="hidden md:inline-flex items-center gap-1.5 text-foreground">
        <Icon className="size-3.5 shrink-0" aria-hidden />
        <span className="font-mono tabular-nums normal-case tracking-normal">
          {tempRounded}°
        </span>
        <span className="text-muted-foreground">{label}</span>
        {!isDay && (
          <span className="text-muted-foreground">
            · <span className="text-foreground">{moonPhaseLabel(phase)}</span>
          </span>
        )}
        {windy && (
          <>
            <span className="text-muted-foreground">·</span>
            <Wind className="size-3.5 shrink-0" aria-hidden />
          </>
        )}
      </span>
    </>
  );
}
