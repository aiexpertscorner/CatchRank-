import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import { Spot } from '../../../types';
import { SpotMapLegend, SpotCategory, CATEGORY_CONFIG } from './SpotMapLegend';
import { resolveCoords } from '../../../lib/coordUtils';

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Constants                                                                  */
/* ─────────────────────────────────────────────────────────────────────────── */

const NL_CENTER: [number, number] = [5.2913, 52.1326];
const NL_ZOOM = 7;

const WATER_TYPE_LABELS: Record<string, string> = {
  canal: 'Kanaal', river: 'Rivier', lake: 'Meer / Plas',
  pond: 'Vijver', sea: 'Zee', polder: 'Polder',
  meer_plas: 'Meer / Plas', sloot_beek: 'Sloot / Beek',
  vijver__meertje: 'Vijver', kanaal: 'Kanaal', rivier: 'Rivier',
};

const CATEGORY_FILTER_OPTIONS: { id: SpotCategory | 'all'; label: string }[] = [
  { id: 'all',         label: 'Alle' },
  { id: 'public',      label: 'Openbaar' },
  { id: 'private',     label: 'Privé' },
  { id: 'friends',     label: 'Vrienden' },
  { id: 'club',        label: 'Club' },
  { id: 'betaalwater', label: 'Betaalwater' },
];

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Category resolution                                                        */
/* ─────────────────────────────────────────────────────────────────────────── */

function getSpotCategory(spot: Spot): SpotCategory {
  if (spot.spotCategory && CATEGORY_CONFIG[spot.spotCategory]) return spot.spotCategory;
  // Migrated data uses Dutch privacy strings
  const priv = (spot as any).privacy as string | undefined;
  if (priv === 'alleen club' || priv === 'clubleden en vrienden') return 'club';
  if (spot.visibility === 'private') return 'private';
  if (spot.visibility === 'friends') return 'friends';
  return 'public';
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Marker element factory                                                     */
/*                                                                             */
/*  IMPORTANT: MapLibre positions markers by applying CSS transforms to the   */
/*  wrapper element. We must NOT apply transforms to the wrapper itself.      */
/*  Only inner elements get hover/active transforms.                          */
/* ─────────────────────────────────────────────────────────────────────────── */

function getCategoryIconSvg(category: SpotCategory): string {
  const base = `stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"`;
  switch (category) {
    case 'public':
      return `<svg width="13" height="13" viewBox="0 0 24 24" ${base}><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>`;
    case 'private':
      return `<svg width="13" height="13" viewBox="0 0 24 24" ${base}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;
    case 'friends':
      return `<svg width="12" height="12" viewBox="0 0 24 24" ${base}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;
    case 'club':
      return `<svg width="13" height="13" viewBox="0 0 24 24" ${base}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`;
    case 'betaalwater':
      return `<svg width="12" height="12" viewBox="0 0 24 24" ${base}><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`;
  }
}

function createMarkerEl(spot: Spot): HTMLDivElement {
  const category = getSpotCategory(spot);
  const cfg = CATEGORY_CONFIG[category];
  const iconSvg = getCategoryIconSvg(category);

  /*
   * Wrapper: fixed 44×52px, no transform, position relative.
   * MapLibre will move this element via its own CSS transform.
   */
  const wrapper = document.createElement('div');
  wrapper.setAttribute('data-spot-id', spot.id ?? '');
  wrapper.setAttribute('data-category', category);
  wrapper.style.width = '44px';
  wrapper.style.height = '52px';
  wrapper.style.cursor = 'pointer';
  wrapper.style.position = 'relative';

  // Inner pin — rotated to point down-left, then counter-rotated for icon
  const pin = document.createElement('div');
  pin.className = 'cr-marker-pin';
  pin.style.cssText = `
    position: absolute;
    top: 4px;
    left: 4px;
    width: 36px;
    height: 36px;
    background: ${cfg.color};
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid rgba(255,255,255,0.25);
    box-shadow: 0 3px 10px ${cfg.glowColor}, 0 1px 5px rgba(0,0,0,0.5);
    transition: box-shadow 0.15s ease;
  `;

  // Icon (counter-rotated to appear upright)
  const iconWrap = document.createElement('div');
  iconWrap.style.cssText = `
    transform: rotate(45deg);
    color: rgba(255,255,255,0.95);
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 0;
  `;
  iconWrap.innerHTML = iconSvg;
  pin.appendChild(iconWrap);

  // Favorite badge
  if (spot.isFavorite) {
    const star = document.createElement('div');
    star.style.cssText = `
      position: absolute;
      top: 0;
      right: 2px;
      width: 16px;
      height: 16px;
      background: #F4C20D;
      border-radius: 50%;
      border: 1.5px solid rgba(255,255,255,0.35);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 8px;
      line-height: 1;
      color: #050505;
    `;
    star.textContent = '★';
    wrapper.appendChild(star);
  }

  wrapper.appendChild(pin);

  // Hover via JS (CSS :hover would need a stylesheet, and inline style is simpler)
  wrapper.addEventListener('mouseenter', () => {
    pin.style.boxShadow = `0 5px 18px ${cfg.glowColor}, 0 2px 8px rgba(0,0,0,0.55)`;
  });
  wrapper.addEventListener('mouseleave', () => {
    pin.style.boxShadow = `0 3px 10px ${cfg.glowColor}, 0 1px 5px rgba(0,0,0,0.5)`;
  });

  return wrapper;
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Popup HTML                                                                 */
/* ─────────────────────────────────────────────────────────────────────────── */

function createPopupHTML(spot: Spot): string {
  const name = (spot as any).title || spot.name || 'Onbekende stek';
  const rawWater = spot.waterType || (spot as any).waterType;
  const waterType = rawWater ? (WATER_TYPE_LABELS[rawWater] || rawWater) : null;
  const catches = spot.stats?.totalCatches ?? 0;
  const sessions = spot.stats?.totalSessions ?? 0;
  const rating = spot.stats?.avgRating;
  const img = spot.mainPhotoURL || (spot as any).mainImage || '';
  const topSpecies = spot.stats?.topSpecies?.slice(0, 2) ?? [];
  const category = getSpotCategory(spot);
  const cfg = CATEGORY_CONFIG[category];

  const thumbHtml = img
    ? `<img src="${img}" alt="" style="width:68px;height:68px;border-radius:10px;object-fit:cover;flex-shrink:0;border:1.5px solid #2A2D35;" />`
    : `<div style="width:68px;height:68px;border-radius:10px;background:#1D1F24;border:1.5px solid #2A2D35;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;">🎣</div>`;

  const speciesHtml = topSpecies.length
    ? `<div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:5px;">${topSpecies.map(s =>
        `<span style="font-size:9px;font-family:Krub,sans-serif;font-weight:800;color:#7C838F;background:#1D1F24;border:1px solid #2A2D35;border-radius:5px;padding:2px 5px;text-transform:uppercase;letter-spacing:.08em;">${s}</span>`
      ).join('')}</div>`
    : '';

  const statsHtml = [
    `<div style="flex:1;text-align:center;padding:8px 0;"><div style="font-size:15px;font-weight:700;color:#F5F6F7;line-height:1;">${catches}</div><div style="font-size:9px;color:#7C838F;text-transform:uppercase;letter-spacing:.1em;font-family:Krub,sans-serif;font-weight:800;margin-top:2px;">Vangsten</div></div>`,
    sessions > 0 ? `<div style="flex:1;text-align:center;padding:8px 0;border-left:1px solid #2A2D35;"><div style="font-size:15px;font-weight:700;color:#F5F6F7;line-height:1;">${sessions}</div><div style="font-size:9px;color:#7C838F;text-transform:uppercase;letter-spacing:.1em;font-family:Krub,sans-serif;font-weight:800;margin-top:2px;">Sessies</div></div>` : '',
    rating && rating > 0 ? `<div style="flex:1;text-align:center;padding:8px 0;border-left:1px solid #2A2D35;"><div style="font-size:15px;font-weight:700;color:#F4C20D;line-height:1;">★ ${rating.toFixed(1)}</div><div style="font-size:9px;color:#7C838F;text-transform:uppercase;letter-spacing:.1em;font-family:Krub,sans-serif;font-weight:800;margin-top:2px;">Rating</div></div>` : '',
  ].join('');

  return `<div style="width:230px;background:#17181C;border-radius:14px;overflow:hidden;font-family:Inter,sans-serif;">
    <div style="height:3px;background:linear-gradient(90deg,${cfg.color},${cfg.color}55);"></div>
    <div style="display:flex;gap:10px;padding:12px 12px 0;">
      ${thumbHtml}
      <div style="flex:1;min-width:0;">
        <div style="font-weight:700;font-size:13px;color:#F5F6F7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:3px;">${name}</div>
        ${waterType ? `<div style="font-size:11px;color:#B6BBC6;margin-bottom:4px;">${waterType}</div>` : ''}
        <div style="display:inline-flex;align-items:center;font-size:10px;font-family:Krub,sans-serif;font-weight:800;color:${cfg.color};background:${cfg.glowColor};border-radius:5px;padding:2px 7px;text-transform:uppercase;letter-spacing:.08em;">${cfg.label}</div>
        ${speciesHtml}
      </div>
    </div>
    <div style="display:flex;padding:0 12px;border-top:1px solid #2A2D35;margin-top:10px;">${statsHtml}</div>
    <div style="padding:10px 12px 12px;">
      <button data-navigate="${spot.id}" style="width:100%;height:40px;background:#F4C20D;color:#050505;border:none;border-radius:9px;font-family:Krub,sans-serif;font-weight:800;font-size:11px;cursor:pointer;letter-spacing:.08em;text-transform:uppercase;display:flex;align-items:center;justify-content:center;gap:5px;">
        Bekijk Stek <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
      </button>
    </div>
  </div>`;
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
  // Key: spot.id, Value: maplibre Marker instance
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const onSelectRef = useRef(onSpotSelect);
  // Track whether we've done the one-time bounds fit
  const initialFitDoneRef = useRef(false);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<SpotCategory | 'all'>('all');
  const [categoryCounts, setCategoryCounts] = useState<Partial<Record<SpotCategory, number>>>({});

  onSelectRef.current = onSpotSelect;

  /* ── Spots with valid coordinates (all schema variants) ─────────────────── */
  const spotsWithCoords = useMemo(
    () => spots.filter((s) => resolveCoords(s) !== null),
    [spots]
  );

  const hasFavorites = useMemo(() => spotsWithCoords.some((s) => s.isFavorite), [spotsWithCoords]);

  /* ── Category counts (derived from ALL spots, not filtered view) ─────────── */
  useEffect(() => {
    const counts: Partial<Record<SpotCategory, number>> = {};
    spotsWithCoords.forEach((s) => {
      const cat = getSpotCategory(s);
      counts[cat] = (counts[cat] ?? 0) + 1;
    });
    setCategoryCounts(counts);
  }, [spotsWithCoords]);

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
      // Preserve map position across React re-renders
      preserveDrawingBuffer: false,
    });

    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
    map.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: false,
      }),
      'bottom-right'
    );

    // Disable rotation on single-finger drag (mobile UX)
    map.touchZoomRotate.disableRotation();

    map.on('load', () => {
      // Water points GeoJSON layer
      const waterUrl = (import.meta.env.BASE_URL ?? '/') +
        'assets/maps/viswateren_mapbox_water_points_midwest_final_v8.geojson';

      fetch(waterUrl)
        .then((r) => (r.ok ? r.json() : null))
        .then((geojson) => {
          if (!geojson) return;
          try {
            map.addSource('water-points', { type: 'geojson', data: geojson });
            map.addLayer({
              id: 'water-points-layer',
              type: 'circle',
              source: 'water-points',
              minzoom: 10,
              paint: {
                'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 3, 14, 6],
                'circle-color': '#5FA8FF',
                'circle-opacity': 0.4,
                'circle-stroke-width': 0,
              },
            });
          } catch (_) { /* map may have been unmounted */ }
        })
        .catch(() => { /* GeoJSON fetch failed — silently skip */ });

      setMapLoaded(true);
    });

    mapRef.current = map;

    return () => {
      // Remove all markers before destroying the map
      markersRef.current.forEach((m) => m.remove());
      markersRef.current.clear();
      popupRef.current?.remove();
      map.remove();
      mapRef.current = null;
      initialFitDoneRef.current = false;
    };
  }, []);

  /* ── Add/replace markers when spot list changes (NOT on filter change) ──── */
  /*                                                                           */
  /*  Strategy: add ALL spots as markers once. Show/hide via CSS display.     */
  /*  This keeps markers stable in the DOM during zoom — no flicker.          */
  /* ─────────────────────────────────────────────────────────────────────────*/
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const map = mapRef.current;

    // Close open popup
    if (popupRef.current) {
      popupRef.current.remove();
      popupRef.current = null;
    }

    // Remove old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current.clear();

    // Add a marker for EVERY spot with valid coords
    spotsWithCoords.forEach((spot) => {
      const coords = resolveCoords(spot);
      if (!coords) return;

      const el = createMarkerEl(spot);

      // Apply initial visibility based on current filter
      const cat = getSpotCategory(spot);
      el.style.display = (categoryFilter === 'all' || cat === categoryFilter) ? 'flex' : 'none';

      const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([coords.lng, coords.lat])
        .addTo(map);

      el.addEventListener('click', (e) => {
        e.stopPropagation();

        if (popupRef.current) {
          popupRef.current.remove();
          popupRef.current = null;
        }

        // Clear active state on all markers
        markersRef.current.forEach((m) => {
          const pin = m.getElement().querySelector('.cr-marker-pin') as HTMLElement | null;
          if (pin) pin.style.transform = 'rotate(-45deg)';
          m.getElement().style.zIndex = '0';
        });

        // Highlight this marker
        const pin = el.querySelector('.cr-marker-pin') as HTMLElement | null;
        if (pin) pin.style.transform = 'rotate(-45deg) scale(1.2)';
        el.style.zIndex = '10';

        const popup = new maplibregl.Popup({
          offset: [0, -44],
          closeButton: true,
          closeOnClick: true,
          maxWidth: '250px',
          focusAfterOpen: false,
        })
          .setLngLat([coords.lng, coords.lat])
          .setHTML(createPopupHTML(spot))
          .addTo(map);

        popup.on('close', () => {
          // Reset marker scale
          if (pin) pin.style.transform = 'rotate(-45deg)';
          el.style.zIndex = '0';
          if (popupRef.current === popup) popupRef.current = null;
        });

        popupRef.current = popup;

        // Smooth pan so popup is fully visible above bottom nav
        map.easeTo({
          center: [coords.lng, coords.lat],
          offset: [0, -80],
          duration: 280,
        });
      });

      markersRef.current.set(spot.id ?? String(Math.random()), marker);
    });

    // One-time bounds fit — runs only on first spots load
    if (!initialFitDoneRef.current && spotsWithCoords.length > 0) {
      const bounds = new maplibregl.LngLatBounds();
      spotsWithCoords.forEach((s) => {
        const c = resolveCoords(s);
        if (c) bounds.extend([c.lng, c.lat]);
      });
      map.fitBounds(bounds, {
        padding: { top: 80, bottom: 140, left: 50, right: 80 },
        maxZoom: spotsWithCoords.length === 1 ? 14 : 11,
        duration: 900,
        essential: false, // Don't fight user zoom
      });
      initialFitDoneRef.current = true;
    }

  }, [spotsWithCoords, mapLoaded]); // ← does NOT include categoryFilter

  /* ── Update marker visibility when filter changes (no re-add!) ───────────── */
  useEffect(() => {
    if (!mapLoaded) return;
    markersRef.current.forEach((marker, spotId) => {
      const spot = spotsWithCoords.find((s) => s.id === spotId);
      if (!spot) return;
      const cat = getSpotCategory(spot);
      const visible = categoryFilter === 'all' || cat === categoryFilter;
      marker.getElement().style.display = visible ? 'flex' : 'none';
    });
  }, [categoryFilter, mapLoaded, spotsWithCoords]);

  /* ── Navigation via event delegation ────────────────────────────────────── */
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

  /* ─────────────────────────────────────────────────────────────────────── */
  /*  Render                                                                  */
  /* ─────────────────────────────────────────────────────────────────────── */

  return (
    <div className="flex flex-col gap-0 h-full min-h-0">

      {/* Category filter pills — horizontal scroll, no scrollbar */}
      <div
        className="flex gap-2 overflow-x-auto shrink-0 pb-2 px-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
      >
        {CATEGORY_FILTER_OPTIONS.map((opt) => {
          const isActive = categoryFilter === opt.id;
          const count = opt.id === 'all'
            ? spotsWithCoords.length
            : (categoryCounts[opt.id as SpotCategory] ?? 0);
          if (opt.id !== 'all' && count === 0) return null;

          const accentColor = opt.id !== 'all'
            ? (CATEGORY_CONFIG[opt.id as SpotCategory]?.color ?? '#F4C20D')
            : '#F4C20D';

          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setCategoryFilter(opt.id as SpotCategory | 'all')}
              style={{
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '6px 12px',
                borderRadius: 20,
                border: `1.5px solid ${isActive ? accentColor : '#2A2D35'}`,
                background: isActive ? `${accentColor}18` : '#17181C',
                color: isActive ? accentColor : '#7C838F',
                fontSize: 11,
                fontFamily: 'Krub, sans-serif',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
              }}
            >
              {opt.id !== 'all' && (
                <span style={{
                  width: 7, height: 7,
                  borderRadius: '50%',
                  background: isActive ? accentColor : '#5E646F',
                  flexShrink: 0, display: 'inline-block',
                }} />
              )}
              {opt.label}
              <span style={{ fontSize: 10, opacity: 0.65, fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Map container — flex-1 fills remaining height */}
      <div
        className="cr-map-container relative flex-1 min-h-0 rounded-2xl overflow-hidden"
        onClick={handleContainerClick}
      >
        {/* MapLibre canvas target */}
        <div ref={containerRef} className="absolute inset-0" />

        {/* Legend overlay */}
        {mapLoaded && (
          <SpotMapLegend categoryCounts={categoryCounts} hasFavorites={hasFavorites} />
        )}

        {/* Loading */}
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

        {/* Empty state */}
        {mapLoaded && spotsWithCoords.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <div style={{
              background: 'rgba(16,17,20,0.88)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: '1px solid #2A2D35',
              borderRadius: 16,
              padding: '20px 28px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🎣</div>
              <div style={{ fontSize: 13, color: '#B6BBC6', fontWeight: 600 }}>Geen stekken met locatie</div>
              <div style={{ fontSize: 11, color: '#5E646F', marginTop: 4 }}>Voeg een stek toe met GPS-coördinaten</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SpotMap;
