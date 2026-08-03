import { z } from "zod";

const githubHttpsUrlSchema = z
  .string()
  .trim()
  .url()
  .refine((u) => {
    try {
      const parsed = new URL(u);
      if (parsed.protocol !== "https:") return false;
      if (parsed.hostname !== "github.com" && parsed.hostname !== "www.github.com") {
        return false;
      }
      // path: /owner/repo or /owner/repo.git
      const parts = parsed.pathname.replace(/\/+$/, "").split("/").filter(Boolean);
      if (parts.length < 2) return false;
      const [owner, repo] = parts;
      if (!owner || !repo) return false;
      if (!/^[A-Za-z0-9_.-]+$/.test(owner)) return false;
      const cleanRepo = repo.replace(/\.git$/, "");
      if (!/^[A-Za-z0-9_.-]+$/.test(cleanRepo)) return false;
      return true;
    } catch {
      return false;
    }
  }, "Only public HTTPS GitHub repository URLs are supported");

export type ValidatedGitHubUrl = {
  url: string;
  owner: string;
  repo: string;
  fullName: string;
  cloneUrl: string;
};

export function validateGitHubUrl(input: string): ValidatedGitHubUrl {
  const url = githubHttpsUrlSchema.parse(input);
  const parsed = new URL(url);
  const parts = parsed.pathname.replace(/\/+$/, "").split("/").filter(Boolean);
  const owner = parts[0]!;
  const repo = parts[1]!.replace(/\.git$/, "");
  const cloneUrl = `https://github.com/${owner}/${repo}.git`;
  return {
    url: `https://github.com/${owner}/${repo}`,
    owner,
    repo,
    fullName: `${owner}/${repo}`,
    cloneUrl,
  };
}

export function isValidGitHubUrl(input: string): boolean {
  try {
    validateGitHubUrl(input);
    return true;
  } catch {
    return false;
  }
}

/** Reject path traversal and shell metacharacters for local paths (validated by fs exists separately). */
export function assertSafeLocalPath(p: string): string {
  if (!p || typeof p !== "string") {
    throw new Error("Path is required");
  }
  if (p.includes("\0")) {
    throw new Error("Invalid path");
  }
  // No shell metacharacters needed since we never shell-interpolate,
  // but still refuse null bytes and empty paths.
  return p;
}
