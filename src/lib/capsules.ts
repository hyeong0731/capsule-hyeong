import { getSupabase } from "@/lib/supabase";
import type { CapsuleForm } from "@/lib/capsule-mood";

export type CapsuleImage = {
  public_url: string;
  sort_order: number;
};

export type CapsuleWeather = {
  weather_condition: string | null;
  weather_temp: number | string | null;
  weather_humidity: number | string | null;
};

export type CapsuleMoodFields = {
  mood_line: string | null;
  keywords: string[] | null;
  capsule_form: CapsuleForm | string | null;
  capsule_primary: string | null;
  capsule_secondary: string | null;
  capsule_accent: string | null;
};

export type Capsule = {
  id: string;
  creator_uid: string;
  recipient: string;
  letter: string;
  open_at: string;
  created_at: string;
  capsule_images: CapsuleImage[];
} & CapsuleWeather &
  CapsuleMoodFields;

export type CapsuleListItem = Pick<
  Capsule,
  | "id"
  | "creator_uid"
  | "recipient"
  | "open_at"
  | "created_at"
  | "weather_condition"
  | "weather_temp"
  | "weather_humidity"
  | "mood_line"
  | "keywords"
  | "capsule_form"
  | "capsule_primary"
  | "capsule_secondary"
  | "capsule_accent"
> & {
  thumbnail: string | null;
  imageCount: number;
};

const CAPSULE_SELECT = `
  id,
  creator_uid,
  recipient,
  letter,
  open_at,
  created_at,
  weather_condition,
  weather_temp,
  weather_humidity,
  mood_line,
  keywords,
  capsule_form,
  capsule_primary,
  capsule_secondary,
  capsule_accent,
  capsule_images (public_url, sort_order)
`;

function mapCapsuleImages(images: CapsuleImage[] | null | undefined) {
  return [...(images ?? [])].sort((a, b) => a.sort_order - b.sort_order);
}

function toListItem(capsule: Omit<Capsule, "letter"> & { letter?: string }): CapsuleListItem {
  const images = mapCapsuleImages(capsule.capsule_images);
  return {
    id: capsule.id,
    creator_uid: capsule.creator_uid,
    recipient: capsule.recipient,
    open_at: capsule.open_at,
    created_at: capsule.created_at,
    thumbnail: images[0]?.public_url ?? null,
    imageCount: images.length,
    weather_condition: capsule.weather_condition ?? null,
    weather_temp: capsule.weather_temp ?? null,
    weather_humidity: capsule.weather_humidity ?? null,
    mood_line: capsule.mood_line ?? null,
    keywords: capsule.keywords ?? [],
    capsule_form: capsule.capsule_form ?? null,
    capsule_primary: capsule.capsule_primary ?? null,
    capsule_secondary: capsule.capsule_secondary ?? null,
    capsule_accent: capsule.capsule_accent ?? null,
  };
}

export function isCapsuleOpen(openAt: string, now = Date.now()): boolean {
  return new Date(openAt).getTime() <= now;
}

export function formatOpenAt(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", {
    dateStyle: "long",
    timeStyle: "short",
  });
}

export function getCountdownParts(
  openAt: string,
  now = Date.now(),
): { isOpen: boolean; days: number; hours: number; minutes: number; seconds: number } {
  const diff = new Date(openAt).getTime() - now;
  if (diff <= 0) {
    return { isOpen: true, days: 0, hours: 0, minutes: 0, seconds: 0 };
  }
  const seconds = Math.floor(diff / 1000);
  return {
    isOpen: false,
    days: Math.floor(seconds / 86400),
    hours: Math.floor((seconds % 86400) / 3600),
    minutes: Math.floor((seconds % 3600) / 60),
    seconds: seconds % 60,
  };
}

export async function fetchCapsuleCount(): Promise<number> {
  const { count, error } = await getSupabase()
    .from("capsules")
    .select("id", { count: "exact", head: true });

  if (error) throw error;
  return count ?? 0;
}

export async function fetchMyCapsules(uid: string): Promise<CapsuleListItem[]> {
  const { data, error } = await getSupabase()
    .from("capsules")
    .select(CAPSULE_SELECT)
    .eq("creator_uid", uid)
    .order("open_at", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((capsule) => toListItem(capsule as Capsule));
}

export async function fetchCapsuleById(id: string): Promise<Capsule | null> {
  const { data, error } = await getSupabase()
    .from("capsules")
    .select(CAPSULE_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const capsule = data as Capsule;
  return {
    ...capsule,
    capsule_images: mapCapsuleImages(capsule.capsule_images),
  };
}
