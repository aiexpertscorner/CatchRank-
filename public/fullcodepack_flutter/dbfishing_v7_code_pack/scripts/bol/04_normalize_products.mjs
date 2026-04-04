import path from "node:path";
import { readJson, writeJson } from "../../src/lib/fs-utils.mjs";
import { slug, cleanText, containsAny, unique } from "../../src/lib/text-utils.mjs";

const IN_FILE = path.resolve("src/data/raw/bol/enriched-products.json");
const SPECIES_MAP = path.resolve("examples/species-map.json");
const OUT_FILE = path.resolve("src/data/build/canonical-products.json");

function flattenCategories(categoryTree = [], trail = [], out = []) {
  for (const cat of categoryTree) {
    const nextTrail = [...trail, { id: String(cat.categoryId), name: cat.categoryName }];
    out.push(nextTrail.map((x) => x.name).join(" > "));
    if (Array.isArray(cat.subcategories)) flattenCategories(cat.subcategories, nextTrail, out);
  }
  return out;
}

function estimateRatingCount(ratings = []) {
  return (ratings || []).reduce((sum, item) => sum + Number(item.count || 0), 0);
}

function inferTaxonomy(text, speciesMap) {
  const lowerText = cleanText(text).toLowerCase();
  const species = [];
  const seasons = [];
  const waterTypes = [];

  for (const [name, cfg] of Object.entries(speciesMap || {})) {
    if (containsAny(lowerText, cfg.keywords || [])) {
      species.push(name);
      seasons.push(...(cfg.seasons || []));
      waterTypes.push(...(cfg.water_types || []));
    }
  }

  const technique = [];
  if (containsAny(lowerText, ["jerkbait", "baitcaster", "spinhengel"])) technique.push("roofvissen");
  if (containsAny(lowerText, ["boilie", "big pit", "rod pod", "baitrunner"])) technique.push("karpervissen");
  if (containsAny(lowerText, ["feeder", "korf"])) technique.push("feedervissen");

  const baitType = [];
  if (containsAny(lowerText, ["boilie", "pellet", "particle"])) baitType.push("aas");
  if (containsAny(lowerText, ["jerkbait", "shad", "spinner", "plug"])) baitType.push("kunstaas");

  let skillLevel = "allround";
  if (containsAny(lowerText, ["starter", "beginner"])) skillLevel = "beginner";
  if (containsAny(lowerText, ["pro", "competition", "expert"])) skillLevel = "gevorderd";

  return {
    species: unique(species),
    technique: unique(technique),
    bait_type: unique(baitType),
    water_type: unique(waterTypes),
    season: unique(seasons),
    skill_level: skillLevel
  };
}

function normalizeOffer(offer, productFallback) {
  const price = offer?.price ?? productFallback?.offer?.price ?? null;
  const url = offer?.url ?? productFallback?.url ?? null;
  if (!price || !url) return [];
  return [{
    merchant: "bol",
    price,
    url,
    availability_text: offer?.deliveryDescription ?? productFallback?.offer?.deliveryDescription ?? "",
    seller_name: offer?.seller?.name ?? "",
    currency: "EUR"
  }];
}

function normalizeItem(item, speciesMap) {
  const product = item.product || {};
  const ratings = item.ratings || {};
  const categories = item.categories || {};
  const variants = item.variants || {};
  const recommendations = item.recommendations || {};
  const title = cleanText(product.title);
  const description = cleanText(product.description);
  const blob = `${title} ${description} ${JSON.stringify(product.specificationGroups || [])}`;

  return {
    id: `bol-${item.ean}`,
    ean: item.ean,
    slug: slug(title || item.ean),
    title,
    brand: extractBrand(title),
    description,
    merchant_offers: normalizeOffer(item.offer, product),
    image: product.image || null,
    images: [],
    categories: flattenCategories(categories.categories || []),
    specs: product.specificationGroups || [],
    rating: {
      average: ratings.averageRating ?? product.rating ?? null,
      count_estimate: estimateRatingCount(ratings.ratings || [])
    },
    variants: variants.variantGroups || [],
    recommendation_eans: recommendations.recommendedProducts || [],
    taxonomy: inferTaxonomy(blob, speciesMap),
    scores: {
      relevance: 0,
      commercial: 0,
      rating: 0,
      composite: 0
    },
    source: {
      merchant: "bol",
      bolProductId: product.bolProductId || null,
      url: product.url || null
    }
  };
}

function extractBrand(title = "") {
  const first = cleanText(title).split(" ")[0] || "";
  return first.length <= 25 ? first : "";
}

function main() {
  const data = readJson(IN_FILE, { results: [] });
  const speciesMap = readJson(SPECIES_MAP, {});
  const normalized = (data.results || []).map((item) => normalizeItem(item, speciesMap));
  writeJson(OUT_FILE, {
    generatedAt: new Date().toISOString(),
    total: normalized.length,
    results: normalized
  });
  console.log(`Wrote ${OUT_FILE}`);
}

main();
