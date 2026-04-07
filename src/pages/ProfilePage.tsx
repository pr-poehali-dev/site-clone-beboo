import { useState } from 'react';
import { currentUser, posts as allPosts } from '@/data/mockData';
import { Post } from '@/types';
import PostCard from '@/components/PostCard';
import PostEditor from '@/components/PostEditor';
import Icon from '@/components/ui/icon';

function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

const profileTabs = ['Публикации', 'Медиа', 'Сохранённые'];

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState('Публикации');
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>(
    allPosts.filter(p => p.author.id === currentUser.id)
  );

  const handleEdit = (content: string, images: string[], video?: string) => {
    if (!editingPost) return;
    setUserPosts(userPosts.map(p =>
      p.id === editingPost.id
        ? { ...p, content, images: images.length > 0 ? images : undefined, video }
        : p
    ));
    setEditingPost(null);
  };

  const handleDelete = (postId: string) => {
    setUserPosts(userPosts.filter(p => p.id !== postId));
  };

  const mediaPosts = userPosts.filter(p => p.images || p.video);
  const savedPosts = allPosts.filter(p => p.bookmarked);

  const displayPosts = activeTab === 'Публикации' ? userPosts
    : activeTab === 'Медиа' ? mediaPosts
    : savedPosts;

  return (
    <div className="max-w-xl mx-auto py-6 space-y-6">
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="h-28 bg-gradient-to-br from-gold/20 via-secondary to-background relative">
          <div className="absolute inset-0 opacity-30"
            style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, hsl(43 74% 66% / 0.4) 0%, transparent 60%)' }}
          />
        </div>

        <div className="px-5 pb-5">
          <div className="flex items-end justify-between -mt-10 mb-4">
            <div className="relative">
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-20 h-20 rounded-full object-cover border-4 border-card bg-secondary"
              />
              {currentUser.verified && (
                <span className="absolute bottom-1 right-1 w-5 h-5 bg-gold rounded-full flex items-center justify-center">
                  <Icon name="Check" size={11} className="text-background" />
                </span>
              )}
            </div>
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-secondary transition-all">
              <Icon name="Pencil" size={14} />
              Редактировать
            </button>
          </div>

          <div className="space-y-2">
            <div>
              <h2 className="font-cormorant text-2xl font-semibold text-foreground">{currentUser.name}</h2>
              <p className="text-sm text-muted-foreground">@{currentUser.username}</p>
            </div>
            <p className="text-sm text-foreground/80">{currentUser.bio}</p>
          </div>

          <div className="flex gap-6 mt-4">
            {[
              { label: 'публикаций', value: userPosts.length },
              { label: 'подписчиков', value: currentUser.followers },
              { label: 'подписок', value: currentUser.following },
            ].map(stat => (
              <div key={stat.label} className="text-center">
                <p className="font-cormorant text-2xl font-semibold text-foreground">{formatNumber(stat.value)}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-1 p-1 bg-secondary rounded-xl">
        {profileTabs.map(tab => (
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

      {editingPost && (
        <PostEditor
          currentUser={currentUser}
          editPost={editingPost}
          onSubmit={handleEdit}
          onCancel={() => setEditingPost(null)}
        />
      )}

      {displayPosts.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Icon name="FileText" size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Публикаций пока нет</p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayPosts.map((post, i) => (
            <div key={post.id} className="animate-fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
              <PostCard
                post={post}
                onEdit={setEditingPost}
                onDelete={handleDelete}
                isOwn={post.author.id === currentUser.id}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
