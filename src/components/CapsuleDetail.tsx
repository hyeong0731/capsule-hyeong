"use client";

import Countdown from "@/components/Countdown";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  fetchCapsuleById,
  formatOpenAt,
  isCapsuleOpen,
  type Capsule,
} from "@/lib/capsules";

const IS_DEV = process.env.NODE_ENV === "development";

type CapsuleDetailProps = {
  id: string;
};

export default function CapsuleDetail({ id }: CapsuleDetailProps) {
  const [capsule, setCapsule] = useState<Capsule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [opened, setOpened] = useState(false);
  const [devPreview, setDevPreview] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchCapsuleById(id);
        if (cancelled) return;
        if (!data) {
          setError("캡슐을 찾을 수 없습니다.");
          return;
        }
        setCapsule(data);
        setOpened(isCapsuleOpen(data.open_at));
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "불러오기에 실패했습니다.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!capsule) return;
    const timer = setInterval(() => {
      setOpened(isCapsuleOpen(capsule.open_at));
    }, 1000);
    return () => clearInterval(timer);
  }, [capsule]);

  if (loading) {
    return (
      <PageShell>
        <div className="flex flex-col items-center py-12">
          <div className="mb-4 h-10 w-10 animate-pulse rounded-full bg-slate-200" />
          <p className="text-sm text-slate-400">캡슐을 여는 중…</p>
        </div>
      </PageShell>
    );
  }

  if (error || !capsule) {
    return (
      <PageShell>
        <div className="py-8 text-center">
          <p className="mb-2 text-4xl">🫙</p>
          <p className="mb-6 text-slate-600">
            {error ?? "캡슐을 찾을 수 없습니다."}
          </p>
          <Link
            href="/"
            className="text-sm text-slate-500 underline-offset-4 hover:underline"
          >
            ← 대시보드로
          </Link>
        </div>
      </PageShell>
    );
  }

  const canView = opened || devPreview;

  return (
    <PageShell>
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1 text-sm text-slate-400 transition hover:text-slate-600"
      >
        ← 대시보드
      </Link>

      <header className="mb-8 text-center">
        <p className="mb-1 text-xs font-medium uppercase tracking-widest text-slate-400">
          To.
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-800">
          {capsule.recipient}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {formatOpenAt(capsule.open_at)}에 열립니다
        </p>
      </header>

      {canView ? (
        <OpenedContent capsule={capsule} isDevPreview={devPreview && !opened} />
      ) : (
        <LockedContent
          capsule={capsule}
          onDevPreview={() => setDevPreview(true)}
        />
      )}

      <footer className="mt-10 border-t border-slate-100 pt-6">
        <p className="text-center text-[11px] text-slate-400">
          캡슐 번호
        </p>
        <p className="mt-1 break-all text-center font-mono text-xs text-slate-500">
          {capsule.id}
        </p>
      </footer>
    </PageShell>
  );
}

function LockedContent({
  capsule,
  onDevPreview,
}: {
  capsule: Capsule;
  onDevPreview: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-3xl border border-amber-100 bg-gradient-to-b from-amber-50 to-orange-50/60 px-6 py-8 text-center shadow-inner">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100/80 text-3xl">
          🔒
        </div>
        <h2 className="text-lg font-semibold text-amber-950">
          아직 열림 기간이 남았어요
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-amber-900/70">
          열람일이 되기 전까지는 편지와 사진을 열 수 없어요.
          <br />
          아래 카운트다운이 끝나면 확인할 수 있습니다.
        </p>

        <div className="mt-8">
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-amber-800/60">
            열람까지
          </p>
          <Countdown key={capsule.open_at} openAt={capsule.open_at} />
        </div>
      </div>

      {capsule.capsule_images.length > 0 ? (
        <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-5 py-4">
          <p className="mb-3 text-center text-xs text-slate-400">
            사진 {capsule.capsule_images.length}장 · 미리보기 잠김
          </p>
          <div className="flex justify-center gap-2">
            {capsule.capsule_images.slice(0, 4).map((image) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={image.public_url}
                src={image.public_url}
                alt=""
                className="h-16 w-16 rounded-xl object-cover opacity-60 blur-sm ring-1 ring-slate-200"
              />
            ))}
          </div>
        </div>
      ) : null}

      {IS_DEV ? (
        <button
          type="button"
          onClick={onDevPreview}
          className="mx-auto block text-xs text-slate-300 underline-offset-2 transition hover:text-slate-400 hover:underline"
        >
          바로보기
        </button>
      ) : null}
    </div>
  );
}

function OpenedContent({
  capsule,
  isDevPreview,
}: {
  capsule: Capsule;
  isDevPreview: boolean;
}) {
  return (
    <div className="space-y-6">
      {isDevPreview ? (
        <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-2 text-center text-xs text-slate-400">
          개발 모드 · 바로보기 미리보기
        </p>
      ) : (
        <div className="flex justify-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-100 px-4 py-1.5 text-sm font-medium text-teal-800">
            <span className="text-base">✨</span>
            캡슐이 열렸어요
          </span>
        </div>
      )}

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-500">
          <span className="text-base">💌</span> 편지
        </h2>
        <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-gradient-to-br from-white to-slate-50 px-6 py-5 shadow-sm">
          <div className="pointer-events-none absolute -right-4 -top-4 text-6xl opacity-[0.06]">
            ✉️
          </div>
          <p className="relative whitespace-pre-wrap text-sm leading-[1.8] text-slate-700">
            {capsule.letter}
          </p>
        </div>
      </section>

      {capsule.capsule_images.length > 0 ? (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-500">
            <span className="text-base">📷</span> 사진 ({capsule.capsule_images.length})
          </h2>
          <div className="grid grid-cols-2 gap-2.5">
            {capsule.capsule_images.map((image, index) => (
              <div
                key={image.public_url}
                className={`overflow-hidden rounded-2xl ring-1 ring-slate-200 ${
                  index === 0 && capsule.capsule_images.length % 2 !== 0
                    ? "col-span-2 aspect-[2/1]"
                    : "aspect-square"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.public_url}
                  alt={`사진 ${index + 1}`}
                  className="h-full w-full object-cover"
                />
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full bg-gradient-to-b from-slate-100 via-sky-50 to-teal-50/50 px-6 py-10 sm:py-14">
      <main className="mx-auto w-full max-w-lg rounded-3xl border border-white/70 bg-white/80 px-7 py-9 shadow-[0_24px_60px_-28px_rgba(30,58,95,0.35)] backdrop-blur-sm sm:px-9 sm:py-11">
        {children}
      </main>
    </div>
  );
}
