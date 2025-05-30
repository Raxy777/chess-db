// types/chess.ts

// Import TSVOpening from lib/tsv-utils to be used in TSVOpeningExt
// Adjust path if necessary. Assuming 'types' and 'lib' are siblings in the root.
import type { TSVOpening as RawTSVOpening } from '../lib/tsv-utils';

// Base interface for an opening, used by both JSON and TSV derived openings
export interface OpeningBase {
  id: string;
  name: string;
  description: string;
  fen: string;
  category: string; // e.g., "King's Pawn Openings", "Sicilian Defense", "A00" or "TSV Import"
  popularity: string; // e.g., "High", "Medium", "Low", "Unknown"
  firstMove: "White" | "Black" | "Unknown";
  statistics: OpeningStatistics;
  mainLineMoves?: string[]; // For JSON, this is an array of SAN moves. For TSV, this will be the parsed PGN.
  namedVariations?: NamedVariation[];
  keyIdeasWhite?: string[];
  keyIdeasBlack?: string[];
  historicalNotes?: string;
  traps?: Trap[];
}

// Interface for openings originating from JSON files
export interface JsonOpening extends OpeningBase {
  dataSource: 'json';
}

// Interface for openings originating from TSV files, extending OpeningBase
// It also includes the sourceFile from the original TSVOpening definition.
export interface TSVOpeningExt extends OpeningBase {
  dataSource: 'tsv';
  sourceFile: string; // From the original TSVOpening in tsv-utils
  eco: string; // Keep ECO code for potential use, though category might be derived from it
}

// Combined type for any opening data used in the application
export interface CombinedOpening extends OpeningBase {
  dataSource: 'json' | 'tsv';
  eco?: string;
  sourceFile?: string;
}

// Detailed statistics for an opening (primarily from JSON)
export interface OpeningStatistics {
  totalGames: number;
  whiteWins: number; // Percentage
  draws: number; // Percentage
  blackWins: number; // Percentage
  averageRating: number;
  popularMoves?: MoveStatistic[]; // Optional as TSV entries won't have this by default
}

// Statistics for a popular move within an opening
export interface MoveStatistic {
  move: string; // Algebraic notation (e.g., e2e4)
  san: string;  // Standard Algebraic Notation (e.g., e4)
  frequency: number; // Percentage
  whiteWinRate: number; // Percentage
  drawRate: number; // Percentage
  blackWinRate: number; // Percentage
  description: string; // Short description of the move's purpose or idea
}

// Named variation within an opening
export interface NamedVariation {
  name: string;
  moveSequence: string[]; // Array of SAN moves
  shortDescription: string;
  fen: string; // FEN of the position after the variation
}

// Common trap within an opening
export interface Trap {
  name: string;
  moveSequenceToTrigger?: string[]; // Moves leading to the trap
  triggerMove?: string; // The opponent's move that triggers the trap
  trapMove: string; // The actual trap move
  correctContinuation?: string[]; // How the opponent should have played
  description: string;
  penalty: number; // e.g., centipawn loss or material gain
}

// Re-exporting RawTSVOpening if it's needed directly by other modules,
// or it can remain only imported here for defining TSVOpeningExt.
// For now, TSVOpeningExt uses RawTSVOpening's shape internally.
// If other parts of the app need RawTSVOpening directly, exporting it is useful.
export type { RawTSVOpening };
