import { getFamiliesWithCounts, getOpeningsList, getStats } from "@/lib/openings-repo";
import { HomePageClient } from "@/app/HomePageClient";
import type { OpeningCategory } from "@prisma/client";

interface SearchParams {
  q?: string;
  category?: string;
  family?: string;
  eco?: string;
  whiteFirst?: string;
  page?: string;
  view?: string;
}

export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const query = sp.q ?? "";
  const category = (sp.category ?? "all") as OpeningCategory | "all";
  const familySlug = sp.family ?? "all";
  const ecoPrefix = sp.eco ?? "";
  const whiteFirst = sp.whiteFirst ?? "all";
  const page = Math.max(1, Number(sp.page) || 1);
  const view = sp.view ?? "openings";
  const perPage = 24;

  const [stats, families, list] = await Promise.all([
    getStats(),
    getFamiliesWithCounts(),
    getOpeningsList({ query, category, familySlug, ecoPrefix, whiteFirst, page, perPage }),
  ]);

  // Serialize for client (Prisma Dates -> strings)
  const ser = (o: unknown) => JSON.parse(JSON.stringify(o));

  return (
    <HomePageClient
      stats={stats}
      families={ser(families)}
      openings={ser(list.openings)}
      total={list.total}
      totalPages={list.totalPages}
      page={page}
      query={query}
      category={category}
      familySlug={familySlug}
      ecoPrefix={ecoPrefix}
      whiteFirst={whiteFirst}
      view={view}
    />
  );
}
