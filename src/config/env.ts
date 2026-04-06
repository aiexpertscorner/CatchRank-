/**
 * Environment configuration and feature flags.
 * Central source of truth for runtime mode, feature availability,
 * local overrides, and low-spend production behavior.
 *
 * CatchRank rules:
 * - production must not silently run in demo mode
 * - auth bypass must never be enabled by default
 * - mock/demo data must never be the primary live runtime path
 * - expensive/refresh-heavy features should stay off unless explicitly ready
 */

const meta = import.meta.env;
const isBrowser = typeof window !== 'undefined';

export const ENV = {
  /**
   * Vite runtime mode info
   */
  MODE: meta.MODE ?? 'development',
  IS_DEV: !!meta.DEV,
  IS_PROD: !!meta.PROD,

  /**
   * Safety flags
   * Keep auth bypass off by default.
   * If you ever introduce a temporary local-only bypass,
   * gate it explicitly behind DEV and never enable it on production.
   */
  BYPASS_AUTH: false,

  /**
   * Optional debug behavior.
   * Useful for console logging / dev tools visibility only.
   */
  ENABLE_DEBUG_LOGS: !!meta.DEV,
} as const;

export const FEATURE_FLAGS = {
  /**
   * Core modules
   * These are part of the main product direction and can stay enabled
   * as long as their screens/flows use real data paths.
   */
  ENABLE_CLUBS: true,
  ENABLE_GEAR_CATALOG: true,
  ENABLE_WEATHER_API: true,

  /**
   * Higher-risk / higher-cost / not-yet-fully-live-ready features
   * Keep these conservative by default.
   */
  ENABLE_AI_ASSISTANT: false,

  /**
   * Live product feed refresh should remain off by default.
   * CatchRank should primarily use normalized/cached Firebase data,
   * not frequent live refresh behavior in production.
   */
  ENABLE_PRODUCT_FEED_REFRESH: false,
} as const;

/**
 * Explicit runtime guards to make demo/mock behavior visible and intentional.
 * These should remain false in production paths.
 */
export const RUNTIME_GUARDS = {
  ALLOW_MOCK_DATA: false,
  ALLOW_DEMO_MODE: false,
} as const;

/**
 * Storage keys for local/browser settings.
 */
export const STORAGE_KEYS = {
  WEATHER_API_KEY: 'catchrank_weather_api_key',
  OPENWEATHER_API_KEY: 'catchrank_openweather_api_key',
  WEATHER_LOCATION: 'weatherLocation',
} as const;

/**
 * Safe localStorage read helper.
 * Prevents crashes outside browser runtime or when storage access fails.
 */
const getStorageItem = (key: string): string | null => {
  if (!isBrowser) return null;

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

/**
 * Safe localStorage write helper.
 */
const setStorageItem = (key: string, value: string): void => {
  if (!isBrowser) return;

  try {
    window.localStorage.setItem(key, value);
  } catch {
    // no-op on purpose
  }
};

/**
 * Get the Weather API key from local storage or environment.
 * Environment config should be the default production source of truth.
 * Local storage override is mainly useful for controlled dev/debug usage.
 */
export const getWeatherApiKey = (): string =>
  getStorageItem(STORAGE_KEYS.WEATHER_API_KEY) ||
  meta.VITE_WEATHER_API_KEY ||
  '';

/**
 * Get the OpenWeather API key from local storage or environment.
 */
export const getOpenWeatherApiKey = (): string =>
  getStorageItem(STORAGE_KEYS.OPENWEATHER_API_KEY) ||
  meta.VITE_OPENWEATHER_API_KEY ||
  '';

/**
 * Set the Weather API key in local storage.
 * Intended for dev/debug/admin-style local override usage only.
 */
export const setWeatherApiKey = (key: string): void => {
  setStorageItem(STORAGE_KEYS.WEATHER_API_KEY, key);
};

/**
 * Product feed cache TTL in milliseconds.
 * Products should be cached in Firestore and refreshed server-side,
 * not re-fetched on every screen render.
 *
 * Default: 24 hours
 */
export const PRODUCT_FEED_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Maximum number of products to store per source in Firestore cache.
 * Keeps reads/costs reasonable while still providing a useful catalog.
 */
export const PRODUCT_FEED_MAX_ITEMS_PER_SOURCE = 200;