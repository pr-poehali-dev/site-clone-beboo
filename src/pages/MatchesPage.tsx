import { useState, useEffect, useRef, useCallback } from 'react';
import { api, Match, Message } from '@/api/client';
import MatchesChatView from '@/components/matches/MatchesChatView';
import MatchesListView from '@/components/matches/MatchesListView';

export default function MatchesPage({ userId, openMatchId, onMatchOpened }: { userId: string; openMatchId?: string; onMatchOpened?: () => void }) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Match | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [favoritedUsers, setFavoritedUsers] = useState<Set<string>>(new Set());
  const [isTyping, setIsTyping] = useState(false);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showGifts, setShowGifts] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastMsgCount = useRef(0);

  useEffect(() => { loadMatches(); }, []);

  // Открываем чат по matchId — ждём загрузки списка, не вызываем onMatchOpened раньше времени
  useEffect(() => {
    if (!openMatchId) return;
    if (matches.length > 0) {
      const match = matches.find(m => m.match_id === openMatchId);
      if (match) {
        setSelected(match);
        onMatchOpened?.(); // очищаем только после нахождения
      }
      // если матч не найден — loadMatches уже сделан, не очищаем чтобы retry работал
    }
  }, [openMatchId, matches]);

  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (!selected) return;
    setShowProfile(false);
    loadMessages(selected.match_id);
    pollRef.current = setInterval(() => {
      if (!document.hidden) loadMessagesQuiet(selected.match_id);
    }, 6000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [selected?.match_id]);

  useEffect(() => {
    if (messages.length > lastMsgCount.current) {
      lastMsgCount.current = messages.length;
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  }, [messages.length]);

  const loadMatches = async () => {
    try {
      const r = await api.matches.list();
      setMatches(r.matches);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  // При появлении openMatchId — принудительно обновляем список (новый мэтч может ещё не быть в кэше)
  useEffect(() => {
    if (openMatchId) { loadMatches(); }
  }, [openMatchId]);

  const loadMessages = useCallback(async (mid: string) => {
    setMsgLoading(true);
    try {
      const r = await api.matches.messages(mid);
      setMessages(r.messages);
      lastMsgCount.current = r.messages.length;
      setMatches(prev => prev.map(m => m.match_id === mid ? { ...m, unread: 0 } : m));
    } catch { /* ignore */ } finally { setMsgLoading(false); }
  }, []);

  const loadMessagesQuiet = useCallback(async (mid: string) => {
    try {
      const r = await api.matches.messages(mid);
      setMessages(prev => {
        const lastPrev = prev[prev.length - 1]?.id;
        const lastNew = r.messages[r.messages.length - 1]?.id;
        if (r.messages.length !== prev.length || lastPrev !== lastNew) return r.messages;
        return prev;
      });
    } catch { /* ignore */ }
  }, []);

  const toggleFavorite = async (uid: string) => {
    const isFav = favoritedUsers.has(uid);
    try {
      if (isFav) { await api.likes.unfavorite(uid); setFavoritedUsers(s => { const n = new Set(s); n.delete(uid); return n; }); }
      else { await api.likes.favorite(uid); setFavoritedUsers(s => new Set(s).add(uid)); }
    } catch { /* ignore */ }
  };

  const handleTyping = (val: string) => {
    setText(val);
    if (!selected) return;
    if (typingTimer.current) clearTimeout(typingTimer.current);
    api.matches.typing(selected.match_id).catch(() => {});
    typingTimer.current = setTimeout(() => { setIsTyping(false); }, 3000);
  };

  const send = async () => {
    if (!text.trim() || !selected || sending) return;
    const t = text; setText(''); setSending(true); setSendError('');
    try {
      const msg = await api.matches.send(selected.match_id, t);
      setMessages(p => [...p, msg]);
      setMatches(p => p.map(m => m.match_id === selected.match_id ? { ...m, last_message: t, last_time: msg.created_at } : m));
    } catch (e: unknown) {
      setText(t);
      const errMsg = e instanceof Error ? e.message : 'Ошибка отправки';
      if (errMsg.includes('авторизован') || errMsg.includes('401') || errMsg.includes('403')) {
        setSendError('Сессия истекла — войдите заново');
      } else {
        setSendError(errMsg);
      }
    } finally { setSending(false); }
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
    reader.onload = ev => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  if (selected) {
    return (
      <MatchesChatView
        selected={selected}
        userId={userId}
        messages={messages}
        msgLoading={msgLoading}
        text={text}
        sending={sending}
        sendError={sendError}
        imagePreview={imagePreview}
        showProfile={showProfile}
        showReport={showReport}
        showGifts={showGifts}
        favoritedUsers={favoritedUsers}
        bottomRef={bottomRef}
        onBack={() => { setSelected(null); setMessages([]); }}
        onSetText={setText}
        onHandleTyping={handleTyping}
        onSend={send}
        onSendImage={sendImage}
        onFileChange={onFileChange}
        onSetImagePreview={setImagePreview}
        onToggleFavorite={toggleFavorite}
        onSetShowProfile={setShowProfile}
        onSetShowGifts={setShowGifts}
        onSetShowReport={setShowReport}
      />
    );
  }

  return (
    <MatchesListView
      matches={matches}
      loading={loading}
      onSelect={setSelected}
    />
  );
}