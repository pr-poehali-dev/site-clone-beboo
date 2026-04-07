import { useState, useRef } from 'react';
import { Profile } from '@/api/client';
import Icon from '@/components/ui/icon';

interface SwipeCardProps {
  profile: Profile;
  onLike: () => void;
  onPass: () => void;
  onSuperLike: () => void;
  isTop: boolean;
  stackIndex: number;
}

export default function SwipeCard({ profile, onLike, onPass, onSuperLike, isTop, stackIndex }: SwipeCardProps) {
  const [photoIdx, setPhotoIdx] = useState(0);
  const [swipeDir, setSwipeDir] = useState<'left' | 'right' | null>(null);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const startX = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isTop) return;
    startX.current = e.clientX;
    setDragging(true);
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    setDragX(e.clientX - startX.current);
  };
  const handleMouseUp = () => {
    if (!dragging) return;
    setDragging(false);
    if (dragX > 80) triggerSwipe('right');
    else if (dragX < -80) triggerSwipe('left');
    else setDragX(0);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isTop) return;
    startX.current = e.touches[0].clientX;
    setDragging(true);
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!dragging) return;
    setDragX(e.touches[0].clientX - startX.current);
  };
  const handleTouchEnd = () => {
    if (!dragging) return;
    setDragging(false);
    if (dragX > 80) triggerSwipe('right');
    else if (dragX < -80) triggerSwipe('left');
    else setDragX(0);
  };

  const triggerSwipe = (dir: 'left' | 'right') => {
    setSwipeDir(dir);
    setTimeout(() => {
      if (dir === 'right') onLike();
      else onPass();
    }, 400);
  };

  const rotation = dragging ? dragX * 0.08 : 0;
  const likeOpacity = Math.max(0, Math.min(1, dragX / 80));
  const passOpacity = Math.max(0, Math.min(1, -dragX / 80));

  const scaleMap = [1, 0.96, 0.92];
  const translateMap = [0, 12, 22];
  const scale = scaleMap[stackIndex] ?? 0.88;
  const translateY = translateMap[stackIndex] ?? 30;

  return (
    <div
      ref={cardRef}
      className={`absolute inset-0 rounded-3xl overflow-hidden card-shadow select-none ${
        swipeDir === 'left' ? 'animate-swipe-left' : swipeDir === 'right' ? 'animate-swipe-right' : ''
      }`}
      style={{
        transform: isTop
          ? `translateX(${dragX}px) rotate(${rotation}deg)`
          : `scale(${scale}) translateY(${translateY}px)`,
        transition: dragging ? 'none' : swipeDir ? 'none' : 'transform 0.3s cubic-bezier(0.16,1,0.3,1)',
        zIndex: 10 - stackIndex,
        cursor: isTop ? 'grab' : 'default',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="relative w-full h-full bg-gray-100">
        <img
          src={profile.photos[photoIdx]}
          alt={profile.name}
          className="w-full h-full object-cover pointer-events-none"
          draggable={false}
        />

        {profile.photos.length > 1 && (
          <div className="absolute top-3 left-3 right-3 flex gap-1.5">
            {profile.photos.map((_, i) => (
              <div
                key={i}
                className={`flex-1 h-1 rounded-full transition-all ${i === photoIdx ? 'bg-white' : 'bg-white/40'}`}
              />
            ))}
          </div>
        )}

        {profile.photos.length > 1 && (
          <>
            <button
              className="absolute left-0 top-10 bottom-32 w-1/3"
              onClick={(e) => { e.stopPropagation(); setPhotoIdx(Math.max(0, photoIdx - 1)); }}
            />
            <button
              className="absolute right-0 top-10 bottom-32 w-1/3"
              onClick={(e) => { e.stopPropagation(); setPhotoIdx(Math.min(profile.photos.length - 1, photoIdx + 1)); }}
            />
          </>
        )}

        {isTop && likeOpacity > 0.05 && (
          <div
            className="absolute top-10 left-6 border-4 border-emerald-400 rounded-2xl px-4 py-2 rotate-[-12deg]"
            style={{ opacity: likeOpacity }}
          >
            <span className="text-emerald-400 font-black text-2xl tracking-widest">ЛАЙК</span>
          </div>
        )}
        {isTop && passOpacity > 0.05 && (
          <div
            className="absolute top-10 right-6 border-4 border-rose-400 rounded-2xl px-4 py-2 rotate-[12deg]"
            style={{ opacity: passOpacity }}
          >
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
                {profile.online && (
                  <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full" />
                )}
              </div>
              <div className="flex items-center gap-1.5 text-white/80 text-sm">
                <Icon name="MapPin" size={13} />
                <span>{profile.distance} км · {profile.city}</span>
              </div>
              {profile.job && (
                <div className="flex items-center gap-1.5 text-white/70 text-sm mt-0.5">
                  <Icon name="Briefcase" size={13} />
                  <span>{profile.job}</span>
                </div>
              )}
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setShowInfo(!showInfo); }}
              className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
            >
              <Icon name={showInfo ? 'ChevronDown' : 'ChevronUp'} size={18} className="text-white" />
            </button>
          </div>

          {showInfo && (
            <div className="mt-3 animate-slide-up">
              <p className="text-white/90 text-sm leading-relaxed mb-3">{profile.bio}</p>
              <div className="flex flex-wrap gap-2">
                {profile.tags.map(tag => (
                  <span key={tag} className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white text-xs font-semibold">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}