import { useState, useEffect } from 'react';
import { api, IncomingLike } from '@/api/client';
import MatchModal from '@/components/MatchModal';
import Icon from '@/components/ui/icon';

export default function LikesPage({ onGoToMessages }: { onGoToMessages?: () => void }) {
  const [likes, setLikes] = useState<IncomingLike[]>([]);
  const [loading, setLoading] = useState(true);
  const [matchData, setMatchData] = useState<{ name: string; photo: string } | null>(null);
  const [acting, setActing] = useState<string | null>(null);

  useEffect(() => {
    api.likes.incoming()
      .then(res => setLikes(res.likes))
      .catch(() => setLikes([]))
      .finally(() => setLoading(false));
  }, []);

  const handleLike = async (like: IncomingLike) => {
    if (acting) return;
    setActing(like.user_id);
    try {
      const res = await api.likes.like(like.user_id, false);
      setLikes(prev => prev.filter(l => l.user_id !== like.user_id));
      if (res.is_match && res.match_id) setMatchData(res.profile);
    } catch { /* ignore */ }
    finally { setActing(null); }
  };

  const handlePass = async (like: IncomingLike) => {
    if (acting) return;
    setActing(like.user_id);
    try {
      await api.likes.pass(like.user_id);
      setLikes(prev => prev.filter(l => l.user_id !== like.user_id));
    } catch { /* ignore */ }
    finally { setActing(null); }
  };

  const fallback = (name: string) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-xl font-black text-foreground">Вы понравились</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {likes.length > 0 ? `${likes.length} человек лайкнули вас` : 'Пока никто не лайкнул'}
          </p>
        </div>
      </div>

      {likes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-6xl mb-4">🌹</div>
          <h3 className="text-lg font-black text-foreground mb-2">Лайков пока нет</h3>
          <p className="text-muted-foreground text-sm">Продолжай смотреть анкеты — скоро кто-то тебя лайкнет!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {likes.map((like, i) => {
            const isBlurred = i > 1;
            const isActing = acting === like.user_id;
            return (
              <div
                key={like.user_id}
                className="flex items-center gap-3 p-3 rounded-2xl border border-border bg-white card-shadow animate-fade-in"
                style={{ animationDelay: `${i * 0.06}s` }}
              >
                <div className="relative shrink-0">
                  <img
                    src={like.photo || fallback(like.name)}
                    alt={like.name}
                    className="w-16 h-16 rounded-2xl object-cover bg-secondary"
                    style={{ filter: isBlurred ? 'blur(8px)' : 'none' }}
                    onError={e => { (e.target as HTMLImageElement).src = fallback(like.name); }}
                  />
                  {like.is_super && !isBlurred && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                      <Icon name="Star" size={10} className="text-white" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  {isBlurred ? (
                    <div className="space-y-1.5">
                      <div className="h-4 w-24 bg-border rounded-full" />
                      <div className="h-3 w-16 bg-border/60 rounded-full" />
                    </div>
                  ) : (
                    <>
                      <p className="font-bold text-foreground">{like.name}, {like.age}</p>
                      {like.is_super && (
                        <p className="text-xs text-blue-500 font-semibold flex items-center gap-1 mt-0.5">
                          <Icon name="Star" size={11} /> Суперлайк
                        </p>
                      )}
                    </>
                  )}
                </div>

                {isBlurred ? (
                  <button className="px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 btn-primary text-white shrink-0">
                    <Icon name="Lock" size={13} className="text-white" /> Premium
                  </button>
                ) : (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handlePass(like)}
                      disabled={!!acting}
                      className="w-10 h-10 rounded-full bg-white border-2 border-rose-200 flex items-center justify-center hover:border-rose-400 hover:scale-110 active:scale-95 transition-all disabled:opacity-40"
                    >
                      <Icon name="X" size={18} className="text-rose-400" />
                    </button>
                    <button
                      onClick={() => handleLike(like)}
                      disabled={!!acting}
                      className="w-10 h-10 rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-all disabled:opacity-40"
                      style={{ background: 'linear-gradient(135deg, hsl(340 82% 58%), hsl(262 80% 64%))' }}
                    >
                      {isActing
                        ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        : <Icon name="Heart" size={18} className="text-white" />
                      }
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {matchData && (
        <MatchModal
          profileName={matchData.name}
          profilePhoto={matchData.photo}
          onClose={() => setMatchData(null)}
          onMessage={() => { setMatchData(null); onGoToMessages?.(); }}
        />
      )}
    </div>
  );
}
