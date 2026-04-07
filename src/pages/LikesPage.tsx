import { useState, useEffect } from 'react';
import { api, IncomingLike } from '@/api/client';
import Icon from '@/components/ui/icon';

export default function LikesPage() {
  const [likes, setLikes] = useState<IncomingLike[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.likes.incoming()
      .then(res => setLikes(res.likes))
      .catch(() => setLikes([]))
      .finally(() => setLoading(false));
  }, []);

  const fallback = (name: string) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`;

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" /></div>;
  }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-foreground">Вы понравились</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{likes.length} лайков</p>
        </div>
        <button className="btn-primary px-4 py-2 text-xs flex items-center gap-1.5">
          <Icon name="Zap" size={14} className="text-white" />
          Premium
        </button>
      </div>

      {likes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-6xl mb-4">🌹</div>
          <h3 className="text-lg font-black text-foreground mb-2">Лайков пока нет</h3>
          <p className="text-muted-foreground text-sm">Продолжай смотреть анкеты — скоро кто-то лайкнет тебя</p>
        </div>
      ) : (
        <>
          <div className="rounded-2xl border-2 border-dashed border-primary/30 bg-gradient-to-br from-pink/5 to-purple/5 p-4 text-center">
            <div className="text-3xl mb-2">💝</div>
            <p className="font-bold text-sm text-foreground">Разблокируй все лайки</p>
            <p className="text-xs text-muted-foreground mt-1">С Premium ты видишь всех, кто тебя лайкнул</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {likes.map((like, i) => (
              <div key={like.user_id} className="relative rounded-2xl overflow-hidden aspect-[3/4] animate-fade-in card-shadow" style={{ animationDelay: `${i * 0.08}s` }}>
                <img
                  src={like.photo || fallback(like.name)}
                  alt=""
                  className="w-full h-full object-cover"
                  style={{ filter: i > 1 ? 'blur(14px) brightness(0.7)' : 'none' }}
                  onError={e => { (e.target as HTMLImageElement).src = fallback(like.name); }}
                />
                <div className="gradient-card absolute inset-0" />
                {i > 1 && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-2">
                      <Icon name="Lock" size={20} className="text-white" />
                    </div>
                    <p className="text-white text-xs font-bold">Premium</p>
                  </div>
                )}
                {like.is_super && i <= 1 && (
                  <div className="absolute top-2 left-2 bg-blue-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Icon name="Star" size={10} className="text-white" /> Суперлайк
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <p className="text-white font-black text-sm">{like.name}, {like.age}</p>
                </div>
                {i <= 1 && (
                  <div className="absolute top-2 right-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, hsl(340 82% 58%), hsl(262 80% 64%))' }}>
                      <Icon name="Heart" size={15} className="text-white" />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
