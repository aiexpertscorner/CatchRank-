import React, { createContext, useContext, useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { 
  onAuthStateChanged, 
  User, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { UserProfile } from './types';
import { AppShell } from './components/layout/AppShell';
import { Toaster } from 'sonner';
import { ENV } from './config/env';

// Feature-based Screens
import Dashboard from './features/dashboard/screens/Dashboard';
import Login from './features/auth/screens/Login';
import Onboarding from './features/auth/screens/Onboarding';
import Profile from './features/auth/screens/Profile';
import Settings from './features/auth/screens/Settings';
import Catches from './features/logging/screens/Catches';
import Sessions from './features/logging/screens/Sessions';
import Spots from './features/spots/screens/Spots';
import SpotDetail from './features/spots/screens/SpotDetail';
import Gear from './features/gear/screens/Gear';
import Rankings from './features/community/screens/Rankings';
import Clubs from './features/community/screens/Clubs';
import Stats from './features/stats/screens/Stats';
import Knowledge from './features/knowledge/screens/Knowledge';
import Tools from './features/tools/screens/Tools';
import AskDick from './features/tools/screens/AskDick';
import WeatherForecast from './features/weather/screens/WeatherForecast';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

import { SessionProvider } from './contexts/SessionContext';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            setProfile(userDoc.data() as UserProfile);
          } else {
            // Create initial profile
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName || 'Visser',
              email: firebaseUser.email || '',
              photoURL: firebaseUser.photoURL || undefined,
              xp: 0,
              level: 1,
              onboardingStatus: 'welcome',
              createdAt: serverTimestamp(),
            };
            await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
            setProfile(newProfile);
          }
        } catch (error) {
          console.error("Error fetching profile:", error);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  const loginWithEmail = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const registerWithEmail = async (email: string, password: string) => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), data);
      setProfile(prev => prev ? { ...prev, ...data } : null);
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-main">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand shadow-[0_0_15px_rgba(244,194,13,0.3)]"></div>
      </div>
    );
  }

  const showOnboarding = user && profile && profile.onboardingStatus !== 'complete';

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      loading, 
      loginWithGoogle, 
      loginWithEmail, 
      registerWithEmail, 
      logout, 
      updateProfile 
    }}>
      <SessionProvider>
        <Toaster position="top-right" richColors closeButton />
        <Router basename="/CatchRank-/">
          <Routes>
            <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
            
            {/* Onboarding Route */}
            <Route path="/onboarding" element={user ? (profile?.onboardingStatus === 'complete' ? <Navigate to="/" /> : <Onboarding />) : <Navigate to="/login" />} />

            <Route element={user ? (showOnboarding ? <Navigate to="/onboarding" /> : <AppShell />) : <Navigate to="/login" />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/catches" element={<Catches />} />
              <Route path="/sessions" element={<Sessions />} />
              <Route path="/spots" element={<Spots />} />
              <Route path="/spots/:id" element={<SpotDetail />} />
              <Route path="/stats" element={<Stats />} />
              <Route path="/rankings" element={<Rankings />} />
              <Route path="/clubs" element={<Clubs />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/gear" element={<Gear />} />
              <Route path="/tools" element={<Tools />} />
              <Route path="/tools/ask-dick" element={<AskDick />} />
              <Route path="/tools/weather" element={<WeatherForecast />} />
              <Route path="/knowledge" element={<Knowledge />} />
              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" />} />
            </Route>
          </Routes>
        </Router>
      </SessionProvider>
    </AuthContext.Provider>
  );
}

