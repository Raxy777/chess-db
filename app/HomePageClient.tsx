"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Chessboard } from "react-chessboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Filter, Database, GitBranch, Layers, Search } from "lucide-react";
import { CATEGORY_LABEL } from "@/lib/taxonomy";

interface Props {
  stats: { families: number; openings: number; positions: number; moves: number };
  families: Array<{
    id: string; slug: string; name: string; category: string;
    ecoStart: string | null; ecoEnd: string | null;
    lineCount: number; description: string | null;
    _count: { openings: number };
  }>;
  openings: Array<{
    id: string; slug: string; eco: string | null; name: string;
    ply: number; fen: string; whiteFirst: string | null; category: string;
    sanMoves: string; family: { slug: string; name: string };
  }>;
  total: number;
  totalPages: number;
  page: number;
  query: string;
  category: string;
  familySlug: string;
  ecoPrefix: string;
  whiteFirst: string;
  view: string;
}

const CATS = [
  { v: "all", l: "All systems" },
  { v: "OPEN", l: "Open · 1.e4 e5" },
  { v: "SEMI_OPEN", l: "Semi-Open · 1.e4" },
  { v: "CLOSED", l: "Closed · 1.d4 d5" },
  { v: "INDIAN", l: "Indian · 1.d4 Nf6" },
  { v: "FLANK", l: "Flank · 1.c4/Nf3" },
  { v: "IRREGULAR", l: "Irregular" },
];

export function HomePageClient(p: Props) {
  const router = useRouter();
  const [q, setQ] = useState(p.query);
  const [showFilters, setShowFilters] = useState(false);

  const push = (patch: Record<string, string>) => {
    const params = new URLSearchParams();
    const cur: Record<string, string> = {
      q: p.query, category: p.category, family: p.familySlug,
      eco: p.ecoPrefix, whiteFirst: p.whiteFirst, view: p.view, page: String(p.page),
    };
    const next = { ...cur, ...patch, page: patch.page ?? "1" };
    for (const [k, v] of Object.entries(next)) if (v && v !== "all" && v !== "") params.set(k, v);
    router.push(`/?${params.toString()}`);
  };

  const goPage = (page: number) => {
    const params = new URLSearchParams(window.location.search);
    params.set("page", String(page));
    router.push(`/?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="p-4 border-b border-border sticky top-0 bg-background/80 backdrop-blur-sm z-10">
        <div className="container mx-auto flex justify-between items-center">
          <Link href="/"><span className="text-2xl font-bold text-primary cursor-pointer">TheoryDB</span></Link>
          <nav className="flex gap-2 text-sm">
            <Link href="/" className="px-3 py-1 rounded hover:bg-muted">Openings</Link>
            <Link href="/explore" className="px-3 py-1 rounded hover:bg-muted">Explorer</Link>
            <Link href="/?view=families" className="px-3 py-1 rounded hover:bg-muted">Families</Link>
          </nav>
        </div>
      </header>

      <main className="flex-grow container mx-auto p-4 sm:p-6">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
          <h2 className="text-3xl font-bold flex items-center">
            <BookOpen className="mr-3 h-8 w-8 text-primary" /> Chess Theory
          </h2>
          <div className="flex gap-2">
            <Button variant={p.view === "openings" ? "default" : "outline"} size="sm" onClick={() => push({ view: "openings" })}>
              <Database className="w-4 h-4 mr-1" /> Lines ({p.stats.openings.toLocaleString()})
            </Button>
            <Button variant={p.view === "families" ? "default" : "outline"} size="sm" onClick={() => push({ view: "families" })}>
              <Layers className="w-4 h-4 mr-1" /> Families ({p.stats.families})
            </Button>
            <Link href="/explore"><Button variant="outline" size="sm"><GitBranch className="w-4 h-4 mr-1" /> Explorer</Button></Link>
            <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}><Filter className="w-4 h-4 mr-1" /> Filters</Button>
          </div>
        </div>

        <p className="text-muted-foreground mb-4 text-sm">
          {p.stats.positions.toLocaleString()} positions · {p.stats.moves.toLocaleString()} theory moves · transpositions resolved via EPD.
          Browse by family, then drill into lines and the move tree.
        </p>

        <form
          className="mb-4 flex gap-2"
          onSubmit={(e) => { e.preventDefault(); push({ q }); }}
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Search Sicilian, Ruy Lopez, C11, Caro…"
              className="w-full bg-input border border-border rounded-md pl-9 pr-3 py-2 text-foreground"
            />
          </div>
          <Button type="submit">Search</Button>
          {(p.query || p.category !== "all" || p.familySlug !== "all") && (
            <Button type="button" variant="ghost" onClick={() => { setQ(""); router.push("/"); }}>Clear</Button>
          )}
        </form>

        {showFilters && (
          <Card className="mb-6">
            <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-xs text-muted-foreground">System</label>
                <select value={p.category} onChange={(e) => push({ category: e.target.value })}
                  className="w-full bg-input border border-border rounded-md px-3 py-2 mt-1">
                  {CATS.map((c) => <option key={c.v} value={c.v}>{c.l}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Family</label>
                <select value={p.familySlug} onChange={(e) => push({ family: e.target.value })}
                  className="w-full bg-input border border-border rounded-md px-3 py-2 mt-1">
                  <option value="all">All families</option>
                  {p.families.map((f) => <option key={f.slug} value={f.slug}>{f.name} ({f.lineCount})</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">ECO prefix (e.g. B9, C, D4)</label>
                <input value={p.ecoPrefix} onChange={(e) => push({ eco: e.target.value, page: "1" })}
                  placeholder="B9" className="w-full bg-input border border-border rounded-md px-3 py-2 mt-1" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">White first move</label>
                <select value={p.whiteFirst} onChange={(e) => push({ whiteFirst: e.target.value })}
                  className="w-full bg-input border border-border rounded-md px-3 py-2 mt-1">
                  {["all", "e4", "d4", "c4", "Nf3", "g3", "f4"].map((w) => <option key={w} value={w}>{w === "all" ? "Any" : w}</option>)}
                </select>
              </div>
            </CardContent>
          </Card>
        )}

        {p.view === "families" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {p.families.map((f) => (
              <Link key={f.slug} href={`/family/${f.slug}`}>
                <Card className="hover:border-primary transition-colors h-full">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{f.name}</CardTitle>
                    <CardDescription>
                      {f.ecoStart ?? "?"}–{f.ecoEnd ?? "?"} · {CATEGORY_LABEL[f.category as keyof typeof CATEGORY_LABEL] ?? f.category}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2 mb-2">
                      <Badge variant="secondary">{f.lineCount} lines</Badge>
                      <Badge variant="outline">{f._count.openings} in DB</Badge>
                    </div>
                    {f.description ? <p className="text-sm text-muted-foreground line-clamp-2">{f.description}</p> : null}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <>
            <div className="text-sm text-muted-foreground mb-3">{p.total.toLocaleString()} lines match · page {p.page} of {p.totalPages}</div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {p.openings.map((o) => <LineCard key={o.slug} o={o} />)}
            </div>
            <div className="mt-8 flex justify-center items-center gap-2">
              <Button variant="outline" size="sm" disabled={p.page <= 1} onClick={() => goPage(p.page - 1)}>Prev</Button>
              <span className="text-sm text-muted-foreground">Page {p.page} / {p.totalPages}</span>
              <Button variant="outline" size="sm" disabled={p.page >= p.totalPages} onClick={() => goPage(p.page + 1)}>Next</Button>
            </div>
          </>
        )}
      </main>
      <footer className="text-center py-4 text-muted-foreground text-sm border-t border-border mt-auto">
        TheoryDB — SQLite + move-tree explorer · {p.stats.families} families
      </footer>
    </div>
  );
}

function LineCard({ o }: { o: Props["openings"][number] }) {
  let sans: string[] = [];
  try { sans = JSON.parse(o.sanMoves); } catch {}
  const preview = formatSans(sans.slice(0, 8)) + (sans.length > 8 ? "…" : "");
  return (
    <Card className="overflow-hidden flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex justify-between gap-2">
          <div>
            <CardTitle className="text-base leading-snug"><Link href={`/opening/${o.slug}`} className="hover:text-primary">{o.name}</Link></CardTitle>
            <CardDescription>{o.eco ?? "—"} · {o.family.name} · {o.ply} plies</CardDescription>
          </div>
          <Badge variant="outline" className="h-fit">{o.whiteFirst ?? ""}</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <div className="flex justify-center"><Chessboard position={o.fen} boardWidth={240} arePiecesDraggable={false} areArrowsAllowed={false} /></div>
        <p className="text-xs font-mono text-muted-foreground truncate" title={preview}>{preview || "—"}</p>
        <div className="flex gap-2 mt-auto">
          <Link href={`/opening/${o.slug}`} className="flex-1"><Button variant="outline" size="sm" className="w-full">View theory</Button></Link>
          <Link href={`/family/${o.family.slug}`}><Button variant="ghost" size="sm">Family</Button></Link>
        </div>
      </CardContent>
    </Card>
  );
}

function formatSans(sans: string[]) {
  let s = "";
  for (let i = 0; i < sans.length; i++) s += (i % 2 === 0 ? `${i / 2 + 1}. ` : "") + sans[i] + " ";
  return s.trim();
}
