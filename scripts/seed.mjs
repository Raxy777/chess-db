import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { Chess } from "chess.js";
import {
  toEpd,
  slugify,
  parseOpeningName,
  whiteFirstOf,
  categorize,
  START_FEN,
  START_EPD,
} from "../lib/opening-core.mjs";

const prisma = new PrismaClient();
const DATA_DIR = path.join(process.cwd(), "app", "data");

function tokenizePgn(pgn) {
  return pgn.split(/\s+/).map((t) => t.trim()).filter((t) => t && !/^\d+\.+$/.test(t) && !/^(1-0|0-1|1\/2-1\/2|\*)$/.test(t));
}
function replay(pgn) {
  const game = new Chess();
  const tokens = tokenizePgn(pgn);
  const sanMoves = [], uciMoves = [], fens = [START_FEN], epds = [START_EPD];
  for (const tok of tokens) {
    let mv = null;
    try { mv = game.move(tok, { strict: false }); } catch { mv = null; }
    if (!mv) {
      try { mv = game.move(tok); } catch { mv = null; }
    }
    if (!mv) continue;
    sanMoves.push(mv.san);
    uciMoves.push(mv.from + mv.to + (mv.promotion ?? ""));
    fens.push(game.fen());
    epds.push(toEpd(game.fen()));
  }
  return { sanMoves, uciMoves, fens, epds, fen: fens[fens.length - 1], epd: epds[epds.length - 1], ply: sanMoves.length };
}

async function main() {
  console.log("Seeding TheoryDB...");
  const files = (await fs.promises.readdir(DATA_DIR)).filter((f) => f.endsWith(".tsv"));
  let raw = [];
  for (const f of files) {
    const content = await fs.promises.readFile(path.join(DATA_DIR, f), "utf-8");
    const lines = content.split("\n");
    let start = lines[0]?.startsWith("eco\t") ? 1 : 0;
    for (let i = start; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const cols = line.split("\t");
      if (cols.length !== 3) continue;
      raw.push({ eco: cols[0].trim(), name: cols[1].trim(), pgn: cols[2].trim() });
    }
  }
  console.log(`Parsed ${raw.length} TSV rows from ${files.join(",")}`);

  // Curated JSON for rich content
  let curated = [];
  for (const jf of ["openings-with-stats.json", "openings.json"]) {
    const p = path.join(DATA_DIR, jf);
    if (fs.existsSync(p)) {
      try {
        const arr = JSON.parse(await fs.promises.readFile(p, "utf-8"));
        if (Array.isArray(arr)) curated = curated.concat(arr);
      } catch {}
    }
  }
  console.log(`Loaded ${curated.length} curated entries`);

  // Wipe
  await prisma.positionMove.deleteMany();
  await prisma.position.deleteMany();
  await prisma.openingPosition.deleteMany();
  await prisma.trap.deleteMany();
  await prisma.namedVariation.deleteMany();
  await prisma.keyIdea.deleteMany();
  await prisma.opening.deleteMany();
  await prisma.openingFamily.deleteMany();

  const families = new Map(); // name -> {slug, category counts, ecoStart/End, whiteFirst, lines}
  const parsed = [];
  const usedSlugs = new Set();

  for (const r of raw) {
    const rep = replay(r.pgn);
    if (!rep.sanMoves.length) continue;
    const { family, variation, subVariation } = parseOpeningName(r.name);
    const category = categorize(rep.sanMoves);
    const whiteFirst = whiteFirstOf(rep.sanMoves);
    parsed.push({ ...r, ...rep, family, variation, subVariation, category, whiteFirst });
    if (!families.has(family)) families.set(family, { name: family, ecos: [], cats: {}, whiteFirsts: {}, count: 0 });
    const f = families.get(family);
    f.ecos.push(r.eco);
    f.cats[category] = (f.cats[category] ?? 0) + 1;
    f.whiteFirsts[whiteFirst] = (f.whiteFirsts[whiteFirst] ?? 0) + 1;
    f.count++;
  }
  console.log(`Valid lines: ${parsed.length}, families: ${families.size}`);

  function uniqueSlug(base) {
    let s = slugify(base) || "opening";
    let c = 2;
    while (usedSlugs.has(s)) s = `${slugify(base)}-${c++}`;
    usedSlugs.add(s);
    return s;
  }

  // Create families
  const familyIdByName = new Map();
  const familySlugByName = new Map();
  for (const [name, f] of families) {
    const category = Object.entries(f.cats).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "OPEN";
    const whiteFirst = Object.entries(f.whiteFirsts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    const ecos = f.ecos.filter(Boolean).sort();
    const slug = uniqueSlug(name);
    const rec = await prisma.openingFamily.create({
      data: {
        slug, name, category, whiteFirst,
        ecoStart: ecos[0] ?? null, ecoEnd: ecos[ecos.length - 1] ?? null,
        lineCount: f.count,
      },
    });
    familyIdByName.set(name, rec.id);
    familySlugByName.set(name, slug);
  }

  // Merge curated content into families (match by slugified family/name)
  const curatedBySlug = new Map();
  for (const c of curated) {
    const key = slugify(c.name ?? c.id ?? "");
    if (key) curatedBySlug.set(key, c);
  }
  for (const [name, fid] of familyIdByName) {
    const key = slugify(name);
    // direct match or curated name contained in family
    let match = curatedBySlug.get(key);
    if (!match) {
      for (const c of curated) {
        const ck = slugify(c.name ?? "");
        if (ck && (key.includes(ck) || ck.includes(key)) && ck.length > 3) { match = c; break; }
      }
    }
    if (match) {
      await prisma.openingFamily.update({
        where: { id: fid },
        data: {
          description: (match.description ?? "").slice(0, 2000),
          historicalNotes: (match.historicalNotes ?? "").slice(0, 2000),
          popularity: match.popularity ?? "Unknown",
        },
      });
      const ideas = [...(match.keyIdeasWhite ?? []).map((t) => ({ side: "white", text: t })),
        ...(match.keyIdeasBlack ?? []).map((t) => ({ side: "black", text: t }))];
      for (const idea of ideas.slice(0, 12)) {
        await prisma.keyIdea.create({ data: { familyId: fid, side: idea.side, text: idea.text.slice(0, 1000) } });
      }
    }
  }

  // Create openings in batches
  const BATCH = 200;
  const openingIdBySlug = new Map();
  const openingRef = []; // {slug,id,epds,sanMoves,uciMoves,familyId,eco,name,ply}
  let created = 0;
  for (let i = 0; i < parsed.length; i += BATCH) {
    const chunk = parsed.slice(i, i + BATCH);
    const data = chunk.map((p) => {
      const base = `${p.name} ${p.eco}`;
      let slug = slugify(p.name) || "opening";
      if (usedSlugs.has(slug)) slug = uniqueSlug(base);
      else usedSlugs.add(slug);
      return {
        slug, eco: p.eco || null, name: p.name,
        familyId: familyIdByName.get(p.family),
        variation: p.variation, subVariation: p.subVariation,
        pgn: p.pgn, sanMoves: JSON.stringify(p.sanMoves), uciMoves: JSON.stringify(p.uciMoves),
        epds: JSON.stringify(p.epds), fen: p.fen, epd: p.epd, ply: p.ply,
        whiteFirst: p.whiteFirst, category: p.category,
        description: p.eco ? `ECO ${p.eco}` : "",
      };
    });
    await prisma.opening.createMany({ data });
    created += data.length;
    console.log(`Openings ${created}/${parsed.length}`);
  }
  const allOpenings = await prisma.opening.findMany({ select: { id: true, slug: true, epd: true, sanMoves: true, uciMoves: true, epds: true, familyId: true, eco: true, name: true, ply: true, fen: true } });
  for (const o of allOpenings) openingIdBySlug.set(o.slug, o.id);

  // Attach curated traps/variations to best-matching opening (exact FEN or family shortest)
  for (const c of curated) {
    const sanSeq = Array.isArray(c.mainLineMoves) ? c.mainLineMoves : [];
    // mainLineMoves in curated JSON are UCI (e2e4) — find opening with same start
    let target = null;
    if (c.fen) {
      const epd = toEpd(c.fen);
      target = allOpenings.find((o) => o.epd === epd);
    }
    if (!target) {
      const key = slugify(c.name ?? "");
      target = allOpenings.find((o) => slugify(o.name) === key)
        ?? allOpenings.find((o) => slugify(o.name).includes(key) || (key && slugify(o.name).startsWith(key.slice(0, 12))));
    }
    if (!target) continue;
    for (const t of (c.traps ?? []).slice(0, 5)) {
      await prisma.trap.create({
        data: {
          openingId: target.id, name: (t.name ?? "Trap").slice(0, 200),
          description: (t.description ?? "").slice(0, 2000),
          triggerUci: Array.isArray(t.correctContinuation) ? t.correctContinuation[0] ?? null : t.triggerMove ?? null,
          trapSan: t.trapMove ?? null,
          sequenceSan: JSON.stringify(t.moveSequenceToTrigger ?? []),
          penalty: typeof t.penalty === "number" ? t.penalty : 0,
        },
      }).catch(() => {});
    }
    for (const v of (c.namedVariations ?? []).slice(0, 8)) {
      await prisma.namedVariation.create({
        data: {
          openingId: target.id, name: (v.name ?? "Variation").slice(0, 200),
          sanMoves: JSON.stringify(v.moveSequence ?? []),
          fen: (v.fen ?? "").slice(0, 200),
          description: (v.shortDescription ?? "").slice(0, 1000),
        },
      }).catch(() => {});
    }
  }

  // Build position trie
  console.log("Building position tree...");
  const posMap = new Map(); // epd -> {fen, ply, eco, familyId, canonicalId, canonicalName, totalLines}
  const edgeMap = new Map(); // fromEpd+uci -> {fromEpd,san,uci,toEpd,count}
  posMap.set(START_EPD, { fen: START_FEN, ply: 0, eco: null, familyId: null, canonicalId: null, canonicalName: "Starting Position", totalLines: 0 });

  for (const o of allOpenings) {
    let epds, sans, ucis;
    try { epds = JSON.parse(o.epds); sans = JSON.parse(o.sanMoves); ucis = JSON.parse(o.uciMoves); }
    catch { continue; }
    // need fens per ply: recompute quickly from start using epds chain is enough for Position.fen (use final fen only for endpoints; intermediate fen approx = epd + " 0 1")
    for (let ply = 0; ply < epds.length - 1; ply++) {
      const from = epds[ply], to = epds[ply + 1];
      const san = sans[ply], uci = ucis[ply];
      if (!posMap.has(from)) posMap.set(from, { fen: `${from} 0 1`, ply, eco: o.eco, familyId: o.familyId, canonicalId: o.id, canonicalName: o.name, totalLines: 0 });
      if (!posMap.has(to)) posMap.set(to, { fen: o.fen && ply + 1 === epds.length - 1 ? o.fen : `${to} 0 1`, ply: ply + 1, eco: o.eco, familyId: o.familyId, canonicalId: o.id, canonicalName: o.name, totalLines: 0 });
      posMap.get(from).totalLines++;
      posMap.get(to).totalLines++;
      const ek = `${from}|${uci}`;
      if (!edgeMap.has(ek)) edgeMap.set(ek, { fromEpd: from, san, uci, toEpd: to, openingCount: 0 });
      edgeMap.get(ek).openingCount++;
    }
  }
  // fix canonical fen for start + endpoints already set; ensure ply-0 count
  posMap.get(START_EPD).totalLines = allOpenings.length;

  console.log(`Positions: ${posMap.size}, edges: ${edgeMap.size}`);
  const posArr = [...posMap.entries()].map(([epd, v]) => ({ epd, fen: v.fen, ply: v.ply, eco: v.eco, familyId: v.familyId, canonicalOpeningId: v.canonicalId, canonicalName: v.canonicalName, totalLines: v.totalLines }));
  for (let i = 0; i < posArr.length; i += 500) {
    await prisma.position.createMany({ data: posArr.slice(i, i + 500) });
    if (i % 2000 === 0) console.log(`Positions ${Math.min(i + 500, posArr.length)}/${posArr.length}`);
  }
  const edgeArr = [...edgeMap.values()];
  for (let i = 0; i < edgeArr.length; i += 500) {
    await prisma.positionMove.createMany({ data: edgeArr.slice(i, i + 500) });
    if (i % 2000 === 0) console.log(`Moves ${Math.min(i + 500, edgeArr.length)}/${edgeArr.length}`);
  }

  // Opening <-> position membership: indexed lookup for "other lines through this EPD"
  console.log("Building opening-position membership...");
  const memRows = [];
  for (const o of allOpenings) {
    let epds;
    try { epds = JSON.parse(o.epds); } catch { continue; }
    const seen = new Set();
    for (let ply = 0; ply < epds.length; ply++) {
      const epd = epds[ply];
      if (seen.has(epd)) continue; // unique [openingId, epd]
      seen.add(epd);
      memRows.push({ openingId: o.id, epd, ply });
    }
  }
  for (let i = 0; i < memRows.length; i += 500) {
    await prisma.openingPosition.createMany({ data: memRows.slice(i, i + 500) });
    if (i % 4000 === 0) console.log(`Membership ${Math.min(i + 500, memRows.length)}/${memRows.length}`);
  }
  console.log(`Membership rows: ${memRows.length}`);

  const stats = { families: await prisma.openingFamily.count(), openings: await prisma.opening.count(), positions: await prisma.position.count(), moves: await prisma.positionMove.count() };
  console.log("Done:", stats);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
