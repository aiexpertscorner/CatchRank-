# Astro integration notes

## Example page routes

- `src/pages/producten/[slug].astro`
- `src/pages/best/[slug].astro`
- `src/pages/vergelijk/[slug].astro`
- `src/pages/clusters/[slug].astro`

## Recommended loaders

Use `import products from "../data/build/scored-products.json";` for static generation.

## Example `getStaticPaths`

```js
export async function getStaticPaths() {
  return products.results.map((item) => ({
    params: { slug: item.slug },
    props: { item }
  }));
}
```

## Canonical offer block

Always render:
- price
- merchant
- delivery text
- CTA to bol
- disclosure label
