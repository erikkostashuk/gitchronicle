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

/** Patterns that identify a known failure mode from its raw text. */
const KNOWN: Array<{ test: RegExp; message: string }> = [
  {
    // The whole point of the size guards, but a race or an unbounded operation
    // can still hit the real disk limit first.
    test: /no space left on device|ENOSPC|write error|index-pack failed|fetch-pack: invalid index-pack output/i,
    message:
      "This repository is too large for this instance to process. Try a smaller repository, or run GitChronicle locally where the limit is yours to set.",
  },
  {
    test: /could not read from remote repository|repository not found|not found|does not exist/i,
    message:
      "That repository could not be found. Check the URL, and note that only public repositories can be imported.",
  },
  {
    test: /authentication failed|could not read username|terminal prompts disabled|permission denied/i,
    message:
      "That repository is private or requires authentication. Only public repositories can be imported.",
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
