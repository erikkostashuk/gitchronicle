/**
 * User-facing error handling.
 *
 * Job failures are persisted to `jobs.errorMessage` / `projects.errorMessage`
 * and served verbatim by `GET /api/jobs/[id]`, so anything thrown inside a job
 * is effectively public. Raw errors from `git` and the filesystem carry
 * absolute server paths (`/app/data/tmp/clone-proj_…`), which is both a leak
 * and useless to the person who pasted a URL.
 *
 * Rule: throw `UserFacingError` when the message is written for a user; let
 * everything else fall through `toUserMessage`, which logs the detail and
 * returns something safe and actionable.
 */
import { logger } from "./logger";

export class UserFacingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserFacingError";
  }
}

/**
 * Patterns that identify a known failure mode from its raw text.
 *
 * `permanent` means retrying changes nothing — the repository will not shrink,
 * appear, or become public on its own. The UI hides "Retry analysis" for these
 * so nobody spends their rate limit re-running a guaranteed failure.
 */
const KNOWN: Array<{ test: RegExp; message: string; permanent?: boolean }> = [
  {
    // The whole point of the size guards, but a race or an unbounded operation
    // can still hit the real disk limit first.
    test: /no space left on device|ENOSPC|write error|index-pack failed|fetch-pack: invalid index-pack output/i,
    message:
      "This repository is too large for this instance to process. Try a smaller repository, or run GitChronicle locally where the limit is yours to set.",
    permanent: true,
  },
  {
    test: /could not read from remote repository|repository not found|not found|does not exist/i,
    message:
      "That repository could not be found. Check the URL, and note that only public repositories can be imported.",
    permanent: true,
  },
  {
    test: /authentication failed|could not read username|terminal prompts disabled|permission denied/i,
    message:
      "That repository is private or requires authentication. Only public repositories can be imported.",
    permanent: true,
  },
  {
    test: /timed out|ETIMEDOUT|timeout/i,
    message:
      "The repository took too long to process and was stopped. Very large or very active repositories can exceed the time limit.",
  },
  {
    test: /ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ECONNRESET|network|getaddrinfo/i,
    message:
      "Could not reach GitHub. This is usually temporary — please try again.",
  },
  {
    test: /empty repository|does not have any commits|unborn/i,
    message: "That repository has no commits yet, so there is nothing to analyse.",
    permanent: true,
  },
];

/**
 * Convert any thrown value into a message that is safe to persist and display.
 * The original is logged so operators keep full detail.
 */
export function toUserMessage(err: unknown, context?: Record<string, unknown>): string {
  if (err instanceof UserFacingError) return err.message;

  const raw = err instanceof Error ? err.message : String(err);
  logger.error("Job failed", { ...context, error: raw });

  for (const { test, message } of KNOWN) {
    if (test.test(raw)) return message;
  }
  return "Analysis failed. Please try again, or open an issue if it keeps happening.";
}

/**
 * The clone size ceiling, thrown from the clone path.
 *
 * Lives here rather than in `git/clone.ts` so the message and its permanent
 * classification cannot drift apart — an earlier version had two differently
 * worded "too large" strings, and `isPermanentFailure` silently matched
 * neither, leaving a useless Retry button on the failure screen.
 */
export function tooLargeError(limitMb: number): UserFacingError {
  return new UserFacingError(
    `That repository is larger than this instance allows (${limitMb} MB). Try a smaller repository, or run GitChronicle locally where you set the limit.`
  );
}

/**
 * Distinctive phrases identifying a permanently-failed import.
 *
 * Deliberately a phrase per class rather than whole-message equality: messages
 * interpolate values (the MB limit) and get reworded, and an exact match that
 * quietly stops matching is worse than no check at all.
 */
const PERMANENT_PATTERNS: RegExp[] = [
  /larger than this instance allows|too large for this instance/i,
  /could not be found/i,
  /private or requires authentication/i,
  /no commits yet/i,
];

/** True when the stored failure message describes something retrying cannot fix. */
export function isPermanentFailure(message: string | null | undefined): boolean {
  if (!message) return false;
  return PERMANENT_PATTERNS.some((p) => p.test(message));
}
