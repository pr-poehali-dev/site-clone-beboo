import { useState, useEffect } from 'react';
import { api, WalletTx, ReceivedGift } from '@/api/client';
import Icon from '@/components/ui/icon';

const TOPUP_PACKAGES = [
  { coins: 50,  price: 59,  label: 'Старт' },
  { coins: 150, price: 149, label: 'Базовый', popular: false },
  { coins: 350, price: 299, label: 'Оптимальный', popular: true },
  { coins: 800, price: 599, label: 'Максимальный' },
];

export default function WalletPage() {
  const [balance, setBalance] = useState(0);
  const [txs, setTxs] = useState<WalletTx[]>([]);
  const [gifts, setGifts] = useState<ReceivedGift[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'wallet' | 'gifts'>('wallet');

  useEffect(() => {
    Promise.all([
      api.wallet.balance(),
      api.wallet.history(),
      api.wallet.giftsReceived(),
    ]).then(([b, h, g]) => {
      setBalance(b.balance);
      setTxs(h.transactions);
      setGifts(g.gifts);
    }).catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleTopup = async (coins: number) => {
    try {
      const r = await api.wallet.topup(coins);
      setBalance(r.balance);
      const newTx: WalletTx = { amount: coins, type: 'topup', description: `Пополнение на ${coins} монет`, created_at: new Date().toISOString() };
      setTxs(prev => [newTx, ...prev]);
      alert(`Баланс пополнен на ${coins} монет! Текущий баланс: ${r.balance}`);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Ошибка пополнения');
    }
  };

  const txIcon = (type: string) => {
    if (type === 'topup') return { icon: 'Plus', color: 'text-emerald-500', bg: 'bg-emerald-50' };
    if (type === 'gift_sent') return { icon: 'Gift', color: 'text-rose-500', bg: 'bg-rose-50' };
    if (type === 'gift_received') return { icon: 'Gift', color: 'text-amber-500', bg: 'bg-amber-50' };
    return { icon: 'Minus', color: 'text-gray-500', bg: 'bg-gray-50' };
  };

  function timeAgo(s: string) {
    const d = Math.floor((Date.now() - new Date(s).getTime()) / 1000);
    if (d < 60) return 'только что';
    if (d < 3600) return `${Math.floor(d / 60)} мин назад`;
    if (d < 86400) return `${Math.floor(d / 3600)} ч назад`;
    return new Date(s).toLocaleDateString('ru');
  }

  if (loading) {
    return <div className="flex items-center justify-center h-full">
      <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
    </div>;
  }

  return (
    <div className="h-full overflow-y-auto">
      {/* Баланс */}
      <div className="p-5 pb-0">
        <div className="rounded-3xl p-5 text-white mb-4" style={{ background: 'linear-gradient(135deg, hsl(340 82% 58%), hsl(262 80% 64%))' }}>
          <p className="text-white/70 text-sm font-semibold mb-1">Баланс кошелька</p>
          <div className="flex items-end gap-2 mb-3">
            <p className="text-4xl font-black">{balance}</p>
            <p className="text-white/70 text-lg mb-1">монет</p>
          </div>
          <p className="text-white/60 text-xs">Монеты используются для отправки подарков</p>
        </div>

        {/* Табы */}
        <div className="flex gap-2 mb-4">
          {(['wallet', 'gifts'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2.5 rounded-2xl text-sm font-bold transition-all ${tab === t ? 'btn-primary text-white' : 'bg-secondary text-muted-foreground'}`}>
              {t === 'wallet' ? '💰 Кошелёк' : '🎁 Подарки'}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 pb-6 space-y-4">
        {tab === 'wallet' && (
          <>
            {/* Пополнение */}
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Пополнить баланс</p>
              <div className="grid grid-cols-2 gap-2">
                {TOPUP_PACKAGES.map(pkg => (
                  <button key={pkg.coins} onClick={() => handleTopup(pkg.coins)}
                    className={`relative p-3 rounded-2xl border-2 text-left transition-all hover:border-primary active:scale-95 ${pkg.popular ? 'border-primary bg-primary/5' : 'border-border bg-white'}`}>
                    {pkg.popular && (
                      <span className="absolute -top-2 left-3 text-[10px] font-black px-2 py-0.5 rounded-full text-white" style={{ background: 'linear-gradient(135deg, hsl(340 82% 58%), hsl(262 80% 64%))' }}>ВЫГОДНО</span>
                    )}
                    <p className="text-2xl font-black text-foreground">{pkg.coins}</p>
                    <p className="text-xs text-muted-foreground">монет</p>
                    <p className="text-sm font-black text-primary mt-1">{pkg.price} ₽</p>
                  </button>
                ))}
              </div>
            </div>

            {/* История */}
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">История операций</p>
              {txs.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-4xl mb-2">💸</p>
                  <p className="text-sm text-muted-foreground">Операций пока нет</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {txs.map((tx, i) => {
                    const meta = txIcon(tx.type);
                    return (
                      <div key={i} className="flex items-center gap-3 bg-white rounded-2xl border border-border p-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${meta.bg}`}>
                          <Icon name={meta.icon} size={16} className={meta.color} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground">{tx.description}</p>
                          <p className="text-xs text-muted-foreground">{timeAgo(tx.created_at)}</p>
                        </div>
                        <p className={`text-sm font-black shrink-0 ${tx.amount > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                          {tx.amount > 0 ? '+' : ''}{tx.amount}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {tab === 'gifts' && (
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Полученные подарки</p>
            {gifts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-4xl mb-2">🎁</p>
                <p className="text-sm text-muted-foreground">Подарков пока нет</p>
                <p className="text-xs text-muted-foreground mt-1">Когда тебе подарят — они появятся здесь</p>
              </div>
            ) : (
              <div className="space-y-3">
                {gifts.map(g => (
                  <div key={g.id} className="bg-white rounded-2xl border border-border p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-2xl gradient-brand-soft flex items-center justify-center text-2xl shrink-0">
                        {g.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-foreground text-sm">{g.name}</p>
                          <span className="text-xs text-muted-foreground">{g.price} монет</span>
                        </div>
                        <p className="text-xs text-muted-foreground">От <span className="font-semibold text-foreground">{g.sender_name}</span></p>
                        {g.message && <p className="text-sm text-foreground/80 mt-1 italic">"{g.message}"</p>}
                        <p className="text-xs text-muted-foreground mt-1">{timeAgo(g.created_at)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
