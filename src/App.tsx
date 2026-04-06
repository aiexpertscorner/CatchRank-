import React, { createContext, useContext, useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import {
  onAuthStateChanged,
  User,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { UserProfile } from './types';
import { AppShell } from './components/layout/AppShell';
import { Toaster } from 'sonner';

// Feature-based Screens
import Dashboard from './features/dashboard/screens/Dashboard';
import Login from './features/auth/screens/Login';
import Onboarding from './features/auth/screens/Onboarding';
import Profile from './features/auth/screens/Profile';
import Settings from './features/auth/screens/Settings';
import Catches from './features/logging/screens/Catches';
import CatchDetail from './features/logging/screens/CatchDetail';
import Sessions from './features/logging/screens/Sessions';
import SessionDetail from './features/logging/screens/SessionDetail';
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

import { SessionProvider } from './contexts/SessionContext';

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

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      setUser(firebaseUser);

      if (!firebaseUser) {
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        const ref = doc(db, 'users', firebaseUser.uid);
        const userDoc = await getDoc(ref);

        if (userDoc.exists()) {
          setProfile(userDoc.data() as UserProfile);
        } else {
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

          await setDoc(ref, newProfile);
          setProfile(newProfile);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);

        // Safe fallback so routing/auth flow does not get stuck
        setProfile({
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName || 'Visser',
          email: firebaseUser.email || '',
          photoURL: firebaseUser.photoURL || undefined,
          xp: 0,
          level: 1,
          onboardingStatus: 'welcome',
          createdAt: null as any,
        });
      } finally {
        setLoading(false);
      }
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
      setProfile(null);
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;

    setProfile((prev) => (prev ? { ...prev, ...data } : null));

    try {
      await setDoc(
        doc(db, 'users', user.uid),
        {
          uid: user.uid,
          email: user.email || '',
          ...data,
        },
        { merge: true }
      );
    } catch (error) {
      console.error('Profile sync to Firestore failed:', error);
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

  const showOnboarding = Boolean(user && profile && profile.onboardingStatus !== 'complete');

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        loginWithGoogle,
        loginWithEmail,
        registerWithEmail,
        logout,
        updateProfile,
      }}
    >
      <SessionProvider>
        <Toaster position="top-right" richColors closeButton />
        <Router>
          <Routes>
            <Route path="/login" element={!user ? <Login /> : <Navigate to="/" replace />} />

            <Route
              path="/onboarding"
              element={
                user ? (
                  profile?.onboardingStatus === 'complete' ? (
                    <Navigate to="/" replace />
                  ) : (
                    <Onboarding />
                  )
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />

            <Route
              element={
                user ? (
                  showOnboarding ? <Navigate to="/onboarding" replace /> : <AppShell />
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            >
              <Route path="/" element={<Dashboard />} />
              <Route path="/catches" element={<Catches />} />
              <Route path="/catches/:id" element={<CatchDetail />} />
              <Route path="/sessions" element={<Sessions />} />
              <Route path="/sessions/:id" element={<SessionDetail />} />
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
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </Router>
      </SessionProvider>
    </AuthContext.Provider>
  );
}