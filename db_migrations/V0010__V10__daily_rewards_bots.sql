-- Ежедневные награды
CREATE TABLE IF NOT EXISTS spark_daily_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES spark_users(id),
    day_number INTEGER NOT NULL DEFAULT 1,
    coins INTEGER NOT NULL DEFAULT 10,
    claimed_date DATE NOT NULL DEFAULT CURRENT_DATE,
    claimed_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_rewards_user_date ON spark_daily_rewards(user_id, claimed_date);
CREATE INDEX IF NOT EXISTS idx_daily_rewards_user ON spark_daily_rewards(user_id, claimed_at DESC);

-- Боты
ALTER TABLE spark_users ADD COLUMN IF NOT EXISTS is_bot BOOLEAN DEFAULT FALSE;
ALTER TABLE spark_profiles ADD COLUMN IF NOT EXISTS is_bot BOOLEAN DEFAULT FALSE;

-- Настройки наград и ботов
INSERT INTO spark_settings (key, value, description) VALUES
  ('daily_reward_enabled', 'true', 'Ежедневные награды включены'),
  ('daily_reward_day1', '10', 'Монет за день 1'),
  ('daily_reward_day2', '15', 'Монет за день 2'),
  ('daily_reward_day3', '20', 'Монет за день 3'),
  ('daily_reward_day4', '25', 'Монет за день 4'),
  ('daily_reward_day5', '30', 'Монет за день 5'),
  ('daily_reward_day6', '35', 'Монет за день 6'),
  ('daily_reward_day7', '50', 'Монет за день 7 (бонус)'),
  ('daily_reward_default', '10', 'Монет по умолчанию (день 8+)'),
  ('bot_enabled', 'true', 'Боты активны'),
  ('bot_like_interval_min', '30', 'Интервал лайков ботов (мин)'),
  ('bot_message_interval_min', '60', 'Интервал сообщений ботов (мин)'),
  ('bot_view_interval_min', '15', 'Интервал просмотров ботов (мин)')
ON CONFLICT (key) DO NOTHING;

-- Создаём ботов
INSERT INTO spark_users (id, email, password_hash, is_bot) VALUES
  ('11111111-0000-0000-0000-000000000001', 'bot1@spark.internal', 'bot_no_login', TRUE),
  ('11111111-0000-0000-0000-000000000002', 'bot2@spark.internal', 'bot_no_login', TRUE),
  ('11111111-0000-0000-0000-000000000003', 'bot3@spark.internal', 'bot_no_login', TRUE),
  ('11111111-0000-0000-0000-000000000004', 'bot4@spark.internal', 'bot_no_login', TRUE),
  ('11111111-0000-0000-0000-000000000005', 'bot5@spark.internal', 'bot_no_login', TRUE)
ON CONFLICT (id) DO UPDATE SET is_bot = TRUE;

-- Профили ботов
INSERT INTO spark_profiles (user_id, name, age, gender, city, bio, is_bot, online_at, photos) VALUES
  ('11111111-0000-0000-0000-000000000001', 'Анастасия', 24, 'female', 'Москва',
   'Люблю путешествия и хорошую музыку ✨ Ищу интересное общение',
   TRUE, NOW(),
   ARRAY['https://api.dicebear.com/7.x/avataaars/svg?seed=Anastasia&backgroundColor=b6e3f4']),
  ('11111111-0000-0000-0000-000000000002', 'Виктория', 26, 'female', 'Санкт-Петербург',
   'Художник по жизни 🎨 Обожаю кофе и закаты',
   TRUE, NOW(),
   ARRAY['https://api.dicebear.com/7.x/avataaars/svg?seed=Victoria&backgroundColor=ffdfbf']),
  ('11111111-0000-0000-0000-000000000003', 'Александр', 28, 'male', 'Москва',
   'Спорт, путешествия, хорошее настроение 💪 Открыт к новому',
   TRUE, NOW(),
   ARRAY['https://api.dicebear.com/7.x/avataaars/svg?seed=Alexander&backgroundColor=c0aede']),
  ('11111111-0000-0000-0000-000000000004', 'Дмитрий', 30, 'male', 'Екатеринбург',
   'Программист днём, гитарист вечером 🎸',
   TRUE, NOW(),
   ARRAY['https://api.dicebear.com/7.x/avataaars/svg?seed=Dmitry&backgroundColor=d1d4f9']),
  ('11111111-0000-0000-0000-000000000005', 'Екатерина', 23, 'female', 'Новосибирск',
   'Люблю читать и готовить 📚 Ищу того, с кем не скучно',
   TRUE, NOW(),
   ARRAY['https://api.dicebear.com/7.x/avataaars/svg?seed=Ekaterina&backgroundColor=ffd5dc'])
ON CONFLICT (user_id) DO UPDATE SET
  name = EXCLUDED.name, age = EXCLUDED.age, gender = EXCLUDED.gender,
  city = EXCLUDED.city, bio = EXCLUDED.bio, is_bot = TRUE,
  online_at = NOW(), photos = EXCLUDED.photos;

-- Кошельки ботов
INSERT INTO spark_wallets (user_id, balance) VALUES
  ('11111111-0000-0000-0000-000000000001', 9999),
  ('11111111-0000-0000-0000-000000000002', 9999),
  ('11111111-0000-0000-0000-000000000003', 9999),
  ('11111111-0000-0000-0000-000000000004', 9999),
  ('11111111-0000-0000-0000-000000000005', 9999)
ON CONFLICT (user_id) DO UPDATE SET balance = 9999;
