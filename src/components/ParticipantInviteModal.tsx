import React, { useState, useEffect } from 'react';
import { 
  X, 
  Search, 
  UserPlus, 
  Check, 
  Loader2,
  Mail,
  Users
} from 'lucide-react';
import { Button, Card, Badge } from './ui/Base';
import { Input } from './ui/Inputs';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile, Session } from '../types';
import { loggingService } from '../features/logging/services/loggingService';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

interface ParticipantInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: Session;
}

export const ParticipantInviteModal: React.FC<ParticipantInviteModalProps> = ({ 
  isOpen, 
  onClose, 
  session 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [invitingIds, setInvitingIds] = useState<string[]>([]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchTerm.length >= 2) {
        handleSearch();
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const handleSearch = async () => {
    setIsSearching(true);
    try {
      const results = await loggingService.searchUsers(searchTerm);
      // Filter out users already in the session
      const filtered = results.filter(u => 
        !session.participantUserIds.includes(u.uid) && 
        !session.invitedUserIds?.includes(u.uid)
      );
      setSearchResults(filtered);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleInvite = async (user: UserProfile) => {
    if (!session.id) return;
    setInvitingIds(prev => [...prev, user.uid]);
    try {
      await loggingService.inviteParticipant(session.id, user.uid);
      toast.success(`${user.displayName} is uitgenodigd!`);
      // Update local results to show invited state
      setSearchResults(prev => prev.filter(u => u.uid !== user.uid));
    } catch (error) {
      console.error('Invite error:', error);
      toast.error('Fout bij uitnodigen.');
    } finally {
      setInvitingIds(prev => prev.filter(id => id !== user.uid));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
      />
      
      <motion.div
        initial={{ opacity: 0, y: "100%" }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="relative w-full max-w-md bg-surface border-t sm:border border-border-subtle rounded-t-[2.5rem] sm:rounded-[3rem] shadow-premium overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Mobile Drag Handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-12 h-1.5 bg-border-subtle rounded-full opacity-50" />
        </div>

        {/* Header */}
        <div className="px-6 py-4 sm:p-8 border-b border-border-subtle flex items-center justify-between bg-gradient-to-r from-surface-soft/50 to-white sticky top-0 z-10">
          <div className="flex items-center gap-3 sm:gap-5">
            <div className="w-10 h-10 sm:w-14 sm:h-14 bg-water/10 rounded-xl sm:rounded-[1.25rem] flex items-center justify-center shadow-inner">
              <UserPlus className="w-5 h-5 sm:w-7 sm:h-7 text-water" />
            </div>
            <div>
              <h3 className="text-lg sm:text-2xl font-black text-primary tracking-tight">Vrienden Uitnodigen</h3>
              <p className="text-[8px] sm:text-[10px] text-text-muted font-black uppercase tracking-[0.2em] sm:tracking-[0.3em]">Samen Vissen • CatchRank</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl hover:bg-surface-soft flex items-center justify-center transition-all text-text-muted hover:text-primary hover:rotate-90 duration-300"
          >
            <X className="w-5 h-5 sm:w-7 sm:h-7" />
          </button>
        </div>

        {/* Search */}
        <div className="p-6 sm:p-8 border-b border-border-subtle bg-surface-soft/30">
          <Input 
            placeholder="Zoek op naam..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={isSearching ? <Loader2 className="w-4 h-4 sm:w-5 h-5 text-water animate-spin" /> : <Search className="w-4 h-4 sm:w-5 h-5 text-text-muted" />}
            className="h-12 sm:h-14 rounded-xl sm:rounded-2xl bg-surface border-border-subtle font-bold"
          />
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto no-scrollbar flex-1 space-y-3">
          {searchTerm.length < 2 ? (
            <div className="py-12 text-center space-y-4">
              <div className="w-16 h-16 bg-surface-soft rounded-full flex items-center justify-center mx-auto opacity-20">
                <Users className="w-8 h-8 text-text-muted" />
              </div>
              <p className="text-sm text-text-muted font-medium">Typ minimaal 2 letters om te zoeken.</p>
            </div>
          ) : searchResults.length > 0 ? (
            searchResults.map((user) => (
              <Card 
                key={user.uid}
                className="p-4 bg-surface-card border border-border-subtle rounded-2xl flex items-center justify-between group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-surface shadow-sm">
                    <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}&background=random`} alt={user.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div>
                    <h5 className="font-bold text-primary">{user.displayName}</h5>
                    <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Level {user.level}</p>
                  </div>
                </div>
                <Button 
                  size="sm"
                  className="h-10 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest"
                  onClick={() => handleInvite(user)}
                  loading={invitingIds.includes(user.uid)}
                  icon={<UserPlus className="w-4 h-4" />}
                >
                  Uitnodigen
                </Button>
              </Card>
            ))
          ) : !isSearching && (
            <div className="py-12 text-center space-y-4">
              <div className="w-16 h-16 bg-surface-soft rounded-full flex items-center justify-center mx-auto opacity-20">
                <Mail className="w-8 h-8 text-text-muted" />
              </div>
              <p className="text-sm text-text-muted font-medium">Geen gebruikers gevonden met deze naam.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 sm:p-8 bg-surface-soft/30 border-t border-border-subtle pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-8">
          <Button 
            variant="secondary" 
            className="w-full h-12 sm:h-14 rounded-xl sm:rounded-2xl font-black"
            onClick={onClose}
          >
            Sluiten
          </Button>
        </div>
      </motion.div>
    </div>
  );
};
