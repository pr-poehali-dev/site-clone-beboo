import { useState, useEffect, useRef, useCallback } from 'react';
import { api, Match, Message } from '@/api/client';
import Icon from '@/components/ui/icon';

function timeAgo(s: string) {
  const d = Math.floor((Date.now() - new Date(s).getTime()) / 1000);
  if (d < 60) return 'только что';
  if (d < 3600) return `${Math.floor(d / 60)} мин`;
  if (d < 86400) return `${Math.floor(d / 3600)} ч`;
  return `${Math.floor(d / 86400)} д`;
}

export default function MatchesPage({ userId }: { userId: string }) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Match | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { loadMatches(); }, []);

  useEffect(() => {
    if (selected) {
      loadMessages(selected.match_id);
      pollRef.current = setInterval(() => loadMessages(selected.match_id), 5000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [selected?.match_id]);

  useEffect(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }, [messages.length]);

  const loadMatches = async () => {
    try { const r = await api.matches.list(); setMatches(r.matches); }
    catch { /* ignore */ } finally { setLoading(false); }
  };

  const loadMessages = useCallback(async (mid: string) => {
    setMsgLoading(true);
    try {
      const r = await api.matches.messages(mid);
      setMessages(r.messages);
      setMatches(prev => prev.map(m => m.match_id === mid ? { ...m, unread: 0 } : m));
    } catch { /* ignore */ } finally { setMsgLoading(false); }
  }, []);

  const send = async () => {
    if (!text.trim() || !selected || sending) return;
    const t = text; setText(''); setSending(true);
    try {
      const msg = await api.matches.send(selected.match_id, t);
      setMessages(p => [...p, msg]);
      setMatches(p => p.map(m => m.match_id === selected.match_id ? { ...m, last_message: t, last_time: msg.created_at } : m));
    } catch { setText(t); } finally { setSending(false); }
  };

  const sendImage = async (dataUrl: string) => {
    if (!selected || sending) return;
    setSending(true); setImagePreview(null);
    try {
      const msg = await api.matches.sendImage(selected.match_id, dataUrl);
      setMessages(p => [...p, msg]);
      setMatches(p => p.map(m => m.match_id === selected.match_id ? { ...m, last_message: '📷 Фото', last_time: msg.created_at } : m));
    } catch { alert('Не удалось отправить фото'); } finally { setSending(false); }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { const r = ev.target?.result as string; setImagePreview(r); };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const avatar = (m: Match) => m.photo || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(m.name)}`;
  const newMatches = matches.filter(m => !m.last_message);
  const chats = matches.filter(m => m.last_message);

  // ── Чат ─────────────────────────────────────────────────────────────
  if (selected) {
    return (
      <div className="flex flex-col h-full bg-background">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-white shrink-0 shadow-sm">
          <button onClick={() => { setSelected(null); setMessages([]); }} className="w-9 h-9 rounded-full hover:bg-secondary flex items-center justify-center transition-colors">
            <Icon name="ChevronLeft" size={22} className="text-foreground" />
          </button>
          <div className="relative">
            <img src={avatar(selected)} alt="" className="w-10 h-10 rounded-full object-cover bg-secondary"
              onError={e => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(selected.name)}`; }} />
            {selected.online && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-foreground truncate">{selected.name}, {selected.age}</p>
            <p className="text-xs text-emerald-500">{selected.online ? 'В сети' : 'Недавно была'}</p>
          </div>
          <button className="w-9 h-9 rounded-full hover:bg-secondary flex items-center justify-center transition-colors">
            <Icon name="MoreVertical" size={18} className="text-muted-foreground" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2" style={{ minHeight: 0 }}>
          {msgLoading && messages.length === 0 ? (
            <div className="flex justify-center py-10">
              <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            </div>
          ) : (
            <>
              <div className="text-center py-3">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full gradient-brand-soft text-xs font-semibold text-primary">
                  💫 Вы мэтч с {selected.name}!
                </div>
              </div>
              {messages.map((msg, i) => {
                const mine = msg.sender_id === userId || msg.is_mine;
                const showAvatar = !mine && (i === 0 || messages[i - 1]?.sender_id !== msg.sender_id);
                return (
                  <div key={msg.id} className={`flex items-end gap-2 ${mine ? 'justify-end' : 'justify-start'}`}>
                    {!mine && (
                      <img src={avatar(selected)} alt="" className={`w-7 h-7 rounded-full object-cover shrink-0 bg-secondary ${showAvatar ? 'opacity-100' : 'opacity-0'}`}
                        onError={e => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(selected.name)}`; }} />
                    )}
                    <div className={`max-w-[72%] ${mine ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                      {msg.msg_type === 'image' && msg.image_url ? (
                        <img src={msg.image_url} alt="фото" className="rounded-2xl max-w-full max-h-60 object-cover cursor-pointer"
                          onClick={() => window.open(msg.image_url!, '_blank')} />
                      ) : (
                        <div className={`px-4 py-2.5 rounded-2xl text-sm ${mine ? 'text-white rounded-br-sm' : 'bg-secondary text-foreground rounded-bl-sm'}`}
                          style={mine ? { background: 'linear-gradient(135deg, hsl(340 82% 58%), hsl(262 80% 64%))' } : {}}>
                          <p className="leading-relaxed">{msg.text}</p>
                        </div>
                      )}
                      <span className="text-[10px] text-muted-foreground px-1">{timeAgo(msg.created_at)}</span>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </>
          )}
        </div>

        {/* Image preview */}
        {imagePreview && (
          <div className="px-4 py-2 border-t border-border bg-white flex items-center gap-3">
            <img src={imagePreview} alt="" className="w-16 h-16 rounded-xl object-cover" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">Отправить фото?</p>
              <p className="text-xs text-muted-foreground">Нажми ➤ чтобы отправить</p>
            </div>
            <button onClick={() => sendImage(imagePreview)} disabled={sending} className="btn-primary px-4 py-2 text-sm text-white rounded-xl disabled:opacity-60">
              {sending ? '...' : 'Отправить'}
            </button>
            <button onClick={() => setImagePreview(null)} className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground">
              <Icon name="X" size={18} />
            </button>
          </div>
        )}

        {/* Input */}
        <div className="p-3 border-t border-border bg-white shrink-0">
          <div className="flex items-center gap-2 bg-secondary rounded-2xl px-3 py-2">
            <button onClick={() => fileRef.current?.click()} className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors shrink-0">
              <Icon name="Image" size={20} />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
            <input
              type="text" value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder={`Написать ${selected.name}...`}
              className="flex-1 bg-transparent text-sm text-foreground placeholder-muted-foreground outline-none min-w-0"
            />
            <button
              onClick={send} disabled={!text.trim() || sending}
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 disabled:opacity-40 transition-all"
              style={{ background: text.trim() ? 'linear-gradient(135deg, hsl(340 82% 58%), hsl(262 80% 64%))' : undefined }}
            >
              {sending
                ? <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                : <Icon name="Send" size={15} className={text.trim() ? 'text-white' : 'text-muted-foreground'} />
              }
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Список мэтчей ────────────────────────────────────────────────────
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

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 space-y-5">
        <h2 className="text-xl font-black text-foreground">Сообщения</h2>

        {newMatches.length > 0 && (
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Новые мэтчи</p>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {newMatches.map(m => (
                <button key={m.match_id} onClick={() => setSelected(m)} className="flex flex-col items-center gap-2 shrink-0 group">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full p-0.5" style={{ background: 'linear-gradient(135deg, hsl(340 82% 58%), hsl(262 80% 64%))' }}>
                      <img src={avatar(m)} alt={m.name} className="w-full h-full rounded-full object-cover border-2 border-white bg-secondary"
                        onError={e => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(m.name)}`; }} />
                    </div>
                    {m.online && <span className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white" />}
                  </div>
                  <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">{m.name}</span>
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
                <button key={m.match_id} onClick={() => setSelected(m)} className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-secondary/60 transition-all text-left active:scale-[0.98]">
                  <div className="relative shrink-0">
                    <img src={avatar(m)} alt="" className="w-12 h-12 rounded-full object-cover bg-secondary"
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
                          {m.unread}
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
