import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { Navigation, ExternalLink } from 'lucide-react';
import { googleMapsUrl, formatCoords } from '../../../lib/coordUtils';

interface LocationMiniMapProps {
  lat: number;
  lng: number;
  /** Optional label shown in Google Maps link and on the marker tooltip */
  label?: string;
  /** Height of the map in pixels (default: 176) */
  height?: number;
  /** Whether to show the coordinates text below the map */
  showCoords?: boolean;
  /** Whether to show the "Open in Google Maps" button */
  showGoogleMapsBtn?: boolean;
  /** Marker category color — defaults to brand gold */
  markerColor?: string;
}

const LocationMiniMap: React.FC<LocationMiniMapProps> = ({
  lat,
  lng,
  label,
  height = 176,
  showCoords = true,
  showGoogleMapsBtn = true,
  markerColor = '#F4C20D',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center: [lng, lat],
      zoom: 13,
      interactive: false,          // Static preview — no drag/zoom
      attributionControl: false,
      fadeDuration: 0,
    });

    map.on('load', () => {
      // Custom gold marker
      const el = document.createElement('div');
      el.style.cssText = `
        width: 36px;
        height: 36px;
        cursor: default;
        display: flex;
        flex-direction: column;
        align-items: center;
      `;
      el.innerHTML = `
        <div style="
          width: 30px;
          height: 30px;
          background: ${markerColor};
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid rgba(255,255,255,0.3);
          box-shadow: 0 3px 12px rgba(0,0,0,0.5), 0 0 10px ${markerColor}55;
        ">
          <div style="
            transform: rotate(45deg);
            color: rgba(7,16,24,0.9);
            font-size: 13px;
            line-height: 1;
          ">🎣</div>
        </div>
      `;

      new maplibregl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([lng, lat])
        .addTo(map);

      setMapReady(true);
    });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, [lat, lng, markerColor]);

  const mapsUrl = googleMapsUrl(lat, lng, label);
  const coordsText = formatCoords(lat, lng);

  return (
    <div className="space-y-2">
      {/* Map container */}
      <div
        className="relative overflow-hidden rounded-xl border border-border-subtle"
        style={{ height }}
      >
        {/* MapLibre container */}
        <div ref={containerRef} className="absolute inset-0" />

        {/* Loading skeleton */}
        {!mapReady && (
          <div className="absolute inset-0 bg-surface-card flex items-center justify-center z-10">
            <div className="w-6 h-6 rounded-full border-2 border-brand/20 border-t-brand animate-spin" />
          </div>
        )}

        {/* Subtle gradient overlay at bottom */}
        <div
          className="absolute bottom-0 left-0 right-0 h-10 pointer-events-none z-[1]"
          style={{
            background: 'linear-gradient(to top, rgba(16,17,20,0.5) 0%, transparent 100%)',
          }}
        />

        {/* Tap overlay — opens Google Maps */}
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute inset-0 z-[2]"
          aria-label="Open in Google Maps"
        />
      </div>

      {/* Coords + Google Maps button row */}
      <div className="flex items-center justify-between gap-3">
        {showCoords && (
          <p className="text-[10px] font-mono text-text-muted leading-tight">{coordsText}</p>
        )}

        {showGoogleMapsBtn && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border-subtle bg-surface-soft hover:border-brand/30 hover:text-brand text-text-secondary transition-all text-[11px] font-bold"
          >
            <Navigation className="w-3.5 h-3.5" />
            Google Maps
            <ExternalLink className="w-3 h-3 opacity-50" />
          </a>
        )}
      </div>
    </div>
  );
};

export default LocationMiniMap;
