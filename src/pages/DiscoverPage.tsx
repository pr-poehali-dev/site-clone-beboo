import { useState } from 'react';
import { profiles, Profile } from '@/data/profiles';
import SwipeCard from '@/components/SwipeCard';
import MatchModal from '@/components/MatchModal';
import Icon from '@/components/ui/icon';

export default function DiscoverPage({ onGoToMessages }: { onGoToMessages: () => void }) {
  const [deck, setDeck] = useState<Profile[]>([...profiles]);
  const [matchProfile, setMatchProfile] = useState<Profile | null>(null);
  const [lastAction, setLastAction] = useState<'like' | 'pass' | 'super' | null>(null);
  const [actionFlash, setActionFlash] = useState(false);

  const flash = (action: 'like' | 'pass' | 'super') => {
    setLastAction(action);
    setActionFlash(true);
    setTimeout(() => setActionFlash(false), 600);
  };

  const handleLike = () => {
    flash('like');
    const top = deck[0];
    setTimeout(() => {
      setDeck(prev => prev.slice(1));
      if (Math.random() > 0.4) setMatchProfile(top);
    }, 420);
  };

  const handlePass = () => {
    flash('pass');
    setTimeout(() => setDeck(prev => prev.slice(1)), 420);
  };

  const handleSuperLike = () => {
    flash('super');
    setTimeout(() => {
      setDeck(prev => prev.slice(1));
      setMatchProfile(deck[0]);
    }, 420);
  };

  const visible = deck.slice(0, 3);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 relative" style={{ minHeight: 0 }}>
        {visible.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
            <div className="text-6xl mb-4">🌟</div>
            <h3 className="text-xl font-black text-foreground mb-2">Вы всех посмотрели!</h3>
            <p className="text-muted-foreground text-sm mb-6">Зайдите позже — появятся новые анкеты</p>
            <button
              onClick={() => setDeck([...profiles])}
              className="btn-primary px-6 py-3 text-sm"
            >
              Показать снова
            </button>
          </div>
        ) : (
          [...visible].reverse().map((profile, revIdx) => {
            const stackIndex = visible.length - 1 - revIdx;
            return (
              <SwipeCard
                key={profile.id}
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

        {actionFlash && lastAction && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-20">
            <div className={`text-6xl animate-bounce-in ${
              lastAction === 'like' ? '' : lastAction === 'super' ? '' : ''
            }`}>
              {lastAction === 'like' ? '💚' : lastAction === 'pass' ? '❌' : '⭐'}
            </div>
          </div>
        )}
      </div>

      {visible.length > 0 && (
        <div className="flex items-center justify-center gap-5 py-5 px-4 shrink-0">
          <button
            onClick={handlePass}
            className="w-14 h-14 rounded-full bg-white border-2 border-rose-200 flex items-center justify-center shadow-lg hover:border-rose-400 hover:scale-110 transition-all active:scale-95"
          >
            <Icon name="X" size={24} className="text-rose-400" />
          </button>

          <button
            onClick={handleSuperLike}
            className="w-12 h-12 rounded-full bg-white border-2 border-blue-200 flex items-center justify-center shadow-md hover:border-blue-400 hover:scale-110 transition-all active:scale-95"
          >
            <Icon name="Star" size={20} className="text-blue-400" />
          </button>

          <button
            onClick={handleLike}
            className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-all active:scale-95"
            style={{ background: 'linear-gradient(135deg, hsl(340 82% 58%), hsl(262 80% 64%))' }}
          >
            <Icon name="Heart" size={24} className="text-white" />
          </button>

          <button className="w-12 h-12 rounded-full bg-white border-2 border-amber-200 flex items-center justify-center shadow-md hover:border-amber-400 hover:scale-110 transition-all active:scale-95">
            <Icon name="Zap" size={20} className="text-amber-400" />
          </button>
        </div>
      )}

      {matchProfile && (
        <MatchModal
          profile={matchProfile}
          onClose={() => setMatchProfile(null)}
          onMessage={() => { setMatchProfile(null); onGoToMessages(); }}
        />
      )}
    </div>
  );
}
