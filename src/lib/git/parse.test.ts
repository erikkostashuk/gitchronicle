import { describe, expect, it } from "vitest";
import {
  GIT_LOG_FORMAT,
  parseLogOutput,
  parseLogRecord,
  parseLogWithNumstat,
  parseNameStatus,
  parseNumstat,
  parseRenamePath,
  parseTags,
} from "./parse";

describe("parseLogRecord", () => {
  it("parses a well-formed commit record", () => {
    const fields = [
      "abc123def456",
      "parent1",
      "Ada Lovelace",
      "ada@example.com",
      "2022-01-01T12:00:00Z",
      "Ada Lovelace",
      "ada@example.com",
      "2022-01-01T12:00:00Z",
      "feat: hello",
      "body line",
    ].join("\x1f");
    const c = parseLogRecord(fields);
    expect(c).not.toBeNull();
    expect(c!.hash).toBe("abc123def456");
    expect(c!.shortHash).toBe("abc123d");
    expect(c!.authorName).toBe("Ada Lovelace");
    expect(c!.authorEmail).toBe("ada@example.com");
    expect(c!.subject).toBe("feat: hello");
    expect(c!.body).toBe("body line");
    expect(c!.parents).toEqual(["parent1"]);
  });

  it("returns null for empty input", () => {
    expect(parseLogRecord("")).toBeNull();
  });
});

describe("parseLogOutput", () => {
  it("splits records by RS", () => {
    const a = [
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "",
      "A",
      "a@x.com",
      "2022-01-01T00:00:00Z",
      "A",
      "a@x.com",
      "2022-01-01T00:00:00Z",
      "one",
      "",
    ].join("\x1f");
    const b = [
      "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "B",
      "b@x.com",
      "2022-01-02T00:00:00Z",
      "B",
      "b@x.com",
      "2022-01-02T00:00:00Z",
      "two",
      "",
    ].join("\x1f");
    const commits = parseLogOutput(`${a}\x1e${b}`);
    expect(commits).toHaveLength(2);
    expect(commits[0]!.subject).toBe("one");
    expect(commits[1]!.subject).toBe("two");
  });
});

describe("parseNumstat", () => {
  it("parses additions deletions and paths", () => {
    const out = parseNumstat("10\t2\tsrc/a.ts\n-\t-\tbin/app\n3\t0\tREADME.md\n");
    expect(out).toHaveLength(3);
    expect(out[0]).toMatchObject({
      path: "src/a.ts",
      additions: 10,
      deletions: 2,
    });
    expect(out[1]!.additions).toBe(0);
    expect(out[1]!.deletions).toBe(0);
  });

  it("parses rename paths", () => {
    const out = parseNumstat("1\t1\told.ts => new.ts\n");
    expect(out[0]!.status).toBe("renamed");
    expect(out[0]!.previousPath).toBe("old.ts");
    expect(out[0]!.path).toBe("new.ts");
  });
});

describe("parseRenamePath", () => {
  it("handles brace renames", () => {
    const r = parseRenamePath("src/{old => new}/file.ts");
    expect(r).toEqual({ from: "src/old/file.ts", to: "src/new/file.ts" });
  });
});

describe("parseLogWithNumstat", () => {
  it("attaches file stats to commits", () => {
    const header = [
      "cccccccccccccccccccccccccccccccccccccccc",
      "",
      "C",
      "c@x.com",
      "2022-03-01T00:00:00Z",
      "C",
      "c@x.com",
      "2022-03-01T00:00:00Z",
      "feat: files",
      "",
    ].join("\x1f");
    const block = `${header}\n10\t1\tsrc/a.ts\n5\t0\tsrc/b.ts\n`;
    const commits = parseLogWithNumstat(`\x1e${block}`);
    expect(commits).toHaveLength(1);
    expect(commits[0]!.files).toHaveLength(2);
    expect(commits[0]!.additions).toBe(15);
    expect(commits[0]!.deletions).toBe(1);
  });
});

describe("parseNameStatus", () => {
  it("maps status codes", () => {
    const m = parseNameStatus("A\tnew.ts\nM\told.ts\nD\tgone.ts\nR100\ta.ts\tb.ts\n");
    expect(m.get("new.ts")).toBe("added");
    expect(m.get("old.ts")).toBe("modified");
    expect(m.get("gone.ts")).toBe("deleted");
    expect(m.get("b.ts")).toBe("renamed");
  });
});

describe("parseTags", () => {
  it("parses tag lines", () => {
    const tags = parseTags(
      "v1.0.0|abc|2022-01-01T00:00:00Z|Release\nv1.1.0|def|2022-02-01T00:00:00Z|\n"
    );
    expect(tags).toHaveLength(2);
    expect(tags[0]!.name).toBe("v1.0.0");
    expect(tags[0]!.hash).toBe("abc");
  });
});

describe("GIT_LOG_FORMAT", () => {
  it("includes hash and subject fields", () => {
    expect(GIT_LOG_FORMAT).toContain("%H");
    expect(GIT_LOG_FORMAT).toContain("%s");
  });
});
