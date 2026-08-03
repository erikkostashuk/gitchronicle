"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Progress } from "./ui/progress";

export function ImportForm({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [stage, setStage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setProgress(0);
    setStage("Starting import…");
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = (await res.json()) as {
        error?: string;
        slug?: string;
        jobId?: string | null;
        status?: string;
        reused?: boolean;
      };
      if (!res.ok) {
        throw new Error(data.error || "Import failed");
      }
      if (data.reused && data.slug) {
        router.push(`/repo/${data.slug}`);
        return;
      }
      if (data.jobId && data.slug) {
        await pollJob(data.jobId, data.slug);
      } else if (data.slug) {
        router.push(`/repo/${data.slug}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
      setProgress(null);
    } finally {
      setLoading(false);
    }
  }

  async function pollJob(jobId: string, slug: string) {
    for (let i = 0; i < 600; i++) {
      const res = await fetch(`/api/jobs/${jobId}`);
      const job = (await res.json()) as {
        status: string;
        progress: number;
        stage: string;
        errorMessage?: string;
      };
      setProgress(job.progress);
      setStage(job.stage);
      if (job.status === "completed") {
        router.push(`/repo/${slug}`);
        return;
      }
      if (job.status === "failed") {
        throw new Error(job.errorMessage || "Analysis failed");
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
    throw new Error("Timed out waiting for analysis");
  }

  return (
    <form onSubmit={onSubmit} className={compact ? "space-y-3" : "space-y-4"}>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://github.com/owner/repo"
          aria-label="GitHub repository URL"
          disabled={loading}
          className="font-mono text-sm"
          required
        />
        <Button type="submit" disabled={loading || !url.trim()} className="sm:min-w-36">
          {loading ? (
            <>
              <Loader2 className="animate-spin" />
              Analyzing
            </>
          ) : (
            "Chronicle"
          )}
        </Button>
      </div>
      {progress !== null && (
        <div className="space-y-1.5">
          <Progress value={progress} />
          <p className="text-xs text-muted-foreground">
            {progress}% — {stage}
          </p>
        </div>
      )}
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {!compact && (
        <p className="text-xs text-muted-foreground">
          Public HTTPS GitHub URLs only. Clones run server-side with strict
          validation and size limits.
        </p>
      )}
    </form>
  );
}
