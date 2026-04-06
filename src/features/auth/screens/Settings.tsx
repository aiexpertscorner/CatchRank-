import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  User,
  Bell,
  Shield,
  Globe,
  Save,
  LogOut,
  Key,
  Target,
  Cloud,
  MapPin,
} from 'lucide-react';
import { useAuth } from '../../../App';
import { PageLayout, PageHeader } from '../../../components/layout/PageLayout';
import { Card, Button } from '../../../components/ui/Base';
import { toast } from 'sonner';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../../lib/firebase';
import { WeatherApiKeyInput } from '../../weather/components/WeatherApiKeyInput';
import { UserProfile } from '../../../types';

/**
 * Settings Screen
 * Updated for v2 profile/types structure.
 */

type SettingsFormState = {
  displayName: string;
  email: string;
  bio: string;
  favoriteSpecies: string[];
  fishingTypes: string[];
  locationPreference: {
    name: string;
    lat?: number;
    lng?: number;
  };
  units: {
    weight: 'kg' | 'lb';
    length: 'cm' | 'inch';
  };
  theme: 'dark' | 'light' | 'system';
  notifications: {
    push: boolean;
    email: boolean;
    clubActivity: boolean;
    newAchievements: boolean;
  };
  privacy: {
    profileVisibility: 'public' | 'friends' | 'private';
    logVisibility: 'public' | 'friends' | 'private';
    showLocation: boolean;
    showStats: boolean;
  };
};

const speciesOptions = [
  'Snoek',
  'Baars',
  'Snoekbaars',
  'Karper',
  'Brasem',
  'Forel',
  'Meerval',
  'Voorn',
  'Zeelt',
  'Roofblei',
];

const techniqueOptions = [
  'Werpend',
  'Trollend',
  'Verticalen',
  'Dood aas',
  'Statisch',
  'Oppervlakte',
  'Vliegvissen',
];

function buildInitialState(profile: UserProfile | null): SettingsFormState {
  return {
    displayName: profile?.displayName || '',
    email: profile?.email || '',
    bio: profile?.bio || '',
    favoriteSpecies: profile?.favoriteSpecies || [],
    fishingTypes: profile?.fishingTypes || [],
    locationPreference: {
      name: profile?.locationPreference?.name || '',
      lat: profile?.locationPreference?.lat,
      lng: profile?.locationPreference?.lng,
    },
    units: profile?.settings?.units || {
      weight: 'kg',
      length: 'cm',
    },
    theme: profile?.settings?.theme || 'dark',
    notifications: profile?.settings?.notifications || {
      push: true,
      email: true,
      clubActivity: true,
      newAchievements: true,
    },
    privacy: profile?.privacy || {
      profileVisibility: 'public',
      logVisibility: 'friends',
      showLocation: true,
      showStats: true,
    },
  };
}

export default function Settings() {
  const { profile, updateProfile, logout } = useAuth();

  const [loading, setLoading] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [settings, setSettings] = useState<SettingsFormState>(buildInitialState(profile));

  useEffect(() => {
    setSettings(buildInitialState(profile));
  }, [profile]);

  const hasChanges = useMemo(() => {
    if (!profile) return false;

    const initial = JSON.stringify(buildInitialState(profile));
    const current = JSON.stringify(settings);
    return initial !== current;
  }, [profile, settings]);

  const handleSave = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      await updateProfile({
        displayName: settings.displayName.trim() || profile.displayName || 'Visser',
        bio: settings.bio.trim() || undefined,
        favoriteSpecies: settings.favoriteSpecies,
        fishingTypes: settings.fishingTypes,
        locationPreference: settings.locationPreference.name.trim()
          ? {
              name: settings.locationPreference.name.trim(),
              lat: settings.locationPreference.lat,
              lng: settings.locationPreference.lng,
            }
          : undefined,
        settings: {
          units: settings.units,
          theme: settings.theme,
          notifications: settings.notifications,
        },
        privacy: settings.privacy,
      });

      toast.success('Instellingen opgeslagen');
    } catch (error) {
      console.error('Settings save error:', error);
      toast.error('Fout bij opslaan');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!profile?.email) return;

    try {
      await sendPasswordResetEmail(auth, profile.email);
      toast.success(`Wachtwoord herstel email verzonden naar ${profile.email}`);
    } catch (error) {
      console.error('Password reset error:', error);
      toast.error('Fout bij verzenden herstel email');
    }
  };

  const handleLogout = async () => {
    setLogoutLoading(true);
    try {
      await logout();
      toast.success('Uitgelogd');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Fout bij uitloggen');
    } finally {
      setLogoutLoading(false);
    }
  };

  const toggleSelection = (
    list: string[],
    item: string,
    key: 'favoriteSpecies' | 'fishingTypes'
  ) => {
    const newList = list.includes(item)
      ? list.filter((i) => i !== item)
      : [...list, item];

    setSettings((prev) => ({ ...prev, [key]: newList }));
  };

  const toggleNotification = (
    key: keyof SettingsFormState['notifications']
  ) => {
    setSettings((prev) => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: !prev.notifications[key],
      },
    }));
  };

  const togglePrivacy = (
    key: 'showLocation' | 'showStats'
  ) => {
    setSettings((prev) => ({
      ...prev,
      privacy: {
        ...prev.privacy,
        [key]: !prev.privacy[key],
      },
    }));
  };

  return (
    <PageLayout>
      <PageHeader title="Instellingen" subtitle="Beheer je account en voorkeuren" />

      <div className="max-w-4xl mx-auto space-y-8 pb-32">
        {/* Account */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-4">
            <User className="w-5 h-5 text-brand" />
            <h2 className="text-lg font-krub font-bold uppercase tracking-tight">Account</h2>
          </div>

          <Card className="divide-y divide-border-subtle">
            <div className="p-4 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-text-muted uppercase tracking-wider">
                  Naam
                </label>
                <input
                  type="text"
                  value={settings.displayName}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, displayName: e.target.value }))
                  }
                  className="w-full bg-bg-main border border-border-subtle rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-brand transition-colors"
                  placeholder="Je gebruikersnaam"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-text-muted uppercase tracking-wider">
                  Email
                </label>
                <input
                  type="email"
                  value={settings.email}
                  disabled
                  className="w-full bg-bg-main/50 border border-border-subtle rounded-lg px-4 py-2 text-text-muted cursor-not-allowed"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-text-muted uppercase tracking-wider">
                  Bio
                </label>
                <textarea
                  value={settings.bio}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, bio: e.target.value }))
                  }
                  rows={3}
                  className="w-full bg-bg-main border border-border-subtle rounded-lg px-4 py-3 text-text-primary focus:outline-none focus:border-brand transition-colors resize-none"
                  placeholder="Vertel kort iets over jezelf als visser..."
                />
              </div>
            </div>

            <div className="p-4 flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <div className="text-sm font-medium text-text-primary">Wachtwoord</div>
                <div className="text-xs text-text-muted">
                  Wijzig je wachtwoord via email
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handlePasswordReset}
                className="h-9 px-4 border-border-subtle"
              >
                <Key className="w-4 h-4 mr-2" />
                Reset
              </Button>
            </div>
          </Card>
        </section>

        {/* Fishing preferences */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-4">
            <Target className="w-5 h-5 text-brand" />
            <h2 className="text-lg font-krub font-bold uppercase tracking-tight">
              Visserij Voorkeuren
            </h2>
          </div>

          <Card className="p-4 space-y-6">
            <div className="space-y-3">
              <label className="text-xs font-medium text-text-muted uppercase tracking-wider">
                Favoriete Vissoorten
              </label>
              <div className="flex flex-wrap gap-2">
                {speciesOptions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() =>
                      toggleSelection(settings.favoriteSpecies, s, 'favoriteSpecies')
                    }
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                      settings.favoriteSpecies.includes(s)
                        ? 'bg-brand border-brand text-bg-main'
                        : 'bg-surface-soft border-border-subtle text-text-muted'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-medium text-text-muted uppercase tracking-wider">
                Technieken
              </label>
              <div className="flex flex-wrap gap-2">
                {techniqueOptions.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() =>
                      toggleSelection(settings.fishingTypes, t, 'fishingTypes')
                    }
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                      settings.fishingTypes.includes(t)
                        ? 'bg-brand border-brand text-bg-main'
                        : 'bg-surface-soft border-border-subtle text-text-muted'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </Card>
        </section>

        {/* Location */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-4">
            <MapPin className="w-5 h-5 text-brand" />
            <h2 className="text-lg font-krub font-bold uppercase tracking-tight">
              Thuisbasis
            </h2>
          </div>

          <Card className="p-4 space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-text-muted uppercase tracking-wider">
                Stad / Regio
              </label>
              <input
                type="text"
                value={settings.locationPreference.name}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    locationPreference: {
                      ...prev.locationPreference,
                      name: e.target.value,
                    },
                  }))
                }
                className="w-full bg-bg-main border border-border-subtle rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-brand transition-colors"
                placeholder="Bijv. Amsterdam, Lelystad, Utrecht"
              />
            </div>

            <p className="text-xs text-text-muted">
              Deze thuisbasis gebruiken we voor een persoonlijkere ervaring, lokale context en toekomstige features.
            </p>
          </Card>
        </section>

        {/* External services */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-4">
            <Cloud className="w-5 h-5 text-brand" />
            <h2 className="text-lg font-krub font-bold uppercase tracking-tight">
              Externe Services
            </h2>
          </div>
          <WeatherApiKeyInput />
        </section>

        {/* App preferences */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-4">
            <Globe className="w-5 h-5 text-brand" />
            <h2 className="text-lg font-krub font-bold uppercase tracking-tight">
              App Instellingen
            </h2>
          </div>

          <Card className="p-4 space-y-6">
            <div className="space-y-3">
              <label className="text-xs font-medium text-text-muted uppercase tracking-wider">
                Eenheden
              </label>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <span className="text-sm text-text-secondary">Gewicht</span>
                  <div className="flex bg-bg-main rounded-lg p-1 border border-border-subtle">
                    {(['kg', 'lb'] as const).map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() =>
                          setSettings((prev) => ({
                            ...prev,
                            units: { ...prev.units, weight: u },
                          }))
                        }
                        className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${
                          settings.units.weight === u
                            ? 'bg-brand text-bg-main shadow-lg'
                            : 'text-text-muted hover:text-text-primary'
                        }`}
                      >
                        {u.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-sm text-text-secondary">Lengte</span>
                  <div className="flex bg-bg-main rounded-lg p-1 border border-border-subtle">
                    {(['cm', 'inch'] as const).map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() =>
                          setSettings((prev) => ({
                            ...prev,
                            units: { ...prev.units, length: u },
                          }))
                        }
                        className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${
                          settings.units.length === u
                            ? 'bg-brand text-bg-main shadow-lg'
                            : 'text-text-muted hover:text-text-primary'
                        }`}
                      >
                        {u === 'cm' ? 'CM' : 'IN'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-medium text-text-muted uppercase tracking-wider">
                Thema
              </label>
              <div className="flex bg-bg-main rounded-lg p-1 border border-border-subtle">
                {(['dark', 'light', 'system'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() =>
                      setSettings((prev) => ({ ...prev, theme: t }))
                    }
                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${
                      settings.theme === t
                        ? 'bg-brand text-bg-main shadow-lg'
                        : 'text-text-muted hover:text-text-primary'
                    }`}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </Card>
        </section>

        {/* Privacy */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-4">
            <Shield className="w-5 h-5 text-brand" />
            <h2 className="text-lg font-krub font-bold uppercase tracking-tight">
              Privacy
            </h2>
          </div>

          <Card className="divide-y divide-border-subtle">
            <div className="p-4 flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <div className="text-sm font-medium text-text-primary">
                  Profiel Zichtbaarheid
                </div>
                <div className="text-xs text-text-muted">
                  Wie kan je profiel bekijken?
                </div>
              </div>
              <select
                value={settings.privacy.profileVisibility}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    privacy: {
                      ...prev.privacy,
                      profileVisibility: e.target.value as 'public' | 'friends' | 'private',
                    },
                  }))
                }
                className="bg-bg-main border border-border-subtle rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-brand"
              >
                <option value="public">Openbaar</option>
                <option value="friends">Vrienden</option>
                <option value="private">Privé</option>
              </select>
            </div>

            <div className="p-4 flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <div className="text-sm font-medium text-text-primary">
                  Logboek Zichtbaarheid
                </div>
                <div className="text-xs text-text-muted">
                  Wie kan je vangsten zien?
                </div>
              </div>
              <select
                value={settings.privacy.logVisibility}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    privacy: {
                      ...prev.privacy,
                      logVisibility: e.target.value as 'public' | 'friends' | 'private',
                    },
                  }))
                }
                className="bg-bg-main border border-border-subtle rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-brand"
              >
                <option value="public">Openbaar</option>
                <option value="friends">Vrienden</option>
                <option value="private">Privé</option>
              </select>
            </div>

            <div className="p-4 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-sm font-medium text-text-primary">Toon Locatie</div>
                <div className="text-xs text-text-muted">
                  Locatie van vangsten delen
                </div>
              </div>
              <button
                type="button"
                onClick={() => togglePrivacy('showLocation')}
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  settings.privacy.showLocation ? 'bg-brand' : 'bg-surface-elevated'
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                    settings.privacy.showLocation ? 'left-7' : 'left-1'
                  }`}
                />
              </button>
            </div>

            <div className="p-4 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-sm font-medium text-text-primary">Toon Statistieken</div>
                <div className="text-xs text-text-muted">
                  Laat je voortgang en stats zien
                </div>
              </div>
              <button
                type="button"
                onClick={() => togglePrivacy('showStats')}
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  settings.privacy.showStats ? 'bg-brand' : 'bg-surface-elevated'
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                    settings.privacy.showStats ? 'left-7' : 'left-1'
                  }`}
                />
              </button>
            </div>
          </Card>
        </section>

        {/* Notifications */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-4">
            <Bell className="w-5 h-5 text-brand" />
            <h2 className="text-lg font-krub font-bold uppercase tracking-tight">
              Notificaties
            </h2>
          </div>

          <Card className="divide-y divide-border-subtle">
            <div className="p-4 flex items-center justify-between">
              <div className="text-sm text-text-primary">Push notificaties</div>
              <button
                type="button"
                onClick={() => toggleNotification('push')}
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  settings.notifications.push ? 'bg-brand' : 'bg-surface-elevated'
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                    settings.notifications.push ? 'left-7' : 'left-1'
                  }`}
                />
              </button>
            </div>

            <div className="p-4 flex items-center justify-between">
              <div className="text-sm text-text-primary">Email updates</div>
              <button
                type="button"
                onClick={() => toggleNotification('email')}
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  settings.notifications.email ? 'bg-brand' : 'bg-surface-elevated'
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                    settings.notifications.email ? 'left-7' : 'left-1'
                  }`}
                />
              </button>
            </div>

            <div className="p-4 flex items-center justify-between">
              <div className="text-sm text-text-primary">Club activiteit</div>
              <button
                type="button"
                onClick={() => toggleNotification('clubActivity')}
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  settings.notifications.clubActivity ? 'bg-brand' : 'bg-surface-elevated'
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                    settings.notifications.clubActivity ? 'left-7' : 'left-1'
                  }`}
                />
              </button>
            </div>

            <div className="p-4 flex items-center justify-between">
              <div className="text-sm text-text-primary">Nieuwe achievements</div>
              <button
                type="button"
                onClick={() => toggleNotification('newAchievements')}
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  settings.notifications.newAchievements ? 'bg-brand' : 'bg-surface-elevated'
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                    settings.notifications.newAchievements ? 'left-7' : 'left-1'
                  }`}
                />
              </button>
            </div>
          </Card>
        </section>

        {/* Danger zone */}
        <div className="pt-4 px-4">
          <Button
            variant="outline"
            className="w-full border-danger/20 text-danger hover:bg-danger/10 py-4"
            onClick={handleLogout}
            disabled={logoutLoading}
          >
            <LogOut className="w-4 h-4 mr-2" />
            {logoutLoading ? 'Uitloggen...' : 'Uitloggen'}
          </Button>
        </div>

        {/* Save FAB */}
        {profile && (
          <div className="fixed bottom-24 right-4 z-50">
            <motion.button
              whileHover={{ scale: hasChanges && !loading ? 1.05 : 1 }}
              whileTap={{ scale: hasChanges && !loading ? 0.95 : 1 }}
              onClick={handleSave}
              disabled={loading || !hasChanges}
              className={`p-4 rounded-full shadow-2xl flex items-center gap-2 font-bold transition-all ${
                loading || !hasChanges
                  ? 'bg-surface-elevated text-text-muted cursor-not-allowed'
                  : 'bg-brand text-bg-main shadow-brand/20'
              }`}
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-bg-main border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="w-6 h-6" />
                  <span className="pr-2">Opslaan</span>
                </>
              )}
            </motion.button>
          </div>
        )}
      </div>
    </PageLayout>
  );
}