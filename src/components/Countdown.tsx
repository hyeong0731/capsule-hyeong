"use client";

import { useEffect, useState } from "react";
import { getCountdownParts } from "@/lib/capsules";

type CountdownProps = {
  openAt: string;
  compact?: boolean;
};

export default function Countdown({ openAt, compact = false }: CountdownProps) {
  const [parts, setParts] = useState(() => getCountdownParts(openAt));

  useEffect(() => {
    const id = setInterval(() => {
      setParts(getCountdownParts(openAt));
    }, 1000);
    return () => clearInterval(id);
  }, [openAt]);

  if (parts.isOpen) {
    return (
      <span className="inline-flex items-center rounded-full border border-[var(--gold)]/30 bg-[var(--gold)]/15 px-2.5 py-1 text-xs font-medium text-[var(--gold-soft)]">
        열람 가능
      </span>
    );
  }

  if (compact) {
    const label =
      parts.days > 0
        ? `${parts.days}일 ${parts.hours}시간`
        : `${parts.hours}:${String(parts.minutes).padStart(2, "0")}:${String(parts.seconds).padStart(2, "0")}`;
    return (
      <span className="inline-flex items-center rounded-full border border-[var(--line)] bg-[var(--panel)] px-2.5 py-1 text-xs font-medium text-[var(--paper)] backdrop-blur-sm">
        D-{parts.days > 0 ? parts.days : "day"} · {label}
      </span>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-2 text-center">
      {[
        { value: parts.days, label: "일" },
        { value: parts.hours, label: "시" },
        { value: parts.minutes, label: "분" },
        { value: parts.seconds, label: "초" },
      ].map((item) => (
        <div
          key={item.label}
          className="rounded-xl border border-[var(--line)] bg-[var(--wash)] px-2 py-3"
        >
          <p className="font-serif text-xl font-semibold tabular-nums text-[var(--gold-soft)]">
            {String(item.value).padStart(2, "0")}
          </p>
          <p className="text-[10px] tracking-wide text-[var(--faint)]">
            {item.label}
          </p>
        </div>
      ))}
    </div>
  );
}
