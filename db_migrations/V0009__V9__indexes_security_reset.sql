-- Таблица токенов сброса пароля
CREATE TABLE IF NOT EXISTS spark_password_resets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES spark_users(id),
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '1 hour',
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_password_resets_token ON spark_password_resets(token);
CREATE INDEX IF NOT EXISTS idx_password_resets_user ON spark_password_resets(user_id);

-- Оптимизация индексов
CREATE INDEX IF NOT EXISTS idx_sessions_token ON spark_sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON spark_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON spark_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_match_created ON spark_messages(match_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON spark_messages(match_id, sender_id, read);
CREATE INDEX IF NOT EXISTS idx_likes_from ON spark_likes(from_user_id);
CREATE INDEX IF NOT EXISTS idx_likes_to ON spark_likes(to_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_online ON spark_profiles(online_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_profiles_gender_age ON spark_profiles(gender, age);
CREATE INDEX IF NOT EXISTS idx_matches_users ON spark_matches(user1_id, user2_id);
CREATE INDEX IF NOT EXISTS idx_boosts_user_expires ON spark_boosts(user_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_views_target_recent ON spark_profile_views(target_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_txs_user ON spark_wallet_txs(user_id, created_at DESC);

-- Настройки для email и безопасности
INSERT INTO spark_settings (key, value, description) VALUES
  ('smtp_host', '', 'SMTP сервер для отправки email'),
  ('smtp_port', '587', 'SMTP порт'),
  ('smtp_user', '', 'SMTP логин'),
  ('smtp_pass', '', 'SMTP пароль'),
  ('smtp_from', 'noreply@spark.app', 'Email отправителя'),
  ('app_url', 'https://spark.poehali.dev', 'URL приложения для ссылок'),
  ('max_login_attempts', '5', 'Максимум попыток входа перед блокировкой'),
  ('session_ttl_days', '30', 'Время жизни сессии (дней)'),
  ('coins_bonus_new_user', '20', 'Бонус монет при регистрации')
ON CONFLICT (key) DO NOTHING;

-- Увеличиваем TTL сессий
ALTER TABLE spark_sessions ALTER COLUMN expires_at SET DEFAULT NOW() + INTERVAL '30 days';
