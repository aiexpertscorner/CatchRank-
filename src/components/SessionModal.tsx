import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Play,
  Waves,
  ChevronRight,
  ChevronLeft,
  Users,
  ShoppingBag,
  Target,
  History,
  Zap,
  Save,
  Camera,
  Loader2,
} from 'lucide-react';
import { Button } from './ui/Base';
import { Input, Select, Textarea } from './ui/Inputs';
import { motion, AnimatePresence } from 'motion/react';
import { loggingService } from '../features/logging/services/loggingService';
import { uploadPhoto } from '../lib/storageUtils';
import { useAuth } from '../App';
import { toast } from 'sonner';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { Spot, Session } from '../types';
import { weatherService } from '../features/weather/services/weatherService';
import { cn } from '../lib/utils';

interface SessionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SessionMode = 'live' | 'retro';

const SPOTS_COLLECTION = 'spots_v2';

const getSpotTitle = (spot?: Partial<Spot> | null) =>
  (spot as any)?.title || (spot as any)?.name || 'Onbekende stek';

const getSpotLatLng = (spot?: Partial<Spot> | null) => {
  const lat =
    (spot as any)?.lat ??
    (spot as any)?.latitude ??
    (spot as any)?.coordinates?.lat ??
    52.3676;

  const lng =
    (spot as any)?.lng ??
    (spot as any)?.longitude ??
    (spot as any)?.coordinates?.lng ??
    4.9041;

  return { lat, lng };
};

export const SessionModal: React.FC<SessionModalProps> = ({ isOpen, onClose }) => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<SessionMode>('live');
  const [step, setStep] = useState(1);
  const [spots, setSpots] = useState<Spot[]>([]);
  const [weather, setWeather] = useState<any>(null);
  const [tempSessionId] = useState(() => crypto.randomUUID());

  // Photo upload state
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [mainImage, setMainImage] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string>('');

  const now = new Date();
  const nowIso = now.toISOString().slice(0, 16);
  const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString().slice(0, 16);

  const [formData, setFormData] = useState({
    name: '',
    spotId: '',
    sessionType: 'Solo',
    method: 'Kantvissen',
    targetSpecies: '',
    notes: '',
    startTime: nowIso,
    endTime: twoHoursLater,
    visibility: 'public' as 'public' | 'friends' | 'private',
    gearIds: [] as string[],
    participantIds: [] as string[],
  });

  useEffect(() => {
    if (isOpen && profile) {
      fetchSpots();
    }
  }, [isOpen, profile]);

  const fetchSpots = async () => {
    if (!profile?.uid) return;

    try {
      const q = query(collection(db, SPOTS_COLLECTION), where('userId', '==', profile.uid));
      const snapshot = await getDocs(q);
      setSpots(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Spot)));
    } catch (error) {
      console.error('Fetch spots error:', error);
    }
  };

  const fetchWeather = async (spotId?: string) => {
    try {
      let lat = 52.3676;
      let lng = 4.9041;

      if (spotId) {
        const spot = spots.find((s) => s.id === spotId);
        const coords = getSpotLatLng(spot);
        lat = coords.lat;
        lng = coords.lng;
      } else if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
          weatherService
            .getCurrentWeather(position.coords.latitude, position.coords.longitude)
            .then(setWeather)
            .catch(console.error);
        });
        return;
      }

      const data = await weatherService.getCurrentWeather(lat, lng);
      setWeather(data);
    } catch (error) {
      console.error('Fetch weather error:', error);
    }
  };

  useEffect(() => {
    if (isOpen && profile && mode === 'live') {
      fetchWeather(formData.spotId);
    }
  }, [formData.spotId, mode, isOpen, profile, spots]);

  const handleStartSession = async () => {
    if (!profile?.uid) return;

    setLoading(true);
    try {
      const selectedSpot = spots.find((s) => s.id === formData.spotId);
      const spotName = getSpotTitle(selectedSpot);

      const sessionData: Partial<Session> & Record<string, any> = {
        id: tempSessionId, // ensures Storage path matches Firestore document ID
        /**
         * v2-first session fields
         */
        name:
          formData.name ||
          `${mode === 'live' ? 'Live' : 'Retro'} sessie${selectedSpot ? ` bij ${spotName}` : ''}`,
        type: mode,
        spotId: formData.spotId || undefined,
        spotName: selectedSpot ? spotName : undefined,
        startTime: Timestamp.fromDate(new Date(formData.startTime)) as any,
        endTime:
          mode === 'retro'
            ? (Timestamp.fromDate(new Date(formData.endTime)) as any)
            : undefined,
        participantIds: formData.participantIds,
        notes: formData.notes || undefined,
        weatherStart: weather || undefined,
        isActive: mode === 'live',
        createdAt: Timestamp.now() as any,
        updatedAt: Timestamp.now() as any,
        lastActivityAt: Timestamp.now() as any,

        /**
         * Useful detail/compatibility fields
         */
        visibility: formData.visibility,
        linkedGearIds: formData.gearIds,
        gearIds: formData.gearIds,
        mainImage: mainImage || undefined,
        metadata: {
          method: formData.method,
          waterType: (selectedSpot as any)?.waterType || undefined,
          targetSpecies: formData.targetSpecies ? [formData.targetSpecies] : [],
        },

        /**
         * Legacy fallbacks for parts of the UI that may still read old fields
         */
        title:
          formData.name ||
          `${mode === 'live' ? 'Live' : 'Retro'} sessie${selectedSpot ? ` bij ${spotName}` : ''}`,
        mode,
        status: mode === 'live' ? 'live' : 'completed',
        activeSpotId: formData.spotId || undefined,
        participantUserIds: formData.participantIds,
        startedAt: Timestamp.fromDate(new Date(formData.startTime)) as any,
        endedAt:
          mode === 'retro'
            ? (Timestamp.fromDate(new Date(formData.endTime)) as any)
            : undefined,
        weatherSnapshotStart: weather || undefined,
        sessionType: formData.sessionType,
        linkedSpotIds: formData.spotId ? [formData.spotId] : [],
        spotTimeline: formData.spotId
          ? [
              {
                spotId: formData.spotId,
                name: spotName,
                arrivedAt:
                  mode === 'live'
                    ? (Timestamp.now() as any)
                    : (Timestamp.fromDate(new Date(formData.startTime)) as any),
              },
            ]
          : [],
      };

      await loggingService.createSession(profile.uid, sessionData);

      toast.success(mode === 'live' ? 'Sessie gestart!' : 'Sessie opgeslagen!', {
        description:
          mode === 'live'
            ? 'Veel succes aan de waterkant!'
            : 'Je sessie is toegevoegd aan je logboek.',
      });

      onClose();
    } catch (error) {
      console.error('Create session error:', error);
      toast.error('Fout bij aanmaken van sessie.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile?.uid) return;

    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const previewUrl = URL.createObjectURL(file);
    previewUrlRef.current = previewUrl;
    setPhotoPreview(previewUrl);
    setPhotoFile(file);

    setIsUploading(true);
    try {
      const url = await uploadPhoto(profile.uid, 'sessions', tempSessionId, file, 'main');
      setMainImage(url);
    } catch (err) {
      console.error('Session photo upload failed:', err);
      toast.error('Foto upload mislukt.');
      setPhotoFile(null);
      setPhotoPreview('');
    } finally {
      setIsUploading(false);
    }
  };

  const nextStep = () => setStep((s) => s + 1);
  const prevStep = () => setStep((s) => s - 1);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      />

      <motion.div
        initial={{ opacity: 0, y: '100%' }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="relative w-full max-w-lg bg-surface border-t sm:border border-border-subtle rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[95vh] flex flex-col"
      >
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-12 h-1.5 bg-border-subtle rounded-full opacity-50" />
        </div>

        <div className="px-6 py-4 sm:p-8 border-b border-border-subtle flex items-center justify-between bg-gradient-to-r from-surface-soft/50 to-surface sticky top-0 z-10">
          <div className="flex items-center gap-3 sm:gap-5">
            <div className="w-10 h-10 sm:w-14 sm:h-14 bg-accent/10 rounded-xl sm:rounded-[1.25rem] flex items-center justify-center shadow-inner">
              {mode === 'live' ? (
                <Zap className="w-5 h-5 sm:w-7 sm:h-7 text-accent" />
              ) : (
                <History className="w-5 h-5 sm:w-7 sm:h-7 text-accent" />
              )}
            </div>
            <div>
              <h3 className="text-lg sm:text-2xl font-black text-primary tracking-tight">
                {mode === 'live' ? 'Live Sessie' : 'Retro Sessie'}
              </h3>
              <p className="text-[8px] sm:text-[10px] text-text-muted font-black uppercase tracking-[0.2em] sm:tracking-[0.3em]">
                Stap {step} van 3 • {mode === 'live' ? 'Live Tracking' : 'Achteraf Invoeren'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl hover:bg-surface-soft flex items-center justify-center text-text-muted hover:text-primary hover:rotate-90 duration-300 transition-all"
          >
            <X className="w-5 h-5 sm:w-7 sm:h-7" />
          </button>
        </div>

        {step === 1 && (
          <div className="px-6 sm:px-10 pt-6 sm:pt-8">
            <div className="flex p-1 bg-surface-soft rounded-2xl border border-border-subtle">
              <button
                onClick={() => setMode('live')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 sm:gap-3 py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm transition-all',
                  mode === 'live'
                    ? 'bg-accent text-black shadow-lg'
                    : 'text-text-muted hover:text-primary'
                )}
              >
                <Zap
                  className={cn(
                    'w-3.5 h-3.5 sm:w-4 h-4',
                    mode === 'live' ? 'fill-current' : ''
                  )}
                />
                Live Nu
              </button>
              <button
                onClick={() => setMode('retro')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 sm:gap-3 py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm transition-all',
                  mode === 'retro'
                    ? 'bg-accent text-black shadow-lg'
                    : 'text-text-muted hover:text-primary'
                )}
              >
                <History className="w-3.5 h-3.5 sm:w-4 h-4" />
                Achteraf
              </button>
            </div>
          </div>
        )}

        <div className="px-6 py-6 sm:p-10 overflow-y-auto flex-1 min-h-[300px] sm:min-h-[400px]">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6 sm:space-y-8"
              >
                <div className="space-y-2 sm:space-y-3">
                  <label className="text-[9px] sm:text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">
                    Sessie Titel (Optioneel)
                  </label>
                  <Input
                    placeholder="Bijv. Zondagse Snoekbaars Sessie"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="h-14 sm:h-16 rounded-xl sm:rounded-2xl bg-surface-soft/30 border-border-subtle focus:border-accent font-bold text-base sm:text-lg px-4 sm:px-6"
                  />
                </div>

                <div className="space-y-2 sm:space-y-3">
                  <label className="text-[9px] sm:text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">
                    Beginstek
                  </label>
                  <Select
                    value={formData.spotId}
                    onChange={(e) => setFormData({ ...formData, spotId: e.target.value })}
                    options={[
                      { value: '', label: 'Selecteer een stek...' },
                      ...spots.map((s) => ({
                        value: s.id!,
                        label: getSpotTitle(s),
                      })),
                    ]}
                    className="h-14 sm:h-16 rounded-xl sm:rounded-2xl bg-surface-soft/30 border-border-subtle focus:border-accent font-bold text-base sm:text-lg"
                  />
                </div>

                {mode === 'retro' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div className="space-y-2 sm:space-y-3">
                      <label className="text-[9px] sm:text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">
                        Starttijd
                      </label>
                      <Input
                        type="datetime-local"
                        value={formData.startTime}
                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                        className="h-14 sm:h-16 rounded-xl sm:rounded-2xl bg-surface-soft/30 border-border-subtle focus:border-accent font-bold text-sm sm:text-base px-4"
                      />
                    </div>
                    <div className="space-y-2 sm:space-y-3">
                      <label className="text-[9px] sm:text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">
                        Eindtijd
                      </label>
                      <Input
                        type="datetime-local"
                        value={formData.endTime}
                        onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                        className="h-14 sm:h-16 rounded-xl sm:rounded-2xl bg-surface-soft/30 border-border-subtle focus:border-accent font-bold text-sm sm:text-base px-4"
                      />
                    </div>
                  </div>
                )}

                {mode === 'live' && weather && (
                  <div className="p-4 sm:p-6 bg-accent/5 border border-accent/10 rounded-2xl sm:rounded-[2rem] flex items-center justify-between">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-accent/10 rounded-xl flex items-center justify-center">
                        <Waves className="w-5 h-5 sm:w-6 sm:h-6 text-accent" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-primary">
                          {weather.temp}°C • {weather.description}
                        </p>
                        <p className="text-[9px] sm:text-[10px] text-text-muted uppercase tracking-wider">
                          Actuele condities
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Session photo */}
                <div className="space-y-2 sm:space-y-3">
                  <label className="text-[9px] sm:text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">
                    Foto (optioneel)
                  </label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="relative h-28 sm:h-36 rounded-2xl border-2 border-dashed border-border-subtle bg-surface-soft/30 flex items-center justify-center cursor-pointer hover:border-accent/40 transition-all overflow-hidden group"
                  >
                    {isUploading && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                        <Loader2 className="w-6 h-6 text-accent animate-spin" />
                      </div>
                    )}
                    {photoPreview ? (
                      <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-text-muted group-hover:text-accent transition-colors">
                        <Camera className="w-6 h-6" />
                        <span className="text-xs font-bold">Foto toevoegen</span>
                      </div>
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
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6 sm:space-y-8"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-2 sm:space-y-3">
                    <label className="text-[9px] sm:text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">
                      Sessie Type
                    </label>
                    <Select
                      value={formData.sessionType}
                      onChange={(e) => setFormData({ ...formData, sessionType: e.target.value })}
                      options={[
                        { value: 'Solo', label: 'Solo' },
                        { value: 'Groep', label: 'Groep' },
                        { value: 'Competitie', label: 'Competitie' },
                      ]}
                      className="h-14 sm:h-16 rounded-xl sm:rounded-2xl bg-surface-soft/30 border-border-subtle focus:border-accent font-bold text-base sm:text-lg"
                    />
                  </div>
                  <div className="space-y-2 sm:space-y-3">
                    <label className="text-[9px] sm:text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">
                      Methode
                    </label>
                    <Select
                      value={formData.method}
                      onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                      options={[
                        { value: 'Kantvissen', label: 'Kantvissen' },
                        { value: 'Bootvissen', label: 'Bootvissen' },
                        { value: 'Bellyboat', label: 'Bellyboat' },
                        { value: 'Kayaks', label: 'Kayak' },
                      ]}
                      className="h-14 sm:h-16 rounded-xl sm:rounded-2xl bg-surface-soft/30 border-border-subtle focus:border-accent font-bold text-base sm:text-lg"
                    />
                  </div>
                </div>

                <div className="space-y-2 sm:space-y-3">
                  <label className="text-[9px] sm:text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">
                    Doelsoort
                  </label>
                  <Input
                    placeholder="Bijv. Snoekbaars"
                    value={formData.targetSpecies}
                    onChange={(e) => setFormData({ ...formData, targetSpecies: e.target.value })}
                    icon={<Target className="w-5 h-5 sm:w-6 sm:h-6 text-accent" />}
                    className="h-14 sm:h-16 rounded-xl sm:rounded-2xl bg-surface-soft/30 border-border-subtle focus:border-accent font-bold text-base sm:text-lg px-4 sm:px-6"
                  />
                </div>

                <div className="p-4 sm:p-6 bg-surface-soft/50 border border-border-subtle rounded-2xl sm:rounded-[2rem] flex items-center justify-between group cursor-pointer hover:border-accent/30 transition-all">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-accent/10 rounded-xl flex items-center justify-center">
                      <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6 text-accent" />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-bold text-primary">Mijn Visgear</p>
                      <p className="text-[9px] sm:text-[10px] text-text-muted uppercase tracking-wider">
                        Koppel je uitrusting
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 sm:w-5 h-5 text-text-muted group-hover:text-accent transition-colors" />
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6 sm:space-y-8"
              >
                <div className="space-y-2 sm:space-y-3">
                  <label className="text-[9px] sm:text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">
                    Privacy & Zichtbaarheid
                  </label>
                  <div className="flex gap-2 sm:gap-4">
                    {(['public', 'friends', 'private'] as const).map((v) => (
                      <button
                        key={v}
                        onClick={() => setFormData({ ...formData, visibility: v })}
                        className={cn(
                          'flex-1 py-3 sm:py-4 rounded-xl sm:rounded-2xl border-2 font-bold text-[10px] sm:text-sm transition-all',
                          formData.visibility === v
                            ? 'bg-accent/10 border-accent text-accent'
                            : 'bg-surface-soft/30 border-border-subtle text-text-muted hover:border-accent/30'
                        )}
                      >
                        {v === 'public'
                          ? 'Openbaar'
                          : v === 'friends'
                            ? 'Vrienden'
                            : 'Privé'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 sm:space-y-3">
                  <label className="text-[9px] sm:text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">
                    Notities
                  </label>
                  <Textarea
                    placeholder="Bijv. Water was erg troebel vandaag..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="rounded-2xl sm:rounded-[2rem] bg-surface-soft/30 border-border-subtle focus:border-accent font-medium text-base sm:text-lg p-4 sm:p-6"
                  />
                </div>

                <div className="p-4 sm:p-8 bg-water/5 border border-water/10 rounded-2xl sm:rounded-[2.5rem] flex gap-4 sm:gap-6 items-center">
                  <div className="w-10 h-10 sm:w-14 sm:h-14 bg-water/10 rounded-xl sm:rounded-[1.25rem] flex items-center justify-center shrink-0 shadow-sm">
                    <Users className="w-5 h-5 sm:w-7 sm:h-7 text-water" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs sm:text-sm text-text-secondary leading-relaxed font-medium">
                      Nodig vrienden uit om samen te loggen en XP te delen.
                    </p>
                    <p className="text-[9px] sm:text-[10px] text-water/60 mt-1">
                      Na aanmaken kun je vrienden uitnodigen vanuit de sessie.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="p-6 sm:p-8 bg-surface-soft/30 border-t border-border-subtle flex gap-4 sm:gap-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-8">
          {step > 1 ? (
            <Button
              variant="ghost"
              className="flex-1 h-14 sm:h-18 text-text-muted hover:text-primary font-bold text-base sm:text-lg rounded-xl sm:rounded-2xl"
              onClick={prevStep}
              icon={<ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />}
            >
              Terug
            </Button>
          ) : (
            <Button
              variant="ghost"
              className="flex-1 h-14 sm:h-18 text-text-muted hover:text-primary font-bold text-base sm:text-lg rounded-xl sm:rounded-2xl"
              onClick={onClose}
            >
              Annuleren
            </Button>
          )}

          {step < 3 ? (
            <Button
              className="flex-[2] h-14 sm:h-18 text-lg sm:text-2xl rounded-xl sm:rounded-2xl shadow-premium-accent font-bold transition-all active:scale-95"
              onClick={nextStep}
              icon={<ChevronRight className="w-6 h-6 sm:w-8 h-8" />}
            >
              Volgende
            </Button>
          ) : (
            <Button
              className="flex-[2] h-14 sm:h-18 text-lg sm:text-2xl rounded-xl sm:rounded-2xl shadow-premium-accent font-bold transition-all active:scale-95"
              onClick={handleStartSession}
              loading={loading}
              icon={
                mode === 'live' ? (
                  <Play className="w-6 h-6 sm:w-8 h-8 fill-current" />
                ) : (
                  <Save className="w-6 h-6 sm:w-8 h-8" />
                )
              }
            >
              {mode === 'live' ? 'Sessie Starten' : 'Sessie Opslaan'}
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
};