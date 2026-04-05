import path from "node:path";
import { getProduct, getOffer, getRatings, getCategories, getVariants, getRecommendations } from "../../src/lib/bol-client.mjs";
import { readJson, writeJson, ensureDir, sleep, chunk } from "../../src/lib/fs-utils.mjs";

const IN_FILE = path.resolve("src/data/raw/bol/discovered-products.json");
const OUT_DIR = path.resolve("src/data/raw/bol/enriched");
const OUT_FILE = path.resolve("src/data/raw/bol/enriched-products.json");

async function enrichEan(ean) {
  const out = { ean, errors: [] };

  for (const [key, fn] of Object.entries({
    product: () => getProduct(ean),
    offer: () => getOffer(ean),
    ratings: () => getRatings(ean),
    categories: () => getCategories(ean),
    variants: () => getVariants(ean),
    recommendations: () => getRecommendations(ean)
  })) {
    try {
      out[key] = await fn();
    } catch (err) {
      out.errors.push({ key, message: err.message });
    }
    await sleep(200);
  }

  return out;
}

async function main() {
  ensureDir(OUT_DIR);
  const discovered = readJson(IN_FILE, { allEans: [] });
  const eans = discovered.allEans || [];
  const enriched = [];

  for (const group of chunk(eans, 20)) {
    for (const ean of group) {
      console.log(`Enriching ${ean}`);
      const item = await enrichEan(ean);
      enriched.push(item);
      writeJson(path.join(OUT_DIR, `${ean}.json`), item);
    }
    writeJson(OUT_FILE, {
      generatedAt: new Date().toISOString(),
      total: enriched.length,
      results: enriched
    });
  }

  console.log(`Wrote ${OUT_FILE}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
