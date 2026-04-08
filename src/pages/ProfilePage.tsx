import { useState, useRef } from 'react';
import { api, UserProfile } from '@/api/client';
import Icon from '@/components/ui/icon';

interface ProfilePageProps {
  user: UserProfile;
  onLogout: () => void;
  onRefresh: () => Promise<void>;
}

const TAGS_OPTIONS = ['Спорт', 'Путешествия', 'Кофе', 'Музыка', 'Кино', 'Искусство', 'Книги', 'Горы', 'Танцы', 'Кулинария', 'Йога', 'Фото', 'Игры', 'Природа'];

function PremiumModal({ onClose, onRefresh }: { onClose: () => void; onRefresh: () => Promise<void> }) {
  const plans = [
    { id: '1m', label: '1 месяц', price: '299 ₽', per: '299 ₽/мес', popular: false },
    { id: '3m', label: '3 месяца', price: '699 ₽', per: '233 ₽/мес', popular: true },
    { id: '12m', label: '12 месяцев', price: '1 999 ₽', per: '167 ₽/мес', popular: false },
  ];
  const [selected, setSelected] = useState('3m');
  const [activating, setActivating] = useState(false);

  const activateTrial = async () => {
    setActivating(true);
    try {
      const r = await api.likes.trial();
      await onRefresh();
      alert(`Premium активирован на ${r.days} дня! Наслаждайтесь.`);
      onClose();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Не удалось активировать триал');
    } finally { setActivating(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl p-6 w-full max-w-sm animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="text-center mb-5">
          <div className="w-16 h-16 rounded-3xl mx-auto mb-3 flex items-center justify-center text-3xl"
            style={{ background: 'linear-gradient(135deg, hsl(340 82% 58%), hsl(262 80% 64%))' }}>⭐</div>
          <h2 className="text-xl font-black text-foreground">Spark Premium</h2>
          <p className="text-sm text-muted-foreground mt-1">Больше лайков, видимости и возможностей</p>
        </div>

        <div className="space-y-2 mb-5">
          {[
            { icon: 'Heart', text: 'Безлимитные лайки каждый день' },
            { icon: 'Eye', text: 'Видишь кто лайкнул тебя' },
            { icon: 'Star', text: '5 суперлайков в день' },
            { icon: 'Zap', text: '5 бустов профиля в месяц' },
            { icon: 'Bookmark', text: 'Избранные анкеты' },
          ].map(f => (
            <div key={f.icon} className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, hsl(340 82% 58%), hsl(262 80% 64%))' }}>
                <Icon name={f.icon} size={14} className="text-white" />
              </div>
              <p className="text-sm text-foreground font-semibold">{f.text}</p>
            </div>
          ))}
        </div>

        <div className="space-y-2 mb-5">
          {plans.map(p => (
            <button key={p.id} onClick={() => setSelected(p.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border-2 transition-all ${selected === p.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}>
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-foreground">{p.label}</span>
                  {p.popular && <span className="text-[10px] font-black px-2 py-0.5 rounded-full text-white" style={{ background: 'linear-gradient(135deg, hsl(340 82% 58%), hsl(262 80% 64%))' }}>ВЫГОДНО</span>}
                </div>
                <span className="text-xs text-muted-foreground">{p.per}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-black text-foreground">{p.price}</span>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selected === p.id ? 'border-primary' : 'border-border'}`}>
                  {selected === p.id && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                </div>
              </div>
            </button>
          ))}
        </div>

        <button className="w-full py-3.5 rounded-2xl text-white font-black text-sm mb-3 disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, hsl(340 82% 58%), hsl(262 80% 64%))' }}
          disabled={activating}
          onClick={activateTrial}>
          {activating ? 'Активация...' : 'Попробовать бесплатно 3 дня'}
        </button>
        <button onClick={onClose} className="w-full py-3 text-sm text-muted-foreground font-semibold">
          Не сейчас
        </button>
      </div>
    </div>
  );
}

export default function ProfilePage({ user, onLogout, onRefresh }: ProfilePageProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'settings'>('profile');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showPremium, setShowPremium] = useState(false);
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
    setSaving(true);
    try { await api.profiles.update(form); await onRefresh(); setEditing(false); }
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
            <input value={form.job} onChange={e => setForm(f => ({ ...f, job: e.target.value }))}
              placeholder="Работа" className="w-full bg-secondary border border-border rounded-2xl px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors" />
            <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
              placeholder="Расскажи о себе..." rows={3}
              className="w-full bg-secondary border border-border rounded-2xl px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors resize-none" />
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

        {/* Premium CTA — только если не Premium */}
        {!user.is_premium && (
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