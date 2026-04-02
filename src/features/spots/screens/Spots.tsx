import React, { useEffect, useState } from 'react';
import { 
  Plus, 
  MapPin, 
  Search, 
  Filter, 
  ChevronRight, 
  Navigation, 
  Lock, 
  Globe, 
  Fish, 
  TrendingUp,
  Map as MapIcon,
  Layers,
  Maximize2
} from 'lucide-react';
import { useAuth } from '../../../App';
import { collection, query, where, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Spot } from '../../../types';
import { PageLayout, PageHeader } from '../../../components/layout/PageLayout';
import { Card, Button, Badge } from '../../../components/ui/Base';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

/**
 * Spots Screen
 * Part of the 'spots' feature module.
 * Manages user fishing spots, including mapping and privacy controls.
 */

export default function Spots() {
  const { profile } = useAuth();
  const [spots, setSpots] = useState<Spot[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  useEffect(() => {
    if (!profile) return;

    const q = query(
      collection(db, 'spots'),
      where('userId', '==', profile.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSpots(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Spot)));
      setLoading(false);
    }, (error) => {
      console.error("Error fetching spots:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Weet je zeker dat je deze stek wilt verwijderen?')) return;
    try {
      await deleteDoc(doc(db, 'spots', id));
      toast.success('Stek verwijderd');
    } catch (error) {
      toast.error('Fout bij verwijderen');
    }
  };

  const filteredSpots = spots.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.waterType?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <PageLayout>
      <PageHeader 
        title="Mijn Stekken" 
        subtitle={`${spots.length} locaties opgeslagen`}
        actions={
          <Button 
            icon={<Plus className="w-4 h-4" />} 
            className="rounded-xl h-11 px-6 font-bold shadow-premium-accent"
          >
            Nieuwe Stek
          </Button>
        }
      />

      <div className="space-y-6 pb-32">
        {/* View Toggle & Search */}
        <section className="flex flex-col md:flex-row gap-4 px-2 md:px-0">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input 
              type="text"
              placeholder="Zoek op naam of watertype..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface-card border border-border-subtle rounded-xl pl-12 pr-4 py-3 text-sm text-text-primary focus:outline-none focus:border-brand transition-all"
            />
          </div>
          <div className="flex bg-surface-card border border-border-subtle rounded-xl p-1">
            <button 
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-xs font-bold ${viewMode === 'list' ? 'bg-brand text-bg-main' : 'text-text-muted'}`}
            >
              <Navigation className="w-4 h-4" />
              Lijst
            </button>
            <button 
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-xs font-bold ${viewMode === 'map' ? 'bg-brand text-bg-main' : 'text-text-muted'}`}
            >
              <MapIcon className="w-4 h-4" />
              Kaart
            </button>
          </div>
        </section>

        {viewMode === 'map' ? (
          <Card className="aspect-video md:aspect-[21/9] bg-surface-soft border border-border-subtle rounded-2xl md:rounded-[2.5rem] flex items-center justify-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/map/1920/1080')] bg-cover bg-center opacity-40 grayscale group-hover:grayscale-0 transition-all duration-1000" />
            <div className="absolute inset-0 bg-gradient-to-t from-bg-main via-transparent to-transparent" />
            
            <div className="relative z-10 text-center space-y-4">
              <div className="w-16 h-16 bg-brand/10 rounded-full flex items-center justify-center mx-auto border border-brand/20 animate-pulse">
                <MapPin className="w-8 h-8 text-brand" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-text-primary tracking-tight">Interactieve Kaart</h3>
                <p className="text-xs text-text-secondary font-medium">Mapbox integratie in ontwikkeling voor fase 3.</p>
              </div>
              <Button variant="secondary" size="sm" className="rounded-xl font-bold">
                <Maximize2 className="w-4 h-4 mr-2" />
                Open Kaart
              </Button>
            </div>

            {/* Mock Map Pins */}
            {filteredSpots.slice(0, 5).map((s, i) => (
              <div 
                key={i} 
                className="absolute w-3 h-3 bg-brand rounded-full shadow-[0_0_10px_rgba(244,194,13,0.5)] border-2 border-white/20"
                style={{ 
                  top: `${20 + Math.random() * 60}%`, 
                  left: `${20 + Math.random() * 60}%` 
                }}
              />
            ))}
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-2 md:px-0">
            {loading ? (
              [...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-surface-card animate-pulse rounded-2xl border border-border-subtle" />
              ))
            ) : filteredSpots.length > 0 ? (
              filteredSpots.map((s) => (
                <Card 
                  key={s.id} 
                  padding="none" 
                  hoverable 
                  className="group border border-border-subtle bg-surface-card hover:border-brand/30 transition-all rounded-2xl overflow-hidden relative"
                >
                  <div className="flex items-center gap-4 p-5">
                    <div className="w-16 h-16 rounded-xl bg-surface-soft flex items-center justify-center text-brand border border-border-subtle group-hover:scale-110 transition-transform duration-500 shadow-sm">
                      <MapPin className="w-8 h-8" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-lg font-bold text-text-primary tracking-tight truncate">{s.name}</h4>
                        {s.isPrivate ? (
                          <Lock className="w-3 h-3 text-text-dim" />
                        ) : (
                          <Globe className="w-3 h-3 text-success/60" />
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-text-secondary font-medium">
                        <span className="flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5 text-brand" />
                          {s.waterType || 'Water'}
                        </span>
                        <span className="text-text-dim">•</span>
                        <span className="flex items-center gap-1">
                          <Fish className="w-3.5 h-3.5 text-brand" />
                          {s.stats?.totalCatches || 0} vangsten
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-6 h-6 text-text-muted group-hover:text-brand transition-colors" />
                  </div>
                  
                  {/* Quick Stats Bar */}
                  <div className="px-5 py-3 bg-bg-main/30 border-t border-border-subtle flex items-center justify-between">
                    <div className="flex gap-2">
                      {s.stats?.topSpecies?.slice(0, 2).map(sp => (
                        <Badge key={sp} variant="secondary" className="text-[8px] py-0.5 px-2 font-black uppercase tracking-widest">{sp}</Badge>
                      ))}
                    </div>
                    <div className="flex items-center gap-1 text-[9px] font-black text-text-dim uppercase tracking-widest">
                      <TrendingUp className="w-3 h-3" />
                      Hot Spot
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <Card className="col-span-full p-12 text-center border-dashed border border-border-subtle bg-surface-soft/20 rounded-2xl">
                <MapPin className="w-12 h-12 text-brand/20 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2 text-text-primary">Geen stekken gevonden</h3>
                <p className="text-sm text-text-secondary mb-6">Sla je favoriete visplekken op om ze later makkelijk terug te vinden.</p>
                <Button>Eerste Stek Toevoegen</Button>
              </Card>
            )}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
