/**
 * Environment configuration and feature flags.
 * This file centralizes all environment-specific settings.
 */

export const ENV = {
  IS_DEV: process.env.NODE_ENV === 'development',
  BYPASS_AUTH: false,
};

export const FEATURE_FLAGS = {
  ENABLE_CLUBS: true,
  ENABLE_GEAR_CATALOG: true,
  ENABLE_WEATHER_API: true,
  ENABLE_AI_ASSISTANT: true,
  /** Enable live product feed refresh via server endpoints. Dev-safe: off by default. */
  ENABLE_PRODUCT_FEED_REFRESH: false,
};

/**
 * Storage keys for local settings.
 */
export const STORAGE_KEYS = {
  WEATHER_API_KEY: 'catchrank_weather_api_key',
  OPENWEATHER_API_KEY: 'catchrank_openweather_api_key',
  WEATHER_LOCATION: 'weatherLocation',
};

/**
 * Get the Weather API key from local storage or environment.
 */
export const getWeatherApiKey = () => 
  localStorage.getItem(STORAGE_KEYS.WEATHER_API_KEY) || 
  (import.meta as any).env.VITE_WEATHER_API_KEY;

/**
 * Get the OpenWeather API key from local storage or environment.
 */
export const getOpenWeatherApiKey = () => 
  localStorage.getItem(STORAGE_KEYS.OPENWEATHER_API_KEY) || 
  (import.meta as any).env.VITE_OPENWEATHER_API_KEY;

/**
 * Set the Weather API key in local storage.
 */
export const setWeatherApiKey = (key: string) => localStorage.setItem(STORAGE_KEYS.WEATHER_API_KEY, key);

/**
 * Product feed cache TTL in milliseconds.
 * Products are cached in Firestore and refreshed server-side — not per render.
 * 24h default; lower this during dev testing if needed.
 */
export const PRODUCT_FEED_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Maximum number of products to store per source in Firestore cache.
 * Keeps read costs low while providing a meaningful catalog.
 */
export const PRODUCT_FEED_MAX_ITEMS_PER_SOURCE = 200;
