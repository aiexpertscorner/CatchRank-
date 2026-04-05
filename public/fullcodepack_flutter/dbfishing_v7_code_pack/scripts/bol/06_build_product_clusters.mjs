import path from "node:path";
import { readJson, writeJson } from "../../src/lib/fs-utils.mjs";
import { unique, slug } from "../../src/lib/text-utils.mjs";

const IN_FILE = path.resolve("src/data/build/scored-products.json");
const OUT_FILE = path.resolve("src/data/build/product-clusters.json");

function addToMap(map, key, item) {
  if (!key) return;
  if (!map[key]) map[key] = [];
  map[key].push(item);
}

function main() {
  const data = readJson(IN_FILE, { results: [] });
  const clusters = {};

  for (const item of data.results || []) {
    for (const species of item.taxonomy?.species || []) {
      addToMap(clusters, `species:${species}`, item);
    }
    for (const technique of item.taxonomy?.technique || []) {
      addToMap(clusters, `technique:${technique}`, item);
    }
    for (const species of item.taxonomy?.species || []) {
      for (const technique of item.taxonomy?.technique || []) {
        addToMap(clusters, `combo:${species}:${technique}`, item);
      }
    }
  }

  const normalizedClusters = Object.entries(clusters).map(([key, items]) => ({
    key,
    slug: slug(key.replaceAll(":", "-")),
    labels: key.split(":"),
    total: items.length,
    topProducts: unique(items)
      .sort((a, b) => b.scores.composite - a.scores.composite)
      .slice(0, 24)
      .map((item) => ({
        id: item.id,
        ean: item.ean,
        slug: item.slug,
        title: item.title,
        price: item.merchant_offers?.[0]?.price ?? null,
        score: item.scores.composite
      }))
  }));

  writeJson(OUT_FILE, {
    generatedAt: new Date().toISOString(),
    total: normalizedClusters.length,
    results: normalizedClusters
  });
  console.log(`Wrote ${OUT_FILE}`);
}

main();
