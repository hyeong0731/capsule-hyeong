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
  weatherEmoji,
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
        className={`overflow-hidden rounded-3xl border border-white/70 px-5 py-4 shadow-sm ${skyClass(weather.condition)} ${className}`.trim()}
      >
        <div className="flex items-center gap-4">
          <span className="text-4xl" aria-hidden>
            {weatherEmoji(weather.condition)}
          </span>
          <div className="min-w-0 flex-1 text-left">
            <p className="truncate text-sm font-medium text-slate-600">
              {place}
            </p>
            <p className="text-2xl font-semibold tabular-nums tracking-tight text-slate-800">
              {temp ?? "—"}
              <span className="ml-2 text-base font-medium text-slate-600">
                {weather.condition}
              </span>
            </p>
          </div>
        </div>
        {usingFallback ? (
          <FallbackHint onUseLocation={() => void load(true)} />
        ) : null}
      </section>
    );
  }

  return (
    <section
      className={`relative overflow-hidden rounded-[2rem] border border-white/70 px-6 py-6 shadow-sm sm:px-8 sm:py-7 ${skyClass(weather.condition)} ${className}`.trim()}
    >
      <div
        className="pointer-events-none absolute -right-3 -top-6 text-[7.5rem] leading-none opacity-[0.16] sm:text-[9rem]"
        aria-hidden
      >
        {weatherEmoji(weather.condition)}
      </div>

      <div className="relative flex flex-wrap items-center justify-between gap-2">
        <p className="inline-flex items-center gap-2 text-xs font-medium tracking-wide text-slate-600">
          <LiveDot />
          지금 여기
        </p>
        {stamp ? (
          <p className="text-xs text-slate-500">{stamp} 기준</p>
        ) : null}
      </div>

      <div className="relative mt-3 flex items-start gap-2">
        <LocationPin />
        <div className="min-w-0">
          <h2 className="truncate text-2xl font-semibold tracking-tight text-slate-800 sm:text-3xl">
            {place}
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            {usingFallback ? "기본 위치 · 서울" : "현재 위치"}
          </p>
        </div>
      </div>

      <div className="relative mt-6 flex items-end gap-4 sm:gap-5">
        <span className="text-6xl leading-none sm:text-7xl" aria-hidden>
          {weatherEmoji(weather.condition)}
        </span>
        <div>
          <p className="text-6xl font-semibold tabular-nums tracking-tight text-slate-800 sm:text-7xl">
            {temp ?? "—"}
          </p>
          <p className="mt-1 text-lg font-medium text-slate-700">
            {weather.condition}
          </p>
        </div>
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
    <div className="rounded-2xl bg-white/55 px-3 py-3 text-center backdrop-blur-sm sm:px-4">
      <dt className="text-[11px] font-medium tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-semibold tabular-nums text-slate-800 sm:text-base">
        <span className="block truncate">{value ?? "—"}</span>
        {hint ? (
          <span className="mt-0.5 block text-[11px] font-medium text-slate-500">
            {hint}
          </span>
        ) : null}
      </dd>
    </div>
  );
}

function FallbackHint({ onUseLocation }: { onUseLocation: () => void }) {
  return (
    <div className="relative mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
      <p>위치 권한이 없어 서울 날씨를 보여주고 있어요.</p>
      <button
        type="button"
        onClick={onUseLocation}
        className="shrink-0 font-medium text-sky-800 underline-offset-2 hover:underline"
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
      className={`animate-pulse rounded-[2rem] border border-white/70 bg-white/70 ${
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
      className={`rounded-[2rem] border border-white/70 bg-white/70 px-5 ${
        compact ? "py-4" : "py-8"
      } text-center ${className}`.trim()}
    >
      <p className="text-sm text-slate-500">날씨를 불러오지 못했어요.</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-2 text-sm font-medium text-sky-800 underline-offset-2 hover:underline"
      >
        다시 시도
      </button>
    </section>
  );
}

function skyClass(condition: string): string {
  if (condition.includes("눈") || condition.includes("진눈")) {
    return "bg-gradient-to-br from-sky-50 via-white to-slate-100";
  }
  if (condition.includes("비") || condition.includes("빗")) {
    return "bg-gradient-to-br from-slate-300/80 via-sky-100 to-slate-100";
  }
  if (condition === "맑음") {
    return "bg-gradient-to-br from-sky-200/90 via-amber-50 to-white";
  }
  if (condition === "구름많음") {
    return "bg-gradient-to-br from-sky-100 via-white to-slate-50";
  }
  if (condition === "흐림") {
    return "bg-gradient-to-br from-slate-200 via-slate-100 to-white";
  }
  return "bg-gradient-to-br from-sky-50 to-white";
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
    <span className="relative inline-flex h-2 w-2" aria-hidden>
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
    </span>
  );
}

function LocationPin() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      className="mt-1.5 h-5 w-5 shrink-0 text-sky-700 sm:mt-2 sm:h-6 sm:w-6"
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        d="M10 2a6 6 0 0 0-6 6c0 3.94 4.53 9.17 5.72 10.5a.4.4 0 0 0 .56 0C11.47 17.17 16 11.94 16 8a6 6 0 0 0-6-6Zm0 8.25A2.25 2.25 0 1 1 10 5.75a2.25 2.25 0 0 1 0 4.5Z"
        clipRule="evenodd"
      />
    </svg>
  );
}
