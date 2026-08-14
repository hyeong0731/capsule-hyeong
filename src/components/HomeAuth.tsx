"use client";

import CapsuleCard from "@/components/CapsuleCard";
import Link from "next/link";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useEffect, useMemo, useState } from "react";
import { signInWithGoogle, signOut } from "@/lib/auth";
import {
  fetchCapsules,
  isCapsuleOpen,
  type CapsuleListItem,
} from "@/lib/capsules";
import { auth } from "@/lib/firebase";

type Filter = "all" | "mine" | "locked" | "open";

export default function HomeAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capsules, setCapsules] = useState<CapsuleListItem[]>([]);
  const [loadingCapsules, setLoadingCapsules] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setReady(true);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchCapsules()
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
  }, []);

  const stats = useMemo(() => {
    const locked = capsules.filter((c) => !isCapsuleOpen(c.open_at)).length;
    return {
      total: capsules.length,
      locked,
      open: capsules.length - locked,
      mine: user
        ? capsules.filter((c) => c.creator_uid === user.uid).length
        : 0,
    };
  }, [capsules, user]);

  const filtered = useMemo(() => {
    switch (filter) {
      case "mine":
        return user
          ? capsules.filter((c) => c.creator_uid === user.uid)
          : [];
      case "locked":
        return capsules.filter((c) => !isCapsuleOpen(c.open_at));
      case "open":
        return capsules.filter((c) => isCapsuleOpen(c.open_at));
      default:
        return capsules;
    }
  }, [capsules, filter, user]);

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
      setFilter("all");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "로그아웃에 실패했습니다.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-full bg-gradient-to-b from-slate-100 via-sky-50 to-teal-50/50">
      <header className="border-b border-white/60 bg-white/50 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-800">
              캡슐 미
            </h1>
            <p className="text-sm text-slate-500">
              묻힌 캡슐을 한눈에 확인하세요
            </p>
          </div>

          {ready && user ? (
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
              <button
                type="button"
                onClick={handleSignOut}
                disabled={busy}
                className="text-sm text-slate-500 hover:text-slate-700 disabled:opacity-50"
              >
                로그아웃
              </button>
            </div>
          ) : ready ? (
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-50"
            >
              <GoogleIcon />
              로그인
            </button>
          ) : null}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        {!ready ? (
          <p className="text-center text-sm text-slate-400">불러오는 중…</p>
        ) : (
          <>
            <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label="전체" value={stats.total} />
              <StatCard label="잠금" value={stats.locked} accent="amber" />
              <StatCard label="열림" value={stats.open} accent="teal" />
              <StatCard label="내 캡슐" value={stats.mine} accent="slate" />
            </div>

            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap gap-2">
                <FilterButton
                  active={filter === "all"}
                  onClick={() => setFilter("all")}
                >
                  전체
                </FilterButton>
                {user ? (
                  <FilterButton
                    active={filter === "mine"}
                    onClick={() => setFilter("mine")}
                  >
                    내 캡슐
                  </FilterButton>
                ) : null}
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

              {user ? (
                <Link
                  href="/new"
                  className="inline-flex items-center justify-center rounded-full bg-slate-800 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700"
                >
                  + 캡슐 묻기
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  className="inline-flex items-center justify-center rounded-full bg-slate-800 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700"
                >
                  로그인하고 묻기
                </button>
              )}
            </div>

            {loadingCapsules ? (
              <p className="py-16 text-center text-sm text-slate-400">
                캡슐 불러오는 중…
              </p>
            ) : filtered.length === 0 ? (
              <EmptyState
                filter={filter}
                onSignIn={user ? undefined : handleGoogleSignIn}
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((capsule) => (
                  <CapsuleCard
                    key={capsule.id}
                    capsule={capsule}
                    isMine={user?.uid === capsule.creator_uid}
                  />
                ))}
              </div>
            )}
          </>
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
  onSignIn,
}: {
  filter: Filter;
  onSignIn?: () => void;
}) {
  const messages: Record<Filter, string> = {
    all: "아직 묻힌 캡슐이 없어요.",
    mine: "내가 묻은 캡슐이 없어요.",
    locked: "잠금 상태인 캡슐이 없어요.",
    open: "열람 가능한 캡슐이 없어요.",
  };

  return (
    <div className="rounded-3xl border border-dashed border-slate-200 bg-white/50 px-8 py-16 text-center">
      <p className="mb-2 text-4xl">🫙</p>
      <p className="mb-6 text-slate-600">{messages[filter]}</p>
      {onSignIn ? (
        <button
          type="button"
          onClick={onSignIn}
          className="rounded-full bg-slate-800 px-6 py-2.5 text-sm font-medium text-white hover:bg-slate-700"
        >
          로그인하고 첫 캡슐 묻기
        </button>
      ) : (
        <Link
          href="/new"
          className="inline-flex rounded-full bg-slate-800 px-6 py-2.5 text-sm font-medium text-white hover:bg-slate-700"
        >
          캡슐 묻으러 가기
        </Link>
      )}
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
      width="16"
      height="16"
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
