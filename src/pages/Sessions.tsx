import React, { useEffect, useState } from 'react';
import { 
  Plus, 
  History, 
  Clock, 
  Fish, 
  MapPin, 
  ChevronRight, 
  Play, 
  Square,
  Calendar,
  MoreVertical,
  Edit2,
  Trash2,
  CheckCircle2,
  CloudSun
} from 'lucide-react';
import { useAuth } from '../App';
import { collection, query, where, orderBy, onSnapshot, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Session } from '../types';
import { format, formatDistanceToNow } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Button, Card, Badge } from '../components/ui/Base';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Navigation';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '../components/ui/Navigation';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { PageHeader, PageLayout } from '../components/layout/PageLayout';
import { cn } from '../lib/utils';

import { SessionModal } from '../components/SessionModal';

export default function Sessions() {
  const { profile } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);

  useEffect(() => {
    if (!profile) return;

    const sessionsQuery = query(
      collection(db, 'sessions'),
      where('userId', '==', profile.uid),
      orderBy('startTime', 'desc')
    );

    const unsubscribe = onSnapshot(sessionsQuery, (snapshot) => {
      setSessions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Session)));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile]);

  const handleEndSession = async (id: string) => {
    if (!window.confirm('Weet je zeker dat je deze sessie wilt beëindigen?')) return;
    
    try {
      await updateDoc(doc(db, 'sessions', id), {
        isActive: false,
        endTime: serverTimestamp()
      });
      toast.success('Sessie beëindigd!');
    } catch (error) {
      toast.error('Fout bij beëindigen sessie');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Weet je zeker dat je deze sessie wilt verwijderen?')) return;
    
    try {
      await deleteDoc(doc(db, 'sessions', id));
      toast.success('Sessie verwijderd');
    } catch (error) {
      toast.error('Fout bij verwijderen');
    }
  };

  const filteredSessions = sessions.filter(s => {
    if (activeTab === 'active') return s.isActive;
    return true;
  });

  const activeSessionsCount = sessions.filter(s => s.isActive).length;

  return (
    <PageLayout>
      <PageHeader 
        title="Vissessies"
        subtitle="Bekijk je geschiedenis of start een nieuwe sessie."
        badge="Sessies"
        actions={
          <Button 
            className="rounded-2xl h-12 md:h-14 px-6 md:px-8 font-bold text-base md:text-lg shadow-premium-accent transition-all hover:-translate-y-1 w-full md:w-auto" 
            onClick={() => setIsSessionModalOpen(true)} 
            icon={<Play className="w-5 md:w-6 h-5 md:h-6" />}
          >
            Start Nieuwe Sessie
          </Button>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mb-8 md:mb-12">
        <TabsList className="grid grid-cols-2 w-full md:w-80 bg-surface-soft/50 p-1.5 md:p-2 rounded-2xl md:rounded-[1.5rem] border border-border-subtle shadow-sm">
          <TabsTrigger value="all" className="rounded-xl font-black text-[10px] md:text-xs uppercase tracking-widest py-2.5 md:py-3">Geschiedenis</TabsTrigger>
          <TabsTrigger value="active" className="relative rounded-xl font-black text-[10px] md:text-xs uppercase tracking-widest py-2.5 md:py-3">
            Actief
            {activeSessionsCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 md:h-6 md:w-6 items-center justify-center rounded-full bg-brand text-[9px] md:text-[11px] font-black text-white shadow-lg border-2 border-white animate-pulse">
                {activeSessionsCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="space-y-6 md:space-y-10">
        {loading ? (
          <div className="space-y-6 md:space-y-8">
            {[1, 2, 3].map(i => (
              <Card key={i} className="h-36 md:h-44 animate-pulse bg-surface-soft/50 rounded-3xl md:rounded-[2.5rem] border-none" />
            ))}
          </div>
        ) : filteredSessions.length > 0 ? (
          <AnimatePresence mode="popLayout">
            {filteredSessions.map((s) => (
              <motion.div
                key={s.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              >
                <Card 
                  padding="none" 
                  hoverable 
                  variant="premium"
                  className={cn(
                    "group overflow-hidden border-none shadow-sm hover:shadow-premium transition-all duration-500 rounded-3xl md:rounded-[2.5rem]",
                    s.isActive && "ring-4 ring-brand/20 ring-offset-4 ring-offset-white"
                  )}
                >
                  <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-10 p-6 md:p-10">
                    <div className="flex-1 space-y-6 md:space-y-8">
                      <div className="flex items-center justify-between md:justify-start gap-4 md:gap-6">
                        <div className="flex items-center gap-4 md:gap-5">
                          <div className={cn(
                            "w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-[1.5rem] flex items-center justify-center shadow-inner transition-all duration-500",
                            s.isActive ? "bg-brand text-white shadow-premium-accent" : "bg-surface-soft text-text-muted"
                          )}>
                            {s.isActive ? <Play className="w-6 h-6 md:w-8 md:h-8 fill-current" /> : <History className="w-6 h-6 md:w-8 md:h-8" />}
                          </div>
                          <div>
                            <h3 className="text-xl md:text-3xl font-bold text-primary tracking-tight">
                              {s.isActive ? 'Huidige Sessie' : 'Sessie voltooid'}
                            </h3>
                            <p className="text-[9px] md:text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mt-0.5 md:mt-1">
                              {s.startTime ? format(s.startTime.toDate(), 'EEEE d MMMM', { locale: nl }) : 'Zojuist'}
                            </p>
                          </div>
                        </div>
                        {s.isActive && (
                          <Badge variant="brand" className="animate-pulse px-3 md:px-5 py-1 md:py-2 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] shadow-sm">
                            Live Sessie
                          </Badge>
                        )}
                        <div className="md:hidden">
                          <SessionActions session={s} onEnd={handleEndSession} onDelete={handleDelete} />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-10">
                        <div className="space-y-2 md:space-y-3">
                          <div className="flex items-center gap-2 md:gap-2.5 text-text-muted">
                            <Clock className="w-4 md:w-5 h-4 md:h-5 text-brand/60" />
                            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em]">Duur</span>
                          </div>
                          <p className="text-lg md:text-xl font-bold text-primary">
                            {s.isActive 
                              ? formatDistanceToNow(s.startTime.toDate(), { locale: nl, addSuffix: false })
                              : s.endTime && s.startTime 
                                ? formatDistanceToNow(s.startTime.toDate(), { locale: nl, addSuffix: false })
                                : 'Onbekend'}
                          </p>
                        </div>
                        <div className="space-y-2 md:space-y-3">
                          <div className="flex items-center gap-2 md:gap-2.5 text-text-muted">
                            <Fish className="w-4 md:w-5 h-4 md:h-5 text-brand/60" />
                            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em]">Vangsten</span>
                          </div>
                          <p className="text-lg md:text-xl font-bold text-primary">{s.catchIds?.length || 0} vissen</p>
                        </div>
                        <div className="space-y-2 md:space-y-3">
                          <div className="flex items-center gap-2 md:gap-2.5 text-text-muted">
                            <MapPin className="w-4 md:w-5 h-4 md:h-5 text-water/60" />
                            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em]">Locaties</span>
                          </div>
                          <p className="text-lg md:text-xl font-bold text-primary truncate">{s.spotIds?.length || 1} stekken</p>
                        </div>
                        {s.weather && (
                          <div className="space-y-2 md:space-y-3">
                            <div className="flex items-center gap-2 md:gap-2.5 text-water">
                              <CloudSun className="w-4 md:w-5 h-4 md:h-5" />
                              <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em]">Weer</span>
                            </div>
                            <p className="text-lg md:text-xl font-bold text-primary">{s.weather.temp_c}°C</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-4 md:gap-8 pt-6 md:pt-0 border-t md:border-t-0 border-border-subtle">
                      <div className="hidden md:block">
                        <SessionActions session={s} onEnd={handleEndSession} onDelete={handleDelete} />
                      </div>
                      <Button 
                        variant={s.isActive ? "primary" : "secondary"}
                        className={cn(
                          "flex-1 md:flex-none h-14 md:h-18 px-6 md:px-10 rounded-xl md:rounded-2xl text-base md:text-xl font-bold transition-all duration-500",
                          s.isActive ? "shadow-premium-accent hover:-translate-y-1" : "hover:bg-surface-soft border-border-subtle"
                        )}
                        onClick={() => s.isActive ? handleEndSession(s.id!) : null}
                      >
                        {s.isActive ? (
                          <>
                            <Square className="w-5 md:w-6 h-5 md:h-6 mr-3 md:mr-4 fill-current" />
                            Beëindigen
                          </>
                        ) : (
                          <>
                            Details
                            <ChevronRight className="w-5 md:w-6 h-5 md:h-6 ml-3 md:ml-4" />
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        ) : (
          <Card variant="premium" className="p-16 md:p-32 text-center border-dashed border-2 border-border-subtle bg-surface-soft/20 rounded-3xl md:rounded-[4rem]">
            <div className="w-24 md:w-32 h-24 md:h-32 bg-white rounded-2xl md:rounded-[2.5rem] shadow-premium flex items-center justify-center mx-auto mb-8 md:mb-10">
              <History className="w-12 md:w-16 h-12 md:h-16 text-brand/30" />
            </div>
            <h3 className="text-2xl md:text-4xl font-bold mb-3 md:mb-4 text-primary tracking-tight">Geen sessies gevonden</h3>
            <p className="text-text-secondary mb-8 md:mb-12 max-w-lg mx-auto text-base md:text-xl leading-relaxed">
              {activeTab === 'active' 
                ? "Je hebt op dit moment geen actieve sessie. Tijd om te gaan vissen!" 
                : "Je hebt nog geen vissessies gelogd. Start je eerste sessie om je voortgang bij te houden."}
            </p>
            <Button className="h-16 md:h-20 px-8 md:px-12 text-lg md:text-2xl rounded-2xl shadow-premium-accent font-bold transition-all hover:-translate-y-1" onClick={() => setIsSessionModalOpen(true)} icon={<Play className="w-6 md:w-8 h-6 md:h-8" />}>Start Eerste Sessie</Button>
          </Card>
        )}
      </div>

      <SessionModal isOpen={isSessionModalOpen} onClose={() => setIsSessionModalOpen(false)} />
    </PageLayout>
  );
}

function SessionActions({ session, onEnd, onDelete }: { session: Session, onEnd: (id: string) => void, onDelete: (id: string) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-10 w-10 p-0 rounded-full hover:bg-surface-soft">
          <MoreVertical className="w-5 h-5 text-text-muted" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="rounded-2xl p-2 shadow-premium border-border-subtle min-w-[180px]">
        <DropdownMenuItem className="gap-3 p-3 rounded-xl font-bold text-sm">
          <Edit2 className="w-4 h-4 text-accent" />
          Bewerken
        </DropdownMenuItem>
        {session.isActive && (
          <DropdownMenuItem className="gap-3 p-3 rounded-xl font-bold text-sm" onClick={() => session.id && onEnd(session.id)}>
            <Square className="w-4 h-4 text-accent" />
            Beëindigen
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator className="my-2" />
        <DropdownMenuItem 
          variant="danger" 
          className="gap-3 p-3 rounded-xl font-bold text-sm"
          onClick={() => session.id && onDelete(session.id)}
        >
          <Trash2 className="w-4 h-4" />
          Verwijderen
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
