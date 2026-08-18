const DRAFT_KEY = "capsule-landing-draft";

export type CapsuleDraft = {
  recipient: string;
  letter: string;
  openAt: string;
};

function canUseStorage() {
  return typeof window !== "undefined";
}

export function saveCapsuleDraft(draft: CapsuleDraft) {
  if (!canUseStorage()) return;
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

export function peekCapsuleDraft(): CapsuleDraft | null {
  if (!canUseStorage()) return null;
  const raw = sessionStorage.getItem(DRAFT_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CapsuleDraft;
    return {
      recipient: typeof parsed.recipient === "string" ? parsed.recipient : "",
      letter: typeof parsed.letter === "string" ? parsed.letter : "",
      openAt: typeof parsed.openAt === "string" ? parsed.openAt : "",
    };
  } catch {
    sessionStorage.removeItem(DRAFT_KEY);
    return null;
  }
}

export function consumeCapsuleDraft(): CapsuleDraft | null {
  const draft = peekCapsuleDraft();
  if (canUseStorage()) sessionStorage.removeItem(DRAFT_KEY);
  return draft;
}
