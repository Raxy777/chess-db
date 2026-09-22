import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getPositionExplorer } from "@/lib/openings-repo";
import { serialize } from "@/lib/format";
import { START_EPD } from "@/lib/taxonomy";
import { ExploreClient } from "@/components/explore-client";

export default async function ExplorePage({ searchParams }: { searchParams: Promise<{ epd?: string }> }) {
  const sp = await searchParams;
  const epd = sp.epd ? decodeURIComponent(sp.epd) : START_EPD;
  const data = await getPositionExplorer(epd);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="p-4 border-b sticky top-0 bg-background/80 backdrop-blur-sm z-10">
        <div className="container mx-auto flex justify-between items-center">
          <Link href="/"><span className="text-2xl font-bold text-primary">TheoryDB</span></Link>
          <nav className="flex gap-2 text-sm">
            <Link href="/" className="px-3 py-1 rounded hover:bg-muted">Openings</Link>
            <Link href="/explore" className="px-3 py-1 rounded bg-muted">Explorer</Link>
          </nav>
        </div>
      </header>
      <main className="container mx-auto p-4 sm:p-6">
        <h1 className="text-2xl font-bold mb-1">Theory explorer</h1>
        <p className="text-sm text-muted-foreground mb-4">Walk the move tree. Positions are merged by EPD, so transpositions collapse into one node.</p>
        {!data ? (
          <Card><CardContent className="pt-6 text-sm text-muted-foreground">
            Unknown position <span className="font-mono">{epd}</span>. <Link href="/explore"><Button size="sm" variant="outline" className="ml-2">Back to start</Button></Link>
          </CardContent></Card>
        ) : (
          <ExploreClient initialEpd={epd} initial={serialize(data)} />
        )}
      </main>
    </div>
  );
}
