import { currentUser } from '@/data/mockData';
import Icon from '@/components/ui/icon';

interface SidebarProps {
  active: string;
  onNav: (page: string) => void;
  unreadNotifications: number;
  unreadMessages: number;
}

const navItems = [
  { id: 'home', label: 'Главная', icon: 'Home' },
  { id: 'feed', label: 'Лента', icon: 'Rss' },
  { id: 'search', label: 'Поиск', icon: 'Search' },
  { id: 'messages', label: 'Сообщения', icon: 'MessageSquare' },
  { id: 'notifications', label: 'Уведомления', icon: 'Bell' },
  { id: 'profile', label: 'Профиль', icon: 'User' },
  { id: 'settings', label: 'Настройки', icon: 'Settings' },
];

export default function Sidebar({ active, onNav, unreadNotifications, unreadMessages }: SidebarProps) {
  return (
    <aside className="w-64 shrink-0 sticky top-0 h-screen flex flex-col py-6 px-4 border-r border-border">
      <div className="mb-8 px-4">
        <h1 className="font-cormorant text-2xl font-semibold text-foreground tracking-wide">
          Nucleus
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">социальная сеть</p>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => onNav(item.id)}
            className={`nav-item w-full ${active === item.id ? 'active' : ''}`}
          >
            <div className="relative">
              <Icon name={item.icon} fallback="Circle" size={19} />
              {item.id === 'notifications' && unreadNotifications > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-destructive rounded-full text-[10px] flex items-center justify-center text-white font-medium">
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </span>
              )}
              {item.id === 'messages' && unreadMessages > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-blue-500 rounded-full text-[10px] flex items-center justify-center text-white font-medium">
                  {unreadMessages > 9 ? '9+' : unreadMessages}
                </span>
              )}
            </div>
            <span className="text-sm font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      <div
        className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary cursor-pointer transition-all group"
        onClick={() => onNav('profile')}
      >
        <img
          src={currentUser.avatar}
          alt={currentUser.name}
          className="w-9 h-9 rounded-full object-cover bg-secondary"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{currentUser.name}</p>
          <p className="text-xs text-muted-foreground truncate">@{currentUser.username}</p>
        </div>
        <Icon name="MoreHorizontal" size={16} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </aside>
  );
}