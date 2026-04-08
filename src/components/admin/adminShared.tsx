import { useState, useEffect } from 'react';
import { api, AdminMessage } from '@/api/client';
import Icon from '@/components/ui/icon';

/* ─── StatCard ─────────────────────────────────────────────────────── */

export function StatCard({ label, value, icon, color }: { label: string; value: number | string; icon: string; color: string }) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-border card-shadow">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{label}</p>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
          <Icon name={icon} size={18} className="text-white" />
        </div>
      </div>
      <p className="text-2xl font-black text-foreground">{value}</p>
    </div>
  );
}

/* ─── Spinner ──────────────────────────────────────────────────────── */

export function Spinner() {
  return (
    <div className="flex justify-center py-8">
      <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
    </div>
  );
}

/* ─── Badge ────────────────────────────────────────────────────────── */

export function Badge({ children, variant }: { children: React.ReactNode; variant: 'green' | 'red' | 'amber' | 'blue' | 'gray' }) {
  const colors: Record<string, string> = {
    green: 'bg-emerald-100 text-emerald-700',
    red: 'bg-red-100 text-red-700',
    amber: 'bg-amber-100 text-amber-700',
    blue: 'bg-blue-100 text-blue-700',
    gray: 'bg-gray-100 text-gray-600',
  };
  return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${colors[variant]}`}>{children}</span>;
}

/* ─── SectionTitle ─────────────────────────────────────────────────── */

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-black text-foreground mb-3">{children}</p>;
}

/* ─── EmptyState ───────────────────────────────────────────────────── */

export function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="py-12 text-center">
      <Icon name={icon} size={32} className="mx-auto text-muted-foreground mb-2" />
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

/* ─── ChatViewer ───────────────────────────────────────────────────── */

export function ChatViewer({ matchId, title, onClose }: { matchId: string; title: string; onClose: () => void }) {
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const r = await api.admin.readChat(matchId);
        setMessages(r.messages);
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, [matchId]);

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-end justify-center">
      <div className="bg-white w-full max-w-2xl rounded-t-2xl max-h-[80vh] flex flex-col animate-slide-up">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div>
            <p className="text-sm font-black text-foreground">Переписка</p>
            <p className="text-xs text-muted-foreground">{title}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center">
            <Icon name="X" size={18} className="text-foreground" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? <Spinner /> : messages.length === 0 ? (
            <EmptyState icon="MessageCircle" text="Сообщений нет" />
          ) : (
            messages.map(m => (
              <div key={m.id} className="flex gap-2 items-start">
                <div className="w-7 h-7 rounded-full gradient-brand flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                  {m.sender_name?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-bold text-foreground">{m.sender_name}</span>
                    <span className="text-[10px] text-muted-foreground">{new Date(m.created_at).toLocaleString('ru')}</span>
                  </div>
                  {m.msg_type === 'image' && m.image_url ? (
                    <img src={m.image_url} className="w-40 h-40 object-cover rounded-xl mt-1" alt="" />
                  ) : (
                    <p className="text-sm text-foreground bg-secondary rounded-2xl px-3 py-2 mt-1 inline-block max-w-full break-words">{m.text}</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
