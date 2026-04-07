import { useState } from 'react';
import { posts as initialPosts, currentUser } from '@/data/mockData';
import { Post } from '@/types';
import PostCard from '@/components/PostCard';
import PostEditor from '@/components/PostEditor';

export default function HomePage() {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [editingPost, setEditingPost] = useState<Post | null>(null);

  const handleCreate = (content: string, images: string[], video?: string) => {
    const newPost: Post = {
      id: Date.now().toString(),
      author: currentUser,
      content,
      images: images.length > 0 ? images : undefined,
      video,
      likes: 0,
      comments: 0,
      shares: 0,
      timestamp: new Date(),
    };
    setPosts([newPost, ...posts]);
  };

  const handleEdit = (content: string, images: string[], video?: string) => {
    if (!editingPost) return;
    setPosts(posts.map(p =>
      p.id === editingPost.id
        ? { ...p, content, images: images.length > 0 ? images : undefined, video }
        : p
    ));
    setEditingPost(null);
  };

  const handleDelete = (postId: string) => {
    setPosts(posts.filter(p => p.id !== postId));
  };

  return (
    <div className="max-w-xl mx-auto py-6 space-y-4">
      <div className="mb-2">
        <h2 className="font-cormorant text-3xl font-semibold text-foreground">Главная</h2>
        <p className="text-sm text-muted-foreground mt-1">Ваша персональная лента</p>
      </div>

      {!editingPost && (
        <PostEditor currentUser={currentUser} onSubmit={handleCreate} />
      )}

      {editingPost && (
        <PostEditor
          currentUser={currentUser}
          editPost={editingPost}
          onSubmit={handleEdit}
          onCancel={() => setEditingPost(null)}
        />
      )}

      <div className="space-y-4">
        {posts.map((post, i) => (
          <div key={post.id} style={{ animationDelay: `${i * 0.05}s` }}>
            <PostCard
              post={post}
              onEdit={setEditingPost}
              onDelete={handleDelete}
              isOwn={post.author.id === currentUser.id}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
