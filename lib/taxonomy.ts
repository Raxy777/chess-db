import type { OpeningCategory } from "@prisma/client";
import * as core from "@/lib/opening-core.mjs";

/** Re-exported from the shared, dependency-free core (see lib/opening-core.mjs). */
export const toEpd = core.toEpd;
export const slugify = core.slugify;
export const parseOpeningName = core.parseOpeningName;
export const whiteFirstOf = core.whiteFirstOf;
export const START_EPD = core.START_EPD;
export const START_FEN = core.START_FEN;
export const WHITE_FIRST_MOVES = core.WHITE_FIRST_MOVES;

export interface ParsedName {
  family: string;
  variation: string | null;
  subVariation: string | null;
}

/** Proper chess taxonomy from moves — NOT ECO first letter. */
export function categorize(sanMoves: string[]): OpeningCategory {
  return core.categorize(sanMoves) as OpeningCategory;
}

export const CATEGORY_LABEL: Record<OpeningCategory, string> = {
  OPEN: "Open Games · 1.e4 e5",
  SEMI_OPEN: "Semi-Open · 1.e4, not 1…e5",
  CLOSED: "Closed Games · 1.d4 d5",
  INDIAN: "Indian Defences · 1.d4 Nf6",
  FLANK: "Flank Openings · 1.c4 / 1.Nf3 / 1.g3",
  IRREGULAR: "Irregular / Uncommon",
};
