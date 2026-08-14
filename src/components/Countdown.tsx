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
      <span className="inline-flex items-center rounded-full bg-teal-100 px-2.5 py-1 text-xs font-medium text-teal-700">
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
      <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
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
          className="rounded-xl bg-slate-800 px-2 py-3 text-slate-50"
        >
          <p className="text-xl font-semibold tabular-nums">
            {String(item.value).padStart(2, "0")}
          </p>
          <p className="text-[10px] uppercase tracking-wide text-slate-400">
            {item.label}
          </p>
        </div>
      ))}
    </div>
  );
}
