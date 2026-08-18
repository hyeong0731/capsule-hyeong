export type WeatherSnapshot = {
  condition: string;
  temperature: number | null;
  humidity: number | null;
  rainfall?: number | null;
  windSpeed?: number | null;
  windDirection?: number | null;
};

export type DeviceLocation = {
  lat: number;
  lon: number;
  source: "gps" | "default";
};

export type LiveWeatherSnapshot = WeatherSnapshot & {
  location: string | null;
  rainfall: number | null;
  windSpeed: number | null;
  windDirection: number | null;
};

export const DEFAULT_LOCATION = {
  lat: 37.5665,
  lon: 126.978,
  label: "서울 중구",
} as const;

export function isInKoreaGrid(lat: number, lon: number): boolean {
  return lat >= 32 && lat <= 44 && lon >= 124 && lon <= 132;
}

const PTY_LABEL: Record<number, string> = {
  1: "비",
  2: "비/눈",
  3: "눈",
  5: "빗방울",
  6: "진눈깨비",
  7: "눈날림",
};

const SKY_LABEL: Record<number, string> = {
  1: "맑음",
  3: "구름많음",
  4: "흐림",
};

export function describeWeather(pty: number | null, sky: number | null): string {
  if (pty && PTY_LABEL[pty]) return PTY_LABEL[pty];
  if (sky && SKY_LABEL[sky]) return SKY_LABEL[sky];
  return "알 수 없음";
}

export function weatherEmoji(condition: string | null | undefined): string {
  if (!condition) return "🌤️";
  if (condition.includes("눈") || condition.includes("진눈")) return "🌨️";
  if (condition.includes("비") || condition.includes("빗")) return "🌧️";
  if (condition === "맑음") return "☀️";
  if (condition === "구름많음") return "⛅";
  if (condition === "흐림") return "☁️";
  return "🌤️";
}

export function formatTemperature(value: number | string | null | undefined): string | null {
  const n = toNumber(value);
  if (n == null) return null;
  return `${Number.isInteger(n) ? n : n.toFixed(1)}°`;
}

export function formatHumidity(value: number | string | null | undefined): string | null {
  const n = toNumber(value);
  if (n == null) return null;
  return `${Math.round(n)}%`;
}

export function formatRainfall(value: number | string | null | undefined): string | null {
  const n = toNumber(value);
  if (n == null) return null;
  if (n <= 0) return "없음";
  return `${Number.isInteger(n) ? n : n.toFixed(1)}mm`;
}

export function formatWindSpeed(value: number | string | null | undefined): string | null {
  const n = toNumber(value);
  if (n == null) return null;
  return `${n < 10 ? n.toFixed(1) : Math.round(n)}m/s`;
}

const WIND_POINTS = ["북", "북동", "동", "남동", "남", "남서", "서", "북서"] as const;

export function formatWindDirection(
  value: number | string | null | undefined,
): string | null {
  const n = toNumber(value);
  if (n == null) return null;
  const index = Math.round((((n % 360) + 360) % 360) / 45) % WIND_POINTS.length;
  return `${WIND_POINTS[index]}풍`;
}

export function toNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function readDeviceLocation(
  options?: PositionOptions,
): Promise<DeviceLocation> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return { lat: DEFAULT_LOCATION.lat, lon: DEFAULT_LOCATION.lon, source: "default" };
  }

  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        timeout: 4000,
        maximumAge: 10 * 60 * 1000,
        ...options,
      });
    });
    const lat = position.coords.latitude;
    const lon = position.coords.longitude;
    if (!isInKoreaGrid(lat, lon)) {
      return { lat: DEFAULT_LOCATION.lat, lon: DEFAULT_LOCATION.lon, source: "default" };
    }
    return { lat, lon, source: "gps" };
  } catch {
    return { lat: DEFAULT_LOCATION.lat, lon: DEFAULT_LOCATION.lon, source: "default" };
  }
}

export async function fetchWeatherSnapshot(
  lat: number,
  lon: number,
): Promise<WeatherSnapshot | null> {
  const live = await fetchLiveWeather(lat, lon);
  if (!live) return null;
  return {
    condition: live.condition,
    temperature: live.temperature,
    humidity: live.humidity,
  };
}

export async function fetchLiveWeather(
  lat: number,
  lon: number,
): Promise<LiveWeatherSnapshot | null> {
  try {
    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lon),
    });
    const res = await fetch(`/api/weather?${params.toString()}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;

    const data = (await res.json()) as {
      condition?: unknown;
      temperature?: unknown;
      humidity?: unknown;
      rainfall?: unknown;
      windSpeed?: unknown;
      windDirection?: unknown;
      location?: unknown;
    };
    if (typeof data.condition !== "string") return null;

    return {
      condition: data.condition,
      temperature: toNumber(data.temperature),
      humidity: toNumber(data.humidity),
      rainfall: toNumber(data.rainfall),
      windSpeed: toNumber(data.windSpeed),
      windDirection: toNumber(data.windDirection),
      location: typeof data.location === "string" ? data.location : null,
    };
  } catch {
    return null;
  }
}
