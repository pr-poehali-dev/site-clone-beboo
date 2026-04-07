import { useState, useRef } from 'react';
import { Post, User } from '@/types';
import Icon from '@/components/ui/icon';

interface PostEditorProps {
  currentUser: User;
  editPost?: Post | null;
  onSubmit: (content: string, images: string[], video?: string) => void;
  onCancel?: () => void;
  compact?: boolean;
}

export default function PostEditor({ currentUser, editPost, onSubmit, onCancel, compact }: PostEditorProps) {
  const [content, setContent] = useState(editPost?.content || '');
  const [images, setImages] = useState<string[]>(editPost?.images || []);
  const [video, setVideo] = useState<string | undefined>(editPost?.video);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = e => {
        setImages(prev => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleVideoUpload = (files: FileList | null) => {
    if (!files || !files[0]) return;
    const file = files[0];
    if (!file.type.startsWith('video/')) return;
    const reader = new FileReader();
    reader.onload = e => {
      setVideo(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files[0]?.type.startsWith('video/')) {
      handleVideoUpload(files);
    } else {
      handleImageUpload(files);
    }
  };

  const handleSubmit = () => {
    if (!content.trim() && images.length === 0 && !video) return;
    onSubmit(content, images, video);
    if (!editPost) {
      setContent('');
      setImages([]);
      setVideo(undefined);
    }
  };

  const removeImage = (idx: number) => {
    setImages(prev => prev.filter((_, i) => i !== idx));
  };

  return (
    <div
      className={`rounded-2xl border bg-card transition-all ${dragOver ? 'border-gold/60 bg-gold/5' : 'border-border'}`}
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <div className="p-5">
        <div className="flex gap-3">
          <img
            src={currentUser.avatar}
            alt={currentUser.name}
            className="w-10 h-10 rounded-full object-cover bg-secondary shrink-0"
          />
          <div className="flex-1">
            {editPost && (
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gold">Редактирование поста</span>
                <button onClick={onCancel} className="text-muted-foreground hover:text-foreground transition-colors">
                  <Icon name="X" size={16} />
                </button>
              </div>
            )}
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Что происходит?"
              className="w-full bg-transparent text-foreground placeholder-muted-foreground resize-none outline-none text-sm leading-relaxed min-h-[80px]"
              rows={compact ? 2 : 3}
            />

            {images.length > 0 && (
              <div className={`grid gap-2 mt-3 ${images.length === 1 ? 'grid-cols-1' : images.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                {images.map((img, idx) => (
                  <div key={idx} className="relative group/img">
                    <img src={img} alt="" className="w-full h-32 object-cover rounded-lg" />
                    <button
                      onClick={() => removeImage(idx)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-all"
                    >
                      <Icon name="X" size={12} className="text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {video && (
              <div className="relative mt-3 group/vid">
                <video src={video} controls className="w-full max-h-48 rounded-lg" />
                <button
                  onClick={() => setVideo(undefined)}
                  className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center opacity-0 group-hover/vid:opacity-100 transition-all"
                >
                  <Icon name="X" size={12} className="text-white" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between px-5 py-3 border-t border-border/60">
        <div className="flex items-center gap-1">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-lg text-muted-foreground hover:text-gold hover:bg-gold/10 transition-all"
            title="Добавить изображение"
          >
            <Icon name="Image" size={18} />
          </button>
          <button
            onClick={() => videoInputRef.current?.click()}
            className="p-2 rounded-lg text-muted-foreground hover:text-gold hover:bg-gold/10 transition-all"
            title="Добавить видео"
          >
            <Icon name="Video" size={18} />
          </button>
          <button className="p-2 rounded-lg text-muted-foreground hover:text-gold hover:bg-gold/10 transition-all" title="Добавить emoji">
            <Icon name="Smile" size={18} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={e => handleImageUpload(e.target.files)}
          />
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={e => handleVideoUpload(e.target.files)}
          />
        </div>

        <div className="flex items-center gap-2">
          {content.length > 0 && (
            <span className={`text-xs ${content.length > 250 ? 'text-destructive' : 'text-muted-foreground'}`}>
              {content.length}/280
            </span>
          )}
          <button
            onClick={handleSubmit}
            disabled={!content.trim() && images.length === 0 && !video}
            className="px-5 py-2 rounded-xl text-sm font-medium bg-gold text-background hover:bg-gold/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95"
          >
            {editPost ? 'Сохранить' : 'Опубликовать'}
          </button>
        </div>
      </div>
    </div>
  );
}
