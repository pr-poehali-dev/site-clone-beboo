import { useState, useEffect, useRef, useCallback } from 'react';
import { api, Story } from '@/api/client';
import Icon from '@/components/ui/icon';

/* ─────────────────── Helpers ─────────────────── */
function timeAgo(s: string) {
  const d = Math.floor((Date.now() - new Date(s).getTime()) / 1000);
  if (d < 60) return 'только что';
  if (d < 3600) return `${Math.floor(d / 60)} мин`;
  if (d < 86400) return `${Math.floor(d / 3600)} ч`;
  return `${Math.floor(d / 86400)} д`;
}

function fallbackAvatar(name: string) {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`;
}

/* ─────────────────── Types ─────────────────── */
interface StoryGroup {
  user_id: string;
  user_name: string;
  user_photo: string;
  is_mine: boolean;
  viewed: boolean;
  stories: Story[];
}

function groupStories(stories: Story[]): StoryGroup[] {
  const map = new Map<string, StoryGroup>();
  for (const s of stories) {
    const uid = s.user_id;
    if (!map.has(uid)) {
      map.set(uid, {
        user_id: uid,
        user_name: s.user_name || 'User',
        user_photo: s.user_photo || fallbackAvatar(s.user_name || 'User'),
        is_mine: !!s.is_mine,
        viewed: true,
        stories: [],
      });
    }
    const g = map.get(uid)!;
    g.stories.push(s);
    if (!s.viewed) g.viewed = false;
  }
  // My stories first, then unviewed, then viewed
  const arr = Array.from(map.values());
  arr.sort((a, b) => {
    if (a.is_mine !== b.is_mine) return a.is_mine ? -1 : 1;
    if (a.viewed !== b.viewed) return a.viewed ? 1 : -1;
    return new Date(b.stories[0].created_at).getTime() - new Date(a.stories[0].created_at).getTime();
  });
  return arr;
}

/* ═══════════════════════════════════════════════
   StoriesBar — horizontal strip for embedding
   ═══════════════════════════════════════════════ */
export function StoriesBar() {
  const [groups, setGroups] = useState<StoryGroup[]>([]);
  const [viewerOpen, setViewerOpen] = useState<{ groupIdx: number; storyIdx: number } | null>(null);
  const [creating, setCreating] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const r = await api.stories.feed();
      setGroups(groupStories(r.stories));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCreating(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const text = prompt('Добавить текст к истории (необязательно):') || '';
      try {
        await api.stories.create(ev.target?.result as string, text);
        await load();
      } catch (err) {
        console.error(err);
        alert('Не удалось создать историю');
      } finally {
        setCreating(false);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const openGroup = (groupIdx: number) => {
    setViewerOpen({ groupIdx, storyIdx: 0 });
  };

  if (groups.length === 0 && !creating) {
    return (
      <div className="flex gap-3 px-1 py-2 overflow-x-auto">
        <button onClick={() => fileRef.current?.click()} disabled={creating}
          className="flex flex-col items-center gap-1.5 shrink-0">
          <div className="w-14 h-14 rounded-full border-2 border-dashed border-border flex items-center justify-center hover:border-primary transition-colors">
            {creating
              ? <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              : <Icon name="Plus" size={20} className="text-muted-foreground" />
            }
          </div>
          <span className="text-[10px] font-semibold text-muted-foreground">Создать</span>
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleCreate} />
      </div>
    );
  }

  return (
    <>
      <div className="flex gap-3 px-1 py-2 overflow-x-auto">
        {/* Create button */}
        <button onClick={() => fileRef.current?.click()} disabled={creating}
          className="flex flex-col items-center gap-1.5 shrink-0">
          <div className="w-14 h-14 rounded-full border-2 border-dashed border-border flex items-center justify-center hover:border-primary transition-colors">
            {creating
              ? <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              : <Icon name="Plus" size={20} className="text-muted-foreground" />
            }
          </div>
          <span className="text-[10px] font-semibold text-muted-foreground">Создать</span>
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleCreate} />

        {/* Story avatars */}
        {groups.map((g, idx) => (
          <button key={g.user_id} onClick={() => openGroup(idx)}
            className="flex flex-col items-center gap-1.5 shrink-0">
            <div className="w-14 h-14 rounded-full p-0.5"
              style={{
                background: g.viewed
                  ? 'hsl(0 0% 80%)'
                  : 'linear-gradient(135deg, hsl(340 82% 58%), hsl(262 80% 64%))',
              }}>
              <img
                src={g.user_photo || fallbackAvatar(g.user_name)}
                alt={g.user_name}
                className="w-full h-full rounded-full object-cover bg-secondary border-2 border-white"
                onError={e => { (e.target as HTMLImageElement).src = fallbackAvatar(g.user_name); }}
              />
            </div>
            <span className="text-[10px] font-semibold text-foreground truncate max-w-[56px]">
              {g.is_mine ? 'Вы' : g.user_name}
            </span>
          </button>
        ))}
      </div>

      {/* Fullscreen story viewer */}
      {viewerOpen && (
        <StoryViewer
          groups={groups}
          initialGroup={viewerOpen.groupIdx}
          initialStory={viewerOpen.storyIdx}
          onClose={() => { setViewerOpen(null); load(); }}
        />
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════
   StoryViewer — fullscreen overlay
   ═══════════════════════════════════════════════ */
interface StoryViewerProps {
  groups: StoryGroup[];
  initialGroup: number;
  initialStory: number;
  onClose: () => void;
}

function StoryViewer({ groups, initialGroup, initialStory, onClose }: StoryViewerProps) {
  const [groupIdx, setGroupIdx] = useState(initialGroup);
  const [storyIdx, setStoryIdx] = useState(initialStory);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const markedRef = useRef<Set<string>>(new Set());

  const group = groups[groupIdx];
  const story = group?.stories[storyIdx];

  // Mark as viewed
  useEffect(() => {
    if (!story) return;
    if (!story.is_mine && !markedRef.current.has(story.id)) {
      markedRef.current.add(story.id);
      api.stories.view(story.id).catch(() => {});
    }
  }, [story]);

  // Auto-advance timer
  useEffect(() => {
    setProgress(0);
    if (timerRef.current) clearInterval(timerRef.current);
    const duration = 5000; // 5 seconds per story
    const step = 50;
    let elapsed = 0;
    timerRef.current = setInterval(() => {
      elapsed += step;
      setProgress(elapsed / duration);
      if (elapsed >= duration) {
        goNext();
      }
    }, step);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [groupIdx, storyIdx]);

  const goNext = () => {
    if (!group) { onClose(); return; }
    if (storyIdx < group.stories.length - 1) {
      setStoryIdx(s => s + 1);
    } else if (groupIdx < groups.length - 1) {
      setGroupIdx(g => g + 1);
      setStoryIdx(0);
    } else {
      onClose();
    }
  };

  const goPrev = () => {
    if (storyIdx > 0) {
      setStoryIdx(s => s - 1);
    } else if (groupIdx > 0) {
      setGroupIdx(g => g - 1);
      const prevGroup = groups[groupIdx - 1];
      setStoryIdx(prevGroup.stories.length - 1);
    }
  };

  const handleTap = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width / 3) {
      goPrev();
    } else {
      goNext();
    }
  };

  if (!group || !story) { onClose(); return null; }

  return (
    <div className="fixed inset-0 z-[60] bg-black flex items-center justify-center">
      <div className="w-full h-full max-w-md mx-auto relative" onClick={handleTap}>
        {/* Progress bars */}
        <div className="absolute top-0 left-0 right-0 z-10 flex gap-1 px-3 pt-3">
          {group.stories.map((_, i) => (
            <div key={i} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all"
                style={{
                  width: i < storyIdx ? '100%' : i === storyIdx ? `${progress * 100}%` : '0%',
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-5 left-0 right-0 z-10 flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <img
              src={group.user_photo || fallbackAvatar(group.user_name)}
              alt=""
              className="w-8 h-8 rounded-full object-cover border border-white/50"
              onError={e => { (e.target as HTMLImageElement).src = fallbackAvatar(group.user_name); }}
            />
            <div>
              <p className="text-white text-sm font-bold">{group.user_name}</p>
              <p className="text-white/60 text-[10px]">{timeAgo(story.created_at)}</p>
            </div>
          </div>
          <button onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center">
            <Icon name="X" size={18} className="text-white" />
          </button>
        </div>

        {/* Story image */}
        <img
          src={story.image_url}
          alt=""
          className="w-full h-full object-contain bg-black"
        />

        {/* Text overlay */}
        {story.text && (
          <div className="absolute bottom-16 left-0 right-0 px-6 z-10">
            <div className="bg-black/50 backdrop-blur-sm rounded-2xl px-4 py-3">
              <p className="text-white text-sm leading-relaxed">{story.text}</p>
            </div>
          </div>
        )}

        {/* View count (only for own stories) */}
        {story.is_mine && story.view_count !== undefined && (
          <div className="absolute bottom-4 left-0 right-0 flex justify-center z-10">
            <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-full">
              <Icon name="Eye" size={13} className="text-white/70" />
              <span className="text-white/70 text-xs font-semibold">{story.view_count}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   StoriesPage — full page (manage own stories)
   ═══════════════════════════════════════════════ */
export default function StoriesPage() {
  const [myStories, setMyStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const r = await api.stories.my();
      setMyStories(r.stories);
    } catch { setMyStories([]); }
    finally { setLoading(false); }
  };

  const handleCreate = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCreating(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const text = prompt('Добавить текст к истории (необязательно):') || '';
      try {
        await api.stories.create(ev.target?.result as string, text);
        await load();
      } catch (err) {
        console.error(err);
        alert('Не удалось создать историю');
      } finally {
        setCreating(false);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-foreground">Мои истории</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {myStories.length > 0 ? `${myStories.length} активных` : 'Нет активных историй'}
          </p>
        </div>
        <button onClick={() => fileRef.current?.click()} disabled={creating}
          className="px-4 py-2.5 rounded-2xl text-sm font-bold text-white disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, hsl(340 82% 58%), hsl(262 80% 64%))' }}>
          {creating ? 'Загрузка...' : '+ Создать'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleCreate} />
      </div>

      {myStories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-6xl mb-4">📸</div>
          <h3 className="text-lg font-black text-foreground mb-2">Нет историй</h3>
          <p className="text-muted-foreground text-sm">Поделитесь моментом из жизни! Истории исчезают через 24 часа.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {myStories.map(s => (
            <div key={s.id} className="relative rounded-2xl overflow-hidden card-shadow">
              <img src={s.image_url} alt=""
                className="w-full aspect-[3/4] object-cover bg-secondary" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-3">
                {s.text && (
                  <p className="text-white text-xs mb-1 line-clamp-2">{s.text}</p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-white/70 text-[10px]">{timeAgo(s.created_at)}</span>
                  <div className="flex items-center gap-1">
                    <Icon name="Eye" size={11} className="text-white/70" />
                    <span className="text-white/70 text-[10px] font-semibold">{s.view_count || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
