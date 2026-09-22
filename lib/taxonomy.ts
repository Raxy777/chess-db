import type { OpeningCategory } from "@prisma/client";

/** Normalize FEN -> EPD (first 4 fields: board, turn, castling, ep) for transposition-safe lookup */
export function toEpd(fen: string): string {
  return fen.split(" ").slice(0, 4).join(" ");
}

export const START_EPD = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -";
export const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export function slugify(input: string, maxLen = 80): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLen)
    .replace(/-+$/, "");
}

export interface ParsedName {
  family: string;
  variation: string | null;
  subVariation: string | null;
}

/** "Sicilian Defense: Najdorf, Byrne (English) Attack" -> family/variation/sub */
export function parseOpeningName(name: string): ParsedName {
  const [beforeColon, ...afterColon] = name.split(":");
  const family = beforeColon.trim();
  if (afterColon.length === 0) return { family, variation: null, subVariation: null };
  const rest = afterColon.join(":").trim();
  const parts = rest.split(",").map((s) => s.trim()).filter(Boolean);
  return {
    family,
    variation: parts[0] ?? null,
    subVariation: parts.length > 1 ? parts.slice(1).join(", ") : null,
  };
}

export function whiteFirstOf(sanMoves: string[]): string {
  const first = sanMoves[0] ?? "";
  // Normalize: e4, d4, c4, Nf3 are SAN; strip +/# and piece disambiguation is fine for first move
  const clean = first.replace(/[+#]/g, "");
  if (clean === "e4") return "e4";
  if (clean === "d4") return "d4";
  if (clean === "c4") return "c4";
  if (clean === "Nf3") return "Nf3";
  if (clean === "g3") return "g3";
  if (clean === "f4") return "f4";
  if (clean === "b3") return "b3";
  if (/^(e|d|c)[34]$/.test(clean)) return clean;
  return clean || "other";
}

/** Proper chess taxonomy from moves — NOT ECO first letter. */
export function categorize(sanMoves: string[]): OpeningCategory {
  if (sanMoves.length === 0) return "IRREGULAR";
  const w1 = sanMoves[0]?.replace(/[+#]/g, "") ?? "";
  const b1 = sanMoves[1]?.replace(/[+#]/g, "") ?? "";

  if (w1 === "e4") {
    if (b1 === "e5") return "OPEN";
    if (b1) return "SEMI_OPEN";
    return "SEMI_OPEN";
  }
  if (w1 === "d4") {
    if (b1 === "d5") return "CLOSED";
    if (b1 === "Nf6") return "INDIAN";
    if (b1) return "CLOSED"; // Semi-closed / Benoni / Dutch / etc. grouped as Closed systems
    return "CLOSED";
  }
  if (w1 === "c4" || w1 === "Nf3" || w1 === "g3" || w1 === "b3" || w1 === "f4") return "FLANK";
  return "IRREGULAR";
}

export const CATEGORY_LABEL: Record<OpeningCategory, string> = {
  OPEN: "Open Games · 1.e4 e5",
  SEMI_OPEN: "Semi-Open · 1.e4, not 1…e5",
  CLOSED: "Closed Games · 1.d4 d5",
  INDIAN: "Indian Defences · 1.d4 Nf6",
  FLANK: "Flank Openings · 1.c4 / 1.Nf3 / 1.g3",
  IRREGULAR: "Irregular / Uncommon",
};
