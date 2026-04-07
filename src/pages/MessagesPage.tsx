import { useState } from 'react';
import { conversations } from '@/data/mockData';
import { Conversation } from '@/types';
import Icon from '@/components/ui/icon';

function formatTime(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 3600) return `${Math.floor(diff / 60)} мин`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч`;
  return `${Math.floor(diff / 86400)} д`;
}

export default function MessagesPage() {
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [message, setMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<{ text: string; own: boolean; time: Date }[]>([
    { text: 'Привет! Как дела?', own: false, time: new Date(Date.now() - 1000 * 60 * 10) },
    { text: 'Всё отлично, спасибо! Работаю над новым проектом.', own: true, time: new Date(Date.now() - 1000 * 60 * 8) },
    { text: 'Отличная работа! Скоро пришлю файлы', own: false, time: new Date(Date.now() - 1000 * 60 * 5) },
  ]);

  const sendMessage = () => {
    if (!message.trim()) return;
    setChatMessages(prev => [...prev, { text: message, own: true, time: new Date() }]);
    setMessage('');
  };

  return (
    <div className="max-w-3xl mx-auto py-6 h-[calc(100vh-3rem)]">
      <h2 className="font-cormorant text-3xl font-semibold text-foreground mb-6">Сообщения</h2>

      <div className="flex gap-4 h-[calc(100%-4rem)] border border-border rounded-2xl overflow-hidden bg-card">
        <div className="w-72 shrink-0 border-r border-border flex flex-col">
          <div className="p-4">
            <div className="flex items-center gap-2 bg-secondary rounded-xl px-3 py-2">
              <Icon name="Search" size={15} className="text-muted-foreground" />
              <input
                type="text"
                placeholder="Поиск..."
                className="flex-1 bg-transparent text-sm text-foreground placeholder-muted-foreground outline-none"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {conversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => setSelected(conv)}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/60 transition-all text-left ${
                  selected?.id === conv.id ? 'bg-secondary' : ''
                }`}
              >
                <div className="relative shrink-0">
                  <img
                    src={conv.participant.avatar}
                    alt={conv.participant.name}
                    className="w-10 h-10 rounded-full object-cover bg-secondary"
                  />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border border-card" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground truncate">{conv.participant.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0 ml-2">{formatTime(conv.lastTime)}</span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-xs text-muted-foreground truncate">{conv.lastMessage}</p>
                    {conv.unread > 0 && (
                      <span className="ml-2 w-5 h-5 bg-gold rounded-full text-[10px] flex items-center justify-center text-background font-bold shrink-0">
                        {conv.unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          {selected ? (
            <>
              <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
                <img src={selected.participant.avatar} alt="" className="w-9 h-9 rounded-full object-cover bg-secondary" />
                <div>
                  <p className="text-sm font-medium text-foreground">{selected.participant.name}</p>
                  <p className="text-xs text-green-500">В сети</p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <button className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
                    <Icon name="Phone" size={16} />
                  </button>
                  <button className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
                    <Icon name="Video" size={16} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.own ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm ${
                      msg.own
                        ? 'bg-gold text-background rounded-br-sm'
                        : 'bg-secondary text-foreground rounded-bl-sm'
                    }`}>
                      <p>{msg.text}</p>
                      <p className={`text-[10px] mt-1 ${msg.own ? 'text-background/60' : 'text-muted-foreground'}`}>
                        {formatTime(msg.time)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-border">
                <div className="flex items-center gap-2 bg-secondary rounded-xl px-4 py-2">
                  <button className="text-muted-foreground hover:text-gold transition-colors">
                    <Icon name="Paperclip" size={16} />
                  </button>
                  <input
                    type="text"
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendMessage()}
                    placeholder="Написать сообщение..."
                    className="flex-1 bg-transparent text-sm text-foreground placeholder-muted-foreground outline-none"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!message.trim()}
                    className="p-1.5 rounded-lg bg-gold text-background disabled:opacity-40 hover:bg-gold/90 transition-all"
                  >
                    <Icon name="Send" size={14} />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <Icon name="MessageSquare" size={48} className="opacity-20 mb-3" />
              <p className="text-sm">Выберите диалог</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
