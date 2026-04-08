-- Назначаем первого реального пользователя (teee@mail.ru) администратором
UPDATE spark_users SET is_admin = TRUE WHERE email = 'teee@mail.ru';

-- Исправляем все битые URL фото в профилях (files -> bucket)
UPDATE spark_profiles
SET photos = ARRAY(
  SELECT REPLACE(url, '/files/spark/', '/bucket/spark/')
  FROM unnest(photos) AS url
)
WHERE array_length(photos, 1) > 0
  AND EXISTS (
    SELECT 1 FROM unnest(photos) AS url WHERE url LIKE '%/files/spark/%'
  );

-- Убеждаемся что у admin-пользователя is_admin в таблице users корректно
ALTER TABLE spark_users ALTER COLUMN is_admin SET DEFAULT FALSE;
