import { useState, useEffect } from 'react';
import { api, ProfileViewer } from '@/api/client';
import Icon from '@/components/ui/icon';

interface ViewersPageProps {
  isPremium: boolean;
  onUpgrade: () => void;
}

export default function ViewersPage({ isPremium, onUpgrade }: ViewersPageProps) {
  const [viewers, setViewers] = useState<ProfileViewer[]>([]);
  const [count, setCount] = useState(0);
  const [locked, setLocked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.likes.myViewers()
      .then(r => { setLocked(r.locked); setCount(r.count); setViewers(r.viewers); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const fallback = (n: string) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(n)}`;

  function timeAgo(s: string) {
    const d = Math.floor((Date.now() - new Date(s).getTime()) / 1000);
    if (d < 60) return 'только что';
    if (d < 3600) return `${Math.floor(d / 60)} мин назад`;
    if (d < 86400) return `${Math.floor(d / 3600)} ч назад`;
    return `${Math.floor(d / 86400)} д назад`;
  }

  if (loading) {
    return <div className="flex items-center justify-center h-full">
      <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
    </div>;
  }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <div>
        <h2 className="text-xl font-black text-foreground">Кто смотрел профиль</h2>
        <p className="text-sm text-muted-foreground mt-0.5">За последние 7 дней</p>
      </div>

      {/* Счётчик */}
      <div className="rounded-2xl p-4 flex items-center gap-4" style={{ background: 'linear-gradient(135deg, hsl(340 82% 58%), hsl(262 80% 64%))' }}>
        <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
          <Icon name="Eye" size={24} className="text-white" />
        </div>
        <div>
          <p className="text-3xl font-black text-white">{count}</p>
          <p className="text-white/80 text-sm">просмотров за 7 дней</p>
        </div>
      </div>

      {locked ? (
        /* Заблокировано — нужен Premium */
        <div className="rounded-2xl border-2 border-dashed border-border p-6 text-center space-y-4">
          <div className="relative">
            {/* Размытые заглушки */}
            <div className="grid grid-cols-3 gap-2 mb-4 blur-sm select-none pointer-events-none">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="flex items-center gap-2 bg-secondary rounded-xl p-2">
                  <div className="w-8 h-8 rounded-full bg-muted" />
                  <div className="space-y-1 flex-1">
                    <div className="h-2 bg-muted rounded w-3/4" />
                    <div className="h-2 bg-muted rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 rounded-2xl backdrop-blur-sm">
              <Icon name="Lock" size={32} className="text-muted-foreground mb-2" />
              <p className="font-black text-foreground text-base mb-1">{count > 0 ? `${count} человек смотрели` : 'Никто ещё не смотрел'}</p>
              <p className="text-muted-foreground text-sm mb-3">Узнай кто — с Premium</p>
              <button onClick={onUpgrade}
                className="px-5 py-2.5 rounded-2xl text-white text-sm font-bold"
                style={{ background: 'linear-gradient(135deg, hsl(340 82% 58%), hsl(262 80% 64%))' }}>
                Открыть Premium
              </button>
            </div>
          </div>
        </div>
      ) : viewers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="text-5xl mb-3">👀</div>
          <p className="font-bold text-foreground">Пока никто не заходил</p>
          <p className="text-muted-foreground text-sm mt-1">Попробуй сделать буст профиля!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {viewers.map(v => (
            <div key={v.user_id} className="flex items-center gap-3 p-3 rounded-2xl bg-secondary hover:bg-secondary/80 transition-colors">
              <img src={v.photo || fallback(v.name)} alt={v.name}
                className="w-12 h-12 rounded-full object-cover bg-muted shrink-0"
                onError={e => { (e.target as HTMLImageElement).src = fallback(v.name); }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <p className="font-bold text-sm text-foreground truncate">{v.name}, {v.age}</p>
                  {v.verified && (
                    <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
                      <Icon name="Check" size={9} className="text-white" />
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{v.city}</p>
              </div>
              <p className="text-xs text-muted-foreground shrink-0">{timeAgo(v.viewed_at)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
