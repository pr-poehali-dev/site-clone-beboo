interface MatchModalProps {
  profileName: string;
  profilePhoto: string;
  onClose: () => void;
  onMessage: () => void;
}

const myPhoto = 'https://api.dicebear.com/7.x/avataaars/svg?seed=Me&backgroundColor=fde68a';

export default function MatchModal({ profileName, profilePhoto, onClose, onMessage }: MatchModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 text-center animate-bounce-in max-w-sm w-full">
        <div
          className="relative rounded-3xl overflow-hidden p-8"
          style={{ background: 'linear-gradient(135deg, hsl(340 82% 58%), hsl(262 80% 64%))' }}
        >
          <div className="absolute top-0 left-0 right-0 h-full opacity-10 pointer-events-none"
            style={{ backgroundImage: 'radial-gradient(circle at 50% -20%, white 0%, transparent 60%)' }}
          />
          <div className="mb-2"><span className="text-5xl">🎉</span></div>
          <h2 className="text-white font-black text-3xl mb-1">Это мэтч!</h2>
          <p className="text-white/80 text-sm mb-8">Вы понравились друг другу</p>

          <div className="flex items-center justify-center gap-4 mb-8">
            <img src={myPhoto} alt="Вы" className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-xl" />
            <div className="text-white text-3xl font-black">💫</div>
            <img
              src={profilePhoto || myPhoto}
              alt={profileName}
              className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-xl"
              onError={(e) => { (e.target as HTMLImageElement).src = myPhoto; }}
            />
          </div>

          <div className="space-y-3">
            <button
              onClick={onMessage}
              className="w-full py-3.5 rounded-2xl bg-white font-bold text-sm hover:bg-white/95 transition-all active:scale-95"
              style={{ color: 'hsl(340 82% 52%)' }}
            >
              Написать {profileName}
            </button>
            <button
              onClick={onClose}
              className="w-full py-3.5 rounded-2xl border-2 border-white/40 text-white font-semibold text-sm hover:bg-white/10 transition-all"
            >
              Продолжить смотреть
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
