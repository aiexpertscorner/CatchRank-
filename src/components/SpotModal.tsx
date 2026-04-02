import { 
  X, 
  MapPin, 
  Camera,
  Info,
  Save,
  Navigation,
  Anchor,
  Globe,
  Lock,
  ChevronRight,
  ChevronLeft,
  Fish,
  Zap,
  Coffee,
  Car,
  Wind,
  Trash2,
  Plus
} from 'lucide-react';
import { Button, Card, Badge } from './ui/Base';
import { Input, Textarea, Select } from './ui/Inputs';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/firebase';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../App';
import { toast } from 'sonner';
import { Spot } from '../types';
import { cn } from '../lib/utils';

const STEPS = [
  { id: 'basic', title: 'Basis Info', icon: Info },
  { id: 'location', title: 'Locatie & Foto', icon: MapPin },
  { id: 'details', title: 'Visserij Details', icon: Fish }
];

const AMENITIES_OPTIONS = [
  { id: 'parking', label: 'Parkeren', icon: Car },
  { id: 'coffee', label: 'Horeca', icon: Coffee },
  { id: 'accessible', label: 'Toegankelijk', icon: Wind },
  { id: 'shelter', label: 'Schuilplek', icon: Wind }
];

const TECHNIQUES_OPTIONS = [
  'Verticalen', 'Werpend', 'Trollen', 'Dropshot', 'Dood aas', 'Vliegvissen', 'Statisch'
];

const SPECIES_OPTIONS = [
  'Snoekbaars', 'Baars', 'Snoek', 'Karper', 'Brasem', 'Voorn', 'Meerval', 'Forel'
];

export const SpotModal: React.FC<SpotModalProps> = ({ isOpen, onClose, onSuccess, editingSpot }) => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    name: editingSpot?.name || '',
    waterType: editingSpot?.waterType || 'canal',
    waterBodyName: editingSpot?.waterBodyName || '',
    description: editingSpot?.description || '',
    visibility: editingSpot?.visibility || 'private',
    isFavorite: editingSpot?.isFavorite || false,
    mainPhotoURL: editingSpot?.mainPhotoURL || '',
    targetSpecies: editingSpot?.targetSpecies || [] as string[],
    techniques: editingSpot?.techniques || [] as string[],
    amenities: editingSpot?.amenities || [] as string[],
    linkedGearIds: editingSpot?.linkedGearIds || [] as string[],
    linkedSetupIds: editingSpot?.linkedSetupIds || [] as string[],
    coordinates: editingSpot?.coordinates || { lat: 52.3676, lng: 4.9041 }
  });
  const [locationSearch, setLocationSearch] = useState('');
  const [mapZoom, setMapZoom] = useState(13);

  useEffect(() => {
    if (editingSpot) {
      setFormData({
        name: editingSpot.name,
        waterType: editingSpot.waterType || 'canal',
        waterBodyName: editingSpot.waterBodyName || '',
        description: editingSpot.description || '',
        visibility: editingSpot.visibility || 'private',
        isFavorite: editingSpot.isFavorite || false,
        mainPhotoURL: editingSpot.mainPhotoURL || '',
        targetSpecies: editingSpot.targetSpecies || [],
        techniques: editingSpot.techniques || [],
        amenities: editingSpot.amenities || [],
        linkedGearIds: editingSpot.linkedGearIds || [],
        linkedSetupIds: editingSpot.linkedSetupIds || [],
        coordinates: editingSpot.coordinates || { lat: 52.3676, lng: 4.9041 }
      });
    } else {
      setFormData({
        name: '',
        waterType: 'canal',
        waterBodyName: '',
        description: '',
        visibility: 'private',
        isFavorite: false,
        mainPhotoURL: '',
        targetSpecies: [],
        techniques: [],
        amenities: [],
        linkedGearIds: [],
        linkedSetupIds: [],
        coordinates: { lat: 52.3676, lng: 4.9041 }
      });
    }
    setCurrentStep(0);
    setLocationSearch('');
  }, [editingSpot, isOpen]);

  const toggleItem = (field: 'targetSpecies' | 'techniques' | 'amenities' | 'linkedGearIds' | 'linkedSetupIds', value: string) => {
    setFormData(prev => {
      const current = prev[field] as string[];
      const next = current.includes(value) 
        ? current.filter(i => i !== value)
        : [...current, value];
      return { ...prev, [field]: next };
    });
  };

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    
    // Simulated coordinate mapping
    const newLat = 52.3676 + (0.5 - y) * 0.1;
    const newLng = 4.9041 + (x - 0.5) * 0.1;
    
    setFormData({ ...formData, coordinates: { lat: newLat, lng: newLng } });
    toast.info('Locatie bijgewerkt');
  };

  const handleLocationSearch = () => {
    if (!locationSearch.trim()) return;
    toast.success(`Gezocht naar: ${locationSearch}`);
    // Simulate finding a location
    setFormData({ 
      ...formData, 
      coordinates: { lat: 52.3676 + Math.random() * 0.01, lng: 4.9041 + Math.random() * 0.01 },
      waterBodyName: locationSearch
    });
  };

  const nextStep = () => {
    if (currentStep === 0 && !formData.name) {
      toast.error('Naam is verplicht');
      return;
    }
    setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
  };

  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 0));

  const handleSubmit = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const spotData = {
        ...formData,
        authorName: profile.displayName,
        authorPhoto: profile.photoURL || '',
      };

      if (editingSpot?.id) {
        await loggingService.updateSpot(editingSpot.id, spotData);
        toast.success('Stek bijgewerkt!');
      } else {
        const spotId = await loggingService.createSpot(profile.uid, spotData);
        toast.success('Stek toegevoegd!');
        if (onSuccess) onSuccess(spotId);
      }
      onClose();
    } catch (error) {
      console.error('Save spot error:', error);
      toast.error('Fout bij opslaan stek.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const ActiveStepIcon = STEPS[currentStep].icon;

  return (
    <div className="fixed inset-0 z-[140] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
      />
      
      <motion.div
        initial={{ opacity: 0, y: "100%" }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="relative w-full max-w-2xl bg-surface border-t sm:border border-border-subtle rounded-t-[3rem] sm:rounded-[3.5rem] shadow-premium overflow-hidden flex flex-col max-h-[95vh]"
      >
        {/* Header */}
        <div className="p-6 sm:p-10 border-b border-border-subtle flex items-center justify-between bg-gradient-to-r from-surface-soft/50 to-white sticky top-0 z-10">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-accent/10 rounded-2xl sm:rounded-[1.5rem] flex items-center justify-center shadow-inner relative">
              <ActiveStepIcon className="w-6 h-6 sm:w-8 sm:h-8 text-accent" />
              {currentStep === 0 && (
                <button 
                  onClick={() => setFormData({ ...formData, isFavorite: !formData.isFavorite })}
                  className={cn(
                    "absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center border-2 border-white shadow-lg transition-all",
                    formData.isFavorite ? "bg-brand text-bg-main" : "bg-surface-soft text-text-muted"
                  )}
                >
                  <Star className={cn("w-4 h-4", formData.isFavorite && "fill-current")} />
                </button>
              )}
            </div>
            <div>
              <h3 className="text-xl sm:text-3xl font-black text-primary tracking-tight">
                {editingSpot ? 'Stek Bewerken' : 'Nieuwe Stek'}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                {STEPS.map((step, idx) => (
                  <div 
                    key={step.id}
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-500",
                      idx === currentStep ? "w-8 bg-accent" : idx < currentStep ? "w-4 bg-accent/30" : "w-4 bg-border-subtle"
                    )}
                  />
                ))}
                <span className="text-[10px] text-text-muted font-black uppercase tracking-widest ml-2">
                  Stap {currentStep + 1} van 3
                </span>
              </div>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-10 h-10 sm:w-14 sm:h-14 rounded-2xl hover:bg-surface-soft flex items-center justify-center text-text-muted hover:text-primary transition-all hover:rotate-90 duration-300"
          >
            <X className="w-6 h-6 sm:w-9 sm:h-9" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar p-6 sm:p-10">
          <AnimatePresence mode="wait">
            {currentStep === 0 && (
              <motion.div
                key="step-0"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">Naam van de stek</label>
                  <Input 
                    placeholder="Bijv. De Kromme Mijdrecht"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    icon={<Anchor className="w-6 h-6 text-accent" />}
                    className="h-16 rounded-2xl bg-surface-soft/30 border-border-subtle focus:border-accent font-bold text-lg px-6"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">Type Water</label>
                    <Select 
                      value={formData.waterType}
                      onChange={(e) => setFormData({ ...formData, waterType: e.target.value })}
                      options={[
                        { value: 'canal', label: 'Kanaal' },
                        { value: 'lake', label: 'Plas / Meer' },
                        { value: 'river', label: 'Rivier' },
                        { value: 'polder', label: 'Polder' },
                        { value: 'pond', label: 'Vijver' },
                        { value: 'sea', label: 'Zee' }
                      ]}
                      className="h-16 rounded-2xl bg-surface-soft/30 border-border-subtle focus:border-accent font-bold text-lg"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">Zichtbaarheid</label>
                    <Select 
                      value={formData.visibility}
                      onChange={(e) => setFormData({ ...formData, visibility: e.target.value as any })}
                      options={[
                        { value: 'private', label: 'Privé (Alleen ik)' },
                        { value: 'friends', label: 'Vrienden' },
                        { value: 'public', label: 'Openbaar' }
                      ]}
                      className="h-16 rounded-2xl bg-surface-soft/30 border-border-subtle focus:border-accent font-bold text-lg"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">Naam Water (Optioneel)</label>
                  <Input 
                    placeholder="Bijv. Amsterdam-Rijnkanaal"
                    value={formData.waterBodyName}
                    onChange={(e) => setFormData({ ...formData, waterBodyName: e.target.value })}
                    icon={<Navigation className="w-6 h-6 text-accent" />}
                    className="h-16 rounded-2xl bg-surface-soft/30 border-border-subtle focus:border-accent font-bold text-lg px-6"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">Beschrijving / Notities</label>
                  <Textarea 
                    placeholder="Bijv. Goede plek voor snoekbaars bij de brug..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    className="rounded-[2rem] bg-surface-soft/30 border-border-subtle focus:border-accent font-medium text-lg p-6"
                  />
                </div>
              </motion.div>
            )}

            {currentStep === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                {/* Location Search */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">Zoek locatie</label>
                  <div className="flex gap-3">
                    <Input 
                      placeholder="Zoek stad, water of adres..."
                      value={locationSearch}
                      onChange={(e) => setLocationSearch(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleLocationSearch()}
                      className="h-14 rounded-2xl bg-surface-soft/30 border-border-subtle font-bold"
                    />
                    <Button 
                      variant="secondary" 
                      className="h-14 px-6 rounded-2xl"
                      onClick={handleLocationSearch}
                    >
                      Zoek
                    </Button>
                  </div>
                </div>

                {/* Simulated Map Picker */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">Locatie op de kaart</label>
                  <div 
                    className="relative h-72 rounded-[2.5rem] overflow-hidden border-2 border-border-subtle group cursor-crosshair"
                    onClick={handleMapClick}
                  >
                    <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/map-picker/800/600')] bg-cover bg-center grayscale opacity-50 group-hover:grayscale-0 transition-all duration-700" />
                    <div className="absolute inset-0 bg-gradient-to-t from-bg-main/40 to-transparent" />
                    
                    {/* Grid Lines for Map Feel */}
                    <div className="absolute inset-0 opacity-10 pointer-events-none">
                      <div className="w-full h-full grid grid-cols-8 grid-rows-8">
                        {Array.from({ length: 64 }).map((_, i) => (
                          <div key={i} className="border border-white/20" />
                        ))}
                      </div>
                    </div>

                    <div className="absolute inset-0 flex items-center justify-center">
                      <motion.div 
                        animate={{ y: [0, -10, 0] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="relative"
                      >
                        <MapPin className="w-12 h-12 text-accent drop-shadow-[0_0_10px_rgba(244,194,13,0.5)]" />
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-1 bg-black/40 rounded-full blur-[2px]" />
                      </motion.div>
                    </div>
                    <div className="absolute bottom-6 left-6 right-6 flex justify-center">
                      <Badge variant="brand" className="px-4 py-2 rounded-xl backdrop-blur-md bg-accent/80 text-black font-black text-[10px] uppercase tracking-widest shadow-lg">
                        Klik op de kaart om te verplaatsen
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-4">
                    <p className="text-[10px] text-text-muted font-black uppercase tracking-widest">
                      Lat: {formData.coordinates.lat.toFixed(6)}
                    </p>
                    <p className="text-[10px] text-text-muted font-black uppercase tracking-widest">
                      Lng: {formData.coordinates.lng.toFixed(6)}
                    </p>
                  </div>
                </div>

                {/* Photo Upload */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">Hoofdfoto van de stek</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div 
                      className={cn(
                        "aspect-video rounded-[2rem] border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-all cursor-pointer group overflow-hidden relative",
                        formData.mainPhotoURL ? "border-accent/50" : "border-border-subtle hover:border-accent/30 hover:bg-accent/5"
                      )}
                      onClick={() => {
                        const url = prompt('Voer een foto URL in (bijv. van Unsplash of Picsum):');
                        if (url) setFormData({ ...formData, mainPhotoURL: url });
                      }}
                    >
                      {formData.mainPhotoURL ? (
                        <>
                          <img src={formData.mainPhotoURL} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Camera className="w-8 h-8 text-white" />
                          </div>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setFormData({ ...formData, mainPhotoURL: '' }); }}
                            className="absolute top-4 right-4 w-8 h-8 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-danger transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="w-12 h-12 bg-surface-soft rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Camera className="w-6 h-6 text-text-muted" />
                          </div>
                          <span className="text-xs font-bold text-text-muted">Foto toevoegen</span>
                        </>
                      )}
                    </div>
                    <div className="flex flex-col justify-center p-4 space-y-2">
                      <h5 className="text-sm font-black text-primary uppercase tracking-tight">Waarom een foto?</h5>
                      <p className="text-[11px] text-text-secondary leading-relaxed font-medium">
                        Een foto helpt je de stek sneller te herkennen in je lijst en maakt je logboek visueel aantrekkelijker.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                {/* Target Species */}
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">Doelsoorten</label>
                  <div className="flex flex-wrap gap-2">
                    {SPECIES_OPTIONS.map(species => (
                      <button
                        key={species}
                        type="button"
                        onClick={() => toggleItem('targetSpecies', species)}
                        className={cn(
                          "px-5 py-3 rounded-2xl border-2 font-bold text-sm transition-all",
                          formData.targetSpecies.includes(species)
                            ? "bg-brand text-black border-brand shadow-premium-accent"
                            : "bg-surface-soft/30 border-border-subtle text-text-secondary hover:border-brand/30"
                        )}
                      >
                        {species}
                      </button>
                    ))}
                    <button className="px-5 py-3 rounded-2xl border-2 border-dashed border-border-subtle text-text-muted hover:text-brand hover:border-brand/30 transition-all">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Techniques */}
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">Technieken</label>
                  <div className="flex flex-wrap gap-2">
                    {TECHNIQUES_OPTIONS.map(tech => (
                      <button
                        key={tech}
                        type="button"
                        onClick={() => toggleItem('techniques', tech)}
                        className={cn(
                          "px-5 py-3 rounded-2xl border-2 font-bold text-sm transition-all",
                          formData.techniques.includes(tech)
                            ? "bg-accent text-black border-accent shadow-premium-accent"
                            : "bg-surface-soft/30 border-border-subtle text-text-secondary hover:border-accent/30"
                        )}
                      >
                        {tech}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Amenities */}
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">Voorzieningen</label>
                  <div className="grid grid-cols-2 gap-3">
                    {AMENITIES_OPTIONS.map(opt => {
                      const Icon = opt.icon;
                      const isActive = formData.amenities.includes(opt.id);
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => toggleItem('amenities', opt.id)}
                          className={cn(
                            "flex items-center gap-3 p-4 rounded-2xl border-2 transition-all",
                            isActive
                              ? "bg-water/10 border-water text-water"
                              : "bg-surface-soft/30 border-border-subtle text-text-secondary hover:border-water/30"
                          )}
                        >
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center",
                            isActive ? "bg-water text-white" : "bg-surface-soft text-text-muted"
                          )}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <span className="font-bold text-sm">{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Gear & Setups (Mijn Vistas Integration) */}
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">Gekoppelde Gear / Setups</label>
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {['Lichte Baars Setup', 'Snoekbaars Verticalen', 'Sustain FJ 2500', 'Zodias 7\'0" ML'].map(item => {
                        const isActive = formData.linkedSetupIds.includes(item) || formData.linkedGearIds.includes(item);
                        return (
                          <button
                            key={item}
                            type="button"
                            onClick={() => toggleItem(item.includes('Setup') ? 'linkedSetupIds' : 'linkedGearIds', item)}
                            className={cn(
                              "px-4 py-2 rounded-xl border-2 font-bold text-[10px] uppercase tracking-widest transition-all",
                              isActive
                                ? "bg-accent/10 border-accent text-accent"
                                : "bg-surface-soft/30 border-border-subtle text-text-muted hover:border-accent/30"
                            )}
                          >
                            {item}
                          </button>
                        );
                      })}
                      <button className="px-4 py-2 rounded-xl border-2 border-dashed border-border-subtle text-text-muted hover:text-accent hover:border-accent/30 transition-all">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-[9px] text-text-dim italic ml-1">Koppel je favoriete uitrusting aan deze stek voor snellere logs.</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-6 sm:p-10 bg-surface-soft/30 border-t border-border-subtle flex gap-4 sm:gap-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-10">
          {currentStep > 0 ? (
            <Button 
              variant="secondary" 
              className="flex-1 h-16 sm:h-20 rounded-[1.5rem] sm:rounded-[2rem] font-black text-base sm:text-xl" 
              onClick={prevStep}
            >
              <ChevronLeft className="w-6 h-6 mr-2" />
              Vorige
            </Button>
          ) : (
            <Button 
              variant="ghost" 
              className="flex-1 h-16 sm:h-20 rounded-[1.5rem] sm:rounded-[2rem] font-black text-base sm:text-xl text-text-muted" 
              onClick={onClose}
            >
              Annuleren
            </Button>
          )}

          {currentStep < STEPS.length - 1 ? (
            <Button 
              className="flex-[2] h-16 sm:h-20 rounded-[1.5rem] sm:rounded-[2rem] shadow-premium-accent font-black text-base sm:text-xl"
              onClick={nextStep}
            >
              Volgende
              <ChevronRight className="w-6 h-6 ml-2" />
            </Button>
          ) : (
            <Button 
              className="flex-[2] h-16 sm:h-20 rounded-[1.5rem] sm:rounded-[2rem] shadow-premium-accent font-black text-base sm:text-xl"
              onClick={handleSubmit}
              loading={loading}
              icon={<Save className="w-7 h-7 sm:w-9 sm:h-9" />}
            >
              Stek Opslaan
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
};
