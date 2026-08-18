"use client";

import CapsuleCard from "@/components/CapsuleCard";
import LandingScreen from "@/components/LandingScreen";
import LiveWeather from "@/components/LiveWeather";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { signInWithGoogle, signOut } from "@/lib/auth";
import { peekCapsuleDraft } from "@/lib/capsule-draft";
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
        busy={busy}
        ready={ready}
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
  const router = useRouter();
  const [continuingDraft] = useState(() => Boolean(peekCapsuleDraft()));
  const [capsules, setCapsules] = useState<CapsuleListItem[]>([]);
  const [loadingCapsules, setLoadingCapsules] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (continuingDraft) router.replace("/new");
  }, [continuingDraft, router]);

  useEffect(() => {
    if (continuingDraft) return;
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
  }, [continuingDraft, user.uid]);

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

  if (continuingDraft) {
    return (
      <div className="flex min-h-full items-center justify-center bg-gradient-to-b from-slate-100 via-sky-50 to-teal-50/50 px-6">
        <p className="text-sm text-slate-500">작성하던 캡슐으로 이어가는 중…</p>
      </div>
    );
  }

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
        <LiveWeather className="mb-8" />

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
      const host =
        typeof window !== "undefined" ? window.location.hostname : "";
      return host
        ? `이 도메인(${host})은 Firebase 인증에 허용되지 않았습니다.`
        : "이 도메인은 Firebase 인증에 허용되지 않았습니다.";
    }
  }
  return err instanceof Error ? err.message : "로그인에 실패했습니다.";
}
