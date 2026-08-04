import { describe, expect, it } from "vitest";
import {
  UserFacingError,
  isPermanentFailure,
  tooLargeError,
  toUserMessage,
} from "./errors";

/**
 * Job failures are persisted and served verbatim by GET /api/jobs/[id], so a
 * raw git or filesystem error is effectively published. These tests pin the
 * boundary: nothing that reaches a user may contain a server path.
 */
describe("toUserMessage", () => {
  it("passes UserFacingError through untouched", () => {
    expect(toUserMessage(new UserFacingError("Try a smaller repository."))).toBe(
      "Try a smaller repository."
    );
  });

  it("never leaks the staging path from a real ENOSPC clone failure", () => {
    // Verbatim from a production failure importing a 5.8 GB repository
    const raw =
      "Clone failed: Cloning into '/app/data/tmp/clone-proj_70f88ebd0bfc854d-1785801274701'... " +
      "fatal: write error: No space left on device fatal: fetch-pack: invalid index-pack output";
    const msg = toUserMessage(raw);
    expect(msg).not.toContain("/app/data");
    expect(msg).not.toContain("clone-proj_");
    expect(msg).not.toMatch(/fatal:|index-pack/);
    expect(msg).toMatch(/too large/i);
  });

  it.each([
    ["ENOSPC: no space left on device, write", /too large/i],
    ["fatal: repository 'https://github.com/a/b.git' not found", /could not be found/i],
    ["fatal: Authentication failed for 'https://github.com/a/b'", /private or requires authentication/i],
    ["git clone timed out after 300000ms", /too long/i],
    ["getaddrinfo ENOTFOUND api.github.com", /could not reach github/i],
    ["warning: You appear to have cloned an empty repository", /no commits/i],
  ])("maps %s to an actionable message", (raw, expected) => {
    expect(toUserMessage(new Error(raw))).toMatch(expected);
  });

  it("falls back to a generic message for anything unrecognised", () => {
    const msg = toUserMessage(
      new Error("TypeError: Cannot read properties of undefined at /app/src/lib/x.ts:42")
    );
    expect(msg).not.toContain("/app/src");
    expect(msg).not.toContain("TypeError");
    expect(msg).toMatch(/analysis failed/i);
  });

  it("handles non-Error throws without exposing them", () => {
    const msg = toUserMessage({ stack: "/app/data/secret" });
    expect(msg).not.toContain("/app");
    expect(msg).toMatch(/analysis failed/i);
  });

  it("returns no message containing an absolute path, for any known input", () => {
    const inputs = [
      "ENOSPC /app/data/tmp/x",
      "fatal: not found /app/data/repos/proj_1",
      "timed out /Users/someone/repo",
      "ECONNRESET /var/lib/data",
    ];
    for (const raw of inputs) {
      expect(toUserMessage(new Error(raw)), raw).not.toMatch(/\/(app|Users|var)\//);
    }
  });
});

describe("isPermanentFailure", () => {
  it("flags failures that retrying cannot fix", () => {
    for (const raw of [
      "ENOSPC: no space left on device",
      "fatal: repository not found",
      "fatal: Authentication failed",
      "warning: You appear to have cloned an empty repository",
    ]) {
      expect(isPermanentFailure(toUserMessage(new Error(raw))), raw).toBe(true);
    }
  });

  it("leaves transient failures retryable", () => {
    for (const raw of [
      "git clone timed out after 300000ms",
      "getaddrinfo ENOTFOUND github.com",
      "something entirely unexpected",
    ]) {
      expect(isPermanentFailure(toUserMessage(new Error(raw))), raw).toBe(false);
    }
  });

  it("treats missing or unknown messages as retryable", () => {
    expect(isPermanentFailure(null)).toBe(false);
    expect(isPermanentFailure(undefined)).toBe(false);
    expect(isPermanentFailure("")).toBe(false);
    expect(isPermanentFailure("some message we never produce")).toBe(false);
  });

  it("stays in sync with toUserMessage output", () => {
    const sizeMsg = toUserMessage(new Error("No space left on device"));
    expect(isPermanentFailure(sizeMsg)).toBe(true);
  });

  it("tolerates surrounding text rather than demanding an exact string", () => {
    // Matching whole messages meant any rewording or interpolated value
    // silently reclassified a permanent failure as retryable. Phrase matching
    // is deliberately forgiving.
    const sizeMsg = toUserMessage(new Error("No space left on device"));
    expect(isPermanentFailure(sizeMsg + " ")).toBe(true);
    expect(isPermanentFailure(` ${sizeMsg}\n`)).toBe(true);
  });
});

describe("permanent classification covers what the clone path actually throws", () => {
  /**
   * Regression: the clone path threw its own "too large" wording while the
   * classifier matched a differently-worded one, so isPermanentFailure returned
   * false and the failure screen kept offering a Retry that could never work.
   * Testing only the ENOSPC-mapped string missed it entirely.
   */
  it("flags the exact error the clone path throws, at any limit", () => {
    for (const limit of [1, 500, 2000]) {
      const msg = tooLargeError(limit).message;
      expect(msg).toContain(`${limit} MB`);
      expect(isPermanentFailure(msg), msg).toBe(true);
      // and it must survive the round-trip that persists it
      expect(isPermanentFailure(toUserMessage(tooLargeError(limit)))).toBe(true);
    }
  });

  it("flags the 404 message the preflight throws", () => {
    const msg =
      "That repository could not be found. Check the URL, and note that only public repositories can be imported.";
    expect(isPermanentFailure(toUserMessage(new UserFacingError(msg)))).toBe(true);
  });
});
