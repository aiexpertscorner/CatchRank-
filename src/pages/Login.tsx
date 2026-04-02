import React, { useState } from 'react';
import { Fish, Mail, Lock, User, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../App';
import { motion, AnimatePresence } from 'motion/react';
import { auth } from '../firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { toast } from 'sonner';
import { Button } from '../components/ui/Base';

type AuthMode = 'login' | 'register' | 'reset';

export default function Login() {
  const { signInWithGoogle } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'register') {
        await createUserWithEmailAndPassword(auth, email, password);
        toast.success('Account aangemaakt!');
      } else if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success('Welkom terug!');
      } else if (mode === 'reset') {
        await sendPasswordResetEmail(auth, email);
        toast.success('Wachtwoord reset email verzonden!');
        setMode('login');
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      toast.error(error.message || 'Er is iets misgegaan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-main flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-brand rounded-2xl flex items-center justify-center shadow-2xl shadow-brand/20 mx-auto mb-6 rotate-3">
            <Fish className="text-bg-main w-10 h-10" />
          </div>
          <h1 className="text-4xl font-display font-bold text-text-primary mb-2 tracking-tight">CatchRank</h1>
          <p className="text-text-secondary">De slimme webapp voor sportvissers.</p>
        </div>

        <div className="card p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              <h2 className="text-2xl font-bold mb-6 text-center">
                {mode === 'login' && 'Welkom terug!'}
                {mode === 'register' && 'Maak een account'}
                {mode === 'reset' && 'Wachtwoord vergeten?'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'register' && (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-text-muted uppercase tracking-wider ml-1">Naam</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Je volledige naam"
                        className="w-full bg-surface-soft border border-border-subtle rounded-xl py-3 pl-10 pr-4 text-text-primary focus:border-brand outline-none transition-all"
                        required
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-wider ml-1">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="visser@voorbeeld.nl"
                      className="w-full bg-surface-soft border border-border-subtle rounded-xl py-3 pl-10 pr-4 text-text-primary focus:border-brand outline-none transition-all"
                      required
                    />
                  </div>
                </div>

                {mode !== 'reset' && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between ml-1">
                      <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Wachtwoord</label>
                      {mode === 'login' && (
                        <button 
                          type="button"
                          onClick={() => setMode('reset')}
                          className="text-[10px] font-bold text-brand uppercase tracking-widest hover:underline"
                        >
                          Vergeten?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-surface-soft border border-border-subtle rounded-xl py-3 pl-10 pr-4 text-text-primary focus:border-brand outline-none transition-all"
                        required
                        minLength={6}
                      />
                    </div>
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full h-12 text-base font-bold"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      {mode === 'login' && 'Inloggen'}
                      {mode === 'register' && 'Registreren'}
                      {mode === 'reset' && 'Reset link versturen'}
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              </form>

              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border-subtle"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-surface-card px-2 text-text-muted font-bold tracking-widest">Of ga verder met</span>
                </div>
              </div>

              <button 
                onClick={signInWithGoogle}
                className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 text-slate-900 font-bold py-3 px-6 rounded-xl transition-all shadow-sm active:scale-[0.98]"
              >
                <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                Google
              </button>

              <div className="mt-8 text-center">
                {mode === 'login' ? (
                  <p className="text-sm text-text-secondary">
                    Nog geen account?{' '}
                    <button onClick={() => setMode('register')} className="text-brand font-bold hover:underline">
                      Registreer hier
                    </button>
                  </p>
                ) : (
                  <p className="text-sm text-text-secondary">
                    Al een account?{' '}
                    <button onClick={() => setMode('login')} className="text-brand font-bold hover:underline">
                      Log hier in
                    </button>
                  </p>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <p className="mt-8 text-[10px] text-text-muted text-center leading-relaxed uppercase tracking-widest font-bold">
          Door in te loggen ga je akkoord met onze <br />
          <span className="underline cursor-pointer">Voorwaarden</span> & <span className="underline cursor-pointer">Privacy</span>
        </p>
      </motion.div>
    </div>
  );
}
