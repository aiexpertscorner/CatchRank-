import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Star } from 'lucide-react';

export type SpotCategory = 'public' | 'private' | 'friends' | 'club' | 'betaalwater';

export const CATEGORY_CONFIG: Record<SpotCategory, { color: string; glowColor: string; label: string }> = {
  public:      { color: '#F4C20D', glowColor: 'rgba(244,194,13,0.35)', label: 'Openbaar' },
  private:     { color: '#5E646F', glowColor: 'rgba(94,100,111,0.35)',  label: 'Privé' },
  friends:     { color: '#5FA8FF', glowColor: 'rgba(95,168,255,0.35)',  label: 'Vrienden' },
  club:        { color: '#29C36A', glowColor: 'rgba(41,195,106,0.35)',  label: 'Club' },
  betaalwater: { color: '#F0A83A', glowColor: 'rgba(240,168,58,0.35)',  label: 'Betaalwater' },
};

interface SpotMapLegendProps {
  categoryCounts: Partial<Record<SpotCategory, number>>;
  hasFavorites: boolean;
}

export const SpotMapLegend: React.FC<SpotMapLegendProps> = ({ categoryCounts, hasFavorites }) => {
  const [collapsed, setCollapsed] = useState(true);

  const activeCategories = (Object.keys(categoryCounts) as SpotCategory[]).filter(
    (cat) => (categoryCounts[cat] ?? 0) > 0
  );

  if (activeCategories.length === 0) return null;

  return (
    <div
      className="absolute top-3 right-3 z-10 select-none"
      style={{ pointerEvents: 'auto' }}
    >
      <div
        style={{
          background: 'rgba(16, 17, 20, 0.88)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid #2A2D35',
          borderRadius: 14,
          overflow: 'hidden',
          minWidth: collapsed ? 'auto' : 148,
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        }}
      >
        {/* Toggle header */}
        <button
          onClick={() => setCollapsed((v) => !v)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: collapsed ? '8px 10px' : '8px 12px 6px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          {collapsed ? (
            /* Collapsed: show colored dots row */
            <>
              <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                {activeCategories.slice(0, 5).map((cat) => (
                  <div
                    key={cat}
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: CATEGORY_CONFIG[cat].color,
                      boxShadow: `0 0 4px ${CATEGORY_CONFIG[cat].glowColor}`,
                      flexShrink: 0,
                    }}
                  />
                ))}
              </div>
              <ChevronDown style={{ width: 12, height: 12, color: '#7C838F', flexShrink: 0 }} />
            </>
          ) : (
            /* Expanded header */
            <>
              <span
                style={{
                  fontSize: 9,
                  fontFamily: 'Krub, sans-serif',
                  fontWeight: 800,
                  color: '#7C838F',
                  textTransform: 'uppercase',
                  letterSpacing: '0.15em',
                  flex: 1,
                  textAlign: 'left',
                }}
              >
                Legenda
              </span>
              <ChevronUp style={{ width: 12, height: 12, color: '#7C838F', flexShrink: 0 }} />
            </>
          )}
        </button>

        {/* Expanded content */}
        {!collapsed && (
          <div style={{ padding: '0 12px 10px', display: 'flex', flexDirection: 'column', gap: 7 }}>
            {activeCategories.map((cat) => (
              <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: CATEGORY_CONFIG[cat].color,
                    boxShadow: `0 0 5px ${CATEGORY_CONFIG[cat].glowColor}`,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: 11,
                    fontFamily: 'Inter, sans-serif',
                    color: '#B6BBC6',
                    fontWeight: 500,
                    flex: 1,
                  }}
                >
                  {CATEGORY_CONFIG[cat].label}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontFamily: 'Inter, sans-serif',
                    color: '#5E646F',
                    fontWeight: 600,
                  }}
                >
                  {categoryCounts[cat]}
                </span>
              </div>
            ))}

            {hasFavorites && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginTop: 4,
                  paddingTop: 7,
                  borderTop: '1px solid #2A2D35',
                }}
              >
                <Star
                  style={{
                    width: 10,
                    height: 10,
                    color: '#F4C20D',
                    fill: '#F4C20D',
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: 11,
                    fontFamily: 'Inter, sans-serif',
                    color: '#B6BBC6',
                    fontWeight: 500,
                  }}
                >
                  Favoriet
                </span>
              </div>
            )}

            {/* Water layer indicator */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginTop: 2,
                paddingTop: 7,
                borderTop: '1px solid #2A2D35',
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#5FA8FF',
                  opacity: 0.6,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: 10,
                  fontFamily: 'Inter, sans-serif',
                  color: '#5E646F',
                  fontWeight: 400,
                }}
              >
                Viswateren NL
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
