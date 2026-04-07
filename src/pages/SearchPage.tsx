import { useState } from 'react';
import { users, posts } from '@/data/mockData';
import Icon from '@/components/ui/icon';

const trendingTags = [
  { tag: '#дизайн', posts: '2.4k публикаций' },
  { tag: '#фотография', posts: '8.1k публикаций' },
  { tag: '#путешествия', posts: '15k публикаций' },
  { tag: '#разработка', posts: '3.7k публикаций' },
  { tag: '#искусство', posts: '6.2k публикаций' },
  { tag: '#музыка', posts: '11k публикаций' },
];

export default function SearchPage() {
  const [query, setQuery] = useState('');

  const filteredUsers = query
    ? users.filter(u =>
        u.name.toLowerCase().includes(query.toLowerCase()) ||
        u.username.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  const filteredPosts = query
    ? posts.filter(p => p.content.toLowerCase().includes(query.toLowerCase()))
    : [];

  return (
    <div className="max-w-xl mx-auto py-6 space-y-6">
      <div>
        <h2 className="font-cormorant text-3xl font-semibold text-foreground mb-4">Поиск</h2>
        <div className="relative">
          <Icon name="Search" size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Люди, публикации, хэштеги..."
            className="w-full bg-card border border-border rounded-xl pl-11 pr-4 py-3.5 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-gold/50 focus:bg-card/80 transition-all"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Icon name="X" size={16} />
            </button>
          )}
        </div>
      </div>

      {!query && (
        <>
          <div>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">В тренде</h3>
            <div className="space-y-1">
              {trendingTags.map((item, i) => (
                <button
                  key={item.tag}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl hover:bg-secondary transition-all text-left group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                    <div>
                      <p className="text-sm font-medium text-foreground group-hover:text-gold transition-colors">{item.tag}</p>
                      <p className="text-xs text-muted-foreground">{item.posts}</p>
                    </div>
                  </div>
                  <Icon name="TrendingUp" size={14} className="text-muted-foreground group-hover:text-gold transition-colors" />
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Рекомендуем</h3>
            <div className="space-y-2">
              {users.slice(0, 3).map(user => (
                <div key={user.id} className="flex items-center gap-3 p-3.5 rounded-xl hover:bg-secondary transition-all cursor-pointer group">
                  <img src={user.avatar} alt={user.name} className="w-11 h-11 rounded-full object-cover bg-secondary" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
                    <p className="text-xs text-muted-foreground">@{user.username} · {user.followers.toLocaleString()} подписчиков</p>
                  </div>
                  <button className="px-3 py-1.5 rounded-lg border border-gold/50 text-gold text-xs font-medium hover:bg-gold hover:text-background transition-all">
                    Читать
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {query && (
        <div className="space-y-5 animate-fade-in">
          {filteredUsers.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Люди</h3>
              <div className="space-y-2">
                {filteredUsers.map(user => (
                  <div key={user.id} className="flex items-center gap-3 p-3.5 rounded-xl hover:bg-secondary transition-all cursor-pointer">
                    <img src={user.avatar} alt={user.name} className="w-11 h-11 rounded-full object-cover bg-secondary" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{user.name}</p>
                      <p className="text-xs text-muted-foreground">@{user.username}</p>
                    </div>
                    <button className="px-3 py-1.5 rounded-lg border border-gold/50 text-gold text-xs font-medium hover:bg-gold hover:text-background transition-all">
                      Читать
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {filteredPosts.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Публикации</h3>
              <div className="space-y-3">
                {filteredPosts.map(post => (
                  <div key={post.id} className="rounded-xl border border-border bg-card p-4 hover:border-gold/30 transition-all cursor-pointer">
                    <div className="flex items-center gap-2 mb-2">
                      <img src={post.author.avatar} alt="" className="w-7 h-7 rounded-full object-cover bg-secondary" />
                      <span className="text-xs font-medium text-foreground">{post.author.name}</span>
                    </div>
                    <p className="text-sm text-foreground/80 line-clamp-2">{post.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {filteredUsers.length === 0 && filteredPosts.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <Icon name="SearchX" size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Ничего не найдено по запросу «{query}»</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
