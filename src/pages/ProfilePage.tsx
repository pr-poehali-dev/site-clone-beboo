import { useState } from 'react';
import Icon from '@/components/ui/icon';

const myProfile = {
  name: 'Максим',
  age: 27,
  city: 'Москва',
  bio: 'Люблю горы, хорошую музыку и вкусный кофе. В поисках человека с которым не надо притворяться ☕',
  photos: [
    'https://cdn.poehali.dev/projects/9af0fc17-cee5-4084-8bef-c980d431deb0/files/879cfcb5-89e9-4b99-accc-9cedcc0b7039.jpg',
  ],
  tags: ['Музыка', 'Горы', 'Кофе', 'Кино', 'Спорт'],
  job: 'Продуктовый менеджер',
  education: 'МГТУ',
  height: 182,
};

const stats = [
  { label: 'Лайков', value: '124', icon: 'Heart' },
  { label: 'Мэтчей', value: '18', icon: 'Zap' },
  { label: 'Просмотров', value: '1.2k', icon: 'Eye' },
];

const settingsSections = [
  {
    title: 'Предпочтения',
    items: [
      { icon: 'MapPin', label: 'Радиус поиска', value: '25 км' },
      { icon: 'Users', label: 'Показывать', value: 'Всех' },
      { icon: 'Calendar', label: 'Возраст', value: '20–35 лет' },
    ]
  },
  {
    title: 'Аккаунт',
    items: [
      { icon: 'Bell', label: 'Уведомления', value: 'Включены' },
      { icon: 'Shield', label: 'Конфиденциальность', value: '' },
      { icon: 'HelpCircle', label: 'Поддержка', value: '' },
    ]
  },
];

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'settings'>('profile');

  return (
    <div className="h-full overflow-y-auto">
      <div className="relative">
        <div className="h-36 w-full"
          style={{ background: 'linear-gradient(135deg, hsl(340 82% 58%), hsl(262 80% 64%))' }}
        />
        <div className="absolute top-0 right-0 p-4">
          <button className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Icon name="Settings" size={18} className="text-white" />
          </button>
        </div>

        <div className="px-4 pb-6">
          <div className="flex items-end justify-between -mt-14 mb-4">
            <div className="relative">
              <img
                src={myProfile.photos[0]}
                alt={myProfile.name}
                className="w-28 h-28 rounded-3xl object-cover border-4 border-white card-shadow"
              />
              <button
                className="absolute bottom-1 right-1 w-7 h-7 rounded-full flex items-center justify-center shadow-md"
                style={{ background: 'linear-gradient(135deg, hsl(340 82% 58%), hsl(262 80% 64%))' }}
              >
                <Icon name="Camera" size={13} className="text-white" />
              </button>
            </div>
            <button className="mb-1 px-5 py-2.5 rounded-2xl border-2 border-primary text-primary text-sm font-bold hover:bg-primary/5 transition-colors">
              Изменить
            </button>
          </div>

          <div className="mb-4">
            <h2 className="text-2xl font-black text-foreground">{myProfile.name}, {myProfile.age}</h2>
            <div className="flex items-center gap-1.5 text-muted-foreground text-sm mt-1">
              <Icon name="MapPin" size={14} />
              <span>{myProfile.city}</span>
              <span>·</span>
              <Icon name="Briefcase" size={14} />
              <span>{myProfile.job}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-5">
            {stats.map(stat => (
              <div key={stat.label} className="rounded-2xl bg-secondary p-3 text-center">
                <Icon name={stat.icon} size={20} className="text-primary mx-auto mb-1" />
                <p className="font-black text-lg text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-2 mb-5">
            {(['profile', 'settings'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 rounded-2xl text-sm font-bold transition-all ${
                  activeTab === tab ? 'btn-primary text-white' : 'bg-secondary text-muted-foreground'
                }`}
              >
                {tab === 'profile' ? 'Профиль' : 'Настройки'}
              </button>
            ))}
          </div>

          {activeTab === 'profile' ? (
            <div className="space-y-4 animate-fade-in">
              <div className="rounded-2xl border border-border p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">О себе</p>
                  <button><Icon name="Pencil" size={14} className="text-muted-foreground" /></button>
                </div>
                <p className="text-sm text-foreground leading-relaxed">{myProfile.bio}</p>
              </div>

              <div className="rounded-2xl border border-border p-4">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Интересы</p>
                <div className="flex flex-wrap gap-2">
                  {myProfile.tags.map(tag => (
                    <span key={tag} className="px-3 py-1.5 rounded-full gradient-brand-soft text-primary text-xs font-bold">
                      {tag}
                    </span>
                  ))}
                  <button className="px-3 py-1.5 rounded-full border-2 border-dashed border-border text-muted-foreground text-xs font-bold hover:border-primary hover:text-primary transition-colors">
                    + Добавить
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-border p-4 space-y-3">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Детали</p>
                {[
                  { icon: 'Ruler', label: 'Рост', value: `${myProfile.height} см` },
                  { icon: 'GraduationCap', label: 'Образование', value: myProfile.education },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
                      <Icon name={item.icon} size={16} className="text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="text-sm font-semibold text-foreground">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-5 animate-fade-in">
              {settingsSections.map(section => (
                <div key={section.title}>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 px-1">{section.title}</p>
                  <div className="rounded-2xl border border-border overflow-hidden">
                    {section.items.map((item, i) => (
                      <div
                        key={item.label}
                        className={`flex items-center gap-3 px-4 py-3.5 hover:bg-secondary/60 transition-colors cursor-pointer ${
                          i < section.items.length - 1 ? 'border-b border-border/50' : ''
                        }`}
                      >
                        <div className="w-9 h-9 rounded-xl gradient-brand-soft flex items-center justify-center">
                          <Icon name={item.icon} size={16} className="text-primary" />
                        </div>
                        <span className="flex-1 text-sm font-semibold text-foreground">{item.label}</span>
                        <div className="flex items-center gap-1.5">
                          {item.value && <span className="text-sm text-muted-foreground">{item.value}</span>}
                          <Icon name="ChevronRight" size={16} className="text-muted-foreground" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <button className="w-full py-3.5 rounded-2xl border-2 border-rose-200 text-rose-500 text-sm font-bold hover:bg-rose-50 transition-colors">
                Выйти из аккаунта
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
