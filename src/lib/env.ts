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
