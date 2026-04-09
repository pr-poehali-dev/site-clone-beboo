import { useRef } from 'react';
import { Match, Message } from '@/api/client';
import Icon from '@/components/ui/icon';
import { ProfileDrawer, ReportModal, GiftModal } from './MatchesChatModals';

export function timeAgo(s: string) {
  const d = Math.floor((Date.now() - new Date(s).getTime()) / 1000);
  if (d < 60) return 'только что';
  if (d < 3600) return `${Math.floor(d / 60)} мин`;
  if (d < 86400) return `${Math.floor(d / 3600)} ч`;
  return `${Math.floor(d / 86400)} д`;
}

export function avatarUrl(m: Match) {
  return m.photo || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(m.name)}`;
}

interface ChatViewProps {
  selected: Match;
  userId: string;
  messages: Message[];
  msgLoading: boolean;
  text: string;
  sending: boolean;
  sendError: string;
  imagePreview: string | null;
  showProfile: boolean;
  showReport: boolean;
  showGifts: boolean;
  favoritedUsers: Set<string>;
  isTyping?: boolean;
  bottomRef: React.RefObject<HTMLDivElement>;
  onBack: () => void;
  onSetText: (val: string) => void;
  onHandleTyping: (val: string) => void;
  onSend: () => void;
  onSendImage: (dataUrl: string) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSetImagePreview: (val: string | null) => void;
  onToggleFavorite: (userId: string) => void;
  onSetShowProfile: (val: boolean) => void;
  onSetShowGifts: (val: boolean) => void;
  onSetShowReport: (val: boolean) => void;
  onUnmatch?: () => void;
  onBlock?: () => void;
}

export default function MatchesChatView({
  selected, userId, messages, msgLoading, text, sending, sendError,
  imagePreview, showProfile, showReport, showGifts, favoritedUsers,
  isTyping, bottomRef, onBack, onSetText, onHandleTyping, onSend, onSendImage,
  onFileChange, onSetImagePreview, onToggleFavorite,
  onSetShowProfile, onSetShowGifts, onSetShowReport,
  onUnmatch, onBlock,
}: ChatViewProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const avatar = avatarUrl(selected);
  const fallbackSrc = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(selected.name)}`;

  return (
    <div className="flex flex-col h-full bg-background relative">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-white shrink-0 shadow-sm">
        <button onClick={onBack}
          className="w-9 h-9 rounded-full hover:bg-secondary flex items-center justify-center transition-colors shrink-0">
          <Icon name="ChevronLeft" size={22} className="text-foreground" />
        </button>
        <button className="flex items-center gap-2 flex-1 min-w-0 text-left" onClick={() => onSetShowProfile(true)}>
          <div className="relative shrink-0">
            <img src={avatar} alt="" className="w-10 h-10 rounded-full object-cover bg-secondary"
              onError={e => { (e.target as HTMLImageElement).src = fallbackSrc; }} />
            {selected.online && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white" />}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm text-foreground truncate">{selected.name}, {selected.age}</p>
            <p className="text-xs text-emerald-500">{selected.online ? '● В сети' : 'Недавно была'}</p>
          </div>
        </button>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => onToggleFavorite(selected.other_user_id)}
            className="w-9 h-9 rounded-full hover:bg-secondary flex items-center justify-center transition-colors">
            <Icon name="Star" size={17} className={favoritedUsers.has(selected.other_user_id) ? 'text-amber-400' : 'text-muted-foreground'} />
          </button>
          <button onClick={() => onSetShowGifts(true)}
            className="w-9 h-9 rounded-full hover:bg-secondary flex items-center justify-center transition-colors">
            <Icon name="Gift" size={17} className="text-muted-foreground" />
          </button>
          <button onClick={() => onSetShowProfile(true)}
            className="w-9 h-9 rounded-full hover:bg-secondary flex items-center justify-center transition-colors">
            <Icon name="User" size={17} className="text-muted-foreground" />
          </button>
          <button onClick={() => onSetShowReport(true)}
            className="w-9 h-9 rounded-full hover:bg-secondary flex items-center justify-center transition-colors">
            <Icon name="Flag" size={15} className="text-rose-400" />
          </button>
          <button onClick={() => {
            if (!confirm('Удалить мэтч и переписку? Это действие нельзя отменить.')) return;
            if (onBlock) { onBlock(); } else if (onUnmatch) { onUnmatch(); }
          }}
            className="w-9 h-9 rounded-full hover:bg-secondary flex items-center justify-center transition-colors">
            <Icon name="UserX" size={15} className="text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2" style={{ minHeight: 0 }}>
        {msgLoading && messages.length === 0 ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          </div>
        ) : (
          <>
            <div className="text-center py-3">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full gradient-brand-soft text-xs font-semibold text-primary">
                💫 Вы мэтч с {selected.name}! Начните общение
              </div>
            </div>
            {messages.length === 0 && (
              <div className="px-2 pb-2">
                <p className="text-xs text-muted-foreground text-center mb-2 font-semibold">Не знаешь с чего начать?</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {[
                    `Привет, ${selected.name}! Как твой день? 😊`,
                    'Что тебя сегодня зацепило? ✨',
                    'Куда мечтаешь съездить? 🌍',
                    'Чем занимаешься в свободное время? 🎯',
                    'Какой последний фильм тебя впечатлил? 🎬',
                  ].map(q => (
                    <button key={q} onClick={() => { onSetText(q); }}
                      className="px-3 py-1.5 rounded-full bg-secondary border border-border text-xs text-foreground font-medium hover:border-primary hover:bg-primary/5 transition-all text-left max-w-[200px] truncate">
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg, i) => {
              const mine = msg.is_mine ?? (msg.sender_id === userId);
              const prevMine = i > 0 ? (messages[i - 1].is_mine ?? (messages[i - 1].sender_id === userId)) : null;
              const showAvatar = !mine && prevMine !== false;
              return (
                <div key={msg.id} className={`flex items-end gap-2 ${mine ? 'justify-end' : 'justify-start'}`}>
                  {!mine && (
                    <div className="w-7 shrink-0">
                      {showAvatar && (
                        <img src={avatar} alt="" className="w-7 h-7 rounded-full object-cover bg-secondary"
                          onError={e => { (e.target as HTMLImageElement).src = fallbackSrc; }} />
                      )}
                    </div>
                  )}
                  <div className={`max-w-[72%] flex flex-col gap-0.5 ${mine ? 'items-end' : 'items-start'}`}>
                    {msg.msg_type === 'image' && msg.image_url ? (
                      <img src={msg.image_url} alt="фото"
                        className="rounded-2xl max-w-full max-h-60 object-cover cursor-pointer shadow-sm"
                        onClick={() => window.open(msg.image_url!, '_blank')} />
                    ) : (
                      <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${mine ? 'text-white rounded-br-sm' : 'bg-secondary text-foreground rounded-bl-sm'}`}
                        style={mine ? { background: 'linear-gradient(135deg, hsl(340 82% 58%), hsl(262 80% 64%))' } : {}}>
                        {msg.text}
                      </div>
                    )}
                    <span className="text-[10px] text-muted-foreground px-1 flex items-center gap-1">
                      {timeAgo(msg.created_at)}
                      {mine && (
                        msg.read
                          ? <Icon name="CheckCheck" size={11} className="text-blue-500" />
                          : <Icon name="Check" size={11} className="text-muted-foreground" />
                      )}
                    </span>
                  </div>
                </div>
              );
            })}
            {isTyping && (
              <div className="flex items-end gap-2 justify-start">
                <div className="w-7 shrink-0">
                  <img src={avatar} alt="" className="w-7 h-7 rounded-full object-cover bg-secondary"
                    onError={e => { (e.target as HTMLImageElement).src = fallbackSrc; }} />
                </div>
                <div className="bg-secondary rounded-2xl rounded-bl-sm px-4 py-2.5">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Image preview */}
      {imagePreview && (
        <div className="px-4 py-2 border-t border-border bg-white flex items-center gap-3 shrink-0">
          <img src={imagePreview} alt="" className="w-14 h-14 rounded-xl object-cover" />
          <div className="flex-1">
            <p className="text-sm font-bold text-foreground">Отправить это фото?</p>
          </div>
          <button onClick={() => onSendImage(imagePreview)} disabled={sending}
            className="btn-primary px-4 py-2 text-sm text-white rounded-xl font-bold disabled:opacity-60">
            {sending ? '...' : 'Отправить'}
          </button>
          <button onClick={() => onSetImagePreview(null)}
            className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground">
            <Icon name="X" size={18} />
          </button>
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-border bg-white shrink-0">
        {sendError && (
          <div className="mb-2 px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-600 font-semibold flex items-center gap-2">
            <Icon name="AlertCircle" size={13} className="shrink-0" />
            <span className="flex-1">{sendError}</span>
            {sendError.includes('истекла') && (
              <button onClick={() => { localStorage.clear(); window.location.reload(); }}
                className="shrink-0 underline font-bold">Войти</button>
            )}
          </div>
        )}
        <div className="flex items-center gap-2 bg-secondary rounded-2xl px-3 py-2">
          <button onClick={() => fileRef.current?.click()}
            className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors shrink-0">
            <Icon name="Image" size={20} />
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
          <input
            type="text" value={text}
            onChange={e => onHandleTyping(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && onSend()}
            placeholder={`Написать ${selected.name}...`}
            className="flex-1 bg-transparent text-sm text-foreground placeholder-muted-foreground outline-none min-w-0"
          />
          <button onClick={onSend} disabled={!text.trim() || sending}
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 disabled:opacity-40 transition-all"
            style={text.trim() ? { background: 'linear-gradient(135deg, hsl(340 82% 58%), hsl(262 80% 64%))' } : {}}>
            {sending
              ? <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              : <Icon name="Send" size={15} className={text.trim() ? 'text-white' : 'text-muted-foreground'} />
            }
          </button>
        </div>
      </div>

      {showProfile && <ProfileDrawer match={selected} onClose={() => onSetShowProfile(false)} />}
      {showReport && (
        <ReportModal
          name={selected.name}
          userId={selected.other_user_id}
          onClose={() => onSetShowReport(false)}
        />
      )}
      {showGifts && (
        <GiftModal
          toUserId={selected.other_user_id}
          toName={selected.name}
          matchId={selected.match_id}
          onClose={() => onSetShowGifts(false)}
        />
      )}
    </div>
  );
}