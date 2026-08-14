import { supabase } from "@/lib/supabase";

export type CapsuleImage = {
  public_url: string;
  sort_order: number;
};

export type Capsule = {
  id: string;
  creator_uid: string;
  recipient: string;
  letter: string;
  open_at: string;
  created_at: string;
  capsule_images: CapsuleImage[];
};

export type CapsuleListItem = Pick<
  Capsule,
  "id" | "creator_uid" | "recipient" | "open_at" | "created_at"
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

export async function fetchCapsules(): Promise<CapsuleListItem[]> {
  const { data, error } = await supabase
    .from("capsules")
    .select(CAPSULE_SELECT)
    .order("open_at", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((capsule) => toListItem(capsule as Capsule));
}

export async function fetchCapsuleById(id: string): Promise<Capsule | null> {
  const { data, error } = await supabase
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
