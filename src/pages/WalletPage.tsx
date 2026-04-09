import { useState, useEffect, useCallback } from 'react';
import { api, WalletTx, ReceivedGift } from '@/api/client';
import Icon from '@/components/ui/icon';

const DEMO_PACKAGES = [
  { coins: 50,  label: 'Попробовать' },
  { coins: 150, label: 'Базовый' },
  { coins: 350, label: 'Оптимальный', popular: true },
  { coins: 800, label: 'Максимальный' },
];

const PAY_PLANS = [
  { id: '1m',  label: '1 месяц',   price: 299,  coins: 300,  badge: '' },
  { id: '3m',  label: '3 месяца',  price: 699,  coins: 1000, badge: 'ВЫГОДНО' },
  { id: '12m', label: '12 месяцев', price: 1999, coins: 3500, badge: 'ХИТ' },
];

function timeAgo(s: string) {
  const d = Math.floor((Date.now() - new Date(s).getTime()) / 1000);
  if (d < 60) return 'только что';
  if (d < 3600) return `${Math.floor(d / 60)} мин назад`;
  if (d < 86400) return `${Math.floor(d / 3600)} ч назад`;
  return new Date(s).toLocaleDateString('ru');
}

function txMeta(type: string) {
  if (type === 'topup')        return { icon: 'Plus',       color: 'text-emerald-500', bg: 'bg-emerald-50' };
  if (type === 'gift_sent')    return { icon: 'Gift',       color: 'text-rose-500',    bg: 'bg-rose-50' };
  if (type === 'gift_received') return { icon: 'Gift',      color: 'text-amber-500',   bg: 'bg-amber-50' };
  if (type === 'purchase')     return { icon: 'ShoppingBag', color: 'text-purple-500', bg: 'bg-purple-50' };
  return { icon: 'Minus', color: 'text-gray-500', bg: 'bg-gray-50' };
}

export default function WalletPage({ refreshKey = 0 }: { refreshKey?: number }) {
  const [balance, setBalance]             = useState(0);
  const [demoEnabled, setDemoEnabled]     = useState(true);
  const [paymentEnabled, setPaymentEnabled] = useState(false);
  const [provider, setProvider]           = useState('yukassa');
  const [txs, setTxs]                     = useState<WalletTx[]>([]);
  const [gifts, setGifts]                 = useState<ReceivedGift[]>([]);
  const [loading, setLoading]             = useState(true);
  const [tab, setTab]                     = useState<'wallet' | 'gifts' | 'premium'>('wallet');
  const [topupLoading, setTopupLoading]   = useState(false);
  const [payLoading, setPayLoading]       = useState<string | null>(null);
  const [paySuccess, setPaySuccess]       = useState(false);

  const load = useCallback(async () => {
    try {
      const [b, h, g] = await Promise.all([
        api.wallet.balance(),
        api.wallet.history(),
        api.wallet.giftsReceived(),
      ]);
      setBalance(b.balance);
      setDemoEnabled(b.demo_topup_enabled ?? true);
      setPaymentEnabled(b.payment_enabled ?? false);
      setProvider(b.payment_provider ?? 'yukassa');
      setTxs(h.transactions);
      setGifts(g.gifts);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  // Проверяем статус оплаты при возврате на страницу
  useEffect(() => {
    const pid = new URLSearchParams(window.location.search).get('payment_id');
    if (!pid) return;
    api.payment.status(pid).then(r => {
      if (r.status === 'paid') {
        setPaySuccess(true);
        load();
        window.history.replaceState({}, '', window.location.pathname);
      }
    }).catch(() => {});
  }, [load]);

  const handleDemoTopup = async (coins: number) => {
    if (topupLoading) return;
    setTopupLoading(true);
    try {
      const r = await api.wallet.topup(coins);
      setBalance(r.balance);
      setTxs(prev => [{ amount: coins, type: 'topup', description: `Демо-пополнение на ${coins} монет`, created_at: new Date().toISOString() }, ...prev]);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Ошибка пополнения');
    }
    setTopupLoading(false);
  };

  const handlePayment = async (planId: string) => {
    setPayLoading(planId);
    try {
      const returnUrl = window.location.href.split('?')[0];
      const r = await api.payment.create(planId);
      if (r.pay_url) {
        window.location.href = r.pay_url;
      }
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Ошибка оплаты');
      setPayLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      {/* Успешная оплата */}
      {paySuccess && (
        <div className="mx-4 mt-4 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
          <Icon name="CheckCircle" size={20} className="text-emerald-500 shrink-0" />
          <div>
            <p className="font-bold text-emerald-800 text-sm">Оплата прошла успешно!</p>
            <p className="text-xs text-emerald-600">Premium активирован, монеты начислены</p>
          </div>
          <button onClick={() => setPaySuccess(false)} className="ml-auto text-emerald-400 hover:text-emerald-600">
            <Icon name="X" size={16} />
          </button>
        </div>
      )}

      {/* Баланс */}
      <div className="p-4 pb-0">
        <div className="rounded-3xl p-5 text-white mb-4" style={{ background: 'linear-gradient(135deg, hsl(340 82% 58%), hsl(262 80% 64%))' }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-white/70 text-sm font-semibold mb-1">Баланс кошелька</p>
              <div className="flex items-end gap-2 mb-1">
                <p className="text-4xl font-black">{balance}</p>
                <p className="text-white/70 text-lg mb-1">монет</p>
              </div>
              <p className="text-white/60 text-xs">Монеты — для подарков и бустов</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
              <Icon name="Wallet" size={22} className="text-white" />
            </div>
          </div>
          {demoEnabled && (
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-semibold">
              <Icon name="FlaskConical" size={12} />
              Демо-режим: пополнение бесплатное
            </div>
          )}
        </div>

        {/* Табы */}
        <div className="flex gap-2 mb-4">
          {(['wallet', 'gifts', 'premium'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2.5 rounded-2xl text-xs font-bold transition-all ${tab === t ? 'btn-primary text-white' : 'bg-secondary text-muted-foreground'}`}>
              {t === 'wallet' ? '💰 Кошелёк' : t === 'gifts' ? '🎁 Подарки' : '⭐ Premium'}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pb-6 space-y-4">

        {/* ── Кошелёк ── */}
        {tab === 'wallet' && (
          <>
            {/* Демо пополнение */}
            {demoEnabled && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Демо-пополнение</p>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold">БЕСПЛАТНО</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {DEMO_PACKAGES.map(pkg => (
                    <button key={pkg.coins} onClick={() => handleDemoTopup(pkg.coins)} disabled={topupLoading}
                      className={`relative p-3 rounded-2xl border-2 text-left transition-all active:scale-95 disabled:opacity-60 ${pkg.popular ? 'border-primary bg-primary/5' : 'border-border bg-white'} hover:border-primary`}>
                      {pkg.popular && (
                        <span className="absolute -top-2 left-3 text-[10px] font-black px-2 py-0.5 rounded-full text-white" style={{ background: 'linear-gradient(135deg, hsl(340 82% 58%), hsl(262 80% 64%))' }}>ПОПУЛЯРНО</span>
                      )}
                      <p className="text-2xl font-black text-foreground">{pkg.coins}</p>
                      <p className="text-xs text-muted-foreground">монет</p>
                      <p className="text-xs font-bold text-emerald-600 mt-1">Бесплатно ✓</p>
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground mt-2 text-center">
                  Демо-режим включён администратором. Реальные деньги не списываются.
                </p>
              </div>
            )}

            {/* Реальная оплата монет */}
            {paymentEnabled && (
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Купить монеты</p>
                <div className="space-y-2">
                  {PAY_PLANS.map(plan => (
                    <button key={plan.id} onClick={() => handlePayment(plan.id)} disabled={!!payLoading}
                      className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white border-2 border-border hover:border-primary active:scale-[0.98] transition-all disabled:opacity-60 text-left">
                      <div className="w-10 h-10 rounded-xl gradient-brand-soft flex items-center justify-center shrink-0">
                        <Icon name="Coins" size={18} className="text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm text-foreground">{plan.coins} монет</p>
                          {plan.badge && <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full text-white" style={{ background: 'linear-gradient(135deg, hsl(340 82% 58%), hsl(262 80% 64%))' }}>{plan.badge}</span>}
                        </div>
                        <p className="text-xs text-muted-foreground">Premium на {plan.label}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        {payLoading === plan.id
                          ? <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          : <p className="font-black text-primary">{plan.price} ₽</p>}
                      </div>
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground text-center mt-2">
                  Оплата через {provider === 'robokassa' ? 'Робокассу' : 'ЮKassa'} — защищённое соединение
                </p>
              </div>
            )}

            {/* Если ничего не доступно */}
            {!demoEnabled && !paymentEnabled && (
              <div className="text-center py-8">
                <Icon name="WalletMinimal" size={40} className="text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Пополнение временно недоступно</p>
                <p className="text-xs text-muted-foreground mt-1">Обратитесь к администратору</p>
              </div>
            )}

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
                    const meta = txMeta(tx.type);
                    return (
                      <div key={i} className="flex items-center gap-3 bg-white rounded-2xl border border-border p-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${meta.bg}`}>
                          <Icon name={meta.icon} size={16} className={meta.color} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{tx.description}</p>
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

        {/* ── Подарки ── */}
        {tab === 'gifts' && (
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
              Полученные подарки ({gifts.length})
            </p>
            {gifts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-5xl mb-3">🎁</p>
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
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-foreground text-sm">{g.name}</p>
                          <span className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">{g.price} монет</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          От <span className="font-semibold text-foreground">{g.sender_name}</span>
                        </p>
                        {g.message && (
                          <p className="text-sm text-foreground/80 mt-1.5 italic bg-secondary rounded-xl px-3 py-2">
                            "{g.message}"
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">{timeAgo(g.created_at)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Premium ── */}
        {tab === 'premium' && (
          <div className="space-y-4">
            {/* Преимущества */}
            <div className="rounded-2xl p-4 border border-border bg-white">
              <p className="text-sm font-black text-foreground mb-3">Что даёт Premium?</p>
              <div className="space-y-2">
                {[
                  { icon: 'Eye', text: 'Кто просматривал твой профиль' },
                  { icon: 'Star', text: 'Неограниченные лайки' },
                  { icon: 'RotateCcw', text: 'Отмена последнего свайпа' },
                  { icon: 'EyeOff', text: 'Режим инкогнито' },
                  { icon: 'Zap', text: '5 бустов в месяц (вместо 1)' },
                  { icon: 'Filter', text: 'Расширенные фильтры поиска' },
                ].map(f => (
                  <div key={f.text} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-xl gradient-brand-soft flex items-center justify-center shrink-0">
                      <Icon name={f.icon} size={14} className="text-primary" />
                    </div>
                    <p className="text-sm text-foreground">{f.text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Планы */}
            {paymentEnabled ? (
              <div className="space-y-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Выбери план</p>
                {PAY_PLANS.map(plan => (
                  <button key={plan.id} onClick={() => handlePayment(plan.id)} disabled={!!payLoading}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all active:scale-[0.98] disabled:opacity-60 ${plan.badge === 'ХИТ' ? 'border-primary bg-primary/5' : 'border-border bg-white'} hover:border-primary`}>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-foreground">{plan.label}</p>
                        {plan.badge && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full text-white" style={{ background: 'linear-gradient(135deg, hsl(340 82% 58%), hsl(262 80% 64%))' }}>
                            {plan.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{plan.coins} монет в подарок</p>
                    </div>
                    {payLoading === plan.id
                      ? <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
                      : <p className="font-black text-xl text-primary shrink-0">{plan.price} ₽</p>}
                  </button>
                ))}
                <p className="text-[10px] text-muted-foreground text-center">
                  Оплата через {provider === 'robokassa' ? 'Робокассу' : 'ЮKassa'}. Автопродление не подключено.
                </p>
              </div>
            ) : (
              <div className="text-center py-6 bg-white rounded-2xl border border-border">
                <Icon name="CreditCard" size={36} className="text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-bold text-foreground mb-1">Оплата не настроена</p>
                <p className="text-xs text-muted-foreground">Администратор ещё не подключил платёжную систему</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}