import slugify from "slugify";

export function slug(value) {
  return slugify(String(value || ""), { lower: true, strict: true, locale: "nl" });
}

export function cleanText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/\u00a0/g, " ")
    .trim();
}

export function containsAny(haystack, needles) {
  const h = cleanText(haystack).toLowerCase();
  return needles.some((needle) => h.includes(String(needle).toLowerCase()));
}

export function unique(arr) {
  return [...new Set((arr || []).filter(Boolean))];
}
