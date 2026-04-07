import { useState, useEffect } from 'react';
import { api, Profile } from '@/api/client';
import SwipeCard from '@/components/SwipeCard';
import MatchModal from '@/components/MatchModal';
import Icon from '@/components/ui/icon';

interface DiscoverPageProps {
  onGoToMessages: () => void;
  userId: string;
}

export default function DiscoverPage({ onGoToMessages, userId }: DiscoverPageProps) {
  const [deck, setDeck] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [matchData, setMatchData] = useState<{ name: string; photo: string } | null>(null);
  const [actionFlash, setActionFlash] = useState<'like' | 'pass' | 'super' | null>(null);
  const [swiping, setSwiping] = useState(false);

  useEffect(() => {
    void userId;
    loadProfiles();
  }, [userId]);

  const loadProfiles = async () => {
    setLoading(true);
    try {
      const res = await api.profiles.discover();
      setDeck(res.profiles);
    } catch {
      setDeck([]);
    } finally {
      setLoading(false);
    }
  };

  const flash = (action: 'like' | 'pass' | 'super') => {
    setActionFlash(action);
    setTimeout(() => setActionFlash(null), 600);
  };

  const handleLike = async () => {
    if (swiping || deck.length === 0) return;
    const top = deck[0];
    setSwiping(true);
    flash('like');
    try {
      const res = await api.likes.like(top.user_id, false);
      if (res.is_match && res.match_id) {
        setTimeout(() => setMatchData(res.profile), 450);
      }
    } catch { /* ignore */ }
    setTimeout(() => { setDeck(prev => prev.slice(1)); setSwiping(false); }, 420);
  };

  const handlePass = async () => {
    if (swiping || deck.length === 0) return;
    const top = deck[0];
    setSwiping(true);
    flash('pass');
    try { await api.likes.pass(top.user_id); } catch { /* ignore */ }
    setTimeout(() => { setDeck(prev => prev.slice(1)); setSwiping(false); }, 420);
  };

  const handleSuperLike = async () => {
    if (swiping || deck.length === 0) return;
    const top = deck[0];
    setSwiping(true);
    flash('super');
    try {
      const res = await api.likes.like(top.user_id, true);
      if (res.is_match && res.match_id) {
        setTimeout(() => setMatchData(res.profile), 450);
      }
    } catch { /* ignore */ }
    setTimeout(() => { setDeck(prev => prev.slice(1)); setSwiping(false); }, 420);
  };

  const visible = deck.slice(0, 3);

  if (loading) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        <p className="text-muted-foreground text-sm">Ищем анкеты рядом...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 relative" style={{ minHeight: 0 }}>
        {visible.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
            <div className="text-6xl mb-4">🌟</div>
            <h3 className="text-xl font-black text-foreground mb-2">Анкеты закончились</h3>
            <p className="text-muted-foreground text-sm mb-6">Зайди позже — появятся новые люди рядом</p>
            <button onClick={loadProfiles} className="btn-primary px-6 py-3 text-sm">
              Обновить
            </button>
          </div>
        ) : (
          [...visible].reverse().map((profile, revIdx) => {
            const stackIndex = visible.length - 1 - revIdx;
            return (
              <SwipeCard
                key={profile.user_id}
                profile={profile}
                isTop={stackIndex === 0}
                stackIndex={stackIndex}
                onLike={handleLike}
                onPass={handlePass}
                onSuperLike={handleSuperLike}
              />
            );
          })
        )}

        {actionFlash && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-20">
            <div className="text-6xl animate-bounce-in">
              {actionFlash === 'like' ? '💚' : actionFlash === 'pass' ? '❌' : '⭐'}
            </div>
          </div>
        )}
      </div>

      {visible.length > 0 && (
        <div className="flex items-center justify-center gap-5 py-5 px-4 shrink-0">
          <button
            onClick={handlePass}
            disabled={swiping}
            className="w-14 h-14 rounded-full bg-white border-2 border-rose-200 flex items-center justify-center shadow-lg hover:border-rose-400 hover:scale-110 transition-all active:scale-95 disabled:opacity-50"
          >
            <Icon name="X" size={24} className="text-rose-400" />
          </button>
          <button
            onClick={handleSuperLike}
            disabled={swiping}
            className="w-12 h-12 rounded-full bg-white border-2 border-blue-200 flex items-center justify-center shadow-md hover:border-blue-400 hover:scale-110 transition-all active:scale-95 disabled:opacity-50"
          >
            <Icon name="Star" size={20} className="text-blue-400" />
          </button>
          <button
            onClick={handleLike}
            disabled={swiping}
            className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-all active:scale-95 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, hsl(340 82% 58%), hsl(262 80% 64%))' }}
          >
            <Icon name="Heart" size={24} className="text-white" />
          </button>
          <button className="w-12 h-12 rounded-full bg-white border-2 border-amber-200 flex items-center justify-center shadow-md hover:border-amber-400 hover:scale-110 transition-all active:scale-95">
            <Icon name="Zap" size={20} className="text-amber-400" />
          </button>
        </div>
      )}

      {matchData && (
        <MatchModal
          profileName={matchData.name}
          profilePhoto={matchData.photo}
          onClose={() => setMatchData(null)}
          onMessage={() => { setMatchData(null); onGoToMessages(); }}
        />
      )}
    </div>
  );
}
