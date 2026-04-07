import { useState } from 'react';
import { Post } from '@/types';
import Icon from '@/components/ui/icon';

interface PostCardProps {
  post: Post;
  onEdit?: (post: Post) => void;
  onDelete?: (postId: string) => void;
  isOwn?: boolean;
}

function formatTime(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return 'только что';
  if (diff < 3600) return `${Math.floor(diff / 60)} мин`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч`;
  return `${Math.floor(diff / 86400)} д`;
}

function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export default function PostCard({ post, onEdit, onDelete, isOwn }: PostCardProps) {
  const [liked, setLiked] = useState(post.liked || false);
  const [likesCount, setLikesCount] = useState(post.likes);
  const [bookmarked, setBookmarked] = useState(post.bookmarked || false);
  const [showMenu, setShowMenu] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

  const handleLike = () => {
    setLiked(!liked);
    setLikesCount(liked ? likesCount - 1 : likesCount + 1);
  };

  return (
    <article className="post-card animate-fade-in group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              src={post.author.avatar}
              alt={post.author.name}
              className="w-11 h-11 rounded-full object-cover bg-secondary"
            />
            {post.author.verified && (
              <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-gold rounded-full flex items-center justify-center">
                <Icon name="Check" size={10} className="text-background" />
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-foreground text-sm">{post.author.name}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>@{post.author.username}</span>
              <span>·</span>
              <span>{formatTime(post.timestamp)}</span>
            </div>
          </div>
        </div>

        {isOwn && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="opacity-0 group-hover:opacity-100 w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
            >
              <Icon name="MoreHorizontal" size={16} />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-9 z-10 glass rounded-xl shadow-2xl py-1 min-w-[140px] animate-scale-in">
                <button
                  onClick={() => { onEdit?.(post); setShowMenu(false); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-secondary/60 transition-colors"
                >
                  <Icon name="Pencil" size={14} />
                  Редактировать
                </button>
                <button
                  onClick={() => { onDelete?.(post.id); setShowMenu(false); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Icon name="Trash2" size={14} />
                  Удалить
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <p className="text-foreground/90 leading-relaxed text-sm mb-4">{post.content}</p>

      {post.images && post.images.length > 0 && (
        <div className="mb-4 rounded-xl overflow-hidden">
          {post.images.length === 1 ? (
            <img
              src={post.images[0]}
              alt="Медиа"
              className="w-full max-h-96 object-cover"
            />
          ) : (
            <div className="space-y-1">
              <img
                src={post.images[activeImage]}
                alt="Медиа"
                className="w-full max-h-72 object-cover"
              />
              <div className="flex gap-1">
                {post.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    className={`flex-1 h-16 overflow-hidden rounded transition-all ${i === activeImage ? 'ring-2 ring-gold' : 'opacity-60 hover:opacity-80'}`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {post.video && (
        <div className="mb-4 rounded-xl overflow-hidden bg-black">
          <video src={post.video} controls className="w-full max-h-80" />
        </div>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-border/60">
        <div className="flex items-center gap-1">
          <button
            onClick={handleLike}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all hover:scale-105 ${
              liked ? 'text-rose-400 bg-rose-400/10' : 'text-muted-foreground hover:text-rose-400 hover:bg-rose-400/10'
            }`}
          >
            <Icon name={liked ? 'Heart' : 'Heart'} size={16} className={liked ? 'fill-rose-400' : ''} />
            <span>{formatNumber(likesCount)}</span>
          </button>

          <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-blue-400 hover:bg-blue-400/10 transition-all">
            <Icon name="MessageCircle" size={16} />
            <span>{formatNumber(post.comments)}</span>
          </button>

          <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-green-400 hover:bg-green-400/10 transition-all">
            <Icon name="Repeat2" size={16} />
            <span>{formatNumber(post.shares)}</span>
          </button>
        </div>

        <button
          onClick={() => setBookmarked(!bookmarked)}
          className={`p-1.5 rounded-lg text-sm transition-all hover:scale-105 ${
            bookmarked ? 'text-gold' : 'text-muted-foreground hover:text-gold'
          }`}
        >
          <Icon name="Bookmark" size={16} className={bookmarked ? 'fill-gold' : ''} />
        </button>
      </div>
    </article>
  );
}
