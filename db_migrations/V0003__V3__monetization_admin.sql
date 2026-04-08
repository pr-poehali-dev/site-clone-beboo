-- Добавляем поддержку фото в сообщениях
ALTER TABLE spark_messages ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT NULL;
ALTER TABLE spark_messages ADD COLUMN IF NOT EXISTS msg_type TEXT DEFAULT 'text';

-- Таблица Premium подписок
CREATE TABLE IF NOT EXISTS spark_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES spark_users(id),
    plan TEXT NOT NULL DEFAULT 'premium',
    price NUMERIC(10,2) DEFAULT 299.00,
    status TEXT DEFAULT 'active',
    started_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица настроек приложения (для админки)
CREATE TABLE IF NOT EXISTS spark_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT DEFAULT '',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица репортов (жалоб)
CREATE TABLE IF NOT EXISTS spark_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_user_id UUID NOT NULL REFERENCES spark_users(id),
    to_user_id UUID NOT NULL REFERENCES spark_users(id),
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица банов
CREATE TABLE IF NOT EXISTS spark_bans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES spark_users(id),
    reason TEXT DEFAULT '',
    banned_by TEXT DEFAULT 'admin',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Дефолтные настройки
INSERT INTO spark_settings (key, value, description) VALUES
  ('premium_price', '299', 'Цена Premium в рублях/мес'),
  ('premium_price_3m', '699', 'Цена Premium 3 месяца'),
  ('premium_price_12m', '1999', 'Цена Premium 12 месяцев'),
  ('free_likes_per_day', '20', 'Бесплатных лайков в день'),
  ('free_superlikes_per_day', '1', 'Бесплатных суперлайков в день'),
  ('app_name', 'Spark', 'Название приложения'),
  ('support_email', 'support@spark.app', 'Email поддержки'),
  ('new_users_today', '0', 'Новых пользователей сегодня (счётчик)')
ON CONFLICT (key) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_spark_subscriptions_user ON spark_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_spark_reports_to ON spark_reports(to_user_id);
CREATE INDEX IF NOT EXISTS idx_spark_bans_user ON spark_bans(user_id);

-- Поле is_premium и is_banned в профилях
ALTER TABLE spark_profiles ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE;
ALTER TABLE spark_users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
