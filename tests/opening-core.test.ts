import { describe, it, expect } from "vitest";
import {
  toEpd,
  slugify,
  parseOpeningName,
  whiteFirstOf,
  categorize,
  START_FEN,
  START_EPD,
} from "@/lib/opening-core.mjs";

describe("toEpd", () => {
  it("keeps the first four FEN fields (board, turn, castling, ep)", () => {
    expect(toEpd(START_FEN)).toBe(START_EPD);
  });

  it("drops halfmove and fullmove counters so transpositions collapse", () => {
    const a = "r1bqkbnr/pp1ppppp/2n5/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3";
    const b = "r1bqkbnr/pp1ppppp/2n5/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 9 15";
    expect(toEpd(a)).toBe(toEpd(b));
  });
});

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Ruy Lopez")).toBe("ruy-lopez");
  });

  it("strips diacritics", () => {
    expect(slugify("Réti Opening")).toBe("reti-opening");
    expect(slugify("Bird's Défense")).toBe("bird-s-defense");
  });

  it("collapses punctuation runs and trims edge hyphens", () => {
    expect(slugify("Sicilian Defense: Najdorf, Byrne (English) Attack")).toBe(
      "sicilian-defense-najdorf-byrne-english-attack"
    );
  });

  it("respects maxLen without leaving a trailing hyphen", () => {
    const out = slugify("aaaa bbbb cccc dddd", 10);
    expect(out.length).toBeLessThanOrEqual(10);
    expect(out.endsWith("-")).toBe(false);
  });
});

describe("parseOpeningName", () => {
  it("returns the whole name as family when there is no colon", () => {
    expect(parseOpeningName("Italian Game")).toEqual({
      family: "Italian Game",
      variation: null,
      subVariation: null,
    });
  });

  it("splits family / variation / subVariation on colon then commas", () => {
    expect(parseOpeningName("Sicilian Defense: Najdorf, Byrne, English Attack")).toEqual({
      family: "Sicilian Defense",
      variation: "Najdorf",
      subVariation: "Byrne, English Attack",
    });
  });

  it("handles a colon with a single variation and no sub", () => {
    expect(parseOpeningName("Caro-Kann Defense: Advance")).toEqual({
      family: "Caro-Kann Defense",
      variation: "Advance",
      subVariation: null,
    });
  });
});

describe("whiteFirstOf", () => {
  it("returns the move when it is a known first move", () => {
    expect(whiteFirstOf(["e4", "c5"])).toBe("e4");
    expect(whiteFirstOf(["Nf3"])).toBe("Nf3");
    expect(whiteFirstOf(["b3"])).toBe("b3");
  });

  it("buckets unlisted or empty first moves to 'other'", () => {
    expect(whiteFirstOf(["a3"])).toBe("other");
    expect(whiteFirstOf([])).toBe("other");
  });

  it("ignores check/mate annotations", () => {
    expect(whiteFirstOf(["e4+"])).toBe("e4");
  });
});

describe("categorize", () => {
  it("classifies 1.e4 e5 as OPEN and other 1.e4 as SEMI_OPEN", () => {
    expect(categorize(["e4", "e5"])).toBe("OPEN");
    expect(categorize(["e4", "c5"])).toBe("SEMI_OPEN");
    expect(categorize(["e4"])).toBe("SEMI_OPEN");
  });

  it("classifies 1.d4 lines: d5 CLOSED, Nf6 INDIAN, else CLOSED", () => {
    expect(categorize(["d4", "d5"])).toBe("CLOSED");
    expect(categorize(["d4", "Nf6"])).toBe("INDIAN");
    expect(categorize(["d4", "f5"])).toBe("CLOSED");
  });

  it("classifies flank first moves as FLANK", () => {
    for (const w1 of ["c4", "Nf3", "g3", "b3", "f4"]) {
      expect(categorize([w1])).toBe("FLANK");
    }
  });

  it("classifies empty and unusual openings as IRREGULAR", () => {
    expect(categorize([])).toBe("IRREGULAR");
    expect(categorize(["a4"])).toBe("IRREGULAR");
  });
});
