import { useState, useEffect } from 'react';
import { api, FavoriteProfile } from '@/api/client';
import Icon from '@/components/ui/icon';

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<FavoriteProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try { const r = await api.likes.favorites(); setFavorites(r.favorites); }
    catch { setFavorites([]); } finally { setLoading(false); }
  };

  const remove = async (id: string) => {
    try { await api.likes.unfavorite(id); setFavorites(p => p.filter(f => f.user_id !== id)); }
    catch { /* ignore */ }
  };

  const fallback = (n: string) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(n)}`;

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" /></div>;
  }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <div>
        <h2 className="text-xl font-black text-foreground">Избранные</h2>
        <p className="text-sm text-muted-foreground mt-0.5">{favorites.length > 0 ? `${favorites.length} сохранённых анкет` : 'Пока пусто'}</p>
      </div>

      {favorites.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-6xl mb-4">⭐</div>
          <h3 className="text-lg font-black text-foreground mb-2">Нет избранных</h3>
          <p className="text-muted-foreground text-sm">Нажимай ⭐ на анкетах чтобы добавить в избранное</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {favorites.map(f => (
            <div key={f.user_id} className="relative rounded-2xl overflow-hidden card-shadow group">
              <img src={f.photo || fallback(f.name)} alt={f.name}
                className="w-full aspect-[3/4] object-cover bg-secondary"
                onError={e => { (e.target as HTMLImageElement).src = fallback(f.name); }} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <div className="flex items-center gap-1">
                  <p className="font-black text-white text-sm">{f.name}, {f.age}</p>
                  {f.verified && (
                    <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                      <Icon name="Check" size={9} className="text-white" />
                    </div>
                  )}
                </div>
                {f.city && <p className="text-white/70 text-xs">{f.city}</p>}
              </div>
              <button onClick={() => remove(f.user_id)}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Icon name="X" size={13} className="text-white" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
