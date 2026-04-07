import { profiles } from '@/data/profiles';
import Icon from '@/components/ui/icon';

const likedProfiles = profiles.slice(0, 4);

export default function LikesPage() {
  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-foreground">Вы понравились</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{likedProfiles.length} человека лайкнули вас</p>
        </div>
        <button className="btn-primary px-4 py-2 text-xs flex items-center gap-1.5">
          <Icon name="Zap" size={14} className="text-white" />
          Premium
        </button>
      </div>

      <div className="rounded-2xl border-2 border-dashed border-primary/30 bg-gradient-to-br from-pink/5 to-purple/5 p-4 text-center">
        <div className="text-3xl mb-2">💝</div>
        <p className="font-bold text-sm text-foreground">Разблокируйте лайки</p>
        <p className="text-xs text-muted-foreground mt-1">С Premium вы видите всех, кто вас лайкнул</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {likedProfiles.map((profile, i) => (
          <div key={profile.id} className="relative rounded-2xl overflow-hidden aspect-[3/4] animate-fade-in card-shadow" style={{ animationDelay: `${i * 0.08}s` }}>
            <img
              src={profile.photos[0]}
              alt=""
              className="w-full h-full object-cover"
              style={{ filter: i > 1 ? 'blur(12px)' : 'none' }}
            />
            <div className="gradient-card absolute inset-0" />
            {i > 1 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Icon name="Lock" size={20} className="text-white" />
                </div>
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <p className="text-white font-black text-sm">{profile.name}, {profile.age}</p>
              <p className="text-white/70 text-xs">{profile.distance} км</p>
            </div>
            {i <= 1 && (
              <div className="absolute top-3 right-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, hsl(340 82% 58%), hsl(262 80% 64%))' }}
                >
                  <Icon name="Heart" size={15} className="text-white" />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
