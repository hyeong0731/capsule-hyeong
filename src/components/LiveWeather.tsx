"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_LOCATION,
  fetchLiveWeather,
  formatHumidity,
  formatRainfall,
  formatTemperature,
  formatWindDirection,
  formatWindSpeed,
  readDeviceLocation,
  type DeviceLocation,
  type LiveWeatherSnapshot,
} from "@/lib/weather";

const REFRESH_MS = 10 * 60 * 1000;

type LiveWeatherProps = {
  compact?: boolean;
  className?: string;
};

type Status = "loading" | "ready" | "error";

export default function LiveWeather({
  compact = false,
  className = "",
}: LiveWeatherProps) {
  const [status, setStatus] = useState<Status>("loading");
  const [weather, setWeather] = useState<LiveWeatherSnapshot | null>(null);
  const [location, setLocation] = useState<DeviceLocation | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const load = useCallback(async (promptGps = false) => {
    setStatus((current) => (current === "ready" ? current : "loading"));
    try {
      const device = await readDeviceLocation(
        promptGps
          ? { timeout: 8000, maximumAge: 0 }
          : undefined,
      );
      const snapshot = await fetchLiveWeather(device.lat, device.lon);
      if (!snapshot) {
        setStatus("error");
        return;
      }
      setLocation(device);
      setWeather(snapshot);
      setUpdatedAt(new Date());
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => {
      void load();
    }, REFRESH_MS);

    function onVisibility() {
      if (document.visibilityState === "visible") void load();
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [load]);

  if (status === "loading" && !weather) {
    return <WeatherSkeleton compact={compact} className={className} />;
  }

  if (status === "error" && !weather) {
    return (
      <WeatherError
        compact={compact}
        className={className}
        onRetry={() => void load(true)}
      />
    );
  }

  if (!weather) return null;

  const temp = formatTemperature(weather.temperature);
  const humid = formatHumidity(weather.humidity);
  const rain = formatRainfall(weather.rainfall);
  const windSpeed = formatWindSpeed(weather.windSpeed);
  const windDir = formatWindDirection(weather.windDirection);
  const place =
    weather.location ??
    (location?.source === "default" ? DEFAULT_LOCATION.label : "현재 위치");
  const usingFallback = location?.source !== "gps";
  const stamp = formatSeoulStamp(updatedAt);

  if (compact) {
    return (
      <section
        className={`overflow-hidden rounded-[1.6rem] px-5 py-4 ${skyClass(weather.condition)} ${className}`.trim()}
      >
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate text-xs tracking-wide text-[var(--muted)]">
              {place}
            </p>
            <p className="mt-1 font-serif text-3xl font-semibold tabular-nums tracking-tight text-[var(--paper)]">
              {temp ?? "—"}
            </p>
          </div>
          <p className="text-sm text-[var(--ink-soft)]">{weather.condition}</p>
        </div>
        {usingFallback ? (
          <FallbackHint onUseLocation={() => void load(true)} />
        ) : null}
      </section>
    );
  }

  return (
    <section
      className={`relative overflow-hidden rounded-[2rem] px-6 py-6 sm:px-8 sm:py-7 ${skyClass(weather.condition)} ${className}`.trim()}
    >
      <div className="relative flex flex-wrap items-center justify-between gap-2">
        <p className="kicker inline-flex items-center gap-2 normal-case tracking-[0.18em]">
          <LiveDot />
          지금 여기
        </p>
        {stamp ? (
          <p className="text-xs text-[var(--faint)]">{stamp} 기준</p>
        ) : null}
      </div>

      <div className="relative mt-5">
        <h2 className="truncate font-serif text-3xl font-semibold tracking-tight text-[var(--paper)]">
          {place}
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {usingFallback ? "기본 위치 · 서울" : "현재 위치"}
        </p>
      </div>

      <div className="relative mt-6 flex items-end justify-between gap-4">
        <p className="font-serif text-6xl font-semibold tabular-nums tracking-tight text-[var(--gold-soft)] sm:text-7xl">
          {temp ?? "—"}
        </p>
        <p className="mb-1 text-lg text-[var(--ink-soft)]">{weather.condition}</p>
      </div>

      <dl className="relative mt-6 grid grid-cols-3 gap-2 sm:gap-3">
        <Metric label="습도" value={humid} />
        <Metric label="강수" value={rain} />
        <Metric label="바람" value={windSpeed} hint={windDir} />
      </dl>

      {usingFallback ? (
        <FallbackHint onUseLocation={() => void load(true)} />
      ) : null}
    </section>
  );
}

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | null;
  hint?: string | null;
}) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--wash)] px-3 py-3 text-center sm:px-4">
      <dt className="text-[11px] tracking-wide text-[var(--faint)]">{label}</dt>
      <dd className="mt-1 text-sm font-medium tabular-nums text-[var(--paper)] sm:text-base">
        <span className="block truncate">{value ?? "—"}</span>
        {hint ? (
          <span className="mt-0.5 block text-[11px] font-normal text-[var(--muted)]">
            {hint}
          </span>
        ) : null}
      </dd>
    </div>
  );
}

function FallbackHint({ onUseLocation }: { onUseLocation: () => void }) {
  return (
    <div className="relative mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--muted)]">
      <p>위치 권한이 없어 서울 날씨를 보여주고 있어요.</p>
      <button
        type="button"
        onClick={onUseLocation}
        className="shrink-0 font-medium text-[var(--gold-soft)] underline-offset-2 hover:underline"
      >
        내 위치 사용
      </button>
    </div>
  );
}

function WeatherSkeleton({
  compact,
  className,
}: {
  compact: boolean;
  className: string;
}) {
  return (
    <div
      className={`animate-pulse rounded-[2rem] border border-[var(--line)] bg-[var(--soil)] ${
        compact ? "h-[88px]" : "h-[280px]"
      } ${className}`.trim()}
    />
  );
}

function WeatherError({
  compact,
  className,
  onRetry,
}: {
  compact: boolean;
  className: string;
  onRetry: () => void;
}) {
  return (
    <section
      className={`panel rounded-[2rem] px-5 ${
        compact ? "py-4" : "py-8"
      } text-center ${className}`.trim()}
    >
      <p className="text-sm text-[var(--muted)]">날씨를 불러오지 못했어요.</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-2 text-sm font-medium text-[var(--gold-soft)] underline-offset-2 hover:underline"
      >
        다시 시도
      </button>
    </section>
  );
}

function skyClass(condition: string): string {
  if (condition.includes("눈") || condition.includes("진눈")) return "weather-panel-snow";
  if (condition.includes("비") || condition.includes("빗")) return "weather-panel-rain";
  if (condition === "맑음") return "weather-panel-sun";
  if (condition === "구름많음") return "weather-panel-cloud";
  if (condition === "흐림") return "weather-panel-overcast";
  return "weather-panel";
}

function formatSeoulStamp(value: Date | null): string | null {
  if (!value) return null;
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

function LiveDot() {
  return (
    <span className="relative inline-flex h-1.5 w-1.5" aria-hidden>
      <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--gold)] opacity-50 [animation:live-pulse_2.4s_ease-out_infinite]" />
      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--gold)]" />
    </span>
  );
}
