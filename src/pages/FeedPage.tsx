import { useState } from 'react';
import { posts, users } from '@/data/mockData';
import PostCard from '@/components/PostCard';

const tabs = ['Для вас', 'Подписки', 'Тренды'];

export default function FeedPage() {
  const [activeTab, setActiveTab] = useState('Для вас');

  const feedPosts = activeTab === 'Тренды'
    ? [...posts].sort((a, b) => b.likes - a.likes)
    : posts;

  return (
    <div className="max-w-xl mx-auto py-6 space-y-4">
      <div className="mb-2">
        <h2 className="font-cormorant text-3xl font-semibold text-foreground">Лента</h2>
      </div>

      <div className="flex gap-1 p-1 bg-secondary rounded-xl">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wider font-medium">Кого читают</p>
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
          {users.map(user => (
            <div key={user.id} className="flex flex-col items-center gap-2 shrink-0 cursor-pointer group">
              <div className="relative">
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-14 h-14 rounded-full object-cover bg-secondary ring-2 ring-border group-hover:ring-gold/50 transition-all"
                />
                {user.verified && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-gold rounded-full flex items-center justify-center">
                    <span className="text-[8px] text-background font-bold">✓</span>
                  </span>
                )}
              </div>
              <span className="text-xs text-muted-foreground w-14 text-center truncate group-hover:text-foreground transition-colors">
                {user.name.split(' ')[0]}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {feedPosts.map((post, i) => (
          <div key={post.id} className="animate-fade-in" style={{ animationDelay: `${i * 0.06}s` }}>
            <PostCard post={post} />
          </div>
        ))}
      </div>
    </div>
  );
}
