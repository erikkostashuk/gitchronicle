import { describe, expect, it } from "vitest";
import {
  STALE_JOB_TTL_MS,
  isJobStale,
  jobHeartbeatAgeMs,
  jobHeartbeatIso,
} from "./stale";

describe("jobHeartbeatIso / age", () => {
  it("prefers updatedAt over startedAt and createdAt", () => {
    expect(
      jobHeartbeatIso({
        updatedAt: "2026-01-01T12:00:00.000Z",
        startedAt: "2026-01-01T11:00:00.000Z",
        createdAt: "2026-01-01T10:00:00.000Z",
      })
    ).toBe("2026-01-01T12:00:00.000Z");
  });

  it("falls back when updatedAt missing", () => {
    expect(
      jobHeartbeatIso({
        updatedAt: null,
        startedAt: "2026-01-01T11:00:00.000Z",
        createdAt: "2026-01-01T10:00:00.000Z",
      })
    ).toBe("2026-01-01T11:00:00.000Z");
  });

  it("computes age from heartbeat", () => {
    const now = Date.parse("2026-01-01T12:30:00.000Z");
    const age = jobHeartbeatAgeMs(
      { updatedAt: "2026-01-01T12:00:00.000Z" },
      now
    );
    expect(age).toBe(30 * 60 * 1000);
  });
});

describe("isJobStale", () => {
  const now = Date.parse("2026-08-03T12:00:00.000Z");

  it("only considers running jobs", () => {
    expect(
      isJobStale(
        {
          status: "pending",
          updatedAt: "2026-08-03T00:00:00.000Z",
        },
        now
      )
    ).toBe(false);
    expect(
      isJobStale(
        {
          status: "failed",
          updatedAt: "2026-08-03T00:00:00.000Z",
        },
        now
      )
    ).toBe(false);
  });

  it("is not stale when heartbeat is fresh", () => {
    const updatedAt = new Date(now - STALE_JOB_TTL_MS + 60_000).toISOString();
    expect(
      isJobStale({ status: "running", updatedAt }, now, STALE_JOB_TTL_MS)
    ).toBe(false);
  });

  it("is stale when heartbeat exceeds TTL", () => {
    const updatedAt = new Date(now - STALE_JOB_TTL_MS - 1).toISOString();
    expect(
      isJobStale({ status: "running", updatedAt }, now, STALE_JOB_TTL_MS)
    ).toBe(true);
  });

  it("uses custom TTL", () => {
    const updatedAt = new Date(now - 5_000).toISOString();
    expect(isJobStale({ status: "running", updatedAt }, now, 1_000)).toBe(
      true
    );
    expect(isJobStale({ status: "running", updatedAt }, now, 60_000)).toBe(
      false
    );
  });

  it("treats missing timestamps as stale when running", () => {
    expect(
      isJobStale(
        { status: "running", updatedAt: null, startedAt: null, createdAt: null },
        now,
        STALE_JOB_TTL_MS
      )
    ).toBe(true);
  });
});
