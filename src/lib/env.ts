import { z } from "zod";
import path from "node:path";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(3000),
  DATA_DIR: z.string().default("./data"),
  DATABASE_URL: z.string().optional(),
  MAX_COMMITS: z.coerce.number().default(50_000),
  MAX_CLONE_SIZE_MB: z.coerce.number().default(500),
  CLONE_TIMEOUT_MS: z.coerce.number().default(300_000),
  ANALYZE_TIMEOUT_MS: z.coerce.number().default(600_000),
  MAX_GRAPH_NODES: z.coerce.number().default(80),
  MAX_GRAPH_EDGES: z.coerce.number().default(200),
  MAX_TIMELINE_SAMPLES: z.coerce.number().default(200),
  /** Cap distinct co-change pair keys while scanning (memory bound on huge monorepos) */
  MAX_COCHANGE_PAIRS: z.coerce.number().default(40_000),
  /** Max files considered per commit when building co-change pairs */
  MAX_COCHANGE_FILES_PER_COMMIT: z.coerce.number().default(24),

  /* ── Public-instance abuse controls ── */
  /** Simultaneous clone+analyse jobs. Each costs minutes of CPU and 100s of MB. */
  MAX_CONCURRENT_ANALYSES: z.coerce.number().default(1),
  /** Imports allowed per client per window */
  IMPORT_RATE_LIMIT: z.coerce.number().default(5),
  IMPORT_RATE_WINDOW_MS: z.coerce.number().default(10 * 60_000),
  /** Ceiling on total retained clone bytes; 0 disables the check */
  MAX_TOTAL_CLONE_MB: z.coerce.number().default(2_000),
  /**
   * Keep clones after a successful analysis. Off by default: analysis output is
   * fully self-contained, so retaining clones only buys faster re-analysis at
   * the cost of unbounded disk growth.
   */
  KEEP_CLONES: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),

  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const msg = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`Invalid environment: ${msg}`);
  }
  cached = parsed.data;
  return cached;
}

export function getDataDir(): string {
  const dir = getEnv().DATA_DIR;
  if (path.isAbsolute(dir)) return dir;
  // Scope to project-local data so bundlers do not NFT-trace the whole cwd tree
  return path.join(/*turbopackIgnore: true*/ process.cwd(), dir);
}

export function getDatabasePath(): string {
  const env = getEnv();
  if (env.DATABASE_URL) {
    return path.isAbsolute(env.DATABASE_URL)
      ? env.DATABASE_URL
      : path.join(/*turbopackIgnore: true*/ process.cwd(), env.DATABASE_URL);
  }
  return path.join(getDataDir(), "gitchronicle.db");
}

export function getReposDir(): string {
  return path.join(getDataDir(), "repos");
}

export function getTmpDir(): string {
  return path.join(getDataDir(), "tmp");
}
