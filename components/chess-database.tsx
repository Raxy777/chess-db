"use client"

import { useState, useEffect } from "react"
import { Chessboard } from "react-chessboard"
// Chess import might not be needed if FEN is directly from prop and no new logic is added
// import { Chess } from "chess.js" 
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { TrendingUp, TrendingDown, Minus, Database, BarChart3, BookText, AlertTriangle, History, ListTree, Info } from "lucide-react"

// Import shared types from the new types/chess.ts file
// Adjust path if necessary. Assuming 'components' and 'types' are siblings in the root,
// or path aliases like @/types are configured.
import type {
  CombinedOpening,
  OpeningStatistics, // Only if needed for internal logic, CombinedOpening should suffice for props
  MoveStatistic,   // Only if needed for internal logic
  // NamedVariation,  // These are part of CombinedOpening
  // Trap             // These are part of CombinedOpening
} from '../types/chess'; // Example path: if components and types are siblings

interface ChessDatabaseProps {
  opening: CombinedOpening; // CombinedOpening now comes from types/chess
}

export function ChessDatabase({ opening }: ChessDatabaseProps) {
  const [selectedMove, setSelectedMove] = useState<MoveStatistic | null>(null)

  const isTSV = opening.dataSource === 'tsv';
  const hasDetailedStats = opening.statistics && opening.statistics.totalGames > 0;
  const hasPopularMoves = opening.statistics?.popularMoves && opening.statistics.popularMoves.length > 0;

  const overallData = hasDetailedStats ? [
    { name: "White Wins", value: opening.statistics.whiteWins, fill: "hsl(var(--chart-2))" },
    { name: "Draws", value: opening.statistics.draws, fill: "hsl(var(--muted-foreground))" },
    { name: "Black Wins", value: opening.statistics.blackWins, fill: "hsl(var(--destructive))" },
  ] : [];

  const moveFrequencyData = (hasDetailedStats && hasPopularMoves) ? opening.statistics.popularMoves.map((move) => ({
    name: move.san,
    frequency: move.frequency,
    whiteWinRate: move.whiteWinRate,
    description: move.description,
    fill: "hsl(var(--primary))"
  })) : [];

  const getTrendIcon = (whiteWinRate: number) => {
    if (whiteWinRate > 45) return <TrendingUp className="w-4 h-4 text-green-500" />
    if (whiteWinRate < 35) return <TrendingDown className="w-4 h-4 text-red-500" />
    return <Minus className="w-4 h-4 text-muted-foreground" />
  }
  
  const formatMoveSequence = (moves: string[] | undefined) => {
    if (!moves || moves.length === 0) return "Not available.";
    let formatted = "";
    for (let i = 0; i < moves.length; i++) {
      if (i % 2 === 0) { // White's move
        formatted += `${Math.floor(i / 2) + 1}. ${moves[i]} `;
      } else { // Black's move
        formatted += `${moves[i]} `;
      }
    }
    return formatted.trim();
  };

  // FEN display could be a sub-component if more logic is added (e.g. copy FEN)
  const FenDisplay = ({ fen }: { fen: string }) => (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center"><Info className="mr-2 h-5 w-5 text-primary"/> Position FEN</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm font-mono bg-muted p-2 rounded break-all">{fen}</p>
        <div className="mt-4 w-full max-w-[280px] mx-auto">
            <Chessboard
                position={fen}
                boardWidth={280}
                arePiecesDraggable={false}
                customBoardStyle={{ borderRadius: "4px" }}
            />
        </div>
      </CardContent>
    </Card>
  );

  const NotAvailableMessage = ({ sectionName }: { sectionName: string }) => (
    <Card>
      <CardContent className="pt-6">
        <p className="text-muted-foreground text-center">
          {sectionName} are not available for this opening (Source: {opening.sourceFile || 'TSV'}).
        </p>
      </CardContent>
    </Card>
  );


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Database className="w-6 h-6 text-primary" />
            {opening.name}
            {isTSV && opening.sourceFile && <span className="text-sm text-muted-foreground ml-2">(from {opening.sourceFile})</span>}
          </CardTitle>
          <CardDescription>
            {opening.description || `Detailed information for ${opening.name}.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isTSV && hasDetailedStats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 text-center">
              <div>
                <div className="text-2xl font-bold text-primary">{opening.statistics.totalGames.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Total Games</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">{opening.statistics.averageRating}</div>
                <div className="text-sm text-muted-foreground">Average Rating</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">{opening.statistics.popularMoves?.length || 0}</div>
                <div className="text-sm text-muted-foreground">Popular Moves</div>
              </div>
            </div>
          )}

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5 mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="fen">FEN & Board</TabsTrigger>
              {!isTSV && hasPopularMoves && <TabsTrigger value="moves">Move Analysis</TabsTrigger>}
              {!isTSV && hasDetailedStats && <TabsTrigger value="statistics_charts">Win Rates</TabsTrigger>}
              {!isTSV && opening.namedVariations && opening.namedVariations.length > 0 && <TabsTrigger value="variations">Variations</TabsTrigger>}
              {!isTSV && opening.traps && opening.traps.length > 0 && <TabsTrigger value="traps">Traps</TabsTrigger>}
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center"><BookText className="mr-2 h-5 w-5 text-primary"/> Main Line / PGN</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm font-mono bg-muted p-2 rounded whitespace-pre-wrap break-all">
                    {formatMoveSequence(opening.mainLineMoves)}
                  </p>
                </CardContent>
              </Card>

              {!isTSV && (opening.keyIdeasWhite?.length || 0) > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Key Ideas for White</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      {opening.keyIdeasWhite?.map((idea, index) => <li key={index}>{idea}</li>)}
                    </ul>
                  </CardContent>
                </Card>
              )}
              {!isTSV && (opening.keyIdeasBlack?.length || 0) > 0 && (
                 <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Key Ideas for Black</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      {opening.keyIdeasBlack?.map((idea, index) => <li key={index}>{idea}</li>)}
                    </ul>
                  </CardContent>
                </Card>
              )}
              {!isTSV && opening.historicalNotes && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center"><History className="mr-2 h-5 w-5 text-primary"/> Historical Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{opening.historicalNotes}</p>
                  </CardContent>
                </Card>
              )}
              {isTSV && (
                <NotAvailableMessage sectionName="Detailed key ideas and historical notes" />
              )}
            </TabsContent>

            <TabsContent value="fen">
                <FenDisplay fen={opening.fen} />
            </TabsContent>
            
            {!isTSV && hasPopularMoves && (
              <TabsContent value="moves" className="space-y-4">
                {opening.statistics.popularMoves!.map((move, index) => (
                  <Card
                    key={move.move + index}
                    className={`cursor-pointer transition-all hover:bg-muted/80 ${
                      selectedMove?.san === move.san ? "ring-2 ring-primary" : "border-border"
                    }`}
                    onClick={() => setSelectedMove(selectedMove?.san === move.san ? null : move)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <div className="text-lg font-bold text-foreground">{move.san}</div>
                            <div className="text-xs text-muted-foreground">#{index + 1}</div>
                          </div>
                          <div>
                            <div className="text-foreground font-medium">{move.description}</div>
                            <div className="text-sm text-muted-foreground">Played in {move.frequency}% of games</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          {getTrendIcon(move.whiteWinRate)}
                          <Badge variant="outline" className="text-foreground border-border">
                            {move.whiteWinRate}% White wins
                          </Badge>
                        </div>
                      </div>

                      {selectedMove?.san === move.san && (
                        <div className="mt-4 pt-4 border-t border-border">
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <div className="text-sm text-muted-foreground">White Wins</div>
                              <Progress value={move.whiteWinRate} className="mt-1" indicatorClassName="bg-green-500" />
                              <div className="text-xs text-green-500 mt-1">{move.whiteWinRate}%</div>
                            </div>
                            <div>
                              <div className="text-sm text-muted-foreground">Draws</div>
                              <Progress value={move.drawRate} className="mt-1" indicatorClassName="bg-gray-500" />
                              <div className="text-xs text-muted-foreground mt-1">{move.drawRate}%</div>
                            </div>
                            <div>
                              <div className="text-sm text-muted-foreground">Black Wins</div>
                              <Progress value={move.blackWinRate} className="mt-1" indicatorClassName="bg-red-500" />
                              <div className="text-xs text-red-500 mt-1">{move.blackWinRate}%</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
            )}
            {isTSV && !hasPopularMoves && (
                <TabsContent value="moves">
                    <NotAvailableMessage sectionName="Detailed move analysis" />
                </TabsContent>
            )}


            {!isTSV && hasDetailedStats && (
              <TabsContent value="statistics_charts" className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg text-foreground">Result Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer
                        config={{
                          whiteWins: { label: "White Wins", color: "hsl(var(--chart-2))" },
                          draws: { label: "Draws", color: "hsl(var(--muted-foreground))" },
                          blackWins: { label: "Black Wins", color: "hsl(var(--destructive))" },
                        }}
                        className="h-[200px]"
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={overallData} cx="50%" cy="50%" innerRadius={40} outerRadius={80} paddingAngle={5} dataKey="value" nameKey="name">
                              {overallData.map((entry, index) => ( <Cell key={`cell-${index}`} fill={entry.fill} /> ))}
                            </Pie>
                            <RechartsTooltip content={<ChartTooltipContent hideLabel />} />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </CardContent>
                  </Card>

                  {hasPopularMoves && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg text-foreground">Move Popularity</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ChartContainer config={{ frequency: { label: "Frequency %", color: "hsl(var(--primary))" }, }} className="h-[200px]" >
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={moveFrequencyData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                              <YAxis stroke="hsl(var(--muted-foreground))" />
                              <RechartsTooltip cursor={{ fill: 'hsl(var(--muted))' }} content={<ChartTooltipContent indicator="dot" hideLabel />} />
                              <Bar dataKey="frequency" radius={4} />
                            </BarChart>
                          </ResponsiveContainer>
                        </ChartContainer>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>
            )}
             {isTSV && !hasDetailedStats && (
                <TabsContent value="statistics_charts">
                     <NotAvailableMessage sectionName="Detailed statistical charts" />
                </TabsContent>
            )}

            {!isTSV && opening.namedVariations && opening.namedVariations.length > 0 && (
              <TabsContent value="variations" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center"><ListTree className="mr-2 h-5 w-5 text-primary"/> Named Variations</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {opening.namedVariations.map((variation, index) => (
                        <Card key={index} className="bg-muted/50">
                          <CardHeader>
                            <CardTitle className="text-md">{variation.name}</CardTitle>
                            <CardDescription>{variation.shortDescription}</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <p className="text-xs font-mono mb-2 p-2 bg-background rounded whitespace-pre-wrap break-all">
                              {formatMoveSequence(variation.moveSequence)}
                            </p>
                            <div className="w-full max-w-[200px] mx-auto">
                              <Chessboard position={variation.fen} boardWidth={200} arePiecesDraggable={false} customBoardStyle={{ borderRadius: "4px" }} />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </CardContent>
                </Card>
              </TabsContent>
            )}
            {isTSV && (!opening.namedVariations || opening.namedVariations.length === 0) && (
                <TabsContent value="variations">
                    <NotAvailableMessage sectionName="Named variations" />
                </TabsContent>
            )}
            
            {!isTSV && opening.traps && opening.traps.length > 0 && (
              <TabsContent value="traps" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center"><AlertTriangle className="mr-2 h-5 w-5 text-destructive"/> Common Traps</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {opening.traps.map((trap, index) => (
                        <Card key={index} className="bg-muted/50">
                          <CardHeader>
                            <CardTitle className="text-md">{trap.name}</CardTitle>
                            <CardDescription>{trap.description}</CardDescription>
                          </CardHeader>
                          <CardContent>
                            {trap.moveSequenceToTrigger && (
                              <p className="text-xs font-mono mb-1 p-1 bg-background rounded whitespace-pre-wrap break-all">
                                <strong>Sequence:</strong> {formatMoveSequence(trap.moveSequenceToTrigger)}
                              </p>
                            )}
                            {trap.triggerMove && ( <p className="text-xs font-mono mb-1 p-1 bg-background rounded"><strong>Trigger:</strong> {trap.triggerMove}</p> )}
                            <p className="text-xs font-mono mb-1 p-1 bg-background rounded"><strong>Trap Move:</strong> {trap.trapMove}</p>
                            {trap.correctContinuation && (
                              <p className="text-xs font-mono mb-1 p-1 bg-background rounded whitespace-pre-wrap break-all">
                                <strong>Punishment:</strong> {formatMoveSequence(trap.correctContinuation)}
                              </p>
                            )}
                            <p className="text-sm mt-2"><strong>Penalty:</strong> {trap.penalty} cp</p>
                          </CardContent>
                        </Card>
                      ))}
                  </CardContent>
                </Card>
              </TabsContent>
            )}
            {isTSV && (!opening.traps || opening.traps.length === 0) && (
                <TabsContent value="traps">
                    <NotAvailableMessage sectionName="Common traps" />
                </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
