import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import HomePage from '@/pages/HomePage';
import FeedPage from '@/pages/FeedPage';
import ProfilePage from '@/pages/ProfilePage';
import MessagesPage from '@/pages/MessagesPage';
import SearchPage from '@/pages/SearchPage';
import NotificationsPage from '@/pages/NotificationsPage';
import SettingsPage from '@/pages/SettingsPage';
import { notifications } from '@/data/mockData';
import { conversations } from '@/data/mockData';
import Icon from '@/components/ui/icon';

export default function Index() {
  const [activePage, setActivePage] = useState('home');

  const unreadNotifications = notifications.filter(n => !n.read).length;
  const unreadMessages = conversations.reduce((sum, c) => sum + c.unread, 0);

  const renderPage = () => {
    switch (activePage) {
      case 'home': return <HomePage />;
      case 'feed': return <FeedPage />;
      case 'profile': return <ProfilePage />;
      case 'messages': return <MessagesPage />;
      case 'search': return <SearchPage />;
      case 'notifications': return <NotificationsPage />;
      case 'settings': return <SettingsPage />;
      default: return <HomePage />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      <div className="hidden lg:flex">
        <Sidebar
          active={activePage}
          onNav={setActivePage}
          unreadNotifications={unreadNotifications}
          unreadMessages={unreadMessages}
        />
      </div>

      <main className="flex-1 overflow-y-auto px-4 lg:px-8 pb-20 lg:pb-0">
        {renderPage()}
      </main>

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 backdrop-blur-sm px-2 py-2 z-50">
        <div className="flex items-center justify-around">
          {[
            { id: 'home', icon: 'Home' },
            { id: 'search', icon: 'Search' },
            { id: 'feed', icon: 'Rss' },
            { id: 'messages', icon: 'MessageSquare', badge: unreadMessages },
            { id: 'notifications', icon: 'Bell', badge: unreadNotifications },
            { id: 'profile', icon: 'User' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={`relative flex flex-col items-center p-2 rounded-xl transition-all ${
                activePage === item.id ? 'text-gold' : 'text-muted-foreground'
              }`}
            >
              <Icon name={item.icon} fallback="Circle" size={22} />
              {item.badge && item.badge > 0 ? (
                <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-destructive rounded-full text-[9px] flex items-center justify-center text-white font-bold">
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
