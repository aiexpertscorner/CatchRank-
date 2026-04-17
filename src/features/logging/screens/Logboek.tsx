import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { Fish, History, MapPin } from 'lucide-react';
import { PageLayout, PageHeader } from '../../../components/layout/PageLayout';

const tabs = [
  { label: 'Vangsten', icon: Fish,    path: '/logboek/vangsten' },
  { label: 'Sessies',  icon: History, path: '/logboek/sessies'  },
  { label: 'Stekken',  icon: MapPin,  path: '/logboek/stekken'  },
];

export default function Logboek() {
  return (
    <PageLayout>
      <PageHeader
        title="Logboek"
        subtitle="Vangsten · Sessies · Stekken"
      />

      {/* Tab bar */}
      <div className="flex items-center gap-1 bg-surface-card p-1 rounded-2xl border border-border-subtle mx-2 md:mx-0 mb-2">
        {tabs.map(tab => (
          <NavLink
            key={tab.path}
            to={tab.path}
            className={({ isActive }) =>
              `flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? 'bg-brand text-bg-main shadow-lg shadow-brand/20'
                  : 'text-text-muted hover:text-text-primary hover:bg-surface-soft'
              }`
            }
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </NavLink>
        ))}
      </div>

      {/* Active sub-screen renders here */}
      <Outlet />
    </PageLayout>
  );
}
