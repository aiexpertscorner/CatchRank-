import React, { useEffect, useState } from 'react';
import { 
  Plus, 
  MapPin, 
  Lock, 
  Globe, 
  ChevronRight, 
  Waves, 
  Fish, 
  MoreVertical,
  Edit2,
  Trash2,
  Search
} from 'lucide-react';
import { useAuth } from '../App';
import { collection, query, where, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { Spot } from '../types';
import { Button, Card, Badge } from '../components/ui/Base';
import { Input } from '../components/ui/Inputs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '../components/ui/Navigation';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { PageHeader, PageLayout } from '../components/layout/PageLayout';
import { SpotModal } from '../components/SpotModal';

export default function Spots() {
  const { profile } = useAuth();
  const [spots, setSpots] = useState<Spot[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSpotModalOpen, setIsSpotModalOpen] = useState(false);
  const [editingSpot, setEditingSpot] = useState<Spot | undefined>(undefined);

  useEffect(() => {
    if (!profile) return;

    const spotsQuery = query(
      collection(db, 'spots'),
      where('userId', '==', profile.uid),
      orderBy('name', 'asc')
    );

    const unsubscribe = onSnapshot(spotsQuery, (snapshot) => {
      setSpots(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Spot)));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile]);

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'spots', id));
      toast.success('Stek verwijderd');
    } catch (error) {
      toast.error('Fout bij verwijderen');
    }
  };

  const filteredSpots = spots.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <PageLayout>
      <PageHeader 
        title="Mijn Stekken"
        subtitle="Beheer je favoriete visplekken en houd ze privé of deel ze."
        badge="Stekken"
        actions={
          <Button 
            className="rounded-2xl h-14 px-8 font-bold text-lg shadow-premium-accent transition-all hover:-translate-y-1"
            icon={<Plus className="w-6 h-6" />}
            onClick={() => {
              setEditingSpot(undefined);
              setIsSpotModalOpen(true);
            }}
          >
            Nieuwe Stek
          </Button>
        }
      />

      <div className="relative w-full lg:w-[32rem] mb-12 group">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-6 w-6 text-text-muted group-focus-within:text-accent transition-colors" />
        <Input 
          placeholder="Zoek op steknaam..." 
          className="pl-14 h-16 bg-white border-border-subtle rounded-[1.5rem] shadow-sm focus:border-accent focus:ring-4 focus:ring-accent/5 transition-all text-lg font-medium"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
        {loading ? (
          [1, 2, 3].map(i => (
            <Card key={i} className="h-72 animate-pulse bg-surface-soft/50 rounded-[2.5rem] border-none" />
          ))
        ) : filteredSpots.length > 0 ? (
          <AnimatePresence mode="popLayout">
            {filteredSpots.map((s) => (
              <motion.div
                key={s.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              >
                <Card padding="none" hoverable variant="premium" className="group h-full flex flex-col border-none shadow-sm hover:shadow-premium transition-all duration-500 rounded-[2.5rem] overflow-hidden">
                  <div className="p-10 flex-1 space-y-8">
                    <div className="flex items-start justify-between gap-6">
                      <div className="w-16 h-16 bg-water-soft text-water rounded-[1.5rem] flex items-center justify-center border border-water/10 group-hover:scale-110 transition-transform duration-500 shadow-sm">
                        <MapPin className="w-8 h-8" />
                      </div>
                      <div className="flex items-center gap-3">
                        {s.isPrivate ? (
                          <Badge variant="secondary" icon={<Lock className="w-3.5 h-3.5" />} className="px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] rounded-full">Privé</Badge>
                        ) : (
                          <Badge variant="accent" icon={<Globe className="w-3.5 h-3.5" />} className="px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] rounded-full">Openbaar</Badge>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-12 w-12 p-0 rounded-2xl hover:bg-surface-soft text-text-muted hover:text-primary transition-all shadow-sm">
                              <MoreVertical className="w-6 h-6" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-[1.5rem] p-3 shadow-premium border-border-subtle min-w-[200px]">
                            <DropdownMenuItem 
                              className="gap-4 p-4 rounded-xl font-bold text-base"
                              onClick={() => {
                                setEditingSpot(s);
                                setIsSpotModalOpen(true);
                              }}
                            >
                              <Edit2 className="w-5 h-5 text-accent" />
                              Bewerken
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="my-2" />
                            <DropdownMenuItem 
                              variant="danger" 
                              className="gap-4 p-4 rounded-xl font-bold text-base"
                              onClick={() => s.id && handleDelete(s.id)}
                            >
                              <Trash2 className="w-5 h-5" />
                              Verwijderen
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-3xl font-bold text-primary truncate tracking-tight">{s.name}</h3>
                      <p className="text-base text-text-secondary line-clamp-2 min-h-[3.5rem] leading-relaxed font-medium">
                        {s.description || 'Geen beschrijving toegevoegd.'}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-8 pt-2">
                      <div className="flex items-center gap-3 text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">
                        <Waves className="w-5 h-5 text-water/60" />
                        <span>{s.waterType || 'Onbekend'}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">
                        <Fish className="w-5 h-5 text-accent/60" />
                        <span>12 Vangsten</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="px-10 py-6 border-t border-border-subtle bg-surface-soft/30 group-hover:bg-accent group-hover:text-white transition-all duration-500">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">Bekijk details</span>
                      <ChevronRight className="w-6 h-6 transition-transform group-hover:translate-x-2" />
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        ) : (
          <div className="col-span-full">
            <Card variant="premium" className="p-32 text-center border-dashed border-2 border-border-subtle bg-surface-soft/20 rounded-[4rem]">
              <div className="w-32 h-32 bg-white rounded-[2.5rem] shadow-premium flex items-center justify-center mx-auto mb-10 group-hover:scale-110 transition-transform duration-500">
                <MapPin className="w-16 h-16 text-accent/30" />
              </div>
              <h3 className="text-4xl font-bold mb-4 text-primary tracking-tight">Geen stekken gevonden</h3>
              <p className="text-text-secondary mb-12 max-w-lg mx-auto text-xl leading-relaxed">
                {searchQuery 
                  ? `Geen resultaten voor "${searchQuery}".` 
                  : "Je hebt nog geen visstekken opgeslagen. Voeg je eerste stek toe om je vangsten te lokaliseren."}
              </p>
              <Button 
                className="h-20 px-12 text-2xl rounded-2xl shadow-premium-accent font-bold transition-all hover:-translate-y-1"
                icon={<Plus className="w-8 h-8" />}
                onClick={() => {
                  setEditingSpot(undefined);
                  setIsSpotModalOpen(true);
                }}
              >
                Nieuwe Stek Toevoegen
              </Button>
            </Card>
          </div>
        )}
      </div>

      <SpotModal 
        isOpen={isSpotModalOpen}
        onClose={() => setIsSpotModalOpen(false)}
        editingSpot={editingSpot}
      />
    </PageLayout>
  );
}
