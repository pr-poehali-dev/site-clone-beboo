-- Кошелёк пользователя
CREATE TABLE IF NOT EXISTS spark_wallets (
    user_id UUID PRIMARY KEY REFERENCES spark_users(id),
    balance INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wallets_user ON spark_wallets(user_id);

-- Транзакции кошелька
CREATE TABLE IF NOT EXISTS spark_wallet_txs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES spark_users(id),
    amount INTEGER NOT NULL,
    type TEXT NOT NULL, -- topup | spend | gift_sent | gift_received
    description TEXT,
    ref_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wallet_txs_user ON spark_wallet_txs(user_id);

-- Каталог подарков
CREATE TABLE IF NOT EXISTS spark_gifts_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    emoji TEXT NOT NULL,
    price INTEGER NOT NULL,
    description TEXT,
    active BOOLEAN DEFAULT TRUE
);

-- Отправленные подарки
CREATE TABLE IF NOT EXISTS spark_gifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_user_id UUID NOT NULL REFERENCES spark_users(id),
    to_user_id UUID NOT NULL REFERENCES spark_users(id),
    gift_id UUID NOT NULL REFERENCES spark_gifts_catalog(id),
    message TEXT,
    match_id UUID REFERENCES spark_matches(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_gifts_to ON spark_gifts(to_user_id, created_at DESC);

-- Жалобы от пользователей
CREATE TABLE IF NOT EXISTS spark_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_user_id UUID NOT NULL REFERENCES spark_users(id),
    to_user_id UUID NOT NULL REFERENCES spark_users(id),
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'open',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reports_status ON spark_reports(status);

-- Создать кошельки для существующих пользователей
INSERT INTO spark_wallets (user_id, balance)
SELECT id, 0 FROM spark_users
ON CONFLICT (user_id) DO NOTHING;

-- Начальный каталог подарков
INSERT INTO spark_gifts_catalog (name, emoji, price, description) VALUES
  ('Роза', '🌹', 10, 'Красная роза — классика романтики'),
  ('Букет', '💐', 30, 'Пышный цветочный букет'),
  ('Сердце', '❤️', 5, 'Маленькое сердечко'),
  ('Шоколад', '🍫', 15, 'Коробка шоколадных конфет'),
  ('Шампанское', '🍾', 50, 'Бутылка шампанского'),
  ('Корона', '👑', 100, 'Золотая корона — ты особенная!'),
  ('Диамант', '💎', 200, 'Сверкающий бриллиант'),
  ('Поцелуй', '💋', 20, 'Воздушный поцелуй'),
  ('Звезда', '⭐', 25, 'Яркая звезда'),
  ('Торт', '🎂', 40, 'Праздничный торт')
ON CONFLICT DO NOTHING;

-- typing статус в matches (расширение)
ALTER TABLE spark_messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- настройки подарков и кошелька
INSERT INTO spark_settings (key, value, description) VALUES
  ('gift_enabled', 'true', 'Подарки включены'),
  ('wallet_topup_enabled', 'true', 'Пополнение кошелька включено'),
  ('coins_per_ruble', '1', 'Монет за 1 рубль'),
  ('new_user_coins', '20', 'Монет при регистрации (бонус)')
ON CONFLICT (key) DO NOTHING;
