import { useState, useEffect } from 'react';
import { api } from '@/api/client';
import Icon from '@/components/ui/icon';
import { Spinner, SectionTitle } from './adminShared';

const SMTP_KEYS = ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_from', 'app_url'];

const FIELD_META: Record<string, { label: string; desc: string; type?: string; placeholder?: string }> = {
  smtp_host:  { label: 'SMTP сервер',       desc: 'Например: smtp.gmail.com, smtp.mail.ru, smtp.yandex.ru', placeholder: 'smtp.gmail.com' },
  smtp_port:  { label: 'SMTP порт',         desc: '587 — STARTTLS (рекомендуется), 465 — SSL, 25 — без шифрования', placeholder: '587' },
  smtp_user:  { label: 'Логин (email)',      desc: 'Email-адрес отправителя, с которого будет идти авторизация', placeholder: 'you@gmail.com' },
  smtp_pass:  { label: 'Пароль / App Password', desc: 'Для Gmail используйте App Password (не обычный пароль)', type: 'password', placeholder: '••••••••' },
  smtp_from:  { label: 'Отправитель From',  desc: 'Имя и email в поле "От кого". Можно: "Spark <you@example.com>"', placeholder: 'Spark <noreply@example.com>' },
  app_url:    { label: 'URL приложения',    desc: 'Базовый URL сайта для ссылок в письмах (без слэша в конце)', placeholder: 'https://myapp.poehali.dev' },
};

const PROVIDERS = [
  {
    name: 'Gmail',
    icon: '✉️',
    host: 'smtp.gmail.com',
    port: '587',
    hint: 'Нужен App Password: Google Account → Безопасность → Двухэтапная аутентификация → Пароли приложений',
    link: 'https://myaccount.google.com/apppasswords',
    linkText: 'Создать App Password',
  },
  {
    name: 'Mail.ru',
    icon: '📮',
    host: 'smtp.mail.ru',
    port: '587',
    hint: 'Включите "Пароли для внешних приложений" в настройках почты Mail.ru',
    link: 'https://help.mail.ru/mail/security/protection/external',
    linkText: 'Инструкция Mail.ru',
  },
  {
    name: 'Яндекс',
    icon: '🟡',
    host: 'smtp.yandex.ru',
    port: '587',
    hint: 'Включите доступ по паролю приложения в настройках Яндекс.Почты',
    link: 'https://mail.yandex.ru/# settings/security',
    linkText: 'Настройки Яндекс.Почты',
  },
];

export function EmailTab() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState('');
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.admin.settings();
      const vals: Record<string, string> = {};
      r.settings.forEach(s => { if (SMTP_KEYS.includes(s.key)) vals[s.key] = s.value; });
      setValues(vals);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const saveKey = async (key: string) => {
    setSaving(key);
    try {
      await api.admin.updateSetting(key, values[key] || '');
      setSaved(key);
      setTimeout(() => setSaved(null), 2000);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Ошибка сохранения');
    }
    setSaving(null);
  };

  const applyProvider = (p: typeof PROVIDERS[0]) => {
    setValues(v => ({ ...v, smtp_host: p.host, smtp_port: p.port }));
  };

  const sendTest = async () => {
    if (!testEmail || testSending) return;
    setTestSending(true);
    setTestResult(null);
    try {
      const r = await api.admin.sendTestEmail(testEmail);
      setTestResult({ ok: true, message: r.message || `Письмо отправлено на ${testEmail}` });
    } catch (e: unknown) {
      setTestResult({ ok: false, message: e instanceof Error ? e.message : 'Ошибка отправки' });
    }
    setTestSending(false);
  };

  const isConfigured = !!(values.smtp_host && values.smtp_user && values.smtp_pass);

  if (loading) return <Spinner />;

  return (
    <>
      {/* Status card */}
      <div className={`rounded-2xl p-4 border card-shadow flex items-center gap-3 ${isConfigured ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isConfigured ? 'bg-emerald-100' : 'bg-amber-100'}`}>
          <Icon name={isConfigured ? 'Mail' : 'MailWarning'} size={20} className={isConfigured ? 'text-emerald-600' : 'text-amber-600'} />
        </div>
        <div>
          <p className="text-sm font-black text-foreground">{isConfigured ? 'Email настроен' : 'Email не настроен'}</p>
          <p className="text-[11px] text-muted-foreground">
            {isConfigured ? `Сервер: ${values.smtp_host}:${values.smtp_port || 587}` : 'Заполните настройки ниже для отправки писем'}
          </p>
        </div>
      </div>

      {/* Quick provider buttons */}
      <div className="bg-white rounded-2xl border border-border p-4 card-shadow">
        <SectionTitle>Быстрый выбор провайдера</SectionTitle>
        <div className="grid grid-cols-3 gap-2 mb-1">
          {PROVIDERS.map(p => (
            <button key={p.name} onClick={() => applyProvider(p)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${values.smtp_host === p.host ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}>
              <span className="text-xl">{p.icon}</span>
              <span className="text-xs font-bold text-foreground">{p.name}</span>
            </button>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">Нажмите чтобы автозаполнить host и port</p>
      </div>

      {/* Provider hints */}
      {PROVIDERS.filter(p => values.smtp_host === p.host).map(p => (
        <div key={p.name} className="bg-blue-50 rounded-2xl border border-blue-200 p-3 flex items-start gap-2">
          <Icon name="Info" size={14} className="text-blue-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-[11px] text-blue-800 font-semibold">{p.hint}</p>
            <a href={p.link} target="_blank" rel="noreferrer"
              className="text-[10px] text-blue-600 font-bold underline mt-0.5 inline-block">{p.linkText} →</a>
          </div>
        </div>
      ))}

      {/* SMTP fields */}
      <div className="bg-white rounded-2xl border border-border p-4 card-shadow space-y-4">
        <SectionTitle>Настройки SMTP</SectionTitle>
        {SMTP_KEYS.map(key => {
          const meta = FIELD_META[key];
          return (
            <div key={key}>
              <label className="text-xs font-bold text-foreground block mb-0.5">{meta.label}</label>
              <p className="text-[10px] text-muted-foreground mb-1.5">{meta.desc}</p>
              <div className="flex gap-2">
                <input
                  value={values[key] || ''}
                  onChange={e => setValues(v => ({ ...v, [key]: e.target.value }))}
                  type={meta.type || 'text'}
                  placeholder={meta.placeholder}
                  onKeyDown={e => e.key === 'Enter' && saveKey(key)}
                  className="flex-1 bg-secondary border border-border rounded-xl px-3 py-2 text-sm outline-none text-foreground focus:border-primary transition-colors"
                />
                <button onClick={() => saveKey(key)} disabled={saving === key}
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 ${saved === key ? 'bg-emerald-500 text-white' : 'btn-primary text-white'}`}>
                  {saving === key
                    ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <Icon name={saved === key ? 'Check' : 'Save'} size={13} />}
                  {saved === key ? 'Сохранено' : 'Сохранить'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Test send */}
      <div className="bg-white rounded-2xl border border-border p-4 card-shadow">
        <SectionTitle>Тестовое письмо</SectionTitle>
        <p className="text-[11px] text-muted-foreground mb-3">Отправьте тестовое письмо чтобы проверить, что настройки работают</p>
        <div className="flex gap-2">
          <input
            value={testEmail}
            onChange={e => setTestEmail(e.target.value)}
            type="email"
            placeholder="Введите ваш email"
            onKeyDown={e => e.key === 'Enter' && sendTest()}
            className="flex-1 bg-secondary border border-border rounded-xl px-3 py-2 text-sm outline-none text-foreground focus:border-primary transition-colors"
          />
          <button onClick={sendTest} disabled={!testEmail || testSending || !isConfigured}
            className="px-4 py-2 rounded-xl btn-primary text-white text-sm font-bold disabled:opacity-50 flex items-center gap-2 shrink-0">
            {testSending
              ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Отправка...</>
              : <><Icon name="Send" size={15} />Отправить</>}
          </button>
        </div>
        {!isConfigured && (
          <p className="text-[10px] text-muted-foreground mt-2">Сначала заполните и сохраните host, логин и пароль</p>
        )}
        {testResult && (
          <div className={`mt-3 flex items-start gap-2 p-3 rounded-xl border ${testResult.ok ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
            <Icon name={testResult.ok ? 'CheckCircle' : 'AlertCircle'} size={14}
              className={`shrink-0 mt-0.5 ${testResult.ok ? 'text-emerald-600' : 'text-red-500'}`} />
            <p className={`text-xs font-semibold ${testResult.ok ? 'text-emerald-800' : 'text-red-700'}`}>{testResult.message}</p>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-white rounded-2xl border border-border p-4 card-shadow">
        <SectionTitle>Как подключить Gmail</SectionTitle>
        <div className="space-y-3 text-xs text-foreground">
          {[
            { n: 1, title: 'Включите двухэтапную аутентификацию', text: 'Google Account → Безопасность → Двухэтапная аутентификация' },
            { n: 2, title: 'Создайте пароль приложения', text: 'Google Account → Безопасность → Пароли приложений → Выберите "Почта" → Создать' },
            { n: 3, title: 'Заполните поля выше', text: 'Host: smtp.gmail.com, Port: 587, User: ваш@gmail.com, Password: пароль приложения из шага 2' },
            { n: 4, title: 'Сохраните и проверьте', text: 'Нажмите "Сохранить" у каждого поля, затем отправьте тестовое письмо' },
          ].map(step => (
            <div key={step.n} className="flex gap-3">
              <div className="w-6 h-6 rounded-full gradient-brand flex items-center justify-center text-white text-[10px] font-bold shrink-0">{step.n}</div>
              <div>
                <p className="font-bold">{step.title}</p>
                <p className="text-muted-foreground">{step.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Security note */}
      <div className="bg-amber-50 rounded-2xl p-3 border border-amber-200">
        <div className="flex items-start gap-2">
          <Icon name="AlertTriangle" size={14} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[10px] text-amber-800">
            <span className="font-bold">Безопасность:</span> Пароль от почты хранится в настройках приложения. Используйте пароль приложения (App Password), а не основной пароль от аккаунта.
          </p>
        </div>
      </div>
    </>
  );
}
