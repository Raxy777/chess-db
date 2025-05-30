"use client"

import { useState, useEffect } from "react";
import { Chessboard } from "react-chessboard";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, BookOpen, Filter, Database, ChevronRight } from "lucide-react";
import { ChessDatabase } from "@/components/chess-database";
import type { CombinedOpening } from '../types/chess';

interface HomePageProps {
  allOpenings: CombinedOpening[];
  totalOpenings: number;
  currentPage: number;
  totalPages: number;
  selectedCategory: string;
  selectedFirstMove: string;
  searchQuery: string;
}

export function HomePageClient({ 
  allOpenings, 
  totalOpenings,
  currentPage,
  totalPages,
  selectedCategory,
  selectedFirstMove,
  searchQuery
}: HomePageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const [selectedOpening, setSelectedOpening] = useState<CombinedOpening | null>(null);
  const [searchInput, setSearchInput] = useState(searchQuery);

  const updateFilters = (category: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('category', category);
    params.set('page', '1'); // Reset to first page when filters change
    router.push(`/?${params.toString()}`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (searchInput.trim()) {
      params.set('search', searchInput.trim());
    } else {
      params.delete('search');
    }
    params.set('page', '1'); // Reset to first page when search changes
    router.push(`/?${params.toString()}`);
  };

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page.toString());
    router.push(`/?${params.toString()}`);
  };

  if (selectedOpening) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <header className="p-4 border-b border-border sticky top-0 bg-background/80 backdrop-blur-sm z-10">
          <div className="container mx-auto flex justify-between items-center">
            <Link href="/" passHref>
                <span className="text-2xl font-bold text-primary cursor-pointer">ChessDB</span>
            </Link>
          </div>
        </header>

        <main className="flex-grow container mx-auto p-4 sm:p-6">
          <div className="mb-6">
            <Button variant="outline" size="sm" onClick={() => setSelectedOpening(null)}>
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back to Openings
            </Button>
          </div>
          <ChessDatabase opening={selectedOpening} />
        </main>

        <footer className="text-center py-4 text-muted-foreground text-sm border-t border-border mt-auto">
          ChessDB - Train Smarter.
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="p-4 border-b border-border sticky top-0 bg-background/80 backdrop-blur-sm z-10">
        <div className="container mx-auto flex justify-between items-center">
          <Link href="/" passHref>
             <span className="text-2xl font-bold text-primary cursor-pointer">ChessDB</span>
          </Link>
        </div>
      </header>

      <main className="flex-grow container mx-auto p-4 sm:p-6">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold flex items-center text-foreground">
                <BookOpen className="mr-3 h-8 w-8 text-primary" /> Chess Openings ({totalOpenings})
            </h2>
            <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
                <Filter className="w-4 h-4 mr-2" />
                {showFilters ? "Hide Filters" : "Show Filters"}
            </Button>
        </div>
        <p className="text-muted-foreground mb-6">
            Browse through popular chess openings, learn their key positions, main lines, and common traps.
        </p>

        <form onSubmit={handleSearch} className="mb-6">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search openings by name, description, or ECO code..."
              className="flex-1 bg-input border border-border rounded-md px-3 py-2 text-foreground focus:ring-ring focus:border-ring"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <Button type="submit">Search</Button>
          </div>
        </form>

        {showFilters && (
          <Card className="mb-8">
            <CardHeader>
                <CardTitle>Filter Openings</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 gap-4">
                <div>
                    <label htmlFor="category-filter" className="block text-sm font-medium text-muted-foreground mb-2">Category</label>
                    <select
                    id="category-filter"
                    className="w-full bg-input border-border rounded-md px-3 py-2 text-foreground focus:ring-ring focus:border-ring"
                    value={selectedCategory}
                    onChange={(e) => updateFilters(e.target.value)}
                    >
                    <option value="all">All Categories</option>
                    <option value="Axx">Axx - Flank Openings</option>
                    <option value="Bxx">Bxx - Semi-Open Games</option>
                    <option value="Cxx">Cxx - Open Games</option>
                    <option value="Dxx">Dxx - Closed Games</option>
                    <option value="Exx">Exx - Indian Defenses</option>
                    </select>
                </div>
                </div>
            </CardContent>
          </Card>
        )}

        {allOpenings.length > 0 ? (
            <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {allOpenings.map((opening) => (
                    <OpeningCard key={opening.id} opening={opening} onViewDatabase={() => setSelectedOpening(opening)} />
                ))}
                </div>

                {/* Pagination Controls */}
                <div className="mt-8 flex justify-center items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground">
                        Page {currentPage} of {totalPages}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                    >
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                </div>
            </>
        ) : (
            <Card>
                <CardContent className="pt-6">
                    <p className="text-muted-foreground text-center">No openings match your current filters.</p>
                </CardContent>
            </Card>
        )}
      </main>

      <footer className="text-center py-4 text-muted-foreground text-sm border-t border-border mt-auto">
        ChessDB - Train Smarter.
      </footer>
    </div>
  );
}

function OpeningCard({ opening, onViewDatabase }: { opening: CombinedOpening; onViewDatabase: () => void }) {
  const getMoveNotation = (move: string, index: number) => {
    if (index % 2 === 0) {
      return `${Math.floor(index / 2) + 1}. ${move}`;
    }
    return move;
  };

  const mainLinePreview = opening.mainLineMoves && opening.mainLineMoves.length > 0 
    ? opening.mainLineMoves.slice(0, 5).map(getMoveNotation).join(" ") + (opening.mainLineMoves.length > 5 ? "..." : "")
    : "No main line moves available.";

  return (
    <Card className="overflow-hidden flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl">{opening.name}</CardTitle>
            <CardDescription>{opening.category}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col justify-between">
        <div className="mb-4 flex justify-center items-center">
          <div className="flex justify-center items-center">
           <Chessboard
            key={opening.fen}
            position={opening.fen}
            boardWidth={280}
            arePiecesDraggable={false}
            areArrowsAllowed={false}
            customBoardStyle={{
              borderRadius: "4px",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
            }}
          />
          </div>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-3 mb-2 h-16 overflow-hidden">{opening.description}</p>
        
        {opening.mainLineMoves && opening.mainLineMoves.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-mono text-muted-foreground truncate" title={opening.mainLineMoves.map(getMoveNotation).join(" ")}>
              <strong>Line:</strong> {mainLinePreview}
            </p>
          </div>
        )}

        <div className="mb-4 p-3 bg-muted/50 rounded-lg text-muted-foreground">
          <p className="text-xs text-center">Statistics not available.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 mt-auto">
          <Button variant="outline" size="sm" onClick={onViewDatabase} className="flex-1">
            <Database className="w-4 h-4 mr-1" />
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 