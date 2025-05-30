import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Evaluation {
  type: "cp" | "mate";
  value: number;
}

interface AnalyticsPanelProps {
  isActive: boolean;
  moveNumber: number;
  evaluation?: Evaluation | null;
  cpl?: number | null;
  suggestedMove?: string | null;
  principalVariation?: string[];
  playerTurn?: "w" | "b"; // Whose turn it is *currently* on the board
}

const formatEvaluation = (evaluation?: Evaluation | null, playerTurn?: "w" | "b"): string => {
  if (!evaluation) return "N/A";

  // The backend provides evaluation from White's perspective.
  // We need to display it relative to the current player on the board.
  let displayValue = evaluation.value;
  let scorePrefix = "";

  if (evaluation.type === "cp") {
    displayValue = evaluation.value; // Already from White's perspective
    if (playerTurn === "b") { // If it's Black's turn to move, a positive score is bad for Black
      displayValue = -evaluation.value;
    }
    scorePrefix = displayValue >= 0 ? "+" : "";
    return `${scorePrefix}${(displayValue / 100).toFixed(2)}`;
  } else if (evaluation.type === "mate") {
    displayValue = evaluation.value; // Mate score from White's perspective
    if (playerTurn === "b") { // If it's Black's turn to move, a positive mate for White is -M for Black
        displayValue = -evaluation.value;
    }
    return displayValue > 0 ? `M${displayValue}` : `-M${Math.abs(displayValue)}`;
  }
  return "N/A";
};


export const AnalyticsPanel: React.FC<AnalyticsPanelProps> = ({
  isActive,
  moveNumber,
  evaluation,
  cpl,
  suggestedMove,
  principalVariation,
  playerTurn,
}) => {
  if (!isActive) {
    return null;
  }

  const getCplColor = (value: number | null | undefined) => {
    if (value === null || typeof value === 'undefined') return "text-muted-foreground";
    if (value === 0) return "text-green-500";
    if (value <= 20) return "text-yellow-400"; // Minor inaccuracy
    if (value <= 50) return "text-yellow-600"; // Mistake
    return "text-red-500"; // Blunder
  };

  const formattedEval = formatEvaluation(evaluation, playerTurn);

  return (
    <Card className="mt-6 lg:mt-0"> {/* Ensure it uses theme colors */}
      <CardHeader>
        <CardTitle>Practice Analysis</CardTitle>
        <CardDescription>Analysis of the current position.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div>
          <strong>Move:</strong> <span className="text-foreground">{moveNumber}</span>
        </div>
        <div>
          <strong>Evaluation:</strong> 
          <span className={cn(
            "font-semibold ml-1",
            evaluation?.type === "cp" && evaluation.value > 50 && playerTurn === 'w' ? "text-green-500" :
            evaluation?.type === "cp" && evaluation.value < -50 && playerTurn === 'w' ? "text-red-500" :
            evaluation?.type === "cp" && evaluation.value < -50 && playerTurn === 'b' ? "text-green-500" : // Good for black
            evaluation?.type === "cp" && evaluation.value > 50 && playerTurn === 'b' ? "text-red-500" : // Bad for black
            "text-foreground"
          )}>
            {formattedEval}
          </span>
          {evaluation?.type === "cp" && <span className="text-xs text-muted-foreground ml-1">(White's perspective: {(evaluation.value / 100).toFixed(2)})</span>}
        </div>
        <div>
          <strong>Centipawn Loss (CPL):</strong> 
          <span className={cn("font-semibold ml-1", getCplColor(cpl))}>
            {cpl !== null && typeof cpl !== 'undefined' ? cpl.toFixed(0) : "N/A"}
          </span>
        </div>
        <div>
          <strong>Engine's Best Move:</strong> 
          <span className="text-foreground ml-1 font-mono">{suggestedMove || "N/A"}</span>
        </div>
        <div>
          <strong>Principal Variation:</strong>
          <span className="text-foreground ml-1 font-mono">
            {principalVariation && principalVariation.length > 0 ? principalVariation.join(" ") : "N/A"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};
