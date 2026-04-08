import { useState, useEffect } from 'react';
import { api, AppSetting } from '@/api/client';
import Icon from '@/components/ui/icon';
import { Spinner, SectionTitle } from './adminShared';

/* ─── Settings tab ─────────────────────────────────────────────────── */

export function SettingsTab() {
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

export function PaymentTab() {
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
              <p className="text-muted-foreground">В настройках магазина укажите Result URL для приема уведомлений о платежах.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full gradient-brand flex items-center justify-center text-white text-[10px] font-bold shrink-0">4</div>
            <div>
              <p className="font-bold">Введите данные выше и включите оплату</p>
              <p className="text-muted-foreground">Заполните поля robokassa_login, robokassa_pass1, robokassa_pass2, выберите провайдер "Робокасса" и включите payment_enabled.</p>
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
