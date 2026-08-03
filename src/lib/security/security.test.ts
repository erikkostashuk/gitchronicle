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
import { isValidGitHubUrl, validateGitHubUrl } from "../git/validate";

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

  it("falls back through real-ip then unknown", () => {
    expect(
      clientKey(
        new Request("https://example.com", {
          headers: { "x-real-ip": "198.51.100.9" },
        })
      )
    ).toBe("198.51.100.9");
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
