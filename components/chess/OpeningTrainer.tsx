"use client";

import React from 'react';
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, Play, BookOpen } from "lucide-react";

// Definition from app/page.tsx - consider moving to a shared types file
interface Opening {
  id: string;
  name: string;
  description: string;
  fen: string;
  category: string;
  popularity: string;
  firstMove: string;
  statistics: any;
  mainLineMoves: string[];
  traps: any[];
  namedVariations?: NamedVariation[];
  keyIdeasWhite?: string[];
  keyIdeasBlack?: string[];
  historicalNotes?: string;
}

interface NamedVariation {
  name: string;
  moveSequence: string[];
  shortDescription: string;
  fen: string;
}
// End of type definitions

interface OpeningTrainerProps {
  selectedOpeningId: string;
  handleOpeningChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  openingsData: Opening[];
  isLoadingOpening: boolean;
  isAnalyzing: boolean;
  boardOrientation: "white" | "black";
  setBoardOrientation: (orientation: "white" | "black") => void;
  handleStartPracticeSession: () => void;
  isPracticeSessionActive: boolean;
  selectedOpening: Opening | null;
  handleEndPracticeSession: () => void;
  onHintClick: () => void;
}

const OpeningTrainer: React.FC<OpeningTrainerProps> = ({
  selectedOpeningId,
  handleOpeningChange,
  openingsData,
  isLoadingOpening,
  isAnalyzing,
  boardOrientation,
  setBoardOrientation,
  handleStartPracticeSession,
  isPracticeSessionActive,
  selectedOpening,
  handleEndPracticeSession,
  onHintClick,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Opening Trainer</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <label htmlFor="opening-select" className="text-sm font-medium text-muted-foreground mb-1 block">Opening:</label>
          <select
            id="opening-select"
            value={selectedOpeningId}
            onChange={handleOpeningChange}
            disabled={isLoadingOpening || isAnalyzing}
            className="w-full bg-input border border-border rounded-md px-3 py-2 text-foreground focus:ring-ring focus:border-ring"
          >
            {openingsData.map((opening) => (
              <option key={opening.id} value={opening.id}>
                {opening.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="play-as-select" className="text-sm font-medium text-muted-foreground mb-1 block">Play as:</label>
          <select
            id="play-as-select"
            disabled={isLoadingOpening || isAnalyzing}
            className="w-full bg-input border border-border rounded-md px-3 py-2 text-foreground focus:ring-ring focus:border-ring"
            onChange={(e) => {
                const newOrientation = e.target.value as "white" | "black";
                setBoardOrientation(newOrientation);
            }}
            value={boardOrientation}
          >
            <option value="white">White</option>
            <option value="black">Black</option>
          </select>
        </div>
        <Button className="w-full" onClick={handleStartPracticeSession} disabled={isLoadingOpening || isAnalyzing || !selectedOpening}>
          <Play className="w-4 h-4 mr-2" />
          {isPracticeSessionActive ? "Restart Practice" : "Start Practice Session"}
        </Button>
        {isPracticeSessionActive && !isLoadingOpening && !isAnalyzing && (
          <Button variant="destructive" className="w-full" onClick={handleEndPracticeSession}>
            End Session & View Summary
          </Button>
        )}
        <Button variant="secondary" className="w-full" onClick={onHintClick} disabled={isLoadingOpening || isAnalyzing || !isPracticeSessionActive}>
          <Lightbulb className="w-4 h-4 mr-2" />
          Get Hint
        </Button>
         <Link href="/explore" className="block w-full">
          <Button variant="outline" className="w-full" disabled={isLoadingOpening || isAnalyzing}>
            <BookOpen className="w-4 h-4 mr-2" />
            Explore Openings
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
};

export default OpeningTrainer;
// Re-export Opening type if it's to be used by the parent component importing this.
// Or preferably, move to a central types location.
export type { Opening, NamedVariation };
