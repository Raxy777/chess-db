"use client";

import React from 'react';
import { Chess } from "chess.js"; // Import Chess type
import { Chessboard } from "react-chessboard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Opening } from "./OpeningTrainer"; // Assuming Opening type is exported from OpeningTrainer

interface ChessboardAreaProps {
  gamePosition: string;
  onDrop: (sourceSquare: string, targetSquare: string) => boolean;
  isBoardInteractive: boolean; // Simplified from function to boolean
  boardOrientation: "white" | "black";
  isThinking: boolean;
  isLoadingOpening: boolean;
  isAnalyzing: boolean;
  game: Chess; // Use the Chess type
  moveCount: number;
  isPracticeSessionActive: boolean;
  selectedOpening: Opening | null;
  practicePlayerColor: "w" | "b" | null;
}

const ChessboardArea: React.FC<ChessboardAreaProps> = ({
  gamePosition,
  onDrop,
  isBoardInteractive,
  boardOrientation,
  isThinking,
  isLoadingOpening,
  isAnalyzing,
  game,
  moveCount,
  isPracticeSessionActive,
  selectedOpening,
  practicePlayerColor,
}) => {
  return (
    <div className="lg:col-span-2 flex flex-col items-center">
      <div className="w-full max-w-2xl aspect-square">
        <Chessboard
          position={gamePosition}
          onPieceDrop={onDrop}
          boardWidth={560} // Consider making this a prop if dynamic size is needed
          arePiecesDraggable={isBoardInteractive}
          boardOrientation={boardOrientation}
          customBoardStyle={{
            borderRadius: "4px",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
          }}
        />
      </div>
      {(isThinking || isLoadingOpening || isAnalyzing) && (
        <div className="mt-4 bg-card border border-border px-4 py-2 rounded-lg shadow-md">
          <p className="text-sm text-muted-foreground">
            {isLoadingOpening
              ? "Playing opening..."
              : isAnalyzing
              ? "Analyzing..."
              : isThinking
              ? "AI is thinking..."
              : ""}
          </p>
        </div>
      )}
      <Card className="mt-4 w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-lg">Game Info</CardTitle>
          {isPracticeSessionActive && selectedOpening && (
            <CardDescription>
              Practicing: {selectedOpening.name}
              {practicePlayerColor &&
                !isLoadingOpening &&
                !isAnalyzing &&
                ` (Playing as ${
                  practicePlayerColor === "w" ? "White" : "Black"
                })`}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Move: {moveCount}</p>
          <p className="text-sm text-muted-foreground">
            Turn: {game.turn() === "w" ? "White" : "Black"}
          </p>
          {game.isCheckmate() && (
            <p className="text-red-500 font-bold">Checkmate!</p>
          )}
          {game.isStalemate() && (
            <p className="text-yellow-500 font-bold">Stalemate!</p>
          )}
          {game.isDraw() && <p className="text-yellow-500 font-bold">Draw!</p>}
        </CardContent>
      </Card>
    </div>
  );
};

export default ChessboardArea;
