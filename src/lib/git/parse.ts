import type { CommitWithFiles, FileChange, RawCommit, TagInfo } from "../types/analysis";

const RECORD_SEP = "\x1e";
const FIELD_SEP = "\x1f";

/**
 * Custom pretty format for git log. Fields separated by \x1f, records by \x1e.
 * Order: hash, parents, an, ae, aI, cn, ce, cI, subject, body
 */
export const GIT_LOG_FORMAT = [
  "%H",
  "%P",
  "%an",
  "%ae",
  "%aI",
  "%cn",
  "%ce",
  "%cI",
  "%s",
  "%b",
].join(FIELD_SEP);

export function parseLogRecord(block: string): RawCommit | null {
  const trimmed = block.trim();
  if (!trimmed) return null;
  const fields = trimmed.split(FIELD_SEP);
  if (fields.length < 9) return null;
  const [
    hash = "",
    parents = "",
    authorName = "",
    authorEmail = "",
    authorDate = "",
    committerName = "",
    committerEmail = "",
    committerDate = "",
    subject = "",
    ...bodyParts
  ] = fields;
  if (!hash) return null;
  return {
    hash,
    shortHash: hash.slice(0, 7),
    authorName: authorName.trim(),
    authorEmail: authorEmail.trim().toLowerCase(),
    authorDate,
    committerName: committerName.trim(),
    committerEmail: committerEmail.trim().toLowerCase(),
    committerDate,
    subject: subject.trim(),
    body: bodyParts.join(FIELD_SEP).trim(),
    parents: parents.trim() ? parents.trim().split(/\s+/) : [],
  };
}

export function parseLogOutput(stdout: string): RawCommit[] {
  const parts = stdout.split(RECORD_SEP);
  const commits: RawCommit[] = [];
  for (const part of parts) {
    const c = parseLogRecord(part);
    if (c) commits.push(c);
  }
  return commits;
}

/**
 * Parse --numstat lines: additions\tdeletions\tpath
 * Renames: additions\tdeletions\told => new
 * Binary: -\t-\tpath
 */
export function parseNumstat(stdout: string): FileChange[] {
  const lines = stdout.split("\n").filter((l) => l.trim().length > 0);
  const changes: FileChange[] = [];
  for (const line of lines) {
    const tab1 = line.indexOf("\t");
    if (tab1 < 0) continue;
    const tab2 = line.indexOf("\t", tab1 + 1);
    if (tab2 < 0) continue;
    const addStr = line.slice(0, tab1);
    const delStr = line.slice(tab1 + 1, tab2);
    const pathPart = line.slice(tab2 + 1).trim();
    if (!pathPart) continue;

    const additions = addStr === "-" ? 0 : parseInt(addStr, 10) || 0;
    const deletions = delStr === "-" ? 0 : parseInt(delStr, 10) || 0;

    let path = pathPart;
    let previousPath: string | undefined;
    let status: FileChange["status"] = "modified";

    // git --numstat with renames: "old => new" or "{old => new}/file"
    if (pathPart.includes("=>")) {
      const rename = parseRenamePath(pathPart);
      if (rename) {
        previousPath = rename.from;
        path = rename.to;
        status = "renamed";
      }
    }

    changes.push({ path, previousPath, status, additions, deletions });
  }
  return changes;
}

export function parseRenamePath(
  pathPart: string
): { from: string; to: string } | null {
  // Brace form first: dir/{a => b}/file
  const brace = pathPart.match(/^(.*)\{(.+?)\s*=>\s*(.+?)\}(.*)$/);
  if (brace) {
    return {
      from: `${brace[1]}${brace[2]!.trim()}${brace[4]}`,
      to: `${brace[1]}${brace[3]!.trim()}${brace[4]}`,
    };
  }
  // Simple: old => new
  const simple = pathPart.match(/^(.+?)\s*=>\s*(.+)$/);
  if (!simple) return null;
  return { from: simple[1]!.trim(), to: simple[2]!.trim() };
}

/**
 * Parse combined git log with numstat (null-byte or custom separators).
 * We use a two-pass approach in the analyzer; this helper attaches numstat
 * blocks that follow each commit header when using --numstat in the same stream.
 */
export function parseLogWithNumstat(stdout: string): CommitWithFiles[] {
  // Format: RECORD_SEP + fields... then blank line then numstat lines until next RECORD_SEP
  const records = stdout.split(RECORD_SEP).filter((r) => r.trim());
  const commits: CommitWithFiles[] = [];

  for (const record of records) {
    // Split header from numstat: first line(s) of fields may contain newlines in body
    // Body is last field; numstat starts after a blank line following the body field.
    // Simpler approach: find first numstat-looking line after the fields.
    const lines = record.replace(/^\n+/, "").split("\n");
    if (lines.length === 0) continue;

    // Reconstruct header: everything until we see a pure numstat line
    // Fields are on one logical line joined by FIELD_SEP, but body may have newlines.
    // Strategy: join all lines until we hit a line matching /^\d+|-\t\d+|-\t/
    let headerEnd = lines.length;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      if (/^(\d+|-)\t(\d+|-)\t.+/.test(line)) {
        headerEnd = i;
        break;
      }
    }

    const headerBlock = lines.slice(0, headerEnd).join("\n");
    const numstatBlock = lines.slice(headerEnd).join("\n");
    const raw = parseLogRecord(headerBlock);
    if (!raw) continue;
    const files = parseNumstat(numstatBlock);

    // Infer status for non-renames
    for (const f of files) {
      if (f.status === "renamed") continue;
      if (f.additions > 0 && f.deletions === 0 && !f.previousPath) {
        // might be new file — refined later with --name-status if needed
      }
    }

    const additions = files.reduce((s, f) => s + f.additions, 0);
    const deletions = files.reduce((s, f) => s + f.deletions, 0);
    commits.push({ ...raw, files, additions, deletions });
  }

  return commits;
}

export function parseNameStatus(stdout: string): Map<string, FileChange["status"]> {
  const map = new Map<string, FileChange["status"]>();
  for (const line of stdout.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parts = trimmed.split("\t");
    const code = parts[0]?.[0];
    if (!code) continue;
    if (code === "R" || code === "C") {
      const to = parts[2] ?? parts[1];
      if (to) map.set(to, code === "R" ? "renamed" : "copied");
    } else if (code === "A") {
      if (parts[1]) map.set(parts[1], "added");
    } else if (code === "D") {
      if (parts[1]) map.set(parts[1], "deleted");
    } else if (code === "M") {
      if (parts[1]) map.set(parts[1], "modified");
    }
  }
  return map;
}

export function parseTags(stdout: string): TagInfo[] {
  // format: tag|hash|date|subject
  const tags: TagInfo[] = [];
  for (const line of stdout.split("\n")) {
    if (!line.trim()) continue;
    const [name, hash, date, ...msgParts] = line.split("|");
    if (!name || !hash) continue;
    tags.push({
      name: name.trim(),
      hash: hash.trim(),
      date: date?.trim() || undefined,
      message: msgParts.join("|").trim() || undefined,
    });
  }
  return tags;
}

export function parseRefLogForDefaultBranch(stdout: string): string | undefined {
  const line = stdout.trim().split("\n")[0]?.trim();
  return line || undefined;
}
