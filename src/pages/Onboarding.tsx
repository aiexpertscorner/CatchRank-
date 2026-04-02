import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Fish, ArrowRight, ArrowLeft, Check, MapPin, Target, Trophy, Waves } from 'lucide-react';
import { useAuth } from '../App';
import { Button, Card, ProgressBar } from '../components/ui/Base';
import { toast } from 'sonner';

type OnboardingStep = 'welcome' | 'profile' | 'preferences' | 'location' | 'activation';

export default function Onboarding() {
  const { profile, updateProfile } = useAuth();
  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [name, setName] = useState(profile?.displayName || '');
  const [experience, setExperience] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [selectedSpecies, setSelectedSpecies] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const speciesOptions = ['Snoek', 'Baars', 'Snoekbaars', 'Karper', 'Brasem', 'Forel', 'Meerval', 'Voorn'];
  const fishingTypes = ['Roofvis', 'Karpervissen', 'Witvissen', 'Vliegvissen', 'Zeevissen', 'Streetfishing'];

  const handleNext = async () => {
    if (step === 'welcome') setStep('profile');
    else if (step === 'profile') setStep('preferences');
    else if (step === 'preferences') setStep('location');
    else if (step === 'location') setStep('activation');
    else if (step === 'activation') {
      setLoading(true);
      await updateProfile({
        displayName: name,
        experienceLevel: experience,
        favoriteSpecies: selectedSpecies,
        fishingTypes: selectedTypes,
        onboardingStatus: 'complete',
        xp: 50, // Welcome bonus
      });
      toast.success('Welkom bij CatchRank! Je hebt 50 XP verdiend.');
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 'profile') setStep('welcome');
    else if (step === 'preferences') setStep('profile');
    else if (step === 'location') setStep('preferences');
    else if (step === 'activation') setStep('location');
  };

  const toggleSpecies = (s: string) => {
    setSelectedSpecies(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const toggleType = (t: string) => {
    setSelectedTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  };

  const steps: OnboardingStep[] = ['welcome', 'profile', 'preferences', 'location', 'activation'];
  const progress = ((steps.indexOf(step) + 1) / steps.length) * 100;

  return (
    <div className="min-h-screen bg-bg-main flex flex-col p-4 md:p-8">
      <div className="max-w-xl w-full mx-auto flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center">
              <Fish className="text-bg-main w-5 h-5" />
            </div>
            <span className="font-display font-bold text-text-primary">CatchRank</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-[10px] font-black text-text-muted uppercase tracking-widest">
              Stap {steps.indexOf(step) + 1} van {steps.length}
            </div>
            <button 
              onClick={() => updateProfile({ onboardingStatus: 'complete' })}
              className="text-[10px] font-black text-brand uppercase tracking-widest hover:underline"
            >
              Skip
            </button>
          </div>
        </div>

        <ProgressBar progress={progress} className="mb-12" />

        <div className="flex-1 flex flex-col justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              {step === 'welcome' && (
                <div className="text-center space-y-6">
                  <div className="w-24 h-24 bg-brand/10 rounded-[2rem] flex items-center justify-center mx-auto mb-8">
                    <Trophy className="text-brand w-12 h-12" />
                  </div>
                  <h1 className="text-4xl font-display font-bold text-text-primary tracking-tight">Welkom bij de club!</h1>
                  <p className="text-lg text-text-secondary leading-relaxed">
                    CatchRank is de plek waar je vangsten tot leven komen. Log je sessies, verbeter je skills en stijg in de rankings.
                  </p>
                  <div className="grid grid-cols-1 gap-4 text-left mt-8">
                    <div className="flex items-start gap-4 p-4 bg-surface-card rounded-2xl border border-border-subtle">
                      <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center flex-shrink-0">
                        <Target className="text-brand w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-text-primary">Slim Loggen</h4>
                        <p className="text-xs text-text-muted">Sla je vangsten razendsnel op met alle metadata.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4 p-4 bg-surface-card rounded-2xl border border-border-subtle">
                      <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center flex-shrink-0">
                        <Waves className="text-brand w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-text-primary">Inzicht & Analyse</h4>
                        <p className="text-xs text-text-muted">Ontdek patronen in je vangsten en weersomstandigheden.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {step === 'profile' && (
                <div className="space-y-8">
                  <div className="text-center">
                    <h2 className="text-3xl font-display font-bold text-text-primary mb-2">Wie ben je?</h2>
                    <p className="text-text-secondary">Laten we je profiel een beetje kleur geven.</p>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-text-muted uppercase tracking-widest ml-1">Naam</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Je vissersnaam"
                        className="w-full bg-surface-card border border-border-subtle rounded-2xl p-4 text-text-primary focus:border-brand outline-none transition-all text-lg font-bold"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-black text-text-muted uppercase tracking-widest ml-1">Ervaring</label>
                      <div className="grid grid-cols-1 gap-3">
                        {(['beginner', 'intermediate', 'advanced'] as const).map((lvl) => (
                          <button
                            key={lvl}
                            onClick={() => setExperience(lvl)}
                            className={`p-4 rounded-2xl border text-left transition-all flex items-center justify-between ${
                              experience === lvl 
                                ? 'bg-brand/10 border-brand' 
                                : 'bg-surface-card border-border-subtle hover:border-text-muted'
                            }`}
                          >
                            <div>
                              <h4 className="font-bold text-text-primary capitalize">{lvl}</h4>
                              <p className="text-xs text-text-muted">
                                {lvl === 'beginner' && 'Ik ben net begonnen met vissen.'}
                                {lvl === 'intermediate' && 'Ik vis regelmatig en ken de basics.'}
                                {lvl === 'advanced' && 'Ik ben een ervaren visser met veel kennis.'}
                              </p>
                            </div>
                            {experience === lvl && <Check className="text-brand w-5 h-5" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {step === 'preferences' && (
                <div className="space-y-8">
                  <div className="text-center">
                    <h2 className="text-3xl font-display font-bold text-text-primary mb-2">Wat vis je?</h2>
                    <p className="text-text-secondary">Zo kunnen we je de beste tips en rankings tonen.</p>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-3">
                      <label className="text-xs font-black text-text-muted uppercase tracking-widest ml-1">Favoriete Soorten</label>
                      <div className="flex flex-wrap gap-2">
                        {speciesOptions.map(s => (
                          <button
                            key={s}
                            onClick={() => toggleSpecies(s)}
                            className={`px-4 py-2 rounded-full border text-sm font-bold transition-all ${
                              selectedSpecies.includes(s)
                                ? 'bg-brand text-bg-main border-brand'
                                : 'bg-surface-card border-border-subtle text-text-secondary hover:border-text-muted'
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-xs font-black text-text-muted uppercase tracking-widest ml-1">Type Visserij</label>
                      <div className="grid grid-cols-2 gap-3">
                        {fishingTypes.map(t => (
                          <button
                            key={t}
                            onClick={() => toggleType(t)}
                            className={`p-4 rounded-2xl border text-sm font-bold transition-all flex items-center justify-between ${
                              selectedTypes.includes(t)
                                ? 'bg-brand/10 border-brand text-brand'
                                : 'bg-surface-card border-border-subtle text-text-secondary hover:border-text-muted'
                            }`}
                          >
                            {t}
                            {selectedTypes.includes(t) && <Check className="w-4 h-4" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {step === 'location' && (
                <div className="text-center space-y-8">
                  <div className="w-24 h-24 bg-brand/10 rounded-[2rem] flex items-center justify-center mx-auto mb-8">
                    <MapPin className="text-brand w-12 h-12" />
                  </div>
                  <h2 className="text-3xl font-display font-bold text-text-primary tracking-tight">Waar vis je meestal?</h2>
                  <p className="text-text-secondary">
                    We gebruiken je locatie om het weer, de beste tijden en lokale stekken te tonen.
                  </p>
                  <div className="space-y-4">
                    <Button variant="secondary" className="w-full h-14 text-lg" onClick={() => handleNext()}>
                      Gebruik huidige locatie
                    </Button>
                    <p className="text-xs text-text-muted">Je kunt dit later altijd aanpassen in je instellingen.</p>
                  </div>
                </div>
              )}

              {step === 'activation' && (
                <div className="text-center space-y-8">
                  <div className="w-24 h-24 bg-brand/10 rounded-[2rem] flex items-center justify-center mx-auto mb-8">
                    <Fish className="text-brand w-12 h-12" />
                  </div>
                  <h2 className="text-3xl font-display font-bold text-text-primary tracking-tight">Klaar om te vangen!</h2>
                  <p className="text-text-secondary">
                    Je profiel is compleet. Tijd om je eerste vangst te loggen of je dashboard te verkennen.
                  </p>
                  <div className="grid grid-cols-1 gap-4">
                    <Card 
                      onClick={handleNext}
                      className="p-6 border-brand bg-brand/5 text-left flex items-center justify-between group cursor-pointer hover:bg-brand/10 transition-all"
                    >
                      <div>
                        <h4 className="font-bold text-text-primary">Eerste Vangst Loggen</h4>
                        <p className="text-xs text-text-muted">Start direct met het opbouwen van je stats.</p>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-brand text-bg-main flex items-center justify-center group-hover:scale-110 transition-transform">
                        <ArrowRight className="w-5 h-5" />
                      </div>
                    </Card>
                    <Card 
                      onClick={handleNext}
                      className="p-6 text-left flex items-center justify-between group cursor-pointer hover:bg-surface-soft transition-all"
                    >
                      <div>
                        <h4 className="font-bold text-text-primary">Dashboard Bekijken</h4>
                        <p className="text-xs text-text-muted">Verken de rankings, clubs en tools.</p>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-surface-soft text-text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                        <ArrowRight className="w-5 h-5" />
                      </div>
                    </Card>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer Actions */}
        <div className="mt-12 flex items-center justify-between gap-4">
          {step !== 'welcome' ? (
            <Button variant="ghost" onClick={handleBack} className="flex-1 h-14 text-lg">
              <ArrowLeft className="w-5 h-5 mr-2" />
              Terug
            </Button>
          ) : <div className="flex-1" />}
          
          <Button 
            onClick={handleNext} 
            className="flex-[2] h-14 text-lg font-bold"
            disabled={loading}
          >
            {loading ? 'Laden...' : (step === 'activation' ? 'Afronden' : 'Volgende')}
            {!loading && step !== 'activation' && <ArrowRight className="w-5 h-5 ml-2" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
