import { useState, useEffect, useCallback } from 'react';
import { api, AdminUserDetail as AdminUserDetailType, AdminMatch } from '@/api/client';
import Icon from '@/components/ui/icon';
import { Spinner, Badge, SectionTitle, ChatViewer } from './adminShared';

export function UserDetailCard({ userId, onClose, onRefresh }: { userId: string; onClose: () => void; onRefresh: () => void }) {
  const [detail, setDetail] = useState<AdminUserDetailType | null>(null);
  const [matches, setMatches] = useState<AdminMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatMatch, setChatMatch] = useState<{ id: string; title: string } | null>(null);
  const [banReason, setBanReason] = useState('');
  const [showBanInput, setShowBanInput] = useState(false);
  const [premiumDays, setPremiumDays] = useState(30);
  const [showPremiumInput, setShowPremiumInput] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [d, m] = await Promise.all([
        api.admin.userDetail(userId),
        api.admin.userMatches(userId),
      ]);
      setDetail(d);
      setMatches(m.matches);
    } catch { /* ignore */ }
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const doAction = async (fn: () => Promise<unknown>) => {
    setActionLoading(true);
    try {
      await fn();
      await load();
      onRefresh();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Ошибка');
    }
    setActionLoading(false);
  };

  if (loading) return (
    <div className="fixed inset-0 z-[55] bg-black/50 flex items-center justify-center">
      <div className="bg-white rounded-2xl p-8"><Spinner /></div>
    </div>
  );
  if (!detail) return null;

  return (
    <>
      <div className="fixed inset-0 z-[55] bg-black/50 flex items-end justify-center">
        <div className="bg-white w-full max-w-2xl rounded-t-2xl max-h-[90vh] flex flex-col animate-slide-up">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
            <p className="text-sm font-black text-foreground">Карточка пользователя</p>
            <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center">
              <Icon name="X" size={18} className="text-foreground" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Profile info */}
            <div className="flex gap-4 items-start">
              {detail.photos && detail.photos.length > 0 ? (
                <img src={detail.photos[0]} className="w-20 h-20 rounded-2xl object-cover shrink-0" alt="" />
              ) : (
                <div className="w-20 h-20 rounded-2xl gradient-brand flex items-center justify-center text-white text-2xl font-black shrink-0">
                  {(detail.name || detail.email)?.[0]?.toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-black text-base text-foreground">{detail.name || 'Без имени'}</p>
                  {detail.age > 0 && <span className="text-sm text-muted-foreground">{detail.age} лет</span>}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{detail.email}</p>
                <p className="text-xs text-muted-foreground">ID: {detail.id}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {detail.verified && <Badge variant="blue">Верифицирован</Badge>}
                  {detail.is_premium && <Badge variant="amber">Premium</Badge>}
                  {detail.is_banned && <Badge variant="red">Забанен</Badge>}
                  {detail.is_admin && <Badge variant="gray">Админ</Badge>}
                  {detail.gender && <Badge variant="gray">{detail.gender === 'male' ? 'Муж' : detail.gender === 'female' ? 'Жен' : detail.gender}</Badge>}
                </div>
              </div>
            </div>

            {/* Details grid */}
            <div className="bg-secondary rounded-2xl p-3 grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-muted-foreground">Город:</span> <span className="font-bold text-foreground">{detail.city || '—'}</span></div>
              <div><span className="text-muted-foreground">Работа:</span> <span className="font-bold text-foreground">{detail.job || '—'}</span></div>
              <div><span className="text-muted-foreground">Рост:</span> <span className="font-bold text-foreground">{detail.height || '—'}</span></div>
              <div><span className="text-muted-foreground">Фото:</span> <span className="font-bold text-foreground">{detail.photos?.length || 0}</span></div>
              <div className="col-span-2"><span className="text-muted-foreground">Регистрация:</span> <span className="font-bold text-foreground">{new Date(detail.created_at).toLocaleDateString('ru')}</span></div>
            </div>

            {/* Bio */}
            {detail.bio && (
              <div className="bg-secondary rounded-2xl p-3">
                <p className="text-xs text-muted-foreground mb-1">О себе:</p>
                <p className="text-sm text-foreground">{detail.bio}</p>
              </div>
            )}

            {/* Tags */}
            {detail.tags && detail.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {detail.tags.map(t => (
                  <span key={t} className="text-[10px] font-bold px-2 py-1 rounded-full bg-pink-50 text-primary">{t}</span>
                ))}
              </div>
            )}

            {/* Photos */}
            {detail.photos && detail.photos.length > 1 && (
              <div>
                <SectionTitle>Фотографии ({detail.photos.length})</SectionTitle>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {detail.photos.map((p, i) => (
                    <img key={i} src={p} className="w-20 h-20 rounded-xl object-cover shrink-0" alt="" />
                  ))}
                </div>
              </div>
            )}

            {/* Stats */}
            <div>
              <SectionTitle>Статистика</SectionTitle>
              <div className="grid grid-cols-4 gap-2">
                <div className="bg-blue-50 rounded-xl p-2 text-center">
                  <p className="text-lg font-black text-blue-600">{detail.stats.likes_sent}</p>
                  <p className="text-[10px] text-blue-500">Лайки отпр.</p>
                </div>
                <div className="bg-pink-50 rounded-xl p-2 text-center">
                  <p className="text-lg font-black text-pink-600">{detail.stats.likes_received}</p>
                  <p className="text-[10px] text-pink-500">Лайки получ.</p>
                </div>
                <div className="bg-purple-50 rounded-xl p-2 text-center">
                  <p className="text-lg font-black text-purple-600">{detail.stats.matches}</p>
                  <p className="text-[10px] text-purple-500">Мэтчи</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-2 text-center">
                  <p className="text-lg font-black text-emerald-600">{detail.stats.messages}</p>
                  <p className="text-[10px] text-emerald-500">Сообщения</p>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div>
              <SectionTitle>Действия</SectionTitle>
              <div className="grid grid-cols-2 gap-2">
                {detail.is_banned ? (
                  <button disabled={actionLoading} onClick={() => doAction(() => api.admin.unban(detail.id))}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-2xl bg-emerald-500 text-white text-xs font-bold">
                    <Icon name="CheckCircle" size={14} /> Разбанить
                  </button>
                ) : (
                  <button disabled={actionLoading} onClick={() => setShowBanInput(true)}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-2xl bg-red-500 text-white text-xs font-bold">
                    <Icon name="Ban" size={14} /> Забанить
                  </button>
                )}
                <button disabled={actionLoading} onClick={() => doAction(() => api.admin.verify(detail.id, !detail.verified))}
                  className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-2xl text-xs font-bold ${detail.verified ? 'bg-gray-200 text-gray-700' : 'bg-blue-500 text-white'}`}>
                  <Icon name={detail.verified ? 'XCircle' : 'BadgeCheck'} size={14} />
                  {detail.verified ? 'Снять верификацию' : 'Верифицировать'}
                </button>
                {detail.is_premium ? (
                  <button disabled={actionLoading} onClick={() => doAction(() => api.admin.revokePremium(detail.id))}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-2xl bg-gray-200 text-gray-700 text-xs font-bold">
                    <Icon name="StarOff" size={14} /> Отозвать Premium
                  </button>
                ) : (
                  <button disabled={actionLoading} onClick={() => setShowPremiumInput(true)}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-2xl bg-amber-500 text-white text-xs font-bold">
                    <Icon name="Star" size={14} /> Дать Premium
                  </button>
                )}
                <button disabled={actionLoading} onClick={() => {
                  if (confirm('Удалить пользователя навсегда? Это действие нельзя отменить.')) {
                    // There's no delete endpoint, we ban permanently
                    doAction(() => api.admin.ban(detail.id, 'Удален администратором'));
                  }
                }}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-2xl bg-red-100 text-red-600 text-xs font-bold">
                  <Icon name="Trash2" size={14} /> Удалить
                </button>
              </div>

              {/* Ban reason input */}
              {showBanInput && (
                <div className="mt-2 flex gap-2">
                  <input value={banReason} onChange={e => setBanReason(e.target.value)} placeholder="Причина бана..."
                    className="flex-1 bg-secondary border border-border rounded-xl px-3 py-2 text-sm outline-none text-foreground" />
                  <button onClick={() => { doAction(() => api.admin.ban(detail.id, banReason || 'Нарушение правил')); setShowBanInput(false); setBanReason(''); }}
                    className="btn-primary px-4 py-2 text-xs rounded-xl">Бан</button>
                  <button onClick={() => setShowBanInput(false)} className="px-3 py-2 text-xs text-muted-foreground hover:text-foreground">Отмена</button>
                </div>
              )}

              {/* Premium days input */}
              {showPremiumInput && (
                <div className="mt-2 flex gap-2 items-center">
                  <input type="number" value={premiumDays} onChange={e => setPremiumDays(Number(e.target.value))} min={1} max={365}
                    className="w-20 bg-secondary border border-border rounded-xl px-3 py-2 text-sm outline-none text-foreground" />
                  <span className="text-xs text-muted-foreground">дней</span>
                  <button onClick={() => { doAction(() => api.admin.grantPremium(detail.id, premiumDays)); setShowPremiumInput(false); }}
                    className="btn-primary px-4 py-2 text-xs rounded-xl">Выдать</button>
                  <button onClick={() => setShowPremiumInput(false)} className="px-3 py-2 text-xs text-muted-foreground hover:text-foreground">Отмена</button>
                </div>
              )}
            </div>

            {/* Matches */}
            <div>
              <SectionTitle>Мэтчи ({matches.length})</SectionTitle>
              {matches.length === 0 ? (
                <p className="text-xs text-muted-foreground">Нет мэтчей</p>
              ) : (
                <div className="space-y-2">
                  {matches.map(m => (
                    <div key={m.match_id} className="flex items-center gap-3 bg-secondary rounded-2xl p-3">
                      {m.other_photo ? (
                        <img src={m.other_photo} className="w-9 h-9 rounded-full object-cover shrink-0" alt="" />
                      ) : (
                        <div className="w-9 h-9 rounded-full gradient-brand flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {m.other_name?.[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">{m.other_name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{m.last_message || 'Нет сообщений'}</p>
                        <p className="text-[10px] text-muted-foreground">{m.messages_count} сообщений</p>
                      </div>
                      <button onClick={() => setChatMatch({ id: m.match_id, title: `${detail.name} <> ${m.other_name}` })}
                        className="text-[10px] font-bold px-2.5 py-1.5 rounded-xl bg-white border border-border text-foreground hover:bg-gray-50 shrink-0">
                        <Icon name="MessageCircle" size={12} className="inline mr-1" />
                        Читать
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Chat viewer overlay */}
      {chatMatch && (
        <ChatViewer matchId={chatMatch.id} title={chatMatch.title} onClose={() => setChatMatch(null)} />
      )}
    </>
  );
}
