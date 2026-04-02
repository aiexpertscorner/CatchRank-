import React, { createContext, useContext, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, User, signInWithPopup, GoogleAuthProvider, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile } from './types';
import { AppShell } from './components/layout/AppShell';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Onboarding from './pages/Onboarding';
import Catches from './pages/Catches';
import Sessions from './pages/Sessions';
import Spots from './pages/Spots';
import Stats from './pages/Stats';
import Rankings from './pages/Rankings';
import Clubs from './pages/Clubs';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Gear from './pages/Gear';
import Tools from './pages/Tools';
import Knowledge from './pages/Knowledge';
import WeatherForecast from './pages/tools/WeatherForecast';
import { AskDick } from './pages/AskDick';
import { Toaster } from 'sonner';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
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

  // --- AUTH BYPASS FOR DEV ---
  const BYPASS_AUTH = true; // Set to false to re-enable real auth
  const MOCK_USER = { uid: 'dev-user-123', email: 'visser@catchrank.nl', displayName: 'Test Visser' } as User;
  const MOCK_PROFILE: UserProfile = {
    uid: 'dev-user-123',
    displayName: 'Test Visser',
    email: 'visser@catchrank.nl',
    xp: 1250,
    level: 12,
    onboardingStatus: 'complete',
    createdAt: new Date(),
    stats: {
      totalCatches: 42,
      totalSessions: 18,
      totalSpots: 7,
      speciesCount: 5
    }
  };
  // ----------------------------

  useEffect(() => {
    if (BYPASS_AUTH) {
      setUser(MOCK_USER);
      setProfile(MOCK_PROFILE);
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
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
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Sign in error:', error);
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
    if (BYPASS_AUTH) {
      setProfile(prev => prev ? { ...prev, ...data } : null);
      return;
    }
    try {
      await updateDoc(doc(db, 'users', user.uid), data);
      setProfile(prev => prev ? { ...prev, ...data } : null);
    } catch (error) {
      console.error('Update profile error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-main">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand"></div>
      </div>
    );
  }

  const showOnboarding = user && profile && profile.onboardingStatus !== 'complete';

  return (
    <AuthContext.Provider value={{ user, profile, loading, signInWithGoogle, logout, updateProfile }}>
      <Toaster position="top-right" richColors closeButton />
      <Router>
        <Routes>
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
          
          {/* Onboarding Route */}
          <Route path="/onboarding" element={user ? (profile?.onboardingStatus === 'complete' ? <Navigate to="/" /> : <Onboarding />) : <Navigate to="/login" />} />

          <Route element={user ? (showOnboarding ? <Navigate to="/onboarding" /> : <AppShell />) : <Navigate to="/login" />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/catches" element={<Catches />} />
            <Route path="/sessions" element={<Sessions />} />
            <Route path="/spots" element={<Spots />} />
            <Route path="/stats" element={<Stats />} />
            <Route path="/rankings" element={<Rankings />} />
            <Route path="/clubs" element={<Clubs />} />
            <Route path="/ask-dick" element={<AskDick />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/gear" element={<Gear />} />
            <Route path="/tools" element={<Tools />} />
            <Route path="/tools/weather-forecast" element={<WeatherForecast />} />
            <Route path="/knowledge" element={<Knowledge />} />
          </Route>
        </Routes>
      </Router>
    </AuthContext.Provider>
  );
}

