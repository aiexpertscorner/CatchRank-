import path from "node:path";
import { searchProducts, listPopularProducts } from "../../src/lib/bol-client.mjs";
import { readJson, writeJson, ensureDir, sleep } from "../../src/lib/fs-utils.mjs";
import { unique } from "../../src/lib/text-utils.mjs";

const CONFIG = path.resolve("src/data/config/query-clusters.nl.json");
const OUT_DIR = path.resolve("src/data/raw/bol");
const OUT_FILE = path.join(OUT_DIR, "discovered-products.json");

async function main() {
  ensureDir(OUT_DIR);
  const clusters = readJson(CONFIG, {});
  const results = {};
  const eanSet = new Set();

  for (const [clusterKey, queries] of Object.entries(clusters)) {
    results[clusterKey] = { queries: {}, popular: [] };

    for (const query of queries) {
      console.log(`Searching: ${query}`);
      const res = await searchProducts(query, { sort: "RELEVANCE" });
      const items = (res.results || []).map((item) => ({
        ean: item.ean,
        bolProductId: item.bolProductId,
        title: item.title,
        url: item.url,
        rating: item.rating ?? null,
        offer: item.offer ?? null,
        image: item.image ?? null
      }));
      results[clusterKey].queries[query] = items;
      items.forEach((item) => eanSet.add(item.ean));
      await sleep(400);
    }

    console.log(`Popular list for cluster: ${clusterKey}`);
    const popular = await listPopularProducts({ sort: "POPULARITY" });
    results[clusterKey].popular = (popular.results || []).slice(0, 25).map((item) => ({
      ean: item.ean,
      bolProductId: item.bolProductId,
      title: item.title,
      url: item.url,
      rating: item.rating ?? null,
      offer: item.offer ?? null,
      image: item.image ?? null
    }));
    results[clusterKey].popular.forEach((item) => eanSet.add(item.ean));
    await sleep(500);
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    totalUniqueEans: eanSet.size,
    clusters: results,
    allEans: unique([...eanSet])
  };

  writeJson(OUT_FILE, summary);
  console.log(`Wrote ${OUT_FILE} with ${eanSet.size} unique EANs`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
