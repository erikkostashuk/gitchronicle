import { describe, expect, it } from "vitest";
import { planRetryJob } from "./retry";

describe("planRetryJob", () => {
  it("re-clones failed GitHub projects", () => {
    const plan = planRetryJob({
      sourceType: "github",
      sourceUrl: "https://github.com/acme/toolkit",
      localPath: null,
      status: "failed",
      isDemo: false,
    });
    expect(plan).toEqual({
      ok: true,
      type: "clone_and_analyze",
      payload: { url: "https://github.com/acme/toolkit" },
    });
  });

  it("reanalyzes ready GitHub projects that still have a local clone", () => {
    const plan = planRetryJob({
      sourceType: "github",
      sourceUrl: "https://github.com/acme/toolkit",
      localPath: "/data/repos/proj_1",
      status: "ready",
      isDemo: false,
    });
    expect(plan).toEqual({
      ok: true,
      type: "reanalyze",
      payload: { localPath: "/data/repos/proj_1" },
    });
  });

  it("uses analyze_local for local path projects", () => {
    const plan = planRetryJob({
      sourceType: "local",
      sourceUrl: null,
      localPath: "/Users/me/code/app",
      status: "failed",
      isDemo: false,
    });
    expect(plan).toEqual({
      ok: true,
      type: "analyze_local",
      payload: { localPath: "/Users/me/code/app" },
    });
  });

  it("rejects local projects without a path", () => {
    const plan = planRetryJob({
      sourceType: "local",
      sourceUrl: null,
      localPath: null,
      status: "failed",
      isDemo: false,
    });
    expect(plan.ok).toBe(false);
    if (!plan.ok) {
      expect(plan.status).toBe(400);
      expect(plan.error).toMatch(/local/i);
    }
  });

  it("rejects demo projects", () => {
    const plan = planRetryJob({
      sourceType: "demo",
      sourceUrl: "https://github.com/acme/acme-toolkit",
      localPath: null,
      status: "failed",
      isDemo: true,
    });
    expect(plan.ok).toBe(false);
    if (!plan.ok) {
      expect(plan.status).toBe(400);
      expect(plan.error).toMatch(/seed/i);
    }
  });

  it("rejects in-progress projects", () => {
    for (const status of ["pending", "cloning", "analyzing"] as const) {
      const plan = planRetryJob({
        sourceType: "github",
        sourceUrl: "https://github.com/acme/toolkit",
        localPath: null,
        status,
        isDemo: false,
      });
      expect(plan.ok).toBe(false);
      if (!plan.ok) {
        expect(plan.status).toBe(409);
      }
    }
  });

  it("requires GitHub URL when re-cloning", () => {
    const plan = planRetryJob({
      sourceType: "github",
      sourceUrl: null,
      localPath: null,
      status: "failed",
      isDemo: false,
    });
    expect(plan.ok).toBe(false);
    if (!plan.ok) expect(plan.status).toBe(400);
  });
});
