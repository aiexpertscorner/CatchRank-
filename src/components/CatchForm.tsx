import React, { useEffect, useState } from 'react';
import { 
  Fish, 
  Ruler, 
  Scale, 
  MapPin, 
  Wind, 
  Thermometer, 
  Waves,
  Zap,
  ChevronRight,
  ChevronLeft,
  Check,
  Plus,
  Camera,
  AlertCircle,
  Sparkles,
  X,
  Weight
} from 'lucide-react';
import { Button, Card, Badge, ProgressBar } from './ui/Base';
import { Input, Select, Textarea } from './ui/Inputs';
import { motion, AnimatePresence } from 'motion/react';
import { loggingService } from '../services/loggingService';
import { useAuth } from '../App';
import { Catch, Species, Spot } from '../types';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { toast } from 'sonner';
import { SpotModal } from './SpotModal';

interface CatchFormProps {
  initialData?: Partial<Catch>;
  activeSessionId?: string;
  onComplete: (catchId: string) => void;
  onCancel: () => void;
}

export const CatchForm: React.FC<CatchFormProps> = ({ 
  initialData = {}, 
  activeSessionId, 
  onComplete, 
  onCancel 
}) => {
  const { profile } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isSpotModalOpen, setIsSpotModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Catch>>({
    species: '',
    weight: undefined,
    length: undefined,
    spotId: '',
    baitId: '',
    techniqueId: '',
    notes: '',
    status: 'complete',
    isPrivate: false,
    ...initialData
  });

  const [speciesList, setSpeciesList] = useState<Species[]>([]);
  const [spotsList, setSpotsList] = useState<Spot[]>([]);
  const [suggestions, setSuggestions] = useState<{
    species: string[];
    spots: string[];
    baits: string[];
    techniques: string[];
  } | null>(null);

  const fetchData = async () => {
    if (!profile) return;
    
    // Fetch species
    const speciesSnap = await getDocs(collection(db, 'species'));
    setSpeciesList(speciesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Species)));

    // Fetch user spots
    const spotsQuery = query(collection(db, 'spots'), where('userId', '==', profile.uid));
    const spotsSnap = await getDocs(spotsQuery);
    setSpotsList(spotsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Spot)));

    // Get smart suggestions
    const smartSuggestions = await loggingService.getSmartSuggestions(profile.uid);
    setSuggestions(smartSuggestions);
  };

  useEffect(() => {
    fetchData();
  }, [profile]);

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

  const handleSubmit = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      let catchId = formData.id;
      if (catchId) {
        await loggingService.completeCatch(catchId, formData);
      } else {
        // In a real app, you'd have a full create method.
        // For now, we'll use the quickCatch logic and then update.
        catchId = await loggingService.quickCatch(profile.uid, formData.photoURL || '');
        await loggingService.completeCatch(catchId, formData);
      }

      if (activeSessionId && catchId) {
        await loggingService.linkCatchToSession(catchId, activeSessionId, formData.spotId);
      }

      toast.success('Vangst succesvol gelogd!', {
        description: `Je hebt +${formData.xpEarned || 25} XP verdiend.`
      });
      onComplete(catchId);
    } catch (error) {
      console.error('Catch logging error:', error);
      toast.error('Fout bij het loggen van de vangst.');
    } finally {
      setLoading(false);
    }
  };

  const applySuggestion = (field: keyof Catch, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleQuickSelect = (field: keyof Catch, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const steps = [
    { title: 'De Vis', icon: Fish },
    { title: 'Maten', icon: Scale },
    { title: 'Details', icon: MapPin },
    { title: 'Review', icon: Check }
  ];

  return (
    <Card variant="premium" className="max-w-4xl mx-auto overflow-hidden border-none shadow-premium rounded-[3rem]">
      {/* Stepper Header */}
      <div className="bg-surface-soft/40 border-b border-border-subtle p-10">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-4xl font-bold tracking-tight text-primary">Vangst Loggen</h2>
            <p className="text-lg text-text-muted mt-2 font-medium">Leg je vangst vast in detail voor je dagboek</p>
          </div>
          <Badge variant="xp" className="px-5 py-2 text-xs">Stap {step} van 4</Badge>
        </div>
        <div className="flex items-center gap-4">
          {steps.map((s, i) => (
            <React.Fragment key={i}>
              <div 
                className={`w-14 h-14 rounded-[1.25rem] flex items-center justify-center transition-all duration-700 ${
                  step > i + 1 ? 'bg-success text-white shadow-lg shadow-success/20' : 
                  step === i + 1 ? 'bg-accent text-white shadow-premium-accent scale-110' : 
                  'bg-white text-text-muted border border-border-subtle shadow-sm'
                }`}
              >
                <s.icon className={`w-7 h-7 ${step === i + 1 ? 'animate-pulse' : ''}`} />
              </div>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-1.5 rounded-full transition-all duration-700 ${step > i + 1 ? 'bg-success' : 'bg-border-subtle'}`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Form Content */}
      <div className="p-12 min-h-[500px]">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
              className="space-y-12"
            >
              <div className="space-y-8">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.25em]">Wat heb je gevangen?</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <Select 
                    label="Vissoort"
                    value={formData.species}
                    onChange={(e) => setFormData({ ...formData, species: e.target.value })}
                    options={speciesList.map(s => ({ label: s.name, value: s.name }))}
                    placeholder="Kies een soort..."
                  />
                  <div className="flex flex-col justify-end">
                    <Input 
                      label="Of typ handmatig"
                      value={formData.species}
                      onChange={(e) => setFormData({ ...formData, species: e.target.value })}
                      placeholder="Bijv. Snoekbaars"
                    />
                  </div>
                </div>
                
                {suggestions && suggestions.species.length > 0 && (
                  <div className="space-y-4">
                    <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] flex items-center gap-2.5">
                      <Sparkles className="w-4 h-4 text-accent" /> Slimme Suggesties
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {suggestions.species.map(s => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => handleQuickSelect('species', s)}
                          className={`px-5 py-2.5 rounded-[1rem] text-sm font-bold border transition-all duration-500 ${
                            formData.species === s 
                              ? 'bg-accent text-white border-accent shadow-premium-accent' 
                              : 'bg-white border-border-subtle text-text-secondary hover:border-accent/40 hover:bg-accent/5'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-8">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.25em]">Foto toevoegen</label>
                <div className="aspect-video w-full bg-surface-soft/30 border-2 border-dashed border-border-subtle rounded-[2.5rem] flex flex-col items-center justify-center gap-6 cursor-pointer hover:border-accent/40 hover:bg-accent/5 transition-all duration-500 overflow-hidden relative group shadow-inner">
                  {formData.photoURL ? (
                    <>
                      <img src={formData.photoURL} alt="Vangst" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                      <div className="absolute inset-0 bg-primary/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center backdrop-blur-[4px]">
                        <Button variant="secondary" className="rounded-2xl h-14 px-8 font-bold text-lg" icon={<Camera className="w-6 h-6" />}>Wijzigen</Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-24 h-24 bg-white rounded-[1.5rem] shadow-premium flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                        <Camera className="w-12 h-12 text-accent" />
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-primary">Foto uploaden</p>
                        <p className="text-base text-text-muted mt-2 font-medium">Sleep je foto hierheen of klik om te kiezen</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
              className="space-y-12"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-5">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.25em] flex items-center gap-3">
                    <Scale className="w-5 h-5 text-accent" /> Gewicht (gram)
                  </label>
                  <Input 
                    type="number"
                    value={formData.weight || ''}
                    onChange={(e) => setFormData({ ...formData, weight: Number(e.target.value) })}
                    placeholder="Bijv. 1250"
                    className="text-4xl font-bold h-24 bg-white border-border-subtle focus:border-accent rounded-[1.5rem] px-8 shadow-sm"
                  />
                </div>
                <div className="space-y-5">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.25em] flex items-center gap-3">
                    <Ruler className="w-5 h-5 text-accent" /> Lengte (cm)
                  </label>
                  <Input 
                    type="number"
                    value={formData.length || ''}
                    onChange={(e) => setFormData({ ...formData, length: Number(e.target.value) })}
                    placeholder="Bijv. 45"
                    className="text-4xl font-bold h-24 bg-white border-border-subtle focus:border-accent rounded-[1.5rem] px-8 shadow-sm"
                  />
                </div>
              </div>

              <div className="p-10 bg-accent/5 border border-accent/10 rounded-[2.5rem] flex items-center gap-8 shadow-inner">
                <div className="w-20 h-20 bg-accent/10 rounded-[1.5rem] flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Zap className="w-10 h-10 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">XP Berekening</p>
                  <p className="text-lg text-text-secondary mt-1 font-medium">Op basis van soort en gewicht verdien je naar schatting <span className="text-accent font-black">+35 XP</span>.</p>
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
              className="space-y-12"
            >
              <div className="space-y-10">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.25em]">Visstek</label>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-water h-10 text-[11px] font-black uppercase tracking-[0.2em] hover:bg-water/5 px-4 rounded-xl"
                    onClick={() => setIsSpotModalOpen(true)}
                    icon={<Plus className="w-4 h-4" />}
                  >
                    Nieuwe Stek
                  </Button>
                </div>
                <Select 
                  label=""
                  value={formData.spotId}
                  onChange={(e) => setFormData({ ...formData, spotId: e.target.value })}
                  options={spotsList.map(s => ({ label: s.name, value: s.id! }))}
                  placeholder="Kies een stek..."
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-5">
                    <Input 
                      label="Aas"
                      value={formData.baitId}
                      onChange={(e) => setFormData({ ...formData, baitId: e.target.value })}
                      placeholder="Bijv. Shads 10cm"
                    />
                    {suggestions && suggestions.baits.length > 0 && (
                      <div className="flex flex-wrap gap-3">
                        {suggestions.baits.map(b => (
                          <button
                            key={b}
                            type="button"
                            onClick={() => handleQuickSelect('baitId', b)}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] border transition-all duration-500 ${
                              formData.baitId === b 
                                ? 'bg-accent text-white border-accent shadow-sm' 
                                : 'bg-white border-border-subtle text-text-muted hover:border-accent/40'
                            }`}
                          >
                            {b}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="space-y-5">
                    <Input 
                      label="Techniek"
                      value={formData.techniqueId}
                      onChange={(e) => setFormData({ ...formData, techniqueId: e.target.value })}
                      placeholder="Bijv. Verticalen"
                    />
                    {suggestions && suggestions.techniques.length > 0 && (
                      <div className="flex flex-wrap gap-3">
                        {suggestions.techniques.map(t => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => handleQuickSelect('techniqueId', t)}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] border transition-all duration-500 ${
                              formData.techniqueId === t 
                                ? 'bg-accent text-white border-accent shadow-sm' 
                                : 'bg-white border-border-subtle text-text-muted hover:border-accent/40'
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <Textarea 
                  label="Notities"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Hoe was de dril? Wat viel op?"
                  rows={5}
                  className="rounded-[1.5rem] p-6 text-lg"
                />
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
              className="space-y-12"
            >
              <div className="p-12 bg-surface-soft/40 rounded-[3rem] border border-border-subtle text-center relative overflow-hidden shadow-inner">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-accent to-transparent opacity-60" />
                
                <div className="w-28 h-28 bg-success/10 rounded-[2rem] flex items-center justify-center mx-auto mb-10 shadow-inner">
                  <Check className="w-14 h-14 text-success" />
                </div>
                <h3 className="text-4xl font-bold text-primary mb-4 tracking-tight">Klaar om te loggen!</h3>
                <p className="text-xl text-text-secondary mb-12 max-w-md mx-auto font-medium">Controleer je gegevens voordat je de vangst definitief toevoegt aan je dagboek.</p>
                
                <div className="grid grid-cols-2 gap-8 text-left">
                  <div className="p-8 bg-white rounded-[2rem] shadow-sm border border-border-subtle hover:shadow-premium transition-all duration-500">
                    <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.25em] mb-3">Soort</p>
                    <p className="text-2xl font-bold text-primary">{formData.species || 'Onbekend'}</p>
                  </div>
                  <div className="p-8 bg-white rounded-[2rem] shadow-sm border border-border-subtle hover:shadow-premium transition-all duration-500">
                    <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.25em] mb-3">Afmetingen</p>
                    <p className="text-2xl font-bold text-primary">{formData.length}cm • {formData.weight}g</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6 p-8 bg-accent/5 border border-accent/10 rounded-[2rem] shadow-inner">
                <div className="w-14 h-14 bg-accent/10 rounded-2xl flex items-center justify-center shadow-sm">
                  <Zap className="w-7 h-7 text-accent" />
                </div>
                <p className="text-xl font-bold text-primary">Je verdient <span className="text-accent font-black">+45 XP</span> met deze log!</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Actions */}
      <div className="p-12 bg-surface-soft/40 border-t border-border-subtle flex items-center justify-between">
        <Button 
          variant="ghost" 
          onClick={step === 1 ? onCancel : handleBack}
          disabled={loading}
          className="text-text-muted hover:text-primary font-bold text-lg h-14 px-8"
        >
          {step === 1 ? 'Annuleren' : 'Vorige'}
        </Button>
        <div className="flex gap-6">
          {formData.status === 'draft' && step < 4 && (
            <Button 
              variant="secondary" 
              onClick={handleSubmit}
              loading={loading}
              className="rounded-2xl h-14 px-8 font-bold text-lg"
            >
              Concept Opslaan
            </Button>
          )}
          <Button 
            className="px-14 h-18 text-2xl rounded-2xl shadow-premium-accent font-bold transition-all hover:-translate-y-1"
            onClick={step === 4 ? handleSubmit : handleNext}
            loading={loading}
            icon={step === 4 ? <Check className="w-8 h-8" /> : <ChevronRight className="w-8 h-8" />}
          >
            {step === 4 ? 'Vangst Opslaan' : 'Volgende'}
          </Button>
        </div>
      </div>

      {/* Spot Modal */}
      <AnimatePresence>
        {isSpotModalOpen && (
          <SpotModal 
            isOpen={isSpotModalOpen} 
            onClose={() => setIsSpotModalOpen(false)}
            onSuccess={(spotId) => {
              setFormData(prev => ({ ...prev, spotId }));
              fetchData(); // Refresh spots list
            }}
          />
        )}
      </AnimatePresence>
    </Card>
  );
};
