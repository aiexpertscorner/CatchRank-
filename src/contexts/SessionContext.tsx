import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  limit,
  doc,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../App';
import { Session } from '../types';
import { toast } from 'sonner';
import { xpService } from '../services/xpService';

interface SessionContextType {
  activeSession: Session | null;
  loading: boolean;
  endActiveSession: () => Promise<void>;
  pauseActiveSession: () => Promise<void>;
  resumeActiveSession: () => Promise<void>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

const SESSIONS_COLLECTION = 'sessions_v2';

const getSessionOwnerId = (session: Partial<Session> | null | undefined): string | undefined => {
  if (!session) return undefined;
  return (
    (session as any).createdBy ||
    (session as any).userId ||
    (session as any).ownerUserId
  );
};

const isSessionPaused = (session: Partial<Session> | null | undefined): boolean => {
  if (!session) return false;
  return (session as any).status === 'paused';
};

const isSessionLive = (session: Partial<Session> | null | undefined): boolean => {
  if (!session) return false;
  return (session as any).isActive === true && !isSessionPaused(session);
};

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
    if (!profile?.uid) {
      setActiveSession(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    /**
     * v2 truth:
     * - collection: sessions_v2
     * - active state: isActive === true
     * - participant field: participantIds
     */
    const q = query(
      collection(db, SESSIONS_COLLECTION),
      where('participantIds', 'array-contains', profile.uid),
      where('isActive', '==', true),
      limit(1)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const sessionDoc = snapshot.docs[0];
          setActiveSession({ id: sessionDoc.id, ...sessionDoc.data() } as Session);
        } else {
          setActiveSession(null);
        }
        setLoading(false);
      },
      (error) => {
        console.error('Session listener error:', error);
        setActiveSession(null);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [profile?.uid]);

  const endActiveSession = async () => {
    if (!activeSession || !profile?.uid || !activeSession.id) return;

    try {
      await updateDoc(doc(db, SESSIONS_COLLECTION, activeSession.id), {
        isActive: false,
        status: 'completed', // compatibility field for older UI
        endTime: Timestamp.now(),
        updatedAt: Timestamp.now(),
        lastActivityAt: Timestamp.now(),
      });

      toast.success('Sessie beëindigd en opgeslagen!');

      const ownerId = getSessionOwnerId(activeSession);
      if (ownerId === profile.uid) {
        const SESSION_COMPLETION_XP = 50;
        xpService.addXpToUser(profile.uid, SESSION_COMPLETION_XP).catch((err) =>
          console.error('XP award failed (endActiveSession):', err)
        );
      }
    } catch (error) {
      console.error('End session error:', error);
      toast.error('Fout bij beëindigen van sessie.');
    }
  };

  const pauseActiveSession = async () => {
    if (!activeSession?.id || !isSessionLive(activeSession)) return;

    try {
      await updateDoc(doc(db, SESSIONS_COLLECTION, activeSession.id), {
        isActive: true,
        status: 'paused', // compatibility + explicit paused state
        updatedAt: Timestamp.now(),
        lastActivityAt: Timestamp.now(),
      });

      toast.info('Sessie gepauzeerd.');
    } catch (error) {
      console.error('Pause session error:', error);
      toast.error('Fout bij pauzeren van sessie.');
    }
  };

  const resumeActiveSession = async () => {
    if (!activeSession?.id || !isSessionPaused(activeSession)) return;

    try {
      await updateDoc(doc(db, SESSIONS_COLLECTION, activeSession.id), {
        isActive: true,
        status: 'live', // compatibility field
        updatedAt: Timestamp.now(),
        lastActivityAt: Timestamp.now(),
      });

      toast.success('Sessie hervat!');
    } catch (error) {
      console.error('Resume session error:', error);
      toast.error('Fout bij hervatten van sessie.');
    }
  };

  return (
    <SessionContext.Provider
      value={{
        activeSession,
        loading,
        endActiveSession,
        pauseActiveSession,
        resumeActiveSession,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
};