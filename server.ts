import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Weather API Endpoint
  app.get("/api/weather", async (req, res) => {
    const { q } = req.query;
    const apiKey = process.env.WEATHER_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "Weather API key is not configured" });
    }

    if (!q) {
      return res.status(400).json({ error: "Location query 'q' is required" });
    }

    try {
      const response = await fetch(
        `http://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${q}&days=3&aqi=no&alerts=no&lang=nl`
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        return res.status(response.status).json(errorData);
      }

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Weather API error:", error);
      res.status(500).json({ error: "Failed to fetch weather data" });
    }
  });

  // ─── Fishinn / TradeTracker Product Feed ──────────────────────────────────
  //
  // POST /api/gear/fishinn-feed
  // Fetches the TradeTracker JSON product feed for Fishinn and returns
  // normalized products. The client (productFeedService) then writes these
  // to Firestore product_catalog. Only called when cache is stale.
  //
  app.post("/api/gear/fishinn-feed", async (req, res) => {
    const feedUrl = process.env.FISHINN_FEED_URL;

    if (!feedUrl) {
      return res.status(500).json({ error: "FISHINN_FEED_URL not configured" });
    }

    try {
      const response = await fetch(feedUrl);
      if (!response.ok) {
        return res.status(response.status).json({ error: "Feed fetch failed" });
      }

      const raw = await response.json();

      // TradeTracker JSON feed wraps products in various keys — handle common shapes
      const productArray: Record<string, any>[] = Array.isArray(raw)
        ? raw
        : raw.products ?? raw.product ?? raw.items ?? raw.feed?.products ?? [];

      // Inline normalize to avoid importing TypeScript src files in server.ts
      const normalized = productArray.slice(0, 200).map((p: Record<string, any>) => ({
        externalId: String(p.ID ?? p.id ?? p.productId ?? Math.random()),
        source: "fishinn",
        name: p.name ?? p.productName ?? p.title ?? "Onbekend product",
        brand: p.brand ?? p.manufacturer ?? undefined,
        category: normalizeFishinnCategory(p.category ?? p.categoryName ?? ""),
        description: p.description ?? p.shortDescription ?? undefined,
        imageURL: p.imageURL ?? p.image ?? p.imageUrl ?? undefined,
        price: parseFloat(p.price ?? p.Price ?? 0) || undefined,
        currency: "EUR",
        affiliateURL: p.deeplink ?? p.clickURL ?? p.URL ?? "",
        ean: p.EAN ?? p.ean ?? undefined,
        inStock: p.stock !== "0" && p.stock !== 0,
      }));

      res.json({ count: normalized.length, products: normalized });
    } catch (error) {
      console.error("Fishinn feed error:", error);
      res.status(500).json({ error: "Failed to fetch Fishinn feed" });
    }
  });

  // ─── Bol.com Marketing Catalog Feed ───────────────────────────────────────
  //
  // POST /api/gear/bol-feed
  // Authenticates with Bol.com Marketing Catalog API using OAuth2
  // client_credentials, fetches the product feed, normalizes and returns it.
  //
  app.post("/api/gear/bol-feed", async (req, res) => {
    const clientId = process.env.BOL_MARKETING_CLIENT_ID;
    const clientSecret = process.env.BOL_MARKETING_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return res.status(500).json({ error: "Bol.com Marketing API credentials not configured" });
    }

    try {
      // Step 1: Get OAuth2 access token
      const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
      const tokenResponse = await fetch("https://login.bol.com/token?grant_type=client_credentials", {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      if (!tokenResponse.ok) {
        const errBody = await tokenResponse.text();
        console.error("Bol.com token error:", errBody);
        return res.status(401).json({ error: "Bol.com authentication failed" });
      }

      const tokenData = await tokenResponse.json();
      const accessToken = tokenData.access_token;

      // Step 2: Fetch marketing catalog products
      // Bol.com Marketing Catalog API: GET /retailer/marketing/catalog-products
      const catalogResponse = await fetch(
        "https://api.bol.com/retailer/marketing/catalog-products?category=SPORT_OUTDOOR&limit=200",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/vnd.retailer.v10+json",
          },
        }
      );

      if (!catalogResponse.ok) {
        const errBody = await catalogResponse.text();
        console.error("Bol catalog error:", errBody);
        return res.status(catalogResponse.status).json({ error: "Bol catalog fetch failed" });
      }

      const catalogData = await catalogResponse.json();
      const productArray: Record<string, any>[] = catalogData.catalogProducts ?? catalogData.products ?? [];

      const normalized = productArray.slice(0, 200).map((p: Record<string, any>) => ({
        externalId: String(p.ean ?? p.productId ?? p.id ?? Math.random()),
        source: "bol",
        name: p.title ?? p.name ?? "Onbekend product",
        brand: p.brand ?? undefined,
        category: normalizeFishinnCategory(p.mainCategory ?? p.category ?? ""),
        description: p.shortDescription ?? p.description ?? undefined,
        imageURL: p.imageUrl ?? p.image ?? undefined,
        price: parseFloat(p.price ?? p.listPrice ?? 0) || undefined,
        currency: "EUR",
        affiliateURL: p.url ?? `https://www.bol.com/nl/p/${p.ean}/`,
        ean: p.ean ?? undefined,
        inStock: p.available ?? true,
      }));

      res.json({ count: normalized.length, products: normalized });
    } catch (error) {
      console.error("Bol.com feed error:", error);
      res.status(500).json({ error: "Failed to fetch Bol.com catalog" });
    }
  });

  // ─── Shared helpers ────────────────────────────────────────────────────────

  function normalizeFishinnCategory(raw: string): string {
    const lower = raw.toLowerCase();
    if (lower.includes("hengel") || lower.includes("rod")) return "rod";
    if (lower.includes("molen") || lower.includes("reel")) return "reel";
    if (lower.includes("lijn") || lower.includes("line") || lower.includes("draad")) return "line";
    if (lower.includes("kunstaas") || lower.includes("lure") || lower.includes("shad") || lower.includes("plug")) return "lure";
    if (lower.includes("haak") || lower.includes("hook")) return "hook";
    if (lower.includes("aas") || lower.includes("bait")) return "bait";
    return "accessory";
  }

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
