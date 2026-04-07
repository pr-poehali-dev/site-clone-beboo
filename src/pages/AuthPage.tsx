import { useState } from 'react';
import Icon from '@/components/ui/icon';

interface AuthPageProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (email: string, password: string, name: string, age: number, gender: string) => Promise<void>;
}

export default function AuthPage({ onLogin, onRegister }: AuthPageProps) {
  const [mode, setMode] = useState<'welcome' | 'login' | 'register'>('welcome');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

          <p className="text-center text-sm text-muted-foreground mt-6">
            Нет аккаунта?{' '}
            <button onClick={() => setMode('register')} className="text-primary font-bold hover:underline">
              Зарегистрироваться
            </button>
          </p>
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

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-4 text-base mt-2 disabled:opacity-60"
            >
              {loading ? 'Создаём аккаунт...' : 'Создать профиль 🎉'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
