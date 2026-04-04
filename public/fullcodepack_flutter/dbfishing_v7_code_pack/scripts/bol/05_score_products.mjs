import path from "node:path";
import { readJson, writeJson } from "../../src/lib/fs-utils.mjs";

const IN_FILE = path.resolve("src/data/build/canonical-products.json");
const OUT_FILE = path.resolve("src/data/build/scored-products.json");

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function priceScore(price) {
  if (!price) return 20;
  if (price < 15) return 55;
  if (price < 40) return 70;
  if (price < 100) return 78;
  if (price < 250) return 72;
  return 60;
}

function relevanceScore(item) {
  let score = 15;
  score += (item.taxonomy.species || []).length * 18;
  score += (item.taxonomy.technique || []).length * 12;
  score += item.categories.length ? 12 : 0;
  score += item.specs.length ? 10 : 0;
  return clamp(score);
}

function commercialScore(item) {
  const offer = item.merchant_offers?.[0];
  let score = 10;
  score += offer?.price ? 25 : 0;
  score += offer?.availability_text ? 10 : 0;
  score += item.image ? 10 : 0;
  score += item.recommendation_eans?.length ? 10 : 0;
  score += priceScore(offer?.price);
  return clamp(score);
}

function ratingScore(item) {
  const avg = item.rating?.average ?? 0;
  const count = item.rating?.count_estimate ?? 0;
  const avgComponent = avg ? (avg / 5) * 70 : 0;
  const countComponent = Math.min(30, Math.log10(Math.max(1, count + 1)) * 12);
  return clamp(avgComponent + countComponent);
}

function main() {
  const data = readJson(IN_FILE, { results: [] });
  const scored = (data.results || []).map((item) => {
    const relevance = relevanceScore(item);
    const commercial = commercialScore(item);
    const rating = ratingScore(item);
    const composite = clamp((relevance * 0.45) + (commercial * 0.35) + (rating * 0.20));
    return {
      ...item,
      scores: { relevance, commercial, rating, composite }
    };
  }).sort((a, b) => b.scores.composite - a.scores.composite);

  writeJson(OUT_FILE, {
    generatedAt: new Date().toISOString(),
    total: scored.length,
    results: scored
  });
  console.log(`Wrote ${OUT_FILE}`);
}

main();
