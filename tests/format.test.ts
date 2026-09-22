import { describe, it, expect } from "vitest";
import { formatSans, serialize } from "@/lib/format";

describe("formatSans", () => {
  it("numbers white moves and pairs black moves", () => {
    expect(formatSans(["e4", "e5", "Nf3", "Nc6"])).toBe("1. e4 e5 2. Nf3 Nc6");
  });

  it("handles a trailing white move without a black reply", () => {
    expect(formatSans(["e4", "e5", "Nf3"])).toBe("1. e4 e5 2. Nf3");
  });

  it("returns an empty string for no moves", () => {
    expect(formatSans([])).toBe("");
  });
});

describe("serialize", () => {
  it("deep-clones plain data", () => {
    const input = { a: 1, b: { c: [2, 3] } };
    const out = serialize(input);
    expect(out).toEqual(input);
    expect(out).not.toBe(input);
    expect(out.b).not.toBe(input.b);
  });

  it("converts Date values to ISO strings (client boundary safe)", () => {
    const d = new Date("2020-01-02T03:04:05.000Z");
    const out = serialize({ createdAt: d }) as unknown as { createdAt: string };
    expect(out.createdAt).toBe("2020-01-02T03:04:05.000Z");
  });
});
