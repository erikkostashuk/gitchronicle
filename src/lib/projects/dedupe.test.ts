import { describe, expect, it } from "vitest";
import {
  dedupeProjectsForDisplay,
  isBetterProject,
  projectIdentityKey,
  projectStatusRank,
  type ProjectListItem,
} from "./dedupe";

function p(partial: Partial<ProjectListItem> & Pick<ProjectListItem, "id" | "slug" | "name">): ProjectListItem {
  return {
    fullName: null,
    sourceType: "local",
    sourceUrl: null,
    localPath: null,
    status: "ready",
    isDemo: false,
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

describe("projectIdentityKey", () => {
  it("keys demos by slug", () => {
    expect(
      projectIdentityKey({
        isDemo: true,
        slug: "acme-toolkit",
        sourceType: "demo",
        name: "acme",
      })
    ).toBe("demo:acme-toolkit");
  });

  it("prefers fullName", () => {
    expect(
      projectIdentityKey({
        isDemo: false,
        slug: "a",
        fullName: "Acme/Toolkit",
        sourceType: "github",
        name: "toolkit",
      })
    ).toBe("full:acme/toolkit");
  });

  it("uses normalized local path", () => {
    expect(
      projectIdentityKey({
        isDemo: false,
        slug: "gitchronicle",
        sourceType: "local",
        localPath: "/Users/me/Github/gitchronicle/",
        name: "gitchronicle",
      })
    ).toBe("local:/Users/me/Github/gitchronicle");
  });
});

describe("isBetterProject / status rank", () => {
  it("ranks ready above failed", () => {
    expect(projectStatusRank("ready")).toBeLessThan(projectStatusRank("failed"));
    expect(
      isBetterProject(
        { status: "ready", updatedAt: "2026-01-01T00:00:00.000Z" },
        { status: "failed", updatedAt: "2026-02-01T00:00:00.000Z" }
      )
    ).toBe(true);
  });

  it("prefers newer when status ties", () => {
    expect(
      isBetterProject(
        { status: "ready", updatedAt: "2026-02-01T00:00:00.000Z" },
        { status: "ready", updatedAt: "2026-01-01T00:00:00.000Z" }
      )
    ).toBe(true);
  });
});

describe("dedupeProjectsForDisplay", () => {
  it("collapses repeated local analyzes of the same path", () => {
    const rows = [
      p({
        id: "1",
        slug: "gitchronicle-2",
        name: "gitchronicle",
        localPath: "/Users/me/gitchronicle",
        updatedAt: "2026-03-01T00:00:00.000Z",
      }),
      p({
        id: "2",
        slug: "gitchronicle-1",
        name: "gitchronicle",
        localPath: "/Users/me/gitchronicle",
        updatedAt: "2026-02-01T00:00:00.000Z",
      }),
      p({
        id: "3",
        slug: "gitchronicle",
        name: "gitchronicle",
        localPath: "/Users/me/gitchronicle",
        updatedAt: "2026-01-01T00:00:00.000Z",
      }),
    ];
    const out = dedupeProjectsForDisplay(rows, 8);
    expect(out).toHaveLength(1);
    expect(out[0]!.id).toBe("1");
  });

  it("keeps distinct fullNames and demos", () => {
    const rows = [
      p({
        id: "d",
        slug: "acme-toolkit",
        name: "acme-toolkit",
        isDemo: true,
        sourceType: "demo",
        fullName: "acme/acme-toolkit",
      }),
      p({
        id: "a",
        slug: "toolkit",
        name: "toolkit",
        sourceType: "github",
        fullName: "acme/other",
      }),
      p({
        id: "b",
        slug: "toolkit-1",
        name: "toolkit",
        sourceType: "github",
        fullName: "acme/other",
        updatedAt: "2025-01-01T00:00:00.000Z",
      }),
    ];
    const out = dedupeProjectsForDisplay(rows, 8);
    expect(out.map((x) => x.id).sort()).toEqual(["a", "d"]);
  });

  it("prefers ready over a newer failed duplicate", () => {
    const rows = [
      p({
        id: "fail",
        slug: "repo-2",
        name: "repo",
        fullName: "org/repo",
        sourceType: "github",
        status: "failed",
        updatedAt: "2026-06-01T00:00:00.000Z",
      }),
      p({
        id: "ok",
        slug: "repo",
        name: "repo",
        fullName: "org/repo",
        sourceType: "github",
        status: "ready",
        updatedAt: "2026-01-01T00:00:00.000Z",
      }),
    ];
    const out = dedupeProjectsForDisplay(rows, 8);
    expect(out).toHaveLength(1);
    expect(out[0]!.id).toBe("ok");
  });

  it("respects limit", () => {
    const rows = Array.from({ length: 10 }, (_, i) =>
      p({
        id: String(i),
        slug: `r-${i}`,
        name: `r-${i}`,
        fullName: `org/r-${i}`,
        sourceType: "github",
        updatedAt: `2026-01-${String(i + 1).padStart(2, "0")}T00:00:00.000Z`,
      })
    );
    expect(dedupeProjectsForDisplay(rows, 3)).toHaveLength(3);
  });
});
