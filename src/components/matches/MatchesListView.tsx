import { useState } from 'react';
import { Match } from '@/api/client';
import { timeAgo, avatarUrl } from './MatchesChatView';

interface ListViewProps {
  matches: Match[];
  loading: boolean;
  onSelect: (match: Match) => void;
}

export default function MatchesListView({ matches, loading, onSelect }: ListViewProps) {
  const [search, setSearch] = useState('');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="text-6xl mb-4">💘</div>
        <h3 className="text-xl font-black text-foreground mb-2">Мэтчей пока нет</h3>
        <p className="text-muted-foreground text-sm">Лайкай анкеты и скоро появятся совпадения!</p>
      </div>
    );
  }

  const searchLower = search.toLowerCase().trim();
  const filtered = searchLower
    ? matches.filter(m => m.name.toLowerCase().includes(searchLower))
    : matches;

  const newMatches = filtered.filter(m => !m.last_message);
  const chats = filtered.filter(m => m.last_message);

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 space-y-5">
        <h2 className="text-xl font-black text-foreground">Сообщения</h2>

        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Поиск по имени..."
          className="w-full bg-secondary border border-border rounded-2xl px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors"
        />

        {newMatches.length > 0 && (
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Новые мэтчи</p>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {newMatches.map(m => (
                <button key={m.match_id} onClick={() => onSelect(m)} className="flex flex-col items-center gap-2 shrink-0 group">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full p-0.5" style={{ background: 'linear-gradient(135deg, hsl(340 82% 58%), hsl(262 80% 64%))' }}>
                      <img src={avatarUrl(m)} alt="" className="w-full h-full rounded-full object-cover bg-secondary"
                        onError={e => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(m.name)}`; }} />
                    </div>
                    {m.online && <span className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white" />}
                  </div>
                  <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors truncate max-w-[70px]">{m.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {chats.length > 0 && (
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Чаты</p>
            <div className="space-y-1">
              {chats.map(m => (
                <button key={m.match_id} onClick={() => onSelect(m)}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-secondary/60 transition-all text-left active:scale-[0.98]">
                  <div className="relative shrink-0">
                    <img src={avatarUrl(m)} alt="" className="w-12 h-12 rounded-full object-cover bg-secondary"
                      onError={e => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(m.name)}`; }} />
                    {m.online && <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="font-bold text-sm text-foreground">{m.name}</p>
                      {m.last_time && <span className="text-[11px] text-muted-foreground shrink-0 ml-2">{timeAgo(m.last_time)}</span>}
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground truncate">{m.last_message || 'Начни общение!'}</p>
                      {m.unread > 0 && (
                        <span className="ml-2 min-w-[20px] h-5 px-1 rounded-full flex items-center justify-center text-white text-[10px] font-black shrink-0"
                          style={{ background: 'linear-gradient(135deg, hsl(340 82% 58%), hsl(262 80% 64%))' }}>
                          {m.unread > 9 ? '9+' : m.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}