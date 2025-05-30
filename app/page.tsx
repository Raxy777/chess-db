import { Chess } from "chess.js";
import { loadAllTSVOpenings } from '../lib/tsv-utils';
import type { CombinedOpening, TSVOpeningExt, RawTSVOpening } from '../types/chess';
import { HomePageClient } from "@/app/HomePageClient";

const OPENINGS_PER_PAGE = 21;

async function getOpeningsData(): Promise<CombinedOpening[]> {
  const tsvOpeningsArray: RawTSVOpening[] = await loadAllTSVOpenings();
  const { Chess: ChessForStaticProps } = await import('chess.js');

  const transformedTsvOpenings: TSVOpeningExt[] = tsvOpeningsArray.map((tsvOpening: RawTSVOpening, index: number): TSVOpeningExt => {
    const game = new ChessForStaticProps();
    let fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    let firstMove: "White" | "Black" | "Unknown" = "Unknown";
    let mainLineMoves: string[] = [];

    try {
      const moves = tsvOpening.pgn.split(/\s+/).filter(m => !m.match(/^\d+\.$/));
      mainLineMoves = [];
      let tempGame = new ChessForStaticProps();
      for (const move of moves) {
        const result = tempGame.move(move, { strict: false });
        if (result) {
          mainLineMoves.push(result.san);
        } else {
          console.warn(`[getOpeningsData] Invalid move "${move}" in PGN "${tsvOpening.pgn}" from ${tsvOpening.sourceFile}. Skipping move.`);
        }
      }
      fen = tempGame.fen();
      if (mainLineMoves.length > 0) {
        const history = tempGame.history({ verbose: true });
        if (history.length > 0) {
          firstMove = history[0].color === 'w' ? "White" : "Black";
        }
      }
    } catch (e) {
      console.error(`[getOpeningsData] Error parsing PGN for ${tsvOpening.name} from ${tsvOpening.sourceFile}: ${tsvOpening.pgn}`, e);
    }

    return {
      id: `tsv-${tsvOpening.sourceFile.replace('.tsv','')}-${index}-${encodeURIComponent(tsvOpening.name.slice(0,10))}`,
      name: tsvOpening.name,
      eco: tsvOpening.eco,
      description: tsvOpening.eco ? `ECO: ${tsvOpening.eco}` : "Chess opening",
      fen: fen,
      category: tsvOpening.eco ? tsvOpening.eco.charAt(0).toUpperCase() + "xx" : "TSV Import",
      popularity: "Unknown",
      firstMove: firstMove,
      statistics: {
        totalGames: 0,
        whiteWins: 0,
        draws: 0,
        blackWins: 0,
        averageRating: 0,
        popularMoves: [],
      },
      mainLineMoves: mainLineMoves,
      sourceFile: tsvOpening.sourceFile,
      dataSource: 'tsv',
      namedVariations: [],
      keyIdeasWhite: [],
      keyIdeasBlack: [],
      historicalNotes: "",
      traps: [],
    };
  });

  return transformedTsvOpenings;
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: { page?: string; category?: string; firstMove?: string; search?: string };
}) {
  const allOpenings = await getOpeningsData();
  const currentPage = Number(searchParams.page) || 1;
  const selectedCategory = searchParams.category || "all";
  const selectedFirstMove = searchParams.firstMove || "all";
  const searchQuery = searchParams.search || "";

  // Filter openings based on category, first move, and search query
  let filteredOpenings = allOpenings;
  if (selectedCategory !== "all") {
    filteredOpenings = filteredOpenings.filter((opening) => opening.category === selectedCategory);
  }
  if (selectedFirstMove !== "all") {
    filteredOpenings = filteredOpenings.filter((opening) => opening.firstMove === selectedFirstMove);
  }
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filteredOpenings = filteredOpenings.filter((opening) => 
      opening.name.toLowerCase().includes(query) || 
      opening.description.toLowerCase().includes(query) ||
      (opening.eco && opening.eco.toLowerCase().includes(query))
    );
  }

  // Calculate pagination
  const totalOpenings = filteredOpenings.length;
  const totalPages = Math.ceil(totalOpenings / OPENINGS_PER_PAGE);
  const startIndex = (currentPage - 1) * OPENINGS_PER_PAGE;
  const endIndex = startIndex + OPENINGS_PER_PAGE;
  const currentOpenings = filteredOpenings.slice(startIndex, endIndex);

  return (
    <HomePageClient 
      allOpenings={currentOpenings}
      totalOpenings={totalOpenings}
      currentPage={currentPage}
      totalPages={totalPages}
      selectedCategory={selectedCategory}
      selectedFirstMove={selectedFirstMove}
      searchQuery={searchQuery}
    />
  );
}
