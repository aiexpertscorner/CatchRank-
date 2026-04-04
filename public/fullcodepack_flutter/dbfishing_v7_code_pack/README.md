# DBFishing.nl V7 Code Pack - Bol.com Product Engine

Bol-first, NL-first, multi-offer-ready code pack for DBFishing.nl.

## What is included

- FTP import blueprint for bol product feed
- Bol Catalog API discovery and enrichment scripts
- Canonical product normalization
- Fishing relevance + scoring engine
- Product clusters for setup / best-of / workflow pages
- Best pages, compare candidates and internal links datasets
- Example config, env file and schema

## Intended pipeline

```bash
npm run bol:feed
npm run bol:discover
npm run bol:enrich
npm run products:normalize
npm run products:score
npm run products:clusters
npm run pages:best
npm run pages:compare
npm run pages:links
```

## Install

```bash
npm i basic-ftp dotenv slugify
```

Node 20+ recommended.

## Environment

Copy `.env.example` to `.env` and fill in credentials.

## Output folders

- `src/data/raw/bol/` - raw feed and raw API snapshots
- `src/data/build/` - normalized build datasets

## Notes

- This pack assumes EAN is your canonical product key.
- bol-only V1, but the normalized product model is already multi-offer ready.
- The FTP path and exact feed filename may vary by bol affiliate setup; adjust in `.env`.
