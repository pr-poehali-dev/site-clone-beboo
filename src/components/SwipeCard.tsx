import { useState, useRef, useCallback, forwardRef, useImperativeHandle, useEffect } from 'react';
import { Profile, api } from '@/api/client';
import Icon from '@/components/ui/icon';

export interface SwipeCardRef {
  swipeLeft: () => void;
  swipeRight: () => void;
  swipeUp: () => void;
}

interface SwipeCardProps {
  profile: Profile;
  onLike: () => void;
  onPass: () => void;
  onSuperLike: () => void;
  onFavorite?: (userId: string) => void;
  isTop: boolean;
  stackIndex: number;
}

const SWIPE_THRESHOLD = 85;
const ANIM_MS = 380;

const SwipeCard = forwardRef<SwipeCardRef, SwipeCardProps>(
  ({ profile, onLike, onPass, onSuperLike, onFavorite, isTop, stackIndex }, ref) => {
    const [photoIdx, setPhotoIdx] = useState(0);
    const [dragX, setDragX] = useState(0);
    const [dragging, setDragging] = useState(false);
    const [exiting, setExiting] = useState<'left' | 'right' | 'up' | null>(null);
    const [showInfo, setShowInfo] = useState(false);
    const [favorited, setFavorited] = useState(false);

    // Записываем просмотр когда карточка становится верхней
    useEffect(() => {
      if (isTop && profile.user_id) {
        api.likes.view(profile.user_id).catch(() => {});
      }
    }, [isTop, profile.user_id]);
    const startX = useRef(0);
    const isDrag = useRef(false);
    const fired = useRef(false);

    const doExit = useCallback((dir: 'left' | 'right' | 'up') => {
      if (fired.current) return;
      fired.current = true;
      setExiting(dir);
      setDragX(0);
      setTimeout(() => {
        if (dir === 'right') onLike();
        else if (dir === 'up') onSuperLike();
        else onPass();
      }, ANIM_MS);
    }, [onLike, onPass, onSuperLike]);

    useImperativeHandle(ref, () => ({
      swipeLeft: () => doExit('left'),
      swipeRight: () => doExit('right'),
      swipeUp: () => doExit('up'),
    }), [doExit]);

    const onPointerDown = (e: React.PointerEvent) => {
      if (!isTop || exiting) return;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      startX.current = e.clientX;
      isDrag.current = true;
      setDragging(true);
    };

    const onPointerMove = (e: React.PointerEvent) => {
      if (!isDrag.current) return;
      setDragX(e.clientX - startX.current);
    };

    const onPointerUp = () => {
      if (!isDrag.current) return;
      isDrag.current = false;
      setDragging(false);
      if (dragX > SWIPE_THRESHOLD) doExit('right');
      else if (dragX < -SWIPE_THRESHOLD) doExit('left');
      else setDragX(0);
    };

    const rotation = dragging ? dragX * 0.07 : 0;
    const likeOpacity = Math.max(0, Math.min(1, dragX / SWIPE_THRESHOLD));
    const passOpacity = Math.max(0, Math.min(1, -dragX / SWIPE_THRESHOLD));

    const scaleMap = [1, 0.95, 0.91];
    const yMap = [0, 14, 26];

    let cardStyle: React.CSSProperties;
    if (exiting === 'right') {
      cardStyle = { transform: 'translateX(130vw) rotate(25deg)', opacity: 0, transition: `all ${ANIM_MS}ms cubic-bezier(0.4,0,0.2,1)`, zIndex: 10 };
    } else if (exiting === 'left') {
      cardStyle = { transform: 'translateX(-130vw) rotate(-25deg)', opacity: 0, transition: `all ${ANIM_MS}ms cubic-bezier(0.4,0,0.2,1)`, zIndex: 10 };
    } else if (exiting === 'up') {
      cardStyle = { transform: 'translateY(-120vh) scale(0.85)', opacity: 0, transition: `all ${ANIM_MS}ms cubic-bezier(0.4,0,0.2,1)`, zIndex: 10 };
    } else if (isTop) {
      cardStyle = {
        transform: `translateX(${dragX}px) rotate(${rotation}deg)`,
        transition: dragging ? 'none' : 'transform 0.3s cubic-bezier(0.16,1,0.3,1)',
        zIndex: 10,
        cursor: dragging ? 'grabbing' : 'grab',
      };
    } else {
      cardStyle = {
        transform: `scale(${scaleMap[stackIndex] ?? 0.88}) translateY(${yMap[stackIndex] ?? 36}px)`,
        transition: 'transform 0.35s cubic-bezier(0.16,1,0.3,1)',
        zIndex: 10 - stackIndex,
        cursor: 'default',
      };
    }

    return (
      <div
        className="absolute inset-0 rounded-3xl overflow-hidden card-shadow select-none touch-none"
        style={cardStyle}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div className="relative w-full h-full bg-gray-200">
          <img
            src={profile.photos[photoIdx] || ''}
            alt={profile.name}
            className="w-full h-full object-cover pointer-events-none"
            draggable={false}
          />

          {profile.photos.length > 1 && (
            <div className="absolute top-3 left-3 right-3 flex gap-1.5 pointer-events-none">
              {profile.photos.map((_, i) => (
                <div key={i} className={`flex-1 h-1 rounded-full ${i === photoIdx ? 'bg-white' : 'bg-white/40'}`} />
              ))}
            </div>
          )}

          {profile.photos.length > 1 && (
            <>
              <button
                className="absolute left-0 top-10 bottom-36 w-1/3 z-10"
                onPointerDown={e => e.stopPropagation()}
                onClick={e => { e.stopPropagation(); setPhotoIdx(i => Math.max(0, i - 1)); }}
              />
              <button
                className="absolute right-0 top-10 bottom-36 w-1/3 z-10"
                onPointerDown={e => e.stopPropagation()}
                onClick={e => { e.stopPropagation(); setPhotoIdx(i => Math.min(profile.photos.length - 1, i + 1)); }}
              />
            </>
          )}

          {isTop && !exiting && likeOpacity > 0.05 && (
            <div className="absolute top-10 left-6 border-4 border-emerald-400 rounded-2xl px-4 py-2 rotate-[-12deg] pointer-events-none" style={{ opacity: likeOpacity }}>
              <span className="text-emerald-400 font-black text-2xl tracking-widest">ЛАЙК</span>
            </div>
          )}
          {isTop && !exiting && passOpacity > 0.05 && (
            <div className="absolute top-10 right-6 border-4 border-rose-400 rounded-2xl px-4 py-2 rotate-[12deg] pointer-events-none" style={{ opacity: passOpacity }}>
              <span className="text-rose-400 font-black text-2xl tracking-widest">МИМО</span>
            </div>
          )}

          <div className="gradient-card absolute inset-0 pointer-events-none" />

          <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
            <div className="flex items-end justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-2xl font-black">{profile.name}, {profile.age}</h2>
                  {profile.verified && (
                    <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                      <Icon name="Check" size={13} className="text-white" />
                    </div>
                  )}
                  {profile.online && <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full" />}
                </div>
                <div className="flex items-center gap-1.5 text-white/80 text-sm">
                  <Icon name="MapPin" size={13} />
                  <span>{profile.city}</span>
                </div>
                {profile.job && (
                  <div className="flex items-center gap-1.5 text-white/70 text-sm mt-0.5">
                    <Icon name="Briefcase" size={13} />
                    <span>{profile.job}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {onFavorite && (
                  <button
                    className={`w-9 h-9 rounded-full backdrop-blur-sm flex items-center justify-center z-10 transition-all ${favorited ? 'bg-amber-400' : 'bg-white/20 hover:bg-white/30'}`}
                    onPointerDown={e => e.stopPropagation()}
                    onClick={e => {
                      e.stopPropagation();
                      setFavorited(v => !v);
                      onFavorite(profile.user_id);
                    }}
                    title={favorited ? 'Убрать из избранного' : 'В избранное'}
                  >
                    <Icon name="Star" size={16} className={favorited ? 'text-white' : 'text-white'} />
                  </button>
                )}
                <button
                  className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center z-10"
                  onPointerDown={e => e.stopPropagation()}
                  onClick={e => { e.stopPropagation(); setShowInfo(v => !v); }}
                >
                  <Icon name={showInfo ? 'ChevronDown' : 'ChevronUp'} size={18} className="text-white" />
                </button>
              </div>
            </div>

            {showInfo && (
              <div className="mt-3 animate-slide-up">
                <p className="text-white/90 text-sm leading-relaxed mb-3">{profile.bio}</p>
                <div className="flex flex-wrap gap-2">
                  {(profile.tags || []).map(tag => (
                    <span key={tag} className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white text-xs font-semibold">{tag}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);

SwipeCard.displayName = 'SwipeCard';
export default SwipeCard;