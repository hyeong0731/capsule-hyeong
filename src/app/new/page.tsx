"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { useAuth } from "@/lib/useAuth";

const BUCKET = "capsule-hyeong";

type CapsuleResult = {
  id: string;
  recipient: string;
  openAt: string;
  imageUrls: string[];
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

      const { data: capsule, error: capsuleError } = await getSupabase()
        .from("capsules")
        .insert({
          creator_uid: user.uid,
          recipient,
          letter,
          open_at: openAtIso,
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

      setResult({
        id: capsule.id,
        recipient,
        openAt: openAtIso,
        imageUrls: uploaded.map((item) => item.publicUrl),
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
    <div className="min-h-full bg-gradient-to-b from-slate-100 via-sky-50 to-teal-50/50 px-6 py-12">
      <main className="mx-auto w-full max-w-lg">
        <Link
          href="/"
          className="mb-6 inline-block text-sm text-slate-500 transition hover:text-slate-700"
        >
          ← 홈으로
        </Link>

        <div className="rounded-3xl border border-white/70 bg-white/75 px-8 py-10 shadow-[0_24px_60px_-28px_rgba(30,58,95,0.35)] backdrop-blur-sm">
          {result ? (
            <ResultView result={result} />
          ) : (
            <>
              <h1 className="mb-8 text-2xl font-semibold tracking-tight text-slate-800">
                캡슐 묻기
              </h1>

              {!ready ? (
                <p className="text-sm text-slate-400">불러오는 중…</p>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                  <label className="flex flex-col gap-2 text-left">
                    <span className="text-sm font-medium text-slate-700">
                      받는 사람
                    </span>
                    <input
                      type="text"
                      value={recipient}
                      onChange={(e) => setRecipient(e.target.value)}
                      required
                      disabled={submitting}
                      placeholder="이름"
                      className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 disabled:opacity-50"
                    />
                  </label>

                  <label className="flex flex-col gap-2 text-left">
                    <span className="text-sm font-medium text-slate-700">
                      편지
                    </span>
                    <textarea
                      value={letter}
                      onChange={(e) => setLetter(e.target.value)}
                      required
                      disabled={submitting}
                      rows={6}
                      placeholder="미래의 그 사람에게…"
                      className="resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 disabled:opacity-50"
                    />
                  </label>

                  <label className="flex flex-col gap-2 text-left">
                    <span className="text-sm font-medium text-slate-700">
                      열람일
                    </span>
                    <input
                      type="datetime-local"
                      value={openAt}
                      onChange={(e) => setOpenAt(e.target.value)}
                      required
                      disabled={submitting}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 disabled:opacity-50"
                    />
                  </label>

                  <label className="flex flex-col gap-2 text-left">
                    <span className="text-sm font-medium text-slate-700">
                      사진
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      disabled={submitting}
                      onChange={handleFilesChange}
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
                    disabled={submitting}
                    className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-slate-800 px-8 py-3.5 text-sm font-medium tracking-wide text-slate-50 transition hover:bg-slate-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Spinner />
                        업로드 되는중
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
    </div>
  );
}

function ResultView({ result }: { result: CapsuleResult }) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-teal-100 text-3xl">
        ✓
      </div>
      <h1 className="mb-2 text-2xl font-semibold tracking-tight text-slate-800">
        캡슐을 묻었어요
      </h1>
      <p className="mb-8 text-sm text-slate-500">
        {result.recipient}님에게 전달될 캡슐이 저장됐습니다.
      </p>

      <dl className="mb-8 space-y-3 rounded-2xl bg-slate-50 px-5 py-4 text-left text-sm">
        <div>
          <dt className="text-slate-400">캡슐 번호</dt>
          <dd className="mt-0.5 break-all font-mono text-slate-700">
            {result.id}
          </dd>
        </div>
        <div>
          <dt className="text-slate-400">열람일</dt>
          <dd className="mt-0.5 text-slate-700">
            {formatOpenAt(result.openAt)}
          </dd>
        </div>
        <div>
          <dt className="text-slate-400">사진</dt>
          <dd className="mt-0.5 text-slate-700">{result.imageUrls.length}장</dd>
        </div>
      </dl>

      {result.imageUrls.length > 0 ? (
        <div className="mb-8 flex flex-wrap justify-center gap-3">
          {result.imageUrls.map((url) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={url}
              src={url}
              alt=""
              className="h-20 w-20 rounded-2xl object-cover ring-1 ring-slate-200"
            />
          ))}
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        <Link
          href={`/capsule/${result.id}`}
          className="inline-flex items-center justify-center rounded-full bg-slate-800 px-8 py-3.5 text-sm font-medium tracking-wide text-slate-50 transition hover:bg-slate-700"
        >
          캡슐 보기
        </Link>
        <Link
          href="/"
          className="text-sm text-slate-500 underline-offset-4 hover:text-slate-700 hover:underline"
        >
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
