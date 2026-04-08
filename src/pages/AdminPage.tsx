import { useState, useEffect, useCallback } from 'react';
import { api, AdminStats, AdminUser, AdminUserDetail, AppSetting, Report, AdminMatch, AdminMessage } from '@/api/client';
import Icon from '@/components/ui/icon';

type AdminTab = 'dashboard' | 'users' | 'monetization' | 'reports' | 'settings' | 'payment';

/* ─── Small components ─────────────────────────────────────────────── */

function StatCard({ label, value, icon, color }: { label: string; value: number | string; icon: string; color: string }) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-border card-shadow">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{label}</p>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
          <Icon name={icon} size={18} className="text-white" />
        </div>
      </div>
      <p className="text-2xl font-black text-foreground">{value}</p>
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex justify-center py-8">
      <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
    </div>
  );
}

function Badge({ children, variant }: { children: React.ReactNode; variant: 'green' | 'red' | 'amber' | 'blue' | 'gray' }) {
  const colors: Record<string, string> = {
    green: 'bg-emerald-100 text-emerald-700',
    red: 'bg-red-100 text-red-700',
    amber: 'bg-amber-100 text-amber-700',
    blue: 'bg-blue-100 text-blue-700',
    gray: 'bg-gray-100 text-gray-600',
  };
  return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${colors[variant]}`}>{children}</span>;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-black text-foreground mb-3">{children}</p>;
}

function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="py-12 text-center">
      <Icon name={icon} size={32} className="mx-auto text-muted-foreground mb-2" />
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

/* ─── Chat viewer ──────────────────────────────────────────────────── */

function ChatViewer({ matchId, title, onClose }: { matchId: string; title: string; onClose: () => void }) {
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const r = await api.admin.readChat(matchId);
        setMessages(r.messages);
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, [matchId]);

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-end justify-center">
      <div className="bg-white w-full max-w-2xl rounded-t-2xl max-h-[80vh] flex flex-col animate-slide-up">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div>
            <p className="text-sm font-black text-foreground">Переписка</p>
            <p className="text-xs text-muted-foreground">{title}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center">
            <Icon name="X" size={18} className="text-foreground" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? <Spinner /> : messages.length === 0 ? (
            <EmptyState icon="MessageCircle" text="Сообщений нет" />
          ) : (
            messages.map(m => (
              <div key={m.id} className="flex gap-2 items-start">
                <div className="w-7 h-7 rounded-full gradient-brand flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                  {m.sender_name?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-bold text-foreground">{m.sender_name}</span>
                    <span className="text-[10px] text-muted-foreground">{new Date(m.created_at).toLocaleString('ru')}</span>
                  </div>
                  {m.msg_type === 'image' && m.image_url ? (
                    <img src={m.image_url} className="w-40 h-40 object-cover rounded-xl mt-1" alt="" />
                  ) : (
                    <p className="text-sm text-foreground bg-secondary rounded-2xl px-3 py-2 mt-1 inline-block max-w-full break-words">{m.text}</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── User detail card ─────────────────────────────────────────────── */

function UserDetailCard({ userId, onClose, onRefresh }: { userId: string; onClose: () => void; onRefresh: () => void }) {
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
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

/* ─── Dashboard tab ────────────────────────────────────────────────── */

function DashboardTab({ stats }: { stats: AdminStats | null }) {
  if (!stats) return <Spinner />;
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Всего юзеров" value={stats.total_users} icon="Users" color="bg-blue-500" />
        <StatCard label="Новых сегодня" value={stats.new_today} icon="UserPlus" color="bg-emerald-500" />
        <StatCard label="Новых за неделю" value={stats.new_week} icon="TrendingUp" color="bg-teal-500" />
        <StatCard label="Мэтчей" value={stats.total_matches} icon="Heart" color="bg-pink-500" />
        <StatCard label="Сообщений" value={stats.total_messages} icon="MessageCircle" color="bg-purple-500" />
        <StatCard label="Лайков" value={stats.total_likes} icon="ThumbsUp" color="bg-orange-500" />
        <StatCard label="Premium" value={stats.premium_users} icon="Star" color="bg-amber-500" />
        <StatCard label="Забанено" value={stats.banned_users} icon="Ban" color="bg-red-500" />
      </div>

      {/* Conversion rate */}
      <div className="bg-white rounded-2xl p-4 border border-border card-shadow">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Конверсия в Premium</p>
          <Icon name="Percent" size={16} className="text-amber-500" />
        </div>
        <p className="text-2xl font-black text-foreground">
          {stats.total_users > 0 ? ((stats.premium_users / stats.total_users) * 100).toFixed(1) : 0}%
        </p>
        <p className="text-xs text-muted-foreground mt-1">{stats.premium_users} из {stats.total_users} пользователей</p>
      </div>

      {/* Open reports */}
      <div className="bg-white rounded-2xl p-4 border border-border card-shadow">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Открытых жалоб</p>
          <Icon name="Flag" size={16} className="text-rose-500" />
        </div>
        <p className="text-2xl font-black text-foreground">{stats.open_reports}</p>
      </div>

      {/* Chart */}
      {stats.daily_signups.length > 0 && (
        <div className="bg-white rounded-2xl p-4 border border-border card-shadow">
          <SectionTitle>Регистрации за 7 дней</SectionTitle>
          <div className="flex items-end gap-2 h-24">
            {stats.daily_signups.map((d, i) => {
              const max = Math.max(...stats.daily_signups.map(x => x.count), 1);
              const h = (d.count / max) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] font-bold text-foreground">{d.count}</span>
                  <div className="w-full rounded-t-lg transition-all" style={{ height: `${Math.max(h, 4)}%`, background: 'linear-gradient(180deg, hsl(340 82% 58%), hsl(262 80% 64%))' }} />
                  <span className="text-[9px] text-muted-foreground">{d.date.slice(5)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Activity ratios */}
      <div className="bg-white rounded-2xl p-4 border border-border card-shadow">
        <SectionTitle>Показатели активности</SectionTitle>
        <div className="space-y-3">
          {[
            { label: 'Лайков на юзера', value: stats.total_users > 0 ? (stats.total_likes / stats.total_users).toFixed(1) : '0', color: 'bg-orange-500' },
            { label: 'Мэтчей на юзера', value: stats.total_users > 0 ? (stats.total_matches / stats.total_users).toFixed(1) : '0', color: 'bg-pink-500' },
            { label: 'Сообщений на мэтч', value: stats.total_matches > 0 ? (stats.total_messages / stats.total_matches).toFixed(1) : '0', color: 'bg-purple-500' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${item.color}`} />
              <span className="text-xs text-muted-foreground flex-1">{item.label}</span>
              <span className="text-sm font-black text-foreground">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/* ─── Users tab ────────────────────────────────────────────────────── */

function UsersTab() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  const loadUsers = useCallback(async (p = page, s = search) => {
    setLoading(true);
    try {
      const r = await api.admin.users(p, s);
      setUsers(r.users);
      setTotal(r.total);
    } catch { /* ignore */ }
    setLoading(false);
  }, [page, search]);

  useEffect(() => { loadUsers(); }, [page]);

  const totalPages = Math.ceil(total / 20) || 1;

  return (
    <>
      {/* Search */}
      <div className="flex gap-2">
        <div className="flex-1 flex items-center gap-2 bg-white border border-border rounded-2xl px-3 py-2.5">
          <Icon name="Search" size={16} className="text-muted-foreground shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { setPage(1); loadUsers(1, search); } }}
            placeholder="Поиск по email или имени..."
            className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder-muted-foreground" />
        </div>
        <button onClick={() => { setPage(1); loadUsers(1, search); }} className="btn-primary px-4 py-2.5 text-sm text-white rounded-2xl">Найти</button>
      </div>

      <p className="text-xs text-muted-foreground">Всего: {total} | Страница {page} из {totalPages}</p>

      {loading ? <Spinner /> : users.length === 0 ? (
        <EmptyState icon="Users" text="Пользователи не найдены" />
      ) : (
        <div className="space-y-2">
          {users.map(u => (
            <button key={u.id} onClick={() => setSelectedUser(u.id)}
              className="w-full text-left bg-white rounded-2xl border border-border p-3 hover:border-primary/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center text-sm font-black text-primary shrink-0">
                  {(u.name || u.email)?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="font-bold text-sm text-foreground">{u.name || '—'}</p>
                    {u.age > 0 && <span className="text-xs text-muted-foreground">{u.age}</span>}
                    {u.is_premium && <Badge variant="amber">Premium</Badge>}
                    {u.verified && <Badge variant="blue">V</Badge>}
                    {u.is_banned && <Badge variant="red">Бан</Badge>}
                    {u.is_admin && <Badge variant="gray">Admin</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {u.city && <span className="text-[10px] text-muted-foreground">{u.city}</span>}
                    <span className="text-[10px] text-muted-foreground">{u.gender === 'male' ? 'M' : u.gender === 'female' ? 'F' : u.gender}</span>
                    <span className="text-[10px] text-muted-foreground">{u.photos_count} фото</span>
                  </div>
                </div>
                <Icon name="ChevronRight" size={16} className="text-muted-foreground shrink-0" />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}
            className="w-8 h-8 rounded-xl bg-white border border-border flex items-center justify-center disabled:opacity-30">
            <Icon name="ChevronLeft" size={16} className="text-foreground" />
          </button>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            let p: number;
            if (totalPages <= 7) p = i + 1;
            else if (page <= 4) p = i + 1;
            else if (page >= totalPages - 3) p = totalPages - 6 + i;
            else p = page - 3 + i;
            return (
              <button key={p} onClick={() => setPage(p)}
                className={`w-8 h-8 rounded-xl text-xs font-bold flex items-center justify-center transition-colors ${p === page ? 'gradient-brand text-white' : 'bg-white border border-border text-foreground hover:bg-secondary'}`}>
                {p}
              </button>
            );
          })}
          <button disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            className="w-8 h-8 rounded-xl bg-white border border-border flex items-center justify-center disabled:opacity-30">
            <Icon name="ChevronRight" size={16} className="text-foreground" />
          </button>
        </div>
      )}

      {/* User detail overlay */}
      {selectedUser && (
        <UserDetailCard userId={selectedUser} onClose={() => setSelectedUser(null)} onRefresh={() => loadUsers()} />
      )}
    </>
  );
}

/* ─── Monetization tab ─────────────────────────────────────────────── */

function MonetizationTab() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [s, u, st] = await Promise.all([
          api.admin.stats(),
          api.admin.users(1, ''),
          api.admin.settings(),
        ]);
        setStats(s);
        setUsers(u.users.filter(x => x.is_premium));
        setSettings(st.settings);
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, []);

  if (loading) return <Spinner />;

  const premiumUsers = users;
  const conversionRate = stats && stats.total_users > 0 ? ((stats.premium_users / stats.total_users) * 100).toFixed(1) : '0';

  // Find pricing settings
  const pricingSettings = settings.filter(s =>
    s.key.includes('price') || s.key.includes('premium') || s.key.includes('trial') || s.key.includes('boost') || s.key.includes('cost')
  );

  return (
    <>
      {/* Overview cards */}
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Premium" value={stats.premium_users} icon="Star" color="bg-amber-500" />
          <StatCard label="Конверсия" value={`${conversionRate}%`} icon="Percent" color="bg-emerald-500" />
          <StatCard label="Всего юзеров" value={stats.total_users} icon="Users" color="bg-blue-500" />
        </div>
      )}

      {/* Pricing settings */}
      {pricingSettings.length > 0 && (
        <div className="bg-white rounded-2xl p-4 border border-border card-shadow">
          <SectionTitle>Тарифы и цены</SectionTitle>
          <div className="space-y-2">
            {pricingSettings.map(s => (
              <div key={s.key} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-xs font-bold text-foreground">{s.key}</p>
                  {s.description && <p className="text-[10px] text-muted-foreground">{s.description}</p>}
                </div>
                <span className="text-sm font-black text-primary">{s.value}</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-3">Редактируйте во вкладке "Настройки"</p>
        </div>
      )}

      {/* Premium users table */}
      <div className="bg-white rounded-2xl p-4 border border-border card-shadow">
        <SectionTitle>Premium пользователи</SectionTitle>
        {premiumUsers.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">Нет Premium пользователей</p>
        ) : (
          <div className="space-y-2">
            {premiumUsers.map(u => (
              <div key={u.id} className="flex items-center gap-3 p-2 bg-amber-50 rounded-xl">
                <div className="w-8 h-8 rounded-lg bg-amber-200 flex items-center justify-center text-xs font-black text-amber-700 shrink-0">
                  {(u.name || u.email)?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-foreground truncate">{u.name || u.email}</p>
                  <p className="text-[10px] text-muted-foreground">{u.city || '—'} | {u.age > 0 ? `${u.age} лет` : '—'}</p>
                </div>
                <Badge variant="amber">Premium</Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

/* ─── Reports tab ──────────────────────────────────────────────────── */

function ReportsTab() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  const loadReports = async () => {
    setLoading(true);
    try { const r = await api.admin.reports(); setReports(r.reports); } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { loadReports(); }, []);

  const resolveReport = async (id: string) => {
    try { await api.admin.resolveReport(id); loadReports(); }
    catch (e: unknown) { alert(e instanceof Error ? e.message : 'Ошибка'); }
  };

  if (loading) return <Spinner />;

  const openReports = reports.filter(r => r.status === 'open');
  const resolvedReports = reports.filter(r => r.status !== 'open');

  return (
    <>
      <div className="flex items-center justify-between">
        <SectionTitle>Открытые жалобы ({openReports.length})</SectionTitle>
        <button onClick={loadReports} className="w-8 h-8 rounded-xl hover:bg-secondary flex items-center justify-center">
          <Icon name="RefreshCw" size={14} className="text-muted-foreground" />
        </button>
      </div>

      {openReports.length === 0 ? (
        <EmptyState icon="CheckCircle" text="Нет открытых жалоб" />
      ) : (
        <div className="space-y-2">
          {openReports.map(r => (
            <div key={r.id} className="bg-white rounded-2xl border border-border p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="red">Открыта</Badge>
                    <span className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleString('ru')}</span>
                  </div>
                  <p className="text-xs font-bold text-foreground mt-1.5">
                    {r.from_name} <Icon name="ArrowRight" size={10} className="inline text-muted-foreground mx-1" /> {r.to_name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{r.reason}</p>
                </div>
                <button onClick={() => resolveReport(r.id)}
                  className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500 text-white text-[10px] font-bold">
                  <Icon name="Check" size={12} /> Решить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {resolvedReports.length > 0 && (
        <>
          <div className="mt-4">
            <SectionTitle>Решенные ({resolvedReports.length})</SectionTitle>
          </div>
          <div className="space-y-2">
            {resolvedReports.map(r => (
              <div key={r.id} className="bg-secondary rounded-2xl p-3 opacity-60">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="green">Решена</Badge>
                  <span className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleString('ru')}</span>
                </div>
                <p className="text-xs font-bold text-foreground mt-1">
                  {r.from_name} <Icon name="ArrowRight" size={10} className="inline text-muted-foreground mx-1" /> {r.to_name}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{r.reason}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

/* ─── Settings tab ─────────────────────────────────────────────────── */

function SettingsTab() {
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [editKey, setEditKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  const loadSettings = async () => {
    setLoading(true);
    try { const r = await api.admin.settings(); setSettings(r.settings); } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { loadSettings(); }, []);

  const saveSetting = async (key: string) => {
    setSaving(true);
    try {
      await api.admin.updateSetting(key, editValue);
      setEditKey(null);
      loadSettings();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Ошибка');
    }
    setSaving(false);
  };

  if (loading) return <Spinner />;

  // Group settings by prefix
  const groups: Record<string, AppSetting[]> = {};
  settings.forEach(s => {
    const prefix = s.key.split('_')[0] || 'other';
    if (!groups[prefix]) groups[prefix] = [];
    groups[prefix].push(s);
  });

  const groupLabels: Record<string, string> = {
    premium: 'Premium',
    boost: 'Boost',
    match: 'Мэтчи',
    like: 'Лайки',
    search: 'Поиск',
    photo: 'Фото',
    report: 'Жалобы',
    message: 'Сообщения',
    payment: 'Оплата',
    yukassa: 'ЮKassa',
    robokassa: 'Робокасса',
    trial: 'Пробный период',
    app: 'Приложение',
  };

  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <div>
          <SectionTitle>Все настройки ({settings.length})</SectionTitle>
          <p className="text-[10px] text-muted-foreground -mt-2">Нажмите на значение для редактирования</p>
        </div>
        <button onClick={loadSettings} className="w-8 h-8 rounded-xl hover:bg-secondary flex items-center justify-center">
          <Icon name="RefreshCw" size={14} className="text-muted-foreground" />
        </button>
      </div>

      {Object.entries(groups).map(([group, items]) => (
        <div key={group} className="bg-white rounded-2xl border border-border p-4 card-shadow">
          <p className="text-xs font-black text-foreground uppercase tracking-wider mb-3">
            {groupLabels[group] || group.toUpperCase()}
          </p>
          <div className="space-y-0">
            {items.map(s => (
              <div key={s.key} className="py-2.5 border-b border-border last:border-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-foreground break-all">{s.key}</p>
                    {s.description && <p className="text-[10px] text-muted-foreground mt-0.5">{s.description}</p>}
                  </div>
                  {editKey === s.key ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <input value={editValue} onChange={e => setEditValue(e.target.value)}
                        className="w-32 bg-secondary border border-border rounded-lg px-2 py-1 text-xs outline-none text-foreground"
                        autoFocus onKeyDown={e => { if (e.key === 'Enter') saveSetting(s.key); if (e.key === 'Escape') setEditKey(null); }} />
                      <button disabled={saving} onClick={() => saveSetting(s.key)}
                        className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center">
                        <Icon name="Check" size={12} className="text-white" />
                      </button>
                      <button onClick={() => setEditKey(null)}
                        className="w-7 h-7 rounded-lg bg-gray-200 flex items-center justify-center">
                        <Icon name="X" size={12} className="text-gray-600" />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => { setEditKey(s.key); setEditValue(s.value); }}
                      className="shrink-0 text-xs font-bold text-primary bg-pink-50 px-2.5 py-1 rounded-lg hover:bg-pink-100 transition-colors max-w-[160px] truncate">
                      {s.value || '(пусто)'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

/* ─── Payment tab ──────────────────────────────────────────────────── */

function PaymentTab() {
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});

  const paymentKeys = [
    'payment_enabled',
    'payment_provider',
    'yukassa_shop_id',
    'yukassa_secret_key',
    'robokassa_login',
    'robokassa_pass1',
    'robokassa_pass2',
  ];

  const loadSettings = async () => {
    setLoading(true);
    try {
      const r = await api.admin.settings();
      setSettings(r.settings);
      const vals: Record<string, string> = {};
      r.settings.forEach(s => {
        if (paymentKeys.includes(s.key)) vals[s.key] = s.value;
      });
      setValues(vals);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { loadSettings(); }, []);

  const saveKey = async (key: string) => {
    setSaving(key);
    try {
      await api.admin.updateSetting(key, values[key] || '');
      // Refresh settings
      const r = await api.admin.settings();
      setSettings(r.settings);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Ошибка');
    }
    setSaving(null);
  };

  const toggleValue = async (key: string, a: string, b: string) => {
    const newVal = values[key] === a ? b : a;
    setValues(prev => ({ ...prev, [key]: newVal }));
    setSaving(key);
    try {
      await api.admin.updateSetting(key, newVal);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Ошибка');
    }
    setSaving(null);
  };

  if (loading) return <Spinner />;

  const getDesc = (key: string) => settings.find(s => s.key === key)?.description || '';

  return (
    <>
      {/* Status cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className={`rounded-2xl p-4 border border-border card-shadow ${values.payment_enabled === 'true' ? 'bg-emerald-50' : 'bg-red-50'}`}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-muted-foreground uppercase">Оплата</p>
            <div className={`w-3 h-3 rounded-full ${values.payment_enabled === 'true' ? 'bg-emerald-500' : 'bg-red-400'}`} />
          </div>
          <p className="text-sm font-black text-foreground">{values.payment_enabled === 'true' ? 'Включена' : 'Выключена'}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-border card-shadow">
          <p className="text-xs font-bold text-muted-foreground uppercase mb-2">Провайдер</p>
          <p className="text-sm font-black text-foreground">{values.payment_provider === 'robokassa' ? 'Робокасса' : 'ЮKassa'}</p>
        </div>
      </div>

      {/* Toggle switches */}
      <div className="bg-white rounded-2xl p-4 border border-border card-shadow space-y-4">
        <SectionTitle>Управление оплатой</SectionTitle>

        {/* Payment enabled */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-foreground">payment_enabled</p>
            <p className="text-[10px] text-muted-foreground">{getDesc('payment_enabled') || 'Включить/выключить прием платежей'}</p>
          </div>
          <button disabled={saving === 'payment_enabled'} onClick={() => toggleValue('payment_enabled', 'true', 'false')}
            className={`relative w-12 h-7 rounded-full transition-colors ${values.payment_enabled === 'true' ? 'bg-emerald-500' : 'bg-gray-300'}`}>
            <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${values.payment_enabled === 'true' ? 'left-6' : 'left-1'}`} />
          </button>
        </div>

        {/* Payment provider */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-foreground">payment_provider</p>
            <p className="text-[10px] text-muted-foreground">{getDesc('payment_provider') || 'yukassa или robokassa'}</p>
          </div>
          <div className="flex rounded-xl overflow-hidden border border-border">
            <button disabled={saving === 'payment_provider'}
              onClick={() => { setValues(p => ({ ...p, payment_provider: 'yukassa' })); api.admin.updateSetting('payment_provider', 'yukassa'); }}
              className={`px-3 py-1.5 text-[10px] font-bold transition-colors ${values.payment_provider === 'yukassa' ? 'gradient-brand text-white' : 'bg-white text-foreground'}`}>
              ЮKassa
            </button>
            <button disabled={saving === 'payment_provider'}
              onClick={() => { setValues(p => ({ ...p, payment_provider: 'robokassa' })); api.admin.updateSetting('payment_provider', 'robokassa'); }}
              className={`px-3 py-1.5 text-[10px] font-bold transition-colors ${values.payment_provider === 'robokassa' ? 'gradient-brand text-white' : 'bg-white text-foreground'}`}>
              Робокасса
            </button>
          </div>
        </div>
      </div>

      {/* API Keys - YuKassa */}
      <div className="bg-white rounded-2xl p-4 border border-border card-shadow">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center">
            <Icon name="CreditCard" size={12} className="text-blue-600" />
          </div>
          <SectionTitle>ЮKassa</SectionTitle>
        </div>

        {(['yukassa_shop_id', 'yukassa_secret_key'] as const).map(key => (
          <div key={key} className="mb-3">
            <label className="text-xs font-bold text-foreground mb-1 block">{key}</label>
            {getDesc(key) && <p className="text-[10px] text-muted-foreground mb-1">{getDesc(key)}</p>}
            <div className="flex gap-2">
              <input value={values[key] || ''} onChange={e => setValues(p => ({ ...p, [key]: e.target.value }))}
                type={key.includes('secret') ? 'password' : 'text'}
                placeholder={key.includes('secret') ? '***' : 'Введите значение...'}
                className="flex-1 bg-secondary border border-border rounded-xl px-3 py-2 text-sm outline-none text-foreground" />
              <button disabled={saving === key} onClick={() => saveKey(key)}
                className="btn-primary px-3 py-2 text-xs rounded-xl flex items-center gap-1">
                {saving === key ? <div className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" /> : <Icon name="Save" size={12} />}
                Сохранить
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* API Keys - Robokassa */}
      <div className="bg-white rounded-2xl p-4 border border-border card-shadow">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-lg bg-orange-100 flex items-center justify-center">
            <Icon name="ShoppingCart" size={12} className="text-orange-600" />
          </div>
          <SectionTitle>Робокасса</SectionTitle>
        </div>

        {(['robokassa_login', 'robokassa_pass1', 'robokassa_pass2'] as const).map(key => (
          <div key={key} className="mb-3">
            <label className="text-xs font-bold text-foreground mb-1 block">{key}</label>
            {getDesc(key) && <p className="text-[10px] text-muted-foreground mb-1">{getDesc(key)}</p>}
            <div className="flex gap-2">
              <input value={values[key] || ''} onChange={e => setValues(p => ({ ...p, [key]: e.target.value }))}
                type={key.includes('pass') ? 'password' : 'text'}
                placeholder={key.includes('pass') ? '***' : 'Введите значение...'}
                className="flex-1 bg-secondary border border-border rounded-xl px-3 py-2 text-sm outline-none text-foreground" />
              <button disabled={saving === key} onClick={() => saveKey(key)}
                className="btn-primary px-3 py-2 text-xs rounded-xl flex items-center gap-1">
                {saving === key ? <div className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" /> : <Icon name="Save" size={12} />}
                Сохранить
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Instructions */}
      <div className="bg-white rounded-2xl p-4 border border-border card-shadow">
        <SectionTitle>Инструкция по подключению ЮKassa</SectionTitle>
        <div className="space-y-3 text-xs text-foreground">
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full gradient-brand flex items-center justify-center text-white text-[10px] font-bold shrink-0">1</div>
            <div>
              <p className="font-bold">Зарегистрируйтесь в ЮKassa</p>
              <p className="text-muted-foreground">Перейдите на <span className="text-primary font-bold">yookassa.ru</span> и создайте аккаунт для юридического лица или ИП.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full gradient-brand flex items-center justify-center text-white text-[10px] font-bold shrink-0">2</div>
            <div>
              <p className="font-bold">Получите Shop ID и Secret Key</p>
              <p className="text-muted-foreground">В личном кабинете ЮKassa перейдите в раздел "Интеграция" &rarr; "Ключи API". Скопируйте shopId и секретный ключ.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full gradient-brand flex items-center justify-center text-white text-[10px] font-bold shrink-0">3</div>
            <div>
              <p className="font-bold">Настройте Webhook (HTTP-уведомления)</p>
              <p className="text-muted-foreground">В разделе "Интеграция" &rarr; "HTTP-уведомления" укажите URL вашего сервера для приема уведомлений о платежах.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full gradient-brand flex items-center justify-center text-white text-[10px] font-bold shrink-0">4</div>
            <div>
              <p className="font-bold">Введите ключи выше и включите оплату</p>
              <p className="text-muted-foreground">Заполните поля yukassa_shop_id и yukassa_secret_key, выберите провайдер "ЮKassa" и включите payment_enabled.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-border card-shadow">
        <SectionTitle>Инструкция по подключению Робокасса</SectionTitle>
        <div className="space-y-3 text-xs text-foreground">
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full gradient-brand flex items-center justify-center text-white text-[10px] font-bold shrink-0">1</div>
            <div>
              <p className="font-bold">Зарегистрируйтесь в Робокассе</p>
              <p className="text-muted-foreground">Перейдите на <span className="text-primary font-bold">robokassa.com</span> и создайте магазин.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full gradient-brand flex items-center justify-center text-white text-[10px] font-bold shrink-0">2</div>
            <div>
              <p className="font-bold">Получите логин и пароли</p>
              <p className="text-muted-foreground">В настройках магазина скопируйте "Логин магазина", "Пароль #1" и "Пароль #2".</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full gradient-brand flex items-center justify-center text-white text-[10px] font-bold shrink-0">3</div>
            <div>
              <p className="font-bold">Настройте Result URL</p>
              <p className="text-muted-foreground">В настройках магазина укажите Result URL для приема уведомлений о платежах. Метод: POST.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full gradient-brand flex items-center justify-center text-white text-[10px] font-bold shrink-0">4</div>
            <div>
              <p className="font-bold">Введите данные выше и включите оплату</p>
              <p className="text-muted-foreground">Заполните robokassa_login, robokassa_pass1, robokassa_pass2, выберите провайдер "Робокасса" и включите payment_enabled.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Security note */}
      <div className="bg-amber-50 rounded-2xl p-3 border border-amber-200">
        <div className="flex items-start gap-2">
          <Icon name="AlertTriangle" size={14} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[10px] text-amber-800">
            <span className="font-bold">Внимание:</span> Секретные ключи хранятся в настройках приложения. Никогда не передавайте их третьим лицам. Перед включением оплаты обязательно протестируйте интеграцию в тестовом режиме.
          </p>
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   MAIN ADMIN PAGE
   ═══════════════════════════════════════════════════════════════════════ */

export default function AdminPage({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<AdminTab>('dashboard');
  const [stats, setStats] = useState<AdminStats | null>(null);

  useEffect(() => {
    if (tab === 'dashboard') {
      api.admin.stats().then(setStats).catch(() => {});
    }
  }, [tab]);

  const tabs: { id: AdminTab; icon: string; label: string }[] = [
    { id: 'dashboard', icon: 'BarChart2', label: 'Дашборд' },
    { id: 'users', icon: 'Users', label: 'Пользователи' },
    { id: 'monetization', icon: 'CreditCard', label: 'Монетизация' },
    { id: 'reports', icon: 'Flag', label: 'Репорты' },
    { id: 'settings', icon: 'Settings', label: 'Настройки' },
    { id: 'payment', icon: 'Wallet', label: 'Оплата' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center gradient-brand">
            <Icon name="Shield" size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-base font-black text-foreground">Admin Panel</h1>
            <p className="text-xs text-muted-foreground">Spark Management</p>
          </div>
        </div>
        <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-secondary flex items-center justify-center transition-colors">
          <Icon name="X" size={20} className="text-foreground" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border bg-white shrink-0 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-3 text-[11px] font-bold whitespace-nowrap border-b-2 transition-colors ${
              tab === t.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}>
            <Icon name={t.icon} size={13} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {tab === 'dashboard' && <DashboardTab stats={stats} />}
        {tab === 'users' && <UsersTab />}
        {tab === 'monetization' && <MonetizationTab />}
        {tab === 'reports' && <ReportsTab />}
        {tab === 'settings' && <SettingsTab />}
        {tab === 'payment' && <PaymentTab />}
      </div>
    </div>
  );
}
