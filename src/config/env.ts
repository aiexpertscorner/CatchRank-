/**
 * Environment configuration and feature flags.
 * This file centralizes all environment-specific settings.
 */

export const ENV = {
  IS_DEV: process.env.NODE_ENV === 'development',
  BYPASS_AUTH: false, // Set to false for production
};

export const FEATURE_FLAGS = {
  ENABLE_CLUBS: true,
  ENABLE_GEAR_CATALOG: true,
  ENABLE_WEATHER_API: true,
  ENABLE_AI_ASSISTANT: true,
};

/**
 * Storage keys for local settings.
 */
export const STORAGE_KEYS = {
  WEATHER_API_KEY: 'catchrank_weather_api_key',
  WEATHER_LOCATION: 'weatherLocation',
};

/**
 * Get the Weather API key from local storage or environment.
 */
export const getWeatherApiKey = () => 
  localStorage.getItem(STORAGE_KEYS.WEATHER_API_KEY) || 
  (import.meta as any).env.VITE_WEATHER_API_KEY;

/**
 * Set the Weather API key in local storage.
 */
export const setWeatherApiKey = (key: string) => localStorage.setItem(STORAGE_KEYS.WEATHER_API_KEY, key);
