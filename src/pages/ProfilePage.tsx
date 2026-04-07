import { useState, useRef } from 'react';
import { api, UserProfile } from '@/api/client';
import Icon from '@/components/ui/icon';

interface ProfilePageProps {
  user: UserProfile;
  onLogout: () => void;
  onRefresh: () => Promise<void>;
}

const TAGS_OPTIONS = ['Спорт', 'Путешествия', 'Кофе', 'Музыка', 'Кино', 'Искусство', 'Книги', 'Горы', 'Танцы', 'Кулинария', 'Йога', 'Фото', 'Игры', 'Природа'];

export default function ProfilePage({ user, onLogout, onRefresh }: ProfilePageProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'settings'>('profile');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
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
    try {
      await api.profiles.update(form);
      await onRefresh();
      setEditing(false);
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        await api.upload.photo(ev.target?.result as string);
        await onRefresh();
      } catch { /* ignore */ }
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
      <div className="h-36 w-full" style={{ background: 'linear-gradient(135deg, hsl(340 82% 58%), hsl(262 80% 64%))' }} />
      <div className="px-4 pb-6">
        <div className="flex items-end justify-between -mt-14 mb-4">
          <div className="relative">
            <img
              src={mainPhoto || fallback}
              alt={user.name}
              className="w-28 h-28 rounded-3xl object-cover border-4 border-white card-shadow bg-secondary"
              onError={e => { (e.target as HTMLImageElement).src = fallback; }}
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-1 right-1 w-7 h-7 rounded-full flex items-center justify-center shadow-md disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, hsl(340 82% 58%), hsl(262 80% 64%))' }}
            >
              {uploading
                ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <Icon name="Camera" size={13} className="text-white" />
              }
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
          </div>
          <button
            onClick={() => editing ? handleSave() : setEditing(true)}
            disabled={saving}
            className={`mb-1 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all disabled:opacity-60 ${editing ? 'btn-primary text-white' : 'border-2 border-border text-foreground hover:bg-secondary'}`}
          >
            {saving ? 'Сохраняем...' : editing ? 'Сохранить' : 'Изменить'}
          </button>
        </div>

        {editing ? (
          <div className="space-y-3 mb-4 animate-fade-in">
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Имя" className="w-full bg-secondary border border-border rounded-2xl px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors" />
            <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Город" className="w-full bg-secondary border border-border rounded-2xl px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors" />
            <input value={form.job} onChange={e => setForm(f => ({ ...f, job: e.target.value }))} placeholder="Работа" className="w-full bg-secondary border border-border rounded-2xl px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors" />
            <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} placeholder="Расскажи о себе..." rows={3} className="w-full bg-secondary border border-border rounded-2xl px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors resize-none" />
            <button onClick={() => setEditing(false)} className="w-full py-2.5 rounded-2xl border-2 border-border text-muted-foreground text-sm font-bold hover:bg-secondary transition-colors">Отмена</button>
          </div>
        ) : (
          <div className="mb-4">
            <h2 className="text-2xl font-black text-foreground">{user.name}, {user.age}</h2>
            <div className="flex items-center gap-1.5 text-muted-foreground text-sm mt-1">
              <Icon name="MapPin" size={14} /><span>{user.city || 'Город не указан'}</span>
              {user.job && <><span>·</span><Icon name="Briefcase" size={14} /><span>{user.job}</span></>}
            </div>
            {user.bio && <p className="text-sm text-foreground/80 mt-2 leading-relaxed">{user.bio}</p>}
          </div>
        )}

        <div className="flex gap-2 mb-5">
          {(['profile', 'settings'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-2.5 rounded-2xl text-sm font-bold transition-all ${activeTab === tab ? 'btn-primary text-white' : 'bg-secondary text-muted-foreground'}`}>
              {tab === 'profile' ? 'Профиль' : 'Настройки'}
            </button>
          ))}
        </div>

        {activeTab === 'profile' && (
          <div className="space-y-4 animate-fade-in">
            <div className="rounded-2xl border border-border p-4">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Фотографии</p>
              <div className="grid grid-cols-3 gap-2">
                {(user.photos || []).map((photo, i) => (
                  <div key={i} className="relative aspect-square group">
                    <img src={photo} alt="" className="w-full h-full object-cover rounded-xl" />
                    <button onClick={() => handleRemovePhoto(photo)} className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Icon name="X" size={10} className="text-white" />
                    </button>
                    {i === 0 && <span className="absolute bottom-1 left-1 text-[9px] font-black text-white bg-black/50 px-1.5 py-0.5 rounded-full">Главное</span>}
                  </div>
                ))}
                <button onClick={() => fileRef.current?.click()} className="aspect-square rounded-xl border-2 border-dashed border-border flex items-center justify-center hover:border-primary hover:bg-primary/5 transition-colors">
                  <Icon name="Plus" size={20} className="text-muted-foreground" />
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-border p-4">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Интересы</p>
              <div className="flex flex-wrap gap-2">
                {editing ? TAGS_OPTIONS.map(tag => (
                  <button key={tag} type="button" onClick={() => toggleTag(tag)} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${form.tags.includes(tag) ? 'btn-primary text-white' : 'bg-secondary text-muted-foreground border border-border'}`}>{tag}</button>
                )) : (user.tags || []).length > 0 ? (user.tags || []).map(tag => (
                  <span key={tag} className="px-3 py-1.5 rounded-full gradient-brand-soft text-primary text-xs font-bold">{tag}</span>
                )) : (
                  <button onClick={() => setEditing(true)} className="px-3 py-1.5 rounded-full border-2 border-dashed border-border text-muted-foreground text-xs font-bold hover:border-primary transition-colors">
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
                  <input type="range" min="1" max="150" value={form.search_radius} onChange={e => setForm(f => ({ ...f, search_radius: Number(e.target.value) }))} className="w-full accent-primary" />
                </div>
                <div className="px-4 py-3.5 border-b border-border/50">
                  <p className="text-sm font-semibold text-foreground mb-2">Возраст: {form.search_age_min}–{form.search_age_max} лет</p>
                  <div className="flex gap-3">
                    <input type="number" min="18" max="99" value={form.search_age_min} onChange={e => setForm(f => ({ ...f, search_age_min: Number(e.target.value) }))} className="flex-1 bg-secondary border border-border rounded-xl px-3 py-2 text-sm outline-none" placeholder="от" />
                    <input type="number" min="18" max="99" value={form.search_age_max} onChange={e => setForm(f => ({ ...f, search_age_max: Number(e.target.value) }))} className="flex-1 bg-secondary border border-border rounded-xl px-3 py-2 text-sm outline-none" placeholder="до" />
                  </div>
                </div>
                <div className="px-4 py-3.5">
                  <p className="text-sm font-semibold text-foreground mb-2">Показывать</p>
                  <div className="flex gap-2">
                    {[{ id: 'all', label: 'Всех' }, { id: 'female', label: 'Девушек' }, { id: 'male', label: 'Парней' }].map(g => (
                      <button key={g.id} onClick={() => setForm(f => ({ ...f, search_gender: g.id }))} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${form.search_gender === g.id ? 'btn-primary text-white' : 'bg-secondary text-muted-foreground'}`}>{g.label}</button>
                    ))}
                  </div>
                </div>
              </div>
              <button onClick={handleSave} disabled={saving} className="btn-primary w-full py-3 text-sm mt-3 disabled:opacity-60">
                {saving ? 'Сохраняем...' : 'Сохранить'}
              </button>
            </div>
            <button onClick={onLogout} className="w-full py-3.5 rounded-2xl border-2 border-rose-200 text-rose-500 text-sm font-bold hover:bg-rose-50 transition-colors">
              Выйти из аккаунта
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
