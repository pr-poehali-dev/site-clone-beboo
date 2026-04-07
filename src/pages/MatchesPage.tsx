import { useState } from 'react';
import { matches, Match } from '@/data/profiles';
import Icon from '@/components/ui/icon';

function timeAgo(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return 'только что';
  if (diff < 3600) return `${Math.floor(diff / 60)} мин`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч`;
  return `${Math.floor(diff / 86400)} д`;
}

const chatMessages = [
  { text: 'Привет! Увидела, что ты любишь путешествовать 😊', own: false, time: new Date(Date.now() - 1000 * 60 * 15) },
  { text: 'Да, обожаю! Ты откуда недавно вернулась?', own: true, time: new Date(Date.now() - 1000 * 60 * 12) },
  { text: 'Из Стамбула! Там просто невероятно красиво', own: false, time: new Date(Date.now() - 1000 * 60 * 10) },
  { text: 'О, я там тоже был! В каком районе жила?', own: true, time: new Date(Date.now() - 1000 * 60 * 8) },
  { text: 'Привет! Как дела? 😊', own: false, time: new Date(Date.now() - 1000 * 60 * 5) },
];

export default function MatchesPage() {
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState(chatMessages);

  const send = () => {
    if (!message.trim()) return;
    setMessages(prev => [...prev, { text: message, own: true, time: new Date() }]);
    setMessage('');
  };

  const newMatches = matches.filter(m => !m.lastMessage);
  const chats = matches.filter(m => m.lastMessage);

  if (selectedMatch) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-white shrink-0">
          <button
            onClick={() => setSelectedMatch(null)}
            className="w-9 h-9 rounded-full hover:bg-secondary flex items-center justify-center transition-colors"
          >
            <Icon name="ChevronLeft" size={20} className="text-foreground" />
          </button>
          <div className="relative">
            <img src={selectedMatch.profile.photos[0]} alt="" className="w-10 h-10 rounded-full object-cover" />
            {selectedMatch.profile.online && (
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white" />
            )}
          </div>
          <div>
            <p className="font-bold text-foreground text-sm">{selectedMatch.profile.name}</p>
            <p className="text-xs text-emerald-500">{selectedMatch.profile.online ? 'В сети' : 'Была недавно'}</p>
          </div>
          <div className="ml-auto flex gap-1">
            <button className="w-9 h-9 rounded-full hover:bg-secondary flex items-center justify-center transition-colors">
              <Icon name="Phone" size={18} className="text-muted-foreground" />
            </button>
            <button className="w-9 h-9 rounded-full hover:bg-secondary flex items-center justify-center transition-colors">
              <Icon name="Video" size={18} className="text-muted-foreground" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ minHeight: 0 }}>
          <div className="text-center mb-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full gradient-brand-soft text-xs font-semibold text-primary">
              <span>💫</span>
              <span>Вы мэтч! Начните общение</span>
            </div>
          </div>
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.own ? 'justify-end' : 'justify-start'} animate-fade-in`}>
              {!msg.own && (
                <img src={selectedMatch.profile.photos[0]} alt="" className="w-7 h-7 rounded-full object-cover mr-2 shrink-0 self-end" />
              )}
              <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                msg.own
                  ? 'text-white rounded-br-sm'
                  : 'bg-secondary text-foreground rounded-bl-sm'
              }`}
                style={msg.own ? { background: 'linear-gradient(135deg, hsl(340 82% 58%), hsl(262 80% 64%))' } : {}}
              >
                <p>{msg.text}</p>
                <p className={`text-[10px] mt-1 ${msg.own ? 'text-white/60' : 'text-muted-foreground'}`}>
                  {timeAgo(msg.time)}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-border bg-white shrink-0">
          <div className="flex items-center gap-2 bg-secondary rounded-2xl px-4 py-2.5">
            <button className="text-muted-foreground hover:text-primary transition-colors">
              <Icon name="Smile" size={20} />
            </button>
            <input
              type="text"
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder={`Написать ${selectedMatch.profile.name}...`}
              className="flex-1 bg-transparent text-sm text-foreground placeholder-muted-foreground outline-none"
            />
            <button className="text-muted-foreground hover:text-primary transition-colors">
              <Icon name="Image" size={20} />
            </button>
            {message.trim() && (
              <button
                onClick={send}
                className="w-8 h-8 rounded-full flex items-center justify-center btn-primary"
              >
                <Icon name="Send" size={15} className="text-white" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-6">
      <h2 className="text-xl font-black text-foreground">Сообщения</h2>

      {newMatches.length > 0 && (
        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Новые мэтчи</p>
          <div className="flex gap-4 overflow-x-auto pb-1">
            {newMatches.map(m => (
              <button
                key={m.id}
                onClick={() => setSelectedMatch(m)}
                className="flex flex-col items-center gap-2 shrink-0"
              >
                <div className="relative">
                  <div className="w-16 h-16 rounded-full p-0.5"
                    style={{ background: 'linear-gradient(135deg, hsl(340 82% 58%), hsl(262 80% 64%))' }}
                  >
                    <img
                      src={m.profile.photos[0]}
                      alt={m.profile.name}
                      className="w-full h-full rounded-full object-cover border-2 border-white"
                    />
                  </div>
                  {m.profile.online && (
                    <span className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white" />
                  )}
                </div>
                <span className="text-xs font-semibold text-foreground">{m.profile.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {chats.length > 0 && (
        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Чаты</p>
          <div className="space-y-1">
            {chats.map(m => (
              <button
                key={m.id}
                onClick={() => setSelectedMatch(m)}
                className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-secondary transition-all text-left"
              >
                <div className="relative shrink-0">
                  <img src={m.profile.photos[0]} alt="" className="w-12 h-12 rounded-full object-cover" />
                  {m.profile.online && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-sm text-foreground">{m.profile.name}</p>
                    {m.lastTime && (
                      <span className="text-xs text-muted-foreground shrink-0 ml-2">{timeAgo(m.lastTime)}</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-sm text-muted-foreground truncate">{m.lastMessage}</p>
                    {m.unread && m.unread > 0 ? (
                      <span className="ml-2 w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                        style={{ background: 'linear-gradient(135deg, hsl(340 82% 58%), hsl(262 80% 64%))' }}
                      >
                        {m.unread}
                      </span>
                    ) : null}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
