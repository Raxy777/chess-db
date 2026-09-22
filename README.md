# TheoryDB — Chess Opening Theory Database

A Next.js app for browsing chess openings as a **real theory database** — not a flat CSV list.
Lichess opening lines are imported once into SQLite (via Prisma), collapsed into **141 families**,
merged into a **position move-tree keyed by EPD** (so transpositions collapse into one node),
and served with DB-side search, filtering, and pagination.

After seeding: **~141 families · ~3,520 lines · ~7,244 positions · ~7,418 theory moves ·
~36,981 opening–position membership rows.**

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Database schema](#database-schema)
- [Taxonomy: families, variations, categories](#taxonomy-families-variations-categories)
- [Positions, EPD, and transpositions](#positions-epd-and-transpositions)
- [Routes and UI](#routes-and-ui)
- [Repository API (`lib/openings-repo.ts`)](#repository-api-libopenings-repots)
- [Seed pipeline (`scripts/seed.mjs`)](#seed-pipeline-scriptsseedmjs)
- [Project structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Setup](#setup)
- [Scripts](#scripts)
- [Configuration](#configuration)
- [Data sources and curated content](#data-sources-and-curated-content)
- [Development notes](#development-notes)
- [Troubleshooting](#troubleshooting)
- [Roadmap and known limitations](#roadmap-and-known-limitations)

## Features

- **Family-first browsing:** 141 families (e.g. Sicilian Defense, Ruy Lopez) instead of ~3,500
  duplicate flat cards. Each family page lists all its lines with boards.
- **Line detail pages** (`/opening/[slug]`): PGN, ECO, ply count, variation labels, step-through
  board explorer, continuations aggregated from the move tree, transposing lines (same EPD),
  traps and notes where curated content exists.
- **Theory explorer** (`/explore?epd=…`): walk the `Position → PositionMove → Position` tree from
  the start position; every move shows how many lines use it.
- **DB-side search and filters:** name / ECO / family-name search, plus system category, family,
  ECO prefix, and White-first-move filters (`e4/d4/c4/Nf3/g3/f4/b3` + `Other` for uncommon first
  moves), with `skip/take` pagination (24 per page).
- **Static prerender of theory pages:** all ~141 family and ~3,520 opening pages are generated at
  build time via `generateStaticParams`; `/` and `/explore` stay dynamic.
- **Move-based categorization** (`lib/opening-core.mjs`, re-exported by `lib/taxonomy.ts`): OPEN / SEMI_OPEN / CLOSED / INDIAN / FLANK /
  IRREGULAR derived from actual moves — ECO codes are kept as data, not as the category.
- **Tested core:** Vitest suite (`tests/`, `pnpm test`) pins down EPD normalization, slugify,
  name parsing, first-move bucketing, categorization, and the shared `formatSans`/`serialize` helpers.
- **Curated enrichment:** `app/data/openings-with-stats.json` is merged at seed time into family
  descriptions, historical notes, key ideas, traps, and named variations.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15.2.4 (App Router), React 19 |
| Database | SQLite file DB via Prisma 6.2.1 (`prisma/dev.db`) |
| ORM | Prisma Client (`lib/db.ts` singleton with dev hot-reload guard) |
| Chess logic | `chess.js` (PGN replay, SAN/UCI/FEN generation), `react-chessboard` (boards) |
| UI | Tailwind CSS, shadcn/ui (`components/ui/*`: badge, button, card, skeleton, tabs), `lucide-react` icons |
| Package manager | pnpm (`pnpm-lock.yaml`) |
| Language | TypeScript (strict), plus dependency-free plain-Node ESM (`lib/opening-core.mjs`, `scripts/seed.mjs`) |
| Testing | Vitest 2 (`tests/*.test.ts`, `pnpm test`) |
| Lint | ESLint (`eslint-config-next`), enforced by `next build` |

## Architecture

```
app/data/*.tsv                  seed source only (lichess-org/chess-openings, eco/name/pgn)
app/data/openings-with-stats.json + openings.json
        │  scripts/seed.mjs (one-time ETL: tokenize PGN → chess.js replay →
        │  family/variation split → slugify → curated merge → EPD trie build →
        │  opening–position membership rows). Imports pure helpers from
        │  lib/opening-core.mjs (no TS loader needed under plain Node).
        ▼
prisma/dev.db (SQLite, gitignored)
  ├── OpeningFamily ──< Opening ──< Trap / NamedVariation
  │                      │  ∧
  │                      │  │ OpeningPosition (openingId × epd, indexed)
  │                      │  │ "lines through this position" without scanning JSON
  ├── Position (EPD PK) ─┘  (canonical opening + line counts)
  │     ▲  │
  │     └──┴── PositionMove (fromEpd + uci unique, openingCount)
  └── KeyIdea (familyId, side=white|black)
        │  lib/opening-core.mjs (slugify, parseOpeningName, categorize, whiteFirstOf, toEpd —
        │  single source of truth, dependency-free)
        │  lib/taxonomy.ts (typed re-export + CATEGORY_LABEL) · lib/format.ts (formatSans, serialize)
        │  lib/openings-repo.ts (server-only Prisma queries)
        ▼
app/page.tsx (dynamic server: getStats + getFamiliesWithCounts + getOpeningsList → serialize → client)
  → app/HomePageClient.tsx ("use client": search, filters, families/lines views, pagination)
app/family/[slug]/page.tsx (SSG via generateStaticParams) → StaticBoard (client wrapper)
app/opening/[slug]/page.tsx (SSG via generateStaticParams) → OpeningBoardExplorer (client)
app/explore/page.tsx (dynamic server, ?epd=) → ExploreClient (client tree walker)
```

Key design decisions:

1. **CSV is a build input, never a runtime dependency.** The old approach (`fs.readdir` +
   thousands of `chess.js` replays per pageview) meant slow TTFB and Edge-incompatible `fs`
   usage. Now parsing happens once in `pnpm db:setup`; requests only run indexed Prisma queries.
2. **Stable slugs, not array indexes.** Old IDs like `tsv-${file}-${index}` broke across
   reorders. Now `slugify(name)` (+ ECO/counter on collision) gives shareable URLs.
3. **Positions are first-class.** `Position.epd` is the primary key; `PositionMove` edges carry
   `openingCount`, so the explorer and "continuations" tabs aggregate across all lines.

## Database schema

Defined in `prisma/schema.prisma` (`provider = "sqlite"`, `url = env("DATABASE_URL")`).

- **`OpeningFamily`** — one row per opening family (`Sicilian Defense`).
  Fields: `id (cuid)`, `slug @unique`, `name @unique`, `category (OpeningCategory)`,
  `ecoStart/ecoEnd` (min/max ECO across member lines), `description`, `popularity`,
  `historicalNotes`, `whiteFirst` (modal first move), `lineCount`, timestamps.
  Relations: `openings[]`, `keyIdeas[]`, `positions[]`.
- **`Opening`** — one row per TSV line (a concrete theory line).
  Fields: `slug @unique`, `eco?`, `name`, `familyId → OpeningFamily (Cascade)`,
  `variation?`, `subVariation?`, `pgn`, `sanMoves` (JSON string array),
  `uciMoves` (JSON string array, `from+to+promotion`), `epds` (JSON string array, one per
  ply including start), `fen` (final), `epd` (final, transposition key), `ply`,
  `whiteFirst`, `category`, `description`.
  Indexes: `familyId`, `eco`, `epd`, `name`, `category`, `ply`.
  Relations: `traps[]`, `variations[]` (i.e. `NamedVariation`), `positions[]` (membership rows).
- **`OpeningPosition`** — membership edge: which openings pass through a given EPD.
  Fields: `openingId → Opening (Cascade)`, `epd`, `ply` (ply at which the opening reaches it).
  Constraints: `@@unique([openingId, epd])` (deduped at seed with a per-opening `Set`),
  indexes on `epd` and `openingId`. This replaces scanning the JSON `epds` column with
  `contains` — `getPositionExplorer` now does an indexed lookup capped at 30 lines.
- **`Position`** — one row per unique EPD reachable from any line, including the start.
  Fields: `epd @id`, `fen` (exact final FEN for endpoints, `${epd} 0 1` approximation for
  intermediates), `ply`, `eco?`, `familyId? → OpeningFamily (SetNull)`,
  `canonicalOpeningId?`, `canonicalName?` (first line that created the node),
  `totalLines` (number of line-occurrences passing through).
  Indexes: `familyId`, `ply`. Relations: `children[]` / `parents[]` (`PositionMove`).
- **`PositionMove`** — one directed theory edge.
  Fields: `fromEpd → Position (Cascade)`, `san`, `uci`, `toEpd → Position (Cascade)`,
  `openingCount` (lines using this move in this position).
  Constraints: `@@unique([fromEpd, uci])`, indexes on `fromEpd`, `toEpd`.
- **`KeyIdea`** — curated family-level idea. `familyId → OpeningFamily (Cascade)`,
  `side` (`"white" | "black"` free string), `text`. Index on `familyId`.
- **`Trap`** — attached to a best-match `Opening`. `name`, `description`, `triggerUci?`,
  `trapSan?`, `sequenceSan` (JSON string), `penalty Int`. Index on `openingId`.
- **`NamedVariation`** — attached to a best-match `Opening`. `name`, `sanMoves` (JSON string),
  `fen`, `description`. Index on `openingId`.
- **`OpeningCategory` enum:** `OPEN`, `SEMI_OPEN`, `CLOSED`, `INDIAN`, `FLANK`, `IRREGULAR`.

JSON arrays are stored as `String` columns containing `JSON.stringify(...)` and parsed with
`JSON.parse` at render time (see `LineCard`, family page, opening page). This keeps the SQLite
schema simple and the seed fast.

## Taxonomy: families, variations, categories

Implemented once in `lib/opening-core.mjs` — dependency-free plain ESM so both consumers can
share it exactly: the Next.js app via the typed re-export in `lib/taxonomy.ts`, and
`scripts/seed.mjs` via direct import (no TS loader needed under plain Node). Covered by
`tests/opening-core.test.ts`.

- **`parseOpeningName(name)`** — split on the first `:` for the family, then on `,` for
  variation/sub-variation. Example: `"Sicilian Defense: Najdorf, Byrne (English) Attack"` →
  `{ family: "Sicilian Defense", variation: "Najdorf", subVariation: "Byrne (English) Attack" }`.
  Names without `:` become a single-member family.
- **Family roll-up** — the seed groups all lines by `family`, assigns the modal `category` and
  `whiteFirst`, computes `ecoStart/ecoEnd` (sorted min/max), and sets `lineCount`.
- **`categorize(sanMoves)`** — from the first two SAN moves (with `+`/`#` stripped):
  `e4 e5 → OPEN`; `e4 <other> → SEMI_OPEN`; `d4 d5 → CLOSED`; `d4 Nf6 → INDIAN`;
  other `d4 … → CLOSED`; `c4/Nf3/g3/b3/f4 first → FLANK`; else `IRREGULAR`.
- **`whiteFirstOf(sanMoves)`** — first SAN bucketed to `WHITE_FIRST_MOVES`
  (`e4/d4/c4/Nf3/g3/f4/b3`); anything else (e.g. `1.a3`, `1.e3`) and empty lines bucket to
  `"other"`. The home-page filter exposes all seven moves plus `Other`, so the ~123
  uncommon-first-move lines stay reachable.
- **`slugify(input)`** — lowercase, NFKD strip diacritics, non-`[a-z0-9]` → `-`, trim, ≤80 chars.
  Collisions get `-2`, `-3`, … (openings fall back to `name + eco` as the slug base).
- **`toEpd(fen)` / `START_EPD` / `START_FEN`** — `fen.split(" ").slice(0, 4).join(" ")`
  (board + turn + castling + en-passant; half/fullmove clocks dropped).

Human labels live in `CATEGORY_LABEL` (in `lib/taxonomy.ts`) and are reused by the home and
family pages. `formatSans` (numbered `1. e4 e5 2. Nf3` rendering) and `serialize`
(server→client `Date`-safe clone) live in `lib/format.ts` (`tests/format.test.ts`).

## Positions, EPD, and transpositions

An EPD (first four FEN fields) identifies a *position*; a FEN identifies a position *plus*
clock state. Two move orders reaching the same board (e.g. transposed move orders) share one
EPD, hence one `Position` row — that is how transpositions collapse.

Concretely, each seeded line stores its full `epds[]` chain (start EPD + one per half-move).
The seed walks every chain: nodes go in `posMap` (with `totalLines` incremented per visit),
edges go in `edgeMap` keyed by `fromEpd|uci` (with `openingCount` incremented). The start node
ends with `totalLines = <number of lines>`. A final pass writes one `OpeningPosition` row per
unique `(opening, EPD)` pair, so "lines through this position" is an indexed join instead of a
JSON substring scan. Opening detail's "continuations" and "lines here" tabs, and the whole
`/explore` tree, read directly from these aggregates.

## Routes and UI

Rendering model: `/family/[slug]` and `/opening/[slug]` export `generateStaticParams` (slugs
from `getAllFamilySlugs` / `getAllOpeningSlugs`) and prerender to static HTML at build time —
so **`pnpm build` requires a seeded DB to be present**. New slugs added after a build still
render on demand (no `dynamicParams = false`). `/` and `/explore` stay dynamic
(`searchParams` must be read per request). Shared `error.tsx` / `loading.tsx` (skeleton cards)
 / `not-found.tsx` boundaries cover all routes.

| Route | File | Behavior |
|---|---|---|
| `/` | `app/page.tsx` + `app/HomePageClient.tsx` | Server reads `q, category, family, eco, whiteFirst, page, view` (`Promise<SearchParams>`, Next 15) and runs `getStats`, `getFamiliesWithCounts`, `getOpeningsList` in parallel. Results are `serialize()`d (Prisma `Date`s) into the client component, which renders stats header, search box, collapsible filters (system / family / ECO prefix / White first incl. `Other`), `view=openings` line cards (board thumbnail, SAN preview, ECO/family/ply badges, links) with Prev/Next pagination, or `view=families` family cards (ECO range, category label, line counts). |
| `/family/[slug]` | `app/family/[slug]/page.tsx` | SSG. `getFamilyBySlug(slug)` (`notFound()` if missing). Header (ECO range, category label, line count), description + historical notes, White/Black key-idea columns, grid of member lines each with `StaticBoard` + SAN preview linking to the line. |
| `/opening/[slug]` | `app/opening/[slug]/page.tsx` | SSG. `getOpeningBySlug` + `getPositionExplorer(opening.epd)`. Header badges (ECO, family, category, ply, variation) + raw PGN. `OpeningBoardExplorer` (client, simplified props: `sans`/`epds`/`finalFen`/`moves`): reconstructs positions ply-by-ply with `chess.js`, Start/Prev/Next/End controls, SAN-so-far readout, plus final-position children linking into `/explore`. Tabs: Theory (children with `openingCount` → canonical name), Lines here (≤30 transposing lines via `OpeningPosition`, current badged), Traps, Notes (+ family key ideas). |
| `/explore` | `app/explore/page.tsx` + `components/explore-client.tsx` | Dynamic. `?epd=` (URI-encoded, defaults to `START_EPD` from the shared core). `getPositionExplorer(epd)`; unknown EPD renders a fallback card with Back-to-start. Otherwise a board + EPD readout, move buttons (SAN + line counts → canonical name) that push the child EPD onto history and navigate, Back/Reset, and a lines-through-here list. |

Shared client board: `components/static-board.tsx` (`"use client"` wrapper around
`react-chessboard` with dragging/arrows off) exists because server components cannot import
`react-chessboard` directly (it needs React context — importing it in a server component broke
`next build` for `/family/[slug]`).

## Repository API (`lib/openings-repo.ts`)

Server-only (imports `lib/db.ts`). All functions are `async` Prisma queries:

- `getFamiliesWithCounts(category?)` — families ordered by `lineCount desc, name asc` with
  `_count.openings`. Powers the family filter dropdown and `view=families`.
- `getOpeningsList({ query, category, familySlug, ecoPrefix, whiteFirst, page, perPage })` —
  builds an `AND` filter (`category`, `family.slug`, `eco startsWith`, `whiteFirst`,
  `OR(name contains, eco contains, family.name contains)`), returns
  `{ total, openings (with family, ordered ply asc/name asc, skip/take), totalPages }`.
- `getOpeningBySlug(slug)` — opening + `family.keyIdeas` + `traps` + `variations`.
- `getFamilyBySlug(slug)` — family + `openings (ply asc, with traps)` + `keyIdeas`.
- `getPositionExplorer(epd)` — `Position` + `family` + `children (with to, openingCount desc)`,
  plus ≤30 transposing `Opening`s via the indexed `OpeningPosition` join
  (`where: { epd }`, ordered by `opening.ply`), each with its family.
  Returns `null` for unknown EPDs.
- `getStats()` — parallel counts of families / openings / positions / moves for the header.
- `getAllOpeningSlugs()` / `getAllFamilySlugs()` — slug lists for `generateStaticParams`
  (static prerender of all theory pages).

## Seed pipeline (`scripts/seed.mjs`)

Run with `pnpm db:seed` (after `pnpm db:push`). It wipes and rebuilds all theory tables, so
re-running is safe but destructive. Pure chess/taxonomy helpers are imported from
`../lib/opening-core.mjs` (not duplicated). Steps and logs:

1. **Read TSVs** (`app/data/*.tsv`, `eco\tname\tpgn` header skipped): logs
   `Parsed N TSV rows from a.tsv,b.tsv,…`.
2. **Load curated JSON** (`openings-with-stats.json`, then `openings.json` if present): logs
   `Loaded M curated entries`.
3. **Delete existing rows** in dependency order (moves → positions → opening–position
   membership → traps → named variations → key ideas → openings → families).
4. **Replay every PGN** (`tokenizePgn` strips move numbers/results; `game.move(tok,
   { strict: false })` with fallback): produces `sanMoves`, `uciMoves` (`from+to+promotion`),
   per-ply `epds`, final `fen/epd`, `ply`. Lines with zero legal moves are dropped; logs
   `Valid lines: X, families: Y`.
5. **Create families** with modal category/whiteFirst, ECO min/max, `lineCount`.
6. **Merge curated families** by slug (exact, then substring match both directions): sets
   `description`/`historicalNotes`/`popularity` (truncated) and inserts up to 12 key ideas.
7. **Create openings** in batches of 200 via `createMany` (`Openings N/M` progress logs),
   then re-reads them for IDs.
8. **Attach traps / named variations** to the best-matching opening (exact final-EPD match on
   curated `fen`, else slug match), capped at 5 traps / 8 variations per curated entry.
9. **Build the trie** in memory (`Positions: P, edges: E`), `createMany` in 500-row batches
   with progress logs (`Positions …/…`, `Moves …/…`).
10. **Build opening–position membership** — one row per unique `(opening, EPD)` pair
    (deduped per opening with a `Set`), `createMany` in 500-row batches
    (`Membership …/…`, then `Membership rows: N`), then logs
    `Done: { families, openings, positions, moves }`.

Expect roughly half a minute on a typical laptop. Invalid PGN tokens are skipped silently
(move-level), malformed TSV lines (not exactly 3 tab columns) are skipped.

## Project structure

```
app/
  page.tsx                    dynamic home: parses search params, parallel repo queries, serialize → client
  HomePageClient.tsx          "use client": search, filters (incl. Other first move), families/lines views, pagination
  layout.tsx                  <html class="dark">, global metadata + globals.css
  globals.css
  error.tsx / loading.tsx / not-found.tsx   route boundaries (retry, skeleton cards, 404)
  family/[slug]/page.tsx      SSG family detail (server) + StaticBoard grid
  opening/[slug]/page.tsx     SSG line detail (server) + OpeningBoardExplorer + tabs
  explore/page.tsx            dynamic position explorer entry (server, ?epd=) + ExploreClient
  data/                       SEED INPUT ONLY: a.tsv…e.tsv, openings*.json (not read at runtime)
components/
  static-board.tsx            "use client" react-chessboard wrapper (server-page safe)
  opening-board-explorer.tsx  "use client" ply stepper (chess.js reconstruction)
  explore-client.tsx          "use client" move-tree walker with history
  ui/                         pruned shadcn/ui set actually used: badge, button, card, skeleton, tabs
lib/
  opening-core.mjs            dependency-free pure helpers (single source of truth for app + seed)
  taxonomy.ts                 typed re-export of the core + CATEGORY_LABEL
  format.ts                   formatSans + serialize (server→client boundary)
  db.ts                       PrismaClient singleton
  openings-repo.ts            server-only query layer (see above)
prisma/
  schema.prisma               full schema (see Database schema)
  dev.db*                     generated SQLite file (gitignored — seed it via db:setup)
scripts/
  seed.mjs                    one-time ETL described above
tests/
  opening-core.test.ts        EPD, slugify, name parsing, first-move buckets, categorization (16 tests)
  format.test.ts              formatSans + serialize (5 tests)
vitest.config.ts / .eslintrc.json   test runner (`@` alias) / Next lint config
```

## Prerequisites

- Node.js 20+ (developed on Node 20.14) and pnpm 9+.
- No external database or API keys. SQLite file is created locally; chess visuals are
  client-rendered.

## Setup

```bash
pnpm install
cp .env.example .env        # Windows PowerShell: Copy-Item .env.example .env
pnpm db:setup               # prisma db push + node scripts/seed.mjs (~30 s, wipes + rebuilds theory tables)
pnpm test                   # 21 Vitest tests for the taxonomy/format core
pnpm dev                    # http://localhost:3000
```

Production check:

```bash
pnpm build
pnpm start                  # serves the production build on http://localhost:3000
```

Browse the data directly:

```bash
pnpm db:studio              # Prisma Studio table browser
```

## Scripts

| Script | Command | Purpose |
|---|---|---|
| `dev` | `next dev` | Local dev server |
| `build` / `start` | `next build` / `next start` | Production build (prerenders ~3,666 static theory pages — needs a seeded DB) / serve |
| `lint` | `next lint` | ESLint |
| `test` / `test:watch` | `vitest run` / `vitest` | Test suite (21 tests) / watch mode |
| `db:push` | `prisma db push` | Sync `prisma/schema.prisma` to the SQLite file (no migration files) |
| `db:seed` | `node scripts/seed.mjs` | Wipe + rebuild all theory content (~30 s) |
| `db:setup` | `prisma db push && node scripts/seed.mjs` | First-time setup / full reset |
| `db:studio` | `prisma studio` | Visual DB browser |

`package.json` also declares `"prisma": { "seed": "node scripts/seed.mjs" }` so
`prisma db seed` works equivalently.

## Configuration

- `.env` (gitignored; copy from `.env.example`):
  `DATABASE_URL="file:./dev.db"` — path resolves relative to `prisma/`, so the live file is
  `prisma/dev.db` (+ `-journal`). `*.db`, `*.db-journal`, and `prisma/dev.db*` are gitignored;
  each clone runs `pnpm db:setup` to generate its own copy.
- **Switching to Postgres:** change `datasource db` in `prisma/schema.prisma` to
  `provider = "postgresql"` with a Postgres `DATABASE_URL`, then re-run `pnpm db:setup`.
  No application code changes are needed — all access goes through `lib/openings-repo.ts`.
- `next.config.mjs`: ESLint and TypeScript errors **fail** the build
  (`ignoreDuringBuilds: false`, `ignoreBuildErrors: false` — do not revert to `true` to work
  around a red build), `images.unoptimized`.
- `app/layout.tsx`: dark mode by default (`<html className="dark">`), site-wide title/description.

## Data sources and curated content

- **Bulk lines:** `app/data/a.tsv`…`e.tsv` (`eco`, `name`, `pgn`) from
  [lichess-org/chess-openings](https://github.com/lichess-org/chess-openings), split A–E by ECO
  initial. These are seed inputs only — the app never reads them at request time.
- **Curated content:** `app/data/openings-with-stats.json` (richer entries: descriptions,
  popular-move stats, `mainLineMoves` in UCI, traps, named variations with FENs, White/Black
  key ideas, historical notes) plus the smaller `openings.json`. The seed fuzzy-matches these
  onto families/lines as described in the seed pipeline.
- **To enrich theory:** edit the curated JSON (or rows directly in `pnpm db:studio`) and re-run
  `pnpm db:seed`. Field-length caps are applied at seed time (descriptions/notes ≤2000 chars,
  ideas ≤1000, trap/variation names ≤200). Give curated entries accurate `fen` values where
  possible — exact-EPD matching beats slug matching for trap/variation placement.

## Development notes

- **Server/client split:** pages under `app/` are async server components that query Prisma
  directly; interactive pieces (`HomePageClient`, `OpeningBoardExplorer`, `ExploreClient`,
  `StaticBoard`) are `"use client"`. Never import `react-chessboard` (or `lib/db.ts` /
  `lib/openings-repo.ts`) into a server component except through these client wrappers.
- **Serialization boundary:** Prisma models carry `Date` objects; every page does
  `JSON.parse(JSON.stringify(data))` before passing props to client components.
- **Next 15 params:** `searchParams` and route `params` are `Promise`s — pages `await` them
  (`app/page.tsx`, `app/explore/page.tsx`, `app/family/[slug]/page.tsx`,
  `app/opening/[slug]/page.tsx`).
- **EPD in URLs:** always `encodeURIComponent` the EPD (it contains spaces and slashes);
  pages `decodeURIComponent` it back. See `OpeningBoardExplorer` and `ExploreClient`.
- **Board reconstruction:** intermediate FENs are rebuilt client-side with `chess.js` from
  `sanMoves` rather than shipped per ply; stored per-position `fen` values are exact only for
  line endpoints.
- **Pagination clamps:** `page = max(1, Number(page) || 1)`; `totalPages` is at least 1;
  Prev/Next buttons disable at the bounds.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `Environment variable not found: DATABASE_URL` (prisma/studio) | Missing `.env` — `Copy-Item .env.example .env` (PowerShell) or `cp .env.example .env`, then `pnpm db:setup`. |
| Empty lists / counts are 0 | DB file exists but was never seeded — run `pnpm db:seed`. (The `.db` file is gitignored, so every fresh clone must seed.) |
| Crash on opening/explore pages mentioning `openingPosition`, or `whiteFirst: "other"` lines missing | Schema changed after your last setup — re-run **`pnpm db:setup`** (`db push` for the new table, then a full reseed for the new bucketing). Required after pulling any `prisma/schema.prisma` or seed change. |
| `pnpm build` fails querying the DB / prerender errors | The build statically generates all theory pages, so it needs a **seeded** DB at build time — run `pnpm db:setup` first, including on CI/deploy hosts. |
| `Unknown position <epd>` on `/explore` | Hand-typed or stale EPD with no seeded lines through it — use Back to start and navigate via move buttons. |
| `(0, c.createContext) is not a function` for `/family/[slug]` | Regression: `react-chessboard` imported in a server component — route boards through `components/static-board.tsx`. |
| `pnpm add`/install timeouts on Windows | Retry with a longer timeout; Prisma downloads engine binaries on first install (`pnpm add -D prisma`, then `pnpm add @prisma/client`, then `pnpm prisma generate`). |
| Port 3000 in use (`pnpm dev`) | Another dev server is running — stop it or run `pnpm dev -- -p 3001`. |
| `prisma dev.db*` showing in `git status` | Should be ignored (`*.db`, `prisma/dev.db*` in `.gitignore`) — check you haven't force-added it. Commit `.env.example`, never `.env`. |

## Roadmap and known limitations

- Ranked full-text search is still `contains` on name/ECO/family; a dedicated search index is
  the next retrieval upgrade (the position-lookup join table is done).
- Curated coverage is thin: only families matching `openings-with-stats.json` get descriptions,
  ideas, traps, and variations; most of the 141 families show bare ECO ranges. Expanding the
  curated JSON (or adding an admin editing flow) is the highest-value content work.
- Intermediate `Position.fen` values are `${epd} 0 1` approximations; only endpoints carry exact
  clocks. The UI reconstructs exact boards via `chess.js`, so this affects API consumers only.
- No auth, no user repertoires/training persistence, no engine evaluation yet.
- `db push` is used instead of versioned migrations; adopt `prisma migrate` before multi-
  environment or Postgres production use.
- Full SSG (~3,666 pages) keeps pages fast but makes builds DB-dependent and slower; if that
  hurts, switch detail routes to `dynamicParams` + ISR instead of prerendering everything.
