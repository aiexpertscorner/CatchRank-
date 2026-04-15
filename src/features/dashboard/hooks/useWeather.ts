/**
 * useWeather — weather + location hook for the Dashboard.
 *
 * Manages:
 *  - browser geolocation resolution (with localStorage override)
 *  - manual location editing
 *  - weatherService fetch + fallback
 *  - hourly forecast slice
 */

import { useEffect, useMemo, useState } from 'react';
import { weatherService, WeatherData } from '../../weather/services/weatherService';
import { getBrowserPosition } from '../utils/dashboardHelpers';

const DEFAULT_LOCATION = 'Utrecht';
const LOCATION_KEY = 'weatherLocation';

export interface UseWeatherReturn {
  weather: WeatherData | null;
  weatherLocation: string;
  isEditingLocation: boolean;
  setIsEditingLocation: (v: boolean) => void;
  handleLocationSubmit: (nextLocation: string) => void;
  hourlyForecast: any[];
}

export function useWeather(): UseWeatherReturn {
  const savedLocation = localStorage.getItem(LOCATION_KEY) || DEFAULT_LOCATION;

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLocation, setWeatherLocation] = useState(savedLocation);
  const [weatherCoords, setWeatherCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [locationResolved, setLocationResolved] = useState(false);
  const [isEditingLocation, setIsEditingLocation] = useState(false);

  // Resolve location once on mount
  useEffect(() => {
    let cancelled = false;

    const resolve = async () => {
      const manual = localStorage.getItem(LOCATION_KEY);
      if (manual) {
        if (!cancelled) {
          setWeatherLocation(manual);
          setLocationResolved(true);
        }
        return;
      }
      try {
        const coords = await getBrowserPosition();
        if (!cancelled) {
          setWeatherCoords(coords);
          setLocationResolved(true);
        }
      } catch {
        if (!cancelled) {
          setWeatherLocation(DEFAULT_LOCATION);
          setLocationResolved(true);
        }
      }
    };

    resolve();
    return () => { cancelled = true; };
  }, []);

  // Fetch weather whenever location resolves or changes
  useEffect(() => {
    if (!locationResolved) return;

    let cancelled = false;

    const fetchWeather = async () => {
      try {
        const query = weatherCoords
          ? `${weatherCoords.lat},${weatherCoords.lon}`
          : weatherLocation || DEFAULT_LOCATION;
        const data = await weatherService.fetchWeather(query);
        if (!cancelled) setWeather(data);
      } catch {
        // Fallback to default location
        if (weatherLocation !== DEFAULT_LOCATION && !cancelled) {
          try {
            const fallback = await weatherService.fetchWeather(DEFAULT_LOCATION);
            if (!cancelled) {
              setWeather(fallback);
              setWeatherLocation(DEFAULT_LOCATION);
            }
          } catch {
            // silent
          }
        }
      }
    };

    fetchWeather();
    return () => { cancelled = true; };
  }, [weatherLocation, weatherCoords, locationResolved]);

  const handleLocationSubmit = (nextLocation: string) => {
    const trimmed = nextLocation.trim() || DEFAULT_LOCATION;
    setWeatherCoords(null);
    setWeatherLocation(trimmed);
    localStorage.setItem(LOCATION_KEY, trimmed);
    setIsEditingLocation(false);
  };

  const hourlyForecast = useMemo(() => {
    const hours = ((weather?.forecast?.forecastday?.[0] as any)?.hour ?? []) as any[];
    if (!Array.isArray(hours) || hours.length === 0) return [];
    const now = Date.now();
    return hours
      .filter((h) => new Date(h.time).getTime() >= now - 60 * 60 * 1000)
      .slice(0, 4);
  }, [weather]);

  return {
    weather,
    weatherLocation,
    isEditingLocation,
    setIsEditingLocation,
    handleLocationSubmit,
    hourlyForecast,
  };
}
