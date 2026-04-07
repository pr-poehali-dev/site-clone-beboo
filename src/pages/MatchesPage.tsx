import { useState, useEffect, useRef } from 'react';
import { api, Match, Message } from '@/api/client';
import Icon from '@/components/ui/icon';

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'только что';
  if (diff < 3600) return `${Math.floor(diff / 60)} мин`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч`;
  return `${Math.floor(diff / 86400)} д`;
}

interface MatchesPageProps {
  userId: string;
}

export default function MatchesPage({ userId }: MatchesPageProps) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Match | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadMatches(); }, []);
  useEffect(() => { if (selected) loadMessages(selected.match_id); }, [selected]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const loadMatches = async () => {
    setLoading(true);
    try {
      const res = await api.matches.list();
      setMatches(res.matches);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  const loadMessages = async (matchId: string) => {
    setMsgLoading(true);
    try {
      const res = await api.matches.messages(matchId);
      setMessages(res.messages);
      setMatches(prev => prev.map(m => m.match_id === matchId ? { ...m, unread: 0 } : m));
    } catch { /* ignore */ }
    finally { setMsgLoading(false); }
  };

  const send = async () => {
    if (!text.trim() || !selected || sending) return;
    const t = text.trim();
    setText('');
    setSending(true);
    try {
      const msg = await api.matches.send(selected.match_id, t);
      setMessages(prev => [...prev, msg]);
      setMatches(prev => prev.map(m =>
        m.match_id === selected.match_id ? { ...m, last_message: t, last_time: msg.created_at } : m
      ));
    } catch { setText(t); }
    finally { setSending(false); }
  };

  const fallbackAvatar = (name: string) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`;

  if (selected) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-white shrink-0">
          <button onClick={() => setSelected(null)} className="w-9 h-9 rounded-full hover:bg-secondary flex items-center justify-center transition-colors">
            <Icon name="ChevronLeft" size={20} className="text-foreground" />
          </button>
          <div className="relative">
            <img src={selected.photo || fallbackAvatar(selected.name)} alt="" className="w-10 h-10 rounded-full object-cover bg-secondary" onError={e => { (e.target as HTMLImageElement).src = fallbackAvatar(selected.name); }} />
            {selected.online && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white" />}
          </div>
          <div>
            <p className="font-bold text-foreground text-sm">{selected.name}, {selected.age}</p>
            <p className="text-xs text-emerald-500">{selected.online ? 'В сети' : 'Была недавно'}</p>
          </div>
          <div className="ml-auto flex gap-1">
            <button className="w-9 h-9 rounded-full hover:bg-secondary flex items-center justify-center transition-colors">
              <Icon name="Phone" size={18} className="text-muted-foreground" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ minHeight: 0 }}>
          {msgLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            </div>
          ) : (
            <>
              <div className="text-center mb-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full gradient-brand-soft text-xs font-semibold text-primary">
                  <span>💫</span><span>Вы мэтч! Напишите первым</span>
                </div>
              </div>
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.sender_id === userId ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                  {msg.sender_id !== userId && (
                    <img src={selected.photo || fallbackAvatar(selected.name)} alt="" className="w-7 h-7 rounded-full object-cover mr-2 shrink-0 self-end bg-secondary" onError={e => { (e.target as HTMLImageElement).src = fallbackAvatar(selected.name); }} />
                  )}
                  <div
                    className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${msg.sender_id === userId ? 'text-white rounded-br-sm' : 'bg-secondary text-foreground rounded-bl-sm'}`}
                    style={msg.sender_id === userId ? { background: 'linear-gradient(135deg, hsl(340 82% 58%), hsl(262 80% 64%))' } : {}}
                  >
                    <p>{msg.text}</p>
                    <p className={`text-[10px] mt-1 ${msg.sender_id === userId ? 'text-white/60' : 'text-muted-foreground'}`}>{timeAgo(msg.created_at)}</p>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </>
          )}
        </div>

        <div className="p-3 border-t border-border bg-white shrink-0">
          <div className="flex items-center gap-2 bg-secondary rounded-2xl px-4 py-2.5">
            <input
              type="text"
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder={`Написать ${selected.name}...`}
              className="flex-1 bg-transparent text-sm text-foreground placeholder-muted-foreground outline-none"
            />
            <button onClick={send} disabled={!text.trim() || sending} className="w-8 h-8 rounded-full flex items-center justify-center btn-primary disabled:opacity-40">
              <Icon name="Send" size={15} className="text-white" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" /></div>;
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

  const newMatches = matches.filter(m => !m.last_message);
  const chats = matches.filter(m => m.last_message);

  return (
    <div className="h-full overflow-y-auto p-4 space-y-6">
      <h2 className="text-xl font-black text-foreground">Сообщения</h2>

      {newMatches.length > 0 && (
        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Новые мэтчи</p>
          <div className="flex gap-4 overflow-x-auto pb-1">
            {newMatches.map(m => (
              <button key={m.match_id} onClick={() => setSelected(m)} className="flex flex-col items-center gap-2 shrink-0">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full p-0.5" style={{ background: 'linear-gradient(135deg, hsl(340 82% 58%), hsl(262 80% 64%))' }}>
                    <img src={m.photo || fallbackAvatar(m.name)} alt={m.name} className="w-full h-full rounded-full object-cover border-2 border-white bg-secondary" onError={e => { (e.target as HTMLImageElement).src = fallbackAvatar(m.name); }} />
                  </div>
                  {m.online && <span className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white" />}
                </div>
                <span className="text-xs font-semibold text-foreground">{m.name}</span>
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
              <button key={m.match_id} onClick={() => setSelected(m)} className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-secondary transition-all text-left">
                <div className="relative shrink-0">
                  <img src={m.photo || fallbackAvatar(m.name)} alt="" className="w-12 h-12 rounded-full object-cover bg-secondary" onError={e => { (e.target as HTMLImageElement).src = fallbackAvatar(m.name); }} />
                  {m.online && <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-sm text-foreground">{m.name}</p>
                    {m.last_time && <span className="text-xs text-muted-foreground shrink-0 ml-2">{timeAgo(m.last_time)}</span>}
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-sm text-muted-foreground truncate">{m.last_message}</p>
                    {m.unread > 0 && <span className="ml-2 w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 gradient-brand">{m.unread}</span>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
