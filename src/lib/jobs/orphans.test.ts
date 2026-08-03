import { describe, expect, it } from "vitest";
import { planOrphanProjectRepair } from "./orphans";

describe("planOrphanProjectRepair", () => {
  it("ignores ready and failed projects", () => {
    expect(
      planOrphanProjectRepair({ status: "ready" }, null, true)
    ).toBeNull();
    expect(
      planOrphanProjectRepair({ status: "failed" }, { status: "failed" }, false)
    ).toBeNull();
  });

  it("fails stuck projects with no job", () => {
    const r = planOrphanProjectRepair({ status: "analyzing" }, null, false);
    expect(r?.status).toBe("failed");
    expect(r?.reason).toBe("missing_job");
  });

  it("leaves active jobs alone", () => {
    expect(
      planOrphanProjectRepair(
        { status: "cloning" },
        { status: "running" },
        false
      )
    ).toBeNull();
    expect(
      planOrphanProjectRepair(
        { status: "pending" },
        { status: "pending" },
        false
      )
    ).toBeNull();
  });

  it("marks ready when job completed and analysis exists", () => {
    const r = planOrphanProjectRepair(
      { status: "analyzing" },
      { status: "completed" },
      true
    );
    expect(r).toEqual({
      status: "ready",
      errorMessage: null,
      reason: "job_completed_with_analysis",
    });
  });

  it("fails when job completed without analysis row", () => {
    const r = planOrphanProjectRepair(
      { status: "analyzing" },
      { status: "completed" },
      false
    );
    expect(r?.status).toBe("failed");
    expect(r?.reason).toBe("job_completed_without_analysis");
  });

  it("propagates failed job message", () => {
    const r = planOrphanProjectRepair(
      { status: "pending" },
      { status: "failed", errorMessage: "clone denied" },
      false
    );
    expect(r?.status).toBe("failed");
    expect(r?.errorMessage).toBe("clone denied");
    expect(r?.reason).toBe("job_failed");
  });
});
