"use client";

import AppCanvas from "@/components/AppCanvas";
import LiveWeather from "@/components/LiveWeather";
import WeatherCapsule from "@/components/WeatherCapsule";
import { saveCapsuleDraft } from "@/lib/capsule-draft";
import { fetchCapsuleCount } from "@/lib/capsules";
import { useEffect, useMemo, useState, type FormEvent } from "react";

type LandingScreenProps = {
  busy: boolean;
  ready: boolean;
  error?: string | null;
  onSignIn: () => void;
};

const BURIED_LOOKS = [
  { form: "sun", primary: "#C9A36A", secondary: "#3A2E1C", accent: "#E4D2AE" },
  { form: "rain", primary: "#6A8AAA", secondary: "#1C2832", accent: "#B7C9D8" },
  { form: "breeze", primary: "#7A9A86", secondary: "#1C2822", accent: "#C5D8CC" },
] as const;

export default function LandingScreen({
  busy,
  ready,
  error,
  onSignIn,
}: LandingScreenProps) {
  const [count, setCount] = useState<number | null>(null);
  const [countReady, setCountReady] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [letter, setLetter] = useState("");
  const [openAt, setOpenAt] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const locked = busy || !ready;

  const previewUrls = useMemo(
    () => files.map((file) => URL.createObjectURL(file)),
    [files],
  );

  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  useEffect(() => {
    let cancelled = false;
    fetchCapsuleCount()
      .then((value) => {
        if (!cancelled) setCount(value);
      })
      .catch(() => {
        if (!cancelled) setCount(null);
      })
      .finally(() => {
        if (!cancelled) setCountReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked) return;
    saveCapsuleDraft({ recipient, letter, openAt });
    onSignIn();
  }

  return (
    <AppCanvas className="px-6 py-10">
      <div className="mx-auto w-full max-w-xl space-y-5">
        <LiveWeather />

        <section className="panel overflow-hidden rounded-[2rem] px-6 py-9 text-center sm:px-8">
          <p className="kicker">Capsule Me</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[var(--paper)] sm:text-5xl">
            오늘의 마음을 묻어요
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-[var(--muted)]">
            하늘과 편지를 한 단지에 담고, 열람일에 다시 만나요.
          </p>

          <div className="mt-8 flex items-end justify-center">
            {BURIED_LOOKS.map((look, index) => (
              <div
                key={look.form}
                className={`-mx-3 ${index === 1 ? "z-10" : "opacity-70"}`}
                style={{
                  transform:
                    index === 1
                      ? "translateY(0) scale(1)"
                      : "translateY(16px) scale(0.8)",
                }}
              >
                <WeatherCapsule
                  form={look.form}
                  primary={look.primary}
                  secondary={look.secondary}
                  accent={look.accent}
                  size="card"
                />
              </div>
            ))}
          </div>

          <div className="mt-6">
            {!countReady ? (
              <div className="mx-auto h-14 w-36 animate-pulse rounded-2xl bg-white/5" />
            ) : count === 0 ? (
              <p className="text-sm text-[var(--muted)]">
                아직 묻힌 캡슐이 없어요. 첫 캡슐을 묻어보세요.
              </p>
            ) : count != null ? (
              <>
                <p className="kicker">지금까지 묻힌 캡슐</p>
                <p className="mt-2 font-serif text-5xl font-semibold tabular-nums tracking-tight text-[var(--gold-soft)]">
                  {count.toLocaleString("ko-KR")}
                  <span className="ml-1 font-sans text-base font-medium text-[var(--muted)]">
                    개
                  </span>
                </p>
              </>
            ) : null}
          </div>
        </section>

        <main className="panel rounded-[2rem] px-6 py-8 sm:px-8">
          <h2 className="mb-6 text-2xl font-semibold tracking-tight text-[var(--paper)]">
            캡슐 묻기
          </h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <label className="flex flex-col gap-2 text-left">
              <span className="text-sm font-medium text-[var(--ink-soft)]">
                받는 사람
              </span>
              <input
                type="text"
                value={recipient}
                onChange={(event) => setRecipient(event.target.value)}
                disabled={locked}
                placeholder="미래의 나, 또는 누군가"
                className="field"
              />
            </label>

            <label className="flex flex-col gap-2 text-left">
              <span className="text-sm font-medium text-[var(--ink-soft)]">편지</span>
              <textarea
                value={letter}
                onChange={(event) => setLetter(event.target.value)}
                disabled={locked}
                rows={5}
                placeholder="오늘의 하늘과 마음을 담아…"
                className="field resize-y"
              />
            </label>

            <p className="rounded-2xl border border-[var(--line)] bg-black/20 px-4 py-3 text-sm leading-relaxed text-[var(--muted)]">
              묻는 순간의 날씨로 그날의 한마디, 키워드, 그리고 색과 형태가 다른
              캡슐이 만들어집니다.
            </p>

            <label className="flex flex-col gap-2 text-left">
              <span className="text-sm font-medium text-[var(--ink-soft)]">열람일</span>
              <input
                type="datetime-local"
                value={openAt}
                onChange={(event) => setOpenAt(event.target.value)}
                disabled={locked}
                className="field"
              />
            </label>

            <label className="flex flex-col gap-2 text-left">
              <span className="text-sm font-medium text-[var(--ink-soft)]">사진</span>
              <input
                type="file"
                accept="image/*"
                multiple
                disabled={locked}
                onChange={(event) => {
                  const selected = event.target.files;
                  setFiles(selected ? Array.from(selected) : []);
                }}
                className="field-file disabled:opacity-50"
              />
            </label>

            {previewUrls.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {previewUrls.map((url, index) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={url}
                    src={url}
                    alt={`미리보기 ${index + 1}`}
                    className="h-20 w-20 rounded-2xl object-cover ring-1 ring-white/10"
                  />
                ))}
              </div>
            ) : null}

            <button type="submit" disabled={locked} className="btn-primary mt-1">
              {busy
                ? "이어서 묻는 중…"
                : !ready
                  ? "불러오는 중…"
                  : "캡슐 묻기"}
            </button>

            <p className="text-center text-xs leading-relaxed text-[var(--faint)]">
              묻는 순간 Google 계정으로 이어집니다.
            </p>

            {error ? (
              <p className="text-center text-sm text-[var(--danger)]" role="alert">
                {error}
              </p>
            ) : null}
          </form>
        </main>
      </div>
    </AppCanvas>
  );
}
