import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Camera,
  X,
  Check,
  AlertCircle,
  MapPin,
  Fish,
  Zap,
} from 'lucide-react';
import { Button, Badge } from './ui/Base';
import { motion, AnimatePresence } from 'motion/react';
import { loggingService } from '../features/logging/services/loggingService';
import { useAuth } from '../App';
import { toast } from 'sonner';

interface QuickCatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSessionId?: string;
}

const getSessionSpotId = (session: any): string | undefined =>
  session?.spotId || session?.activeSpotId || undefined;

export const QuickCatchModal: React.FC<QuickCatchModalProps> = ({
  isOpen,
  onClose,
  activeSessionId,
}) => {
  const { profile } = useAuth();
  const [step, setStep] = useState<'upload' | 'confirm'>('upload');
  const [photo, setPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setPhoto(reader.result as string);
      setStep('confirm');
    };
    reader.readAsDataURL(file);
  };

  const handleQuickSave = async () => {
    if (!profile?.uid) return;

    setLoading(true);
    try {
      let sessionSpotId: string | undefined;

      if (activeSessionId) {
        const session = await loggingService.getSession(activeSessionId);
        sessionSpotId = getSessionSpotId(session);
      }

      const catchId = await loggingService.quickCatch(
        profile.uid,
        photo ?? '',
        sessionSpotId
      );

      if (activeSessionId) {
        await loggingService.linkCatchToSession(catchId, activeSessionId, sessionSpotId);
      }

      toast.success('Vangst opgeslagen als concept!', {
        description: 'Je kunt de details later aanvullen in je dagboek.',
        action: {
          label: 'Nu aanvullen',
          onClick: () => console.log('Navigate to edit catch', catchId),
        },
      });

      onClose();
      reset();
    } catch (error) {
      console.error('Quick catch error:', error);
      toast.error('Fout bij opslaan van vangst.');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep('upload');
    setPhoto(null);
    setLoading(false);
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative w-full max-w-md bg-surface border-t sm:border border-border-subtle rounded-t-[2.5rem] sm:rounded-[3rem] shadow-premium overflow-hidden max-h-[95vh] flex flex-col"
          >
            {/* Mobile Drag Handle */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-12 h-1.5 bg-border-subtle rounded-full opacity-50" />
            </div>

            {/* Header */}
            <div className="px-6 py-4 sm:p-8 border-b border-border-subtle flex items-center justify-between bg-gradient-to-r from-surface-soft/60 to-surface sticky top-0 z-10">
              <div className="flex items-center gap-3 sm:gap-5">
                <div className="w-10 h-10 sm:w-14 sm:h-14 bg-accent/10 rounded-xl sm:rounded-[1.25rem] flex items-center justify-center shadow-inner">
                  <Zap className="w-5 h-5 sm:w-7 sm:h-7 text-accent" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-2xl font-black text-primary tracking-tight">
                    Quick Catch
                  </h3>
                  <p className="text-[8px] sm:text-[10px] text-text-muted font-black uppercase tracking-[0.2em] sm:tracking-[0.3em]">
                    Dick Beet • Snel Loggen
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl hover:bg-surface-soft flex items-center justify-center transition-all text-text-muted hover:text-primary hover:rotate-90 duration-300"
              >
                <X className="w-5 h-5 sm:w-7 sm:h-7" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 sm:p-10 overflow-y-auto no-scrollbar flex-1">
              <AnimatePresence mode="wait">
                {step === 'upload' ? (
                  <motion.div
                    key="upload"
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 1.05, y: -10 }}
                    className="space-y-8 sm:space-y-10"
                  >
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-square w-full bg-surface-soft/30 border-2 border-dashed border-border-subtle rounded-[2.5rem] sm:rounded-[3rem] flex flex-col items-center justify-center gap-6 sm:gap-8 cursor-pointer hover:border-accent/50 hover:bg-accent/5 transition-all group relative overflow-hidden shadow-inner"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <div className="relative z-10 w-24 h-24 sm:w-28 sm:h-28 bg-white rounded-[1.5rem] sm:rounded-[2rem] shadow-premium flex items-center justify-center group-hover:scale-110 transition-transform duration-700 group-hover:rotate-3">
                        <Camera className="w-12 h-12 sm:w-14 sm:h-14 text-accent" />
                      </div>
                      <div className="relative z-10 text-center space-y-2 px-6">
                        <p className="text-xl sm:text-2xl font-black text-primary tracking-tight">
                          Maak of kies een foto
                        </p>
                        <p className="text-xs sm:text-sm text-text-muted font-medium">
                          "Een foto zegt meer dan duizend woorden, vriend!"
                        </p>
                      </div>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*"
                        className="hidden"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4 sm:gap-6">
                      <div className="p-4 sm:p-6 bg-surface-soft/50 rounded-[1.25rem] sm:rounded-[1.5rem] border border-border-subtle flex items-center gap-3 sm:gap-4 group hover:border-water/30 transition-colors">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-water/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                          <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-water" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[8px] sm:text-[10px] font-black text-text-muted uppercase tracking-widest mb-0.5 sm:mb-1">
                            Locatie
                          </p>
                          <p className="text-[10px] sm:text-xs font-bold text-primary truncate">
                            Huidige positie
                          </p>
                        </div>
                      </div>

                      <div className="p-4 sm:p-6 bg-surface-soft/50 rounded-[1.25rem] sm:rounded-[1.5rem] border border-border-subtle flex items-center gap-3 sm:gap-4 group hover:border-accent/30 transition-colors">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-accent/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-accent" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[8px] sm:text-[10px] font-black text-text-muted uppercase tracking-widest mb-0.5 sm:mb-1">
                            Beloning
                          </p>
                          <p className="text-[10px] sm:text-xs font-bold text-primary truncate">
                            +10 XP Basis
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-5 bg-primary/5 rounded-2xl border border-primary/10 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Fish className="w-5 h-5 text-primary" />
                      </div>
                      <p className="text-[11px] font-medium italic text-text-secondary leading-relaxed">
                        "Snel een kiekje en weer terug die hengel in het water. De vis wacht niet!" — Dick Beet
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="confirm"
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 1.05, y: -10 }}
                    className="space-y-8 sm:space-y-10"
                  >
                    <div className="aspect-square w-full rounded-[2.5rem] sm:rounded-[3rem] overflow-hidden border border-border-subtle shadow-premium bg-surface-soft relative group">
                      {photo ? (
                        <img
                          src={photo}
                          alt="Preview"
                          className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-surface-card">
                          <div className="w-20 h-20 rounded-2xl bg-accent/10 flex items-center justify-center">
                            <Fish className="w-10 h-10 text-accent" />
                          </div>
                          <p className="text-sm font-bold text-text-muted">
                            Geen foto — concept opgeslagen
                          </p>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <div className="absolute bottom-6 sm:bottom-8 left-6 sm:left-8 right-6 text-white opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0">
                        <p className="text-xs sm:text-sm font-bold flex items-center gap-2">
                          <Camera className="w-4 h-4 text-accent" /> Wat een plaatje!
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4 sm:space-y-6">
                      <div className="p-5 bg-accent/5 border border-accent/10 rounded-2xl flex items-center gap-4 animate-pulse">
                        <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                          <Zap className="w-5 h-5 text-accent" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-accent uppercase tracking-widest">
                            Dick Beet's Inzicht
                          </p>
                          <p className="text-xs font-medium text-text-secondary">
                            "Ik gok op een <span className="font-bold text-primary">Snoek</span> op basis van je locatie en het seizoen!"
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-4 sm:gap-5 p-6 sm:p-8 bg-warning/5 border border-warning/10 rounded-[1.5rem] sm:rounded-[2rem]">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-warning/10 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0">
                          <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-warning" />
                        </div>
                        <div className="space-y-0.5 sm:space-y-1">
                          <p className="text-xs sm:text-sm font-black text-primary uppercase tracking-tight">
                            Concept Opslag
                          </p>
                          <p className="text-[10px] sm:text-xs font-medium text-text-secondary leading-relaxed">
                            Je kunt later details zoals soort, gewicht en lengte toevoegen in je dagboek.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-6 sm:p-8 bg-surface-soft/50 rounded-[1.5rem] sm:rounded-[2rem] border border-border-subtle">
                        <div className="flex items-center gap-4 sm:gap-5">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-accent/10 rounded-xl sm:rounded-2xl flex items-center justify-center">
                            <Fish className="w-5 h-5 sm:w-6 sm:h-6 text-accent" />
                          </div>
                          <div>
                            <p className="text-base sm:text-lg font-black text-primary tracking-tight">
                              Vangst Loggen
                            </p>
                            <p className="text-[8px] sm:text-[10px] font-black text-text-muted uppercase tracking-widest">
                              Klaar voor verwerking
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant="success"
                          className="px-4 sm:px-5 py-1.5 sm:py-2 rounded-xl text-[8px] sm:text-[10px] font-black uppercase tracking-widest shadow-sm"
                        >
                          Gereed
                        </Badge>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="p-6 sm:p-8 bg-surface-soft/30 border-t border-border-subtle flex gap-3 sm:gap-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-8">
              {step === 'upload' ? (
                <>
                  <Button
                    variant="ghost"
                    className="flex-1 h-12 sm:h-14 text-text-muted hover:text-primary font-bold rounded-2xl text-xs sm:text-sm"
                    onClick={() => setStep('confirm')}
                    disabled={loading}
                  >
                    Overslaan
                  </Button>
                  <Button
                    className="flex-[2] h-12 sm:h-14 text-base sm:text-lg rounded-2xl shadow-premium-accent font-black transition-all active:scale-95"
                    onClick={() => fileInputRef.current?.click()}
                    icon={<Camera className="w-5 h-5 sm:w-6 sm:h-6" />}
                  >
                    Foto Kiezen
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    className="flex-1 h-12 sm:h-14 text-text-muted hover:text-primary font-bold rounded-2xl text-xs sm:text-sm"
                    onClick={() => setStep('upload')}
                    disabled={loading}
                  >
                    Opnieuw
                  </Button>
                  <Button
                    className="flex-[2] h-12 sm:h-14 text-base sm:text-lg rounded-2xl shadow-premium-accent font-black transition-all active:scale-95"
                    onClick={handleQuickSave}
                    isLoading={loading}
                    icon={<Check className="w-5 h-5 sm:w-6 sm:h-6" />}
                  >
                    Snel Opslaan
                  </Button>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};