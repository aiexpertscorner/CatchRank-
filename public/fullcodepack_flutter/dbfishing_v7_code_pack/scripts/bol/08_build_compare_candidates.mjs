import path from "node:path";
import { readJson, writeJson } from "../../src/lib/fs-utils.mjs";
import { slug } from "../../src/lib/text-utils.mjs";

const IN_FILE = path.resolve("src/data/build/scored-products.json");
const OUT_FILE = path.resolve("src/data/build/compare-candidates.json");

function comparableBucket(item) {
  const title = item.title.toLowerCase();
  if (title.includes("hengel")) return "hengels";
  if (/molen|reel|baitrunner/.test(title)) return "molens";
  if (/boilie|pellet/.test(title)) return "aas";
  if (/jerkbait|shad|spinner|plug/.test(title)) return "kunstaas";
  return null;
}

function main() {
  const data = readJson(IN_FILE, { results: [] });
  const buckets = {};

  for (const item of data.results || []) {
    const bucket = comparableBucket(item);
    if (!bucket) continue;
    if (!buckets[bucket]) buckets[bucket] = [];
    buckets[bucket].push(item);
  }

  const pairs = [];
  for (const [bucket, items] of Object.entries(buckets)) {
    const top = items.sort((a, b) => b.scores.composite - a.scores.composite).slice(0, 10);
    for (let i = 0; i < top.length; i++) {
      for (let j = i + 1; j < top.length; j++) {
        const a = top[i];
        const b = top[j];
        pairs.push({
          bucket,
          slug: slug(`${a.slug}-vs-${b.slug}`),
          a: { id: a.id, slug: a.slug, title: a.title },
          b: { id: b.id, slug: b.slug, title: b.title }
        });
      }
    }
  }

  writeJson(OUT_FILE, {
    generatedAt: new Date().toISOString(),
    total: pairs.length,
    results: pairs
  });
  console.log(`Wrote ${OUT_FILE}`);
}

main();
