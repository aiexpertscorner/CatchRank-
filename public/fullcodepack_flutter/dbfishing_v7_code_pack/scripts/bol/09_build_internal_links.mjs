import path from "node:path";
import { readJson, writeJson } from "../../src/lib/fs-utils.mjs";

const PRODUCTS_FILE = path.resolve("src/data/build/scored-products.json");
const BEST_FILE = path.resolve("src/data/build/best-pages.json");
const CLUSTERS_FILE = path.resolve("src/data/build/product-clusters.json");
const OUT_FILE = path.resolve("src/data/build/internal-links.json");

function main() {
  const products = readJson(PRODUCTS_FILE, { results: [] }).results || [];
  const bestPages = readJson(BEST_FILE, { results: [] }).results || [];
  const clusters = readJson(CLUSTERS_FILE, { results: [] }).results || [];

  const bestBySpecies = {};
  for (const page of bestPages) {
    if (page.slug.includes("karper")) bestBySpecies.karper = page.slug;
    if (page.slug.includes("snoek")) bestBySpecies.snoek = page.slug;
  }

  const out = products.map((item) => {
    const relatedClusters = clusters
      .filter((c) => c.topProducts.some((p) => p.id === item.id))
      .slice(0, 6)
      .map((c) => `/clusters/${c.slug}/`);

    const relatedBest = (item.taxonomy.species || [])
      .map((species) => bestBySpecies[species])
      .filter(Boolean)
      .map((slug) => `/best/${slug}/`);

    return {
      id: item.id,
      productUrl: `/producten/${item.slug}/`,
      links: [...new Set([...relatedClusters, ...relatedBest])]
    };
  });

  writeJson(OUT_FILE, {
    generatedAt: new Date().toISOString(),
    total: out.length,
    results: out
  });
  console.log(`Wrote ${OUT_FILE}`);
}

main();
