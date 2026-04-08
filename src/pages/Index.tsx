import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import AuthPage from './AuthPage';
import DiscoverPage from './DiscoverPage';
import MatchesPage from './MatchesPage';
import LikesPage from './LikesPage';
import ProfilePage from './ProfilePage';
import AdminPage from './AdminPage';
import Icon from '@/components/ui/icon';
import { api } from '@/api/client';

type Tab = 'discover' | 'likes' | 'messages' | 'profile';

const tabs: { id: Tab; icon: string; label: string }[] = [
  { id: 'discover', icon: 'Flame', label: 'Смотреть' },
  { id: 'likes', icon: 'Heart', label: 'Лайки' },
  { id: 'messages', icon: 'MessageCircle', label: 'Чаты' },
  { id: 'profile', icon: 'User', label: 'Профиль' },
];

export default function Index() {
  const auth = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('discover');
  const [unreadCount, setUnreadCount] = useState(0);
  const [showAdmin, setShowAdmin] = useState(false);

  useEffect(() => {
    if (!auth.isAuthed) return;
    const fetch = async () => {
      try { const r = await api.matches.list(); setUnreadCount(r.matches.reduce((s, m) => s + m.unread, 0)); }
      catch { /* ignore */ }
    };
    fetch();
    const t = setInterval(fetch, 30000);
    return () => clearInterval(t);
  }, [auth.isAuthed]);

  if (auth.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-3xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, hsl(340 82% 58%), hsl(262 80% 64%))' }}>
            <span className="text-3xl">⚡</span>
          </div>
          <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  if (!auth.isAuthed) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-background">
        <AuthPage onLogin={auth.login} onRegister={auth.register} />
      </div>
    );
  }

  const avatarSrc = auth.user?.photos?.[0]
    || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(auth.user?.name || 'user')}&backgroundColor=fde68a`;

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden max-w-md mx-auto relative">
      {/* Header */}
      <header className="flex items-center justify-between px-5 pt-4 pb-2 shrink-0">
        <div>
          <h1 className="text-2xl font-black text-gradient">Spark</h1>
          {activeTab === 'discover' && auth.user && (
            <p className="text-xs text-muted-foreground">{auth.user.city || 'Москва'} · {auth.user.search_radius || 25} км</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {auth.isAdmin && (
            <button onClick={() => setShowAdmin(true)} className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center hover:bg-rose-100 transition-colors" title="Панель управления">
              <Icon name="Shield" size={15} className="text-rose-500" />
            </button>
          )}
          {activeTab === 'discover' && (
            <button onClick={() => setActiveTab('profile')} className="w-9 h-9 rounded-full overflow-hidden border-2 border-border hover:border-primary transition-colors">
              <img src={avatarSrc} alt="" className="w-full h-full object-cover"
                onError={e => { (e.target as HTMLImageElement).src = avatarSrc; }} />
            </button>
          )}
        </div>
      </header>

      {/* Pages */}
      <main className="flex-1 relative overflow-hidden">
        <div className={`absolute inset-0 ${activeTab !== 'discover' ? 'hidden' : ''}`}>
          <div className="absolute inset-0 px-4 pb-2">
            {auth.userId && <DiscoverPage onGoToMessages={() => setActiveTab('messages')} userId={auth.userId} />}
          </div>
        </div>
        <div className={`absolute inset-0 ${activeTab !== 'likes' ? 'hidden' : ''}`}>
          <LikesPage onGoToMessages={() => setActiveTab('messages')} />
        </div>
        <div className={`absolute inset-0 ${activeTab !== 'messages' ? 'hidden' : ''}`}>
          {auth.userId && <MatchesPage userId={auth.userId} />}
        </div>
        <div className={`absolute inset-0 ${activeTab !== 'profile' ? 'hidden' : ''}`}>
          {auth.user && (
            <ProfilePage user={auth.user} onLogout={auth.logout} onRefresh={auth.refreshUser} />
          )}
        </div>
      </main>

      {/* Bottom Nav */}
      <nav className="shrink-0 border-t border-border bg-white px-2">
        <div className="flex items-center justify-around py-2">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            const badge = tab.id === 'messages' && unreadCount > 0 ? unreadCount : 0;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className="flex flex-col items-center gap-0.5 py-1.5 px-4 rounded-2xl transition-all">
                <div className="relative">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${isActive ? 'gradient-brand' : ''}`}>
                    <Icon name={tab.icon} fallback="Circle" size={20} className={isActive ? 'text-white' : 'text-muted-foreground'} />
                  </div>
                  {badge > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-white text-[9px] font-black gradient-brand">
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] font-bold ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Admin Panel Overlay */}
      {showAdmin && <AdminPage onClose={() => setShowAdmin(false)} />}
    </div>
  );
}