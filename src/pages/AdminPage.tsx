import { useState, useEffect } from 'react';
import { api, AdminStats } from '@/api/client';
import Icon from '@/components/ui/icon';
import { DashboardTab, UsersTab, MonetizationTab, ReportsTab, SettingsTab, PaymentTab, BotsTab } from '@/components/admin/AdminTabs';

type AdminTab = 'dashboard' | 'users' | 'monetization' | 'reports' | 'settings' | 'payment' | 'bots';

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
    { id: 'bots', icon: 'Bot', label: 'Боты & Награды' },
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
        {tab === 'bots' && <BotsTab />}
        {tab === 'settings' && <SettingsTab />}
        {tab === 'payment' && <PaymentTab />}
      </div>
    </div>
  );
}
