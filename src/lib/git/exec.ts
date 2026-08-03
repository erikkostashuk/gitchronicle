import { spawn } from "node:child_process";
import { logger } from "../logger";

export interface GitExecOptions {
  cwd: string;
  timeoutMs?: number;
  maxBuffer?: number;
  env?: NodeJS.ProcessEnv;
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

    let stdout = "";
    let stderr = "";
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let killed = false;

    const timer = setTimeout(() => {
      killed = true;
      child.kill("SIGKILL");
      reject(new Error(`git ${args[0] ?? ""} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.stdout.on("data", (chunk: Buffer) => {
      stdoutBytes += chunk.length;
      if (stdoutBytes <= maxBuffer) {
        stdout += chunk.toString("utf8");
      }
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderrBytes += chunk.length;
      if (stderrBytes <= maxBuffer) {
        stderr += chunk.toString("utf8");
      }
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      logger.error("git spawn error", { args, error: String(err) });
      reject(err);
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      if (killed) return;
      if (stdoutBytes > maxBuffer || stderrBytes > maxBuffer) {
        reject(
          new Error(
            `git ${args[0] ?? ""} output exceeded max buffer (${maxBuffer} bytes)`
          )
        );
        return;
      }
      resolve({ stdout, stderr, code: code ?? 1 });
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
