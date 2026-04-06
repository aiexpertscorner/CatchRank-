import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Fish,
  MapPin,
  Target,
  ChevronRight,
  Zap,
  Trophy,
  Waves,
  Navigation,
  Compass,
  LocateFixed,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../../App';
import { Button, Card, Badge } from '../../../components/ui/Base';
import { toast } from 'sonner';

type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
type GeoStatus = 'idle' | 'requesting' | 'success' | 'error';

export default function Onboarding() {
  const { profile, updateProfile } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [geoStatus, setGeoStatus] = useState<GeoStatus>('idle');
  const [geoError, setGeoError] = useState('');
  const [resolvedCoords, setResolvedCoords] = useState<{ lat: number; lng: number } | null>(
    profile?.locationPreference?.lat != null && profile?.locationPreference?.lng != null
      ? {
          lat: profile.locationPreference.lat,
          lng: profile.locationPreference.lng,
        }
      : null
  );

  const [data, setData] = useState({
    displayName: profile?.displayName || '',
    experienceLevel: (profile?.experienceLevel || 'beginner') as ExperienceLevel,
    favoriteSpecies: profile?.favoriteSpecies || [],
    fishingTypes: profile?.fishingTypes || [],
    location: profile?.locationPreference?.name || '',
  });

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

  const steps = [
    { title: 'Welkom', icon: Waves },
    { title: 'Ervaring', icon: Compass },
    { title: 'Voorkeuren', icon: Target },
    { title: 'Locatie', icon: Navigation },
  ];

  useEffect(() => {
    if (profile?.locationPreference?.name && !data.location) {
      setData((prev) => ({
        ...prev,
        location: profile.locationPreference?.name || '',
      }));
    }
  }, [profile]);

  useEffect(() => {
    if (step === 4 && !data.location) {
      requestLocationPrefill(false);
    }
  }, [step]);

  const requestLocationPrefill = async (showSuccessToast = true) => {
    if (!navigator.geolocation) {
      setGeoStatus('error');
      setGeoError('Locatie wordt niet ondersteund op dit apparaat of in deze browser.');
      return;
    }

    setGeoStatus('requesting');
    setGeoError('');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = Number(position.coords.latitude.toFixed(6));
        const lng = Number(position.coords.longitude.toFixed(6));

        setResolvedCoords({ lat, lng });
        setGeoStatus('success');

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
          );

          if (!response.ok) {
            throw new Error('Reverse geocoding mislukt');
          }

          const result = await response.json();
          const address = result?.address || {};

          const city =
            address.city ||
            address.town ||
            address.village ||
            address.municipality ||
            address.county ||
            '';

          const state = address.state || address.province || '';
          const country = address.country || '';

          const prettyLocation = [city, state]
            .filter(Boolean)
            .join(', ')
            .trim() || country || `${lat}, ${lng}`;

          setData((prev) => ({
            ...prev,
            location: prev.location?.trim() ? prev.location : prettyLocation,
          }));

          if (showSuccessToast) {
            toast.success('Locatie opgehaald en ingevuld.');
          }
        } catch (error) {
          setData((prev) => ({
            ...prev,
            location: prev.location?.trim() ? prev.location : `${lat}, ${lng}`,
          }));

          if (showSuccessToast) {
            toast.success('Locatie opgehaald.');
          }
        }
      },
      (error) => {
        setGeoStatus('error');

        switch (error.code) {
          case error.PERMISSION_DENIED:
            setGeoError('Locatietoestemming geweigerd. Je kunt je thuisbasis handmatig invullen.');
            break;
          case error.POSITION_UNAVAILABLE:
            setGeoError('Locatie kon niet worden bepaald. Vul je thuisbasis handmatig in.');
            break;
          case error.TIMEOUT:
            setGeoError('Het ophalen van je locatie duurde te lang. Probeer opnieuw.');
            break;
          default:
            setGeoError('Locatie ophalen is mislukt. Vul je thuisbasis handmatig in.');
            break;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  };

  const toggleSelection = (
    list: string[],
    item: string,
    key: 'favoriteSpecies' | 'fishingTypes'
  ) => {
    const newList = list.includes(item)
      ? list.filter((i) => i !== item)
      : [...list, item];

    setData((prev) => ({
      ...prev,
      [key]: newList,
    }));
  };

  const handleNext = async () => {
    if (step < 4) {
      setStep((prev) => prev + 1);
      return;
    }

    setLoading(true);
    let firestoreOk = true;

    try {
      await updateProfile({
        displayName: data.displayName.trim() || profile?.displayName || 'Visser',
        experienceLevel: data.experienceLevel,
        favoriteSpecies: data.favoriteSpecies,
        fishingTypes: data.fishingTypes,
        locationPreference: {
          lat: resolvedCoords?.lat ?? 0,
          lng: resolvedCoords?.lng ?? 0,
          name: data.location.trim() || 'Onbekend',
        },
        onboardingStatus: 'complete',
        onboardingCompletedAt: new Date() as any,
        starterRewardPending: true as any,
        stats: profile?.stats || {
          totalCatches: 0,
          totalSessions: 0,
          totalSpots: 0,
          speciesCount: 0,
        },
        settings: {
          units: profile?.settings?.units || { weight: 'kg', length: 'cm' },
          theme: profile?.settings?.theme || 'dark',
          notifications: profile?.settings?.notifications || {
            push: true,
            email: true,
            clubActivity: true,
            newAchievements: true,
          },
        },
        privacy: {
          profileVisibility: profile?.privacy?.profileVisibility || 'public',
          logVisibility: profile?.privacy?.logVisibility || 'friends',
          showLocation: profile?.privacy?.showLocation ?? true,
          showStats: profile?.privacy?.showStats ?? true,
        },
      });
    } catch (error) {
      firestoreOk = false;
      console.error('Onboarding Firestore sync failed:', error);
    } finally {
      setLoading(false);
    }

    if (firestoreOk) {
      toast.success('Welkom bij CatchRank!');
    } else {
      toast.warning(
        'Profiel lokaal opgeslagen. Synchronisatie naar Firestore is mislukt.'
      );
    }

    navigate('/');
  };

  const handleBack = () => {
    setStep((prev) => Math.max(1, prev - 1));
  };

  return (
    <div className="min-h-screen bg-bg-main flex flex-col relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-brand/5 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-brand/5 blur-[150px] rounded-full" />
      </div>

      <header className="p-6 md:p-10 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-surface-card rounded-xl border border-border-subtle flex items-center justify-center shadow-lg">
            <Fish className="w-6 h-6 text-brand" />
          </div>
          <span className="text-xl font-krub font-bold text-text-primary tracking-tight uppercase">
            CatchRank
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 mr-4">
            {steps.map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full transition-all duration-500 ${
                    step >= i + 1 ? 'bg-brand scale-125' : 'bg-surface-soft'
                  }`}
                />
                {i < steps.length - 1 && <div className="w-4 h-px bg-border-subtle" />}
              </div>
            ))}
          </div>

          <Badge
            variant="accent"
            className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest"
          >
            Stap {step}/4
          </Badge>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 md:p-10 relative z-10">
        <div className="w-full max-w-2xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              {step === 1 && (
                <div className="space-y-8 text-center md:text-left">
                  <div className="space-y-4">
                    <Badge
                      variant="accent"
                      className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em]"
                    >
                      Introductie
                    </Badge>

                    <h2 className="text-4xl md:text-6xl font-krub font-bold text-text-primary tracking-tight leading-tight">
                      Laten we je <span className="text-brand">profiel</span> opbouwen.
                    </h2>

                    <p className="text-lg md:text-xl text-text-secondary font-medium max-w-xl mx-auto md:mx-0">
                      Hoe wil je dat andere vissers je noemen? Dit is je publieke naam op de rankings.
                    </p>
                  </div>

                  <div className="space-y-2 max-w-md mx-auto md:mx-0">
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">
                      Gebruikersnaam
                    </label>
                    <input
                      type="text"
                      value={data.displayName}
                      onChange={(e) =>
                        setData((prev) => ({ ...prev, displayName: e.target.value }))
                      }
                      className="w-full bg-surface-card border border-border-subtle rounded-2xl px-6 py-4 text-lg font-bold text-text-primary focus:outline-none focus:border-brand transition-all shadow-2xl"
                      placeholder="Bijv. Roofvisser99"
                    />
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-8">
                  <div className="space-y-4 text-center md:text-left">
                    <Badge
                      variant="accent"
                      className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em]"
                    >
                      Ervaring
                    </Badge>

                    <h2 className="text-4xl md:text-6xl font-krub font-bold text-text-primary tracking-tight leading-tight">
                      Wat is je <span className="text-brand">ervaring</span>?
                    </h2>

                    <p className="text-lg md:text-xl text-text-secondary font-medium max-w-xl mx-auto md:mx-0">
                      Dit helpt ons om je de juiste tips en uitdagingen te geven.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      {
                        id: 'beginner',
                        title: 'Beginner',
                        desc: 'Net begonnen met vissen',
                        icon: Waves,
                      },
                      {
                        id: 'intermediate',
                        title: 'Gevorderd',
                        desc: 'Regelmatig aan de waterkant',
                        icon: Compass,
                      },
                      {
                        id: 'advanced',
                        title: 'Expert',
                        desc: 'Vissen is mijn passie',
                        icon: Trophy,
                      },
                    ].map((level) => (
                      <Card
                        key={level.id}
                        onClick={() =>
                          setData((prev) => ({
                            ...prev,
                            experienceLevel: level.id as ExperienceLevel,
                          }))
                        }
                        className={`p-6 cursor-pointer transition-all duration-500 rounded-[2rem] border-2 text-center space-y-4 group ${
                          data.experienceLevel === level.id
                            ? 'bg-brand/10 border-brand shadow-premium-accent/20'
                            : 'bg-surface-card border-border-subtle hover:border-text-muted'
                        }`}
                      >
                        <div
                          className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center transition-colors ${
                            data.experienceLevel === level.id
                              ? 'bg-brand text-bg-main'
                              : 'bg-surface-soft text-text-muted'
                          }`}
                        >
                          <level.icon className="w-8 h-8" />
                        </div>

                        <div className="space-y-1">
                          <h4 className="text-lg font-bold text-text-primary tracking-tight">
                            {level.title}
                          </h4>
                          <p className="text-xs text-text-muted font-medium">
                            {level.desc}
                          </p>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-8">
                  <div className="space-y-4 text-center md:text-left">
                    <Badge
                      variant="accent"
                      className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em]"
                    >
                      Voorkeuren
                    </Badge>

                    <h2 className="text-4xl md:text-6xl font-krub font-bold text-text-primary tracking-tight leading-tight">
                      Waar vis je op <span className="text-brand">graag</span>?
                    </h2>

                    <p className="text-lg md:text-xl text-text-secondary font-medium max-w-xl mx-auto md:mx-0">
                      Selecteer je favoriete vissoorten en technieken.
                    </p>
                  </div>

                  <Card className="p-8 border border-border-subtle bg-surface-card rounded-[2.5rem] shadow-2xl space-y-8">
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">
                        Favoriete Vissoorten
                      </label>

                      <div className="flex flex-wrap gap-2">
                        {speciesOptions.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() =>
                              toggleSelection(data.favoriteSpecies, s, 'favoriteSpecies')
                            }
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border-2 ${
                              data.favoriteSpecies.includes(s)
                                ? 'bg-brand border-brand text-bg-main shadow-lg shadow-brand/20'
                                : 'bg-surface-soft border-border-subtle text-text-muted hover:border-text-muted'
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">
                        Technieken
                      </label>

                      <div className="flex flex-wrap gap-2">
                        {techniqueOptions.map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() =>
                              toggleSelection(data.fishingTypes, t, 'fishingTypes')
                            }
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border-2 ${
                              data.fishingTypes.includes(t)
                                ? 'bg-brand border-brand text-bg-main shadow-lg shadow-brand/20'
                                : 'bg-surface-soft border-border-subtle text-text-muted hover:border-text-muted'
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-8">
                  <div className="space-y-4 text-center md:text-left">
                    <Badge
                      variant="accent"
                      className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em]"
                    >
                      Locatie
                    </Badge>

                    <h2 className="text-4xl md:text-6xl font-krub font-bold text-text-primary tracking-tight leading-tight">
                      Je <span className="text-brand">thuisbasis</span>.
                    </h2>

                    <p className="text-lg md:text-xl text-text-secondary font-medium max-w-xl mx-auto md:mx-0">
                      We proberen je locatie automatisch op te halen. Daarna kun je je thuisbasis altijd handmatig aanpassen.
                    </p>
                  </div>

                  <Card className="p-8 border border-border-subtle bg-surface-card rounded-[2.5rem] shadow-2xl space-y-6">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => requestLocationPrefill(true)}
                        disabled={geoStatus === 'requesting'}
                        className="h-12 rounded-2xl font-bold"
                      >
                        {geoStatus === 'requesting' ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Locatie ophalen...
                          </>
                        ) : (
                          <>
                            <LocateFixed className="w-4 h-4 mr-2" />
                            Gebruik mijn locatie
                          </>
                        )}
                      </Button>

                      {geoStatus === 'success' && (
                        <div className="flex items-center gap-2 text-xs font-bold text-success px-2">
                          <CheckCircle2 className="w-4 h-4" />
                          Locatie opgehaald
                        </div>
                      )}
                    </div>

                    {geoStatus === 'error' && geoError && (
                      <div className="flex items-start gap-3 p-4 bg-warning/5 rounded-2xl border border-warning/10">
                        <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                        <p className="text-xs font-medium text-text-secondary">
                          {geoError}
                        </p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">
                        Stad / Regio
                      </label>

                      <div className="relative">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand" />
                        <input
                          type="text"
                          value={data.location}
                          onChange={(e) =>
                            setData((prev) => ({ ...prev, location: e.target.value }))
                          }
                          className="w-full bg-bg-main border border-border-subtle rounded-2xl pl-12 pr-4 py-4 text-lg font-bold text-text-primary focus:outline-none focus:border-brand transition-all"
                          placeholder="Bijv. Amersfoort"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-4 bg-brand/5 rounded-2xl border border-brand/10">
                      <Zap className="w-5 h-5 text-brand shrink-0" />
                      <p className="text-xs font-medium text-text-secondary">
                        Je thuisbasis wordt gebruikt voor lokale weercontext, rankings en latere slimme aanbevelingen. Je kunt dit later altijd aanpassen.
                      </p>
                    </div>
                  </Card>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <footer className="p-6 md:p-10 flex items-center justify-between relative z-10">
        <Button
          variant="ghost"
          onClick={handleBack}
          disabled={step === 1}
          className="text-text-muted font-black text-[10px] uppercase tracking-widest disabled:opacity-0"
        >
          Vorige
        </Button>

        <div className="flex items-center gap-4">
          <div className="flex md:hidden items-center gap-1.5">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all ${
                  step === i + 1 ? 'bg-brand w-4 h-1.5' : 'bg-surface-soft w-1.5 h-1.5'
                }`}
              />
            ))}
          </div>

          <Button
            onClick={handleNext}
            disabled={loading || (step === 1 && !data.displayName.trim())}
            className="h-14 px-10 rounded-2xl font-bold shadow-premium-accent"
          >
            {loading ? (
              <div className="w-6 h-6 border-2 border-bg-main border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                {step === 4 ? 'Afronden' : 'Volgende'}
                <ChevronRight className="w-5 h-5 ml-2" />
              </>
            )}
          </Button>
        </div>
      </footer>
    </div>
  );
}