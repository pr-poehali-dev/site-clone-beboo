import { useState, useEffect, useCallback } from 'react';
import { api, AdminUser } from '@/api/client';
import Icon from '@/components/ui/icon';
import { Spinner, Badge, EmptyState } from './adminShared';
import { UserDetailCard } from './AdminUserDetail';

export { DashboardTab, MonetizationTab, ReportsTab } from './AdminTabDashboard';
export { SettingsTab, PaymentTab } from './AdminTabSettings';
export { BotsTab } from './AdminTabBots';
export { EmailTab } from './AdminTabEmail';

/* ─── Users tab ────────────────────────────────────────────────────── */

export function UsersTab() {
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
                    <p className="font-bold text-sm text-foreground">{u.name || 'Без имени'}</p>
                    {u.verified && <Icon name="CheckCircle" size={14} className="text-blue-500 shrink-0" />}
                    {u.is_premium && <Badge variant="amber">Premium</Badge>}
                    {u.is_banned && <Badge variant="red">Бан</Badge>}
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>
                  <p className="text-[10px] text-muted-foreground">{u.city || '—'} | {u.age > 0 ? `${u.age} лет` : '—'} | {u.gender || '—'}</p>
                </div>
                <Icon name="ChevronRight" size={16} className="text-muted-foreground shrink-0" />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-2">
          <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}
            className="w-8 h-8 rounded-xl bg-white border border-border flex items-center justify-center disabled:opacity-30">
            <Icon name="ChevronLeft" size={16} className="text-foreground" />
          </button>
          {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
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