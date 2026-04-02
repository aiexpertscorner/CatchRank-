import React, { useEffect, useState, useMemo } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  ChevronRight, 
  Trophy, 
  MessageSquare, 
  Shield,
  Star,
  Zap,
  MapPin,
  Heart,
  Share2,
  MoreVertical,
  ArrowLeft,
  Calendar,
  Award,
  X,
  CheckCircle2,
  Clock,
  Fish
} from 'lucide-react';
import { useAuth } from '../App';
import { collection, query, onSnapshot, limit, where, orderBy, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { Club, ClubMember, ClubFeedItem, Catch } from '../types';
import { Button, Card, Badge } from '../components/ui/Base';
import { Input } from '../components/ui/Inputs';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Navigation';
import { motion, AnimatePresence } from 'motion/react';
import { PageHeader, PageLayout } from '../components/layout/PageLayout';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { toast } from 'sonner';

export default function Clubs() {
  const { profile } = useAuth();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [myClubIds, setMyClubIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('discover');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);

  useEffect(() => {
    // All Clubs
    const clubsQuery = query(collection(db, 'clubs'), limit(50));
    const unsubClubs = onSnapshot(clubsQuery, (snapshot) => {
      setClubs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club)));
      setLoading(false);
    });

    // My Memberships
    if (profile) {
      const membershipsQuery = query(
        collection(db, 'club_members'),
        where('userId', '==', profile.uid)
      );
      const unsubMemberships = onSnapshot(membershipsQuery, (snapshot) => {
        setMyClubIds(snapshot.docs.map(doc => doc.data().clubId));
      });
      return () => {
        unsubClubs();
        unsubMemberships();
      };
    }

    return () => unsubClubs();
  }, [profile]);

  const filteredClubs = useMemo(() => {
    return clubs.filter(c => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [clubs, searchQuery]);

  const myClubs = useMemo(() => {
    return clubs.filter(c => myClubIds.includes(c.id!));
  }, [clubs, myClubIds]);

  const handleJoinClub = async (club: Club) => {
    if (!profile) return;
    try {
      await addDoc(collection(db, 'club_members'), {
        userId: profile.uid,
        clubId: club.id,
        role: 'member',
        joinedAt: serverTimestamp(),
        userDisplayName: profile.displayName,
        userPhotoURL: profile.photoURL
      });
      toast.success(`Welkom bij ${club.name}!`);
    } catch (error) {
      toast.error('Fout bij lid worden');
    }
  };

  if (selectedClub) {
    return <ClubDetail club={selectedClub} onBack={() => setSelectedClub(null)} isMember={myClubIds.includes(selectedClub.id!)} onJoin={() => handleJoinClub(selectedClub)} />;
  }

  return (
    <PageLayout>
      <PageHeader 
        title="Visclubs & Community"
        subtitle="Word lid van een club, deel je passie en strijd samen om de top."
        badge="Community"
        actions={
          <Button 
            className="rounded-xl h-12 px-6 font-bold shadow-premium-accent" 
            icon={<Plus className="w-5 h-5" />}
          >
            Nieuwe Club
          </Button>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col md:flex-row gap-6 items-center justify-between mb-12">
          <TabsList className="grid grid-cols-2 w-full md:w-80 bg-surface-soft/50 p-1.5 rounded-2xl border border-border-subtle">
            <TabsTrigger value="discover" className="rounded-xl font-black text-[10px] uppercase tracking-widest py-3">Ontdekken</TabsTrigger>
            <TabsTrigger value="my-clubs" className="rounded-xl font-black text-[10px] uppercase tracking-widest py-3">Mijn Clubs</TabsTrigger>
          </TabsList>

          <div className="relative w-full md:w-80 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-text-muted group-focus-within:text-brand transition-colors" />
            <Input 
              placeholder="Zoek club of regio..." 
              className="pl-12 h-14 bg-white border-border-subtle rounded-2xl shadow-sm focus:border-brand focus:ring-4 focus:ring-brand/5 transition-all font-bold"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <TabsContent value="discover" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {loading ? (
              [1, 2, 3, 4, 5, 6].map(i => (
                <Card key={i} className="h-80 animate-pulse bg-surface-soft/30 rounded-[2.5rem] border-none" />
              ))
            ) : filteredClubs.length > 0 ? (
              <AnimatePresence mode="popLayout">
                {filteredClubs.map((club) => (
                  <motion.div
                    key={club.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.4 }}
                  >
                    <Card padding="none" hoverable className="group h-full flex flex-col overflow-hidden border-none shadow-sm hover:shadow-premium transition-all duration-500 rounded-[2.5rem] bg-white" onClick={() => setSelectedClub(club)}>
                      <div className="h-40 bg-surface-soft relative overflow-hidden">
                        {club.photoURL ? (
                          <img src={club.photoURL} alt={club.name} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand-soft to-white">
                            <Users className="w-16 h-16 text-brand/20" />
                          </div>
                        )}
                        <div className="absolute top-4 right-4">
                          <Badge variant="brand" className="bg-white/90 backdrop-blur-md text-brand border-none px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg">
                            {club.memberCount} Leden
                          </Badge>
                        </div>
                        {myClubIds.includes(club.id!) && (
                          <div className="absolute top-4 left-4">
                            <Badge variant="success" className="px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg">Lid</Badge>
                          </div>
                        )}
                      </div>
                      
                      <div className="p-8 flex-1 flex flex-col">
                        <div className="flex-1 space-y-3">
                          <h3 className="text-2xl font-black text-text-primary group-hover:text-brand transition-colors tracking-tight">{club.name}</h3>
                          <p className="text-base text-text-secondary line-clamp-2 font-bold leading-relaxed">
                            {club.description}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-6 pt-6 mt-6 border-t border-border-subtle">
                          <div className="flex items-center gap-2 text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">
                            <Trophy className="w-4 h-4 text-warning" />
                            <span>#4 Ranking</span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">
                            <Zap className="w-4 h-4 text-brand" />
                            <span>{club.stats?.totalXp?.toLocaleString() || '0'} XP</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="px-8 py-5 bg-surface-soft/50 flex items-center justify-between group-hover:bg-brand group-hover:text-white transition-all duration-500">
                        <span className="text-xs font-black uppercase tracking-[0.2em]">Club bekijken</span>
                        <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            ) : (
              <div className="col-span-full">
                <Card variant="premium" className="p-24 text-center border-dashed border-2 border-border-subtle bg-surface-soft/20 rounded-[4rem]">
                  <div className="w-24 h-24 bg-white rounded-3xl shadow-premium flex items-center justify-center mx-auto mb-8">
                    <Users className="w-12 h-12 text-text-muted/30" />
                  </div>
                  <h3 className="text-3xl font-black mb-3 text-text-primary tracking-tight">Geen clubs gevonden</h3>
                  <p className="text-text-secondary mb-10 max-w-sm mx-auto font-bold text-lg">
                    Ontdek clubs in jouw regio of start je eigen visclub met vrienden.
                  </p>
                  <Button className="h-16 px-10 rounded-2xl shadow-premium-accent font-black text-lg" icon={<Plus className="w-6 h-6" />}>Eerste Club Starten</Button>
                </Card>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="my-clubs" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {myClubs.length > 0 ? (
              myClubs.map(club => (
                <Card key={club.id} hoverable className="p-8 border-none shadow-sm rounded-[2.5rem] bg-white group cursor-pointer" onClick={() => setSelectedClub(club)}>
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 rounded-[1.5rem] overflow-hidden border-2 border-white shadow-md flex-shrink-0">
                      <img src={club.photoURL || `https://ui-avatars.com/api/?name=${club.name}`} alt={club.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xl font-black text-text-primary truncate tracking-tight group-hover:text-brand transition-colors">{club.name}</h4>
                      <div className="flex items-center gap-3 mt-1">
                        <Badge variant="brand" className="px-2 py-0.5 text-[8px] font-black uppercase tracking-widest rounded-md">Lid</Badge>
                        <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">{club.memberCount} Leden</span>
                      </div>
                    </div>
                    <ChevronRight className="w-6 h-6 text-text-muted group-hover:text-brand group-hover:translate-x-1 transition-all" />
                  </div>
                </Card>
              ))
            ) : (
              <div className="col-span-full">
                <Card variant="premium" className="p-24 text-center border-dashed border-2 border-border-subtle bg-surface-soft/20 rounded-[4rem]">
                  <h3 className="text-2xl font-black mb-3 text-text-primary">Je bent nog geen lid</h3>
                  <p className="text-text-secondary mb-8 font-bold">Word lid van een club om samen te vissen!</p>
                  <Button variant="secondary" onClick={() => setActiveTab('discover')}>Clubs Ontdekken</Button>
                </Card>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

    </PageLayout>
  );
}

function ClubDetail({ club, onBack, isMember, onJoin }: { club: Club, onBack: () => void, isMember: boolean, onJoin: () => void }) {
  const [feedItems, setFeedItems] = useState<ClubFeedItem[]>([]);
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [activeTab, setActiveTab] = useState('feed');

  useEffect(() => {
    if (!club.id) return;

    // Feed Query
    const feedQuery = query(
      collection(db, 'club_feed'),
      where('clubId', '==', club.id),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    const unsubFeed = onSnapshot(feedQuery, (snapshot) => {
      setFeedItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClubFeedItem)));
    });

    // Members Query
    const membersQuery = query(
      collection(db, 'club_members'),
      where('clubId', '==', club.id),
      limit(50)
    );
    const unsubMembers = onSnapshot(membersQuery, (snapshot) => {
      setMembers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClubMember)));
    });

    return () => {
      unsubFeed();
      unsubMembers();
    };
  }, [club.id]);

  return (
    <PageLayout>
      <div className="mb-8">
        <Button variant="ghost" onClick={onBack} className="gap-2 font-black text-xs uppercase tracking-widest text-text-muted hover:text-primary">
          <ArrowLeft className="w-4 h-4" /> Terug naar overzicht
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Column: Club Info */}
        <div className="lg:col-span-4 space-y-8">
          <Card className="p-0 border-none shadow-premium rounded-[3rem] overflow-hidden bg-white">
            <div className="h-48 bg-surface-soft relative">
              {club.photoURL ? (
                <img src={club.photoURL} alt={club.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand to-aqua">
                  <Users className="w-20 h-20 text-white/20" />
                </div>
              )}
            </div>
            <div className="p-8 -mt-12 relative z-10">
              <div className="bg-white p-2 rounded-[2rem] shadow-xl inline-block mb-6 border border-border-subtle">
                <div className="w-24 h-24 rounded-[1.5rem] bg-surface-soft flex items-center justify-center overflow-hidden">
                  <img src={club.photoURL || `https://ui-avatars.com/api/?name=${club.name}`} alt={club.name} className="w-full h-full object-cover" />
                </div>
              </div>
              <h2 className="text-3xl font-black text-text-primary tracking-tight mb-3">{club.name}</h2>
              <p className="text-text-secondary font-bold leading-relaxed mb-8">{club.description}</p>
              
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="p-4 bg-surface-soft rounded-2xl">
                  <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">Leden</p>
                  <p className="text-xl font-black text-text-primary">{club.memberCount}</p>
                </div>
                <div className="p-4 bg-brand-soft rounded-2xl">
                  <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">Totaal XP</p>
                  <p className="text-xl font-black text-brand">{club.stats?.totalXp?.toLocaleString() || '0'}</p>
                </div>
              </div>

              {!isMember ? (
                <Button className="w-full h-16 rounded-2xl font-black text-lg shadow-premium-accent" onClick={onJoin}>Lid worden</Button>
              ) : (
                <div className="flex gap-3">
                  <Button variant="secondary" className="flex-1 h-14 rounded-xl font-bold border-border-subtle">Bericht</Button>
                  <Button variant="ghost" className="w-14 h-14 p-0 rounded-xl bg-surface-soft text-text-muted"><MoreVertical className="w-6 h-6" /></Button>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-8 border-none shadow-sm rounded-[2.5rem] bg-white">
            <h3 className="text-xl font-black text-text-primary mb-6 flex items-center gap-3">
              <Award className="w-6 h-6 text-warning" /> Club Challenges
            </h3>
            <div className="space-y-4">
              <div className="p-5 bg-surface-soft/50 rounded-2xl border border-border-subtle group hover:border-brand transition-all cursor-pointer">
                <div className="flex justify-between items-start mb-3">
                  <h4 className="font-bold text-text-primary group-hover:text-brand transition-colors">Snoek September</h4>
                  <Badge variant="warning" className="text-[8px] font-black uppercase tracking-widest">Actief</Badge>
                </div>
                <div className="flex items-center gap-3 text-xs font-black text-text-muted uppercase tracking-widest">
                  <Clock className="w-4 h-4" />
                  <span>Nog 12 dagen</span>
                </div>
              </div>
              <div className="p-5 bg-surface-soft/30 rounded-2xl border border-transparent opacity-60">
                <div className="flex justify-between items-start mb-3">
                  <h4 className="font-bold text-text-primary">Nachtvisser Cup</h4>
                  <Badge variant="secondary" className="text-[8px] font-black uppercase tracking-widest">Binnenkort</Badge>
                </div>
                <div className="flex items-center gap-3 text-xs font-black text-text-muted uppercase tracking-widest">
                  <Calendar className="w-4 h-4" />
                  <span>Start 1 Okt</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Feed & Members */}
        <div className="lg:col-span-8 space-y-8">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-transparent border-b border-border-subtle rounded-none p-0 h-auto gap-10 mb-8">
              <TabsTrigger value="feed" className="bg-transparent border-none rounded-none p-0 pb-4 text-lg font-black uppercase tracking-widest data-[state=active]:text-brand data-[state=active]:border-b-4 data-[state=active]:border-brand shadow-none">Club Feed</TabsTrigger>
              <TabsTrigger value="members" className="bg-transparent border-none rounded-none p-0 pb-4 text-lg font-black uppercase tracking-widest data-[state=active]:text-brand data-[state=active]:border-b-4 data-[state=active]:border-brand shadow-none">Leden ({members.length})</TabsTrigger>
              <TabsTrigger value="stats" className="bg-transparent border-none rounded-none p-0 pb-4 text-lg font-black uppercase tracking-widest data-[state=active]:text-brand data-[state=active]:border-b-4 data-[state=active]:border-brand shadow-none">Statistieken</TabsTrigger>
            </TabsList>

            <TabsContent value="feed" className="mt-0 space-y-8">
              {isMember && (
                <Card className="p-6 border-none shadow-sm rounded-[2rem] bg-white flex gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-surface-soft flex-shrink-0 overflow-hidden border-2 border-white shadow-sm">
                    <img src={`https://ui-avatars.com/api/?name=User`} alt="User" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <textarea 
                      placeholder="Deel iets met de club..." 
                      className="w-full bg-surface-soft border-none rounded-2xl p-4 font-bold text-text-primary focus:ring-2 focus:ring-brand/20 outline-none resize-none h-24"
                    />
                    <div className="flex justify-end mt-4">
                      <Button className="rounded-xl px-8 font-black text-xs uppercase tracking-widest">Plaatsen</Button>
                    </div>
                  </div>
                </Card>
              )}

              {feedItems.length > 0 ? (
                feedItems.map((item, index) => (
                  <div key={item.id || index}>
                    <FeedItemCard item={item} />
                  </div>
                ))
              ) : (
                <div className="py-20 text-center">
                  <div className="w-20 h-20 bg-surface-soft rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <MessageSquare className="w-10 h-10 text-text-muted/30" />
                  </div>
                  <p className="text-text-muted font-bold text-lg">Nog geen berichten in deze club.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="members" className="mt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {members.map(member => (
                  <Card key={member.id} className="p-5 border-none shadow-sm rounded-2xl bg-white flex items-center gap-4 group hover:shadow-md transition-all">
                    <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-white shadow-sm">
                      <img src={member.userPhotoURL || `https://ui-avatars.com/api/?name=${member.userDisplayName}`} alt={member.userDisplayName} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-text-primary truncate">{member.userDisplayName}</h4>
                      <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">{member.role}</p>
                    </div>
                    {member.role === 'owner' && <Shield className="w-5 h-5 text-brand" />}
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="stats" className="mt-0">
              <Card className="p-20 text-center border-dashed border-2 border-border-subtle bg-surface-soft/20 rounded-[3rem]">
                <Trophy className="w-16 h-16 text-brand/20 mx-auto mb-6" />
                <h3 className="text-2xl font-bold text-text-primary mb-2">Club Statistieken</h3>
                <p className="text-text-secondary font-bold">Binnenkort beschikbaar: vergelijk je club met anderen!</p>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </PageLayout>
  );
}

function FeedItemCard({ item }: { item: ClubFeedItem }) {
  return (
    <Card className="p-8 border-none shadow-sm rounded-[2.5rem] bg-white group">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-white shadow-md">
            <img src={item.authorPhoto} alt={item.authorName} className="w-full h-full object-cover" />
          </div>
          <div>
            <h4 className="text-lg font-black text-text-primary tracking-tight">{item.authorName}</h4>
            <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">
              {format(item.createdAt.toDate(), 'd MMMM HH:mm', { locale: nl })}
            </p>
          </div>
        </div>
        <button className="w-10 h-10 rounded-xl bg-surface-soft flex items-center justify-center text-text-muted hover:text-primary transition-all">
          <MoreVertical className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-6">
        <p className="text-lg font-bold text-text-secondary leading-relaxed">
          {item.text}
        </p>

        {item.type === 'catch' && (
          <div className="bg-surface-soft rounded-[2rem] p-6 flex items-center gap-6 border border-border-subtle group-hover:border-brand transition-all cursor-pointer">
            <div className="w-24 h-24 rounded-2xl bg-white shadow-sm flex items-center justify-center overflow-hidden">
              <Fish className="w-10 h-10 text-brand/20" />
            </div>
            <div className="flex-1">
              <Badge variant="brand" className="mb-2 px-3 py-1 text-[8px] font-black uppercase tracking-widest rounded-full">Nieuwe Vangst</Badge>
              <h5 className="text-xl font-black text-text-primary tracking-tight">Prachtige Snoekbaars</h5>
              <p className="text-sm font-bold text-text-muted">78cm • 4.2kg • Gooimeer</p>
            </div>
            <ChevronRight className="w-6 h-6 text-text-muted group-hover:text-brand transition-all" />
          </div>
        )}

        <div className="flex items-center gap-8 pt-6 border-t border-border-subtle">
          <button className="flex items-center gap-2.5 text-text-muted hover:text-danger transition-colors group/btn">
            <div className="w-10 h-10 rounded-xl bg-surface-soft flex items-center justify-center group-hover/btn:bg-danger/10 transition-colors">
              <Heart className="w-5 h-5 group-hover/btn:fill-danger" />
            </div>
            <span className="text-sm font-black uppercase tracking-widest">12</span>
          </button>
          <button className="flex items-center gap-2.5 text-text-muted hover:text-brand transition-colors group/btn">
            <div className="w-10 h-10 rounded-xl bg-surface-soft flex items-center justify-center group-hover/btn:bg-brand/10 transition-colors">
              <MessageSquare className="w-5 h-5" />
            </div>
            <span className="text-sm font-black uppercase tracking-widest">4</span>
          </button>
          <button className="flex items-center gap-2.5 text-text-muted hover:text-brand transition-colors group/btn ml-auto">
            <div className="w-10 h-10 rounded-xl bg-surface-soft flex items-center justify-center group-hover/btn:bg-brand/10 transition-colors">
              <Share2 className="w-5 h-5" />
            </div>
          </button>
        </div>
      </div>
    </Card>
  );
}
