import { db } from "@/lib/db";
import type { OpeningCategory } from "@prisma/client";

export interface OpeningListParams {
  query?: string;
  category?: OpeningCategory | "all";
  familySlug?: string;
  ecoPrefix?: string;
  whiteFirst?: string;
  page?: number;
  perPage?: number;
}

export async function getFamiliesWithCounts(category?: string) {
  const where = category && category !== "all" ? { category: category as OpeningCategory } : {};
  return db.openingFamily.findMany({
    where,
    orderBy: [{ lineCount: "desc" }, { name: "asc" }],
    include: { _count: { select: { openings: true } } },
  });
}

export async function getOpeningsList(params: OpeningListParams) {
  const { query = "", category = "all", familySlug, ecoPrefix, whiteFirst, page = 1, perPage = 24 } = params;
  const and: Record<string, unknown>[] = [];

  if (category !== "all") and.push({ category: category as OpeningCategory });
  if (familySlug && familySlug !== "all") and.push({ family: { slug: familySlug } });
  if (ecoPrefix) and.push({ eco: { startsWith: ecoPrefix } });
  if (whiteFirst && whiteFirst !== "all") and.push({ whiteFirst });
  if (query.trim()) {
    const q = query.trim();
    and.push({
      OR: [{ name: { contains: q } }, { eco: { contains: q } }, { family: { name: { contains: q } } }],
    });
  }

  const where = and.length ? { AND: and } : {};
  const [total, openings] = await Promise.all([
    db.opening.count({ where }),
    db.opening.findMany({
      where,
      include: { family: true },
      orderBy: [{ ply: "asc" }, { name: "asc" }],
      skip: (page - 1) * perPage,
      take: perPage,
    }),
  ]);
  return { total, openings, totalPages: Math.max(1, Math.ceil(total / perPage)) };
}

export async function getOpeningBySlug(slug: string) {
  return db.opening.findUnique({
    where: { slug },
    include: { family: { include: { keyIdeas: true } }, traps: true, variations: true },
  });
}

export async function getFamilyBySlug(slug: string) {
  return db.openingFamily.findUnique({
    where: { slug },
    include: {
      openings: { orderBy: [{ ply: "asc" }, { name: "asc" }], include: { traps: true } },
      keyIdeas: true,
    },
  });
}

/** Theory explorer: position + children + sibling lines through this position */
export async function getPositionExplorer(epd: string) {
  const position = await db.position.findUnique({
    where: { epd },
    include: {
      family: true,
      children: { include: { to: true }, orderBy: { openingCount: "desc" } },
    },
  });
  if (!position) return null;
  const linesThrough = await db.opening.findMany({
    where: { epds: { contains: epd } },
    include: { family: true },
    orderBy: [{ ply: "asc" }],
    take: 30,
  });
  return { position, linesThrough };
}

export async function getStats() {
  const [families, openings, positions, moves] = await Promise.all([
    db.openingFamily.count(),
    db.opening.count(),
    db.position.count(),
    db.positionMove.count(),
  ]);
  return { families, openings, positions, moves };
}
