/** Extra keywords + blurbs for header search (nav ids from Layout). */

export const HEADER_SEARCH_SECTION_LABEL: Record<string, string> = {
  Command: 'Workspace',
  Field: 'On site',
  Reviews: 'Reviews',
  Meetings: 'Meetings',
  Support: 'Support',
  Projects: 'Projects',
  Finance: 'Finance',
};

export type HeaderSearchMeta = {
  hint: string;
  keywords: string[];
};

export const HEADER_SEARCH_META: Record<string, HeaderSearchMeta> = {
  dashboard: {
    hint: 'Portfolio 360° health and project command',
    keywords: ['overview', '360', 'portfolio health', 'home', 'command'],
  },
  site_engineer_dashboard: {
    hint: 'Site engineer home and assigned work',
    keywords: ['dashboard', 'home', 'site', 'overview'],
  },
  my_scopes: {
    hint: 'Your assigned monthly scopes and field tasks',
    keywords: ['scope', 'my work', 'qaqc', 'hse', 'billing', 'assigned'],
  },
  team_projects: {
    hint: 'Project review, schedule, finance, risk, and compliance',
    keywords: ['projects', 'overview', 'executive', 'compliance', 'drawings', 'correspondence'],
  },
  project_init: {
    hint: 'Create a project in the enterprise portfolio',
    keywords: ['initialize', 'create project', 'new project', 'add project'],
  },
  user_management: {
    hint: 'Create and assign users across projects',
    keywords: ['users', 'roles', 'access', 'accounts', 'ho'],
  },
  execution: {
    hint: 'Physical progress charts and site execution',
    keywords: ['site progress', 'execution', 's-curve', 'physical progress'],
  },
  monthly_scope: {
    hint: 'Plan and track monthly scope of work',
    keywords: ['scope', 'monthly', 'plan', 'assign'],
  },
  manpower_management: {
    hint: 'Workforce planned vs actual and histograms',
    keywords: ['manpower', 'labour', 'labor', 'workforce', 'staff'],
  },
  financial_management: {
    hint: 'Cashflow, invoicing, contract values, and cost',
    keywords: ['finance', 'money', 'billing', 'invoice', 'cashflow', 'budget', 'cpi'],
  },
  site_photos: {
    hint: 'Upload and browse on-site construction photos',
    keywords: ['photos', 'images', 'gallery', 'site image'],
  },
  testing_photos: {
    hint: 'QA/QC testing photo records',
    keywords: ['testing', 'qaqc', 'quality', 'lab photos'],
  },
  project_feedback: {
    hint: 'Capture and review project feedback',
    keywords: ['feedback', 'comments', 'notes'],
  },
  machinery_list: {
    hint: 'Plant and machinery register on site',
    keywords: ['plant', 'machinery', 'equipment', 'machines'],
  },
  projects: {
    hint: 'Enterprise portfolio registry of all projects',
    keywords: ['portfolio', 'registry', 'all projects'],
  },
  dpr_records: {
    hint: 'Daily Progress Reports — submit, review, and approve',
    keywords: ['dpr', 'daily', 'daily progress', 'progress report', 'daily report'],
  },
  wpr_records: {
    hint: 'Weekly Progress Reports — review and summary',
    keywords: ['wpr', 'weekly', 'weekly progress', 'week report'],
  },
  mpr_records: {
    hint: 'Monthly Progress Reports — generate, PDF, and Excel',
    keywords: ['mpr', 'monthly', 'monthly progress', 'monthly report'],
  },
  meeting_documents: {
    hint: 'Meeting files, MOM, and EDL documents',
    keywords: ['mom', 'edl', 'meetings', 'minutes', 'documents', 'vault'],
  },
  reminders: {
    hint: 'Project reminders and due-date alarms',
    keywords: ['reminder', 'alarm', 'due', 'follow up'],
  },
  alerts: {
    hint: 'Cross-module activity alerts and history',
    keywords: ['alerts', 'notifications', 'updates', 'inbox'],
  },
};

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const prev = new Array<number>(b.length + 1);
  const curr = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }
  return prev[b.length];
}

/** True when query letters appear in order inside `hay` (not necessarily consecutive). */
function isSubsequence(query: string, hay: string): boolean {
  let i = 0;
  for (let j = 0; j < hay.length && i < query.length; j++) {
    if (hay[j] === query[i]) i++;
  }
  return i === query.length;
}

function subsequenceSpan(query: string, hay: string): number | null {
  let i = 0;
  let start = -1;
  for (let j = 0; j < hay.length; j++) {
    if (hay[j] === query[i]) {
      if (i === 0) start = j;
      i++;
      if (i === query.length) return j - start + 1;
    }
  }
  return null;
}

/** Fraction of query letters that exist in `hay` (order ignored, uses counts). */
function letterCoverage(query: string, hay: string): number {
  const counts = new Map<string, number>();
  for (const ch of hay) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  let matched = 0;
  for (const ch of query) {
    const n = counts.get(ch) ?? 0;
    if (n > 0) {
      counts.set(ch, n - 1);
      matched++;
    }
  }
  return query.length ? matched / query.length : 0;
}

function uniqueJaccard(a: string, b: string): number {
  const setA = new Set(a);
  const setB = new Set(b);
  let overlap = 0;
  setA.forEach((ch) => {
    if (setB.has(ch)) overlap++;
  });
  const union = setA.size + setB.size - overlap;
  return union ? overlap / union : 0;
}

function similarLength(query: string, target: string): boolean {
  const extra = Math.max(2, Math.ceil(query.length * 0.5));
  return Math.abs(query.length - target.length) <= extra;
}

function scoreAgainstHay(q: string, hay: string): number {
  if (!hay) return 0;
  if (hay === q) return 100;
  if (hay.startsWith(q)) return 86;
  if (hay.includes(q)) return 70;

  const tokens = hay.split(/[^a-z0-9]+/).filter(Boolean);
  let best = 0;

  if (tokens.some((t) => t.startsWith(q))) best = Math.max(best, 78);
  if (tokens.some((t) => t.includes(q))) best = Math.max(best, 68);

  if (q.length >= 2 && isSubsequence(q, hay.replace(/[^a-z0-9]/g, ''))) {
    const compact = hay.replace(/[^a-z0-9]/g, '');
    const span = subsequenceSpan(q, compact);
    if (span != null) {
      const tightness = span - q.length;
      if (q.length <= 3 && tightness > q.length * 3) {
        /* short queries must stay reasonably tight */
      } else {
        best = Math.max(best, tightness <= 2 ? 64 : 54);
      }
    }
  }

  const fuzzyTargets = [hay.replace(/[^a-z0-9]/g, ''), ...tokens].filter(
    (t) => t.length >= 3 && similarLength(q, t),
  );

  for (const target of fuzzyTargets) {
    const dist = levenshtein(q, target);
    const maxLen = Math.max(q.length, target.length);
    const similarity = 1 - dist / maxLen;
    const allowed = Math.max(2, Math.floor(q.length * 0.4));
    if (dist <= allowed && similarity >= 0.5) {
      best = Math.max(best, Math.round(44 + similarity * 22));
    }

    if (q.length >= 4) {
      const coverage = letterCoverage(q, target);
      const jaccard = uniqueJaccard(q, target);
      const anagramDist = levenshtein([...q].sort().join(''), [...target].sort().join(''));
      const anagramSim = 1 - anagramDist / Math.max(q.length, target.length);
      if (coverage >= 0.8 && jaccard >= 0.55 && anagramSim >= 0.55) {
        best = Math.max(best, Math.round(42 + anagramSim * 20));
      }
    }
  }

  return best;
}

export function scoreHeaderSearchHit(
  query: string,
  item: {
    id: string;
    label: string;
    section: string;
    hint?: string;
    keywords?: string[];
  },
): number {
  const q = query.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!q) return 0;

  const meta = HEADER_SEARCH_META[item.id];
  const haystacks = [
    item.label,
    item.id.replace(/_/g, ' ').replace(/^dl /, ''),
    HEADER_SEARCH_SECTION_LABEL[item.section] ?? item.section,
    item.hint ?? meta?.hint ?? '',
    ...(item.keywords ?? []),
    ...(meta?.keywords ?? []),
  ].map((s) => s.toLowerCase());

  let best = 0;
  for (const hay of haystacks) {
    best = Math.max(best, scoreAgainstHay(q, hay));
    const compact = q.replace(/\s+/g, '');
    if (compact !== q) best = Math.max(best, scoreAgainstHay(compact, hay));
  }
  return best;
}
