const EXT_MAP: Record<string, string> = {
  ts: "TypeScript",
  tsx: "TypeScript",
  js: "JavaScript",
  jsx: "JavaScript",
  mjs: "JavaScript",
  cjs: "JavaScript",
  py: "Python",
  rb: "Ruby",
  go: "Go",
  rs: "Rust",
  java: "Java",
  kt: "Kotlin",
  kts: "Kotlin",
  swift: "Swift",
  c: "C",
  h: "C",
  cpp: "C++",
  cc: "C++",
  cxx: "C++",
  hpp: "C++",
  cs: "C#",
  php: "PHP",
  vue: "Vue",
  svelte: "Svelte",
  css: "CSS",
  scss: "SCSS",
  less: "Less",
  html: "HTML",
  htm: "HTML",
  md: "Markdown",
  mdx: "Markdown",
  json: "JSON",
  yml: "YAML",
  yaml: "YAML",
  toml: "TOML",
  xml: "XML",
  sql: "SQL",
  sh: "Shell",
  bash: "Shell",
  zsh: "Shell",
  ps1: "PowerShell",
  dockerfile: "Docker",
  r: "R",
  scala: "Scala",
  clj: "Clojure",
  ex: "Elixir",
  exs: "Elixir",
  erl: "Erlang",
  hs: "Haskell",
  lua: "Lua",
  dart: "Dart",
  gradle: "Gradle",
  proto: "Protobuf",
  graphql: "GraphQL",
  gql: "GraphQL",
  tf: "Terraform",
  sol: "Solidity",
};

export function languageFromPath(filePath: string): string {
  const base = filePath.split("/").pop()?.toLowerCase() ?? "";
  if (base === "dockerfile" || base.startsWith("dockerfile.")) return "Docker";
  if (base === "makefile") return "Make";
  if (base === "cmakelists.txt") return "CMake";
  const ext = base.includes(".") ? base.split(".").pop()! : "";
  return EXT_MAP[ext] ?? (ext ? ext.toUpperCase() : "Other");
}

export function isIgnorablePath(filePath: string): boolean {
  const lower = filePath.toLowerCase();
  if (lower.includes("node_modules/")) return true;
  if (lower.includes("vendor/")) return true;
  if (lower.includes("/.git/")) return true;
  if (lower.endsWith("package-lock.json")) return true;
  if (lower.endsWith("pnpm-lock.yaml")) return true;
  if (lower.endsWith("yarn.lock")) return true;
  if (lower.endsWith(".min.js") || lower.endsWith(".min.css")) return true;
  return false;
}
