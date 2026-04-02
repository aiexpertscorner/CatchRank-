import { getWeatherApiKey } from '../../../config/env';

export interface WeatherData {
  location: {
    name: string;
    region: string;
    country: string;
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
  };
  forecast: {
    forecastday: Array<{
      date: string;
      day: {
        maxtemp_c: number;
        mintemp_c: number;
        condition: {
          text: string;
          icon: string;
        };
      };
    }>;
  };
}

/**
 * Weather Service
 * Orchestrates weather data fetching.
 * If a user-provided API key is available, it uses the direct API client.
 * Otherwise, it falls back to the backend proxy.
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
  }
};
