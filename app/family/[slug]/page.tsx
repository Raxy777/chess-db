import Link from "next/link";
import { notFound } from "next/navigation";
import { StaticBoard } from "@/components/static-board";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getFamilyBySlug } from "@/lib/openings-repo";
import { CATEGORY_LABEL } from "@/lib/taxonomy";

export const dynamic = "force-dynamic";

export default async function FamilyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const family = await getFamilyBySlug(slug);
  if (!family) notFound();

  const ser = (o: unknown) => JSON.parse(JSON.stringify(o)) as typeof family;
  const f = ser(family);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="p-4 border-b sticky top-0 bg-background/80 backdrop-blur-sm z-10">
        <div className="container mx-auto flex justify-between items-center">
          <Link href="/"><span className="text-2xl font-bold text-primary">TheoryDB</span></Link>
          <nav className="flex gap-2 text-sm">
            <Link href="/" className="px-3 py-1 rounded hover:bg-muted">Openings</Link>
            <Link href="/explore" className="px-3 py-1 rounded hover:bg-muted">Explorer</Link>
          </nav>
        </div>
      </header>
      <main className="container mx-auto p-4 sm:p-6 space-y-6">
        <div>
          <Link href="/"><Button variant="ghost" size="sm">← Back</Button></Link>
          <h1 className="text-3xl font-bold mt-2">{f!.name}</h1>
          <p className="text-muted-foreground">
            {f!.ecoStart ?? "?"}–{f!.ecoEnd ?? "?"} · {CATEGORY_LABEL[f!.category as keyof typeof CATEGORY_LABEL]} · {f!.openings.length} lines
          </p>
          {f!.description ? <p className="mt-3 max-w-3xl">{f!.description}</p> : null}
          {f!.historicalNotes ? <p className="mt-2 text-sm text-muted-foreground max-w-3xl">{f!.historicalNotes}</p> : null}
        </div>

        {f!.keyIdeas.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Key ideas</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
              {(["white", "black"] as const).map((side) => (
                <div key={side}>
                  <h3 className="font-semibold capitalize mb-2">{side}</h3>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    {f!.keyIdeas.filter((k) => k.side === side).map((k) => <li key={k.id}>{k.text}</li>)}
                  </ul>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {f!.openings.map((o) => {
            let sans: string[] = [];
            try { sans = JSON.parse(o.sanMoves); } catch {}
            return (
              <Link key={o.slug} href={`/opening/${o.slug}`}>
                <Card className="hover:border-primary h-full">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{o.name}</CardTitle>
                    <CardDescription>{o.eco ?? "—"} · {o.ply} plies · {formatSans(sans.slice(0, 6))}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex justify-center">
                    <StaticBoard fen={o.fen} size={220} />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}

function formatSans(sans: string[]) {
  let s = "";
  for (let i = 0; i < sans.length; i++) s += (i % 2 === 0 ? `${i / 2 + 1}. ` : "") + sans[i] + " ";
  return s.trim();
}
