import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  limit,
  doc,
  updateDoc,
  Timestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../App';
import { Session } from '../types';
import { toast } from 'sonner';

interface SessionContextType {
  activeSession: Session | null;
  loading: boolean;
  endActiveSession: () => Promise<void>;
  pauseActiveSession: () => Promise<void>;
  resumeActiveSession: () => Promise<void>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession must be used within SessionProvider');
  return context;
};

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile } = useAuth();
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) {
      setActiveSession(null);
      setLoading(false);
      return;
    }

    // Query for sessions where user is a participant and status is 'live' or 'paused'
    const q = query(
      collection(db, 'sessions'),
      where('participantUserIds', 'array-contains', profile.uid),
      where('status', 'in', ['live', 'paused']),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const sessionDoc = snapshot.docs[0];
        setActiveSession({ id: sessionDoc.id, ...sessionDoc.data() } as Session);
      } else {
        setActiveSession(null);
      }
      setLoading(false);
    }, (error) => {
      console.error('Session listener error:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile]);

  const endActiveSession = async () => {
    if (!activeSession) return;
    try {
      await updateDoc(doc(db, 'sessions', activeSession.id!), {
        status: 'completed',
        endedAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      toast.success('Sessie beëindigd en opgeslagen!');
    } catch (error) {
      console.error('End session error:', error);
      toast.error('Fout bij beëindigen van sessie.');
    }
  };

  const pauseActiveSession = async () => {
    if (!activeSession || activeSession.status !== 'live') return;
    try {
      await updateDoc(doc(db, 'sessions', activeSession.id!), {
        status: 'paused',
        updatedAt: Timestamp.now()
      });
      toast.info('Sessie gepauzeerd.');
    } catch (error) {
      console.error('Pause session error:', error);
      toast.error('Fout bij pauzeren van sessie.');
    }
  };

  const resumeActiveSession = async () => {
    if (!activeSession || activeSession.status !== 'paused') return;
    try {
      await updateDoc(doc(db, 'sessions', activeSession.id!), {
        status: 'live',
        updatedAt: Timestamp.now()
      });
      toast.success('Sessie hervat!');
    } catch (error) {
      console.error('Resume session error:', error);
      toast.error('Fout bij hervatten van sessie.');
    }
  };

  return (
    <SessionContext.Provider value={{ 
      activeSession, 
      loading, 
      endActiveSession, 
      pauseActiveSession, 
      resumeActiveSession 
    }}>
      {children}
    </SessionContext.Provider>
  );
};
