import React, { useEffect, useState } from 'react';
import { gearService } from '../features/gear/services/gearService';
import { GearItem, GearSetup } from '../types';
import {
  Fish,
  Ruler,
  Scale,
  MapPin,
  Wind,
  Thermometer,
  Waves,
  Zap,
  Wrench,
  ChevronRight,
  ChevronLeft,
  Check,
  Plus,
  Camera,
  AlertCircle,
  Sparkles,
  X,
  Weight,
  Droplets,
  Navigation,
  Cloud,
  Sun,
  Moon,
  Save,
  Trash2
} from 'lucide-react';
import { Button, Card, Badge } from './ui/Base';
import { ProgressBar } from './ui/Data';
import { Input, Textarea, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Label } from './ui/Inputs';
import { motion, AnimatePresence } from 'motion/react';
import { loggingService } from '../features/logging/services/loggingService';
import { speciesService } from '../features/logging/services/speciesService';
import { weatherService } from '../features/weather/services/weatherService';
import { useAuth } from '../App';
import { Catch, Species, Spot } from '../types';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toast } from 'sonner';
import { SpotModal } from './SpotModal';
import { cn } from '../lib/utils';

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
    weather: {},
    water: {},
    gear: {},
    ...initialData
  });

  const [speciesList, setSpeciesList] = useState<Species[]>([]);
  const [spotsList, setSpotsList] = useState<Spot[]>([]);
  const [userGear, setUserGear] = useState<GearItem[]>([]);
  const [userSetups, setUserSetups] = useState<GearSetup[]>([]);
  const [suggestions, setSuggestions] = useState<{
    species: string[];
    spots: string[];
    baits: string[];
    techniques: string[];
  } | null>(null);

  const fetchData = async () => {
    if (!profile) return;
    
    try {
      // Fetch species
      const species = await speciesService.getAllSpecies();
      setSpeciesList(species);

      // Fetch user spots
      const spotsQuery = query(collection(db, 'spots'), where('userId', '==', profile.uid));
      const spotsSnap = await getDocs(spotsQuery);
      setSpotsList(spotsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Spot)));

      // Fetch user gear + setups for the gear selector in step 4
      const [gear, setups] = await Promise.all([
        gearService.getUserGear(profile.uid),
        gearService.getUserSetups(profile.uid),
      ]);
      setUserGear(gear);
      setUserSetups(setups);

      // Get smart suggestions
      const smartSuggestions = await loggingService.getSmartSuggestions(profile.uid);
      setSuggestions(smartSuggestions);
    } catch (error) {
      console.error('Error fetching form data:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, [profile]);

  // Auto-fetch weather when spot changes
  useEffect(() => {
    if (formData.spotId) {
      const selectedSpot = spotsList.find(s => s.id === formData.spotId);
      if (selectedSpot?.coordinates) {
        fetchWeatherForLocation(selectedSpot.coordinates.lat, selectedSpot.coordinates.lng);
      }
    }
  }, [formData.spotId]);

  const fetchWeatherForLocation = async (lat: number, lng: number) => {
    try {
      const weatherData = await weatherService.fetchWeather(`${lat},${lng}`);
      setFormData(prev => ({
        ...prev,
        weather: {
          temp: weatherData.current.temp_c,
          description: weatherData.current.condition.text,
          icon: weatherData.current.condition.icon,
          windSpeed: weatherData.current.wind_kph,
          windDirection: 0, // Simplified for now
          pressure: weatherData.current.pressure_mb,
          humidity: weatherData.current.humidity,
          uvIndex: weatherData.current.uv,
        }
      }));
      toast.info('Weergegevens automatisch opgehaald');
    } catch (error) {
      console.error('Weather fetch error:', error);
    }
  };

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

  const handleSubmit = async (isDraft = false) => {
    if (!profile) return;
    setLoading(true);
    try {
      const finalStatus = isDraft ? 'draft' : 'complete';
      const finalData = { ...formData, status: finalStatus };
      
      let catchId = formData.id;
      if (catchId) {
        await loggingService.updateCatch(catchId, finalData);
      } else {
        catchId = await loggingService.createCatch(profile.uid, finalData);
      }

      if (activeSessionId && catchId) {
        await loggingService.linkCatchToSession(catchId, activeSessionId, formData.spotId);
      }

      // Link Mijn Visgear items to this catch (fire-and-forget, non-blocking)
      if (catchId && finalStatus === 'complete') {
        const gearIdsToLink = [
          formData.gear?.rodId,
          formData.gear?.reelId,
          formData.gear?.lineId,
          formData.gear?.lureId,
        ].filter((id): id is string => Boolean(id) && userGear.some(g => g.id === id));

        if (gearIdsToLink.length > 0) {
          gearService.linkGearToCatch(
            gearIdsToLink,
            catchId,
            formData.gear?.setupId || undefined
          ).catch(e => console.warn('gear link failed', e));
        }
      }

      const xp = loggingService.calculateXP(finalData);
      
      toast.success(isDraft ? 'Concept opgeslagen!' : 'Vangst succesvol gelogd!', {
        description: isDraft ? 'Je kunt deze later afmaken.' : `Je hebt +${xp} XP verdiend.`
      });
      onComplete(catchId);
    } catch (error) {
      console.error('Catch logging error:', error);
      toast.error('Fout bij het opslaan van de vangst.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSelect = (field: keyof Catch, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const steps = [
    { title: 'De Vis', icon: Fish },
    { title: 'Maten', icon: Scale },
    { title: 'Details', icon: MapPin },
    { title: 'Omgeving', icon: Cloud },
    { title: 'Review', icon: Check }
  ];

  const progress = (step / steps.length) * 100;

  return (
    <Card variant="premium" className="w-full max-w-2xl mx-auto overflow-hidden border-none shadow-premium rounded-[2rem] md:rounded-[3rem] bg-surface-card flex flex-col max-h-[90vh]">
      {/* Stepper Header */}
      <div className="bg-surface-soft/40 border-b border-border-subtle p-6 md:p-8 flex-shrink-0">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-brand/10 rounded-xl flex items-center justify-center">
              <Fish className="w-6 h-6 text-brand" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold tracking-tight text-text-primary">Vangst Loggen</h2>
              <p className="text-xs md:text-sm text-text-muted font-medium">Stap {step} van {steps.length}: {steps[step-1].title}</p>
            </div>
          </div>
          <button onClick={onCancel} className="p-2 text-text-muted hover:text-text-primary transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="relative h-1.5 w-full bg-surface-soft rounded-full overflow-hidden">
          <motion.div 
            className="absolute top-0 left-0 h-full bg-brand shadow-[0_0_10px_rgba(244,194,13,0.4)]"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="space-y-6">
                <div className="space-y-4">
                  <Label>Welke vis heb je gevangen?</Label>
                  <div className="grid grid-cols-1 gap-4">
                    <Select 
                      value={formData.species} 
                      onValueChange={(val) => setFormData({ ...formData, species: val })}
                    >
                      <SelectTrigger className="h-14 rounded-2xl bg-bg-main border-border-subtle">
                        <SelectValue placeholder="Kies een vissoort..." />
                      </SelectTrigger>
                      <SelectContent>
                        {speciesList.map(s => (
                          <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input 
                      placeholder="Of typ handmatig..."
                      value={formData.species}
                      onChange={(e) => setFormData({ ...formData, species: e.target.value })}
                      className="h-14 rounded-2xl bg-bg-main border-border-subtle"
                    />
                  </div>
                </div>

                {suggestions && suggestions.species.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] flex items-center gap-2">
                      <Sparkles className="w-3 h-3 text-brand" /> Veel gevangen
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {suggestions.species.map(s => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => handleQuickSelect('species', s)}
                          className={cn(
                            "px-4 py-2 rounded-xl text-xs font-bold border transition-all",
                            formData.species === s 
                              ? 'bg-brand text-bg-main border-brand shadow-premium-accent' 
                              : 'bg-surface-soft border-border-subtle text-text-secondary hover:border-brand/40'
                          )}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <Label>Foto van je vangst</Label>
                <div className="aspect-video w-full bg-surface-soft/30 border-2 border-dashed border-border-subtle rounded-3xl flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-brand/40 hover:bg-brand/5 transition-all overflow-hidden relative group">
                  {formData.photoURL ? (
                    <>
                      <img src={formData.photoURL} alt="Vangst" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                        <Button variant="secondary" size="sm" icon={<Camera className="w-4 h-4" />}>Wijzigen</Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 bg-surface-card rounded-2xl shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Camera className="w-8 h-8 text-brand" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold text-text-primary">Foto toevoegen</p>
                        <p className="text-xs text-text-muted mt-1">Klik om een foto te kiezen</p>
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
              className="space-y-8"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Scale className="w-4 h-4 text-brand" /> Gewicht (gram)
                  </Label>
                  <Input 
                    type="number"
                    value={formData.weight || ''}
                    onChange={(e) => setFormData({ ...formData, weight: Number(e.target.value) })}
                    placeholder="Bijv. 1250"
                    className="text-2xl font-bold h-16 bg-bg-main border-border-subtle focus:border-brand rounded-2xl px-6"
                  />
                </div>
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Ruler className="w-4 h-4 text-brand" /> Lengte (cm)
                  </Label>
                  <Input 
                    type="number"
                    value={formData.length || ''}
                    onChange={(e) => setFormData({ ...formData, length: Number(e.target.value) })}
                    placeholder="Bijv. 45"
                    className="text-2xl font-bold h-16 bg-bg-main border-border-subtle focus:border-brand rounded-2xl px-6"
                  />
                </div>
              </div>

              <div className="p-6 bg-brand/5 border border-brand/10 rounded-3xl flex items-center gap-6">
                <div className="w-12 h-12 bg-brand/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Zap className="w-6 h-6 text-brand" />
                </div>
                <div>
                  <p className="text-sm font-bold text-text-primary">XP Schatting</p>
                  <p className="text-xs text-text-secondary mt-0.5">Je verdient ongeveer <span className="text-brand font-black">+35 XP</span> met deze vangst.</p>
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
              className="space-y-8"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <Label>Visstek</Label>
                  <button 
                    onClick={() => setIsSpotModalOpen(true)}
                    className="text-[10px] font-black text-brand uppercase tracking-widest flex items-center gap-1 hover:opacity-80"
                  >
                    <Plus className="w-3 h-3" /> Nieuwe Stek
                  </button>
                </div>
                <Select 
                  value={formData.spotId} 
                  onValueChange={(val) => setFormData({ ...formData, spotId: val })}
                >
                  <SelectTrigger className="h-14 rounded-2xl bg-bg-main border-border-subtle">
                    <SelectValue placeholder="Kies een stek..." />
                  </SelectTrigger>
                  <SelectContent>
                    {spotsList.map(s => (
                      <SelectItem key={s.id} value={s.id!}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input 
                    label="Aas"
                    value={formData.baitId}
                    onChange={(e) => setFormData({ ...formData, baitId: e.target.value })}
                    placeholder="Bijv. Shads 10cm"
                    className="h-14 rounded-2xl bg-bg-main border-border-subtle"
                  />
                  <Input 
                    label="Techniek"
                    value={formData.techniqueId}
                    onChange={(e) => setFormData({ ...formData, techniqueId: e.target.value })}
                    placeholder="Bijv. Verticalen"
                    className="h-14 rounded-2xl bg-bg-main border-border-subtle"
                  />
                </div>

                <Textarea 
                  label="Notities"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Hoe was de dril? Wat viel op?"
                  className="rounded-2xl bg-bg-main border-border-subtle p-4"
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
              className="space-y-8"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <Label className="flex items-center gap-2">
                    <Cloud className="w-4 h-4 text-brand" /> Weergegevens
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 bg-surface-soft rounded-2xl border border-border-subtle">
                      <p className="text-[8px] font-black text-text-muted uppercase tracking-widest mb-1">Temp</p>
                      <p className="text-sm font-bold text-text-primary">{formData.weather?.temp ? `${formData.weather.temp}°C` : '--'}</p>
                    </div>
                    <div className="p-4 bg-surface-soft rounded-2xl border border-border-subtle">
                      <p className="text-[8px] font-black text-text-muted uppercase tracking-widest mb-1">Wind</p>
                      <p className="text-sm font-bold text-text-primary">{formData.weather?.windSpeed ? `${formData.weather.windSpeed} km/h` : '--'}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="flex items-center gap-2">
                    <Droplets className="w-4 h-4 text-brand" /> Watercondities
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    <Select 
                      value={formData.water?.clarity} 
                      onValueChange={(val) => setFormData({ ...formData, water: { ...formData.water, clarity: val as any } })}
                    >
                      <SelectTrigger className="h-12 rounded-xl bg-surface-soft border-border-subtle text-xs">
                        <SelectValue placeholder="Helderheid" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="clear">Helder</SelectItem>
                        <SelectItem value="murky">Troebel</SelectItem>
                        <SelectItem value="stained">Gekleurd</SelectItem>
                        <SelectItem value="very_murky">Erg troebel</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input 
                      type="number"
                      placeholder="Diepte (m)"
                      value={formData.water?.depth || ''}
                      onChange={(e) => setFormData({ ...formData, water: { ...formData.water, depth: Number(e.target.value) } })}
                      className="h-12 rounded-xl bg-surface-soft border-border-subtle text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <Label className="flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-brand" /> Visgear (optioneel)
                </Label>

                {userSetups.length > 0 ? (
                  // Has setups: show setup selector as primary option
                  <div className="space-y-2">
                    <Select
                      value={formData.gear?.setupId || ''}
                      onValueChange={(val) => {
                        if (!val) {
                          setFormData(prev => ({ ...prev, gear: { ...prev.gear, setupId: '' } }));
                          return;
                        }
                        const setup = userSetups.find(s => s.id === val);
                        if (setup) {
                          setFormData(prev => ({
                            ...prev,
                            gear: {
                              setupId: setup.id,
                              rodId: setup.rodId || '',
                              reelId: setup.reelId || '',
                              lineId: setup.lineId || '',
                              lureId: setup.lureId || '',
                            }
                          }));
                        }
                      }}
                    >
                      <SelectTrigger className="h-14 rounded-2xl bg-bg-main border-border-subtle">
                        <SelectValue placeholder="Kies een setup uit Mijn Visgear..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">— Geen setup —</SelectItem>
                        {userSetups.map(s => (
                          <SelectItem key={s.id} value={s.id!}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formData.gear?.setupId && (() => {
                      const setup = userSetups.find(s => s.id === formData.gear?.setupId);
                      const parts = [
                        setup?.rodId && userGear.find(g => g.id === setup.rodId),
                        setup?.reelId && userGear.find(g => g.id === setup.reelId),
                        setup?.lureId && userGear.find(g => g.id === setup.lureId),
                      ].filter(Boolean).map((g: any) => `${g.brand} ${g.name}`);
                      return parts.length > 0 ? (
                        <p className="text-[11px] text-text-muted px-1">{parts.join(' · ')}</p>
                      ) : null;
                    })()}
                  </div>
                ) : userGear.length > 0 ? (
                  // Has gear but no setups: show individual pickers
                  <div className="grid grid-cols-2 gap-3">
                    <Select
                      value={formData.gear?.rodId || ''}
                      onValueChange={(val) => setFormData(prev => ({ ...prev, gear: { ...prev.gear, rodId: val } }))}
                    >
                      <SelectTrigger className="h-12 rounded-xl bg-surface-soft border-border-subtle text-xs">
                        <SelectValue placeholder="Hengel" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">— Geen —</SelectItem>
                        {userGear.filter(g => g.category === 'rod').map(g => (
                          <SelectItem key={g.id} value={g.id!}>{g.brand} {g.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={formData.gear?.reelId || ''}
                      onValueChange={(val) => setFormData(prev => ({ ...prev, gear: { ...prev.gear, reelId: val } }))}
                    >
                      <SelectTrigger className="h-12 rounded-xl bg-surface-soft border-border-subtle text-xs">
                        <SelectValue placeholder="Molen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">— Geen —</SelectItem>
                        {userGear.filter(g => g.category === 'reel').map(g => (
                          <SelectItem key={g.id} value={g.id!}>{g.brand} {g.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={formData.gear?.lureId || ''}
                      onValueChange={(val) => setFormData(prev => ({ ...prev, gear: { ...prev.gear, lureId: val } }))}
                    >
                      <SelectTrigger className="h-12 rounded-xl bg-surface-soft border-border-subtle text-xs col-span-2">
                        <SelectValue placeholder="Kunstaas / Aas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">— Geen —</SelectItem>
                        {userGear.filter(g => g.category === 'lure' || g.category === 'bait').map(g => (
                          <SelectItem key={g.id} value={g.id!}>{g.brand} {g.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  // No gear at all: hint to add gear first
                  <div className="p-4 bg-surface-soft/50 border border-border-subtle rounded-2xl flex items-center gap-3">
                    <Wrench className="w-4 h-4 text-text-muted flex-shrink-0" />
                    <p className="text-xs text-text-muted">
                      Nog geen gear in{' '}
                      <span className="text-brand font-semibold">Mijn Visgear</span>.
                      Voeg gear toe om het hier te koppelen.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {step === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="p-8 bg-surface-soft/40 rounded-3xl border border-border-subtle text-center">
                <div className="w-20 h-20 bg-success/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Check className="w-10 h-10 text-success" />
                </div>
                <h3 className="text-2xl font-bold text-text-primary mb-2">Klaar om te loggen!</h3>
                <p className="text-sm text-text-secondary mb-8">Controleer je gegevens voordat je de vangst opslaat.</p>
                
                <div className="grid grid-cols-2 gap-4 text-left">
                  <div className="p-4 bg-bg-main rounded-2xl border border-border-subtle">
                    <p className="text-[8px] font-black text-text-muted uppercase tracking-widest mb-1">Vissoort</p>
                    <p className="text-sm font-bold text-text-primary truncate">{formData.species || 'Onbekend'}</p>
                  </div>
                  <div className="p-4 bg-bg-main rounded-2xl border border-border-subtle">
                    <p className="text-[8px] font-black text-text-muted uppercase tracking-widest mb-1">Maten</p>
                    <p className="text-sm font-bold text-text-primary">{formData.length || '--'}cm • {formData.weight || '--'}g</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 p-6 bg-brand/5 border border-brand/10 rounded-3xl">
                <div className="w-10 h-10 bg-brand/10 rounded-xl flex items-center justify-center">
                  <Zap className="w-5 h-5 text-brand" />
                </div>
                <p className="text-sm font-bold text-text-primary">Je verdient <span className="text-brand font-black">+{loggingService.calculateXP(formData)} XP</span>!</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Actions */}
      <div className="p-6 md:p-8 bg-surface-soft/40 border-t border-border-subtle flex items-center justify-between flex-shrink-0">
        <Button 
          variant="ghost" 
          onClick={step === 1 ? onCancel : handleBack}
          disabled={loading}
          className="text-text-muted hover:text-text-primary font-bold"
        >
          {step === 1 ? 'Annuleren' : 'Vorige'}
        </Button>
        <div className="flex gap-3">
          {step < steps.length && (
            <Button 
              variant="secondary" 
              onClick={() => handleSubmit(true)}
              isLoading={loading}
              className="rounded-xl px-4"
              icon={<Save className="w-4 h-4" />}
            >
              Concept
            </Button>
          )}
          <Button 
            className="px-8 h-14 rounded-xl shadow-premium-accent font-bold"
            onClick={step === steps.length ? () => handleSubmit(false) : handleNext}
            isLoading={loading}
            icon={step === steps.length ? <Check className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          >
            {step === steps.length ? 'Opslaan' : 'Volgende'}
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
              fetchData();
            }}
          />
        )}
      </AnimatePresence>
    </Card>
  );
};
