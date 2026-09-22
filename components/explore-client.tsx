"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Chessboard } from "react-chessboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Move { san: string; uci: string; openingCount: number; to: { epd: string; fen: string; canonicalName: string | null } }
interface Data {
  position: { epd: string; fen: string; ply: number; canonicalName: string | null; totalLines: number; children: Move[]; family: { slug: string; name: string } | null };
  linesThrough: Array<{ slug: string; name: string; eco: string | null }>;
}

export function ExploreClient({ initialEpd, initial }: { initialEpd: string; initial: Data }) {
  const router = useRouter();
  const [history, setHistory] = useState<string[]>([initialEpd]);

  const pos = initial.position;

  const go = (epd: string) => {
    setHistory((h) => [...h, epd]);
    router.push(`/explore?epd=${encodeURIComponent(epd)}`);
  };
  const back = () => {
    if (history.length <= 1) { router.push("/explore"); return; }
    const h = history.slice(0, -1);
    setHistory(h);
    const prev = h[h.length - 1];
    router.push(prev === "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -" ? "/explore" : `/explore?epd=${encodeURIComponent(prev)}`);
  };

  return (
    <div className="grid lg:grid-cols-5 gap-6">
      <Card className="lg:col-span-3">
        <CardHeader><CardTitle className="text-base">{pos.canonicalName ?? "Position"} · ply {pos.ply} · {pos.totalLines} lines</CardTitle></CardHeader>
        <CardContent className="flex flex-col items-center gap-3">
          <Chessboard position={pos.fen} boardWidth={420} arePiecesDraggable={false} areArrowsAllowed={false} />
          <p className="text-xs font-mono text-muted-foreground break-all">{pos.epd}</p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={history.length <= 1} onClick={back}>Back</Button>
            <Link href="/explore"><Button size="sm" variant="ghost">Reset</Button></Link>
          </div>
        </CardContent>
      </Card>
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Moves ({pos.children.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-[320px] overflow-auto">
            {pos.children.map((m) => (
              <button key={m.uci} onClick={() => go(m.to.epd)} className="w-full text-left border rounded px-3 py-2 text-sm hover:border-primary">
                <b className="font-mono">{m.san}</b> <span className="text-muted-foreground">· {m.openingCount} lines → {m.to.canonicalName ?? ""}</span>
              </button>
            ))}
            {pos.children.length === 0 && <p className="text-sm text-muted-foreground">Leaf node — no further theory.</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Lines through here ({initial.linesThrough.length})</CardTitle></CardHeader>
          <CardContent className="space-y-1 max-h-[240px] overflow-auto">
            {initial.linesThrough.map((l) => (
              <Link key={l.slug} href={`/opening/${l.slug}`} className="block text-sm border rounded px-3 py-1.5 hover:border-primary">
                {l.name} <span className="text-muted-foreground">{l.eco ?? ""}</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
