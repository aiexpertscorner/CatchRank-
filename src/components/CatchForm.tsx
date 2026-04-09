import React, { useEffect, useRef, useState } from 'react';
import { gearService } from '../features/gear/services/gearService';
import { GearItem, GearSetup } from '../types';
import {
  Fish,
  Ruler,
  Scale,
  MapPin,
  Zap,
  Wrench,
  ChevronRight,
  Check,
  Plus,
  Camera,
  Sparkles,
  X,
  Droplets,
  Cloud,
  Save,
  Clock,
  Loader2,
  Moon,
  Lock,
} from 'lucide-react';
import { Button, Card } from './ui/Base';
import {
  Input,
  Textarea,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Label,
} from './ui/Inputs';
import { motion, AnimatePresence } from 'motion/react';
import { loggingService } from '../features/logging/services/loggingService';
import { speciesService } from '../features/logging/services/speciesService';
import { weatherService } from '../features/weather/services/weatherService';
import { uploadPhoto, deletePhoto, isBase64Image } from '../lib/storageUtils';
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

const SPOTS_COLLECTION = 'spots_v2';

const getSpotName = (spot?: Partial<Spot> | null) =>
  (spot as any)?.title || (spot as any)?.name || 'Onbekende stek';

const getSpotLat = (spot?: Partial<Spot> | null) =>
  (spot as any)?.lat ?? (spot as any)?.latitude ?? (spot as any)?.coordinates?.lat;

const getSpotLng = (spot?: Partial<Spot> | null) =>
  (spot as any)?.lng ?? (spot as any)?.longitude ?? (spot as any)?.coordinates?.lng;

const getCatchImage = (data: Partial<Catch>) =>
  (data as any).mainImage || (data as any).photoURL || '';

export const CatchForm: React.FC<CatchFormProps> = ({
  initialData = {},
  activeSessionId,
  onComplete,
  onCancel,
}) => {
  const { profile } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isSpotModalOpen, setIsSpotModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Photo state — preview uses object URL (not base64), file stored for upload
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const photoPreviewUrlRef = useRef<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stable catch ID generated once per form session — used as Storage entity ID
  const [tempCatchId] = useState<string>(() => (initialData as any).id || crypto.randomUUID());

  // Track whether mainImage was uploaded in this session (so we can clean up on cancel)
  const uploadedThisSession = useRef(false);

  const [formData, setFormData] = useState<Partial<Catch> & Record<string, any>>({
    speciesGeneral: (initialData as any).speciesGeneral || (initialData as any).species || '',
    speciesSpecific: (initialData as any).speciesSpecific || '',
    weight: undefined,
    length: undefined,
    catchTime: '',
    spotId: '',
    baitGeneral: (initialData as any).baitGeneral || (initialData as any).bait || '',
    baitSpecific: (initialData as any).baitSpecific || '',
    technique: (initialData as any).technique || '',
    notes: '',
    moonPhase: '',
    status: 'complete',
    isPrivate: false,
    weather: {},
    water: {},
    gear: {},
    ...initialData,
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

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (photoPreviewUrlRef.current) {
        URL.revokeObjectURL(photoPreviewUrlRef.current);
      }
    };
  }, []);

  const fetchData = async () => {
    if (!profile?.uid) return;

    try {
      const species = await speciesService.getAllSpecies();
      setSpeciesList(species);

      const spotsQuery = query(
        collection(db, SPOTS_COLLECTION),
        where('userId', '==', profile.uid)
      );
      const spotsSnap = await getDocs(spotsQuery);
      setSpotsList(spotsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Spot)));

      const [gear, setups] = await Promise.all([
        gearService.getUserGear(profile.uid),
        gearService.getUserSetups(profile.uid),
      ]);
      setUserGear(gear);
      setUserSetups(setups);

      const smartSuggestions = await loggingService.getSmartSuggestions(profile.uid);
      setSuggestions(smartSuggestions);
    } catch (error) {
      console.error('Error fetching form data:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, [profile?.uid]);

  useEffect(() => {
    if (!formData.spotId) return;

    const selectedSpot = spotsList.find((s) => s.id === formData.spotId);
    const lat = getSpotLat(selectedSpot);
    const lng = getSpotLng(selectedSpot);

    if (lat != null && lng != null) {
      fetchWeatherForLocation(lat, lng);
    }
  }, [formData.spotId, spotsList]);

  const fetchWeatherForLocation = async (lat: number, lng: number) => {
    try {
      const weatherData = await weatherService.fetchWeather(`${lat},${lng}`);
      setFormData((prev) => ({
        ...prev,
        weather: {
          temp: weatherData.current.temp_c,
          description: weatherData.current.condition.text,
          icon: weatherData.current.condition.icon,
          windSpeed: weatherData.current.wind_kph,
          windDirection: 0,
          pressure: weatherData.current.pressure_mb,
          humidity: weatherData.current.humidity,
          uvIndex: weatherData.current.uv,
        },
      }));
      toast.info('Weergegevens automatisch opgehaald');
    } catch (error) {
      console.error('Weather fetch error:', error);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile?.uid) return;

    // Revoke old preview URL
    if (photoPreviewUrlRef.current) {
      URL.revokeObjectURL(photoPreviewUrlRef.current);
    }

    const previewUrl = URL.createObjectURL(file);
    photoPreviewUrlRef.current = previewUrl;
    setPhotoPreview(previewUrl);
    setPhotoFile(file);

    // Upload to Storage immediately for best UX — user sees preview right away
    setIsUploading(true);
    try {
      const url = await uploadPhoto(profile.uid, 'catches', tempCatchId, file, 'main');
      uploadedThisSession.current = true;
      setFormData((prev) => ({ ...prev, mainImage: url, photoURL: url }));
    } catch (err) {
      console.error('Photo upload failed:', err);
      toast.error('Foto upload mislukt. Probeer opnieuw.');
      setPhotoFile(null);
      setPhotoPreview('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } finally {
      setIsUploading(false);
    }
  };

  const handleNext = () => setStep((s) => s + 1);
  const handleBack = () => setStep((s) => s - 1);

  const handleSubmit = async (isDraft = false) => {
    if (!profile?.uid) return;

    setLoading(true);
    try {
      const finalStatus = isDraft ? 'draft' : 'complete';
      const selectedSpot = spotsList.find((s) => s.id === formData.spotId);

      const finalData: Partial<Catch> & Record<string, any> = {
        ...formData,
        id: tempCatchId,
        status: finalStatus,

        // v2-primary fields
        speciesGeneral: formData.speciesGeneral || formData.species || '',
        speciesSpecific: formData.speciesSpecific || '',
        baitGeneral: formData.baitGeneral || '',
        baitSpecific: formData.baitSpecific || '',
        technique: formData.technique || '',
        mainImage: getCatchImage(formData),
        spotName: selectedSpot ? getSpotName(selectedSpot) : formData.spotName,
        latitude: selectedSpot ? getSpotLat(selectedSpot) : formData.latitude,
        longitude: selectedSpot ? getSpotLng(selectedSpot) : formData.longitude,

        // legacy compat
        species: formData.speciesGeneral || formData.species || '',
        bait: formData.baitSpecific || formData.baitGeneral || '',
        photoURL: getCatchImage(formData),
        location:
          selectedSpot && getSpotLat(selectedSpot) != null && getSpotLng(selectedSpot) != null
            ? { lat: Number(getSpotLat(selectedSpot)), lng: Number(getSpotLng(selectedSpot)) }
            : formData.location,
      };

      let catchId = (initialData as any).id;
      if (catchId) {
        await loggingService.updateCatch(catchId, finalData);
      } else {
        catchId = await loggingService.createCatch(profile.uid, finalData);
      }

      if (activeSessionId && catchId) {
        await loggingService.linkCatchToSession(catchId, activeSessionId, formData.spotId);
      }

      if (catchId && finalStatus === 'complete') {
        const gearIdsToLink = [
          formData.gear?.rodId,
          formData.gear?.reelId,
          formData.gear?.lineId,
          formData.gear?.lureId,
        ].filter((id): id is string => Boolean(id) && userGear.some((g) => g.id === id));

        if (gearIdsToLink.length > 0) {
          gearService
            .linkGearToCatch(gearIdsToLink, catchId, formData.gear?.setupId || undefined)
            .catch((e) => console.warn('gear link failed', e));
        }
      }

      uploadedThisSession.current = false; // photo is now part of a saved catch — don't clean up

      const xp = loggingService.calculateXP(finalData);
      toast.success(isDraft ? 'Concept opgeslagen!' : 'Vangst succesvol gelogd!', {
        description: isDraft ? 'Je kunt deze later afmaken.' : `Je hebt +${xp} XP verdiend.`,
      });

      onComplete(catchId);
    } catch (error) {
      console.error('Catch logging error:', error);
      toast.error('Fout bij het opslaan van de vangst.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    // Clean up orphaned Storage photo if one was uploaded during this session
    if (uploadedThisSession.current && formData.mainImage && !isBase64Image(formData.mainImage)) {
      deletePhoto(formData.mainImage).catch(() => {});
    }
    onCancel();
  };

  const handleQuickSelect = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const steps = [
    { title: 'De Vis', icon: Fish },
    { title: 'Maten', icon: Scale },
    { title: 'Details', icon: MapPin },
    { title: 'Omgeving', icon: Cloud },
    { title: 'Review', icon: Check },
  ];

  const progress = (step / steps.length) * 100;
  const currentMainImage = photoPreview || getCatchImage(formData);

  return (
    <Card
      variant="premium"
      className="w-full max-w-2xl mx-auto overflow-hidden border-none shadow-premium rounded-[2rem] md:rounded-[3rem] bg-surface-card flex flex-col max-h-[90vh]"
    >
      {/* Stepper Header */}
      <div className="bg-surface-soft/40 border-b border-border-subtle p-6 md:p-8 flex-shrink-0">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-brand/10 rounded-xl flex items-center justify-center">
              <Fish className="w-6 h-6 text-brand" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold tracking-tight text-text-primary">
                Vangst Loggen
              </h2>
              <p className="text-xs md:text-sm text-text-muted font-medium">
                Stap {step} van {steps.length}: {steps[step - 1].title}
              </p>
            </div>
          </div>
          <button
            onClick={handleCancel}
            className="p-2 text-text-muted hover:text-text-primary transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="relative h-1.5 w-full bg-surface-soft rounded-full overflow-hidden">
          <motion.div
            className="absolute top-0 left-0 h-full bg-brand shadow-[0_0_10px_rgba(244,194,13,0.4)]"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
        <AnimatePresence mode="wait">

          {/* ──────────────────────────────────────── STEP 1 — De Vis */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              {/* Species */}
              <div className="space-y-6">
                <div className="space-y-4">
                  <Label>Welke vis heb je gevangen?</Label>
                  <div className="grid grid-cols-1 gap-4">
                    <Select
                      value={formData.speciesGeneral}
                      onValueChange={(val) =>
                        setFormData({ ...formData, speciesGeneral: val, species: val })
                      }
                    >
                      <SelectTrigger className="h-14 rounded-2xl bg-bg-main border-border-subtle">
                        <SelectValue placeholder="Kies een vissoort..." />
                      </SelectTrigger>
                      <SelectContent>
                        {speciesList.map((s) => (
                          <SelectItem key={s.id} value={s.name}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Input
                      placeholder="Of typ handmatig..."
                      value={formData.speciesGeneral}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          speciesGeneral: e.target.value,
                          species: e.target.value,
                        })
                      }
                      className="h-14 rounded-2xl bg-bg-main border-border-subtle"
                    />

                    <Input
                      placeholder="Variant / Subsoort (optioneel)"
                      value={formData.speciesSpecific}
                      onChange={(e) =>
                        setFormData({ ...formData, speciesSpecific: e.target.value })
                      }
                      className="h-12 rounded-2xl bg-bg-main border-border-subtle text-sm"
                    />
                  </div>
                </div>

                {suggestions && suggestions.species.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] flex items-center gap-2">
                      <Sparkles className="w-3 h-3 text-brand" /> Veel gevangen
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {suggestions.species.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => handleQuickSelect('speciesGeneral', s)}
                          className={cn(
                            'px-4 py-2 rounded-xl text-xs font-bold border transition-all',
                            formData.speciesGeneral === s
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

              {/* Photo */}
              <div className="space-y-4">
                <Label>Foto van je vangst</Label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-video w-full bg-surface-soft/30 border-2 border-dashed border-border-subtle rounded-3xl flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-brand/40 hover:bg-brand/5 transition-all overflow-hidden relative group"
                >
                  {isUploading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10 rounded-3xl">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-8 h-8 text-brand animate-spin" />
                        <p className="text-xs font-bold text-white">Uploaden...</p>
                      </div>
                    </div>
                  )}
                  {currentMainImage ? (
                    <>
                      <img
                        src={currentMainImage}
                        alt="Vangst"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={<Camera className="w-4 h-4" />}
                        >
                          Wijzigen
                        </Button>
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
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                />
              </div>

              {/* Privacy toggle */}
              <button
                type="button"
                onClick={() =>
                  setFormData((prev) => ({ ...prev, isPrivate: !prev.isPrivate }))
                }
                className={cn(
                  'w-full flex items-center justify-between p-4 rounded-2xl border transition-all',
                  formData.isPrivate
                    ? 'bg-surface-soft border-brand/30 text-brand'
                    : 'bg-surface-soft/30 border-border-subtle text-text-muted'
                )}
              >
                <div className="flex items-center gap-3">
                  <Lock className="w-4 h-4" />
                  <span className="text-sm font-bold">
                    {formData.isPrivate ? 'Privé vangst' : 'Openbaar (voor vrienden)'}
                  </span>
                </div>
                <div
                  className={cn(
                    'w-10 h-5 rounded-full relative transition-all',
                    formData.isPrivate ? 'bg-brand' : 'bg-surface-soft border border-border-subtle'
                  )}
                >
                  <div
                    className={cn(
                      'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
                      formData.isPrivate ? 'translate-x-5' : 'translate-x-0.5'
                    )}
                  />
                </div>
              </button>
            </motion.div>
          )}

          {/* ──────────────────────────────────────── STEP 2 — Maten */}
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
                    onChange={(e) =>
                      setFormData({ ...formData, weight: Number(e.target.value) || undefined })
                    }
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
                    onChange={(e) =>
                      setFormData({ ...formData, length: Number(e.target.value) || undefined })
                    }
                    placeholder="Bijv. 45"
                    className="text-2xl font-bold h-16 bg-bg-main border-border-subtle focus:border-brand rounded-2xl px-6"
                  />
                </div>
              </div>

              {/* Catch time */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-brand" /> Vangst tijd (optioneel)
                </Label>
                <Input
                  type="time"
                  value={typeof formData.catchTime === 'string' ? formData.catchTime : ''}
                  onChange={(e) =>
                    setFormData({ ...formData, catchTime: e.target.value })
                  }
                  className="h-14 rounded-2xl bg-bg-main border-border-subtle text-lg font-bold"
                />
              </div>

              <div className="p-6 bg-brand/5 border border-brand/10 rounded-3xl flex items-center gap-6">
                <div className="w-12 h-12 bg-brand/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Zap className="w-6 h-6 text-brand" />
                </div>
                <div>
                  <p className="text-sm font-bold text-text-primary">XP Schatting</p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Je verdient ongeveer{' '}
                    <span className="text-brand font-black">
                      +{loggingService.calculateXP(formData)} XP
                    </span>{' '}
                    met deze vangst.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* ──────────────────────────────────────── STEP 3 — Details */}
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
                    {spotsList.map((s) => (
                      <SelectItem key={s.id} value={s.id!}>
                        {getSpotName(s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    label="Aastype"
                    value={formData.baitGeneral}
                    onChange={(e) =>
                      setFormData({ ...formData, baitGeneral: e.target.value })
                    }
                    placeholder="Bijv. Kunstaas"
                    className="h-14 rounded-2xl bg-bg-main border-border-subtle"
                  />
                  <Input
                    label="Aas specifiek"
                    value={formData.baitSpecific}
                    onChange={(e) =>
                      setFormData({ ...formData, baitSpecific: e.target.value })
                    }
                    placeholder="Bijv. Shad 10cm, Roze"
                    className="h-14 rounded-2xl bg-bg-main border-border-subtle"
                  />
                </div>

                <Input
                  label="Techniek"
                  value={formData.technique}
                  onChange={(e) => setFormData({ ...formData, technique: e.target.value })}
                  placeholder="Bijv. Verticalen, Werpend"
                  className="h-14 rounded-2xl bg-bg-main border-border-subtle"
                />

                <Textarea
                  label="Notities"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Hoe was de dril? Wat viel op?"
                  className="rounded-2xl bg-bg-main border-border-subtle p-4"
                />

                {/* Session link info */}
                {activeSessionId && (
                  <div className="flex items-center gap-3 p-4 bg-brand/5 border border-brand/10 rounded-2xl">
                    <Zap className="w-4 h-4 text-brand flex-shrink-0" />
                    <p className="text-xs font-bold text-brand">
                      Wordt gekoppeld aan actieve sessie
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ──────────────────────────────────────── STEP 4 — Omgeving */}
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
                      <p className="text-[8px] font-black text-text-muted uppercase tracking-widest mb-1">
                        Temp
                      </p>
                      <p className="text-sm font-bold text-text-primary">
                        {formData.weather?.temp ? `${formData.weather.temp}°C` : '--'}
                      </p>
                    </div>
                    <div className="p-4 bg-surface-soft rounded-2xl border border-border-subtle">
                      <p className="text-[8px] font-black text-text-muted uppercase tracking-widest mb-1">
                        Wind
                      </p>
                      <p className="text-sm font-bold text-text-primary">
                        {formData.weather?.windSpeed
                          ? `${formData.weather.windSpeed} km/h`
                          : '--'}
                      </p>
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
                      onValueChange={(val) =>
                        setFormData({
                          ...formData,
                          water: { ...formData.water, clarity: val as any },
                        })
                      }
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
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          water: { ...formData.water, depth: Number(e.target.value) || undefined },
                        })
                      }
                      className="h-12 rounded-xl bg-surface-soft border-border-subtle text-xs"
                    />
                  </div>

                  <Select
                    value={formData.water?.flow}
                    onValueChange={(val) =>
                      setFormData({
                        ...formData,
                        water: { ...formData.water, flow: val as any },
                      })
                    }
                  >
                    <SelectTrigger className="h-12 rounded-xl bg-surface-soft border-border-subtle text-xs">
                      <SelectValue placeholder="Stroming" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Geen</SelectItem>
                      <SelectItem value="slow">Langzaam</SelectItem>
                      <SelectItem value="medium">Matig</SelectItem>
                      <SelectItem value="fast">Snel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Moon phase */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Moon className="w-4 h-4 text-brand" /> Maanfase (optioneel)
                </Label>
                <Select
                  value={typeof formData.moonPhase === 'string' ? formData.moonPhase : ''}
                  onValueChange={(val) => setFormData({ ...formData, moonPhase: val })}
                >
                  <SelectTrigger className="h-12 rounded-xl bg-bg-main border-border-subtle">
                    <SelectValue placeholder="Kies maanfase..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">— Onbekend —</SelectItem>
                    <SelectItem value="new">Nieuwe maan</SelectItem>
                    <SelectItem value="crescent">Wassende maan</SelectItem>
                    <SelectItem value="half">Halve maan</SelectItem>
                    <SelectItem value="gibbous">Bijna vol</SelectItem>
                    <SelectItem value="full">Volle maan</SelectItem>
                    <SelectItem value="waning">Afnemende maan</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Gear */}
              <div className="space-y-4">
                <Label className="flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-brand" /> Visgear (optioneel)
                </Label>

                {userSetups.length > 0 ? (
                  <div className="space-y-2">
                    <Select
                      value={formData.gear?.setupId || ''}
                      onValueChange={(val) => {
                        if (!val) {
                          setFormData((prev) => ({ ...prev, gear: { ...prev.gear, setupId: '' } }));
                          return;
                        }
                        const setup = userSetups.find((s) => s.id === val);
                        if (setup) {
                          setFormData((prev) => ({
                            ...prev,
                            gear: {
                              setupId: setup.id,
                              rodId: setup.rodId || '',
                              reelId: setup.reelId || '',
                              lineId: setup.lineId || '',
                              lureId: setup.lureId || '',
                            },
                          }));
                        }
                      }}
                    >
                      <SelectTrigger className="h-14 rounded-2xl bg-bg-main border-border-subtle">
                        <SelectValue placeholder="Kies een setup uit Mijn Visgear..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">— Geen setup —</SelectItem>
                        {userSetups.map((s) => (
                          <SelectItem key={s.id} value={s.id!}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {formData.gear?.setupId &&
                      (() => {
                        const setup = userSetups.find((s) => s.id === formData.gear?.setupId);
                        const parts = [
                          setup?.rodId && userGear.find((g) => g.id === setup.rodId),
                          setup?.reelId && userGear.find((g) => g.id === setup.reelId),
                          setup?.lureId && userGear.find((g) => g.id === setup.lureId),
                        ]
                          .filter(Boolean)
                          .map((g: any) => `${g.brand} ${g.name}`);

                        return parts.length > 0 ? (
                          <p className="text-[11px] text-text-muted px-1">{parts.join(' · ')}</p>
                        ) : null;
                      })()}
                  </div>
                ) : userGear.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    <Select
                      value={formData.gear?.rodId || ''}
                      onValueChange={(val) =>
                        setFormData((prev) => ({ ...prev, gear: { ...prev.gear, rodId: val } }))
                      }
                    >
                      <SelectTrigger className="h-12 rounded-xl bg-surface-soft border-border-subtle text-xs">
                        <SelectValue placeholder="Hengel" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">— Geen —</SelectItem>
                        {userGear
                          .filter((g) => g.category === 'rod')
                          .map((g) => (
                            <SelectItem key={g.id} value={g.id!}>
                              {g.brand} {g.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={formData.gear?.reelId || ''}
                      onValueChange={(val) =>
                        setFormData((prev) => ({ ...prev, gear: { ...prev.gear, reelId: val } }))
                      }
                    >
                      <SelectTrigger className="h-12 rounded-xl bg-surface-soft border-border-subtle text-xs">
                        <SelectValue placeholder="Molen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">— Geen —</SelectItem>
                        {userGear
                          .filter((g) => g.category === 'reel')
                          .map((g) => (
                            <SelectItem key={g.id} value={g.id!}>
                              {g.brand} {g.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={formData.gear?.lureId || ''}
                      onValueChange={(val) =>
                        setFormData((prev) => ({ ...prev, gear: { ...prev.gear, lureId: val } }))
                      }
                    >
                      <SelectTrigger className="h-12 rounded-xl bg-surface-soft border-border-subtle text-xs col-span-2">
                        <SelectValue placeholder="Kunstaas / Aas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">— Geen —</SelectItem>
                        {userGear
                          .filter((g) => g.category === 'lure' || g.category === 'bait')
                          .map((g) => (
                            <SelectItem key={g.id} value={g.id!}>
                              {g.brand} {g.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="p-4 bg-surface-soft/50 border border-border-subtle rounded-2xl flex items-center gap-3">
                    <Wrench className="w-4 h-4 text-text-muted flex-shrink-0" />
                    <p className="text-xs text-text-muted">
                      Nog geen gear in{' '}
                      <span className="text-brand font-semibold">Mijn Visgear</span>. Voeg gear toe
                      om het hier te koppelen.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ──────────────────────────────────────── STEP 5 — Review */}
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
                <h3 className="text-2xl font-bold text-text-primary mb-2">
                  Klaar om te loggen!
                </h3>
                <p className="text-sm text-text-secondary mb-8">
                  Controleer je gegevens voordat je de vangst opslaat.
                </p>

                <div className="grid grid-cols-2 gap-4 text-left">
                  <div className="p-4 bg-bg-main rounded-2xl border border-border-subtle">
                    <p className="text-[8px] font-black text-text-muted uppercase tracking-widest mb-1">
                      Vissoort
                    </p>
                    <p className="text-sm font-bold text-text-primary truncate">
                      {formData.speciesGeneral || 'Onbekend'}
                    </p>
                    {formData.speciesSpecific && (
                      <p className="text-xs text-text-muted truncate mt-0.5">
                        {formData.speciesSpecific}
                      </p>
                    )}
                  </div>
                  <div className="p-4 bg-bg-main rounded-2xl border border-border-subtle">
                    <p className="text-[8px] font-black text-text-muted uppercase tracking-widest mb-1">
                      Maten
                    </p>
                    <p className="text-sm font-bold text-text-primary">
                      {formData.length || '--'}cm · {formData.weight || '--'}g
                    </p>
                    {formData.catchTime && (
                      <p className="text-xs text-text-muted mt-0.5">{formData.catchTime}</p>
                    )}
                  </div>
                  {formData.spotId && (
                    <div className="p-4 bg-bg-main rounded-2xl border border-border-subtle">
                      <p className="text-[8px] font-black text-text-muted uppercase tracking-widest mb-1">
                        Stek
                      </p>
                      <p className="text-sm font-bold text-text-primary truncate">
                        {getSpotName(spotsList.find((s) => s.id === formData.spotId))}
                      </p>
                    </div>
                  )}
                  {formData.baitGeneral && (
                    <div className="p-4 bg-bg-main rounded-2xl border border-border-subtle">
                      <p className="text-[8px] font-black text-text-muted uppercase tracking-widest mb-1">
                        Aas
                      </p>
                      <p className="text-sm font-bold text-text-primary truncate">
                        {formData.baitSpecific || formData.baitGeneral}
                      </p>
                    </div>
                  )}
                  {currentMainImage && (
                    <div className="col-span-2 rounded-2xl overflow-hidden h-32 border border-border-subtle">
                      <img
                        src={currentMainImage}
                        alt="Vangst preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 p-6 bg-brand/5 border border-brand/10 rounded-3xl">
                <div className="w-10 h-10 bg-brand/10 rounded-xl flex items-center justify-center">
                  <Zap className="w-5 h-5 text-brand" />
                </div>
                <p className="text-sm font-bold text-text-primary">
                  Je verdient{' '}
                  <span className="text-brand font-black">
                    +{loggingService.calculateXP(formData)} XP
                  </span>
                  !
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Actions */}
      <div className="p-6 md:p-8 bg-surface-soft/40 border-t border-border-subtle flex items-center justify-between flex-shrink-0">
        <Button
          variant="ghost"
          onClick={step === 1 ? handleCancel : handleBack}
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
            disabled={isUploading}
            icon={
              step === steps.length ? (
                <Check className="w-5 h-5" />
              ) : (
                <ChevronRight className="w-5 h-5" />
              )
            }
          >
            {isUploading ? 'Foto uploaden...' : step === steps.length ? 'Opslaan' : 'Volgende'}
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
              setFormData((prev) => ({ ...prev, spotId }));
              fetchData();
            }}
          />
        )}
      </AnimatePresence>
    </Card>
  );
};
