"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw } from "lucide-react";
import { Progress } from "../ui/progress";
import { Button } from "../ui/button";

export function JobStatusPanel({
  slug,
  jobId,
  initialProgress,
  initialStage,
  initialStatus,
  errorMessage,
  canRetry = true,
}: {
  slug: string;
  jobId?: string;
  initialProgress: number;
  initialStage: string;
  initialStatus: string;
  errorMessage?: string | null;
  /** False for demo / sources that cannot re-run */
  canRetry?: boolean;
}) {
  const router = useRouter();
  const [activeJobId, setActiveJobId] = useState(jobId);
  const [progress, setProgress] = useState(initialProgress);
  const [stage, setStage] = useState(initialStage);
  const [status, setStatus] = useState(initialStatus);
  const [error, setError] = useState(errorMessage ?? null);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (!activeJobId || status === "completed" || status === "failed") return;
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch(`/api/jobs/${activeJobId}`);
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
  }, [activeJobId, status, router]);

  async function onRetry() {
    setRetrying(true);
    setError(null);
    try {
      const res = await fetch(`/api/repos/${slug}/retry`, { method: "POST" });
      const data = (await res.json()) as {
        error?: string;
        jobId?: string;
        status?: string;
      };
      if (!res.ok) {
        throw new Error(data.error || "Retry failed");
      }
      if (!data.jobId) {
        throw new Error("Retry did not return a job id");
      }
      setActiveJobId(data.jobId);
      setStatus(data.status ?? "pending");
      setProgress(0);
      setStage("queued");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Retry failed");
      setStatus("failed");
    } finally {
      setRetrying(false);
    }
  }

  if (status === "ready" || status === "completed") return null;

  const showRetry = status === "failed" && canRetry;

  return (
    <div
      className="gc-card mb-8 p-5"
      data-testid="job-status-panel"
      data-status={status}
    >
      {status === "failed" ? (
        <>
          <h2 className="font-bold tracking-tight text-destructive">
            Analysis failed
          </h2>
          <p className="mt-2 text-sm text-muted-foreground" role="alert">
            {error || "Something went wrong while analyzing this repository."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {showRetry && (
              <Button
                size="sm"
                onClick={() => void onRetry()}
                disabled={retrying}
                data-testid="job-retry"
              >
                {retrying ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4" />
                )}
                {retrying ? "Retrying…" : "Retry analysis"}
              </Button>
            )}
            <Button asChild variant="outline" size="sm">
              <Link href="/">Try another repository</Link>
            </Button>
          </div>
        </>
      ) : (
        <>
          <h2 className="font-bold tracking-tight">Analyzing repository…</h2>
          <p className="mt-1 text-sm text-muted-foreground">{stage}</p>
          <Progress value={progress} className="mt-4" />
          <p className="mt-2 text-xs text-muted-foreground">{progress}%</p>
        </>
      )}
    </div>
  );
}
