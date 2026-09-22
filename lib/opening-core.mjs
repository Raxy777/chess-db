// @ts-check
/**
 * Pure opening/taxonomy helpers — the single source of truth shared by the
 * Next.js app (via lib/taxonomy.ts) and the seed pipeline (scripts/seed.mjs).
 * Keep this dependency-free so it runs under plain Node ESM and the bundler.
 */

/** Normalize FEN -> EPD (first 4 fields: board, turn, castling, ep) for transposition-safe lookup.
 * @param {string} fen
 * @returns {string}
 */
export function toEpd(fen) {
  return fen.split(" ").slice(0, 4).join(" ");
}

export const START_EPD = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -";
export const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

/** First moves we expose as discrete filter values; anything else buckets to "other". */
export const WHITE_FIRST_MOVES = ["e4", "d4", "c4", "Nf3", "g3", "f4", "b3"];

/**
 * @param {string} input
 * @param {number} [maxLen]
 * @returns {string}
 */
export function slugify(input, maxLen = 80) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLen)
    .replace(/-+$/, "");
}

/**
 * "Sicilian Defense: Najdorf, Byrne (English) Attack" -> family/variation/sub.
 * @param {string} name
 * @returns {{ family: string, variation: string | null, subVariation: string | null }}
 */
export function parseOpeningName(name) {
  const idx = name.indexOf(":");
  if (idx === -1) return { family: name.trim(), variation: null, subVariation: null };
  const family = name.slice(0, idx).trim();
  const rest = name.slice(idx + 1).trim();
  const parts = rest.split(",").map((s) => s.trim()).filter(Boolean);
  return {
    family,
    variation: parts[0] ?? null,
    subVariation: parts.length > 1 ? parts.slice(1).join(", ") : null,
  };
}

/**
 * White's first move, normalized to a filter bucket.
 * @param {string[]} sanMoves
 * @returns {string}
 */
export function whiteFirstOf(sanMoves) {
  const first = (sanMoves[0] ?? "").replace(/[+#]/g, "");
  if (!first) return "other";
  return WHITE_FIRST_MOVES.includes(first) ? first : "other";
}

/**
 * Proper chess taxonomy from the moves themselves — NOT the ECO first letter.
 * @param {string[]} sanMoves
 * @returns {"OPEN"|"SEMI_OPEN"|"CLOSED"|"INDIAN"|"FLANK"|"IRREGULAR"}
 */
export function categorize(sanMoves) {
  if (!sanMoves.length) return "IRREGULAR";
  const w1 = (sanMoves[0] ?? "").replace(/[+#]/g, "");
  const b1 = (sanMoves[1] ?? "").replace(/[+#]/g, "");

  if (w1 === "e4") return b1 === "e5" ? "OPEN" : "SEMI_OPEN";
  if (w1 === "d4") {
    if (b1 === "d5") return "CLOSED";
    if (b1 === "Nf6") return "INDIAN";
    return "CLOSED"; // Semi-closed / Benoni / Dutch etc. grouped as Closed systems
  }
  if (["c4", "Nf3", "g3", "b3", "f4"].includes(w1)) return "FLANK";
  return "IRREGULAR";
}
