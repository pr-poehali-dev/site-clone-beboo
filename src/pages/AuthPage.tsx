import { useState } from 'react';
import Icon from '@/components/ui/icon';

interface AuthPageProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (email: string, password: string, name: string, age: number, gender: string) => Promise<void>;
}

function PolicyModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl p-6 w-full max-w-sm max-h-[80vh] flex flex-col animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4 shrink-0">
          <h3 className="text-base font-black text-foreground">Пользовательское соглашение</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center">
            <Icon name="X" size={18} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 space-y-4 text-sm text-foreground/80 leading-relaxed pr-1">
          <p className="font-bold text-foreground">Последнее обновление: апрель 2025</p>

          <div>
            <p className="font-bold text-foreground mb-1">1. Общие положения</p>
            <p>Настоящее Соглашение регулирует использование сервиса знакомств Spark (далее — «Сервис»). Регистрируясь, вы подтверждаете, что достигли 18 лет и соглашаетесь с условиями.</p>
          </div>

          <div>
            <p className="font-bold text-foreground mb-1">2. Правила поведения</p>
            <p>Запрещается: публиковать ложную информацию о себе; использовать фотографии других лиц; отправлять спам, домогательства или угрозы; делиться контактными данными в профиле и сообщениях (телефоны, ссылки на соцсети); публиковать контент сексуального, насильственного или мошеннического характера.</p>
          </div>

          <div>
            <p className="font-bold text-foreground mb-1">3. Конфиденциальность</p>
            <p>Мы собираем email, имя, возраст, пол и фотографии исключительно для работы Сервиса. Данные не передаются третьим лицам без вашего согласия. Переписка между пользователями хранится на серверах Сервиса.</p>
          </div>

          <div>
            <p className="font-bold text-foreground mb-1">4. Безопасность</p>
            <p>Общайтесь только внутри Сервиса до личного знакомства. Не переводите деньги незнакомым людям. При подозрении на мошенничество — сразу используйте кнопку «Пожаловаться».</p>
          </div>

          <div>
            <p className="font-bold text-foreground mb-1">5. Контент и подписка</p>
            <p>Виртуальная валюта (монеты) и подарки не имеют денежного эквивалента и не подлежат возврату. Подписка Premium активируется немедленно и не возвращается после использования.</p>
          </div>

          <div>
            <p className="font-bold text-foreground mb-1">6. Блокировка</p>
            <p>Администрация вправе заблокировать аккаунт без предупреждения при нарушении правил. Решение о блокировке можно оспорить через центр поддержки.</p>
          </div>

          <div>
            <p className="font-bold text-foreground mb-1">7. Ответственность</p>
            <p>Сервис не несёт ответственности за действия пользователей за пределами платформы. Мы делаем всё возможное для проверки анкет, но не гарантируем достоверность данных.</p>
          </div>
        </div>
        <button onClick={onClose} className="mt-4 w-full py-3 rounded-2xl btn-primary text-white font-bold shrink-0">
          Понятно
        </button>
      </div>
    </div>
  );
}

export default function AuthPage({ onLogin, onRegister }: AuthPageProps) {
  const [mode, setMode] = useState<'welcome' | 'login' | 'register' | 'forgot' | 'reset'>('welcome');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [showPolicy, setShowPolicy] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [newPwd2, setNewPwd2] = useState('');

  // Проверяем наличие reset_token в URL при загрузке
  const urlResetToken = new URLSearchParams(window.location.search).get('reset_token') || new URLSearchParams(window.location.hash.replace('#', '?')).get('reset_token');
  if (urlResetToken && mode !== 'reset') {
    setResetToken(urlResetToken);
    setMode('reset');
  }

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onLogin(email, password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError('Заполните все поля'); return; }
    if (password.length < 6) { setError('Пароль минимум 6 символов'); return; }
    setError('');
    setStep(2);
  };

  const handleRegisterStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !age || !gender) { setError('Заполните все поля'); return; }
    if (!agreed) { setError('Необходимо принять пользовательское соглашение'); return; }
    setError('');
    setLoading(true);
    try {
      await onRegister(email, password, name, parseInt(age), gender);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка регистрации');
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'welcome') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 right-0 h-1/2"
            style={{ background: 'linear-gradient(180deg, hsl(340 82% 96%) 0%, transparent 100%)' }}
          />
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-20"
            style={{ background: 'linear-gradient(135deg, hsl(340 82% 58%), hsl(262 80% 64%))' }}
          />
          <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full opacity-15"
            style={{ background: 'linear-gradient(135deg, hsl(262 80% 64%), hsl(340 82% 58%))' }}
          />
        </div>

        <div className="relative z-10 text-center max-w-xs w-full animate-fade-in">
          <div className="w-20 h-20 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-2xl"
            style={{ background: 'linear-gradient(135deg, hsl(340 82% 58%), hsl(262 80% 64%))' }}
          >
            <span className="text-4xl">⚡</span>
          </div>

          <h1 className="text-5xl font-black mb-2 text-gradient">Spark</h1>
          <p className="text-muted-foreground text-base mb-12 leading-relaxed">
            Найди своего человека.<br />Просто и по-настоящему.
          </p>

          <div className="space-y-3 mb-6">
            {[
              { emoji: '💫', text: 'Реальные анкеты рядом с тобой' },
              { emoji: '🔒', text: 'Безопасно и конфиденциально' },
              { emoji: '💬', text: 'Чат только с мэтчами' },
            ].map(item => (
              <div key={item.text} className="flex items-center gap-3 text-left px-2">
                <span className="text-xl shrink-0">{item.emoji}</span>
                <p className="text-sm text-foreground/80 font-medium">{item.text}</p>
              </div>
            ))}
          </div>

          <div className="space-y-3 mt-10">
            <button
              onClick={() => setMode('register')}
              className="btn-primary w-full py-4 text-base"
            >
              Начать знакомиться
            </button>
            <button
              onClick={() => setMode('login')}
              className="w-full py-4 rounded-2xl border-2 border-border text-foreground font-bold text-base hover:bg-secondary transition-colors"
            >
              Войти в аккаунт
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'forgot') {
    const handleForgot = async (e: React.FormEvent) => {
      e.preventDefault();
      setError(''); setSuccess(''); setLoading(true);
      try {
        const r = await api.auth.forgotPassword(email);
        setSuccess(r.message || 'Письмо отправлено!');
        if (r.dev_token) setSuccess(`DEV: используй токен ${r.dev_token} для сброса пароля`);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Ошибка');
      } finally { setLoading(false); }
    };
    return (
      <div className="min-h-screen flex flex-col justify-center p-6 max-w-sm mx-auto">
        <button onClick={() => { setMode('login'); setError(''); setSuccess(''); }} className="flex items-center gap-2 text-muted-foreground mb-8 hover:text-foreground transition-colors">
          <Icon name="ChevronLeft" size={20} /><span className="text-sm font-semibold">Назад</span>
        </button>
        <div className="animate-slide-up">
          <h2 className="text-3xl font-black text-foreground mb-1">Забыли пароль?</h2>
          <p className="text-muted-foreground mb-8">Введите email — пришлём ссылку для сброса</p>
          <form onSubmit={handleForgot} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required
                className="w-full bg-secondary border border-border rounded-2xl px-4 py-3.5 text-sm text-foreground outline-none focus:border-primary transition-colors" />
            </div>
            {error && <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20"><Icon name="AlertCircle" size={16} className="text-destructive shrink-0" /><p className="text-sm text-destructive">{error}</p></div>}
            {success && <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200"><Icon name="CheckCircle" size={16} className="text-emerald-600 shrink-0" /><p className="text-sm text-emerald-700">{success}</p></div>}
            <button type="submit" disabled={loading} className="btn-primary w-full py-4 text-base mt-2 disabled:opacity-60">
              {loading ? 'Отправляем...' : 'Отправить ссылку'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (mode === 'reset') {
    const handleReset = async (e: React.FormEvent) => {
      e.preventDefault();
      if (newPwd !== newPwd2) { setError('Пароли не совпадают'); return; }
      if (newPwd.length < 6) { setError('Пароль минимум 6 символов'); return; }
      setError(''); setLoading(true);
      try {
        const r = await api.auth.resetPassword(resetToken, newPwd);
        setSuccess(r.message || 'Пароль изменён!');
        setTimeout(() => { setMode('login'); setSuccess(''); window.history.replaceState({}, '', window.location.pathname); }, 2000);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Ошибка');
      } finally { setLoading(false); }
    };
    return (
      <div className="min-h-screen flex flex-col justify-center p-6 max-w-sm mx-auto">
        <div className="animate-slide-up">
          <div className="w-16 h-16 rounded-3xl mx-auto mb-6 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, hsl(340 82% 58%), hsl(262 80% 64%))' }}>
            <Icon name="Lock" size={28} className="text-white" />
          </div>
          <h2 className="text-3xl font-black text-foreground mb-1 text-center">Новый пароль</h2>
          <p className="text-muted-foreground mb-8 text-center">Придумайте надёжный пароль</p>
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Новый пароль</label>
              <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="••••••••" required minLength={6}
                className="w-full bg-secondary border border-border rounded-2xl px-4 py-3.5 text-sm text-foreground outline-none focus:border-primary transition-colors" />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Повторите пароль</label>
              <input type="password" value={newPwd2} onChange={e => setNewPwd2(e.target.value)} placeholder="••••••••" required
                className="w-full bg-secondary border border-border rounded-2xl px-4 py-3.5 text-sm text-foreground outline-none focus:border-primary transition-colors" />
            </div>
            {error && <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20"><Icon name="AlertCircle" size={16} className="text-destructive shrink-0" /><p className="text-sm text-destructive">{error}</p></div>}
            {success && <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200"><Icon name="CheckCircle" size={16} className="text-emerald-600 shrink-0" /><p className="text-sm text-emerald-700">{success}</p></div>}
            <button type="submit" disabled={loading} className="btn-primary w-full py-4 text-base mt-2 disabled:opacity-60">
              {loading ? 'Сохраняем...' : 'Сохранить пароль'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (mode === 'login') {
    return (
      <div className="min-h-screen flex flex-col justify-center p-6 max-w-sm mx-auto">
        <button onClick={() => setMode('welcome')} className="flex items-center gap-2 text-muted-foreground mb-8 hover:text-foreground transition-colors">
          <Icon name="ChevronLeft" size={20} />
          <span className="text-sm font-semibold">Назад</span>
        </button>

        <div className="animate-slide-up">
          <h2 className="text-3xl font-black text-foreground mb-1">Добро пожаловать</h2>
          <p className="text-muted-foreground mb-8">Войдите в свой аккаунт</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-secondary border border-border rounded-2xl px-4 py-3.5 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-primary transition-colors"
                required
              />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Пароль</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-secondary border border-border rounded-2xl px-4 py-3.5 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-primary transition-colors"
                required
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20">
                <Icon name="AlertCircle" size={16} className="text-destructive shrink-0" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-4 text-base mt-2 disabled:opacity-60"
            >
              {loading ? 'Входим...' : 'Войти'}
            </button>
          </form>

          <div className="flex items-center justify-between mt-6">
            <p className="text-sm text-muted-foreground">
              Нет аккаунта?{' '}
              <button onClick={() => setMode('register')} className="text-primary font-bold hover:underline">
                Создать
              </button>
            </p>
            <button onClick={() => { setMode('forgot'); setError(''); setSuccess(''); }} className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Забыли пароль?
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center p-6 max-w-sm mx-auto">
      <button onClick={() => step === 1 ? setMode('welcome') : setStep(1)} className="flex items-center gap-2 text-muted-foreground mb-8 hover:text-foreground transition-colors">
        <Icon name="ChevronLeft" size={20} />
        <span className="text-sm font-semibold">Назад</span>
      </button>

      <div className="flex gap-2 mb-8">
        {[1, 2].map(s => (
          <div key={s} className={`flex-1 h-1 rounded-full transition-all ${s <= step ? 'bg-primary' : 'bg-border'}`} />
        ))}
      </div>

      {step === 1 && (
        <div className="animate-slide-up">
          <h2 className="text-3xl font-black text-foreground mb-1">Создать аккаунт</h2>
          <p className="text-muted-foreground mb-8">Шаг 1 из 2 — данные для входа</p>

          <form onSubmit={handleRegisterStep1} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-secondary border border-border rounded-2xl px-4 py-3.5 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-primary transition-colors"
                required
              />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Пароль</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Минимум 6 символов"
                className="w-full bg-secondary border border-border rounded-2xl px-4 py-3.5 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-primary transition-colors"
                required
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20">
                <Icon name="AlertCircle" size={16} className="text-destructive shrink-0" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <button type="submit" className="btn-primary w-full py-4 text-base mt-2">
              Продолжить
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Уже есть аккаунт?{' '}
            <button onClick={() => setMode('login')} className="text-primary font-bold hover:underline">
              Войти
            </button>
          </p>
        </div>
      )}

      {step === 2 && (
        <div className="animate-slide-up">
          <h2 className="text-3xl font-black text-foreground mb-1">Расскажи о себе</h2>
          <p className="text-muted-foreground mb-8">Шаг 2 из 2 — твой профиль</p>

          <form onSubmit={handleRegisterStep2} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Имя</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Как тебя зовут?"
                className="w-full bg-secondary border border-border rounded-2xl px-4 py-3.5 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-primary transition-colors"
                required
              />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Возраст</label>
              <input
                type="number"
                value={age}
                onChange={e => setAge(e.target.value)}
                placeholder="18"
                min="18"
                max="99"
                className="w-full bg-secondary border border-border rounded-2xl px-4 py-3.5 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-primary transition-colors"
                required
              />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Пол</label>
              <div className="grid grid-cols-3 gap-2">
                {[{ id: 'male', label: 'Мужчина', emoji: '👨' }, { id: 'female', label: 'Женщина', emoji: '👩' }, { id: 'other', label: 'Другое', emoji: '🌈' }].map(g => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setGender(g.id)}
                    className={`py-3 rounded-2xl border-2 text-sm font-bold flex flex-col items-center gap-1 transition-all ${
                      gender === g.id ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:border-primary/40'
                    }`}
                  >
                    <span className="text-xl">{g.emoji}</span>
                    <span className="text-xs">{g.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20">
                <Icon name="AlertCircle" size={16} className="text-destructive shrink-0" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <label className="flex items-start gap-3 cursor-pointer group">
              <div className={`mt-0.5 w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${agreed ? 'bg-primary border-primary' : 'border-border group-hover:border-primary/50'}`}
                onClick={() => setAgreed(v => !v)}>
                {agreed && <Icon name="Check" size={12} className="text-white" />}
              </div>
              <p className="text-sm text-foreground/80 leading-relaxed">
                Я принимаю{' '}
                <button type="button" onClick={() => setShowPolicy(true)} className="text-primary font-bold underline">
                  пользовательское соглашение
                </button>{' '}
                и подтверждаю, что мне исполнилось 18 лет
              </p>
            </label>

            <button
              type="submit"
              disabled={loading || !agreed}
              className="btn-primary w-full py-4 text-base mt-2 disabled:opacity-60"
            >
              {loading ? 'Создаём аккаунт...' : 'Создать профиль 🎉'}
            </button>
          </form>
        </div>
      )}
      {showPolicy && <PolicyModal onClose={() => setShowPolicy(false)} />}
    </div>
  );
}