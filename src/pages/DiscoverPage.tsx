import { useState, useEffect, useRef, useCallback } from 'react';
import { api, Profile } from '@/api/client';
import SwipeCard, { SwipeCardRef } from '@/components/SwipeCard';
import MatchModal from '@/components/MatchModal';
import Icon from '@/components/ui/icon';

interface DiscoverPageProps {
  onGoToMessages: (matchId?: string) => void;
  userId: string;
}

export default function DiscoverPage({ onGoToMessages, userId }: DiscoverPageProps) {
  const [deck, setDeck] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [matchData, setMatchData] = useState<{ name: string; photo: string; matchId: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [boosting, setBoosting] = useState(false);
  const [undoing, setUndoing] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const topCardRef = useRef<SwipeCardRef>(null);

  useEffect(() => {
    void userId;
    loadProfiles();
    api.profiles.my().then(p => setIsPremium(!!p.is_premium)).catch(() => {});
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

  // Вызывается SwipeCard после завершения анимации
  const handleLike = useCallback(async () => {
    if (deck.length === 0) return;
    const top = deck[0];
    setDeck(prev => prev.slice(1));
    setBusy(false);
    try {
      const res = await api.likes.like(top.user_id, false);
      if (res.is_match && res.match_id) {
        setMatchData({ ...res.profile, matchId: res.match_id });
      }
    } catch { /* ignore */ }
  }, [deck]);

  const handlePass = useCallback(async () => {
    if (deck.length === 0) return;
    const top = deck[0];
    setDeck(prev => prev.slice(1));
    setBusy(false);
    try {
      await api.likes.pass(top.user_id);
    } catch { /* ignore */ }
  }, [deck]);

  const handleSuperLike = useCallback(async () => {
    if (deck.length === 0) return;
    const top = deck[0];
    setDeck(prev => prev.slice(1));
    setBusy(false);
    try {
      const res = await api.likes.like(top.user_id, true);
      if (res.is_match && res.match_id) {
        setMatchData({ ...res.profile, matchId: res.match_id });
      }
    } catch { /* ignore */ }
  }, [deck]);

  const pressUndo = async () => {
    if (undoing) return;
    setUndoing(true);
    try {
      const r = await api.likes.undo();
      if (r.restored_profile) {
        setDeck(prev => [r.restored_profile!, ...prev]);
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.message.includes('Premium')) {
        alert('Отмена свайпа — функция Premium');
      }
    } finally { setUndoing(false); }
  };

  // Кнопки внизу — триггерят анимацию карточки через ref
  const pressLike = () => {
    if (busy || deck.length === 0) return;
    setBusy(true);
    topCardRef.current?.swipeRight();
  };
  const pressPass = () => {
    if (busy || deck.length === 0) return;
    setBusy(true);
    topCardRef.current?.swipeLeft();
  };
  const pressSuper = () => {
    if (busy || deck.length === 0) return;
    setBusy(true);
    topCardRef.current?.swipeUp();
  };

  const visible = deck.slice(0, 3);

  if (loading) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        <p className="text-muted-foreground text-sm font-semibold">Ищем анкеты рядом...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Стек карточек */}
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
          // Рендерим в обратном порядке чтобы верхняя была поверх
          [...visible].reverse().map((profile, revIdx) => {
            const stackIndex = visible.length - 1 - revIdx;
            const isTop = stackIndex === 0;
            return (
              <SwipeCard
                key={profile.user_id}
                ref={isTop ? topCardRef : null}
                profile={profile}
                isTop={isTop}
                stackIndex={stackIndex}
                onLike={handleLike}
                onPass={handlePass}
                onSuperLike={handleSuperLike}
                onFavorite={async (uid) => {
                  try { await api.likes.favorite(uid); }
                  catch { /* ignore */ }
                }}
              />
            );
          })
        )}
      </div>

      {/* Кнопки действий */}
      {visible.length > 0 && (
        <div className="flex items-center justify-center gap-3 py-5 px-4 shrink-0">
          {/* Отмена свайпа (Undo) — только Premium */}
          <button
            onClick={pressUndo}
            disabled={undoing}
            title={isPremium ? 'Отменить последний свайп' : 'Только Premium'}
            className={`w-10 h-10 rounded-full bg-white border-2 flex items-center justify-center shadow-md hover:scale-110 active:scale-95 transition-all disabled:opacity-40 ${isPremium ? 'border-violet-200 hover:border-violet-400' : 'border-border opacity-40'}`}
          >
            {undoing
              ? <div className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
              : <Icon name="RotateCcw" size={16} className={isPremium ? 'text-violet-400' : 'text-muted-foreground'} />
            }
          </button>

          {/* Пропустить */}
          <button
            onClick={pressPass}
            disabled={busy}
            className="w-14 h-14 rounded-full bg-white border-2 border-rose-200 flex items-center justify-center shadow-lg hover:border-rose-400 hover:scale-110 active:scale-95 transition-all disabled:opacity-40"
          >
            <Icon name="X" size={26} className="text-rose-400" />
          </button>

          {/* Суперлайк */}
          <button
            onClick={pressSuper}
            disabled={busy}
            className="w-12 h-12 rounded-full bg-white border-2 border-blue-200 flex items-center justify-center shadow-md hover:border-blue-400 hover:scale-110 active:scale-95 transition-all disabled:opacity-40"
          >
            <Icon name="Star" size={20} className="text-blue-400" />
          </button>

          {/* Лайк */}
          <button
            onClick={pressLike}
            disabled={busy}
            className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, hsl(340 82% 58%), hsl(262 80% 64%))' }}
          >
            <Icon name="Heart" size={26} className="text-white" />
          </button>

          {/* Буст */}
          <button
            className="w-12 h-12 rounded-full bg-white border-2 border-amber-200 flex items-center justify-center shadow-md hover:border-amber-400 hover:scale-110 active:scale-95 transition-all disabled:opacity-40"
            disabled={boosting}
            onClick={async () => {
              setBoosting(true);
              try {
                const r = await api.likes.boost();
                alert(`Буст активирован на ${r.duration_min} мин! Использовано ${r.used}/${r.limit} в этом месяце.`);
              } catch (e: unknown) {
                alert(e instanceof Error ? e.message : 'Лимит бустов исчерпан');
              } finally { setBoosting(false); }
            }}
          >
            {boosting
              ? <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
              : <Icon name="Zap" size={20} className="text-amber-400" />
            }
          </button>
        </div>
      )}

      {matchData && (
        <MatchModal
          profileName={matchData.name}
          profilePhoto={matchData.photo}
          onClose={() => setMatchData(null)}
          onMessage={() => { setMatchData(null); onGoToMessages(matchData.matchId); }}
        />
      )}
    </div>
  );
}