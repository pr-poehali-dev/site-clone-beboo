-- Таблица избранных
CREATE TABLE IF NOT EXISTS spark_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES spark_users(id),
    target_id UUID NOT NULL REFERENCES spark_users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, target_id)
);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON spark_favorites(user_id);

-- Таблица бустов
CREATE TABLE IF NOT EXISTS spark_boosts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES spark_users(id),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 minutes',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_boosts_user ON spark_boosts(user_id);

-- Платёжные настройки
INSERT INTO spark_settings (key, value, description) VALUES
  ('yukassa_shop_id', '', 'ЮKassa: Shop ID'),
  ('yukassa_secret_key', '', 'ЮKassa: Секретный ключ API'),
  ('robokassa_login', '', 'Робокасса: MerchantLogin'),
  ('robokassa_pass1', '', 'Робокасса: Password1'),
  ('robokassa_pass2', '', 'Робокасса: Password2'),
  ('payment_enabled', 'false', 'Оплата включена (true/false)'),
  ('payment_provider', 'yukassa', 'Провайдер оплаты (yukassa/robokassa)'),
  ('trial_days', '3', 'Триал Premium (дней)'),
  ('trial_enabled', 'true', 'Триал включён (true/false)'),
  ('boost_duration_min', '30', 'Длительность буста (мин)'),
  ('free_boosts_per_month', '1', 'Бесплатных бустов в месяц'),
  ('premium_boosts_per_month', '5', 'Бустов для Premium в месяц')
ON CONFLICT (key) DO NOTHING;

-- Колонка trial_used в users
ALTER TABLE spark_users ADD COLUMN IF NOT EXISTS trial_used BOOLEAN DEFAULT FALSE;
