import { useState } from 'react';
import DiscoverPage from './DiscoverPage';
import MatchesPage from './MatchesPage';
import LikesPage from './LikesPage';
import ProfilePage from './ProfilePage';
import Icon from '@/components/ui/icon';
import { matches } from '@/data/profiles';

type Tab = 'discover' | 'likes' | 'messages' | 'profile';

const tabs: { id: Tab; icon: string; label: string }[] = [
  { id: 'discover', icon: 'Flame', label: 'Смотреть' },
  { id: 'likes', icon: 'Heart', label: 'Лайки' },
  { id: 'messages', icon: 'MessageCircle', label: 'Чаты' },
  { id: 'profile', icon: 'User', label: 'Профиль' },
];

export default function Index() {
  const [activeTab, setActiveTab] = useState<Tab>('discover');
  const unreadMessages = matches.reduce((sum, m) => sum + (m.unread || 0), 0);

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden max-w-md mx-auto">
      <header className="flex items-center justify-between px-5 pt-4 pb-2 shrink-0">
        <div>
          <h1 className="text-2xl font-black text-gradient">Spark</h1>
          {activeTab === 'discover' && (
            <p className="text-xs text-muted-foreground">Москва · 25 км</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'discover' && (
            <>
              <button className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center hover:bg-border transition-colors">
                <Icon name="SlidersHorizontal" size={17} className="text-foreground" />
              </button>
              <button className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center hover:bg-border transition-colors">
                <Icon name="Bell" size={17} className="text-foreground" />
              </button>
            </>
          )}
        </div>
      </header>

      <main className="flex-1 relative overflow-hidden">
        {activeTab === 'discover' && (
          <div className="absolute inset-0 px-4 pb-2">
            <DiscoverPage onGoToMessages={() => setActiveTab('messages')} />
          </div>
        )}
        {activeTab === 'likes' && (
          <div className="absolute inset-0">
            <LikesPage />
          </div>
        )}
        {activeTab === 'messages' && (
          <div className="absolute inset-0">
            <MatchesPage />
          </div>
        )}
        {activeTab === 'profile' && (
          <div className="absolute inset-0">
            <ProfilePage />
          </div>
        )}
      </main>

      <nav className="shrink-0 border-t border-border bg-white px-2">
        <div className="flex items-center justify-around py-2">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            const badge = tab.id === 'messages' && unreadMessages > 0 ? unreadMessages : 0;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex flex-col items-center gap-0.5 py-1.5 px-4 rounded-2xl transition-all"
              >
                <div className="relative">
                  {isActive ? (
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center gradient-brand">
                      <Icon name={tab.icon} size={20} className="text-white" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center">
                      <Icon name={tab.icon} size={20} className="text-muted-foreground" />
                    </div>
                  )}
                  {badge > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-white text-[9px] font-black gradient-brand">
                      {badge}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] font-bold ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
