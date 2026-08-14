"use client";

import CapsuleCard from "@/components/CapsuleCard";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { signInWithGoogle, signOut } from "@/lib/auth";
import {
  fetchMyCapsules,
  isCapsuleOpen,
  type CapsuleListItem,
} from "@/lib/capsules";
import { useAuth } from "@/lib/useAuth";

type Filter = "all" | "locked" | "open";

export default function HomeAuth() {
  const { user, ready } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogleSignIn() {
    setBusy(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(toAuthErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    setBusy(true);
    setError(null);
    try {
      await signOut();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "로그아웃에 실패했습니다.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (!ready || !user) {
    return (
      <LandingScreen
        busy={busy || !ready}
        error={error}
        onSignIn={handleGoogleSignIn}
      />
    );
  }

  return (
    <UserDashboard
      key={user.uid}
      user={user}
      busy={busy}
      onSignOut={handleSignOut}
    />
  );
}

function UserDashboard({
  user,
  busy,
  onSignOut,
}: {
  user: NonNullable<ReturnType<typeof useAuth>["user"]>;
  busy: boolean;
  onSignOut: () => void;
}) {
  const [capsules, setCapsules] = useState<CapsuleListItem[]>([]);
  const [loadingCapsules, setLoadingCapsules] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchMyCapsules(user.uid)
      .then((data) => {
        if (!cancelled) {
          setCapsules(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "캡슐 목록을 불러오지 못했습니다.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingCapsules(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user.uid]);

  const stats = useMemo(() => {
    const locked = capsules.filter((c) => !isCapsuleOpen(c.open_at)).length;
    return {
      total: capsules.length,
      locked,
      open: capsules.length - locked,
    };
  }, [capsules]);

  const filtered = useMemo(() => {
    switch (filter) {
      case "locked":
        return capsules.filter((c) => !isCapsuleOpen(c.open_at));
      case "open":
        return capsules.filter((c) => isCapsuleOpen(c.open_at));
      default:
        return capsules;
    }
  }, [capsules, filter]);

  return (
    <div className="min-h-full bg-gradient-to-b from-slate-100 via-sky-50 to-teal-50/50">
      <header className="border-b border-white/60 bg-white/50 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-800">
              캡슐 미
            </h1>
            <p className="text-sm text-slate-500">내가 묻은 캡슐</p>
          </div>
          <div className="flex items-center gap-3">
            {user.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.photoURL}
                alt=""
                className="h-9 w-9 rounded-full"
                referrerPolicy="no-referrer"
              />
            ) : null}
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-slate-800">
                {user.displayName ?? "사용자"}
              </p>
              <p className="text-xs text-slate-500">{user.email}</p>
            </div>
            <button
              type="button"
              onClick={onSignOut}
              disabled={busy}
              className="text-sm text-slate-500 hover:text-slate-700 disabled:opacity-50"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-8 grid grid-cols-3 gap-3">
          <StatCard label="전체" value={stats.total} />
          <StatCard label="잠금" value={stats.locked} accent="amber" />
          <StatCard label="열림" value={stats.open} accent="teal" />
        </div>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            <FilterButton
              active={filter === "all"}
              onClick={() => setFilter("all")}
            >
              전체
            </FilterButton>
            <FilterButton
              active={filter === "locked"}
              onClick={() => setFilter("locked")}
            >
              잠금
            </FilterButton>
            <FilterButton
              active={filter === "open"}
              onClick={() => setFilter("open")}
            >
              열림
            </FilterButton>
          </div>
          <Link
            href="/new"
            className="inline-flex items-center justify-center rounded-full bg-slate-800 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700"
          >
            + 캡슐 묻기
          </Link>
        </div>

        {loadingCapsules ? (
          <p className="py-16 text-center text-sm text-slate-400">
            캡슐 불러오는 중…
          </p>
        ) : filtered.length === 0 ? (
          <EmptyState
            filter={filter}
            action={
              <Link
                href="/new"
                className="inline-flex rounded-full bg-slate-800 px-6 py-2.5 text-sm font-medium text-white hover:bg-slate-700"
              >
                캡슐 묻으러 가기
              </Link>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((capsule) => (
              <CapsuleCard key={capsule.id} capsule={capsule} isMine />
            ))}
          </div>
        )}

        {error ? (
          <p className="mt-6 text-center text-sm text-rose-600" role="alert">
            {error}
          </p>
        ) : null}
      </main>
    </div>
  );
}

function LandingScreen({
  busy,
  error,
  onSignIn,
}: {
  busy: boolean;
  error?: string | null;
  onSignIn: () => void;
}) {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-gradient-to-b from-slate-100 via-sky-50 to-teal-50/50 px-6 py-16">
      <main className="w-full max-w-md rounded-3xl border border-white/70 bg-white/75 px-8 py-14 text-center shadow-[0_24px_60px_-28px_rgba(30,58,95,0.35)] backdrop-blur-sm">
        <h1 className="mb-5 text-5xl font-semibold tracking-tight text-slate-800 sm:text-6xl">
          캡슐 미
        </h1>
        <p className="mb-10 text-base leading-relaxed text-slate-500 sm:text-lg">
          사진과 편지를 묻고, 열람일에 함께 열어요.
        </p>

        <button
          type="button"
          onClick={onSignIn}
          disabled={busy}
          className="inline-flex w-full items-center justify-center gap-3 rounded-full border border-slate-200 bg-white px-8 py-3.5 text-sm font-medium tracking-wide text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:shadow-md disabled:opacity-50"
        >
          <GoogleIcon />
          {busy ? "로그인 중…" : "Google로 계속하기"}
        </button>

        {error ? (
          <p className="mt-6 text-sm text-rose-600" role="alert">
            {error}
          </p>
        ) : null}
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent = "slate",
}: {
  label: string;
  value: number;
  accent?: "slate" | "amber" | "teal";
}) {
  const colors = {
    slate: "bg-white/80 text-slate-800",
    amber: "bg-amber-50 text-amber-900",
    teal: "bg-teal-50 text-teal-900",
  };

  return (
    <div
      className={`rounded-2xl border border-white/70 px-4 py-4 shadow-sm ${colors[accent]}`}
    >
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
        active
          ? "bg-slate-800 text-white"
          : "bg-white/80 text-slate-600 hover:bg-white"
      }`}
    >
      {children}
    </button>
  );
}

function EmptyState({
  filter,
  action,
}: {
  filter: Filter;
  action: React.ReactNode;
}) {
  const messages: Record<Filter, string> = {
    all: "아직 묻힌 캡슐이 없어요.",
    locked: "잠금 상태인 캡슐이 없어요.",
    open: "열람 가능한 캡슐이 없어요.",
  };

  return (
    <div className="rounded-3xl border border-dashed border-slate-200 bg-white/50 px-8 py-16 text-center">
      <p className="mb-2 text-4xl">🫙</p>
      <p className="mb-6 text-slate-600">{messages[filter]}</p>
      {action}
    </div>
  );
}

function toAuthErrorMessage(err: unknown): string {
  if (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    typeof (err as { code: unknown }).code === "string"
  ) {
    const code = (err as { code: string }).code;
    if (code === "auth/popup-closed-by-user") {
      return "로그인 창이 닫혔습니다. 다시 시도해 주세요.";
    }
    if (code === "auth/popup-blocked") {
      return "팝업이 차단되었습니다. 브라우저에서 팝업을 허용해 주세요.";
    }
    if (code === "auth/unauthorized-domain") {
      return "이 도메인은 Firebase 인증에 허용되지 않았습니다.";
    }
  }
  return err instanceof Error ? err.message : "로그인에 실패했습니다.";
}

function GoogleIcon() {
  return (
    <svg
      aria-hidden
      width="18"
      height="18"
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"
        fill="#EA4335"
      />
    </svg>
  );
}
