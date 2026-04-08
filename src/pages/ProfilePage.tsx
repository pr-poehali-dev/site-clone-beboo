import { useState, useRef } from 'react';
import { api, UserProfile } from '@/api/client';
import Icon from '@/components/ui/icon';
import PremiumModal from '@/components/profile/PremiumModal';
import { SelfieVerification, IncognitoToggle, ChangePasswordBlock } from '@/components/profile/ProfileSettings';
import { TAGS_OPTIONS, BIO_MAX, JOB_MAX, filterBio, filterJob } from '@/components/profile/profileFilters';

interface ProfilePageProps {
  user: UserProfile;
  onLogout: () => void;
  onRefresh: () => Promise<void>;
}

function PremiumStatusBadge({ expiresAt, onUpgrade }: { expiresAt: string | null; onUpgrade: () => void }) {
  const formatExpiry = () => {
    if (!expiresAt) return null;
    const exp = new Date(expiresAt);
    const now = new Date();
    const diffMs = exp.getTime() - now.getTime();
    if (diffMs <= 0) return 'Истёк';
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const dateStr = exp.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
    if (days > 30) return `до ${dateStr}`;
    if (days > 0) return `${days} дн ${hours} ч · до ${dateStr}`;
    return `${hours} ч · до ${dateStr}`;
  };

  const expiry = formatExpiry();
  const isExpiringSoon = expiresAt && (new Date(expiresAt).getTime() - Date.now()) < 3 * 24 * 60 * 60 * 1000;

  return (
    <div className="w-full flex items-center gap-3 p-4 rounded-2xl mb-4"
      style={{ background: 'linear-gradient(135deg, hsl(340 82% 58%) 0%, hsl(262 80% 64%) 100%)' }}>
      <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
        <Icon name="Star" size={20} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-black text-white text-sm">Spark Premium активен</p>
          {isExpiringSoon && (
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-amber-400 text-white">Скоро истечёт</span>
          )}
        </div>
        {expiry && <p className="text-white/80 text-xs mt-0.5">Осталось: {expiry}</p>}
      </div>
      <button onClick={onUpgrade}
        className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 transition-colors text-white text-xs font-bold shrink-0">
        Продлить
      </button>
    </div>
  );
}

export default function ProfilePage({ user, onLogout, onRefresh }: ProfilePageProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'settings'>('profile');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showPremium, setShowPremium] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ bio?: string; job?: string }>({});
  const [form, setForm] = useState({
    name: user.name,
    bio: user.bio || '',
    city: user.city || 'Москва',
    job: user.job || '',
    tags: user.tags || [] as string[],
    search_radius: user.search_radius || 25,
    search_age_min: user.search_age_min || 18,
    search_age_max: user.search_age_max || 45,
    search_gender: user.search_gender || 'all',
  });
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    if (fieldErrors.bio || fieldErrors.job) return;
    const bioCheck = filterBio(form.bio);
    const jobCheck = filterJob(form.job);
    if (bioCheck.error) { setFieldErrors(fe => ({ ...fe, bio: bioCheck.error! })); return; }
    if (jobCheck.error) { setFieldErrors(fe => ({ ...fe, job: jobCheck.error! })); return; }
    setSaving(true);
    try { await api.profiles.update(form); await onRefresh(); setEditing(false); setFieldErrors({}); }
    catch { /* ignore */ } finally { setSaving(false); }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try { await api.upload.photo(ev.target?.result as string); await onRefresh(); }
      catch (err) { console.error(err); alert('Не удалось загрузить фото'); }
      finally { setUploading(false); }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemovePhoto = async (url: string) => {
    try { await api.upload.removePhoto(url); await onRefresh(); } catch { /* ignore */ }
  };

  const toggleTag = (tag: string) => {
    setForm(f => ({ ...f, tags: f.tags.includes(tag) ? f.tags.filter(t => t !== tag) : [...f.tags, tag] }));
  };

  const mainPhoto = user.photos?.[0];
  const fallback = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.name)}&backgroundColor=fde68a`;

  return (
    <div className="h-full overflow-y-auto">
      {/* Hero banner */}
      <div className="h-36 w-full relative" style={{ background: 'linear-gradient(135deg, hsl(340 82% 58%), hsl(262 80% 64%))' }}>
        {/* Premium badge */}
        {user.is_premium && (
          <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full">
            <Icon name="Star" size={13} className="text-white" />
            <span className="text-white text-xs font-black">Premium</span>
          </div>
        )}
      </div>

      <div className="px-4 pb-6">
        <div className="flex items-end justify-between -mt-14 mb-4">
          <div className="relative">
            <img src={mainPhoto || fallback} alt={user.name}
              className="w-28 h-28 rounded-3xl object-cover border-4 border-white card-shadow bg-secondary"
              onError={e => { (e.target as HTMLImageElement).src = fallback; }} />
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="absolute bottom-1 right-1 w-7 h-7 rounded-full flex items-center justify-center shadow-md disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, hsl(340 82% 58%), hsl(262 80% 64%))' }}>
              {uploading
                ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <Icon name="Camera" size={13} className="text-white" />
              }
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
          </div>
          <button onClick={() => editing ? handleSave() : setEditing(true)} disabled={saving}
            className={`mb-1 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all disabled:opacity-60 ${editing ? 'btn-primary text-white' : 'border-2 border-border text-foreground hover:bg-secondary'}`}>
            {saving ? 'Сохраняем...' : editing ? 'Сохранить' : 'Изменить'}
          </button>
        </div>

        {editing ? (
          <div className="space-y-3 mb-4 animate-fade-in">
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Имя" className="w-full bg-secondary border border-border rounded-2xl px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors" />
            <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
              placeholder="Город" className="w-full bg-secondary border border-border rounded-2xl px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors" />
            <div>
              <input
                value={form.job}
                onChange={e => {
                  const { clean, error } = filterJob(e.target.value);
                  setForm(f => ({ ...f, job: clean }));
                  setFieldErrors(fe => ({ ...fe, job: error || undefined }));
                }}
                placeholder="Работа (необязательно)"
                maxLength={JOB_MAX}
                className={`w-full bg-secondary border rounded-2xl px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors ${fieldErrors.job ? 'border-rose-400' : 'border-border'}`}
              />
              <div className="flex justify-between mt-1 px-1">
                {fieldErrors.job ? <p className="text-xs text-rose-500">{fieldErrors.job}</p> : <span />}
                <p className="text-xs text-muted-foreground">{form.job.length}/{JOB_MAX}</p>
              </div>
            </div>
            <div>
              <textarea
                value={form.bio}
                onChange={e => {
                  const { clean, error } = filterBio(e.target.value);
                  setForm(f => ({ ...f, bio: clean }));
                  setFieldErrors(fe => ({ ...fe, bio: error || undefined }));
                }}
                placeholder="Расскажи о себе... (без цифр, контактов и ссылок)"
                rows={4}
                maxLength={BIO_MAX}
                className={`w-full bg-secondary border rounded-2xl px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors resize-none ${fieldErrors.bio ? 'border-rose-400' : 'border-border'}`}
              />
              <div className="flex justify-between mt-1 px-1">
                {fieldErrors.bio
                  ? <p className="text-xs text-rose-500">{fieldErrors.bio}</p>
                  : <p className="text-xs text-muted-foreground">Без цифр, контактов и ссылок</p>}
                <p className={`text-xs ${form.bio.length > BIO_MAX * 0.9 ? 'text-amber-500' : 'text-muted-foreground'}`}>{form.bio.length}/{BIO_MAX}</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider">Интересы</p>
              <div className="flex flex-wrap gap-2">
                {TAGS_OPTIONS.map(tag => (
                  <button key={tag} type="button" onClick={() => toggleTag(tag)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${form.tags.includes(tag) ? 'btn-primary text-white' : 'bg-secondary text-muted-foreground border border-border'}`}>
                    {tag}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={() => setEditing(false)}
              className="w-full py-2.5 rounded-2xl border-2 border-border text-muted-foreground text-sm font-bold hover:bg-secondary transition-colors">
              Отмена
            </button>
          </div>
        ) : (
          <div className="mb-4">
            <div className="flex items-start gap-2">
              <h2 className="text-2xl font-black text-foreground">{user.name}, {user.age}</h2>
              {user.verified && (
                <div className="mt-1 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
                  <Icon name="Check" size={12} className="text-white" />
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground text-sm mt-1">
              <Icon name="MapPin" size={14} /><span>{user.city || 'Город не указан'}</span>
              {user.job && <><span>·</span><Icon name="Briefcase" size={14} /><span>{user.job}</span></>}
            </div>
            {user.bio && <p className="text-sm text-foreground/80 mt-2 leading-relaxed">{user.bio}</p>}
          </div>
        )}

        {/* Premium статус / CTA */}
        {user.is_premium ? (
          <PremiumStatusBadge expiresAt={user.premium_expires_at || null} onUpgrade={() => setShowPremium(true)} />
        ) : (
          <button onClick={() => setShowPremium(true)}
            className="w-full flex items-center gap-3 p-4 rounded-2xl mb-4 text-left active:scale-[0.98] transition-transform"
            style={{ background: 'linear-gradient(135deg, hsl(340 82% 58%) 0%, hsl(262 80% 64%) 100%)' }}>
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <Icon name="Star" size={20} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="font-black text-white text-sm">Попробуй Spark Premium</p>
              <p className="text-white/80 text-xs">Безлимитные лайки и многое другое</p>
            </div>
            <Icon name="ChevronRight" size={18} className="text-white/80" />
          </button>
        )}

        <div className="flex gap-2 mb-5">
          {(['profile', 'settings'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 rounded-2xl text-sm font-bold transition-all ${activeTab === tab ? 'btn-primary text-white' : 'bg-secondary text-muted-foreground'}`}>
              {tab === 'profile' ? 'Профиль' : 'Настройки'}
            </button>
          ))}
        </div>

        {activeTab === 'profile' && (
          <div className="space-y-4 animate-fade-in">
            {/* Фотографии */}
            <div className="rounded-2xl border border-border p-4">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                Фотографии ({(user.photos || []).length}/9)
              </p>
              <div className="grid grid-cols-3 gap-2">
                {(user.photos || []).map((photo, i) => (
                  <div key={`${photo}-${i}`} className="relative aspect-square group">
                    <img src={photo} alt=""
                      className="w-full h-full object-cover rounded-xl bg-secondary"
                      onError={e => {
                        const img = e.target as HTMLImageElement;
                        if (!img.src.includes('dicebear')) img.src = fallback;
                      }} />
                    <button onClick={() => handleRemovePhoto(photo)}
                      className="absolute top-1 right-1 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Icon name="X" size={11} className="text-white" />
                    </button>
                    {i === 0 && <span className="absolute bottom-1 left-1 text-[9px] font-black text-white bg-black/50 px-1.5 py-0.5 rounded-full">Главное</span>}
                  </div>
                ))}
                {(user.photos || []).length < 9 && (
                  <button onClick={() => fileRef.current?.click()}
                    className="aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 hover:border-primary hover:bg-primary/5 transition-colors">
                    <Icon name="Plus" size={22} className="text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground font-semibold">Добавить</span>
                  </button>
                )}
              </div>
            </div>

            {/* Интересы */}
            <div className="rounded-2xl border border-border p-4">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Интересы</p>
              <div className="flex flex-wrap gap-2">
                {(user.tags || []).length > 0 ? (user.tags || []).map(tag => (
                  <span key={tag} className="px-3 py-1.5 rounded-full gradient-brand-soft text-primary text-xs font-bold">{tag}</span>
                )) : (
                  <button onClick={() => setEditing(true)}
                    className="px-3 py-1.5 rounded-full border-2 border-dashed border-border text-muted-foreground text-xs font-bold hover:border-primary transition-colors">
                    + Добавить интересы
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-5 animate-fade-in">
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 px-1">Настройки поиска</p>
              <div className="rounded-2xl border border-border overflow-hidden">
                <div className="px-4 py-3.5 border-b border-border/50">
                  <p className="text-sm font-semibold text-foreground mb-2">Радиус: {form.search_radius} км</p>
                  <input type="range" min="1" max="150" value={form.search_radius}
                    onChange={e => setForm(f => ({ ...f, search_radius: Number(e.target.value) }))}
                    className="w-full accent-primary" />
                </div>
                <div className="px-4 py-3.5 border-b border-border/50">
                  <p className="text-sm font-semibold text-foreground mb-2">Возраст: {form.search_age_min}–{form.search_age_max} лет</p>
                  <div className="flex gap-3">
                    <input type="number" min="18" max="99" value={form.search_age_min}
                      onChange={e => setForm(f => ({ ...f, search_age_min: Number(e.target.value) }))}
                      className="flex-1 bg-secondary border border-border rounded-xl px-3 py-2 text-sm outline-none" placeholder="от" />
                    <input type="number" min="18" max="99" value={form.search_age_max}
                      onChange={e => setForm(f => ({ ...f, search_age_max: Number(e.target.value) }))}
                      className="flex-1 bg-secondary border border-border rounded-xl px-3 py-2 text-sm outline-none" placeholder="до" />
                  </div>
                </div>
                <div className="px-4 py-3.5">
                  <p className="text-sm font-semibold text-foreground mb-2">Показывать</p>
                  <div className="flex gap-2">
                    {[{ id: 'all', label: 'Всех' }, { id: 'female', label: 'Девушек' }, { id: 'male', label: 'Парней' }].map(g => (
                      <button key={g.id} onClick={() => setForm(f => ({ ...f, search_gender: g.id }))}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${form.search_gender === g.id ? 'btn-primary text-white' : 'bg-secondary text-muted-foreground'}`}>
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <button onClick={handleSave} disabled={saving} className="btn-primary w-full py-3 text-sm mt-3 text-white font-bold disabled:opacity-60 rounded-2xl">
                {saving ? 'Сохраняем...' : 'Сохранить'}
              </button>
            </div>

            {/* Верификация по селфи */}
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 px-1">Верификация</p>
              <SelfieVerification verified={!!user.verified} />
            </div>

            {/* Режим инкогнито */}
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 px-1">Приватность</p>
              <IncognitoToggle isPremium={!!user.is_premium} />
            </div>

            {/* Смена пароля */}
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 px-1">Безопасность</p>
              <ChangePasswordBlock />
            </div>

            <button onClick={onLogout}
              className="w-full py-3.5 rounded-2xl border-2 border-rose-200 text-rose-500 text-sm font-bold hover:bg-rose-50 transition-colors">
              Выйти из аккаунта
            </button>
          </div>
        )}
      </div>

      {showPremium && <PremiumModal onClose={() => setShowPremium(false)} onRefresh={onRefresh} />}
    </div>
  );
}