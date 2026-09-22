import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getOpeningBySlug, getPositionExplorer } from "@/lib/openings-repo";
import { OpeningBoardExplorer } from "@/components/opening-board-explorer";

export const dynamic = "force-dynamic";

export default async function OpeningPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const opening = await getOpeningBySlug(slug);
  if (!opening) notFound();

  const explorer = await getPositionExplorer(opening.epd);
  const ser = (o: unknown) => JSON.parse(JSON.stringify(o));
  const o = ser(opening) as NonNullable<typeof opening>;
  const ex = ser(explorer) as Awaited<ReturnType<typeof getPositionExplorer>>;

  const sans: string[] = JSON.parse(o.sanMoves as unknown as string);
  const ucis: string[] = JSON.parse(o.uciMoves as unknown as string);
  const epds: string[] = JSON.parse(o.epds as unknown as string);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="p-4 border-b sticky top-0 bg-background/80 backdrop-blur-sm z-10">
        <div className="container mx-auto flex justify-between items-center">
          <Link href="/"><span className="text-2xl font-bold text-primary">TheoryDB</span></Link>
          <nav className="flex gap-2 text-sm">
            <Link href="/" className="px-3 py-1 rounded hover:bg-muted">Openings</Link>
            <Link href={`/family/${o.family.slug}`} className="px-3 py-1 rounded hover:bg-muted">{o.family.name}</Link>
            <Link href="/explore" className="px-3 py-1 rounded hover:bg-muted">Explorer</Link>
          </nav>
        </div>
      </header>

      <main className="container mx-auto p-4 sm:p-6 space-y-6">
        <div>
          <Link href="/"><Button variant="ghost" size="sm">← All lines</Button></Link>
          <h1 className="text-3xl font-bold mt-2">{o.name}</h1>
          <div className="flex flex-wrap gap-2 mt-2">
            {o.eco ? <Badge>{o.eco}</Badge> : null}
            <Badge variant="secondary">{o.family.name}</Badge>
            <Badge variant="outline">{o.category}</Badge>
            <Badge variant="outline">{o.ply} plies</Badge>
            {o.variation ? <Badge variant="outline">{o.variation}</Badge> : null}
          </div>
          <p className="text-sm font-mono text-muted-foreground mt-2 break-all">{o.pgn}</p>
        </div>

        <OpeningBoardExplorer
          sans={sans}
          ucis={ucis}
          epds={epds}
          finalFen={o.fen}
          children={ex?.position?.children ?? []}
          linesThrough={ex?.linesThrough ?? []}
          currentSlug={o.slug}
        />

        <Tabs defaultValue="theory" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="theory">Theory ({ex?.position?.children?.length ?? 0} next)</TabsTrigger>
            <TabsTrigger value="lines">Lines here ({ex?.linesThrough?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="traps">Traps ({o.traps.length})</TabsTrigger>
            <TabsTrigger value="variations">Notes ({o.variations.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="theory">
            <Card>
              <CardHeader><CardTitle>Continuations from this position</CardTitle>
                <CardDescription>Aggregated from all {ex?.position?.totalLines ?? 0} lines passing through this EPD — transpositions merged.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {(ex?.position?.children ?? []).map((c: { san: string; uci: string; openingCount: number; to: { canonicalName: string | null; epd: string } }) => (
                  <div key={c.uci} className="flex justify-between items-center border rounded px-3 py-2 text-sm">
                    <span className="font-mono font-bold">{c.san} <span className="text-muted-foreground font-normal">({c.uci})</span></span>
                    <span className="text-muted-foreground">{c.openingCount} lines → {c.to.canonicalName ?? ""}</span>
                  </div>
                ))}
                {(!ex || ex.position.children.length === 0) && <p className="text-sm text-muted-foreground">End of recorded theory for this line.</p>}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="lines">
            <Card>
              <CardHeader><CardTitle>Other lines reaching the same position</CardTitle>
                <CardDescription>Same EPD via different move orders (transpositions).</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {(ex?.linesThrough ?? []).map((l: { slug: string; name: string; eco: string | null }) => (
                  <Link key={l.slug} href={`/opening/${l.slug}`} className="block border rounded px-3 py-2 text-sm hover:border-primary">
                    <span className="font-medium">{l.name}</span> <span className="text-muted-foreground">{l.eco ?? ""}</span>
                    {l.slug === o.slug ? <Badge className="ml-2">current</Badge> : null}
                  </Link>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="traps">
            <div className="space-y-3">
              {o.traps.map((t) => (
                <Card key={t.id}><CardHeader><CardTitle className="text-base">{t.name}</CardTitle>
                  <CardDescription>{t.description}</CardDescription></CardHeader></Card>
              ))}
              {o.traps.length === 0 && <Card><CardContent className="pt-6 text-sm text-muted-foreground text-center">No traps recorded for this exact line — see family page.</CardContent></Card>}
            </div>
          </TabsContent>

          <TabsContent value="variations">
            <div className="space-y-3">
              {o.variations.map((v) => (
                <Card key={v.id}><CardHeader><CardTitle className="text-base">{v.name}</CardTitle>
                  <CardDescription>{v.description}</CardDescription></CardHeader></Card>
              ))}
              {(o.family.keyIdeas ?? []).length > 0 && (
                <Card><CardHeader><CardTitle className="text-base">Family ideas — {o.family.name}</CardTitle></CardHeader>
                  <CardContent><ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    {o.family.keyIdeas.map((k) => <li key={k.id}><b>{k.side}:</b> {k.text}</li>)}
                  </ul></CardContent></Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
