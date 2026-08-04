import { describe, expect, it } from "vitest";
import { planProjectEviction, type RetentionCandidate } from "./retention";

const p = (
  id: string,
  updatedAt: string,
  extra: Partial<RetentionCandidate> = {}
): RetentionCandidate => ({
  id,
  updatedAt,
  status: "ready",
  isDemo: false,
  ...extra,
});

describe("planProjectEviction", () => {
  it("keeps everything while under the cap", () => {
    expect(
      planProjectEviction([p("a", "2026-01-01"), p("b", "2026-01-02")], 5)
    ).toEqual([]);
  });

  it("evicts the oldest once over the cap, newest survive", () => {
    const rows = [
      p("oldest", "2026-01-01"),
      p("mid", "2026-01-02"),
      p("newer", "2026-01-03"),
      p("newest", "2026-01-04"),
    ];
    expect(planProjectEviction(rows, 2)).toEqual(["oldest", "mid"]);
  });

  it("returns evictions oldest first", () => {
    const rows = [
      p("c", "2026-01-03"),
      p("a", "2026-01-01"),
      p("b", "2026-01-02"),
    ];
    expect(planProjectEviction(rows, 1)).toEqual(["a", "b"]);
  });

  it("never evicts the demo, and counts it toward the cap", () => {
    const rows = [
      p("demo", "2026-01-01", { isDemo: true }),
      p("old", "2026-01-02"),
      p("new", "2026-01-03"),
    ];
    // cap 2 => demo is protected and occupies one slot, so only "new" survives
    expect(planProjectEviction(rows, 2)).toEqual(["old"]);
    // even at cap 1 the demo stays and everything else goes
    expect(planProjectEviction(rows, 1)).toEqual(["old", "new"]);
  });

  it("never evicts an import that is still running", () => {
    const rows = [
      p("cloning", "2026-01-01", { status: "cloning" }),
      p("analyzing", "2026-01-02", { status: "analyzing" }),
      p("pending", "2026-01-03", { status: "pending" }),
      p("done", "2026-01-04"),
    ];
    // Cap of 1 against 3 in-flight rows: they are all protected, so only the
    // finished one can go. The point is that no active id is ever returned.
    const evicted = planProjectEviction(rows, 1);
    expect(evicted).not.toContain("cloning");
    expect(evicted).not.toContain("analyzing");
    expect(evicted).not.toContain("pending");
    expect(evicted).toEqual(["done"]);
  });

  it("leaves a fully in-flight store untouched", () => {
    const rows = [
      p("a", "2026-01-01", { status: "cloning" }),
      p("b", "2026-01-02", { status: "pending" }),
    ];
    expect(planProjectEviction(rows, 1)).toEqual([]);
  });

  it("evicts failed projects like any other", () => {
    const rows = [
      p("failed-old", "2026-01-01", { status: "failed" }),
      p("ready-new", "2026-01-02"),
    ];
    expect(planProjectEviction(rows, 1)).toEqual(["failed-old"]);
  });

  it("treats max<=0 as disabled rather than evicting everything", () => {
    const rows = [p("a", "2026-01-01"), p("b", "2026-01-02")];
    expect(planProjectEviction(rows, 0)).toEqual([]);
    expect(planProjectEviction(rows, -1)).toEqual([]);
  });

  it("never returns a negative keep when protected rows exceed the cap", () => {
    const rows = [
      p("d1", "2026-01-01", { isDemo: true }),
      p("j1", "2026-01-02", { status: "pending" }),
      p("j2", "2026-01-03", { status: "cloning" }),
      p("evictable", "2026-01-04"),
    ];
    // 3 protected rows against a cap of 2: the one evictable row goes, no crash
    expect(planProjectEviction(rows, 2)).toEqual(["evictable"]);
  });
});
