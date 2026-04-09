import { useState, useEffect } from 'react';
import { api, Match, Profile, GiftItem } from '@/api/client';
import Icon from '@/components/ui/icon';

export function ProfileDrawer({ match, onClose }: { match: Match; onClose: () => void }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [photoIdx, setPhotoIdx] = useState(0);

  useEffect(() => {
    api.profiles.get(match.other_user_id)
      .then(p => setProfile(p))
      .catch(() => setProfile(null));
  }, [match.other_user_id]);

  const fallback = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(match.name)}`;
  const photos = profile?.photos?.length ? profile.photos : [match.photo || fallback];

  return (
    <div className="absolute inset-0 z-20 bg-background flex flex-col animate-slide-up">
      <div className="relative flex-1 min-h-0" style={{ maxHeight: '65%' }}>
        <img src={photos[photoIdx] || fallback} alt={match.name}
          className="w-full h-full object-cover"
          onError={e => { (e.target as HTMLImageElement).src = fallback; }} />

        {photos.length > 1 && (
          <div className="absolute top-3 left-3 right-3 flex gap-1.5">
            {photos.map((_, i) => (
              <div key={i} className={`flex-1 h-1 rounded-full ${i === photoIdx ? 'bg-white' : 'bg-white/40'}`} />
            ))}
          </div>
        )}
        {photos.length > 1 && (
          <>
            <button className="absolute left-0 top-0 bottom-0 w-1/3" onClick={() => setPhotoIdx(i => Math.max(0, i - 1))} />
            <button className="absolute right-0 top-0 bottom-0 w-1/3" onClick={() => setPhotoIdx(i => Math.min(photos.length - 1, i + 1))} />
          </>
        )}

        <button onClick={onClose}
          className="absolute top-4 left-4 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
          <Icon name="ChevronLeft" size={20} className="text-white" />
        </button>

        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </div>

      <div className="px-5 py-4 overflow-y-auto flex-1">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h2 className="text-2xl font-black text-foreground">{match.name}, {match.age}</h2>
            <div className="flex items-center gap-1.5 text-muted-foreground text-sm mt-0.5">
              <Icon name="MapPin" size={13} />
              <span>{profile?.city || '—'}</span>
              {profile?.job && <><span>·</span><Icon name="Briefcase" size={13} /><span>{profile.job}</span></>}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {match.online && <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full" />}
            {match.verified && (
              <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                <Icon name="Check" size={12} className="text-white" />
              </div>
            )}
          </div>
        </div>

        {profile?.bio && (
          <p className="text-sm text-foreground/80 leading-relaxed mb-4">{profile.bio}</p>
        )}

        {profile?.tags && profile.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {profile.tags.map(tag => (
              <span key={tag} className="px-3 py-1 rounded-full gradient-brand-soft text-primary text-xs font-bold">{tag}</span>
            ))}
          </div>
        )}

        <button onClick={onClose}
          className="w-full py-3 rounded-2xl btn-primary text-white font-bold text-sm">
          Назад к чату
        </button>
      </div>
    </div>
  );
}

export function ReportModal({ userId, name, onClose }: { userId: string; name: string; onClose: () => void }) {
  const reasons = ['Фейковый профиль', 'Оскорбительное поведение', 'Спам', 'Мошенничество', 'Несовершеннолетний', 'Другое'];
  const [selected, setSelected] = useState('');
  const [sending, setSending] = useState(false);
  const send = async () => {
    if (!selected) return;
    setSending(true);
    try { await api.likes.report(userId, selected); alert('Жалоба отправлена. Мы рассмотрим её в течение 24 часов.'); onClose(); }
    catch (e: unknown) { alert(e instanceof Error ? e.message : 'Ошибка'); }
    finally { setSending(false); }
  };
  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-end justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl p-5 w-full max-w-sm animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-foreground">Пожаловаться на {name}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center"><Icon name="X" size={16} /></button>
        </div>
        <div className="space-y-2 mb-4">
          {reasons.map(r => (
            <button key={r} onClick={() => setSelected(r)}
              className={`w-full text-left px-4 py-2.5 rounded-2xl text-sm font-semibold border-2 transition-all ${selected === r ? 'border-primary bg-primary/5 text-primary' : 'border-border text-foreground hover:border-primary/30'}`}>
              {r}
            </button>
          ))}
        </div>
        <button onClick={send} disabled={!selected || sending}
          className="w-full py-3 rounded-2xl bg-rose-500 text-white font-bold text-sm disabled:opacity-50">
          {sending ? 'Отправляем...' : 'Отправить жалобу'}
        </button>
      </div>
    </div>
  );
}

export function GiftModal({ toUserId, toName, matchId, onClose }: { toUserId: string; toName: string; matchId: string; onClose: () => void }) {
  const [gifts, setGifts] = useState<GiftItem[]>([]);
  const [balance, setBalance] = useState(0);
  const [selected, setSelected] = useState<GiftItem | null>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.wallet.giftCatalog(), api.wallet.balance()])
      .then(([c, w]) => { setGifts(c.gifts); setBalance(w.balance); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const send = async () => {
    if (!selected) return;
    const giftName = selected.name;
    const giftEmoji = selected.emoji;
    setSending(true);
    try {
      const r = await api.wallet.sendGift(toUserId, selected.id, message, matchId);
      setBalance(r.balance);
      alert(r.message || `Подарок ${giftEmoji} ${giftName} отправлен!`);
      onClose();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Ошибка отправки подарка');
    } finally { setSending(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-end justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl p-5 w-full max-w-sm max-h-[80vh] flex flex-col animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3 shrink-0">
          <div>
            <h3 className="font-black text-foreground">Подарок для {toName}</h3>
            <p className="text-xs text-muted-foreground">Баланс: <span className="font-bold text-primary">{balance} монет</span></p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center"><Icon name="X" size={16} /></button>
        </div>
        {loading ? <div className="flex justify-center py-8"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div> : (
          <>
            <div className="grid grid-cols-3 gap-2 mb-4 overflow-y-auto max-h-48">
              {gifts.map(g => (
                <button key={g.id} onClick={() => setSelected(g)}
                  className={`p-2 rounded-2xl border-2 flex flex-col items-center gap-1 transition-all ${selected?.id === g.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}>
                  <span className="text-2xl">{g.emoji}</span>
                  <p className="text-[10px] font-bold text-foreground">{g.name}</p>
                  <p className="text-[10px] text-primary font-black">{g.price}₽</p>
                </button>
              ))}
            </div>
            <input value={message} onChange={e => setMessage(e.target.value)} placeholder="Сообщение (необязательно)"
              className="w-full bg-secondary border border-border rounded-2xl px-4 py-2.5 text-sm outline-none mb-3" />
            <button onClick={send} disabled={!selected || sending}
              className="w-full py-3 rounded-2xl btn-primary text-white font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
              {sending ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Icon name="Gift" size={16} />}
              {selected ? `Отправить за ${selected.price} монет` : 'Выберите подарок'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}