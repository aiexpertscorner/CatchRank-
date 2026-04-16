import React, { useState, useEffect, useRef } from 'react';
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
  Users,
  Shield,
  Tag,
  ChevronRight,
  ChevronLeft,
  Fish,
  Zap,
  Coffee,
  Car,
  Wind,
  Trash2,
  Plus,
  Star,
  Loader2,
  LocateFixed
} from 'lucide-react';
import { Button, Card, Badge } from './ui/Base';
import { Input, Textarea, Select } from './ui/Inputs';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../App';
import { toast } from 'sonner';
import { Spot } from '../types';
import { cn } from '../lib/utils';
import { loggingService } from '../features/logging/services/loggingService';
import { gearService } from '../features/gear/services/gearService';
import { uploadPhoto, deletePhoto, isBase64Image } from '../lib/storageUtils';
import type { GearSetup } from '../types';

interface SpotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (spotId: string) => void;
  editingSpot?: Spot | null;
}

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

  // Photo upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const previewUrlRef = useRef<string>('');
  const uploadedThisSession = useRef(false);

  // Stable spot ID per modal session
  const [tempSpotId] = useState(() => editingSpot?.id || crypto.randomUUID());

  // GPS state
  const [gpsLoading, setGpsLoading] = useState(false);

  // Gear / setups loaded from service
  const [userSetups, setUserSetups] = useState<GearSetup[]>([]);

  const [formData, setFormData] = useState({
    name: editingSpot?.name || '',
    waterType: editingSpot?.waterType || 'canal',
    waterBodyName: editingSpot?.waterBodyName || '',
    description: editingSpot?.description || '',
    visibility: editingSpot?.visibility || 'private',
    spotCategory: editingSpot?.spotCategory || ('' as Spot['spotCategory'] | ''),
    isFavorite: editingSpot?.isFavorite || false,
    mainPhotoURL: editingSpot?.mainPhotoURL || '',
    targetSpecies: editingSpot?.targetSpecies || [] as string[],
    techniques: editingSpot?.techniques || [] as string[],
    amenities: editingSpot?.amenities || [] as string[],
    linkedGearIds: editingSpot?.linkedGearIds || [] as string[],
    linkedSetupIds: editingSpot?.linkedSetupIds || [] as string[],
    coordinates: editingSpot?.coordinates || { lat: 52.3676, lng: 4.9041 },
    latInput: String(editingSpot?.coordinates?.lat ?? 52.3676),
    lngInput: String(editingSpot?.coordinates?.lng ?? 4.9041),
  });

  useEffect(() => {
    if (!isOpen) return;
    if (editingSpot) {
      setFormData({
        name: editingSpot.name,
        waterType: editingSpot.waterType || 'canal',
        waterBodyName: editingSpot.waterBodyName || '',
        description: editingSpot.description || '',
        visibility: editingSpot.visibility || 'private',
        spotCategory: editingSpot.spotCategory || '',
        isFavorite: editingSpot.isFavorite || false,
        mainPhotoURL: editingSpot.mainPhotoURL || '',
        targetSpecies: editingSpot.targetSpecies || [],
        techniques: editingSpot.techniques || [],
        amenities: editingSpot.amenities || [],
        linkedGearIds: editingSpot.linkedGearIds || [],
        linkedSetupIds: editingSpot.linkedSetupIds || [],
        coordinates: editingSpot.coordinates || { lat: 52.3676, lng: 4.9041 },
        latInput: String(editingSpot.coordinates?.lat ?? 52.3676),
        lngInput: String(editingSpot.coordinates?.lng ?? 4.9041),
      });
      if (editingSpot.mainPhotoURL && !isBase64Image(editingSpot.mainPhotoURL)) {
        setPhotoPreview(editingSpot.mainPhotoURL);
      }
    } else {
      setFormData({
        name: '',
        waterType: 'canal',
        waterBodyName: '',
        description: '',
        visibility: 'private',
        spotCategory: '',
        isFavorite: false,
        mainPhotoURL: '',
        targetSpecies: [],
        techniques: [],
        amenities: [],
        linkedGearIds: [],
        linkedSetupIds: [],
        coordinates: { lat: 52.3676, lng: 4.9041 },
        latInput: '52.3676',
        lngInput: '4.9041',
      });
      setPhotoFile(null);
      setPhotoPreview('');
      uploadedThisSession.current = false;
    }
    setCurrentStep(0);
  }, [editingSpot, isOpen]);

  // Load user setups
  useEffect(() => {
    if (!isOpen || !profile) return;
    gearService.getUserSetups(profile.uid).then(setUserSetups).catch(() => {});
  }, [isOpen, profile]);

  // Cleanup object URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    // Revoke previous preview URL
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const preview = URL.createObjectURL(file);
    previewUrlRef.current = preview;
    setPhotoPreview(preview);
    setPhotoFile(file);
    setIsUploading(true);

    try {
      const url = await uploadPhoto(profile.uid, 'spots', tempSpotId, file);
      setFormData(prev => ({ ...prev, mainPhotoURL: url }));
      uploadedThisSession.current = true;
    } catch (err) {
      toast.error('Foto uploaden mislukt');
      setPhotoPreview('');
      setPhotoFile(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemovePhoto = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (uploadedThisSession.current && formData.mainPhotoURL && !isBase64Image(formData.mainPhotoURL)) {
      deletePhoto(formData.mainPhotoURL).catch(() => {});
    }
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = '';
    }
    setPhotoFile(null);
    setPhotoPreview('');
    setFormData(prev => ({ ...prev, mainPhotoURL: '' }));
    uploadedThisSession.current = false;
  };

  const handleGpsCapture = () => {
    if (!navigator.geolocation) {
      toast.error('GPS niet beschikbaar op dit apparaat');
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(6));
        const lng = parseFloat(pos.coords.longitude.toFixed(6));
        setFormData(prev => ({
          ...prev,
          coordinates: { lat, lng },
          latInput: String(lat),
          lngInput: String(lng),
        }));
        toast.success('GPS locatie vastgelegd');
        setGpsLoading(false);
      },
      (err) => {
        toast.error('GPS locatie ophalen mislukt');
        setGpsLoading(false);
      },
      { timeout: 10000, maximumAge: 60000 }
    );
  };

  const handleLatChange = (val: string) => {
    setFormData(prev => {
      const lat = parseFloat(val);
      return {
        ...prev,
        latInput: val,
        coordinates: isNaN(lat) ? prev.coordinates : { ...prev.coordinates, lat },
      };
    });
  };

  const handleLngChange = (val: string) => {
    setFormData(prev => {
      const lng = parseFloat(val);
      return {
        ...prev,
        lngInput: val,
        coordinates: isNaN(lng) ? prev.coordinates : { ...prev.coordinates, lng },
      };
    });
  };

  const toggleItem = (field: 'targetSpecies' | 'techniques' | 'amenities' | 'linkedGearIds' | 'linkedSetupIds', value: string) => {
    setFormData(prev => {
      const current = prev[field] as string[];
      const next = current.includes(value)
        ? current.filter(i => i !== value)
        : [...current, value];
      return { ...prev, [field]: next };
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

  const handleCancel = () => {
    if (uploadedThisSession.current && formData.mainPhotoURL && !isBase64Image(formData.mainPhotoURL)) {
      deletePhoto(formData.mainPhotoURL).catch(() => {});
    }
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = '';
    }
    onClose();
  };

  const handleSubmit = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const { latInput, lngInput, spotCategory, ...rest } = formData;
      const spotData = {
        ...rest,
        ...(spotCategory ? { spotCategory } : {}),
        authorName: profile.displayName,
        authorPhoto: profile.photoURL || '',
      };

      if (editingSpot?.id) {
        await loggingService.updateSpot(editingSpot.id, spotData);
        toast.success('Stek bijgewerkt!');
      } else {
        const spotId = await loggingService.createSpot(profile.uid, { ...spotData, id: tempSpotId });
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
        onClick={handleCancel}
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
                  onClick={() => setFormData(prev => ({ ...prev, isFavorite: !prev.isFavorite }))}
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
            onClick={handleCancel}
            className="w-10 h-10 sm:w-14 sm:h-14 rounded-2xl hover:bg-surface-soft flex items-center justify-center text-text-muted hover:text-primary transition-all hover:rotate-90 duration-300"
          >
            <X className="w-6 h-6 sm:w-9 sm:h-9" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar p-6 sm:p-10">
          <AnimatePresence mode="wait">
            {/* Step 0 — Basis Info */}
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
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
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
                      onChange={(e) => setFormData(prev => ({ ...prev, waterType: e.target.value }))}
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
                      onChange={(e) => setFormData(prev => ({ ...prev, visibility: e.target.value as any }))}
                      options={[
                        { value: 'private', label: 'Privé (Alleen ik)' },
                        { value: 'friends', label: 'Vrienden' },
                        { value: 'public', label: 'Openbaar' }
                      ]}
                      className="h-16 rounded-2xl bg-surface-soft/30 border-border-subtle focus:border-accent font-bold text-lg"
                    />
                  </div>
                </div>

                {/* Spot Category — map marker type */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">
                    Kaart Categorie <span className="normal-case font-medium tracking-normal opacity-60">(optioneel)</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {([
                      { id: '',           label: 'Auto',       color: '#5E646F', icon: null },
                      { id: 'public',     label: 'Openbaar',   color: '#F4C20D', icon: <Globe className="w-3.5 h-3.5" /> },
                      { id: 'private',    label: 'Privé',      color: '#5E646F', icon: <Lock className="w-3.5 h-3.5" /> },
                      { id: 'friends',    label: 'Vrienden',   color: '#5FA8FF', icon: <Users className="w-3.5 h-3.5" /> },
                      { id: 'club',       label: 'Club',       color: '#29C36A', icon: <Shield className="w-3.5 h-3.5" /> },
                      { id: 'betaalwater', label: 'Betaalwater', color: '#F0A83A', icon: <Tag className="w-3.5 h-3.5" /> },
                    ] as { id: string; label: string; color: string; icon: React.ReactNode }[]).map((opt) => {
                      const isActive = formData.spotCategory === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, spotCategory: opt.id as any }))}
                          className={cn(
                            'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all',
                            isActive
                              ? 'border-accent text-accent bg-accent/10'
                              : 'border-border-subtle text-text-muted bg-surface-soft hover:border-brand/30 hover:text-text-secondary'
                          )}
                        >
                          {opt.icon && opt.icon}
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-text-dim ml-1">
                    Bepaalt de kleur van je marker op de kaart. "Auto" volgt je zichtbaarheidsinstelling.
                  </p>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">Naam Water (Optioneel)</label>
                  <Input
                    placeholder="Bijv. Amsterdam-Rijnkanaal"
                    value={formData.waterBodyName}
                    onChange={(e) => setFormData(prev => ({ ...prev, waterBodyName: e.target.value }))}
                    icon={<Navigation className="w-6 h-6 text-accent" />}
                    className="h-16 rounded-2xl bg-surface-soft/30 border-border-subtle focus:border-accent font-bold text-lg px-6"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">Beschrijving / Notities</label>
                  <Textarea
                    placeholder="Bijv. Goede plek voor snoekbaars bij de brug..."
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={4}
                    className="rounded-[2rem] bg-surface-soft/30 border-border-subtle focus:border-accent font-medium text-lg p-6"
                  />
                </div>
              </motion.div>
            )}

            {/* Step 1 — Locatie & Foto */}
            {currentStep === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                {/* GPS Capture */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">GPS Locatie</label>
                  <button
                    type="button"
                    onClick={handleGpsCapture}
                    disabled={gpsLoading}
                    className="w-full flex items-center justify-center gap-3 h-16 rounded-2xl border-2 border-dashed border-accent/40 bg-accent/5 text-accent font-black text-sm uppercase tracking-widest transition-all hover:border-accent hover:bg-accent/10 disabled:opacity-50"
                  >
                    {gpsLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <LocateFixed className="w-5 h-5" />
                    )}
                    {gpsLoading ? 'GPS ophalen...' : 'Huidige locatie gebruiken'}
                  </button>
                </div>

                {/* Manual Coordinate Input */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">Coördinaten (handmatig)</label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <span className="text-[10px] text-text-muted font-black uppercase tracking-widest ml-1">Breedtegraad (Lat)</span>
                      <input
                        type="number"
                        step="0.000001"
                        min="-90"
                        max="90"
                        value={formData.latInput}
                        onChange={(e) => handleLatChange(e.target.value)}
                        className="w-full h-14 rounded-2xl bg-surface-soft/30 border border-border-subtle focus:border-accent font-bold text-base px-4 text-primary outline-none transition-colors"
                        placeholder="52.3676"
                      />
                    </div>
                    <div className="space-y-2">
                      <span className="text-[10px] text-text-muted font-black uppercase tracking-widest ml-1">Lengtegraad (Lng)</span>
                      <input
                        type="number"
                        step="0.000001"
                        min="-180"
                        max="180"
                        value={formData.lngInput}
                        onChange={(e) => handleLngChange(e.target.value)}
                        className="w-full h-14 rounded-2xl bg-surface-soft/30 border border-border-subtle focus:border-accent font-bold text-base px-4 text-primary outline-none transition-colors"
                        placeholder="4.9041"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-text-dim ml-1">
                    Vastgelegde positie: {formData.coordinates.lat.toFixed(6)}, {formData.coordinates.lng.toFixed(6)}
                  </p>
                </div>

                {/* Water Body Name quick-fill */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">Water naam bijwerken (optioneel)</label>
                  <Input
                    placeholder="Bijv. Vinkeveense Plassen"
                    value={formData.waterBodyName}
                    onChange={(e) => setFormData(prev => ({ ...prev, waterBodyName: e.target.value }))}
                    icon={<Globe className="w-5 h-5 text-accent" />}
                    className="h-14 rounded-2xl bg-surface-soft/30 border-border-subtle font-bold"
                  />
                </div>

                {/* Photo Upload */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">Hoofdfoto van de stek</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div
                      className={cn(
                        "aspect-video rounded-[2rem] border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-all cursor-pointer group overflow-hidden relative",
                        photoPreview || formData.mainPhotoURL
                          ? "border-accent/50"
                          : "border-border-subtle hover:border-accent/30 hover:bg-accent/5"
                      )}
                      onClick={() => !isUploading && fileInputRef.current?.click()}
                    >
                      {isUploading && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10 rounded-[2rem]">
                          <Loader2 className="w-8 h-8 text-accent animate-spin" />
                        </div>
                      )}
                      {(photoPreview || formData.mainPhotoURL) ? (
                        <>
                          <img
                            src={photoPreview || formData.mainPhotoURL}
                            alt="Preview"
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Camera className="w-8 h-8 text-white" />
                          </div>
                          <button
                            type="button"
                            onClick={handleRemovePhoto}
                            className="absolute top-4 right-4 w-8 h-8 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-danger transition-colors z-20"
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

            {/* Step 2 — Visserij Details */}
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

                {/* Gear & Setups */}
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">Gekoppelde Setups (Mijn Visgear)</label>
                  <div className="space-y-3">
                    {userSetups.length === 0 ? (
                      <p className="text-[11px] text-text-dim italic ml-1">
                        Nog geen setups aangemaakt. Ga naar Mijn Visgear om setups te maken.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {userSetups.map(setup => {
                          const isActive = formData.linkedSetupIds.includes(setup.id);
                          return (
                            <button
                              key={setup.id}
                              type="button"
                              onClick={() => toggleItem('linkedSetupIds', setup.id)}
                              className={cn(
                                "px-4 py-2 rounded-xl border-2 font-bold text-[10px] uppercase tracking-widest transition-all",
                                isActive
                                  ? "bg-accent/10 border-accent text-accent"
                                  : "bg-surface-soft/30 border-border-subtle text-text-muted hover:border-accent/30"
                              )}
                            >
                              {setup.name}
                            </button>
                          );
                        })}
                      </div>
                    )}
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
              onClick={handleCancel}
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
