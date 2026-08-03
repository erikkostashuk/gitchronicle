import type { CategoryCount } from "../types/analysis";

export type ChangeCategory = CategoryCount["category"];

const CONVENTIONAL =
  /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\(.+\))?!?:\s*/i;

const KEYWORD_RULES: { category: ChangeCategory; patterns: RegExp[] }[] = [
  {
    category: "feature",
    patterns: [
      /\bfeat(ure)?s?\b/i,
      /\badd(ed|ing)?\b/i,
      /\bimplement(ed|s|ing)?\b/i,
      /\bintroduce[ds]?\b/i,
    ],
  },
  {
    category: "fix",
    patterns: [
      /\bfix(es|ed|ing)?\b/i,
      /\bbug\b/i,
      /\bhotfix\b/i,
      /\bpatch\b/i,
      /\bresolve[ds]?\b/i,
    ],
  },
  {
    category: "refactor",
    patterns: [
      /\brefactor(ed|s|ing)?\b/i,
      /\bclean.?up\b/i,
      /\brestructure\b/i,
      /\bsimplif(y|ied)\b/i,
    ],
  },
  {
    category: "docs",
    patterns: [/\bdocs?\b/i, /\breadme\b/i, /\bdocumentation\b/i, /\btypo\b/i],
  },
  {
    category: "test",
    patterns: [/\btests?\b/i, /\bspec\b/i, /\bcoverage\b/i, /\bjest\b/i, /\bvitest\b/i],
  },
  {
    category: "build",
    patterns: [
      /\bbuild\b/i,
      /\bci\b/i,
      /\bdeps?\b/i,
      /\bdependenc(y|ies)\b/i,
      /\bwebpack\b/i,
      /\bvite\b/i,
      /\bdocker\b/i,
    ],
  },
  {
    category: "chore",
    patterns: [/\bchore\b/i, /\bmaintain\b/i, /\bbump\b/i, /\brelease\b/i],
  },
];

const CONV_MAP: Record<string, ChangeCategory> = {
  feat: "feature",
  fix: "fix",
  docs: "docs",
  style: "chore",
  refactor: "refactor",
  perf: "refactor",
  test: "test",
  build: "build",
  ci: "build",
  chore: "chore",
  revert: "fix",
};

export function categorizeCommit(subject: string, body = ""): ChangeCategory {
  const text = `${subject}\n${body}`.trim();
  const m = subject.match(CONVENTIONAL);
  if (m) {
    const type = m[1]!.toLowerCase();
    return CONV_MAP[type] ?? "other";
  }
  for (const rule of KEYWORD_RULES) {
    if (rule.patterns.some((p) => p.test(text))) {
      return rule.category;
    }
  }
  return "other";
}

export function tallyCategories(
  subjects: { subject: string; body?: string }[]
): CategoryCount[] {
  const counts = new Map<ChangeCategory, number>();
  for (const s of subjects) {
    const cat = categorizeCommit(s.subject, s.body);
    counts.set(cat, (counts.get(cat) ?? 0) + 1);
  }
  const order: ChangeCategory[] = [
    "feature",
    "fix",
    "refactor",
    "docs",
    "test",
    "build",
    "chore",
    "other",
  ];
  return order
    .filter((c) => (counts.get(c) ?? 0) > 0)
    .map((category) => ({ category, count: counts.get(category)! }));
}
