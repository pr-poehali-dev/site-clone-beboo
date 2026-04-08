import { useState, useEffect } from 'react';
import { api, AdminStats, AdminUser, AppSetting, Report } from '@/api/client';
import Icon from '@/components/ui/icon';

type AdminTab = 'dashboard' | 'users' | 'monetization' | 'reports' | 'settings';

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

export default function AdminPage({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<AdminTab>('dashboard');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionUser, setActionUser] = useState<string | null>(null);
  const [editSetting, setEditSetting] = useState<{ key: string; value: string } | null>(null);

  useEffect(() => {
    if (tab === 'dashboard') loadStats();
    if (tab === 'users') loadUsers();
    if (tab === 'monetization') { loadStats(); loadUsers(); }
    if (tab === 'settings') loadSettings();
    if (tab === 'reports') loadReports();
  }, [tab, page]);

  const loadStats = async () => {
    try { const r = await api.admin.stats(); setStats(r); } catch { /* ignore */ }
  };
  const loadUsers = async () => {
    setLoading(true);
    try { const r = await api.admin.users(page, search); setUsers(r.users); setTotalUsers(r.total); }
    catch { /* ignore */ } finally { setLoading(false); }
  };
  const loadSettings = async () => {
    try { const r = await api.admin.settings(); setSettings(r.settings); } catch { /* ignore */ }
  };
  const loadReports = async () => {
    try { const r = await api.admin.reports(); setReports(r.reports); } catch { /* ignore */ }
  };

  const doAction = async (fn: () => Promise<unknown>, refresh: () => void) => {
    try { await fn(); refresh(); } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Ошибка'); }
  };

  const tabs: { id: AdminTab; icon: string; label: string }[] = [
    { id: 'dashboard', icon: 'BarChart2', label: 'Дашборд' },
    { id: 'users', icon: 'Users', label: 'Пользователи' },
    { id: 'monetization', icon: 'CreditCard', label: 'Монетизация' },
    { id: 'reports', icon: 'Flag', label: 'Репорты' },
    { id: 'settings', icon: 'Settings', label: 'Настройки' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, hsl(340 82% 58%), hsl(262 80% 64%))' }}>
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
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold whitespace-nowrap border-b-2 transition-colors ${tab === t.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            <Icon name={t.icon} size={14} />
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* ── DASHBOARD ── */}
        {tab === 'dashboard' && stats && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Всего юзеров" value={stats.total_users} icon="Users" color="bg-blue-500" />
              <StatCard label="Новых сегодня" value={stats.new_today} icon="UserPlus" color="bg-emerald-500" />
              <StatCard label="Мэтчей" value={stats.total_matches} icon="Heart" color="bg-pink-500" />
              <StatCard label="Сообщений" value={stats.total_messages} icon="MessageCircle" color="bg-purple-500" />
              <StatCard label="Лайков" value={stats.total_likes} icon="ThumbsUp" color="bg-orange-500" />
              <StatCard label="Premium" value={stats.premium_users} icon="Star" color="bg-amber-500" />
              <StatCard label="Забанено" value={stats.banned_users} icon="Ban" color="bg-red-500" />
              <StatCard label="Жалоб" value={stats.open_reports} icon="Flag" color="bg-rose-500" />
            </div>

            {stats.daily_signups.length > 0 && (
              <div className="bg-white rounded-2xl p-4 border border-border">
                <p className="text-sm font-black text-foreground mb-3">Регистрации за 7 дней</p>
                <div className="flex items-end gap-2 h-20">
                  {stats.daily_signups.map((d, i) => {
                    const max = Math.max(...stats.daily_signups.map(x => x.count));
                    const h = max > 0 ? (d.count / max) * 100 : 10;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-[9px] text-muted-foreground">{d.count}</span>
                        <div className="w-full rounded-t-lg" style={{ height: `${h}%`, minHeight: 4, background: 'linear-gradient(180deg, hsl(340 82% 58%), hsl(262 80% 64%))' }} />
                        <span className="text-[9px] text-muted-foreground">{d.date.slice(5)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── USERS ── */}
        {tab === 'users' && (
          <>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2 bg-white border border-border rounded-2xl px-3 py-2.5">
                <Icon name="Search" size={16} className="text-muted-foreground shrink-0" />
                <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && loadUsers()}
                  placeholder="Поиск по email или имени..." className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder-muted-foreground" />
              </div>
              <button onClick={loadUsers} className="btn-primary px-4 py-2.5 text-sm text-white rounded-2xl">Найти</button>
            </div>

            <p className="text-xs text-muted-foreground">Всего: {totalUsers} пользователей</p>

            {loading ? (
              <div className="flex justify-center py-8"><div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" /></div>
            ) : (
              <div className="space-y-2">
                {users.map(u => (
                  <div key={u.id} className="bg-white rounded-2xl border border-border p-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center text-sm font-black text-primary shrink-0">
                        {(u.name || u.email)?.[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-bold text-sm text-foreground">{u.name || '—'}</p>
                          {u.age && <span className="text-xs text-muted-foreground">{u.age} лет</span>}
                          {u.is_premium && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">Premium</span>}
                          {u.verified && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">✓ Верифицирован</span>}
                          {u.is_banned && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">Заблокирован</span>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{u.email}</p>
                        <p className="text-xs text-muted-foreground">{u.city || '—'} · {u.photos_count} фото</p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3 flex-wrap">
                      {u.is_banned ? (
                        <button onClick={() => doAction(() => api.admin.unban(u.id), loadUsers)}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors">
                          Разбанить
                        </button>
                      ) : (
                        <button onClick={() => { const r = prompt('Причина бана:'); if (r) doAction(() => api.admin.ban(u.id, r), loadUsers); }}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-red-100 text-red-700 hover:bg-red-200 transition-colors">
                          Забанить
                        </button>
                      )}
                      <button onClick={() => doAction(() => api.admin.verify(u.id, !u.verified), loadUsers)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${u.verified ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}>
                        {u.verified ? 'Снять верификацию' : 'Верифицировать'}
                      </button>
                      {u.is_premium ? (
                        <button onClick={() => doAction(() => api.admin.revokePremium(u.id), loadUsers)}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">
                          Убрать Premium
                        </button>
                      ) : (
                        <button onClick={() => doAction(() => api.admin.grantPremium(u.id, 30), loadUsers)}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors">
                          Дать Premium 30д
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2 justify-center">
              {page > 1 && <button onClick={() => setPage(p => p - 1)} className="px-4 py-2 rounded-xl border border-border text-sm font-semibold hover:bg-secondary transition-colors">← Назад</button>}
              {users.length === 20 && <button onClick={() => setPage(p => p + 1)} className="px-4 py-2 rounded-xl border border-border text-sm font-semibold hover:bg-secondary transition-colors">Далее →</button>}
            </div>
          </>
        )}

        {/* ── MONETIZATION ── */}
        {tab === 'monetization' && stats && (
          <>
            <div className="bg-white rounded-2xl p-5 border border-border card-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center">
                  <Icon name="TrendingUp" size={20} className="text-amber-600" />
                </div>
                <div>
                  <p className="font-black text-foreground">Монетизация</p>
                  <p className="text-xs text-muted-foreground">Premium подписчиков: {stats.premium_users}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Всего юзеров', val: stats.total_users },
                  { label: 'Premium', val: stats.premium_users },
                  { label: 'Конверсия', val: stats.total_users > 0 ? `${Math.round((stats.premium_users / stats.total_users) * 100)}%` : '0%' },
                ].map(s => (
                  <div key={s.label} className="bg-secondary rounded-xl p-3 text-center">
                    <p className="font-black text-lg text-foreground">{s.val}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-border overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <p className="font-black text-sm text-foreground">Тарифы Premium</p>
              </div>
              {settings.filter(s => s.key.includes('premium_price')).map(s => (
                <div key={s.key} className="flex items-center justify-between px-4 py-3 border-b border-border/50 last:border-0">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{s.description}</p>
                    <p className="text-xs text-muted-foreground">{s.key}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-foreground">{s.value} ₽</span>
                    <button onClick={() => setEditSetting({ key: s.key, value: s.value })} className="w-7 h-7 rounded-lg hover:bg-secondary flex items-center justify-center transition-colors">
                      <Icon name="Pencil" size={13} className="text-muted-foreground" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-border overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <p className="font-black text-sm text-foreground">Лимиты бесплатного плана</p>
              </div>
              {settings.filter(s => s.key.includes('free_')).map(s => (
                <div key={s.key} className="flex items-center justify-between px-4 py-3 border-b border-border/50 last:border-0">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{s.description}</p>
                    <p className="text-xs text-muted-foreground">{s.key}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-foreground">{s.value}</span>
                    <button onClick={() => setEditSetting({ key: s.key, value: s.value })} className="w-7 h-7 rounded-lg hover:bg-secondary flex items-center justify-center transition-colors">
                      <Icon name="Pencil" size={13} className="text-muted-foreground" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── REPORTS ── */}
        {tab === 'reports' && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-foreground">{reports.filter(r => r.status === 'pending').length} открытых жалоб</p>
              <button onClick={loadReports} className="text-xs text-primary font-semibold">Обновить</button>
            </div>
            {reports.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-5xl mb-3">🎉</div>
                <p className="font-black text-foreground">Жалоб нет!</p>
                <p className="text-sm text-muted-foreground mt-1">Всё спокойно</p>
              </div>
            ) : (
              <div className="space-y-2">
                {reports.map(r => (
                  <div key={r.id} className={`bg-white rounded-2xl border p-3 ${r.status === 'pending' ? 'border-rose-200' : 'border-border opacity-60'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${r.status === 'pending' ? 'bg-rose-100 text-rose-700' : 'bg-gray-100 text-gray-600'}`}>
                            {r.status === 'pending' ? 'Открыта' : 'Решена'}
                          </span>
                        </div>
                        <p className="text-sm text-foreground"><span className="font-bold">{r.from_name}</span> жалуется на <span className="font-bold">{r.to_name}</span></p>
                        <p className="text-xs text-muted-foreground mt-0.5">Причина: {r.reason}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{new Date(r.created_at).toLocaleString('ru')}</p>
                      </div>
                      {r.status === 'pending' && (
                        <div className="flex flex-col gap-1 shrink-0">
                          <button onClick={() => doAction(() => api.admin.resolveReport(r.id), loadReports)}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors">
                            Решить
                          </button>
                          <button onClick={() => doAction(() => api.admin.ban(r.to_user_id, `Жалоба: ${r.reason}`), loadReports)}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-red-100 text-red-700 hover:bg-red-200 transition-colors">
                            Забанить
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── SETTINGS ── */}
        {tab === 'settings' && (
          <>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-center gap-3">
              <Icon name="AlertTriangle" size={18} className="text-amber-600 shrink-0" />
              <p className="text-xs text-amber-700 font-semibold">Изменения применяются немедленно для всех пользователей</p>
            </div>
            <div className="bg-white rounded-2xl border border-border overflow-hidden">
              {settings.map((s, i) => (
                <div key={s.key} className={`flex items-center justify-between px-4 py-3 ${i < settings.length - 1 ? 'border-b border-border/50' : ''}`}>
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="text-sm font-semibold text-foreground">{s.description || s.key}</p>
                    <p className="text-xs text-muted-foreground font-mono">{s.key}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-bold text-foreground bg-secondary px-2 py-1 rounded-lg">{s.value}</span>
                    <button onClick={() => setEditSetting({ key: s.key, value: s.value })} className="w-8 h-8 rounded-xl hover:bg-secondary flex items-center justify-center transition-colors">
                      <Icon name="Pencil" size={14} className="text-muted-foreground" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

      </div>

      {/* Edit setting modal */}
      {editSetting && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-end justify-center z-10 p-4">
          <div className="bg-white rounded-3xl p-5 w-full max-w-sm animate-slide-up">
            <h3 className="font-black text-foreground mb-1">Изменить настройку</h3>
            <p className="text-xs text-muted-foreground mb-4 font-mono">{editSetting.key}</p>
            <input
              value={editSetting.value}
              onChange={e => setEditSetting(s => s ? { ...s, value: e.target.value } : null)}
              className="w-full bg-secondary border border-border rounded-2xl px-4 py-3 text-sm outline-none focus:border-primary mb-4"
              onKeyDown={async e => {
                if (e.key === 'Enter') {
                  await doAction(() => api.admin.updateSetting(editSetting.key, editSetting.value), loadSettings);
                  setEditSetting(null);
                }
              }}
            />
            <div className="flex gap-2">
              <button onClick={() => setEditSetting(null)} className="flex-1 py-3 rounded-2xl border-2 border-border text-sm font-bold text-muted-foreground hover:bg-secondary transition-colors">Отмена</button>
              <button
                onClick={async () => {
                  await doAction(() => api.admin.updateSetting(editSetting.key, editSetting.value), loadSettings);
                  setEditSetting(null);
                }}
                className="flex-1 py-3 rounded-2xl btn-primary text-sm text-white font-bold"
              >Сохранить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
