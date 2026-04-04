import "dotenv/config";

const API_BASE = process.env.BOL_API_BASE || "https://api.bol.com/marketing/catalog/v1";
const TOKEN = process.env.BOL_API_TOKEN;
const ACCEPT_LANGUAGE = process.env.BOL_ACCEPT_LANGUAGE || "nl";
const COUNTRY = process.env.BOL_COUNTRY_CODE || "NL";

function buildHeaders() {
  const headers = {
    "Accept": "application/json",
    "Accept-Language": ACCEPT_LANGUAGE
  };
  if (TOKEN) headers["Authorization"] = `Bearer ${TOKEN}`;
  return headers;
}

export async function bolGet(pathname, query = {}) {
  const url = new URL(`${API_BASE}${pathname}`);
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    if (Array.isArray(value)) {
      value.forEach((v) => url.searchParams.append(key, v));
    } else {
      url.searchParams.set(key, value);
    }
  });

  const res = await fetch(url, { headers: buildHeaders() });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`bol API ${res.status} ${url}: ${text.slice(0, 300)}`);
  }
  return res.json();
}

export async function searchProducts(searchTerm, extra = {}) {
  return bolGet("/products/search", {
    "search-term": searchTerm,
    "country-code": COUNTRY,
    "include-image": true,
    "include-offer": true,
    "include-rating": true,
    "page-size": 50,
    ...extra
  });
}

export async function listPopularProducts(extra = {}) {
  return bolGet("/products/lists/popular", {
    "country-code": COUNTRY,
    "include-image": true,
    "include-offer": true,
    "include-rating": true,
    "page-size": 50,
    ...extra
  });
}

export async function getProduct(ean) {
  return bolGet(`/products/${ean}`, {
    "country-code": COUNTRY,
    "include-image": true,
    "include-offer": true,
    "include-rating": true,
    "include-specifications": true
  });
}

export async function getOffer(ean) {
  return bolGet(`/products/${ean}/offers/best`, {
    "country-code": COUNTRY,
    "include-seller": true
  });
}

export async function getRatings(ean) {
  return bolGet(`/products/${ean}/ratings`);
}

export async function getCategories(ean) {
  return bolGet(`/products/${ean}/categories`);
}

export async function getVariants(ean) {
  return bolGet(`/products/${ean}/variants`, {
    "country-code": COUNTRY
  });
}

export async function getRecommendations(ean) {
  return bolGet(`/products/${ean}/recommendations`);
}
