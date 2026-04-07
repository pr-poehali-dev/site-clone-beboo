import { useState } from 'react';
import { notifications as initialNotifications } from '@/data/mockData';
import { Notification } from '@/types';
import Icon from '@/components/ui/icon';

function formatTime(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return 'только что';
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
  return `${Math.floor(diff / 86400)} д назад`;
}

const typeIcons: Record<Notification['type'], { icon: string; color: string; bg: string }> = {
  like: { icon: 'Heart', color: 'text-rose-400', bg: 'bg-rose-400/15' },
  comment: { icon: 'MessageCircle', color: 'text-blue-400', bg: 'bg-blue-400/15' },
  follow: { icon: 'UserPlus', color: 'text-green-400', bg: 'bg-green-400/15' },
  mention: { icon: 'AtSign', color: 'text-purple-400', bg: 'bg-purple-400/15' },
  share: { icon: 'Repeat2', color: 'text-gold', bg: 'bg-gold/15' },
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState(initialNotifications);

  const markAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="max-w-xl mx-auto py-6 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="font-cormorant text-3xl font-semibold text-foreground">Уведомления</h2>
          {unreadCount > 0 && (
            <p className="text-sm text-muted-foreground mt-1">{unreadCount} непрочитанных</p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="text-xs text-gold hover:text-gold/80 transition-colors"
          >
            Отметить все прочитанными
          </button>
        )}
      </div>

      <div className="space-y-1">
        {notifications.map((notif, i) => {
          const type = typeIcons[notif.type];
          return (
            <div
              key={notif.id}
              className={`flex items-start gap-4 p-4 rounded-xl transition-all cursor-pointer hover:bg-secondary/60 animate-fade-in ${
                !notif.read ? 'bg-gold/5 border border-gold/10' : ''
              }`}
              style={{ animationDelay: `${i * 0.04}s` }}
              onClick={() => setNotifications(notifications.map(n =>
                n.id === notif.id ? { ...n, read: true } : n
              ))}
            >
              <div className="relative shrink-0">
                <img
                  src={notif.user.avatar}
                  alt={notif.user.name}
                  className="w-11 h-11 rounded-full object-cover bg-secondary"
                />
                <div className={`absolute -bottom-1 -right-1 w-5 h-5 ${type.bg} rounded-full flex items-center justify-center`}>
                  <Icon name={type.icon} size={11} className={type.color} />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">
                  <span className="font-medium">{notif.user.name}</span>{' '}
                  <span className="text-foreground/80">{notif.text}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">{formatTime(notif.timestamp)}</p>
              </div>

              {!notif.read && (
                <span className="w-2 h-2 bg-gold rounded-full shrink-0 mt-2" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
