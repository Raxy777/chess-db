"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, RotateCcw, RotateCw } from "lucide-react";

interface GameControlsProps {
  navigateHistory: (direction: "prev" | "next") => void;
  resetGame: () => void;
  flipBoard: () => void;
  currentMoveIndex: number;
  gameHistoryLength: number;
  isLoadingOpening: boolean;
  isAnalyzing: boolean;
}

const GameControls: React.FC<GameControlsProps> = ({
  navigateHistory,
  resetGame,
  flipBoard,
  currentMoveIndex,
  gameHistoryLength,
  isLoadingOpening,
  isAnalyzing,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Game Controls</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateHistory("prev")}
            disabled={currentMoveIndex === 0 || isLoadingOpening || isAnalyzing}
            className="flex-1"
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Prev
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateHistory("next")}
            disabled={currentMoveIndex === gameHistoryLength - 1 || isLoadingOpening || isAnalyzing}
            className="flex-1"
          >
            Next <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={resetGame} className="w-full">
          <RotateCcw className="w-4 h-4 mr-2" /> New Game
        </Button>
        <Button variant="outline" size="sm" onClick={flipBoard} className="w-full">
          <RotateCw className="w-4 h-4 mr-2" /> Flip Board
        </Button>
      </CardContent>
    </Card>
  );
};

export default GameControls;
