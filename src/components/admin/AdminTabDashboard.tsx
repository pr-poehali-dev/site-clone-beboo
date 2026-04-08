import { useState, useEffect } from 'react';
import { api, AdminStats, AdminUser, AppSetting, Report } from '@/api/client';
import Icon from '@/components/ui/icon';
import { StatCard, Spinner, Badge, SectionTitle, EmptyState } from './adminShared';

/* ─── Dashboard tab ────────────────────────────────────────────────── */

export function DashboardTab({ stats }: { stats: AdminStats | null }) {
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

/* ─── Monetization tab ─────────────────────────────────────────────── */

export function MonetizationTab() {
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

export function ReportsTab() {
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
