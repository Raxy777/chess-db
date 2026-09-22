"use client";

import { Chessboard } from "react-chessboard";

export function StaticBoard({ fen, size = 220 }: { fen: string; size?: number }) {
  return (
    <Chessboard
      position={fen}
      boardWidth={size}
      arePiecesDraggable={false}
      areArrowsAllowed={false}
      customBoardStyle={{ borderRadius: "4px" }}
    />
  );
}
