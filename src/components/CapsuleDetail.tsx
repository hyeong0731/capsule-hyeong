"use client";

import Countdown from "@/components/Countdown";
import WeatherMemory from "@/components/WeatherMemory";
import WeatherCapsule from "@/components/WeatherCapsule";
import KeywordChips from "@/components/KeywordChips";
import AppCanvas from "@/components/AppCanvas";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  fetchCapsuleById,
  formatOpenAt,
  isCapsuleOpen,
  type Capsule,
} from "@/lib/capsules";
import { FORM_LABEL, hasCapsuleLook, isCapsuleForm } from "@/lib/capsule-mood";

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
          <div className="mb-4 h-10 w-10 animate-pulse rounded-full bg-white/10" />
          <p className="text-sm text-[var(--faint)]">캡슐을 여는 중…</p>
        </div>
      </PageShell>
    );
  }

  if (error || !capsule) {
    return (
      <PageShell>
        <div className="py-8 text-center">
          <p className="kicker mb-3">Missing</p>
          <p className="mb-6 text-[var(--ink-soft)]">
            {error ?? "캡슐을 찾을 수 없습니다."}
          </p>
          <Link href="/" className="btn-ghost">
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
        className="btn-ghost mb-6 inline-flex items-center gap-1"
      >
        ← 대시보드
      </Link>

      <header className="mb-8 text-center">
        <p className="kicker mb-3">To.</p>
        <h1 className="text-4xl font-semibold tracking-tight text-[var(--paper)]">
          {capsule.recipient}
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {formatOpenAt(capsule.open_at)}에 열립니다
        </p>
      </header>

      <WeatherMemory
        className="mb-8"
        condition={capsule.weather_condition}
        temperature={capsule.weather_temp}
        humidity={capsule.weather_humidity}
      />

      <CapsuleIdentity capsule={capsule} />

      {canView ? (
        <OpenedContent capsule={capsule} isDevPreview={devPreview && !opened} />
      ) : (
        <LockedContent
          capsule={capsule}
          onDevPreview={() => setDevPreview(true)}
        />
      )}

      <footer className="mt-10 border-t border-[var(--line)] pt-6">
        <p className="kicker text-center">캡슐 번호</p>
        <p className="mt-2 break-all text-center font-mono text-xs text-[var(--faint)]">
          {capsule.id}
        </p>
      </footer>
    </PageShell>
  );
}

function CapsuleIdentity({ capsule }: { capsule: Capsule }) {
  const custom = hasCapsuleLook({
    form: capsule.capsule_form,
    primary: capsule.capsule_primary,
  });
  if (!custom && !capsule.mood_line && !(capsule.keywords && capsule.keywords.length)) {
    return null;
  }

  const formLabel =
    capsule.capsule_form && isCapsuleForm(capsule.capsule_form)
      ? FORM_LABEL[capsule.capsule_form]
      : null;

  return (
    <div
      className="mb-8 overflow-hidden rounded-[1.8rem] border border-[var(--line)] px-5 pb-5 pt-6 text-center"
      style={{
        background: capsule.capsule_primary
          ? `radial-gradient(ellipse at 50% 0%, ${capsule.capsule_primary}2e, transparent 62%), rgba(0,0,0,0.22)`
          : "rgba(0,0,0,0.22)",
      }}
    >
      {custom ? (
        <WeatherCapsule
          form={capsule.capsule_form}
          primary={capsule.capsule_primary}
          secondary={capsule.capsule_secondary}
          accent={capsule.capsule_accent}
        />
      ) : null}
      {formLabel ? (
        <p className="kicker mt-3 normal-case tracking-[0.16em]">{formLabel}</p>
      ) : null}
      {capsule.mood_line ? (
        <p className="mt-3 font-serif text-lg font-medium leading-relaxed text-[var(--paper)]">
          “{capsule.mood_line}”
        </p>
      ) : null}
      <KeywordChips
        className="mt-4"
        keywords={capsule.keywords}
        accent={capsule.capsule_accent}
      />
    </div>
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
      <div className="overflow-hidden rounded-[1.8rem] border border-[var(--line)] bg-black/25 px-6 py-8 text-center">
        <p className="kicker mb-3">Sealed</p>
        <h2 className="font-serif text-2xl font-semibold text-[var(--paper)]">
          아직 열림 기간이 남았어요
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
          편지와 사진은 열람일까지 잠겨 있어요.
          <br />
          키워드만 보고 어떤 날이었는지 떠올려 보세요.
        </p>

        <div className="mt-8">
          <p className="kicker mb-3">열람까지</p>
          <Countdown key={capsule.open_at} openAt={capsule.open_at} />
        </div>
      </div>

      {capsule.capsule_images.length > 0 ? (
        <div className="rounded-2xl border border-[var(--line)] bg-black/20 px-5 py-4">
          <p className="mb-3 text-center text-xs text-[var(--faint)]">
            사진 {capsule.capsule_images.length}장 · 미리보기 잠김
          </p>
          <div className="flex justify-center gap-2">
            {capsule.capsule_images.slice(0, 4).map((image) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={image.public_url}
                src={image.public_url}
                alt=""
                className="h-16 w-16 rounded-xl object-cover opacity-50 blur-sm ring-1 ring-white/10"
              />
            ))}
          </div>
        </div>
      ) : null}

      {IS_DEV ? (
        <button
          type="button"
          onClick={onDevPreview}
          className="mx-auto block text-xs text-[var(--faint)] underline-offset-2 transition hover:text-[var(--muted)] hover:underline"
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
        <p className="rounded-xl border border-dashed border-[var(--line)] bg-black/20 px-4 py-2 text-center text-xs text-[var(--faint)]">
          개발 모드 · 바로보기 미리보기
        </p>
      ) : (
        <div className="flex justify-center">
          <span className="inline-flex items-center rounded-full border border-[var(--gold)]/30 bg-[var(--gold)]/12 px-4 py-1.5 text-sm font-medium text-[var(--gold-soft)]">
            캡슐이 열렸어요
          </span>
        </div>
      )}

      <section>
        <h2 className="kicker mb-3">편지</h2>
        <div className="relative overflow-hidden rounded-2xl border border-[var(--line)] bg-black/20 px-6 py-5">
          <p className="relative whitespace-pre-wrap font-serif text-[15px] leading-[1.9] text-[var(--ink-soft)]">
            {capsule.letter}
          </p>
        </div>
      </section>

      {capsule.capsule_images.length > 0 ? (
        <section>
          <h2 className="kicker mb-3">사진 ({capsule.capsule_images.length})</h2>
          <div className="grid grid-cols-2 gap-2.5">
            {capsule.capsule_images.map((image, index) => (
              <div
                key={image.public_url}
                className={`overflow-hidden rounded-2xl ring-1 ring-white/10 ${
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
    <AppCanvas className="px-6 py-10 sm:py-14">
      <main className="panel mx-auto w-full max-w-lg rounded-[2rem] px-7 py-9 sm:px-9 sm:py-11">
        {children}
      </main>
    </AppCanvas>
  );
}
