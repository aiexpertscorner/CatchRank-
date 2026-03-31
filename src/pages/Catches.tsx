import React, { useEffect, useState } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  ChevronRight, 
  Fish, 
  Calendar, 
  MapPin, 
  AlertCircle,
  MoreVertical,
  Edit2,
  Trash2,
  CheckCircle2,
  CloudSun,
  Zap
} from 'lucide-react';
import { useAuth } from '../App';
import { collection, query, where, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { Catch } from '../types';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Button, Card, Badge } from '../components/ui/Base';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Navigation';
import { Input } from '../components/ui/Inputs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '../components/ui/Navigation';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { PageHeader, PageLayout } from '../components/layout/PageLayout';
import { CatchForm } from '../components/CatchForm';
import { QuickCatchModal } from '../components/QuickCatchModal';

export default function Catches() {
  const { profile } = useAuth();
  const [catches, setCatches] = useState<Catch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  // Modal States
  const [isQuickCatchOpen, setIsQuickCatchOpen] = useState(false);
  const [isCatchFormOpen, setIsCatchFormOpen] = useState(false);
  const [editingCatch, setEditingCatch] = useState<Catch | null>(null);

  useEffect(() => {
    if (!profile) return;

    const catchesQuery = query(
      collection(db, 'catches'),
      where('userId', '==', profile.uid),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(catchesQuery, (snapshot) => {
      setCatches(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Catch)));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Weet je zeker dat je deze vangst wilt verwijderen?')) return;
    
    try {
      await deleteDoc(doc(db, 'catches', id));
      toast.success('Vangst verwijderd');
    } catch (error) {
      toast.error('Fout bij verwijderen');
    }
  };

  const openEditCatch = (c: Catch) => {
    setEditingCatch(c);
    setIsCatchFormOpen(true);
  };

  const filteredCatches = catches.filter(c => {
    const matchesSearch = c.species.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === 'all' || (activeTab === 'drafts' && c.status === 'draft');
    return matchesSearch && matchesTab;
  });

  const draftsCount = catches.filter(c => c.status === 'draft').length;

  return (
    <PageLayout>
      <PageHeader 
        title="Mijn Logboek"
        subtitle="Beheer al je vangsten en vul je statistieken aan."
        badge="Logboek"
        actions={
          <div className="flex gap-4">
            <Button 
              variant="secondary" 
              className="rounded-2xl h-14 px-8 font-bold text-lg border-border-subtle hover:bg-surface-soft transition-all" 
              onClick={() => setIsQuickCatchOpen(true)} 
              icon={<Zap className="w-6 h-6 text-accent" />}
            >
              Snel Loggen
            </Button>
            <Button 
              className="rounded-2xl h-14 px-8 font-bold text-lg shadow-premium-accent transition-all hover:-translate-y-1" 
              onClick={() => setIsCatchFormOpen(true)} 
              icon={<Plus className="w-6 h-6" />}
            >
              Nieuwe Vangst
            </Button>
          </div>
        }
      />

      <div className="flex flex-col lg:flex-row gap-8 items-center justify-between mb-12">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full lg:w-auto">
          <TabsList className="grid grid-cols-2 w-full lg:w-80 bg-surface-soft/50 p-2 rounded-[1.5rem] border border-border-subtle shadow-sm">
            <TabsTrigger value="all" className="rounded-xl font-black text-xs uppercase tracking-widest py-3">Alle Vangsten</TabsTrigger>
            <TabsTrigger value="drafts" className="relative rounded-xl font-black text-xs uppercase tracking-widest py-3">
              Concepten
              {draftsCount > 0 && (
                <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-[11px] font-black text-white shadow-lg border-2 border-white animate-pulse">
                  {draftsCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full lg:w-96 group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-6 w-6 text-text-muted group-focus-within:text-accent transition-colors" />
          <Input 
            placeholder="Zoek op vissoort..." 
            className="pl-14 h-16 bg-white border-border-subtle rounded-[1.5rem] shadow-sm focus:border-accent focus:ring-4 focus:ring-accent/5 transition-all text-lg font-medium"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-8">
        {loading ? (
          <div className="space-y-8">
            {[1, 2, 3].map(i => (
              <Card key={i} className="h-36 animate-pulse bg-surface-soft/50 rounded-[2.5rem] border-none" />
            ))}
          </div>
        ) : filteredCatches.length > 0 ? (
          <AnimatePresence mode="popLayout">
            {filteredCatches.map((c) => (
              <motion.div
                key={c.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              >
                <Card padding="none" hoverable variant="premium" className="group overflow-hidden border-none shadow-sm hover:shadow-premium transition-all duration-500 rounded-[2.5rem]" onClick={() => openEditCatch(c)}>
                  <div className="flex items-center gap-6 md:gap-10 p-6">
                    <div className="w-28 h-28 md:w-32 md:h-32 bg-surface-soft rounded-[2rem] overflow-hidden flex-shrink-0 border border-border-subtle relative shadow-inner group-hover:shadow-lg transition-all duration-500">
                      {c.photoURL ? (
                        <img src={c.photoURL} alt={c.species} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-1000" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-surface-soft to-white">
                          <Fish className="text-text-muted/20 w-14 h-14" />
                        </div>
                      )}
                      {c.status === 'draft' && (
                        <div className="absolute inset-0 bg-warning/10 backdrop-blur-[2px] flex items-center justify-center">
                          <div className="bg-white/95 p-2.5 rounded-full shadow-xl border border-warning/20">
                            <AlertCircle className="text-warning w-7 h-7" />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 py-2">
                      <div className="flex items-center gap-4 mb-3">
                        <h4 className="text-2xl md:text-3xl font-bold text-primary truncate tracking-tight">{c.species || 'Concept Vangst'}</h4>
                        {c.status === 'draft' ? (
                          <Badge variant="warning" className="px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] rounded-full">Afronden</Badge>
                        ) : (
                          <Badge variant="success" icon={<CheckCircle2 className="w-4 h-4" />} className="px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] rounded-full">Voltooid</Badge>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-x-8 gap-y-3 text-base text-text-secondary font-bold">
                        <div className="flex items-center gap-2.5">
                          <Calendar className="w-5 h-5 text-accent/60" />
                          <span>{c.timestamp ? format(c.timestamp.toDate(), 'd MMMM yyyy', { locale: nl }) : 'Zojuist'}</span>
                        </div>
                        {(c.weight || c.length) && (
                          <div className="flex items-center gap-4">
                            <div className="w-1.5 h-1.5 rounded-full bg-border-subtle" />
                            <div className="flex items-center gap-4">
                              {c.weight && <span>{c.weight}g</span>}
                              {c.weight && c.length && <div className="w-1 h-1 rounded-full bg-border-subtle" />}
                              {c.length && <span>{c.length}cm</span>}
                            </div>
                          </div>
                        )}
                        <div className="flex items-center gap-2.5">
                          <MapPin className="w-5 h-5 text-water/60" />
                          <span className="truncate">{c.location?.name || 'Onbekende plek'}</span>
                        </div>
                        {c.weather && (
                          <div className="flex items-center gap-2.5 text-water font-black">
                            <CloudSun className="w-5 h-5" />
                            <span>{c.weather.temp_c}°C</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 md:gap-8">
                      <div className="hidden sm:flex flex-col items-end mr-4">
                        <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-1.5">XP Verdiend</span>
                        <span className="text-2xl font-black text-accent">+{c.status === 'draft' ? '?' : (c.xpEarned || 25)}</span>
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-14 w-14 p-0 rounded-2xl hover:bg-surface-soft text-text-muted hover:text-primary transition-all shadow-sm"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="w-7 h-7" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-[1.5rem] p-3 shadow-premium border-border-subtle min-w-[200px]">
                          <DropdownMenuItem className="gap-4 p-4 rounded-xl font-bold text-base" onClick={() => openEditCatch(c)}>
                            <Edit2 className="w-5 h-5 text-accent" />
                            {c.status === 'draft' ? 'Afronden' : 'Bewerken'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="my-2" />
                          <DropdownMenuItem 
                            variant="danger" 
                            className="gap-4 p-4 rounded-xl font-bold text-base"
                            onClick={(e) => {
                              e.stopPropagation();
                              c.id && handleDelete(c.id);
                            }}
                          >
                            <Trash2 className="w-5 h-5" />
                            Verwijderen
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      
                      <div className="hidden md:flex w-14 h-14 rounded-2xl bg-surface-soft items-center justify-center group-hover:bg-accent group-hover:text-white transition-all duration-500 group-hover:shadow-lg group-hover:shadow-accent/20 group-hover:-translate-x-2">
                        <ChevronRight className="w-7 h-7" />
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        ) : (
          <Card variant="premium" className="p-32 text-center border-dashed border-2 border-border-subtle bg-surface-soft/20 rounded-[4rem]">
            <div className="w-32 h-32 bg-white rounded-[2.5rem] shadow-premium flex items-center justify-center mx-auto mb-10 group-hover:scale-110 transition-transform duration-500">
              <Fish className="w-16 h-16 text-accent/30" />
            </div>
            <h3 className="text-4xl font-bold mb-4 text-primary tracking-tight">Geen vangsten gevonden</h3>
            <p className="text-text-secondary mb-12 max-w-lg mx-auto text-xl leading-relaxed">
              {searchQuery 
                ? `Geen resultaten voor "${searchQuery}". Probeer een andere zoekterm.` 
                : activeTab === 'drafts' 
                  ? "Je hebt op dit moment geen onvoltooide vangsten. Goed bezig!" 
                  : "Je hebt nog geen vangsten gelogd. Tijd om naar de waterkant te gaan!"}
            </p>
            {!searchQuery && (
              <Button className="h-20 px-12 text-2xl rounded-2xl shadow-premium-accent font-bold transition-all hover:-translate-y-1" onClick={() => setIsCatchFormOpen(true)} icon={<Plus className="w-8 h-8" />}>Eerste Vangst Loggen</Button>
            )}
          </Card>
        )}
      </div>

      {/* Logging Modals */}
      <AnimatePresence>
        {isQuickCatchOpen && (
          <QuickCatchModal 
            isOpen={isQuickCatchOpen} 
            onClose={() => setIsQuickCatchOpen(false)} 
          />
        )}
        {isCatchFormOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsCatchFormOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl"
            >
              <CatchForm 
                initialData={editingCatch || {}} 
                onComplete={() => {
                  setIsCatchFormOpen(false);
                  setEditingCatch(null);
                }}
                onCancel={() => {
                  setIsCatchFormOpen(false);
                  setEditingCatch(null);
                }}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </PageLayout>
  );
}
