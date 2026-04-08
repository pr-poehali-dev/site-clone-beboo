-- Просмотры профилей
CREATE TABLE IF NOT EXISTS spark_profile_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    viewer_id UUID NOT NULL REFERENCES spark_users(id),
    target_id UUID NOT NULL REFERENCES spark_users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_profile_views_target ON spark_profile_views(target_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profile_views_viewer ON spark_profile_views(viewer_id);

-- Режим инкогнито
ALTER TABLE spark_profiles ADD COLUMN IF NOT EXISTS incognito BOOLEAN DEFAULT FALSE;

-- Верификация по селфи
ALTER TABLE spark_users ADD COLUMN IF NOT EXISTS selfie_url TEXT;
ALTER TABLE spark_users ADD COLUMN IF NOT EXISTS selfie_status TEXT DEFAULT 'none';

-- Настройки
INSERT INTO spark_settings (key, value, description) VALUES
  ('stories_enabled', 'true', 'Истории (Stories) включены'),
  ('stories_duration_hours', '24', 'Время жизни истории (часов)'),
  ('incognito_enabled', 'true', 'Режим инкогнито включён'),
  ('views_enabled', 'true', 'Просмотры профилей включены')
ON CONFLICT (key) DO NOTHING;
