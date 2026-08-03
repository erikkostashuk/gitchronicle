import { beforeEach, describe, expect, it } from "vitest";
import {
  clientKey,
  rateLimit,
  rateLimitHeaders,
  resetRateLimits,
} from "./rate-limit";
import {
  analysisCapacity,
  releaseAnalysisSlot,
  resetAnalysisSlots,
  tryAcquireAnalysisSlot,
} from "./capacity";
import {
  InvalidRepositoryUrlError,
  isValidGitHubUrl,
  validateGitHubUrl,
} from "../git/validate";

beforeEach(() => {
  resetRateLimits();
  resetAnalysisSlots();
});

describe("rateLimit", () => {
  it("allows up to the limit, then refuses within the window", () => {
    const now = 1_000_000;
    for (let i = 0; i < 3; i++) {
      expect(rateLimit("a", 3, 60_000, now).ok).toBe(true);
    }
    const blocked = rateLimit("a", 3, 60_000, now);
    expect(blocked.ok).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfter).toBeGreaterThan(0);
  });

  it("resets after the window elapses", () => {
    const now = 2_000_000;
    rateLimit("b", 1, 60_000, now);
    expect(rateLimit("b", 1, 60_000, now).ok).toBe(false);
    expect(rateLimit("b", 1, 60_000, now + 60_001).ok).toBe(true);
  });

  it("tracks clients independently", () => {
    const now = 3_000_000;
    rateLimit("x", 1, 60_000, now);
    expect(rateLimit("x", 1, 60_000, now).ok).toBe(false);
    expect(rateLimit("y", 1, 60_000, now).ok).toBe(true);
  });

  it("emits Retry-After only when blocked", () => {
    const now = 4_000_000;
    const allowed = rateLimit("h", 2, 60_000, now);
    expect(rateLimitHeaders(allowed)).not.toHaveProperty("Retry-After");
    rateLimit("h", 2, 60_000, now);
    const blocked = rateLimit("h", 2, 60_000, now);
    expect(rateLimitHeaders(blocked)).toHaveProperty("Retry-After");
  });
});

describe("clientKey", () => {
  it("prefers the first forwarded address", () => {
    const req = new Request("https://example.com", {
      headers: { "x-forwarded-for": "203.0.113.7, 10.0.0.1" },
    });
    expect(clientKey(req)).toBe("203.0.113.7");
  });

  /**
   * Regression: only checking x-forwarded-for meant every caller behind an edge
   * that uses a different header collapsed into one "unknown" bucket, turning a
   * per-client limit into a global lockout.
   */
  it.each([
    ["x-envoy-external-address", "198.51.100.4"],
    ["x-real-ip", "198.51.100.9"],
    ["cf-connecting-ip", "198.51.100.10"],
    ["true-client-ip", "198.51.100.11"],
    ["fastly-client-ip", "198.51.100.12"],
    ["x-client-ip", "198.51.100.13"],
  ])("resolves identity from %s", (header, ip) => {
    expect(
      clientKey(new Request("https://example.com", { headers: { [header]: ip } }))
    ).toBe(ip);
  });

  it("parses the RFC 7239 Forwarded header", () => {
    expect(
      clientKey(
        new Request("https://example.com", {
          headers: { forwarded: "for=192.0.2.60;proto=http;by=203.0.113.43" },
        })
      )
    ).toBe("192.0.2.60");
  });

  it("gives distinct keys to distinct clients", () => {
    const a = clientKey(
      new Request("https://e.com", { headers: { "x-forwarded-for": "1.1.1.1" } })
    );
    const b = clientKey(
      new Request("https://e.com", { headers: { "x-forwarded-for": "2.2.2.2" } })
    );
    expect(a).not.toBe(b);
  });

  it("falls back to unknown only when nothing identifies the caller", () => {
    expect(clientKey(new Request("https://example.com"))).toBe("unknown");
  });
});

describe("analysis capacity", () => {
  it("hands out no more slots than the configured limit", () => {
    const { limit } = analysisCapacity();
    const taken = [];
    for (let i = 0; i < limit; i++) {
      const slot = tryAcquireAnalysisSlot();
      expect(slot.ok).toBe(true);
      taken.push(slot);
    }
    expect(tryAcquireAnalysisSlot().ok).toBe(false);
    releaseAnalysisSlot();
    expect(tryAcquireAnalysisSlot().ok).toBe(true);
  });

  it("never drops below zero on extra releases", () => {
    releaseAnalysisSlot();
    releaseAnalysisSlot();
    expect(analysisCapacity().active).toBe(0);
  });
});

describe("GitHub URL validation (public attack surface)", () => {
  it("accepts ordinary repository URLs", () => {
    expect(isValidGitHubUrl("https://github.com/octocat/Hello-World")).toBe(true);
    expect(isValidGitHubUrl("https://github.com/octocat/Hello-World.git")).toBe(
      true
    );
    expect(isValidGitHubUrl("https://www.github.com/a/b/")).toBe(true);
  });

  it("rejects non-GitHub hosts, including look-alikes", () => {
    for (const url of [
      "https://gitlab.com/a/b",
      "https://github.com.evil.tld/a/b",
      "https://evilgithub.com/a/b",
      "https://raw.githubusercontent.com/a/b",
    ]) {
      expect(isValidGitHubUrl(url), url).toBe(false);
    }
  });

  it("rejects non-HTTPS and credential-bearing transports", () => {
    for (const url of [
      "http://github.com/a/b",
      "git://github.com/a/b",
      "ssh://git@github.com/a/b",
      "file:///etc/passwd",
      "ext::sh -c whoami",
      "https://user:pass@github.com/a/b".replace("github.com", "evil.com"),
    ]) {
      expect(isValidGitHubUrl(url), url).toBe(false);
    }
  });

  it("rejects owner/repo containing separators or metacharacters", () => {
    for (const url of [
      "https://github.com/a b/c",
      "https://github.com/a/c;whoami",
      "https://github.com/a/c$(id)",
      "https://github.com/a/c|ls",
      "https://github.com/onlyowner",
    ]) {
      expect(isValidGitHubUrl(url), url).toBe(false);
    }
  });

  it("refuses credentials embedded in an otherwise valid github.com URL", () => {
    // Rebuilding the clone URL would drop these silently. Rejecting instead
    // means nobody can believe a pasted token authenticated their clone.
    for (const url of [
      "https://user:pass@github.com/a/b",
      "https://token@github.com/a/b",
    ]) {
      expect(isValidGitHubUrl(url), url).toBe(false);
    }
    expect(() => validateGitHubUrl("https://user:pass@github.com/a/b")).toThrow(
      /credentials/i
    );
  });

  it("refuses owner or repo that git would read as an option", () => {
    for (const url of [
      "https://github.com/-upload-pack/b",
      "https://github.com/a/--help",
      "https://github.com/../b",
      "https://github.com/a/..",
    ]) {
      expect(isValidGitHubUrl(url), url).toBe(false);
    }
  });

  it("reports rejections as InvalidRepositoryUrlError with a clean message", () => {
    // The public 400 body is this message verbatim, so it must never carry a
    // validation-library issue dump or any server internals.
    try {
      validateGitHubUrl("https://gitlab.com/a/b");
      throw new Error("expected a rejection");
    } catch (err) {
      expect(err).toBeInstanceOf(InvalidRepositoryUrlError);
      const message = (err as Error).message;
      expect(message).not.toContain("{");
      expect(message).not.toContain("code");
      expect(message).toMatch(/github\.com/i);
    }
  });

  it("rejects empty, blank, and null-byte input", () => {
    for (const url of ["", "   ", "https://github.com/a/b\0"]) {
      expect(isValidGitHubUrl(url), JSON.stringify(url)).toBe(false);
    }
  });

  it("rebuilds the clone URL instead of passing user input to git", () => {
    // Query strings, fragments and embedded credentials must not survive
    const meta = validateGitHubUrl(
      "https://github.com/octocat/Hello-World.git?x=1#frag"
    );
    expect(meta.cloneUrl).toBe("https://github.com/octocat/Hello-World.git");
    expect(meta.cloneUrl).not.toContain("?");
    expect(meta.cloneUrl).not.toContain("#");
    // And the argument can never be read by git as a flag
    expect(meta.cloneUrl.startsWith("https://github.com/")).toBe(true);
  });

  it("keeps deep paths from escaping owner/repo", () => {
    const meta = validateGitHubUrl(
      "https://github.com/octocat/Hello-World/tree/main/src"
    );
    expect(meta.fullName).toBe("octocat/Hello-World");
    expect(meta.cloneUrl).toBe("https://github.com/octocat/Hello-World.git");
  });
});
