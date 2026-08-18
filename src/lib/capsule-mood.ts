import type { WeatherSnapshot } from "@/lib/weather";

export const CAPSULE_FORMS = [
  "sun",
  "heat",
  "cloud",
  "overcast",
  "rain",
  "snow",
  "mist",
  "breeze",
] as const;

export type CapsuleForm = (typeof CAPSULE_FORMS)[number];

export type CapsuleMood = {
  oneLiner: string;
  keywords: string[];
  form: CapsuleForm;
  primary: string;
  secondary: string;
  accent: string;
};

export const FORM_LABEL: Record<CapsuleForm, string> = {
  sun: "햇살 단지",
  heat: "더위 단지",
  cloud: "구름 단지",
  overcast: "흐림 단지",
  rain: "빗물 단지",
  snow: "눈송이 단지",
  mist: "안개 단지",
  breeze: "바람 단지",
};

const HEX = /^#([0-9a-fA-F]{6})$/;

const FALLBACK_PALETTES: Record<
  CapsuleForm,
  Pick<CapsuleMood, "primary" | "secondary" | "accent">
> = {
  sun: { primary: "#F6C453", secondary: "#FFF4D6", accent: "#E8892F" },
  heat: { primary: "#F08A4B", secondary: "#FFE2C8", accent: "#D94B2B" },
  cloud: { primary: "#A9B8D0", secondary: "#EEF3FA", accent: "#6E7FA0" },
  overcast: { primary: "#7E8B9A", secondary: "#D9E0E7", accent: "#4C5866" },
  rain: { primary: "#4F7EA8", secondary: "#D4E7F5", accent: "#1F4E79" },
  snow: { primary: "#C9D7EE", secondary: "#F7FBFF", accent: "#6F8CB8" },
  mist: { primary: "#7FB3B0", secondary: "#E7F4F2", accent: "#3E7A76" },
  breeze: { primary: "#6DB39A", secondary: "#E5F6EE", accent: "#2F7A62" },
};

export function isCapsuleForm(value: unknown): value is CapsuleForm {
  return typeof value === "string" && (CAPSULE_FORMS as readonly string[]).includes(value);
}

export function hasCapsuleLook(
  mood: Pick<CapsuleMood, "form" | "primary"> | { form: string | null; primary: string | null },
): boolean {
  return Boolean(mood.form && mood.primary);
}

export function moodFromWeather(
  weather: WeatherSnapshot | null,
  letter?: string,
): CapsuleMood {
  const form = formFromWeather(weather);
  const palette = FALLBACK_PALETTES[form];
  const keywords = fallbackKeywords(weather, letter);
  return {
    form,
    ...palette,
    oneLiner: fallbackOneLiner(form, weather),
    keywords,
  };
}

export function normalizeMood(
  raw: Partial<CapsuleMood> | null | undefined,
  weather: WeatherSnapshot | null,
  letter?: string,
): CapsuleMood {
  const fallback = moodFromWeather(weather, letter);
  const form = isCapsuleForm(raw?.form) ? raw.form : fallback.form;
  const palette = FALLBACK_PALETTES[form];
  const keywords = sanitizeKeywords(raw?.keywords).length
    ? sanitizeKeywords(raw?.keywords)
    : fallback.keywords;

  return {
    form,
    primary: sanitizeHex(raw?.primary) ?? palette.primary,
    secondary: sanitizeHex(raw?.secondary) ?? palette.secondary,
    accent: sanitizeHex(raw?.accent) ?? palette.accent,
    oneLiner: sanitizeLine(raw?.oneLiner) || fallback.oneLiner,
    keywords,
  };
}

export async function fetchCapsuleMood(input: {
  weather: WeatherSnapshot | null;
  letter: string;
  recipient: string;
}): Promise<CapsuleMood> {
  try {
    const res = await fetch("/api/capsule-mood", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify(input),
    });
    if (!res.ok) return moodFromWeather(input.weather, input.letter);
    const data = (await res.json()) as Partial<CapsuleMood>;
    return normalizeMood(data, input.weather, input.letter);
  } catch {
    return moodFromWeather(input.weather, input.letter);
  }
}

function formFromWeather(weather: WeatherSnapshot | null): CapsuleForm {
  const condition = weather?.condition ?? "";
  const temp = weather?.temperature ?? null;
  const humidity = weather?.humidity ?? null;

  if (condition.includes("눈") || condition.includes("진눈")) return "snow";
  if (condition.includes("비") || condition.includes("빗")) return "rain";
  if (condition === "흐림") return "overcast";
  if (typeof humidity === "number" && humidity >= 80 && condition.includes("구름")) {
    return "mist";
  }
  if (condition === "구름많음") return "cloud";
  if (condition === "맑음" && typeof temp === "number" && temp >= 29) return "heat";
  if (condition === "맑음") return "sun";
  if (typeof temp === "number" && temp >= 29) return "heat";
  return "breeze";
}

function fallbackOneLiner(form: CapsuleForm, weather: WeatherSnapshot | null): string {
  const temp =
    typeof weather?.temperature === "number"
      ? `${Math.round(weather.temperature)}도`
      : "";
  const lines: Record<CapsuleForm, string> = {
    sun: temp ? `${temp}의 햇살이 유리 안에 머물렀어요.` : "맑은 하루가 유리 안에 머물렀어요.",
    heat: "더운 공기가 뚜껑 아래서 숨을 고르고 있어요.",
    cloud: "구름이 많은 하늘이 조용히 앉아 있어요.",
    overcast: "흐린 빛도 오늘의 색이 될 수 있어요.",
    rain: "빗소리가 캡슐 벽에 작게 남아 있어요.",
    snow: "눈이 내리던 공기가 아직 차갑게 빛나요.",
    mist: "습한 안개가 유리 안을 부드럽게 감싸요.",
    breeze: "바람이 스친 하루가 여기에 담겼어요.",
  };
  return lines[form];
}

function fallbackKeywords(weather: WeatherSnapshot | null, letter?: string): string[] {
  const words: string[] = [];
  if (weather?.condition) words.push(weather.condition);
  if (typeof weather?.temperature === "number") {
    words.push(`${Math.round(weather.temperature)}도`);
  }
  if (typeof weather?.humidity === "number") {
    words.push(weather.humidity >= 70 ? "습한공기" : "마른공기");
  }
  const hint = letter?.match(/[가-힣]{2,6}/g)?.slice(0, 2) ?? [];
  return sanitizeKeywords([...words, ...hint]).slice(0, 4);
}

function sanitizeHex(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return HEX.test(trimmed) ? trimmed.toUpperCase() : null;
}

function sanitizeLine(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, 80);
}

function sanitizeKeywords(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const unique: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const word = item.replace(/\s+/g, "").trim().slice(0, 12);
    if (word.length < 1 || unique.includes(word)) continue;
    unique.push(word);
    if (unique.length >= 5) break;
  }
  return unique;
}
