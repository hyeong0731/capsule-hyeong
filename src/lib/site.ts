export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://capsule-hyeong.vercel.app";

export const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ??
  process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ??
  "";

export const SITE = {
  url: SITE_URL,
  name: "캡슐 미",
  nameEn: "Capsule Me",
  tagline: "오늘의 마음을 묻어요",
  description:
    "하늘과 편지를 한 단지에 담고, 열람일에 다시 만나요. 묻는 순간의 날씨로 그날의 한마디와 캡슐이 만들어집니다.",
  shortDescription: "묻힌 캡슐을 확인하고, 열람일에 함께 열어요.",
  locale: "ko_KR",
  language: "ko",
  keywords: [
    "캡슐 미",
    "Capsule Me",
    "타임캡슐",
    "편지",
    "날씨 캡슐",
    "추억",
    "열람일",
    "디지털 타임캡슐",
  ],
} as const;

export function absoluteUrl(path = "/"): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return new URL(normalized, SITE.url).toString();
}

export const openGraphBase = {
  type: "website" as const,
  locale: SITE.locale,
  siteName: SITE.name,
};

