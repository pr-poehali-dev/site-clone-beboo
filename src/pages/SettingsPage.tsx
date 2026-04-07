import { useState } from 'react';
import { currentUser } from '@/data/mockData';
import Icon from '@/components/ui/icon';

const sections = [
  {
    title: 'Аккаунт',
    items: [
      { icon: 'User', label: 'Редактировать профиль', desc: 'Имя, фото, биография' },
      { icon: 'Lock', label: 'Пароль и безопасность', desc: 'Смена пароля, 2FA' },
      { icon: 'Mail', label: 'Email адрес', desc: currentUser.username + '@nucleus.app' },
    ]
  },
  {
    title: 'Приватность',
    items: [
      { icon: 'Eye', label: 'Видимость профиля', desc: 'Открытый профиль' },
      { icon: 'UserX', label: 'Заблокированные', desc: '0 пользователей' },
      { icon: 'Shield', label: 'Конфиденциальность', desc: 'Управление данными' },
    ]
  },
  {
    title: 'Уведомления',
    items: [
      { icon: 'Bell', label: 'Push-уведомления', desc: 'Лайки, комментарии, подписки', toggle: true, on: true },
      { icon: 'MessageCircle', label: 'Сообщения', desc: 'Новые сообщения', toggle: true, on: true },
      { icon: 'Mail', label: 'Email-рассылка', desc: 'Дайджест и новости', toggle: true, on: false },
    ]
  },
  {
    title: 'Оформление',
    items: [
      { icon: 'Moon', label: 'Тёмная тема', desc: 'Включена', toggle: true, on: true },
      { icon: 'Globe', label: 'Язык', desc: 'Русский' },
      { icon: 'Type', label: 'Размер шрифта', desc: 'Стандартный' },
    ]
  },
];

export default function SettingsPage() {
  const [toggles, setToggles] = useState<Record<string, boolean>>({
    'Push-уведомления': true,
    'Сообщения': true,
    'Email-рассылка': false,
    'Тёмная тема': true,
  });

  return (
    <div className="max-w-xl mx-auto py-6 space-y-6">
      <div>
        <h2 className="font-cormorant text-3xl font-semibold text-foreground">Настройки</h2>
        <p className="text-sm text-muted-foreground mt-1">Управление аккаунтом и предпочтениями</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 flex items-center gap-4">
        <img
          src={currentUser.avatar}
          alt={currentUser.name}
          className="w-14 h-14 rounded-full object-cover bg-secondary"
        />
        <div className="flex-1">
          <p className="font-medium text-foreground">{currentUser.name}</p>
          <p className="text-sm text-muted-foreground">@{currentUser.username}</p>
        </div>
        <button className="px-4 py-2 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-secondary transition-all">
          Изменить
        </button>
      </div>

      {sections.map(section => (
        <div key={section.title}>
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-1">{section.title}</h3>
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            {section.items.map((item, i) => (
              <div
                key={item.label}
                className={`flex items-center gap-4 px-4 py-3.5 hover:bg-secondary/50 transition-all cursor-pointer ${
                  i < section.items.length - 1 ? 'border-b border-border/50' : ''
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                  <Icon name={item.icon} size={16} className="text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground truncate">{item.desc}</p>
                </div>
                {item.toggle ? (
                  <button
                    onClick={() => setToggles(t => ({ ...t, [item.label]: !t[item.label] }))}
                    className={`w-11 h-6 rounded-full transition-all ${
                      toggles[item.label] ? 'bg-gold' : 'bg-border'
                    }`}
                  >
                    <span className={`block w-4 h-4 bg-white rounded-full shadow transition-transform mx-1 ${
                      toggles[item.label] ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                ) : (
                  <Icon name="ChevronRight" size={16} className="text-muted-foreground" />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
        <button className="w-full flex items-center gap-3 text-destructive hover:text-destructive/80 transition-colors">
          <Icon name="LogOut" size={16} />
          <span className="text-sm font-medium">Выйти из аккаунта</span>
        </button>
      </div>
    </div>
  );
}
