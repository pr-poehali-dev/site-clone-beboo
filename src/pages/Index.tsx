import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import AuthPage from './AuthPage';
import DiscoverPage from './DiscoverPage';
import MatchesPage from './MatchesPage';
import LikesPage from './LikesPage';
import ProfilePage from './ProfilePage';
import AdminPage from './AdminPage';
import FavoritesPage from './FavoritesPage';
import ViewersPage from './ViewersPage';
import WalletPage from './WalletPage';
import Icon from '@/components/ui/icon';
import { api } from '@/api/client';

type Tab = 'discover' | 'likes' | 'favorites' | 'viewers' | 'messages' | 'wallet' | 'profile';

const tabs: { id: Tab; icon: string; label: string }[] = [
  { id: 'discover', icon: 'Flame', label: 'Смотреть' },
  { id: 'likes', icon: 'Heart', label: 'Лайки' },
  { id: 'favorites', icon: 'Bookmark', label: 'Избранное' },
  { id: 'viewers', icon: 'Eye', label: 'Смотрели' },
  { id: 'messages', icon: 'MessageCircle', label: 'Чаты' },
  { id: 'wallet', icon: 'Wallet', label: 'Кошелёк' },
  { id: 'profile', icon: 'User', label: 'Профиль' },
];

export default function Index() {
  const auth = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('discover');
  const [unreadCount, setUnreadCount] = useState(0);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [openMatchId, setOpenMatchId] = useState<string | undefined>(undefined);

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
            {auth.userId && <DiscoverPage onGoToMessages={(matchId) => { setOpenMatchId(matchId); setActiveTab('messages'); }} userId={auth.userId} />}
          </div>
        </div>
        <div className={`absolute inset-0 ${activeTab !== 'likes' ? 'hidden' : ''}`}>
          <LikesPage onGoToMessages={() => setActiveTab('messages')} />
        </div>
        <div className={`absolute inset-0 ${activeTab !== 'favorites' ? 'hidden' : ''}`}>
          <FavoritesPage />
        </div>
        <div className={`absolute inset-0 ${activeTab !== 'viewers' ? 'hidden' : ''}`}>
          <ViewersPage
            isPremium={!!auth.user?.is_premium}
            onUpgrade={() => setShowPremiumModal(true)}
          />
        </div>
        <div className={`absolute inset-0 ${activeTab !== 'wallet' ? 'hidden' : ''}`}>
          <WalletPage />
        </div>
        <div className={`absolute inset-0 ${activeTab !== 'messages' ? 'hidden' : ''}`}>
          {auth.userId && <MatchesPage userId={auth.userId} openMatchId={openMatchId} onMatchOpened={() => setOpenMatchId(undefined)} />}
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
                className="flex flex-col items-center gap-0.5 py-1.5 px-2 rounded-2xl transition-all">
                <div className="relative">
                  <div className={`w-9 h-9 rounded-2xl flex items-center justify-center ${isActive ? 'gradient-brand' : ''}`}>
                    <Icon name={tab.icon} fallback="Circle" size={17} className={isActive ? 'text-white' : 'text-muted-foreground'} />
                  </div>
                  {badge > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-white text-[9px] font-black gradient-brand">
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </div>
                <span className={`text-[9px] font-bold ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Admin Panel Overlay */}
      {showAdmin && <AdminPage onClose={() => setShowAdmin(false)} />}

      {/* Ежедневная награда */}
      {auth.dailyReward && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={auth.clearDailyReward}>
          <div className="bg-white rounded-3xl p-8 w-full max-w-xs text-center animate-bounce-in"
            onClick={e => e.stopPropagation()}>
            <div className="text-6xl mb-4">🎁</div>
            <h2 className="text-2xl font-black text-foreground mb-2">Ежедневный бонус!</h2>
            <p className="text-muted-foreground text-sm mb-4">День {auth.dailyReward.day} из 7</p>
            <div className="rounded-2xl py-4 mb-5" style={{ background: 'linear-gradient(135deg, hsl(340 82% 58%), hsl(262 80% 64%))' }}>
              <p className="text-4xl font-black text-white">+{auth.dailyReward.coins}</p>
              <p className="text-white/80 text-sm">монет на кошелёк</p>
            </div>
            {/* Прогресс 7 дней */}
            <div className="flex justify-center gap-1.5 mb-5">
              {[1,2,3,4,5,6,7].map(d => (
                <div key={d}
                  className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black transition-all ${
                    d < auth.dailyReward!.day ? 'gradient-brand text-white opacity-60' :
                    d === auth.dailyReward!.day ? 'gradient-brand text-white scale-110 shadow-lg' :
                    'bg-secondary text-muted-foreground'
                  }`}>
                  {d === 7 ? '⭐' : d}
                </div>
              ))}
            </div>
            <button onClick={auth.clearDailyReward}
              className="w-full py-3.5 rounded-2xl btn-primary text-white font-bold">
              Забрать!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}