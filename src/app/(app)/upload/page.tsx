"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Copy,
  ArrowRight,
  Check,
  FileUp,
  Link2,
  Loader2,
} from "lucide-react";
import { CategoryPill } from "@/components/CategoryPill";
import { cn } from "@/lib/utils";
import type { Item, Relation } from "@/lib/types";
import { useT } from "@/lib/i18n";

type Status = "pending" | "reading" | "done" | "error";

interface Job {
  key: string;
  label: string;
  status: Status;
  item?: Item;
  relations?: Relation[];
  duplicateOf?: { id: string; title: string; similarity: number };
  error?: string;
}

/** Kept in sync with the server by reading the same variable. */
const MAX_UPLOAD_MB = Number(process.env.NEXT_PUBLIC_MAX_UPLOAD_MB ?? 4);
const MAX_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

export default function UploadPage() {
  const { t } = useT();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [dragging, setDragging] = useState(false);
  const [url, setUrl] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const jobsRef = useRef<HTMLElement>(null);

  // Results render below the dropzone, off-screen on most laptops. Bring them
  // into view as soon as the first file starts processing, so the user sees
  // work happening instead of an apparently inert page.
  const jobCount = jobs.length;
  useEffect(() => {
    if (jobCount === 0) return;
    jobsRef.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "start",
    });
  }, [jobCount]);

  const update = useCallback((key: string, patch: Partial<Job>) => {
    setJobs((prev) =>
      prev.map((j) => (j.key === key ? { ...j, ...patch } : j)),
    );
  }, []);

  const runJob = useCallback(
    async (key: string, send: () => Promise<Response>) => {
      update(key, { status: "reading" });
      try {
        const res = await send();
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Ingestion failed");
        update(key, {
          status: "done",
          item: body.item,
          relations: body.relations,
          duplicateOf: body.duplicateOf,
        });
      } catch (err) {
        update(key, {
          status: "error",
          error: err instanceof Error ? err.message : "Something went wrong",
        });
      }
    },
    [update],
  );

  const addFiles = useCallback(
    (files: File[]) => {
      if (files.length === 0) return;

      const tooBig = files.filter((f) => f.size > MAX_BYTES);
      const ok = files.filter((f) => f.size <= MAX_BYTES);
      if (tooBig.length) {
        setJobs((prev) => [
          ...tooBig.map((f) => ({
            key: `${Date.now()}-big-${f.name}`,
            label: f.name,
            status: "error" as Status,
            error: `${(f.size / 1024 / 1024).toFixed(1)} MB — over the ${MAX_UPLOAD_MB} MB limit.`,
          })),
          ...prev,
        ]);
      }
      files = ok;
      if (files.length === 0) return;
      const created = files.map((file, i) => ({
        key: `${Date.now()}-${i}-${file.name}`,
        label: file.name,
        status: "pending" as Status,
        file,
      }));
      setJobs((prev) => [
        ...created.map(({ key, label, status }) => ({ key, label, status })),
        ...prev,
      ]);

      // Sequential, not parallel: each ingest relates against everything
      // already stored, so ordering keeps the graph deterministic.
      void (async () => {
        for (const { key, file } of created) {
          await runJob(key, () => {
            const form = new FormData();
            form.append("file", file);
            return fetch("/api/ingest", { method: "POST", body: form });
          });
        }
      })();
    },
    [runJob],
  );

  function addUrl(e: React.FormEvent) {
    e.preventDefault();
    const value = url.trim();
    if (!/^https?:\/\//i.test(value)) return;
    const key = `${Date.now()}-url`;
    setJobs((prev) => [
      { key, label: value, status: "pending" as Status },
      ...prev,
    ]);
    setUrl("");
    void runJob(key, () =>
      fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: value }),
      }),
    );
  }

  const done = jobs.filter((j) => j.status === "done").length;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <p className="eyebrow">{t("up.eyebrow")}</p>
        <h1 className="t-page mt-2 text-balance">
          {t("up.title")}
        </h1>
        <p className="mt-2 text-[1rem] leading-relaxed text-muted text-pretty">
          {t("up.sub")}
        </p>
      </header>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          addFiles(Array.from(e.dataTransfer.files));
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "card grid cursor-pointer place-items-center gap-3 border-dashed px-6 py-14 text-center transition-colors",
          dragging ? "border-[#2D6BFF] bg-[#2D6BFF]/5" : "hover:bg-mist/40",
        )}
      >
        <span className="grid size-11 place-items-center rounded-full bg-mist text-muted">
          <FileUp size={19} />
        </span>
        <div>
          <p className="text-[1rem] font-medium">
            {t("up.drop")}
          </p>
          <p className="mt-1 text-[0.875rem] text-faint">
            {t("up.formats")} · {MAX_UPLOAD_MB} MB
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          hidden
          accept=".pdf,.png,.jpg,.jpeg,.webp,.docx,.txt,.md,.html,.csv"
          onChange={(e) => {
            addFiles(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
      </div>

      <form onSubmit={addUrl} className="flex flex-col gap-2 sm:flex-row">
        <div className="panel flex flex-1 items-center gap-2.5 px-4 py-2.5">
          <Link2 size={15} className="shrink-0 text-faint" />
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={t("up.url")}
            className="w-full bg-transparent text-[0.9375rem] outline-none placeholder:text-faint"
          />
        </div>
        <button
          type="submit"
          disabled={!/^https?:\/\//i.test(url.trim())}
          className="btn btn-ghost !py-2.5 disabled:opacity-40"
        >
          {t("up.add")}
        </button>
      </form>

      {jobs.length > 0 && (
        <section ref={jobsRef} id="jobs" className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="eyebrow">
              {done} of {jobs.length} processed
            </p>
            {done > 0 && (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1 text-[0.875rem] text-muted transition-colors hover:text-fg"
              >
                {t("up.goOverview")}
                <ArrowRight size={13} />
              </Link>
            )}
          </div>
          <div className="space-y-3">
            {jobs.map((job) => (
              <JobRow key={job.key} job={job} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function JobRow({ job }: { job: Job }) {
  const { t } = useT();
  return (
    <div className="card p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0">
          {job.status === "done" ? (
            <Check size={16} className="text-[#2E6F52]" />
          ) : job.status === "error" ? (
            <AlertCircle size={16} className="text-[#C0453B]" />
          ) : (
            <Loader2 size={16} className="animate-spin text-faint" />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.875rem] text-faint">{job.label}</p>

          {job.status === "reading" && (
            <p className="mt-1 text-[0.9375rem] text-muted">
              {t("up.reading")}
            </p>
          )}

          {job.status === "error" && (
            <p className="mt-1 text-[0.9375rem] text-[#C0453B]">{job.error}</p>
          )}

          {job.status === "done" && job.item && (
            <div className="mt-2 space-y-2.5">
              {job.duplicateOf && (
                <p className="flex flex-wrap items-center gap-1.5 rounded-xl border border-[#B07A1E]/30 bg-[#B07A1E]/8 px-3 py-2 text-[0.875rem] text-[#8A5F17] dark:text-[#D9A441]">
                  <Copy size={13} className="shrink-0" />
                  {t("up.duplicate")}
                  <Link
                    href={`/record/${job.duplicateOf.id}`}
                    className="font-medium underline underline-offset-4"
                  >
                    {job.duplicateOf.title}
                  </Link>
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <CategoryPill category={job.item.category} />
                {job.relations && job.relations.length > 0 && (
                  <span className="text-[0.8125rem] text-faint">
                    {job.relations.length} connection
                    {job.relations.length === 1 ? "" : "s"} found
                  </span>
                )}
              </div>

              <Link
                href={`/record/${job.item.id}`}
                className="block text-[1rem] font-semibold hover:underline"
              >
                {job.item.title}
              </Link>

              <p className="text-[0.875rem] leading-relaxed text-muted text-pretty">
                {job.item.summary}
              </p>

              {job.item.skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {job.item.skills.map((s) => (
                    <span
                      key={s}
                      className="rounded-full bg-mist px-2 py-0.5 text-[0.75rem] font-medium text-graphite"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}

              {job.relations && job.relations.length > 0 && (
                <ul className="space-y-1 border-t border-lineSoft pt-2">
                  {job.relations.slice(0, 4).map((r) => (
                    <li key={r.id} className="text-[0.8125rem] text-faint">
                      → {r.reason}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
