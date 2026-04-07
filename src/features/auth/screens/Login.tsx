import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, Eye, EyeOff, X, KeyRound } from 'lucide-react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../../lib/firebase';
import { useAuth } from '../../../App';
import { Button, Card } from '../../../components/ui/Base';
import { toast } from 'sonner';

export default function Login() {
  const { loginWithGoogle, loginWithEmail, registerWithEmail } = useAuth();

  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const logoSrc = `${import.meta.env.BASE_URL}logo/logo-icon.svg`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isRegister) {
        await registerWithEmail(email, password, rememberMe);
        toast.success('Account aangemaakt!');
      } else {
        await loginWithEmail(email, password, rememberMe);
        toast.success('Welkom terug!');
      }
    } catch (error: any) {
      toast.error(error?.message || 'Fout bij inloggen');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);

    try {
      await loginWithGoogle(rememberMe);
      toast.success('Welkom bij CatchRank!');
    } catch (error: any) {
      toast.error(error?.message || 'Fout bij inloggen met Google');
    } finally {
      setLoading(false);
    }
  };

  const openForgotModal = () => {
    setResetEmail(email || '');
    setShowForgotModal(true);
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!resetEmail.trim()) {
      toast.error('Vul eerst een e-mailadres in.');
      return;
    }

    setResetLoading(true);

    try {
      await sendPasswordResetEmail(auth, resetEmail.trim());
      toast.success(`Wachtwoord reset e-mail verzonden naar ${resetEmail.trim()}`);
      setShowForgotModal(false);
    } catch (error: any) {
      toast.error(error?.message || 'Fout bij verzenden van reset e-mail');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <>
      <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-bg-main p-4">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[-10%] top-[-10%] h-[40%] w-[40%] rounded-full bg-brand/5 blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] h-[40%] w-[40%] rounded-full bg-brand/5 blur-[120px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 w-full max-w-md"
        >
          <div className="mb-8 text-center">
            <div className="mb-6 flex justify-center">
              <div className="relative flex h-28 w-28 items-center justify-center rounded-[2rem] border border-white/[0.04] bg-surface-soft/80 shadow-[0_8px_30px_rgba(0,0,0,0.25)] md:h-32 md:w-32">
                <div className="absolute inset-0 rounded-[2rem] bg-brand/10 blur-2xl opacity-40" />
                <img
                  src={logoSrc}
                  alt="CatchRank logo"
                  className="relative z-10 h-20 w-20 object-contain md:h-24 md:w-24"
                  draggable={false}
                />
              </div>
            </div>

            <h1 className="mb-2 text-4xl font-krub font-bold uppercase tracking-tight text-brand">
              CatchRank
            </h1>

            <p className="mb-3 text-sm font-black uppercase tracking-[0.28em] text-text-muted">
              Log. Groei. Vang meer.
            </p>

            <p className="mx-auto max-w-sm text-base font-medium leading-relaxed text-text-secondary">
              Houd je vangsten bij, ontdek wat werkt en haal meer uit je sessies — solo of samen met andere vissers.
            </p>

            <div className="mt-5 flex flex-wrap justify-center gap-2.5">
              <span className="rounded-full border border-white/[0.06] bg-surface-soft/70 px-3 py-1.5 text-[11px] font-bold text-text-muted">
                Vislogboek & statistieken
              </span>
              <span className="rounded-full border border-white/[0.06] bg-surface-soft/70 px-3 py-1.5 text-[11px] font-bold text-text-muted">
                Inzichten & tools
              </span>
              <span className="rounded-full border border-white/[0.06] bg-surface-soft/70 px-3 py-1.5 text-[11px] font-bold text-text-muted">
                XP, rankings & clubs
              </span>
            </div>
          </div>

          <Card className="rounded-[2.5rem] border border-border-subtle bg-surface-card/80 p-8 shadow-2xl backdrop-blur-xl">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-text-muted">
                    Email Adres
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-2xl border border-border-subtle bg-bg-main py-3.5 pl-12 pr-4 text-sm text-text-primary transition-all focus:border-brand focus:outline-none"
                      placeholder="naam@voorbeeld.nl"
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-text-muted">
                    Wachtwoord
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-2xl border border-border-subtle bg-bg-main py-3.5 pl-12 pr-12 text-sm text-text-primary transition-all focus:border-brand focus:outline-none"
                      placeholder="••••••••"
                      autoComplete={isRegister ? 'new-password' : 'current-password'}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted transition-colors hover:text-text-primary"
                      aria-label={showPassword ? 'Verberg wachtwoord' : 'Toon wachtwoord'}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <label className="flex cursor-pointer select-none items-center gap-3">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="sr-only"
                  />
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-md border transition-all ${
                      rememberMe
                        ? 'border-brand bg-brand'
                        : 'border-border-subtle bg-bg-main'
                    }`}
                  >
                    {rememberMe && <span className="h-2 w-2 rounded-sm bg-bg-main" />}
                  </span>
                  <span className="text-xs font-bold text-text-muted">
                    Onthoud mij
                  </span>
                </label>

                {!isRegister && (
                  <button
                    type="button"
                    className="text-xs font-bold text-text-muted transition-colors hover:text-brand"
                    onClick={openForgotModal}
                  >
                    Wachtwoord vergeten?
                  </button>
                )}
              </div>

              <Button
                type="submit"
                className="h-14 w-full rounded-2xl font-bold shadow-premium-accent"
                disabled={loading}
              >
                {loading ? (
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-bg-main border-t-transparent" />
                ) : (
                  <>{isRegister ? 'Account Aanmaken' : 'Inloggen'}</>
                )}
              </Button>
            </form>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border-subtle" />
              </div>
              <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest">
                <span className="bg-surface-card px-4 text-text-dim">
                  Of ga verder met
                </span>
              </div>
            </div>

            <Button
              variant="secondary"
              onClick={handleGoogleLogin}
              className="h-14 w-full rounded-2xl border border-border-subtle font-bold"
              disabled={loading}
            >
              <img
                src="https://www.google.com/favicon.ico"
                alt="Google"
                className="mr-3 h-4 w-4"
              />
              Google
            </Button>

            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={() => setIsRegister(!isRegister)}
                className="text-xs font-bold text-text-muted transition-colors hover:text-brand"
              >
                {isRegister
                  ? 'Heb je al een account? Log in'
                  : 'Nog geen account? Registreer nu'}
              </button>
            </div>
          </Card>

          <div className="mt-12 flex items-center justify-center gap-6 text-[10px] font-black uppercase tracking-widest text-text-dim">
            <a href="#" className="transition-colors hover:text-text-muted">
              Privacy
            </a>
            <div className="h-1 w-1 rounded-full bg-border-subtle" />
            <a href="#" className="transition-colors hover:text-text-muted">
              Voorwaarden
            </a>
            <div className="h-1 w-1 rounded-full bg-border-subtle" />
            <a href="#" className="transition-colors hover:text-text-muted">
              Support
            </a>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {showForgotModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => !resetLoading && setShowForgotModal(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              className="relative w-full max-w-md"
            >
              <Card className="rounded-[2rem] border border-border-subtle bg-surface-card p-7 shadow-2xl">
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10">
                      <KeyRound className="h-6 w-6 text-brand" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold tracking-tight text-text-primary">
                        Wachtwoord resetten
                      </h3>
                      <p className="text-sm text-text-secondary">
                        We sturen je een resetlink per e-mail.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => !resetLoading && setShowForgotModal(false)}
                    className="text-text-muted transition-colors hover:text-text-primary"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handlePasswordReset} className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-text-muted">
                      Email Adres
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                      <input
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        className="w-full rounded-2xl border border-border-subtle bg-bg-main py-3.5 pl-12 pr-4 text-sm text-text-primary transition-all focus:border-brand focus:outline-none"
                        placeholder="naam@voorbeeld.nl"
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-12 flex-1 rounded-2xl font-bold"
                      onClick={() => setShowForgotModal(false)}
                      disabled={resetLoading}
                    >
                      Annuleren
                    </Button>

                    <Button
                      type="submit"
                      className="h-12 flex-[1.2] rounded-2xl font-bold shadow-premium-accent"
                      disabled={resetLoading}
                    >
                      {resetLoading ? (
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-bg-main border-t-transparent" />
                      ) : (
                        'Versturen'
                      )}
                    </Button>
                  </div>
                </form>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
