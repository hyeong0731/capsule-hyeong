"use client";

import { sendGAEvent } from "@next/third-parties/google";

type EventParams = Record<string, string | number | boolean | undefined>;

export function trackEvent(name: string, params: EventParams = {}) {
  const payload = Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined),
  );
  sendGAEvent("event", name, payload);
}

export function trackLogin(method = "Google") {
  trackEvent("login", { method });
}

export function trackLogout() {
  trackEvent("logout");
}

export function trackBuryCapsule(capsuleId: string) {
  trackEvent("bury_capsule", {
    item_id: capsuleId,
  });
}

export function trackViewCapsule(capsuleId: string, locked: boolean) {
  trackEvent("view_capsule", {
    item_id: capsuleId,
    locked,
  });
}
