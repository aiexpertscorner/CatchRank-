import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Fish, LogIn, Mail, Lock, AlertCircle, ChevronRight } from 'lucide-react';
import { useAuth } from '../../../App';
import { Button, Card } from '../../../components/ui/Base';
import { toast } from 'sonner';

/**
 * Login Screen
 * Part of the 'auth' feature module.
 * Handles user authentication via Google or Email.
 */

export default function Login() {
  const { loginWithGoogle, loginWithEmail, registerWithEmail } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isRegister) {
        await registerWithEmail(email, password);
        toast.success('Account aangemaakt!');
      } else {
        await loginWithEmail(email, password);
        toast.success('Welkom terug!');
      }
    } catch (error: any) {
      toast.error(error.message || 'Fout bij inloggen');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await loginWithGoogle();
      toast.success('Welkom bij CatchRank!');
    } catch (error: any) {
      toast.error(error.message || 'Fout bij inloggen met Google');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-main flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Accents */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand/5 blur-[120px] rounded-full" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-surface-card rounded-[2rem] border border-border-subtle shadow-2xl mb-6 relative group">
            <div className="absolute inset-0 bg-brand/10 blur-xl group-hover:bg-brand/20 transition-all rounded-full" />
            <Fish className="w-10 h-10 text-brand relative z-10" />
          </div>
          <h1 className="text-4xl font-krub font-bold text-text-primary tracking-tight uppercase mb-2">CatchRank</h1>
          <p className="text-text-secondary font-medium">Log je vangsten, verbeter je skills.</p>
        </div>

        <Card className="p-8 border border-border-subtle bg-surface-card/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Email Adres</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-bg-main border border-border-subtle rounded-2xl pl-12 pr-4 py-3.5 text-sm text-text-primary focus:outline-none focus:border-brand transition-all"
                    placeholder="naam@voorbeeld.nl"
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Wachtwoord</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-bg-main border border-border-subtle rounded-2xl pl-12 pr-4 py-3.5 text-sm text-text-primary focus:outline-none focus:border-brand transition-all"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-14 rounded-2xl font-bold shadow-premium-accent"
              disabled={loading}
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-bg-main border-t-transparent rounded-full animate-spin" />
              ) : (
                <>{isRegister ? 'Account Aanmaken' : 'Inloggen'}</>
              )}
            </Button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border-subtle"></div>
            </div>
            <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest">
              <span className="bg-surface-card px-4 text-text-dim">Of ga verder met</span>
            </div>
          </div>

          <Button
            variant="secondary"
            onClick={handleGoogleLogin}
            className="w-full h-14 rounded-2xl font-bold border border-border-subtle"
            disabled={loading}
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4 mr-3" />
            Google
          </Button>

          <div className="mt-8 text-center">
            <button
              onClick={() => setIsRegister(!isRegister)}
              className="text-xs font-bold text-text-muted hover:text-brand transition-colors"
            >
              {isRegister ? 'Heb je al een account? Log in' : 'Nog geen account? Registreer nu'}
            </button>
          </div>
        </Card>

        <div className="mt-12 flex items-center justify-center gap-6 text-[10px] font-black text-text-dim uppercase tracking-widest">
          <a href="#" className="hover:text-text-muted transition-colors">Privacy</a>
          <div className="w-1 h-1 bg-border-subtle rounded-full" />
          <a href="#" className="hover:text-text-muted transition-colors">Voorwaarden</a>
          <div className="w-1 h-1 bg-border-subtle rounded-full" />
          <a href="#" className="hover:text-text-muted transition-colors">Support</a>
        </div>
      </motion.div>
    </div>
  );
}
