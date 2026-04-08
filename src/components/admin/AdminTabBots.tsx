import { useState, useEffect } from 'react';
import { api, AppSetting } from '@/api/client';
import Icon from '@/components/ui/icon';
import { Spinner, SectionTitle } from './adminShared';

/* ─── Quick Setting row ─────────────────────────────────────────────── */

export function QuickSetting({ label, settingKey, desc, type = 'text', allSettings, onSaved }: {
  label: string; settingKey: string; desc?: string; type?: string;
  allSettings: AppSetting[]; onSaved: () => void;
}) {
  const current = allSettings.find(s => s.key === settingKey)?.value || '';
  const [val, setVal] = useState(current);
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try { await api.admin.updateSetting(settingKey, val); onSaved(); }
    catch (e: unknown) { alert(e instanceof Error ? e.message : 'Ошибка'); }
    setSaving(false);
  };
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
      <div className="flex-1 min-w-0 mr-3">
        <p className="text-xs font-bold text-foreground">{label}</p>
        {desc && <p className="text-[10px] text-muted-foreground">{desc}</p>}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <input value={val} onChange={e => setVal(e.target.value)} type={type}
          className="w-20 bg-secondary border border-border rounded-lg px-2 py-1 text-xs outline-none text-foreground text-right" />
        <button disabled={saving || val === current} onClick={save}
          className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center disabled:opacity-40">
          <Icon name={saving ? 'Loader' : 'Check'} size={12} className="text-white" />
        </button>
      </div>
    </div>
  );
}

/* ─── Bots & Rewards tab ────────────────────────────────────────────── */

export function BotsTab() {
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [botStats, setBotStats] = useState<Record<string, number> | null>(null);

  const loadSettings = async () => {
    setLoading(true);
    try { const r = await api.admin.settings(); setSettings(r.settings); }
    catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { loadSettings(); }, []);

  const runBots = async () => {
    setRunning(true); setBotStats(null);
    try {
      const r = await api.likes.botRun();
      setBotStats(r.stats);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Ошибка запуска ботов');
    }
    setRunning(false);
  };

  if (loading) return <Spinner />;

  const rewardKeys = [
    { key: 'daily_reward_enabled', label: 'Награды включены', desc: 'true / false' },
    { key: 'daily_reward_day1', label: 'Монет за день 1', desc: 'по умолчанию 10' },
    { key: 'daily_reward_day2', label: 'Монет за день 2', desc: '' },
    { key: 'daily_reward_day3', label: 'Монет за день 3', desc: '' },
    { key: 'daily_reward_day4', label: 'Монет за день 4', desc: '' },
    { key: 'daily_reward_day5', label: 'Монет за день 5', desc: '' },
    { key: 'daily_reward_day6', label: 'Монет за день 6', desc: '' },
    { key: 'daily_reward_day7', label: 'Монет за день 7 ⭐', desc: 'бонусный день' },
    { key: 'coins_bonus_new_user', label: 'Бонус при регистрации', desc: 'монет новому пользователю' },
  ];

  const botKeys = [
    { key: 'bot_enabled', label: 'Боты включены', desc: 'true / false' },
    { key: 'bot_like_interval_min', label: 'Интервал лайков', desc: 'в минутах' },
    { key: 'bot_message_interval_min', label: 'Интервал сообщений', desc: 'в минутах' },
    { key: 'bot_view_interval_min', label: 'Интервал просмотров', desc: 'в минутах' },
  ];

  return (
    <>
      <div className="bg-white rounded-2xl border border-border p-4 card-shadow">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-base">🎁</div>
          <SectionTitle>Ежедневные награды</SectionTitle>
        </div>
        <div className="space-y-0">
          {rewardKeys.map(rk => (
            <QuickSetting key={rk.key} label={rk.label} desc={rk.desc} settingKey={rk.key} allSettings={settings} onSaved={loadSettings} />
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-border p-4 card-shadow">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center">
            <Icon name="Bot" size={16} className="text-blue-600" />
          </div>
          <SectionTitle>Боты</SectionTitle>
        </div>
        <div className="space-y-0 mb-4">
          {botKeys.map(bk => (
            <QuickSetting key={bk.key} label={bk.label} desc={bk.desc} settingKey={bk.key} allSettings={settings} onSaved={loadSettings} />
          ))}
        </div>
        <div className="border-t border-border pt-4">
          <p className="text-xs text-muted-foreground mb-3">Запустить ботов — они поставят лайки, зайдут в гости и напишут новым пользователям</p>
          <button onClick={runBots} disabled={running}
            className="w-full py-3 rounded-2xl btn-primary text-white text-sm font-bold disabled:opacity-60 flex items-center justify-center gap-2">
            {running
              ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Запускаем...</>
              : <><Icon name="Zap" size={16} />Запустить ботов</>}
          </button>
          {botStats && (
            <div className="mt-3 grid grid-cols-4 gap-2">
              {Object.entries(botStats).map(([k, v]) => (
                <div key={k} className="bg-secondary rounded-xl p-2 text-center">
                  <p className="text-lg font-black text-foreground">{v}</p>
                  <p className="text-[10px] text-muted-foreground">{k}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-border p-4 card-shadow">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center">
            <Icon name="Settings" size={16} className="text-emerald-600" />
          </div>
          <SectionTitle>Монетизация — быстро</SectionTitle>
        </div>
        <div className="space-y-0">
          {[
            { key: 'trial_enabled', label: 'Пробный период', desc: 'true / false' },
            { key: 'trial_days', label: 'Дней пробного периода', desc: '' },
            { key: 'payment_enabled', label: 'Оплата включена', desc: 'true / false' },
            { key: 'payment_provider', label: 'Провайдер оплаты', desc: 'yukassa / robokassa' },
            { key: 'boost_duration_min', label: 'Длительность буста (мин)', desc: '' },
            { key: 'free_boosts_per_month', label: 'Бустов бесплатно', desc: 'в месяц' },
            { key: 'premium_boosts_per_month', label: 'Бустов для Premium', desc: 'в месяц' },
          ].map(s => (
            <QuickSetting key={s.key} label={s.label} desc={s.desc} settingKey={s.key} allSettings={settings} onSaved={loadSettings} />
          ))}
        </div>
      </div>
    </>
  );
}
