import { useState } from 'react';
import { api } from '@/api/client';
import Icon from '@/components/ui/icon';

interface PremiumModalProps {
  onClose: () => void;
  onRefresh: () => Promise<void>;
}

export default function PremiumModal({ onClose, onRefresh }: PremiumModalProps) {
  const plans = [
    { id: '1m', label: '1 месяц', price: '299 ₽', per: '299 ₽/мес', popular: false },
    { id: '3m', label: '3 месяца', price: '699 ₽', per: '233 ₽/мес', popular: true },
    { id: '12m', label: '12 месяцев', price: '1 999 ₽', per: '167 ₽/мес', popular: false },
  ];
  const [selected, setSelected] = useState('3m');
  const [activating, setActivating] = useState(false);
  const [paying, setPaying] = useState(false);

  const activateTrial = async () => {
    setActivating(true);
    try {
      const r = await api.likes.trial();
      await onRefresh();
      alert(`Premium активирован на ${r.days} дня! Наслаждайтесь.`);
      onClose();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Не удалось активировать триал');
    } finally { setActivating(false); }
  };

  const handlePay = async () => {
    setPaying(true);
    try {
      const r = await api.payment.create(selected);
      window.open(r.pay_url, '_blank');
      // Ждём возврата и проверяем статус
      const check = setInterval(async () => {
        const s = await api.payment.status(r.payment_id);
        if (s.status === 'paid') {
          clearInterval(check);
          await onRefresh();
          alert('Оплата прошла успешно! Premium активирован.');
          onClose();
        }
      }, 5000);
      setTimeout(() => clearInterval(check), 300000);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '';
      if (msg.includes('недоступна') || msg.includes('настроена')) {
        alert('Оплата пока не подключена. Попробуйте бесплатный триал!');
      } else {
        alert(msg || 'Ошибка оплаты');
      }
    } finally { setPaying(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl p-6 w-full max-w-sm animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="text-center mb-5">
          <div className="w-16 h-16 rounded-3xl mx-auto mb-3 flex items-center justify-center text-3xl"
            style={{ background: 'linear-gradient(135deg, hsl(340 82% 58%), hsl(262 80% 64%))' }}>⭐</div>
          <h2 className="text-xl font-black text-foreground">Spark Premium</h2>
          <p className="text-sm text-muted-foreground mt-1">Больше лайков, видимости и возможностей</p>
        </div>

        <div className="space-y-2 mb-5">
          {[
            { icon: 'Heart', text: 'Безлимитные лайки каждый день' },
            { icon: 'Eye', text: 'Видишь кто лайкнул тебя' },
            { icon: 'Star', text: '5 суперлайков в день' },
            { icon: 'Zap', text: '5 бустов профиля в месяц' },
            { icon: 'Bookmark', text: 'Избранные анкеты' },
          ].map(f => (
            <div key={f.icon} className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, hsl(340 82% 58%), hsl(262 80% 64%))' }}>
                <Icon name={f.icon} size={14} className="text-white" />
              </div>
              <p className="text-sm text-foreground font-semibold">{f.text}</p>
            </div>
          ))}
        </div>

        <div className="space-y-2 mb-5">
          {plans.map(p => (
            <button key={p.id} onClick={() => setSelected(p.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border-2 transition-all ${selected === p.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}>
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-foreground">{p.label}</span>
                  {p.popular && <span className="text-[10px] font-black px-2 py-0.5 rounded-full text-white" style={{ background: 'linear-gradient(135deg, hsl(340 82% 58%), hsl(262 80% 64%))' }}>ВЫГОДНО</span>}
                </div>
                <span className="text-xs text-muted-foreground">{p.per}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-black text-foreground">{p.price}</span>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selected === p.id ? 'border-primary' : 'border-border'}`}>
                  {selected === p.id && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                </div>
              </div>
            </button>
          ))}
        </div>

        <button className="w-full py-3.5 rounded-2xl text-white font-black text-sm mb-2 disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, hsl(340 82% 58%), hsl(262 80% 64%))' }}
          disabled={paying}
          onClick={handlePay}>
          {paying ? 'Переходим к оплате...' : `Оплатить ${selected === '1m' ? '299 ₽' : selected === '3m' ? '699 ₽' : '1 999 ₽'}`}
        </button>
        <button className="w-full py-2.5 rounded-2xl border border-border text-foreground font-bold text-sm mb-2 disabled:opacity-60"
          disabled={activating}
          onClick={activateTrial}>
          {activating ? 'Активация...' : 'Попробовать бесплатно 3 дня'}
        </button>
        <button onClick={onClose} className="w-full py-2 text-sm text-muted-foreground font-semibold">
          Не сейчас
        </button>
      </div>
    </div>
  );
}
