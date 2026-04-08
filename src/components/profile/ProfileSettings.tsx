import { useState, useRef, useEffect } from 'react';
import { api } from '@/api/client';
import Icon from '@/components/ui/icon';

// ── SelfieVerification ────────────────────────────────────────────────────

interface SelfieVerificationProps {
  verified: boolean;
}

export function SelfieVerification({ verified }: SelfieVerificationProps) {
  const [status, setStatus] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (verified) { setStatus('approved'); return; }
    api.upload.selfieStatus().then(r => setStatus(r.status)).catch(() => setStatus('none'));
  }, [verified]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async ev => {
      const data = ev.target?.result as string;
      setUploading(true);
      try {
        const r = await api.upload.selfie(data);
        setStatus(r.status);
        alert('Селфи отправлено! Мы проверим его в течение 24 часов.');
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : 'Ошибка загрузки');
      } finally { setUploading(false); }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const badge = verified || status === 'approved'
    ? { icon: 'BadgeCheck', color: 'text-blue-500', bg: 'bg-blue-50', label: 'Верифицирован', sub: 'Ваш профиль подтверждён' }
    : status === 'pending'
    ? { icon: 'Clock', color: 'text-amber-500', bg: 'bg-amber-50', label: 'На проверке', sub: 'Ждём подтверждения (до 24ч)' }
    : status === 'rejected'
    ? { icon: 'XCircle', color: 'text-rose-500', bg: 'bg-rose-50', label: 'Отклонено', sub: 'Попробуй снова с чётким фото' }
    : { icon: 'ShieldCheck', color: 'text-muted-foreground', bg: 'bg-secondary', label: 'Не верифицирован', sub: 'Загрузи селфи для проверки' };

  return (
    <div className="rounded-2xl border border-border overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3.5">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${badge.bg}`}>
            <Icon name={badge.icon} size={18} className={badge.color} />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">{badge.label}</p>
            <p className="text-xs text-muted-foreground">{badge.sub}</p>
          </div>
        </div>
        {(status === 'none' || status === 'rejected') && (
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="px-3 py-1.5 rounded-xl btn-primary text-white text-xs font-bold disabled:opacity-60">
            {uploading ? '...' : 'Загрузить'}
          </button>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      {(status === 'none' || status === 'rejected') && (
        <div className="px-4 pb-3 text-xs text-muted-foreground">
          Сделай чёткое селфи своего лица — мы сравним с фото профиля и поставим синюю галочку ✓
        </div>
      )}
    </div>
  );
}

// ── IncognitoToggle ───────────────────────────────────────────────────────

interface IncognitoToggleProps {
  isPremium: boolean;
}

export function IncognitoToggle({ isPremium }: IncognitoToggleProps) {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.likes.incognitoStatus()
      .then(r => setEnabled(r.incognito))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggle = async () => {
    if (!isPremium) { alert('Режим инкогнито — только для Premium'); return; }
    setSaving(true);
    try {
      const r = await api.likes.incognito(!enabled);
      setEnabled(r.incognito);
    } catch { /* ignore */ } finally { setSaving(false); }
  };

  return (
    <div className="rounded-2xl border border-border overflow-hidden">
      <button onClick={toggle} disabled={loading || saving}
        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-secondary/50 transition-colors">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${enabled && isPremium ? 'bg-violet-100' : 'bg-secondary'}`}>
            <Icon name="EyeOff" size={18} className={enabled && isPremium ? 'text-violet-500' : 'text-muted-foreground'} />
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-foreground">Режим инкогнито</p>
            <p className="text-xs text-muted-foreground">{isPremium ? (enabled ? 'Вас не видят в поиске' : 'Вы видны в поиске') : 'Только для Premium'}</p>
          </div>
        </div>
        <div className={`relative w-11 h-6 rounded-full transition-colors ${enabled && isPremium ? 'bg-violet-500' : 'bg-border'}`}>
          <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${enabled && isPremium ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </div>
      </button>
    </div>
  );
}

// ── ChangePasswordBlock ────────────────────────────────────────────────────

export function ChangePasswordBlock() {
  const [open, setOpen] = useState(false);
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [newPwd2, setNewPwd2] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [isError, setIsError] = useState(false);

  const save = async () => {
    if (!oldPwd || !newPwd || !newPwd2) { setIsError(true); setMsg('Заполните все поля'); return; }
    if (newPwd !== newPwd2) { setIsError(true); setMsg('Новые пароли не совпадают'); return; }
    if (newPwd.length < 6) { setIsError(true); setMsg('Минимум 6 символов'); return; }
    setSaving(true); setMsg(''); setIsError(false);
    try {
      const r = await api.auth.changePassword(oldPwd, newPwd);
      setMsg(r.message || 'Пароль изменён!');
      setIsError(false);
      setOldPwd(''); setNewPwd(''); setNewPwd2('');
      setTimeout(() => { setOpen(false); setMsg(''); }, 2000);
    } catch (e: unknown) {
      setIsError(true);
      setMsg(e instanceof Error ? e.message : 'Ошибка');
    } finally { setSaving(false); }
  };

  return (
    <div className="rounded-2xl border border-border overflow-hidden">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-secondary/50 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
            <Icon name="Lock" size={18} className="text-muted-foreground" />
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-foreground">Сменить пароль</p>
            <p className="text-xs text-muted-foreground">Обновите пароль от аккаунта</p>
          </div>
        </div>
        <Icon name={open ? 'ChevronUp' : 'ChevronDown'} size={16} className="text-muted-foreground" />
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-border">
          <input type="password" value={oldPwd} onChange={e => setOldPwd(e.target.value)}
            placeholder="Текущий пароль"
            className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary mt-3" />
          <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)}
            placeholder="Новый пароль (мин. 6 символов)"
            className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary" />
          <input type="password" value={newPwd2} onChange={e => setNewPwd2(e.target.value)}
            placeholder="Повторите новый пароль"
            className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary" />
          {msg && (
            <p className={`text-xs px-1 ${isError ? 'text-rose-500' : 'text-emerald-600'}`}>{msg}</p>
          )}
          <button onClick={save} disabled={saving}
            className="w-full py-2.5 rounded-xl btn-primary text-white text-sm font-bold disabled:opacity-60">
            {saving ? 'Сохраняем...' : 'Сохранить пароль'}
          </button>
        </div>
      )}
    </div>
  );
}