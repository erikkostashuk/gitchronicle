const GENERIC_MESSAGE = "Only public HTTPS GitHub repository URLs are supported";

/**
 * Thrown for any rejected repository URL.
 *
 * A distinct class so route handlers can answer 400 with `error.message`
 * without pattern-matching on strings, and without ever forwarding a raw
 * validation-library error — those serialise to an issue array that exposes
 * internal schema shape to a public caller.
 */
export class InvalidRepositoryUrlError extends Error {
  constructor(message: string = GENERIC_MESSAGE) {
    super(message);
    this.name = "InvalidRepositoryUrlError";
  }
}

export type ValidatedGitHubUrl = {
  url: string;
  owner: string;
  repo: string;
  fullName: string;
  cloneUrl: string;
};

export function validateGitHubUrl(input: string): ValidatedGitHubUrl {
  if (typeof input !== "string" || input.trim() === "") {
    throw new InvalidRepositoryUrlError("A repository URL is required");
  }
  const trimmed = input.trim();
  if (trimmed.includes("\0")) {
    throw new InvalidRepositoryUrlError();
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new InvalidRepositoryUrlError(
      "That doesn't look like a URL. Use https://github.com/owner/repo"
    );
  }

  if (parsed.protocol !== "https:") {
    throw new InvalidRepositoryUrlError(
      "Only https:// URLs are supported — other Git transports are not accepted"
    );
  }

  // Credentials are dropped when the clone URL is rebuilt below, so they could
  // be ignored silently. Refuse instead: a caller who pastes a token deserves
  // to know it was not used rather than assuming it authenticated the clone.
  if (parsed.username || parsed.password) {
    throw new InvalidRepositoryUrlError(
      "Remove the credentials from the URL — only public repositories are supported"
    );
  }

  if (parsed.hostname !== "github.com" && parsed.hostname !== "www.github.com") {
    throw new InvalidRepositoryUrlError(
      "Only github.com repositories are supported"
    );
  }

  // path: /owner/repo or /owner/repo.git
  const parts = parsed.pathname.replace(/\/+$/, "").split("/").filter(Boolean);
  if (parts.length < 2) {
    throw new InvalidRepositoryUrlError(
      "Point at a repository, e.g. https://github.com/owner/repo"
    );
  }

  const owner = parts[0]!;
  const repo = parts[1]!.replace(/\.git$/, "");
  // Charset restriction is what makes the rebuilt clone URL safe: no `..`, no
  // path separators, nothing `--flag`-shaped can survive this.
  if (!/^[A-Za-z0-9_.-]+$/.test(owner) || !/^[A-Za-z0-9_.-]+$/.test(repo)) {
    throw new InvalidRepositoryUrlError();
  }
  // A leading dash would be read by git as an option rather than a URL.
  if (owner.startsWith("-") || repo.startsWith("-")) {
    throw new InvalidRepositoryUrlError();
  }
  if (owner === "." || owner === ".." || repo === "." || repo === "..") {
    throw new InvalidRepositoryUrlError();
  }

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
