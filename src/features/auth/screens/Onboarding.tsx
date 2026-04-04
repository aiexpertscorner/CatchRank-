import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Fish, 
  MapPin, 
  Target, 
  ChevronRight, 
  Check, 
  Star, 
  Zap, 
  Trophy,
  Waves,
  Navigation,
  Compass
} from 'lucide-react';
import { useAuth } from '../../../App';
import { Button, Card, Badge } from '../../../components/ui/Base';
import { ProgressBar } from '../../../components/ui/Data';
import { toast } from 'sonner';

/**
 * Onboarding Screen
 * Part of the 'auth' feature module.
 * Guides new users through profile setup and preferences.
 */

export default function Onboarding() {
  const { profile, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [data, setData] = useState({
    displayName: profile?.displayName || '',
    experienceLevel: 'beginner' as 'beginner' | 'intermediate' | 'advanced',
    favoriteSpecies: [] as string[],
    fishingTypes: [] as string[],
    location: 'Amsterdam',
  });

  const speciesOptions = ['Snoek', 'Baars', 'Snoekbaars', 'Karper', 'Brasem', 'Forel', 'Meerval', 'Voorn', 'Zeelt', 'Roofblei'];
  const techniqueOptions = ['Werpend', 'Trollend', 'Verticalen', 'Dood aas', 'Statisch', 'Oppervlakte', 'Vliegvissen'];

  const handleNext = async () => {
    if (step < 4) {
      setStep(step + 1);
    } else {
      setLoading(true);
      try {
        await updateProfile({
          displayName: data.displayName,
          experienceLevel: data.experienceLevel,
          favoriteSpecies: data.favoriteSpecies,
          fishingTypes: data.fishingTypes,
          onboardingStatus: 'complete',
          xp: 100, // Welcome bonus
          level: 1,
          stats: {
            totalCatches: 0,
            totalSessions: 0,
            totalSpots: 0,
            speciesCount: 0,
          },
          settings: {
            units: { weight: 'kg', length: 'cm' },
            theme: 'dark',
            notifications: {
              push: true,
              email: true,
              clubActivity: true,
              newAchievements: true,
            }
          },
          privacy: {
            profileVisibility: 'public',
            logVisibility: 'friends',
            showLocation: true,
            showStats: true,
          }
        });
        toast.success('Welkom bij de community! 🎣');
        navigate('/');
      } catch (error) {
        toast.error('Fout bij opslaan profiel. Probeer opnieuw.');
      } finally {
        setLoading(false);
      }
    }
  };

  const toggleSelection = (list: string[], item: string, key: 'favoriteSpecies' | 'fishingTypes') => {
    const newList = list.includes(item) 
      ? list.filter(i => i !== item) 
      : [...list, item];
    setData({ ...data, [key]: newList });
  };

  const steps = [
    { title: 'Welkom', icon: Waves },
    { title: 'Ervaring', icon: Compass },
    { title: 'Voorkeuren', icon: Target },
    { title: 'Locatie', icon: Navigation },
  ];

  return (
    <div className="min-h-screen bg-bg-main flex flex-col relative overflow-hidden">
      {/* Background Accents */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-brand/5 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-brand/5 blur-[150px] rounded-full" />
      </div>

      {/* Header */}
      <header className="p-6 md:p-10 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-surface-card rounded-xl border border-border-subtle flex items-center justify-center shadow-lg">
            <Fish className="w-6 h-6 text-brand" />
          </div>
          <span className="text-xl font-krub font-bold text-text-primary tracking-tight uppercase">CatchRank</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 mr-4">
            {steps.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full transition-all duration-500 ${step > i ? 'bg-brand scale-125' : 'bg-surface-soft'}`} />
                {i < steps.length - 1 && <div className="w-4 h-px bg-border-subtle" />}
              </div>
            ))}
          </div>
          <Badge variant="accent" className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">Stap {step}/4</Badge>
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
                    <Badge variant="accent" className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em]">Introductie</Badge>
                    <h2 className="text-4xl md:text-6xl font-krub font-bold text-text-primary tracking-tight leading-tight">
                      Laten we je <span className="text-brand">profiel</span> opbouwen.
                    </h2>
                    <p className="text-lg md:text-xl text-text-secondary font-medium max-w-xl mx-auto md:mx-0">
                      Hoe wil je dat andere vissers je noemen? Dit is je publieke naam op de rankings.
                    </p>
                  </div>
                  <div className="space-y-2 max-w-md mx-auto md:mx-0">
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Gebruikersnaam</label>
                    <input
                      type="text"
                      value={data.displayName}
                      onChange={(e) => setData({ ...data, displayName: e.target.value })}
                      className="w-full bg-surface-card border border-border-subtle rounded-2xl px-6 py-4 text-lg font-bold text-text-primary focus:outline-none focus:border-brand transition-all shadow-2xl"
                      placeholder="Bijv. Roofvisser99"
                    />
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-8">
                  <div className="space-y-4 text-center md:text-left">
                    <Badge variant="accent" className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em]">Ervaring</Badge>
                    <h2 className="text-4xl md:text-6xl font-krub font-bold text-text-primary tracking-tight leading-tight">
                      Wat is je <span className="text-brand">ervaring</span>?
                    </h2>
                    <p className="text-lg md:text-xl text-text-secondary font-medium max-w-xl mx-auto md:mx-0">
                      Dit helpt ons om je de juiste tips en uitdagingen te geven.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { id: 'beginner', title: 'Beginner', desc: 'Net begonnen met vissen', icon: Waves },
                      { id: 'intermediate', title: 'Gevorderd', desc: 'Regelmatig aan de waterkant', icon: Compass },
                      { id: 'advanced', title: 'Expert', desc: 'Vissen is mijn passie', icon: Trophy },
                    ].map((level) => (
                      <Card
                        key={level.id}
                        onClick={() => setData({ ...data, experienceLevel: level.id as any })}
                        className={`p-6 cursor-pointer transition-all duration-500 rounded-[2rem] border-2 text-center space-y-4 group ${
                          data.experienceLevel === level.id 
                            ? 'bg-brand/10 border-brand shadow-premium-accent/20' 
                            : 'bg-surface-card border-border-subtle hover:border-text-muted'
                        }`}
                      >
                        <div className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center transition-colors ${
                          data.experienceLevel === level.id ? 'bg-brand text-bg-main' : 'bg-surface-soft text-text-muted'
                        }`}>
                          <level.icon className="w-8 h-8" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-lg font-bold text-text-primary tracking-tight">{level.title}</h4>
                          <p className="text-xs text-text-muted font-medium">{level.desc}</p>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-8">
                  <div className="space-y-4 text-center md:text-left">
                    <Badge variant="accent" className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em]">Voorkeuren</Badge>
                    <h2 className="text-4xl md:text-6xl font-krub font-bold text-text-primary tracking-tight leading-tight">
                      Waar vis je op <span className="text-brand">graag</span>?
                    </h2>
                    <p className="text-lg md:text-xl text-text-secondary font-medium max-w-xl mx-auto md:mx-0">
                      Selecteer je favoriete vissoorten en technieken.
                    </p>
                  </div>
                  <Card className="p-8 border border-border-subtle bg-surface-card rounded-[2.5rem] shadow-2xl space-y-8">
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Favoriete Vissoorten</label>
                      <div className="flex flex-wrap gap-2">
                        {speciesOptions.map(s => (
                          <button
                            key={s}
                            onClick={() => toggleSelection(data.favoriteSpecies, s, 'favoriteSpecies')}
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
                      <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Technieken</label>
                      <div className="flex flex-wrap gap-2">
                        {techniqueOptions.map(t => (
                          <button
                            key={t}
                            onClick={() => toggleSelection(data.fishingTypes, t, 'fishingTypes')}
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
                    <Badge variant="accent" className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em]">Locatie</Badge>
                    <h2 className="text-4xl md:text-6xl font-krub font-bold text-text-primary tracking-tight leading-tight">
                      Je <span className="text-brand">thuisbasis</span>.
                    </h2>
                    <p className="text-lg md:text-xl text-text-secondary font-medium max-w-xl mx-auto md:mx-0">
                      Dit gebruiken we voor lokale weersvoorspellingen en rankings.
                    </p>
                  </div>
                  <Card className="p-8 border border-border-subtle bg-surface-card rounded-[2.5rem] shadow-2xl space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Stad / Regio</label>
                      <div className="relative">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand" />
                        <input
                          type="text"
                          value={data.location}
                          onChange={(e) => setData({ ...data, location: e.target.value })}
                          className="w-full bg-bg-main border border-border-subtle rounded-2xl pl-12 pr-4 py-4 text-lg font-bold text-text-primary focus:outline-none focus:border-brand transition-all"
                          placeholder="Bijv. Amsterdam"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-brand/5 rounded-2xl border border-brand/10">
                      <Zap className="w-5 h-5 text-brand" />
                      <p className="text-xs font-medium text-text-secondary">
                        Je kunt je locatie later altijd wijzigen in de instellingen.
                      </p>
                    </div>
                  </Card>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Footer Navigation */}
      <footer className="p-6 md:p-10 flex items-center justify-between relative z-10">
        <Button
          variant="ghost"
          onClick={() => setStep(Math.max(1, step - 1))}
          disabled={step === 1}
          className="text-text-muted font-black text-[10px] uppercase tracking-widest disabled:opacity-0"
        >
          Vorige
        </Button>
        <div className="flex items-center gap-4">
          <div className="flex md:hidden items-center gap-1.5">
            {steps.map((_, i) => (
              <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${step === i + 1 ? 'bg-brand w-4' : 'bg-surface-soft'}`} />
            ))}
          </div>
          <Button
            onClick={handleNext}
            disabled={loading || (step === 1 && !data.displayName)}
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
