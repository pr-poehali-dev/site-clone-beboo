INSERT INTO t_p99484439_site_clone_beboo.spark_settings (key, value, description)
VALUES 
  ('demo_topup_enabled', 'true', 'Демо-пополнение кошелька без оплаты (true = разрешено, false = только через платёжку)'),
  ('coins_per_ruble', '1', 'Монет за 1 рубль при реальной оплате')
ON CONFLICT (key) DO UPDATE SET description = EXCLUDED.description;