import React, { useState } from 'react';
import { 
  User, 
  Mail, 
  Camera, 
  Shield, 
  Settings, 
  LogOut, 
  ChevronRight, 
  Zap, 
  Trophy, 
  Fish, 
  History,
  Edit2,
  Check,
  Loader2
} from 'lucide-react';
import { useAuth } from '../App';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Button, Card, Badge } from '../components/ui/Base';
import { Input, Label, Textarea } from '../components/ui/Inputs';
import { toast } from 'sonner';
import { PageHeader, PageLayout } from '../components/layout/PageLayout';

export default function Profile() {
  const { profile, logout } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    displayName: profile?.displayName || '',
    bio: profile?.bio || '',
  });

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        displayName: formData.displayName,
        bio: formData.bio,
      });
      toast.success('Profiel bijgewerkt!');
      setIsEditing(false);
    } catch (error) {
      toast.error('Fout bij bijwerken profiel');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout maxWidth="max-w-6xl">
      <PageHeader 
        title="Mijn Profiel"
        subtitle="Beheer je persoonlijke informatie en voorkeuren."
        badge="Account"
        actions={
          <Button variant="secondary" onClick={logout} icon={<LogOut className="w-4 h-4" />}>
            Uitloggen
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Profile Card */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="p-8 text-center flex flex-col items-center space-y-6">
            <div className="relative group">
              <div className="w-32 h-32 rounded-[32px] overflow-hidden border-4 border-brand-soft shadow-xl">
                <img 
                  src={profile?.photoURL || `https://ui-avatars.com/api/?name=${profile?.displayName}`} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                />
              </div>
              <button className="absolute -bottom-2 -right-2 p-2 bg-brand text-white rounded-xl shadow-lg hover:scale-110 transition-transform">
                <Camera className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-1">
              <h2 className="text-2xl font-display font-bold text-text-primary">{profile?.displayName}</h2>
              <p className="text-sm text-text-muted font-bold uppercase tracking-widest">Level {profile?.level} Sportvisser</p>
            </div>

            <div className="flex items-center gap-2 w-full pt-4 border-t border-border-subtle">
              <div className="flex-1 text-center">
                <p className="text-xs font-bold text-text-muted uppercase tracking-widest mb-1">XP</p>
                <p className="text-lg font-bold text-brand">{profile?.xp}</p>
              </div>
              <div className="w-px h-8 bg-border-subtle"></div>
              <div className="flex-1 text-center">
                <p className="text-xs font-bold text-text-muted uppercase tracking-widest mb-1">Vangsten</p>
                <p className="text-lg font-bold text-text-primary">42</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <h3 className="text-sm font-bold text-text-muted uppercase tracking-widest">Achievements</h3>
            <div className="grid grid-cols-4 gap-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="aspect-square rounded-xl bg-surface-soft flex items-center justify-center text-brand/30">
                  <Trophy className="w-6 h-6" />
                </div>
              ))}
            </div>
            <Button variant="ghost" size="sm" className="w-full text-brand font-bold">Bekijk alle</Button>
          </Card>
        </div>

        {/* Right Column: Settings / Info */}
        <div className="lg:col-span-8 space-y-8">
          <Card className="p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-brand-soft text-brand rounded-xl">
                  <User className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-text-primary">Persoonlijke Info</h3>
              </div>
              {!isEditing && (
                <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)} icon={<Edit2 className="w-4 h-4" />}>
                  Bewerken
                </Button>
              )}
            </div>

            {isEditing ? (
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input 
                    label="Naam"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    required
                  />
                  <Input 
                    label="Email"
                    value={profile?.email}
                    disabled
                    helperText="Email kan niet worden gewijzigd."
                  />
                </div>
                <Textarea 
                  label="Bio / Over mij"
                  placeholder="Vertel iets over je passie voor vissen..."
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  rows={4}
                />
                <div className="flex items-center justify-end gap-3 pt-4">
                  <Button variant="secondary" type="button" onClick={() => setIsEditing(false)}>
                    Annuleren
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                    Opslaan
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-text-muted uppercase tracking-widest">Naam</p>
                    <p className="text-lg font-semibold text-text-primary">{profile?.displayName}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-text-muted uppercase tracking-widest">Email</p>
                    <p className="text-lg font-semibold text-text-primary">{profile?.email}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-text-muted uppercase tracking-widest">Bio</p>
                  <p className="text-text-secondary leading-relaxed">
                    {profile?.bio || 'Nog geen bio toegevoegd. Vertel anderen over je favoriete vissoorten en technieken!'}
                  </p>
                </div>
              </div>
            )}
          </Card>

          <Card className="p-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 bg-aqua-soft text-aqua rounded-xl">
                <Settings className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-text-primary">Voorkeuren</h3>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-surface-soft rounded-2xl">
                <div className="space-y-0.5">
                  <p className="font-bold text-text-primary">Privé Profiel</p>
                  <p className="text-xs text-text-secondary">Alleen vrienden kunnen je vangsten zien.</p>
                </div>
                <div className="w-12 h-6 bg-border-subtle rounded-full relative cursor-pointer">
                  <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm"></div>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-surface-soft rounded-2xl">
                <div className="space-y-0.5">
                  <p className="font-bold text-text-primary">Email Notificaties</p>
                  <p className="text-xs text-text-secondary">Ontvang updates over clubs en rankings.</p>
                </div>
                <div className="w-12 h-6 bg-brand rounded-full relative cursor-pointer">
                  <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm"></div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </PageLayout>
  );
}
