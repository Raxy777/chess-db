import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Re-define or import PracticeMoveDetail if it's in a shared types file
interface PracticeMoveDetail {
  moveNumber: number;
  userMoveUci: string;
  fenBeforeUserMove: string;
  cpl: number | null;
  engineBestMoveUci: string | null;
  classification: 'excellent' | 'good' | 'inaccuracy' | 'mistake' | 'blunder' | 'mate' | null;
}

interface SessionSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionMoves: PracticeMoveDetail[];
}

const getCplColorClass = (classification: PracticeMoveDetail['classification'], cpl: number | null): string => {
  if (classification === 'blunder') return "text-red-500 font-semibold";
  if (classification === 'mistake') return "text-orange-500 font-semibold";
  if (classification === 'inaccuracy') return "text-yellow-500 font-semibold";
  if (classification === 'good') return "text-blue-500";
  if (classification === 'excellent') return "text-green-500 font-semibold";
  if (cpl === 0 && classification !== 'mate') return "text-green-500 font-semibold"; // Specifically for CPL 0
  return "text-muted-foreground";
};

const getClassificationBadgeVariant = (classification: PracticeMoveDetail['classification']): "default" | "destructive" | "secondary" | "outline" => {
  switch (classification) {
    case 'blunder':
      return 'destructive';
    case 'mistake':
      return 'destructive'; // Or a different color like orange if available
    case 'inaccuracy':
      return 'secondary'; // Or a yellow-ish variant
    case 'good':
      return 'default'; // Or a blue-ish variant
    case 'excellent':
      return 'default'; // Or a green-ish variant (primary often green)
    case 'mate':
      return 'default';
    default:
      return 'outline';
  }
}

export const SessionSummaryModal: React.FC<SessionSummaryModalProps> = ({
  isOpen,
  onClose,
  sessionMoves,
}) => {
  if (!isOpen) {
    return null;
  }

  const totalMoves = sessionMoves.length;
  const mistakes = sessionMoves.filter(m => m.classification === 'mistake').length;
  const blunders = sessionMoves.filter(m => m.classification === 'blunder').length;
  const inaccuracies = sessionMoves.filter(m => m.classification === 'inaccuracy').length;
  const goodMoves = sessionMoves.filter(m => m.classification === 'good').length;
  const excellentMoves = sessionMoves.filter(m => m.classification === 'excellent').length;
  const mateOpportunities = sessionMoves.filter(m => m.classification === 'mate').length;


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] md:max-w-[700px] lg:max-w-[800px] bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle className="text-2xl">Practice Session Summary</DialogTitle>
          <DialogDescription>
            Review your performance from the last practice session.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Overall Statistics</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <div><strong>Total Moves:</strong> {totalMoves}</div>
              <div className={cn(excellentMoves > 0 && "text-green-500")}><strong>Excellent:</strong> {excellentMoves}</div>
              <div className={cn(goodMoves > 0 && "text-blue-500")}><strong>Good:</strong> {goodMoves}</div>
              <div className={cn(inaccuracies > 0 && "text-yellow-500")}><strong>Inaccuracies:</strong> {inaccuracies}</div>
              <div className={cn(mistakes > 0 && "text-orange-500")}><strong>Mistakes:</strong> {mistakes}</div>
              <div className={cn(blunders > 0 && "text-red-500")}><strong>Blunders:</strong> {blunders}</div>
              {mateOpportunities > 0 && <div className="text-purple-500"><strong>Mate Related:</strong> {mateOpportunities}</div>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Move List</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px] w-full rounded-md border border-border p-2">
                {sessionMoves.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="p-2 text-left">#</th>
                        <th className="p-2 text-left">Your Move</th>
                        <th className="p-2 text-left">CPL</th>
                        <th className="p-2 text-left">Classification</th>
                        <th className="p-2 text-left">Engine Suggestion</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessionMoves.map((move, index) => (
                        <tr key={index} className="border-b border-border last:border-b-0 hover:bg-muted/50">
                          <td className="p-2">{move.moveNumber}</td>
                          <td className="p-2 font-mono">{move.userMoveUci}</td>
                          <td className={cn("p-2", getCplColorClass(move.classification, move.cpl))}>
                            {move.cpl !== null ? move.cpl.toFixed(0) : move.classification === 'mate' ? 'Mate' : 'N/A'}
                          </td>
                          <td className="p-2">
                            {move.classification && (
                                <Badge variant={getClassificationBadgeVariant(move.classification)} className="capitalize">
                                    {move.classification}
                                </Badge>
                            )}
                          </td>
                          <td className="p-2 font-mono">{move.engineBestMoveUci || "N/A"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-muted-foreground text-center py-4">No moves recorded in this session.</p>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button onClick={onClose} variant="outline">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
