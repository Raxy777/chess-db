"use client";

import { useState } from "react";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { formatSans } from "@/lib/format";

interface Child {
  san: string; uci: string; openingCount: number;
  to: { epd: string; fen: string; canonicalName: string | null };
}

export function OpeningBoardExplorer({ sans, epds, finalFen, moves }: {
  sans: string[]; epds: string[]; finalFen: string; moves: Child[];
}) {
  const [ply, setPly] = useState(sans.length);

  const fenAt = (p: number) => {
    if (p <= 0) return new Chess().fen();
    if (p >= sans.length) return finalFen;
    // reconstruct from start to avoid storing every FEN
    const g = new Chess();
    for (let i = 0; i < p; i++) { try { g.move(sans[i]); } catch {} }
    return g.fen();
  };

  return (
    <div className="grid lg:grid-cols-5 gap-6">
      <Card className="lg:col-span-3">
        <CardHeader><CardTitle>Board explorer</CardTitle></CardHeader>
        <CardContent className="flex flex-col items-center gap-3">
          <Chessboard position={fenAt(ply)} boardWidth={420} arePiecesDraggable={false} areArrowsAllowed={false} />
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={ply <= 0} onClick={() => setPly(0)}>Start</Button>
            <Button size="sm" variant="outline" disabled={ply <= 0} onClick={() => setPly(ply - 1)}>Prev</Button>
            <span className="text-sm text-muted-foreground self-center">Ply {ply}/{sans.length}</span>
            <Button size="sm" variant="outline" disabled={ply >= sans.length} onClick={() => setPly(ply + 1)}>Next</Button>
            <Button size="sm" variant="outline" disabled={ply >= sans.length} onClick={() => setPly(sans.length)}>End</Button>
          </div>
          <p className="text-sm font-mono bg-muted p-2 rounded w-full break-all">{formatSans(sans.slice(0, ply)) || "Starting position"}</p>
        </CardContent>
      </Card>
      <Card className="lg:col-span-2">
        <CardHeader><CardTitle className="text-base">Theory from final position</CardTitle></CardHeader>
        <CardContent className="space-y-2 max-h-[480px] overflow-auto">
          {moves.map((c) => (
            <Link key={c.uci} href={`/explore?epd=${encodeURIComponent(c.to.epd)}`}>
              <div className="border rounded px-3 py-2 text-sm hover:border-primary">
                <b className="font-mono">{c.san}</b> <span className="text-muted-foreground">· {c.openingCount} lines</span>
              </div>
            </Link>
          ))}
          {moves.length === 0 && <p className="text-sm text-muted-foreground">No further recorded moves.</p>}
          <div className="pt-2 text-xs text-muted-foreground">
            EPD: <span className="font-mono break-all">{epds[epds.length - 1]}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
