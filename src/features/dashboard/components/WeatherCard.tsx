import React, { useState } from 'react';
import {
  Cloud,
  Thermometer,
  Wind,
  Droplets,
  Gauge,
  ArrowUpRight,
  MapPin,
} from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Card, Button } from '../../../components/ui/Base';
import { WeatherData } from '../../weather/services/weatherService';
import { cn } from '../../../lib/utils';

interface WeatherCardProps {
  weather: WeatherData | null;
  weatherLocation: string;
  isEditingLocation: boolean;
  onToggleEdit: () => void;
  onLocationSubmit: (location: string) => void;
  hourlyForecast: any[];
  onOpenForecast: () => void;
}

export const WeatherCard: React.FC<WeatherCardProps> = ({
  weather,
  weatherLocation,
  isEditingLocation,
  onToggleEdit,
  onLocationSubmit,
  hourlyForecast,
  onOpenForecast,
}) => {
  const [locationInput, setLocationInput] = useState(weatherLocation);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLocationSubmit(locationInput);
  };

  const current = weather?.current;

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-[11px] font-black uppercase tracking-[0.18em] text-text-muted">
          Weer & omstandigheden
        </h2>
        <button
          type="button"
          onClick={onToggleEdit}
          className="text-[10px] font-black uppercase tracking-widest text-brand hover:opacity-70 transition-opacity"
        >
          {isEditingLocation ? 'Sluiten' : 'Locatie'}
        </button>
      </div>

      {/* Location editor */}
      {isEditingLocation && (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={locationInput}
            onChange={(e) => setLocationInput(e.target.value)}
            autoFocus
            placeholder="Stad of postcode..."
            className="flex-1 bg-surface-soft border border-border-subtle rounded-xl px-4 py-2.5 text-sm font-medium text-text-primary placeholder:text-text-muted/50 focus:border-brand focus:outline-none transition-colors"
          />
          <Button type="submit" size="sm" className="rounded-xl px-4">
            OK
          </Button>
        </form>
      )}

      <Card className="relative overflow-hidden rounded-[1.75rem] border border-border-subtle bg-surface-card p-4 shadow-premium">
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand/5 blur-3xl -mr-8 -mt-8 pointer-events-none" />

        <div className="relative z-10 space-y-4">
          {/* Header: city + temp + icon */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-0.5">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3 h-3 text-brand shrink-0" />
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-brand truncate">
                  {weather?.location?.name || weatherLocation}
                </p>
              </div>
              <p className="text-3xl font-black text-text-primary tracking-tight leading-none">
                {current?.temp_c != null ? `${Math.round(current.temp_c)}°` : '--°'}
              </p>
              <p className="text-[11px] text-text-secondary capitalize leading-snug">
                {current?.condition?.text || 'Laden...'}
              </p>
            </div>

            <div className="w-14 h-14 rounded-2xl bg-surface-soft border border-border-subtle flex items-center justify-center shrink-0">
              {current?.condition?.icon ? (
                <img src={current.condition.icon} alt="Weer" className="w-10 h-10" />
              ) : (
                <Cloud className="w-6 h-6 text-brand" />
              )}
            </div>
          </div>

          {/* Metrics: 2x2 compact */}
          <div className="grid grid-cols-4 gap-2">
            {[
              {
                icon: Wind,
                label: 'Wind',
                value: current?.wind_kph != null
                  ? `${Math.round(current.wind_kph)}`
                  : '--',
                unit: 'km/u',
              },
              {
                icon: Droplets,
                label: 'Vocht',
                value: current?.humidity != null ? `${current.humidity}` : '--',
                unit: '%',
              },
              {
                icon: Gauge,
                label: 'Druk',
                value: current?.pressure_mb != null
                  ? `${Math.round(current.pressure_mb)}`
                  : '--',
                unit: 'mb',
              },
              {
                icon: Thermometer,
                label: 'Gevoels',
                value: current?.feelslike_c != null
                  ? `${Math.round(current.feelslike_c)}°`
                  : '--°',
                unit: '',
              },
            ].map((m) => (
              <div
                key={m.label}
                className="rounded-xl bg-surface-soft border border-border-subtle p-2 text-center"
              >
                <m.icon className="w-3 h-3 text-brand mx-auto mb-1" />
                <p className="text-[7px] font-black uppercase tracking-widest text-text-muted leading-none">
                  {m.label}
                </p>
                <p className="text-[11px] font-black text-text-primary mt-1 leading-none">
                  {m.value}
                  {m.unit && (
                    <span className="text-[8px] font-bold text-text-muted ml-0.5">
                      {m.unit}
                    </span>
                  )}
                </p>
              </div>
            ))}
          </div>

          {/* Hourly forecast — horizontal scroll */}
          {hourlyForecast.length > 0 && (
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-text-muted mb-2">
                Komende uren
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x snap-mandatory scrollbar-none">
                {hourlyForecast.map((h: any, i: number) => (
                  <div
                    key={i}
                    className={cn(
                      'flex-shrink-0 snap-start rounded-xl border border-border-subtle px-3 py-2',
                      'flex flex-col items-center gap-1 min-w-[64px]',
                      i === 0 ? 'bg-brand/8 border-brand/20' : 'bg-surface-soft'
                    )}
                  >
                    <p className="text-[10px] font-bold text-text-secondary">
                      {format(new Date(h.time), 'HH:mm', { locale: nl })}
                    </p>
                    <img src={h.condition.icon} alt="icon" className="w-7 h-7" />
                    <p className="text-[11px] font-black text-brand">
                      {Math.round(h.temp_c)}°
                    </p>
                    <p className="text-[9px] text-text-muted font-bold">
                      {Math.round(h.wind_kph)} km/u
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Link to full forecast */}
          <button
            type="button"
            onClick={onOpenForecast}
            className="w-full rounded-2xl border border-brand/20 bg-brand/8 px-4 py-3 flex items-center justify-between hover:bg-brand/12 active:scale-[0.99] transition-all"
          >
            <div className="text-left">
              <p className="text-[12px] font-bold text-text-primary">Volledige forecast & visadvies</p>
              <p className="text-[10px] text-text-secondary mt-0.5">Details, trends en aanbevelingen</p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-brand shrink-0" />
          </button>
        </div>
      </Card>
    </section>
  );
};
