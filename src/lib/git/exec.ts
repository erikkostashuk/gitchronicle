import { spawn } from "node:child_process";
import { logger } from "../logger";

export interface GitExecOptions {
  cwd: string;
  timeoutMs?: number;
  maxBuffer?: number;
  env?: NodeJS.ProcessEnv;
  /**
   * Kills the process when aborted. A timeout alone cannot bound a clone by
   * *size*: a repository far larger than the disk fills the volume long before
   * the clock runs out, so callers watch the working directory grow and abort.
   */
  signal?: AbortSignal;
}

export interface GitExecResult {
  stdout: string;
  stderr: string;
  code: number;
}

/**
 * Run git with an argument array only — never shell interpolation.
 */
export async function gitExec(
  args: string[],
  options: GitExecOptions
): Promise<GitExecResult> {
  const timeoutMs = options.timeoutMs ?? 120_000;
  const maxBuffer = options.maxBuffer ?? 32 * 1024 * 1024;

  return new Promise((resolve, reject) => {
    const child = spawn("git", args, {
      cwd: options.cwd,
      env: {
        ...process.env,
        ...options.env,
        GIT_TERMINAL_PROMPT: "0",
        GIT_OPTIONAL_LOCKS: "0",
        LC_ALL: "C",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    // Chunk arrays avoid quadratic string concatenation on multi‑MB git log output
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let killed = false;

    const timer = setTimeout(() => {
      killed = true;
      child.kill("SIGKILL");
      reject(new Error(`git ${args[0] ?? ""} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    const onAbort = () => {
      killed = true;
      clearTimeout(timer);
      child.kill("SIGKILL");
      const reason = options.signal?.reason;
      reject(
        reason instanceof Error
          ? reason
          : new Error(`git ${args[0] ?? ""} aborted`)
      );
    };
    if (options.signal) {
      if (options.signal.aborted) {
        // Never spawned work we are about to kill anyway
        child.kill("SIGKILL");
      }
      options.signal.addEventListener("abort", onAbort, { once: true });
    }
    const cleanup = () => {
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", onAbort);
    };

    child.stdout.on("data", (chunk: Buffer) => {
      stdoutBytes += chunk.length;
      if (stdoutBytes <= maxBuffer) {
        stdoutChunks.push(chunk);
      }
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderrBytes += chunk.length;
      if (stderrBytes <= maxBuffer) {
        stderrChunks.push(chunk);
      }
    });

    child.on("error", (err) => {
      cleanup();
      logger.error("git spawn error", { args, error: String(err) });
      reject(err);
    });

    child.on("close", (code) => {
      cleanup();
      if (killed) return;
      if (stdoutBytes > maxBuffer || stderrBytes > maxBuffer) {
        reject(
          new Error(
            `git ${args[0] ?? ""} output exceeded max buffer (${maxBuffer} bytes)`
          )
        );
        return;
      }
      resolve({
        stdout: Buffer.concat(stdoutChunks).toString("utf8"),
        stderr: Buffer.concat(stderrChunks).toString("utf8"),
        code: code ?? 1,
      });
    });
  });
}

export async function gitOk(
  args: string[],
  options: GitExecOptions
): Promise<string> {
  const result = await gitExec(args, options);
  if (result.code !== 0) {
    throw new Error(
      `git ${args.join(" ")} failed (${result.code}): ${result.stderr || result.stdout}`
    );
  }
  return result.stdout;
}

export async function isGitRepo(cwd: string): Promise<boolean> {
  try {
    const result = await gitExec(["rev-parse", "--is-inside-work-tree"], {
      cwd,
      timeoutMs: 10_000,
    });
    return result.code === 0 && result.stdout.trim() === "true";
  } catch {
    return false;
  }
}
