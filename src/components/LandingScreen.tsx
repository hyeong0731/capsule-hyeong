"use client";

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
  { form: "sun", primary: "#F6C453", secondary: "#FFF4D6", accent: "#E8892F" },
  { form: "rain", primary: "#4F7EA8", secondary: "#D4E7F5", accent: "#1F4E79" },
  { form: "breeze", primary: "#6DB39A", secondary: "#E5F6EE", accent: "#2F7A62" },
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
    <div className="min-h-full bg-gradient-to-b from-slate-100 via-sky-50 to-teal-50/50 px-6 py-10">
      <div className="mx-auto w-full max-w-xl space-y-5">
        <LiveWeather />

        <section className="overflow-hidden rounded-3xl border border-white/70 bg-white/75 px-6 py-8 text-center shadow-[0_24px_60px_-28px_rgba(30,58,95,0.35)] backdrop-blur-sm sm:px-8">
          <p className="text-sm font-medium tracking-wide text-slate-500">
            캡슐 미
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-800 sm:text-4xl">
            오늘의 마음을 묻어요
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            사진과 편지를 담고, 열람일에 함께 열어요.
          </p>

          <div className="mt-6 flex items-end justify-center">
            {BURIED_LOOKS.map((look, index) => (
              <div
                key={look.form}
                className={`-mx-3 ${index === 1 ? "z-10" : "opacity-80"}`}
                style={{
                  transform:
                    index === 1
                      ? "translateY(0) scale(1)"
                      : "translateY(14px) scale(0.82)",
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

          <div className="mt-5">
            {!countReady ? (
              <div className="mx-auto h-16 w-40 animate-pulse rounded-2xl bg-slate-200/70" />
            ) : count === 0 ? (
              <p className="text-sm text-slate-500">
                아직 묻힌 캡슐이 없어요. 첫 캡슐을 묻어보세요.
              </p>
            ) : count != null ? (
              <>
                <p className="text-xs font-medium tracking-wide text-slate-400">
                  지금까지 묻힌 캡슐
                </p>
                <p className="mt-1 text-4xl font-semibold tabular-nums tracking-tight text-slate-800">
                  {count.toLocaleString("ko-KR")}
                  <span className="ml-1 text-base font-medium text-slate-500">
                    개
                  </span>
                </p>
              </>
            ) : null}
          </div>
        </section>

        <main className="rounded-3xl border border-white/70 bg-white/75 px-6 py-8 shadow-[0_24px_60px_-28px_rgba(30,58,95,0.35)] backdrop-blur-sm sm:px-8">
          <h2 className="mb-6 text-2xl font-semibold tracking-tight text-slate-800">
            캡슐 묻기
          </h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <label className="flex flex-col gap-2 text-left">
              <span className="text-sm font-medium text-slate-700">
                받는 사람
              </span>
              <input
                type="text"
                value={recipient}
                onChange={(event) => setRecipient(event.target.value)}
                disabled={locked}
                placeholder="미래의 나, 또는 누군가"
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 disabled:opacity-50"
              />
            </label>

            <label className="flex flex-col gap-2 text-left">
              <span className="text-sm font-medium text-slate-700">편지</span>
              <textarea
                value={letter}
                onChange={(event) => setLetter(event.target.value)}
                disabled={locked}
                rows={5}
                placeholder="오늘의 하늘과 마음을 담아…"
                className="resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 disabled:opacity-50"
              />
            </label>

            <p className="rounded-2xl bg-sky-50/80 px-4 py-3 text-sm leading-relaxed text-slate-600">
              묻는 순간의 날씨로 그날의 한마디, 키워드, 그리고 색과 형태가 다른
              캡슐이 만들어집니다.
            </p>

            <label className="flex flex-col gap-2 text-left">
              <span className="text-sm font-medium text-slate-700">열람일</span>
              <input
                type="datetime-local"
                value={openAt}
                onChange={(event) => setOpenAt(event.target.value)}
                disabled={locked}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 disabled:opacity-50"
              />
            </label>

            <label className="flex flex-col gap-2 text-left">
              <span className="text-sm font-medium text-slate-700">사진</span>
              <input
                type="file"
                accept="image/*"
                multiple
                disabled={locked}
                onChange={(event) => {
                  const selected = event.target.files;
                  setFiles(selected ? Array.from(selected) : []);
                }}
                className="text-sm text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200 disabled:opacity-50"
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
                    className="h-20 w-20 rounded-2xl object-cover ring-1 ring-slate-200"
                  />
                ))}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={locked}
              className="mt-1 inline-flex items-center justify-center gap-2 rounded-full bg-slate-800 px-8 py-3.5 text-sm font-medium tracking-wide text-slate-50 transition hover:bg-slate-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy
                ? "이어서 묻는 중…"
                : !ready
                  ? "불러오는 중…"
                  : "캡슐 묻기"}
            </button>

            <p className="text-center text-xs leading-relaxed text-slate-400">
              묻는 순간 Google 계정으로 이어집니다.
            </p>

            {error ? (
              <p className="text-center text-sm text-rose-600" role="alert">
                {error}
              </p>
            ) : null}
          </form>
        </main>
      </div>
    </div>
  );
}
