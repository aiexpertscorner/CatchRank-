import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import { Spot } from '../../../types';
import { SpotMapLegend, SpotCategory, CATEGORY_CONFIG } from './SpotMapLegend';

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Constants                                                                  */
/* ─────────────────────────────────────────────────────────────────────────── */

const NL_CENTER: [number, number] = [5.2913, 52.1326];
const NL_ZOOM = 7;

const WATER_TYPE_LABELS: Record<string, string> = {
  canal: 'Kanaal', river: 'Rivier', lake: 'Meer / Plas',
  pond: 'Vijver', sea: 'Zee', polder: 'Polder',
};

const CATEGORY_FILTER_OPTIONS: { id: SpotCategory | 'all'; label: string }[] = [
  { id: 'all',        label: 'Alle' },
  { id: 'public',     label: 'Openbaar' },
  { id: 'private',    label: 'Privé' },
  { id: 'friends',    label: 'Vrienden' },
  { id: 'club',       label: 'Club' },
  { id: 'betaalwater', label: 'Betaalwater' },
];

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Helpers                                                                    */
/* ─────────────────────────────────────────────────────────────────────────── */

function getSpotCategory(spot: Spot): SpotCategory {
  if (spot.spotCategory && CATEGORY_CONFIG[spot.spotCategory]) return spot.spotCategory;
  if (spot.visibility === 'private') return 'private';
  if (spot.visibility === 'friends') return 'friends';
  return 'public';
}

function getCategoryIconSvg(category: SpotCategory): string {
  const base = `stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"`;
  switch (category) {
    case 'public':
      return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" ${base}><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>`;
    case 'private':
      return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" ${base}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;
    case 'friends':
      return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" ${base}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;
    case 'club':
      return `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" ${base}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`;
    case 'betaalwater':
      return `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" ${base}><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`;
  }
}

function createMarkerEl(spot: Spot): HTMLDivElement {
  const category = getSpotCategory(spot);
  const cfg = CATEGORY_CONFIG[category];
  const iconSvg = getCategoryIconSvg(category);

  const wrapper = document.createElement('div');
  wrapper.setAttribute('data-spot-id', spot.id ?? '');
  wrapper.setAttribute('data-category', category);
  // 44px touch target
  wrapper.style.cssText = `
    cursor: pointer;
    width: 44px;
    height: 52px;
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;
  `;

  wrapper.innerHTML = `
    <div class="cr-marker-pin" style="
      width: 36px;
      height: 36px;
      background: ${cfg.color};
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid rgba(255,255,255,0.22);
      box-shadow: 0 3px 12px ${cfg.glowColor}, 0 2px 6px rgba(0,0,0,0.45);
      transition: transform 0.18s ease, box-shadow 0.18s ease;
      will-change: transform;
    ">
      <div style="
        transform: rotate(45deg);
        color: rgba(255,255,255,0.95);
        display: flex;
        align-items: center;
        justify-content: center;
        line-height: 0;
      ">${iconSvg}</div>
    </div>
    ${spot.isFavorite ? `
      <div style="
        position: absolute;
        top: -4px;
        right: 4px;
        width: 15px;
        height: 15px;
        background: #F4C20D;
        border-radius: 50%;
        border: 1.5px solid rgba(255,255,255,0.35);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 8px;
        line-height: 1;
        box-shadow: 0 0 5px rgba(244,194,13,0.55);
        color: #050505;
      ">★</div>
    ` : ''}
  `;

  // Hover effect — scale pin up slightly
  const pin = wrapper.querySelector('.cr-marker-pin') as HTMLElement;
  if (pin) {
    wrapper.addEventListener('mouseenter', () => {
      pin.style.boxShadow = `0 6px 20px ${cfg.glowColor}, 0 3px 10px rgba(0,0,0,0.5)`;
      pin.style.transform = 'rotate(-45deg) scale(1.15)';
    });
    wrapper.addEventListener('mouseleave', () => {
      pin.style.boxShadow = `0 3px 12px ${cfg.glowColor}, 0 2px 6px rgba(0,0,0,0.45)`;
      pin.style.transform = 'rotate(-45deg) scale(1)';
    });
  }

  return wrapper;
}

function createPopupHTML(spot: Spot): string {
  const name = (spot as any).title || spot.name || 'Onbekende stek';
  const waterType = spot.waterType
    ? (WATER_TYPE_LABELS[spot.waterType] || spot.waterType)
    : null;
  const catches = spot.stats?.totalCatches ?? 0;
  const sessions = spot.stats?.totalSessions ?? 0;
  const rating = spot.stats?.avgRating;
  const img = spot.mainPhotoURL || (spot as any).mainImage || '';
  const topSpecies = spot.stats?.topSpecies?.slice(0, 2) ?? [];

  const category = getSpotCategory(spot);
  const cfg = CATEGORY_CONFIG[category];

  const thumbHtml = img
    ? `<img src="${img}" alt="" style="
        width: 68px;
        height: 68px;
        border-radius: 10px;
        object-fit: cover;
        flex-shrink: 0;
        border: 1.5px solid #2A2D35;
      " />`
    : `<div style="
        width: 68px;
        height: 68px;
        border-radius: 10px;
        background: #1D1F24;
        border: 1.5px solid #2A2D35;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 22px;
        flex-shrink: 0;
      ">🎣</div>`;

  const speciesHtml = topSpecies.length
    ? `<div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:6px;">
        ${topSpecies.map(s => `<span style="
          font-size: 9px;
          font-family: Krub, sans-serif;
          font-weight: 800;
          color: #7C838F;
          background: #1D1F24;
          border: 1px solid #2A2D35;
          border-radius: 6px;
          padding: 2px 6px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        ">${s}</span>`).join('')}
      </div>`
    : '';

  return `
    <div style="
      width: 230px;
      background: #17181C;
      border-radius: 14px;
      overflow: hidden;
      font-family: Inter, sans-serif;
    ">
      <!-- Category accent strip -->
      <div style="
        height: 3px;
        background: linear-gradient(90deg, ${cfg.color}, ${cfg.color}55);
      "></div>

      <!-- Header -->
      <div style="display: flex; gap: 11px; padding: 13px 13px 0;">
        ${thumbHtml}
        <div style="flex:1;min-width:0;">
          <div style="
            font-weight: 700;
            font-size: 13px;
            color: #F5F6F7;
            margin-bottom: 3px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          ">${name}</div>
          ${waterType ? `<div style="font-size:11px;color:#B6BBC6;margin-bottom:3px;">${waterType}</div>` : ''}
          <div style="
            display: inline-flex;
            align-items: center;
            gap: 4px;
            font-size: 10px;
            font-family: Krub, sans-serif;
            font-weight: 800;
            color: ${cfg.color};
            background: ${cfg.glowColor};
            border-radius: 6px;
            padding: 2px 7px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
          ">${cfg.label}</div>
          ${speciesHtml}
        </div>
      </div>

      <!-- Stats row -->
      <div style="
        display: flex;
        gap: 0;
        padding: 10px 13px;
        border-top: 1px solid #2A2D35;
        margin-top: 11px;
      ">
        <div style="flex:1;text-align:center;">
          <div style="font-size:14px;font-weight:700;color:#F5F6F7;">${catches}</div>
          <div style="font-size:9px;color:#7C838F;text-transform:uppercase;letter-spacing:0.1em;font-family:Krub,sans-serif;font-weight:800;">Vangsten</div>
        </div>
        ${sessions > 0 ? `
        <div style="flex:1;text-align:center;border-left:1px solid #2A2D35;">
          <div style="font-size:14px;font-weight:700;color:#F5F6F7;">${sessions}</div>
          <div style="font-size:9px;color:#7C838F;text-transform:uppercase;letter-spacing:0.1em;font-family:Krub,sans-serif;font-weight:800;">Sessies</div>
        </div>` : ''}
        ${rating && rating > 0 ? `
        <div style="flex:1;text-align:center;border-left:1px solid #2A2D35;">
          <div style="font-size:14px;font-weight:700;color:#F4C20D;">★ ${rating.toFixed(1)}</div>
          <div style="font-size:9px;color:#7C838F;text-transform:uppercase;letter-spacing:0.1em;font-family:Krub,sans-serif;font-weight:800;">Rating</div>
        </div>` : ''}
      </div>

      <!-- CTA -->
      <div style="padding: 0 13px 13px;">
        <button
          data-navigate="${spot.id}"
          style="
            width: 100%;
            height: 42px;
            background: #F4C20D;
            color: #050505;
            border: none;
            border-radius: 10px;
            font-family: Krub, sans-serif;
            font-weight: 800;
            font-size: 12px;
            cursor: pointer;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            transition: background 0.15s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
          "
          onmouseenter="this.style.background='#FFCC12'"
          onmouseleave="this.style.background='#F4C20D'"
        >
          Bekijk Stek
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </button>
      </div>
    </div>
  `;
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Component                                                                  */
/* ─────────────────────────────────────────────────────────────────────────── */

interface SpotMapProps {
  spots: Spot[];
  onSpotSelect: (spotId: string) => void;
}

const SpotMap: React.FC<SpotMapProps> = ({ spots, onSpotSelect }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const onSelectRef = useRef(onSpotSelect);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<SpotCategory | 'all'>('all');
  const [categoryCounts, setCategoryCounts] = useState<Partial<Record<SpotCategory, number>>>({});

  // Keep callback ref fresh
  onSelectRef.current = onSpotSelect;

  // Only spots with valid coordinates
  const spotsWithCoords = useMemo(
    () => spots.filter((s) => s.coordinates?.lat && s.coordinates?.lng),
    [spots]
  );

  const hasFavorites = useMemo(() => spotsWithCoords.some((s) => s.isFavorite), [spotsWithCoords]);

  /* ── Init map ──────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center: NL_CENTER,
      zoom: NL_ZOOM,
      maxZoom: 19,
      attributionControl: false,
    });

    // Minimal attribution
    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      'bottom-left'
    );

    // Zoom controls (no compass — mobile)
    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      'bottom-right'
    );

    // Geolocate
    map.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: false,
      }),
      'bottom-right'
    );

    // Disable rotation on single-finger drag (mobile-safe)
    map.touchZoomRotate.disableRotation();

    map.on('load', () => {
      // Water points layer — faint teal dots at zoom 10+
      const waterUrl =
        (import.meta.env.BASE_URL ?? '/') + 'assets/maps/viswateren_mapbox_water_points_midwest_final_v8.geojson';

      fetch(waterUrl)
        .then((r) => (r.ok ? r.json() : null))
        .then((geojson) => {
          if (!geojson || !map.getSource) return;
          try {
            map.addSource('water-points', { type: 'geojson', data: geojson });
            map.addLayer({
              id: 'water-points-layer',
              type: 'circle',
              source: 'water-points',
              minzoom: 10,
              paint: {
                'circle-radius': [
                  'interpolate', ['linear'], ['zoom'],
                  10, 3,
                  14, 6,
                ],
                'circle-color': '#5FA8FF',
                'circle-opacity': 0.45,
                'circle-stroke-width': 0,
              },
            });
          } catch (_) { /* map may have unmounted */ }
        })
        .catch(() => { /* GeoJSON unavailable — silently skip */ });

      setMapLoaded(true);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
    };
  }, []);

  /* ── Navigate handler via event delegation ─────────────────────────────── */
  const handleContainerClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const btn = (e.target as HTMLElement).closest('[data-navigate]');
    if (btn) {
      const id = (btn as HTMLElement).getAttribute('data-navigate');
      if (id) {
        onSelectRef.current(id);
        popupRef.current?.remove();
        popupRef.current = null;
      }
    }
  }, []);

  /* ── Sync markers when spots / filter / map readiness changes ──────────── */
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const map = mapRef.current;

    // Close popup
    if (popupRef.current) {
      popupRef.current.remove();
      popupRef.current = null;
    }

    // Remove old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current.clear();

    // Tally category counts across ALL spots with coords (not filtered)
    const counts: Partial<Record<SpotCategory, number>> = {};
    spotsWithCoords.forEach((s) => {
      const cat = getSpotCategory(s);
      counts[cat] = (counts[cat] ?? 0) + 1;
    });
    setCategoryCounts(counts);

    // Add markers for visible spots
    const visible = spotsWithCoords.filter(
      (s) => categoryFilter === 'all' || getSpotCategory(s) === categoryFilter
    );

    visible.forEach((spot) => {
      const el = createMarkerEl(spot);
      const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([spot.coordinates.lng, spot.coordinates.lat])
        .addTo(map);

      el.addEventListener('click', (e) => {
        e.stopPropagation();

        // Remove previous popup
        if (popupRef.current) {
          popupRef.current.remove();
          popupRef.current = null;
        }

        // Mark active state
        document.querySelectorAll('[data-spot-id]').forEach((el) =>
          el.classList.remove('cr-marker-active')
        );
        el.classList.add('cr-marker-active');

        const popup = new maplibregl.Popup({
          offset: [0, -42],
          closeButton: true,
          closeOnClick: true,
          maxWidth: '250px',
          focusAfterOpen: false,
        })
          .setLngLat([spot.coordinates.lng, spot.coordinates.lat])
          .setHTML(createPopupHTML(spot))
          .addTo(map);

        popup.on('close', () => {
          el.classList.remove('cr-marker-active');
          if (popupRef.current === popup) popupRef.current = null;
        });

        popupRef.current = popup;

        // Pan to marker on mobile (ensures popup is fully visible)
        map.easeTo({
          center: [spot.coordinates.lng, spot.coordinates.lat],
          offset: [0, -60],
          duration: 300,
        });
      });

      markersRef.current.set(spot.id ?? String(Math.random()), marker);
    });

    // On first load with spots: fit bounds to show all of them
    if (visible.length > 0 && !mapRef.current?.getBounds().contains(NL_CENTER as [number, number])) {
      // noop — only fit on explicit user action
    } else if (visible.length > 0 && visible.length < 50) {
      const bounds = new maplibregl.LngLatBounds();
      visible.forEach((s) => bounds.extend([s.coordinates.lng, s.coordinates.lat]));
      map.fitBounds(bounds, {
        padding: { top: 80, bottom: 120, left: 40, right: 80 },
        maxZoom: 14,
        duration: 800,
      });
    }
  }, [spotsWithCoords, categoryFilter, mapLoaded]);

  /* ─────────────────────────────────────────────────────────────────────── */
  /*  Render                                                                  */
  /* ─────────────────────────────────────────────────────────────────────── */

  return (
    <div className="flex flex-col gap-0 h-full">
      {/* Category filter pills */}
      <div
        className="flex gap-2 overflow-x-auto pb-2 px-1 shrink-0"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
      >
        {CATEGORY_FILTER_OPTIONS.map((opt) => {
          const isActive = categoryFilter === opt.id;
          const count = opt.id !== 'all'
            ? (categoryCounts[opt.id as SpotCategory] ?? 0)
            : spotsWithCoords.length;
          if (opt.id !== 'all' && count === 0) return null;
          return (
            <button
              key={opt.id}
              onClick={() => setCategoryFilter(opt.id as SpotCategory | 'all')}
              style={{
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '6px 12px',
                borderRadius: 20,
                border: isActive
                  ? `1.5px solid ${opt.id !== 'all' ? CATEGORY_CONFIG[opt.id as SpotCategory]?.color ?? '#F4C20D' : '#F4C20D'}`
                  : '1.5px solid #2A2D35',
                background: isActive
                  ? (opt.id !== 'all' ? `${CATEGORY_CONFIG[opt.id as SpotCategory]?.color ?? '#F4C20D'}18` : 'rgba(244,194,13,0.12)')
                  : '#17181C',
                color: isActive
                  ? (opt.id !== 'all' ? CATEGORY_CONFIG[opt.id as SpotCategory]?.color ?? '#F4C20D' : '#F4C20D')
                  : '#7C838F',
                fontSize: 11,
                fontFamily: 'Krub, sans-serif',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {opt.id !== 'all' && (
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: isActive
                      ? CATEGORY_CONFIG[opt.id as SpotCategory]?.color
                      : '#5E646F',
                    flexShrink: 0,
                    display: 'inline-block',
                  }}
                />
              )}
              {opt.label}
              <span
                style={{
                  fontSize: 10,
                  opacity: 0.65,
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 600,
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Map container */}
      <div
        className="cr-map-container relative flex-1 rounded-2xl overflow-hidden"
        style={{ minHeight: 0 }}
        onClick={handleContainerClick}
      >
        {/* MapLibre target div */}
        <div ref={containerRef} className="absolute inset-0" />

        {/* Legend overlay */}
        {mapLoaded && (
          <SpotMapLegend categoryCounts={categoryCounts} hasFavorites={hasFavorites} />
        )}

        {/* Loading overlay */}
        {!mapLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface-card z-10">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 rounded-full border-2 border-brand/20 border-t-brand animate-spin" />
              <span className="text-xs text-text-muted font-bold uppercase tracking-widest">
                Kaart laden...
              </span>
            </div>
          </div>
        )}

        {/* Empty state — spots loaded but none have coordinates */}
        {mapLoaded && spotsWithCoords.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <div
              style={{
                background: 'rgba(16,17,20,0.85)',
                backdropFilter: 'blur(8px)',
                border: '1px solid #2A2D35',
                borderRadius: 16,
                padding: '20px 28px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 8 }}>🎣</div>
              <div style={{ fontSize: 13, color: '#B6BBC6', fontWeight: 600 }}>
                Geen stekken met locatie
              </div>
              <div style={{ fontSize: 11, color: '#5E646F', marginTop: 4 }}>
                Voeg een stek toe met GPS-coördinaten
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SpotMap;
