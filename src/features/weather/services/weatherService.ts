import { getWeatherApiKey, getOpenWeatherApiKey } from '../../../config/env';

export interface WeatherData {
  location: {
    name: string;
    region: string;
    country: string;
    lat: number;
    lon: number;
  };
  current: {
    temp_c: number;
    condition: {
      text: string;
      icon: string;
    };
    wind_kph: number;
    wind_dir: string;
    pressure_mb: number;
    humidity: number;
    feelslike_c: number;
    uv: number;
    vis_km: number;
    gust_kph: number;
  };
  forecast: {
    forecastday: Array<{
      date: string;
      day: {
        maxtemp_c: number;
        mintemp_c: number;
        avgtemp_c: number;
        maxwind_kph: number;
        totalprecip_mm: number;
        avgvis_km: number;
        avghumidity: number;
        daily_will_it_rain: number;
        daily_chance_of_rain: number;
        condition: {
          text: string;
          icon: string;
        };
        uv: number;
      };
      astro: {
        sunrise: string;
        sunset: string;
        moonrise: string;
        moonset: string;
        moon_phase: string;
        moon_illumination: string;
      };
    }>;
  };
}

/**
 * In-memory weather cache.
 * Key: normalized location query string.
 * Value: { data, timestamp }
 * TTL: 10 minutes — avoids re-calling the API on tab switches or minor rerenders.
 */
const WEATHER_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

interface WeatherCacheEntry {
  data: WeatherData;
  timestamp: number;
}

const weatherCache = new Map<string, WeatherCacheEntry>();

function getCached(key: string): WeatherData | null {
  const entry = weatherCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > WEATHER_CACHE_TTL_MS) {
    weatherCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: WeatherData): void {
  weatherCache.set(key, { data, timestamp: Date.now() });
}

/**
 * Weather Service
 * Orchestrates weather data fetching from WeatherAPI (primary) and OpenWeather (secondary/fallback).
 * Includes in-memory cache with 10-minute TTL to minimize API calls.
 */

export const weatherService = {
  async fetchWeather(query: string): Promise<WeatherData> {
    const cacheKey = query.toLowerCase().trim();
    const cached = getCached(cacheKey);
    if (cached) return cached;
    const apiKey = getWeatherApiKey();

    let result: WeatherData;

    if (apiKey) {
      const response = await fetch(
        `https://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${encodeURIComponent(query)}&days=3&aqi=no&alerts=no`
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to fetch weather data from API');
      }
      result = await response.json();
    } else {
      const response = await fetch(`/api/weather?q=${encodeURIComponent(query)}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch weather data from proxy');
      }
      result = await response.json();
    }

    setCache(cacheKey, result);
    return result;
  },

  /**
   * Fetches current weather with extra parameters from OpenWeather if available
   */
  async getCurrentWeather(lat: number, lon: number) {
    const weatherApiKey = getWeatherApiKey();
    const openWeatherApiKey = getOpenWeatherApiKey();

    // Primary: WeatherAPI for rich forecast/astro data
    const data = await this.fetchWeather(`${lat},${lon}`);
    
    let openWeatherData = null;
    if (openWeatherApiKey) {
      try {
        const owResponse = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${openWeatherApiKey}&units=metric`
        );
        if (owResponse.ok) {
          openWeatherData = await owResponse.json();
        }
      } catch (e) {
        console.warn("OpenWeather fetch failed, using WeatherAPI only", e);
      }
    }

    return {
      temp: data.current.temp_c,
      description: data.current.condition.text,
      icon: data.current.condition.icon,
      windSpeed: data.current.wind_kph,
      windDir: data.current.wind_dir,
      pressure: openWeatherData?.main?.pressure || data.current.pressure_mb,
      humidity: openWeatherData?.main?.humidity || data.current.humidity,
      feelsLike: data.current.feelslike_c,
      uv: data.current.uv,
      visibility: data.current.vis_km,
      gusts: data.current.gust_kph,
      sunrise: data.forecast.forecastday[0].astro.sunrise,
      sunset: data.forecast.forecastday[0].astro.sunset,
      moonPhase: data.forecast.forecastday[0].astro.moon_phase,
      moonIllumination: data.forecast.forecastday[0].astro.moon_illumination,
      // OpenWeather specific if available
      clouds: openWeatherData?.clouds?.all,
    };
  }
};
