"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Progress } from "../ui/progress";
import { Button } from "../ui/button";

export function JobStatusPanel({
  jobId,
  initialProgress,
  initialStage,
  initialStatus,
  errorMessage,
}: {
  jobId?: string;
  initialProgress: number;
  initialStage: string;
  initialStatus: string;
  errorMessage?: string | null;
}) {
  const router = useRouter();
  const [progress, setProgress] = useState(initialProgress);
  const [stage, setStage] = useState(initialStage);
  const [status, setStatus] = useState(initialStatus);
  const [error, setError] = useState(errorMessage ?? null);

  useEffect(() => {
    if (!jobId || status === "completed" || status === "failed") return;
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}`);
        if (!res.ok) return;
        const job = await res.json();
        if (cancelled) return;
        setProgress(job.progress);
        setStage(job.stage);
        setStatus(job.status);
        if (job.errorMessage) setError(job.errorMessage);
        if (job.status === "completed") {
          router.refresh();
        }
      } catch {
        /* ignore transient */
      }
    };
    const id = setInterval(tick, 1200);
    void tick();
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [jobId, status, router]);

  if (status === "ready" || status === "completed") return null;

  return (
    <div className="mb-6 rounded-xl border border-border bg-card p-5 shadow-sm">
      {status === "failed" ? (
        <>
          <h2 className="font-semibold text-destructive">Analysis failed</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {error || "Something went wrong while analyzing this repository."}
          </p>
          <Button asChild variant="outline" className="mt-4" size="sm">
            <Link href="/">Try another repository</Link>
          </Button>
        </>
      ) : (
        <>
          <h2 className="font-semibold">Analyzing repository…</h2>
          <p className="mt-1 text-sm text-muted-foreground">{stage}</p>
          <Progress value={progress} className="mt-4" />
          <p className="mt-2 text-xs text-muted-foreground">{progress}%</p>
        </>
      )}
    </div>
  );
}
