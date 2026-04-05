import path from "node:path";
import { readJson, writeJson } from "../../src/lib/fs-utils.mjs";
import { slug } from "../../src/lib/text-utils.mjs";

const IN_FILE = path.resolve("src/data/build/scored-products.json");
const OUT_FILE = path.resolve("src/data/build/best-pages.json");

function buildBestPage(label, filterFn, items) {
  const selected = items.filter(filterFn).sort((a, b) => b.scores.composite - a.scores.composite).slice(0, 12);
  if (!selected.length) return null;

  return {
    slug: slug(label),
    title: label,
    intro: `${label} voor de Nederlandse markt, geselecteerd op relevantie, prijs, rating en affiliate bruikbaarheid.`,
    items: selected.map((item, index) => ({
      rank: index + 1,
      id: item.id,
      ean: item.ean,
      slug: item.slug,
      title: item.title,
      price: item.merchant_offers?.[0]?.price ?? null,
      score: item.scores.composite
    }))
  };
}

function main() {
  const data = readJson(IN_FILE, { results: [] });
  const items = data.results || [];

  const pages = [
    buildBestPage("beste karper producten", (i) => i.taxonomy.species?.includes("karper"), items),
    buildBestPage("beste snoek producten", (i) => i.taxonomy.species?.includes("snoek"), items),
    buildBestPage("beste karper hengels", (i) => i.taxonomy.species?.includes("karper") && /hengel/i.test(i.title), items),
    buildBestPage("beste snoek kunstaas", (i) => i.taxonomy.species?.includes("snoek") && /jerkbait|shad|spinner|plug/i.test(i.title), items),
    buildBestPage("beste onthaakmatten", (i) => /onthaakmat/i.test(i.title), items)
  ].filter(Boolean);

  writeJson(OUT_FILE, {
    generatedAt: new Date().toISOString(),
    total: pages.length,
    results: pages
  });
  console.log(`Wrote ${OUT_FILE}`);
}

main();
