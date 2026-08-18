"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { useAuth } from "@/lib/useAuth";
import {
  fetchWeatherSnapshot,
  formatHumidity,
  formatTemperature,
  readDeviceLocation,
  type WeatherSnapshot,
} from "@/lib/weather";
import { trackBuryCapsule } from "@/lib/analytics";
import { consumeCapsuleDraft } from "@/lib/capsule-draft";
import { fetchCapsuleMood, FORM_LABEL, type CapsuleMood } from "@/lib/capsule-mood";
import WeatherCapsule from "@/components/WeatherCapsule";
import KeywordChips from "@/components/KeywordChips";
import AppCanvas from "@/components/AppCanvas";

const BUCKET = "capsule-hyeong";

type CapsuleResult = {
  id: string;
  recipient: string;
  openAt: string;
  imageUrls: string[];
  weather: WeatherSnapshot | null;
  mood: CapsuleMood | null;
};

function extensionFromFile(file: File): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/heic": "heic",
    "image/heif": "heif",
  };
  return map[file.type] ?? "jpg";
}

function formatOpenAt(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", {
    dateStyle: "long",
    timeStyle: "short",
  });
}

export default function NewCapsulePage() {
  const { user, ready } = useAuth();
  const [recipient, setRecipient] = useState("");
  const [letter, setLetter] = useState("");
  const [openAt, setOpenAt] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<CapsuleResult | null>(null);

  const previewUrls = useMemo(
    () => files.map((file) => URL.createObjectURL(file)),
    [files],
  );

  useEffect(() => {
    const draft = consumeCapsuleDraft();
    if (!draft) return;
    if (draft.recipient) setRecipient(draft.recipient);
    if (draft.letter) setLetter(draft.letter);
    if (draft.openAt) setOpenAt(draft.openAt);
  }, []);

  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  function handleFilesChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files;
    if (!selected) return;
    setFiles(Array.from(selected));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) {
      alert("로그인 먼저!");
      return;
    }

    setSubmitting(true);
    setResult(null);

    try {
      const timestamp = Date.now();
      const uploaded: { path: string; publicUrl: string }[] = [];
      const weatherPromise = readDeviceLocation()
        .then((location) => fetchWeatherSnapshot(location.lat, location.lon))
        .catch(() => null);
      const moodPromise = weatherPromise.then((weather) =>
        fetchCapsuleMood({ weather, letter, recipient }),
      );

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = extensionFromFile(file);
        const path = `${user.uid}/${timestamp}-${i}.${ext}`;

        const { error: uploadError } = await getSupabase().storage
          .from(BUCKET)
          .upload(path, file, { contentType: file.type, upsert: false });

        if (uploadError) throw uploadError;

        const { data: urlData } = getSupabase().storage
          .from(BUCKET)
          .getPublicUrl(path);

        uploaded.push({ path, publicUrl: urlData.publicUrl });
      }

      const openAtIso = new Date(openAt).toISOString();
      const [weather, mood] = await Promise.all([weatherPromise, moodPromise]);

      const { data: capsule, error: capsuleError } = await getSupabase()
        .from("capsules")
        .insert({
          creator_uid: user.uid,
          recipient,
          letter,
          open_at: openAtIso,
          weather_condition: weather?.condition ?? null,
          weather_temp: weather?.temperature ?? null,
          weather_humidity: weather?.humidity ?? null,
          mood_line: mood.oneLiner,
          keywords: mood.keywords,
          capsule_form: mood.form,
          capsule_primary: mood.primary,
          capsule_secondary: mood.secondary,
          capsule_accent: mood.accent,
        })
        .select("id")
        .single();

      if (capsuleError) throw capsuleError;

      if (uploaded.length > 0) {
        const { error: imagesError } = await getSupabase()
          .from("capsule_images")
          .insert(
            uploaded.map((item, index) => ({
              capsule_id: capsule.id,
              storage_path: item.path,
              public_url: item.publicUrl,
              sort_order: index,
            })),
          );

        if (imagesError) throw imagesError;
      }

      trackBuryCapsule(capsule.id);
      setResult({
        id: capsule.id,
        recipient,
        openAt: openAtIso,
        imageUrls: uploaded.map((item) => item.publicUrl),
        weather,
        mood,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "업로드에 실패했습니다.";
      alert(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppCanvas className="px-6 py-12">
      <main className="mx-auto w-full max-w-lg">
        <Link href="/" className="btn-ghost mb-6 inline-block">
          ← 홈으로
        </Link>

        <div className="panel rounded-[2rem] px-8 py-10">
          {result ? (
            <ResultView result={result} />
          ) : (
            <>
              <h1 className="mb-8 text-3xl font-semibold tracking-tight text-[var(--paper)]">
                캡슐 묻기
              </h1>

              {!ready ? (
                <p className="text-sm text-[var(--faint)]">불러오는 중…</p>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                  <label className="flex flex-col gap-2 text-left">
                    <span className="text-sm font-medium text-[var(--ink-soft)]">
                      받는 사람
                    </span>
                    <input
                      type="text"
                      value={recipient}
                      onChange={(e) => setRecipient(e.target.value)}
                      required
                      disabled={submitting}
                      placeholder="이름"
                      className="field"
                    />
                  </label>

                  <label className="flex flex-col gap-2 text-left">
                    <span className="text-sm font-medium text-[var(--ink-soft)]">
                      편지
                    </span>
                    <textarea
                      value={letter}
                      onChange={(e) => setLetter(e.target.value)}
                      required
                      disabled={submitting}
                      rows={6}
                      placeholder="미래의 그 사람에게…"
                      className="field resize-y"
                    />
                  </label>

                  <p className="rounded-2xl border border-[var(--line)] bg-[var(--wash)] px-4 py-3 text-sm leading-relaxed text-[var(--muted)]">
                    캡슐을 묻는 순간의 날씨로 그날의 한마디, 키워드,
                    그리고 색과 형태가 다른 캡슐이 만들어집니다.
                  </p>

                  <label className="flex flex-col gap-2 text-left">
                    <span className="text-sm font-medium text-[var(--ink-soft)]">
                      열람일
                    </span>
                    <input
                      type="datetime-local"
                      value={openAt}
                      onChange={(e) => setOpenAt(e.target.value)}
                      required
                      disabled={submitting}
                      className="field"
                    />
                  </label>

                  <label className="flex flex-col gap-2 text-left">
                    <span className="text-sm font-medium text-[var(--ink-soft)]">
                      사진
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      disabled={submitting}
                      onChange={handleFilesChange}
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
                          className="h-20 w-20 rounded-2xl object-cover ring-1 ring-[var(--line)]"
                        />
                      ))}
                    </div>
                  ) : null}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-primary mt-2"
                  >
                    {submitting ? (
                      <>
                        <Spinner />
                        날씨를 읽고 캡슐을 빚는 중
                      </>
                    ) : (
                      "캡슐 묻기"
                    )}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </main>
    </AppCanvas>
  );
}

function ResultView({ result }: { result: CapsuleResult }) {
  const mood = result.mood;

  return (
    <div className="text-center">
      {mood ? (
        <div
          className="mb-6 rounded-[1.6rem] border border-[var(--line)] px-4 pb-5 pt-6"
          style={{
            background: `radial-gradient(ellipse at 50% 0%, ${mood.primary}33, transparent 62%), rgba(255,251,245,0.86)`,
          }}
        >
          <WeatherCapsule
            form={mood.form}
            primary={mood.primary}
            secondary={mood.secondary}
            accent={mood.accent}
            size="hero"
          />
          <p className="kicker mt-3 normal-case tracking-[0.16em]">
            {FORM_LABEL[mood.form]}
          </p>
        </div>
      ) : (
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-[var(--gold)]/30 bg-[var(--gold)]/12 text-[var(--gold-soft)]">
          ✓
        </div>
      )}
      <h1 className="mb-2 text-3xl font-semibold tracking-tight text-[var(--paper)]">
        캡슐을 묻었어요
      </h1>
      <p className="mb-6 text-sm text-[var(--muted)]">
        {result.recipient}님에게 전달될 캡슐이 저장됐습니다.
      </p>

      {mood?.oneLiner ? (
        <p className="mb-4 font-serif text-lg font-medium leading-relaxed text-[var(--paper)]">
          “{mood.oneLiner}”
        </p>
      ) : null}
      <KeywordChips
        className="mb-8"
        keywords={mood?.keywords}
        accent={mood?.accent}
      />
      <dl className="mb-8 space-y-3 rounded-2xl border border-[var(--line)] bg-[var(--wash)] px-5 py-4 text-left text-sm">
        <div>
          <dt className="text-[var(--faint)]">캡슐 번호</dt>
          <dd className="mt-0.5 break-all font-mono text-[var(--ink-soft)]">
            {result.id}
          </dd>
        </div>
        <div>
          <dt className="text-[var(--faint)]">열람일</dt>
          <dd className="mt-0.5 text-[var(--ink-soft)]">
            {formatOpenAt(result.openAt)}
          </dd>
        </div>
        <div>
          <dt className="text-[var(--faint)]">사진</dt>
          <dd className="mt-0.5 text-[var(--ink-soft)]">{result.imageUrls.length}장</dd>
        </div>
        {result.weather ? (
          <div>
            <dt className="text-[var(--faint)]">묻은 날의 날씨</dt>
            <dd className="mt-0.5 text-[var(--ink-soft)]">
              {result.weather.condition}
              {formatTemperature(result.weather.temperature)
                ? ` · ${formatTemperature(result.weather.temperature)}`
                : ""}
              {formatHumidity(result.weather.humidity)
                ? ` · 습도 ${formatHumidity(result.weather.humidity)}`
                : ""}
            </dd>
          </div>
        ) : null}
      </dl>

      {result.imageUrls.length > 0 ? (
        <div className="mb-8 flex flex-wrap justify-center gap-3">
          {result.imageUrls.map((url) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={url}
              src={url}
              alt=""
              className="h-20 w-20 rounded-2xl object-cover ring-1 ring-[var(--line)]"
            />
          ))}
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        <Link href={`/capsule/${result.id}`} className="btn-primary">
          캡슐 보기
        </Link>
        <Link href="/" className="btn-ghost">
          홈으로
        </Link>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
