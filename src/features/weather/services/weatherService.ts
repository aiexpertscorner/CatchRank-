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
 * Weather Service
 * Orchestrates weather data fetching from WeatherAPI (primary) and OpenWeather (secondary/fallback).
 * Optimized for free tier data richness.
 */

export const weatherService = {
  async fetchWeather(query: string): Promise<WeatherData> {
    const apiKey = getWeatherApiKey();

    if (apiKey) {
      // Use direct API call if key is provided
      const response = await fetch(
        `https://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${encodeURIComponent(query)}&days=3&aqi=no&alerts=no`
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        // If WeatherAPI fails, we could try OpenWeather here as a fallback if we had a mapper
        throw new Error(errorData.error?.message || "Failed to fetch weather data from API");
      }
      
      return response.json();
    } else {
      // Fallback to proxy
      const response = await fetch(`/api/weather?q=${encodeURIComponent(query)}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch weather data from proxy");
      }
      
      return response.json();
    }
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
