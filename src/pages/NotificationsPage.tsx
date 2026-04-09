import { useState, useEffect } from 'react';
import { api, AppNotification } from '@/api/client';
import Icon from '@/components/ui/icon';

function timeAgo(s: string) {
  const d = Math.floor((Date.now() - new Date(s).getTime()) / 1000);
  if (d < 60) return 'только что';
  if (d < 3600) return `${Math.floor(d / 60)} мин назад`;
  if (d < 86400) return `${Math.floor(d / 3600)} ч назад`;
  return `${Math.floor(d / 86400)} д назад`;
}

function notifIcon(type: string): { icon: string; bg: string; color: string } {
  switch (type) {
    case 'match':
      return { icon: 'Heart', bg: 'bg-pink-50', color: 'text-pink-500' };
    case 'message':
      return { icon: 'MessageCircle', bg: 'bg-blue-50', color: 'text-blue-500' };
    case 'like':
      return { icon: 'ThumbsUp', bg: 'bg-rose-50', color: 'text-rose-500' };
    case 'gift':
      return { icon: 'Gift', bg: 'bg-amber-50', color: 'text-amber-500' };
    case 'premium':
      return { icon: 'Star', bg: 'bg-purple-50', color: 'text-purple-500' };
    default:
      return { icon: 'Bell', bg: 'bg-gray-50', color: 'text-gray-500' };
  }
}

interface NotificationsPageProps {
  onClose: () => void;
}

export default function NotificationsPage({ onClose }: NotificationsPageProps) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
    // Mark all as read on open
    api.notifications.markRead().catch(() => {});
  }, []);

  const load = async () => {
    try {
      const r = await api.notifications.list();
      setNotifications(r.notifications);
    } catch { setNotifications([]); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[50] bg-black/50 flex items-end justify-center">
      <div className="bg-white w-full max-w-md rounded-t-3xl max-h-[85vh] flex flex-col animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h2 className="text-lg font-black text-foreground">Уведомления</h2>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center transition-colors">
            <Icon name="X" size={18} className="text-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-8">
              <div className="text-6xl mb-4">🔔</div>
              <h3 className="text-lg font-black text-foreground mb-2">Нет уведомлений</h3>
              <p className="text-muted-foreground text-sm">Здесь появятся уведомления о мэтчах, сообщениях и лайках</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {notifications.map(n => {
                const style = notifIcon(n.type);
                return (
                  <div key={n.id}
                    className={`flex items-start gap-3 px-5 py-4 transition-colors ${!n.read ? 'bg-primary/5' : ''}`}>
                    <div className={`w-10 h-10 rounded-2xl ${style.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                      <Icon name={style.icon} size={18} className={style.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-foreground">{n.title}</p>
                        {!n.read && (
                          <span className="w-2 h-2 rounded-full shrink-0"
                            style={{ background: 'linear-gradient(135deg, hsl(340 82% 58%), hsl(262 80% 64%))' }} />
                        )}
                      </div>
                      {n.body && (
                        <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                      )}
                      <p className="text-[11px] text-muted-foreground mt-1">{timeAgo(n.created_at)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
