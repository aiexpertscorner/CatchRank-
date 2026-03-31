import React from 'react';
import { Fish, LogIn } from 'lucide-react';
import { useAuth } from '../App';
import { motion } from 'motion/react';

export default function Login() {
  const { signIn } = useAuth();

  return (
    <div className="min-h-screen bg-bg-main flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-brand-blue rounded-3xl flex items-center justify-center shadow-2xl shadow-brand-blue/30 mx-auto mb-6 rotate-3">
            <Fish className="text-white w-12 h-12" />
          </div>
          <h1 className="text-4xl font-display font-bold text-text-primary mb-2 tracking-tight">CatchRank</h1>
          <p className="text-text-secondary">De slimme webapp voor sportvissers.</p>
        </div>

        <div className="card p-8 text-center">
          <h2 className="text-xl font-bold mb-6">Welkom terug!</h2>
          <p className="text-text-secondary mb-8">
            Log in om je vangsten te beheren, je statistieken te bekijken en te stijgen in de rankings.
          </p>
          
          <button 
            onClick={signIn}
            className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 hover:bg-slate-50 text-text-primary font-bold py-3 px-6 rounded-xl transition-all shadow-sm active:scale-[0.98]"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
            Inloggen met Google
          </button>

          <p className="mt-8 text-xs text-text-muted leading-relaxed">
            Door in te loggen ga je akkoord met onze <br />
            <span className="underline cursor-pointer">Algemene Voorwaarden</span> en <span className="underline cursor-pointer">Privacybeleid</span>.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-brand-blue font-bold text-lg">10k+</div>
            <div className="text-[10px] text-text-muted uppercase tracking-wider font-bold">Vangsten</div>
          </div>
          <div>
            <div className="text-brand-blue font-bold text-lg">500+</div>
            <div className="text-[10px] text-text-muted uppercase tracking-wider font-bold">Clubs</div>
          </div>
          <div>
            <div className="text-brand-blue font-bold text-lg">24/7</div>
            <div className="text-[10px] text-text-muted uppercase tracking-wider font-bold">Support</div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
