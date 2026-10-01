# UI Section Polish Guide — Cards, Colour & Motion

One reference for making any dashboard section look like the **PMC Head Executive Overview**
("Analytics deep-dive": Progress curve, Financial progress, Status snapshot, Monthly velocity,
Compliance pulse, Correspondence, Manpower, Quality, Contract snapshot, Bottleneck, Schedule
timeline) and the **Project page** sections (KPI strip, Project Dates, Invoicing, Planned vs
Actual, Drawings, Budget vs Cost, Manpower histogram).

Works in **both light and dark theme**. Copy the prompt in §1 into Cursor, attach the section
(DOM path / component), and the agent will apply the same system.

---

## 1. Ready-to-use prompt

> Copy everything inside the block, replace the `<…>` parts, and send it with the section selected.

```text
Polish the <SECTION NAME> section in <path/to/Component.tsx> so it matches the existing
PMC Executive Overview card system described in docs/UI_SECTION_POLISH_GUIDE.md.

Requirements:
1. Card shell
   - Use the shared card class: `pmc-ov-card rounded-2xl pmc360-glass-panel-light|dark`
     (import './pmcHead/executiveOverview.css' or reuse components/projectsMotion.css).
   - Give every card its own accent via CSS vars:
     style={{ '--ov-accent': <hex>, '--ov-delay': `${order * 70}ms` }}
   - Accent strip on top, soft accent glow in the top-right corner, hover lift + tinted shadow.
2. Header
   - Gradient icon chip (accent → navy), UPPERCASE title, small pulsing "live" dot,
     one-line muted subtitle, outlined pill action button with an arrow ("Open", "Details").
3. Content
   - Charts: animated draw (lines 1200ms ease-out, bars 900ms staggered by 120–150ms),
     gradient-filled bars (top 100% → bottom 55% opacity), rounded bar tops (radius 5),
     highlighted active dots (r 4.5, white stroke), legend as small tinted chips.
   - Progress bars: fill animates left→right with a soft glow in the bar colour.
   - Lists: rows slide in one by one (80ms stagger), hover background, arrow appears on hover.
   - Stat tiles: rounded-xl, 3px coloured left border, lift 2px on hover.
4. Status language
   - Every metric shows a status pill: On track (emerald) / Needs attention (amber) /
     Critical (rose, pulsing dot) / No data (slate).
   - Write plain-language meaning lines ("4 of 6 BGs up to date") and a next step
     ("2 overdue — renew to avoid lapses").
5. Empty states
   - Never a bare "No data" line. Use the dashed EmptyState box: floating accent icon,
     bold message, one-line hint telling the user where to add the data.
6. Motion safety
   - Respect prefers-reduced-motion (disable all animation).
   - If a card renders an inline `position: fixed` modal (not via portal), DO NOT leave any
     transform on that card — use opacity/shadow-only motion for it.
7. Keep all data, handlers, navigation and logic unchanged. Match surrounding code style.
   Verify with `npx tsc --noEmit -p .` and check both light and dark theme.
```

---

## 2. Design tokens

### 2.1 Palette (from `PMCExecutiveOverviewPanel.tsx`)

| Token | Hex | Typical use |
|---|---|---|
| navy | `#1e3a5f` | header icon gradient end, neutral accent |
| indigo | `#6366f1` | planned values, financial, BG |
| teal | `#14b8a6` | progress, actual values, cash, quality |
| emerald | `#10b981` | good / safe / on track |
| sky | `#38bdf8` | schedule, correspondence |
| amber | `#f59e0b` | warning, pending, budget |
| rose | `#f43f5e` | critical, overdue, risk |
| violet | `#8b5cf6` | compliance, drawings, manpower |
| slate | `#64748b` | no data / muted |

### 2.2 Status tones

```ts
type StatusTone = 'good' | 'warn' | 'bad' | 'empty';

const STATUS_TONE = {
  good:  { label: 'On track',        color: '#10b981' },
  warn:  { label: 'Needs attention', color: '#f59e0b' },
  bad:   { label: 'Critical',        color: '#f43f5e' },
  empty: { label: 'No data',         color: '#64748b' },
};

const toneFromPct = (pct: number, goodAt: number, warnAt: number): StatusTone =>
  pct >= goodAt ? 'good' : pct >= warnAt ? 'warn' : 'bad';
```

Recommended thresholds: compliance / BG / quality `80 / 50`, cash vs plan `90 / 60`,
drawings approval `75` (on track) .

### 2.3 Typography

| Element | Classes |
|---|---|
| Card title | `text-[11.5px] font-black uppercase tracking-wider` |
| Subtitle | `text-[10px] font-medium text-slate-500` (dark: `text-slate-400`) |
| Big value | `text-[16px]–text-lg font-black tabular-nums` coloured by tone |
| Meaning line | `text-[10.5px] font-bold` |
| Hint / caption | `text-[9px]–text-[10px] font-medium text-slate-500` |
| Pills / chips | `text-[8.5px]–text-[9px] font-black uppercase tracking-wide` |

### 2.4 Light vs dark

| Part | Light | Dark |
|---|---|---|
| Card surface | white + accent radial at 9% | panel bg + accent radial at 16% |
| Border | `rgba(148,163,184,.28)` → hover accent 38% | `white/10` → hover accent 45% |
| Hover shadow | `0 18px 38px -18px accent@55%` | `0 18px 40px -18px accent@60%` |
| Tiles | `border-slate-200/70 bg-white` | `border-white/10 bg-white/[0.06]` |
| Muted text | `text-slate-500` | `text-slate-400` |
| Tinted chip bg | `${color}14` (≈8%) | `${color}26` (≈15%) |

**Light theme needs extra contrast** — white-on-white hides soft tints and white sheens. The
light boost (end of both stylesheets) adds:

- Tinted page surface behind cards (`.pmc-ov-surface`: `#f4f8fc` + teal/indigo/violet blobs)
- Accent wash 14% top-right + 6% bottom-left, accent-tinted border (16%) and shadow at rest
- 4px glowing accent strip; strip re-draws and pulses on hover
- Entrance glow: card arrives with a coloured halo that settles (`pmc-ov-glow-in-light`, fill `backwards` so hover still works)
- Accent-coloured sheen sweep instead of a white one
- Hover: lift 4px + 3px accent ring + coloured shadow
- Project page (no transforms allowed): coloured outline ring "locks in" as each card scrolls into view (`pmc-pm-lock-in`, animates `outline-offset` / `outline-color`)

Hex-alpha shorthand used in inline styles: `14` ≈ 8%, `1a` ≈ 10%, `26` ≈ 15%, `33` ≈ 20%,
`40` ≈ 25%, `55` ≈ 33%.

---

## 3. Building blocks (copy-paste)

### 3.1 Card shell

```tsx
const cardBase = isDark
  ? 'pmc-ov-card rounded-2xl pmc360-glass-panel-dark'
  : 'pmc-ov-card rounded-2xl pmc360-glass-panel-light';

const cardStyle = (accent: string, order: number) =>
  ({ '--ov-accent': accent, '--ov-delay': `${order * 70}ms` }) as React.CSSProperties;

<article className={`p-3 sm:p-4 ${cardBase}`} style={cardStyle('#14b8a6', 0)}>
  …
</article>
```

### 3.2 Section header

```tsx
<div className="mb-3 flex items-start justify-between gap-2">
  <div className="flex min-w-0 items-start gap-2.5">
    <span
      className="pmc-ov-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white"
      style={{ background: `linear-gradient(135deg, ${accent} 0%, #1e3a5f 130%)` }}
    >
      {icon}
    </span>
    <div className="min-w-0 pt-0.5">
      <h3 className="flex items-center gap-1.5 text-[11.5px] font-black uppercase tracking-wider">
        {title}
        <span className="pmc-ov-live" aria-hidden />
      </h3>
      <p className="mt-0.5 text-[10px] font-medium text-slate-500">{subtitle}</p>
    </div>
  </div>
  <button className="pmc-ov-action inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold">
    Open <ArrowRight size={11} />
  </button>
</div>
```

### 3.3 Status pill

```tsx
<span
  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[8.5px] font-black uppercase tracking-wide"
  style={{ color, backgroundColor: `${color}${isDark ? '26' : '14'}`, boxShadow: `inset 0 0 0 1px ${color}40` }}
>
  <span className={`h-1.5 w-1.5 rounded-full ${tone === 'bad' ? 'animate-pulse' : ''}`} style={{ backgroundColor: color }} />
  {label}
</span>
```

### 3.4 Legend chips

```tsx
<span
  className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[9px] font-semibold text-slate-500"
  style={{ backgroundColor: `${color}12`, boxShadow: `inset 0 0 0 1px ${color}26` }}
>
  <span className="h-[3px] w-3.5 rounded-full" style={{ backgroundColor: color }} />
  {label}
</span>
```

### 3.5 Animated progress bar

```tsx
<div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
  <div
    className="pmc-ov-bar-fill h-full rounded-full"
    style={{ width: `${pct}%`, backgroundColor: color, boxShadow: `0 0 10px -2px ${color}` }}
  />
</div>
```

### 3.6 Staggered list row

```tsx
{rows.map((row, i) => (
  <li key={row.id} className="pmc-ov-row" style={{ '--ov-row-delay': `${i * 80}ms` } as React.CSSProperties}>
    …
  </li>
))}
```

### 3.7 Stat tile

```tsx
<div
  className="pmc-ov-tile rounded-xl border border-slate-200/70 bg-white px-2.5 py-2 shadow-sm"
  style={{ borderLeftWidth: 3, borderLeftColor: accent }}
>
  <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
  <p className="mt-1 text-[11px] font-black tabular-nums">{value}</p>
</div>
```

### 3.8 Empty state

```tsx
<div className="pmc-ov-empty flex flex-col items-center justify-center gap-2 rounded-xl px-4 py-4 text-center" style={{ minHeight: 112 }}>
  <span className="pmc-ov-empty-icon flex h-9 w-9 items-center justify-center rounded-full">{icon}</span>
  <p className="text-[11px] font-bold text-slate-600">No manpower trend yet</p>
  <p className="max-w-[18rem] text-[10px] font-medium text-slate-400">
    Add planned and actual headcount in People to see the histogram.
  </p>
</div>
```

### 3.9 Charts (Recharts 2.x)

```tsx
/** Must be a direct chart child (Recharts only renders known children + <defs>). */
const barGradientDefs = (prefix: string, colors: Record<string, string>) => (
  <defs>
    {Object.entries(colors).map(([key, color]) => (
      <linearGradient key={key} id={`${prefix}-${key}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity={1} />
        <stop offset="100%" stopColor={color} stopOpacity={0.55} />
      </linearGradient>
    ))}
  </defs>
);

<BarChart data={data}>
  {barGradientDefs('ov-mp', { planned: '#6366f1', actual: '#f59e0b' })}
  <Bar dataKey="planned" fill="url(#ov-mp-planned)" radius={[5, 5, 0, 0]} animationDuration={900} />
  <Bar dataKey="actual"  fill="url(#ov-mp-actual)"  radius={[5, 5, 0, 0]} animationDuration={900} animationBegin={150} />
</BarChart>

<Line
  type="monotone" dataKey="actual" stroke="#f43f5e" strokeWidth={2.25} dot={false}
  activeDot={{ r: 4.5, strokeWidth: 2, stroke: '#ffffff' }}
  animationDuration={1200} animationEasing="ease-out"
/>
```

Rules: gradient ids must be **unique per chart** (prefix per section); remove
`isAnimationActive={false}` unless the chart re-renders constantly.

### 3.10 KPI count-up (numbers)

```tsx
function CountUp({ value, suffix = '', duration = 900 }: { value: number; suffix?: string; duration?: number }) {
  const [display, setDisplay] = React.useState(0);
  React.useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !Number.isFinite(value) || value === 0) { setDisplay(value); return; }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setDisplay(Math.round(value * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);
  return <span className="tabular-nums">{display}{suffix}</span>;
}
```

---

## 4. Animation catalogue

Both stylesheets already exist — reuse, don't duplicate:

- `components/pmcHead/executiveOverview.css` → `.pmc-ov-*` (Executive Overview cards)
- `components/projectsMotion.css` → `.pmc-motion-page`, `.pmc-pm-*` (Project page sections)

| Class | Effect | Timing |
|---|---|---|
| `.pmc-ov-card` | rise + fade in (14px, scale .985 → 1), staggered by `--ov-delay` | 560ms `cubic-bezier(.22,1,.36,1)` |
| `.pmc-ov-card::before` | 3px accent strip draws left → right | 900ms, +180ms delay |
| `.pmc-ov-card:hover` | lift 3px, accent border, tinted shadow, light sheen sweep | 320ms / sheen 1100ms |
| `.pmc-ov-icon` | header icon tilts −6°, scales 1.08 on card hover | 360ms spring |
| `.pmc-ov-live` | pulsing ping dot next to title | 1.8s infinite |
| `.pmc-ov-bar-fill` | progress bar grows from 0 | 1100ms, +260ms |
| `.pmc-ov-row` | list row slides in from left, `--ov-row-delay` stagger | 480ms |
| `.pmc-ov-tile` | small tile lifts 2px on hover | 260ms |
| `.pmc-ov-empty-icon` | empty-state icon floats up/down | 3.2s infinite |
| `.dashboard-card-top-accent` (in `.pmc-motion-page`) | existing strip grows in + slow flowing shimmer | 900ms + 7s loop |
| section cards (in `.pmc-motion-page`) | opacity fade on scroll (`animation-timeline: view()`), fallback fade on load | entry 0–45% |
| `.pmc-pm-kpi` | KPI card rise + accent top line + hover lift | 560ms, 70ms stagger |
| `.pmc-pm-kpi-alert` | pulsing ring behind icon for red KPIs | 2.2s infinite |
| `.pmc-pm-bar` | KPI bar grows from 0 | 1100ms |
| `.pmc-pm-tile` | metric box lift + accent border on hover | 260ms |
| Recharts bars | brighten + drop shadow on hover | 200ms |

Stagger guidance: cards `70ms × order`, list rows `80ms × index`, chart series `120–150ms`.

---

## 5. Motion safety checklist

1. **Reduced motion** — every new animation must be listed in the
   `@media (prefers-reduced-motion: reduce)` block (set `animation: none`, remove hover transforms).
   Don't blanket-disable `*` — that also kills loading spinners.
2. **Inline modals** — any `transform` (including `translate`/`scale` left by `animation-fill-mode`)
   makes the card the containing block for `position: fixed` children. For cards that render
   modals without `createPortal`, use opacity / box-shadow / border-color only.
   Keyframes that do move should end at `transform: none`.
3. **Overflow** — don't add `overflow: hidden` to cards that host dropdowns/popovers; draw strips
   with an absolutely positioned child or inset box-shadow instead.
4. **Existing accents** — many cards already render `<DashboardCardTopAccent />`
   (`.dashboard-card-top-accent`). Restyle that strip rather than adding a second one.
5. **Background images** — `.pmc360-glass-panel-*` sets `background-image: none` in
   `index.html`; the `.pmc-ov-card.pmc360-glass-panel-*` selector intentionally overrides it.
   A Tailwind `bg-gradient-*` on the same card will be replaced.
6. **Performance** — animate only `opacity`, `transform`, `box-shadow`, `filter`;
   avoid animating `width/height` on large tables.

---

## 6. Copy & content rules

- Lead with meaning, not raw numbers: "4 of 6 BGs up to date", "Collections ahead of plan".
- Second line = what to do next: "2 overdue — renew to avoid lapses", "Log monthly HSE data".
- Status labels: **On track · Needs attention · Critical · No data** — keep them consistent.
- Action links say the destination: "Review BGs", "View cashflow", "Open HSE", "View drawings";
  empty variants say the setup step: "Add BG", "Update cashflow", "Log HSE data".
- Empty states always include a hint pointing to the module where data is entered.

---

## 7. Done checklist (per section)

- [ ] Card uses `pmc-ov-card` (or is covered by `.pmc-motion-page` selectors) with its own accent
- [ ] Header: gradient icon, title + live dot, subtitle, pill action
- [ ] Every metric has a tone colour + status pill or coloured value
- [ ] Charts animate, bars use gradient fills, legend uses chips
- [ ] Lists stagger in; tiles lift on hover
- [ ] Empty state uses the dashed EmptyState with a hint
- [ ] Looks right in **light and dark** theme
- [ ] `prefers-reduced-motion` respected; no transforms left on modal-hosting cards
- [ ] `npx tsc --noEmit -p .` passes; data/handlers unchanged
