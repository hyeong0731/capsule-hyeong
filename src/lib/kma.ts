import { describeWeather, type WeatherSnapshot } from "@/lib/weather";

const KMA_BASE = "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0";

type NcstItem = {
  category?: string;
  obsrValue?: string;
};

type FcstItem = {
  category?: string;
  fcstDate?: string;
  fcstTime?: string;
  fcstValue?: string;
};

type KmaHeader = {
  resultCode?: string;
  resultMsg?: string;
};

type KmaBody<T> = {
  items?: { item?: T | T[] };
};

type KmaResponse<T> = {
  response?: {
    header?: KmaHeader;
    body?: KmaBody<T>;
  };
};

function getServiceKey(): string {
  const raw = process.env.KMA_SERVICE_KEY?.trim();
  if (!raw) {
    throw new Error("기상청 API 키가 설정되지 않았습니다.");
  }
  // Some hosts treat `+` in env values as a space; KMA keys are base64-like.
  const normalized = raw.replace(/ /g, "+");
  try {
    return decodeURIComponent(normalized);
  } catch {
    return normalized;
  }
}

function kmaUrl(operation: string, params: Record<string, string>): string {
  const query = new URLSearchParams(params);
  return `${KMA_BASE}/${operation}?serviceKey=${encodeURIComponent(getServiceKey())}&${query.toString()}`;
}

function toArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function seoulWallClock(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const num = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");
  return {
    year: num("year"),
    month: num("month"),
    day: num("day"),
    hour: num("hour"),
    minute: num("minute"),
  };
}

function shiftSeoulHours(
  clock: ReturnType<typeof seoulWallClock>,
  hours: number,
) {
  const shifted = new Date(
    Date.UTC(clock.year, clock.month - 1, clock.day, clock.hour + hours, 0, 0, 0),
  );
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: 0,
  };
}

function yyyymmdd(clock: { year: number; month: number; day: number }): string {
  return `${clock.year}${String(clock.month).padStart(2, "0")}${String(clock.day).padStart(2, "0")}`;
}

function hhmmFromHour(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}${String(minute).padStart(2, "0")}`;
}

/** 초단기실황: 매시 정시 발표, 10분 이후 호출 */
function ncstBase(now = new Date()): { baseDate: string; baseTime: string } {
  let clock = seoulWallClock(now);
  if (clock.minute < 10) {
    clock = shiftSeoulHours(clock, -1);
  }
  return { baseDate: yyyymmdd(clock), baseTime: hhmmFromHour(clock.hour, 0) };
}

/** 초단기예보: 매시 30분 발표, 45분 이후 호출 */
function fcstBase(now = new Date()): { baseDate: string; baseTime: string } {
  let clock = seoulWallClock(now);
  if (clock.minute < 45) {
    clock = shiftSeoulHours(clock, -1);
  }
  return { baseDate: yyyymmdd(clock), baseTime: hhmmFromHour(clock.hour, 30) };
}

/**
 * 기상청 단기예보 Lambert 격자 변환.
 * 가이드 별첨 공식: Re=6371.00877, grid=5km, 원점 (126, 38), xo=43, yo=136
 */
export function latLonToGrid(lat: number, lon: number): { nx: number; ny: number } {
  const RE = 6371.00877;
  const GRID = 5.0;
  const SLAT1 = 30.0;
  const SLAT2 = 60.0;
  const OLON = 126.0;
  const OLAT = 38.0;
  const XO = 43;
  const YO = 136;
  const DEGRAD = Math.PI / 180.0;

  const re = RE / GRID;
  const slat1 = SLAT1 * DEGRAD;
  const slat2 = SLAT2 * DEGRAD;
  const olon = OLON * DEGRAD;
  const olat = OLAT * DEGRAD;

  let sn =
    Math.tan(Math.PI * 0.25 + slat2 * 0.5) /
    Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);
  let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sf = (Math.pow(sf, sn) * Math.cos(slat1)) / sn;
  let ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
  ro = (re * sf) / Math.pow(ro, sn);

  let ra = Math.tan(Math.PI * 0.25 + lat * DEGRAD * 0.5);
  ra = (re * sf) / Math.pow(ra, sn);
  let theta = lon * DEGRAD - olon;
  if (theta > Math.PI) theta -= 2.0 * Math.PI;
  if (theta < -Math.PI) theta += 2.0 * Math.PI;
  theta *= sn;

  return {
    nx: Math.floor(ra * Math.sin(theta) + XO + 0.5),
    ny: Math.floor(ro - ra * Math.cos(theta) + YO + 0.5),
  };
}

function parseNumber(value: string | undefined): number | null {
  if (value == null || value === "" || value === "-") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function isOk(code: string | undefined): boolean {
  return code === "00" || code === "0";
}

function isNoData(code: string | undefined): boolean {
  return code === "03";
}

async function kmaFetch<T>(
  operation: string,
  params: Record<string, string>,
): Promise<{ header: KmaHeader; items: T[] }> {
  const url = kmaUrl(operation, params);
  const res = await fetch(url, { cache: "no-store" });
  const text = await res.text();

  let json: KmaResponse<T>;
  try {
    json = JSON.parse(text) as KmaResponse<T>;
  } catch {
    throw new Error("기상청 응답을 읽지 못했습니다.");
  }

  const header = json.response?.header ?? {};
  const items = toArray(json.response?.body?.items?.item);
  return { header, items };
}

async function fetchNcstItems(nx: number, ny: number): Promise<NcstItem[]> {
  const first = ncstBase();
  const previous = ncstBase(new Date(Date.now() - 60 * 60 * 1000));
  const attempts = [first, previous];

  for (const base of attempts) {
    const { header, items } = await kmaFetch<NcstItem>("getUltraSrtNcst", {
      pageNo: "1",
      numOfRows: "20",
      dataType: "JSON",
      base_date: base.baseDate,
      base_time: base.baseTime,
      nx: String(nx),
      ny: String(ny),
    });
    if (isOk(header.resultCode) && items.length > 0) return items;
    if (!isNoData(header.resultCode) && !isOk(header.resultCode)) {
      throw new Error(header.resultMsg ?? "기상청 실황 조회에 실패했습니다.");
    }
  }
  return [];
}

async function fetchFcstItems(nx: number, ny: number): Promise<FcstItem[]> {
  const first = fcstBase();
  const previous = fcstBase(new Date(Date.now() - 60 * 60 * 1000));
  const attempts = [first, previous];

  for (const base of attempts) {
    const { header, items } = await kmaFetch<FcstItem>("getUltraSrtFcst", {
      pageNo: "1",
      numOfRows: "80",
      dataType: "JSON",
      base_date: base.baseDate,
      base_time: base.baseTime,
      nx: String(nx),
      ny: String(ny),
    });
    if (isOk(header.resultCode) && items.length > 0) return items;
    if (!isNoData(header.resultCode) && !isOk(header.resultCode)) {
      throw new Error(header.resultMsg ?? "기상청 예보 조회에 실패했습니다.");
    }
  }
  return [];
}

function nearestFcstByCategory(items: FcstItem[]): Map<string, string> {
  const grouped = new Map<string, FcstItem[]>();
  for (const item of items) {
    if (!item.category) continue;
    const list = grouped.get(item.category) ?? [];
    list.push(item);
    grouped.set(item.category, list);
  }

  const values = new Map<string, string>();
  for (const [category, list] of grouped) {
    const sorted = [...list].sort((a, b) => {
      const left = `${a.fcstDate ?? ""}${a.fcstTime ?? ""}`;
      const right = `${b.fcstDate ?? ""}${b.fcstTime ?? ""}`;
      return left.localeCompare(right);
    });
    const value = sorted[0]?.fcstValue;
    if (value != null) values.set(category, value);
  }
  return values;
}

export async function fetchCurrentWeather(
  lat: number,
  lon: number,
): Promise<WeatherSnapshot> {
  if (process.env.KMA_SERVICE_KEY?.trim()) {
    try {
      return await fetchKmaWeather(lat, lon);
    } catch (err) {
      const fallback = await fetchOpenMeteoWeather(lat, lon).catch(() => null);
      if (fallback) return fallback;
      throw err;
    }
  }

  const fallback = await fetchOpenMeteoWeather(lat, lon).catch(() => null);
  if (fallback) return fallback;
  throw new Error("기상청 API 키가 설정되지 않았습니다.");
}

async function fetchKmaWeather(
  lat: number,
  lon: number,
): Promise<WeatherSnapshot> {
  const { nx, ny } = latLonToGrid(lat, lon);
  const [ncstItems, fcstItems] = await Promise.all([
    fetchNcstItems(nx, ny),
    fetchFcstItems(nx, ny),
  ]);

  const ncst = new Map(
    ncstItems
      .filter((item) => item.category)
      .map((item) => [item.category as string, item.obsrValue ?? ""]),
  );
  const fcst = nearestFcstByCategory(fcstItems);

  const temperature =
    parseNumber(ncst.get("T1H")) ?? parseNumber(fcst.get("T1H"));
  const humidity =
    parseNumber(ncst.get("REH")) ?? parseNumber(fcst.get("REH"));
  const rainfall =
    parseNumber(ncst.get("RN1")) ?? parseNumber(fcst.get("RN1"));
  const windSpeed =
    parseNumber(ncst.get("WSD")) ?? parseNumber(fcst.get("WSD"));
  const windDirection =
    parseNumber(ncst.get("VEC")) ?? parseNumber(fcst.get("VEC"));
  const pty = parseNumber(ncst.get("PTY")) ?? parseNumber(fcst.get("PTY"));
  const sky = parseNumber(fcst.get("SKY"));

  if (temperature == null && humidity == null && pty == null && sky == null) {
    throw new Error("날씨 데이터가 비어 있습니다.");
  }

  return {
    condition: describeWeather(pty, sky),
    temperature,
    humidity,
    rainfall,
    windSpeed,
    windDirection,
  };
}

const OPEN_METEO_CODES: Record<number, string> = {
  0: "맑음",
  1: "맑음",
  2: "구름많음",
  3: "흐림",
  45: "흐림",
  48: "흐림",
  51: "빗방울",
  53: "비",
  55: "비",
  56: "비",
  57: "비",
  61: "비",
  63: "비",
  65: "비",
  66: "비",
  67: "비",
  71: "눈",
  73: "눈",
  75: "눈",
  77: "눈",
  80: "비",
  81: "비",
  82: "비",
  85: "눈",
  86: "눈",
  95: "비",
  96: "비",
  99: "비",
};

async function fetchOpenMeteoWeather(
  lat: number,
  lon: number,
): Promise<WeatherSnapshot> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current:
      "temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,wind_direction_10m",
    wind_speed_unit: "ms",
    timezone: "Asia/Seoul",
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) {
    throw new Error("대체 날씨 조회에 실패했습니다.");
  }

  const data = (await res.json()) as {
    current?: {
      temperature_2m?: number;
      relative_humidity_2m?: number;
      precipitation?: number;
      weather_code?: number;
      wind_speed_10m?: number;
      wind_direction_10m?: number;
    };
  };
  const current = data.current;
  if (!current) {
    throw new Error("대체 날씨 데이터가 비어 있습니다.");
  }

  const code = current.weather_code;
  return {
    condition:
      (code != null ? OPEN_METEO_CODES[code] : undefined) ?? "알 수 없음",
    temperature: parseNumber(String(current.temperature_2m ?? "")),
    humidity: parseNumber(String(current.relative_humidity_2m ?? "")),
    rainfall: parseNumber(String(current.precipitation ?? "")),
    windSpeed: parseNumber(String(current.wind_speed_10m ?? "")),
    windDirection: parseNumber(String(current.wind_direction_10m ?? "")),
  };
}
