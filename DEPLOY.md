# Инструкция по развёртыванию Spark на собственном хостинге

## Обзор архитектуры

```
Пользователь → Nginx (HTTPS) → React SPA (статика)
                              ↓
                       Cloud Functions (Python 3.11)
                              ↓
                       PostgreSQL 15+ (БД)
                              ↓
                       S3-совместимое хранилище (фото)
```

---

## 1. Требования к серверу

| Компонент | Минимум | Рекомендуется |
|-----------|---------|---------------|
| CPU | 2 ядра | 4 ядра |
| RAM | 2 GB | 4 GB |
| SSD | 20 GB | 50 GB |
| ОС | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |

---

## 2. Установка зависимостей

```bash
# Обновляем систему
sudo apt update && sudo apt upgrade -y

# Python 3.11
sudo apt install -y python3.11 python3.11-pip python3.11-venv

# PostgreSQL 15
sudo apt install -y postgresql-15 postgresql-client-15

# Nginx
sudo apt install -y nginx

# Node.js 20 + bun (для сборки фронтенда)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
npm install -g bun

# Certbot (SSL)
sudo apt install -y certbot python3-certbot-nginx
```

---

## 3. Настройка PostgreSQL

```bash
# Создаём базу данных и пользователя
sudo -u postgres psql << 'EOF'
CREATE USER spark_user WITH PASSWORD 'ОЧЕНЬ_СЛОЖНЫЙ_ПАРОЛЬ_ЗДЕСЬ';
CREATE DATABASE spark_db OWNER spark_user;
GRANT ALL PRIVILEGES ON DATABASE spark_db TO spark_user;
CREATE SCHEMA spark AUTHORIZATION spark_user;
EOF

# Тюнинг PostgreSQL для высокой нагрузки
sudo nano /etc/postgresql/15/main/postgresql.conf
```

Добавьте/измените в `postgresql.conf`:
```ini
# Память
shared_buffers = 256MB          # 25% от RAM
effective_cache_size = 768MB    # 75% от RAM
work_mem = 8MB
maintenance_work_mem = 64MB

# Соединения
max_connections = 100
connection_pooling = on

# Производительность
random_page_cost = 1.1          # Для SSD
effective_io_concurrency = 200

# WAL и checkpoint
wal_buffers = 16MB
checkpoint_completion_target = 0.9
wal_level = replica

# Логирование медленных запросов
log_min_duration_statement = 1000  # Запросы > 1 сек
```

```bash
# Перезапускаем PostgreSQL
sudo systemctl restart postgresql

# Строка подключения
DATABASE_URL="postgresql://spark_user:ПАРОЛЬ@localhost:5432/spark_db"
MAIN_DB_SCHEMA="spark"
```

---

## 4. Импорт схемы базы данных

```bash
# Применяем все миграции по порядку
cd /opt/spark

for migration in db_migrations/V*.sql; do
  echo "Применяем: $migration"
  psql "postgresql://spark_user:ПАРОЛЬ@localhost:5432/spark_db" \
    --set=search_path=spark \
    -f "$migration"
done
```

---

## 5. Настройка переменных окружения

Создайте файл `/opt/spark/.env`:
```bash
# База данных
DATABASE_URL=postgresql://spark_user:ПАРОЛЬ@localhost:5432/spark_db
MAIN_DB_SCHEMA=spark

# Безопасность
PASSWORD_SALT=СЛУЧАЙНАЯ_СТРОКА_64_СИМВОЛА_ЗДЕСЬ
ADMIN_KEY=ВАШ_СЕКРЕТНЫЙ_КЛЮЧ_АДМИНИСТРАТОРА

# S3 хранилище (MinIO или любое S3-совместимое)
AWS_ACCESS_KEY_ID=ваш_access_key
AWS_SECRET_ACCESS_KEY=ваш_secret_key
S3_ENDPOINT_URL=https://ваш-s3.example.com
S3_BUCKET=files

# Email (для восстановления пароля)
# Пример для Yandex почты:
SMTP_HOST=smtp.yandex.ru
SMTP_PORT=587
SMTP_USER=noreply@ваш-домен.ru
SMTP_PASS=пароль_приложения
SMTP_FROM=noreply@ваш-домен.ru
```

> **Генерация PASSWORD_SALT:**
> ```bash
> python3 -c "import secrets; print(secrets.token_hex(32))"
> ```

---

## 6. Настройка бэкенда (Cloud Functions → локальные сервисы)

Для самостоятельного хостинга каждая функция запускается как отдельный веб-сервис:

```bash
# Устанавливаем gunicorn
pip3.11 install gunicorn psycopg2-binary boto3

# Создаём systemd сервис для auth
sudo nano /etc/systemd/system/spark-auth.service
```

```ini
[Unit]
Description=Spark Auth Service
After=network.target postgresql.service

[Service]
User=www-data
WorkingDirectory=/opt/spark/backend/auth
Environment="DATABASE_URL=postgresql://..."
Environment="MAIN_DB_SCHEMA=spark"
Environment="PASSWORD_SALT=ваш_salt"
ExecStart=/usr/local/bin/gunicorn --workers 2 --bind 127.0.0.1:8001 wsgi:app
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

Создайте `wsgi.py` для каждой функции:
```python
# /opt/spark/backend/auth/wsgi.py
import json
from flask import Flask, request, jsonify
from index import handler

app = Flask(__name__)

@app.route('/', methods=['GET', 'POST', 'OPTIONS'])
def handle():
    event = {
        'httpMethod': request.method,
        'queryStringParameters': dict(request.args),
        'headers': dict(request.headers),
        'body': request.get_data(as_text=True),
        'requestContext': {'identity': {'sourceIp': request.remote_addr}}
    }
    result = handler(event, None)
    response = app.response_class(
        response=result.get('body', ''),
        status=result.get('statusCode', 200),
        headers=result.get('headers', {}),
        mimetype='application/json'
    )
    return response
```

Запустите сервисы (порты 8001-8005):
```bash
# auth:8001, profiles:8002, likes:8003, matches:8004, upload:8005
sudo systemctl enable spark-auth spark-profiles spark-likes spark-matches spark-upload
sudo systemctl start spark-auth
```

---

## 7. Сборка фронтенда

```bash
cd /opt/spark

# Обновите URLs функций в src/api/client.ts
# Замените https://functions.poehali.dev/... на ваши локальные URLs

# Сборка
bun install
bun run build

# Копируем билд в nginx
sudo cp -r dist/* /var/www/spark/
```

---

## 8. Настройка Nginx

```bash
sudo nano /etc/nginx/sites-available/spark
```

```nginx
# Rate limiting
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=auth:10m rate=2r/s;

server {
    listen 80;
    server_name ваш-домен.ru www.ваш-домен.ru;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ваш-домен.ru www.ваш-домен.ru;

    # SSL (certbot заполнит автоматически)
    ssl_certificate /etc/letsencrypt/live/ваш-домен.ru/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ваш-домен.ru/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;

    # Безопасность
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' https:;" always;

    # Фронтенд (React SPA)
    root /var/www/spark;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
        expires 1h;
        add_header Cache-Control "public, max-age=3600";
    }

    # Статика с долгим кешем
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 30d;
        add_header Cache-Control "public, max-age=2592000, immutable";
    }

    # API — Auth (rate limit строже)
    location /api/auth/ {
        limit_req zone=auth burst=5 nodelay;
        limit_req_status 429;
        proxy_pass http://127.0.0.1:8001/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_connect_timeout 10s;
        proxy_read_timeout 30s;
    }

    # API — остальные функции
    location /api/profiles/ { limit_req zone=api burst=20 nodelay; proxy_pass http://127.0.0.1:8002/; proxy_set_header X-Real-IP $remote_addr; }
    location /api/likes/    { limit_req zone=api burst=30 nodelay; proxy_pass http://127.0.0.1:8003/; proxy_set_header X-Real-IP $remote_addr; }
    location /api/matches/  { limit_req zone=api burst=20 nodelay; proxy_pass http://127.0.0.1:8004/; proxy_set_header X-Real-IP $remote_addr; }
    location /api/upload/   { limit_req zone=api burst=5 nodelay;  proxy_pass http://127.0.0.1:8005/; proxy_set_header X-Real-IP $remote_addr;
                               client_max_body_size 20M; }

    # Блокировка вредоносных запросов
    location ~* \.(php|asp|aspx|jsp|cgi|sh|py|pl|rb)$ {
        return 403;
    }
    location ~ /\. {
        deny all;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/spark /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# SSL сертификат
sudo certbot --nginx -d ваш-домен.ru -d www.ваш-домен.ru
```

---

## 9. MinIO (S3-совместимое хранилище)

```bash
# Скачиваем MinIO
wget https://dl.min.io/server/minio/release/linux-amd64/minio
chmod +x minio && sudo mv minio /usr/local/bin/

# Создаём директорию
sudo mkdir -p /data/minio
sudo chown www-data:www-data /data/minio

# Systemd сервис
sudo nano /etc/systemd/system/minio.service
```

```ini
[Unit]
Description=MinIO Object Storage
After=network.target

[Service]
User=www-data
Environment="MINIO_ROOT_USER=spark_admin"
Environment="MINIO_ROOT_PASSWORD=СЛОЖНЫЙ_ПАРОЛЬ"
ExecStart=/usr/local/bin/minio server /data/minio --console-address :9001
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable minio && sudo systemctl start minio

# Создаём bucket через mc (MinIO client)
mc alias set local http://localhost:9000 spark_admin ПАРОЛЬ
mc mb local/files
mc policy set public local/files
```

---

## 10. Мониторинг и автоматическое обслуживание

```bash
# Создаём cron для очистки старых сессий
sudo crontab -e
```

```cron
# Каждую ночь в 3:00 — чистим старые данные
0 3 * * * psql "postgresql://spark_user:ПАРОЛЬ@localhost/spark_db" -c "
  SET search_path = spark;
  UPDATE spark_sessions SET expires_at = NOW() WHERE expires_at < NOW() - INTERVAL '31 days';
  UPDATE spark_rate_limits SET attempts = 0, window_start = NOW() WHERE window_start < NOW() - INTERVAL '1 hour';
" >> /var/log/spark-cleanup.log 2>&1

# Каждые 5 минут — проверка что сервисы живы
*/5 * * * * systemctl is-active spark-auth || systemctl restart spark-auth
*/5 * * * * systemctl is-active spark-profiles || systemctl restart spark-profiles
*/5 * * * * systemctl is-active spark-likes || systemctl restart spark-likes
*/5 * * * * systemctl is-active spark-matches || systemctl restart spark-matches
*/5 * * * * systemctl is-active spark-upload || systemctl restart spark-upload
```

---

## 11. Резервное копирование

```bash
# Скрипт бэкапа базы данных
sudo nano /opt/spark/backup.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/backups/spark"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Дамп базы данных
pg_dump "postgresql://spark_user:ПАРОЛЬ@localhost/spark_db" \
  --schema=spark \
  --no-owner \
  -Fc \
  > "$BACKUP_DIR/db_$DATE.dump"

# Удаляем бэкапы старше 7 дней
find $BACKUP_DIR -name "*.dump" -mtime +7 -delete

echo "Backup complete: $BACKUP_DIR/db_$DATE.dump"
```

```bash
chmod +x /opt/spark/backup.sh

# Добавляем в cron (каждый день в 2:00)
echo "0 2 * * * /opt/spark/backup.sh >> /var/log/spark-backup.log 2>&1" | sudo crontab -
```

---

## 12. Восстановление базы данных из бэкапа

```bash
# Восстановить из дампа
pg_restore \
  -d "postgresql://spark_user:ПАРОЛЬ@localhost/spark_db" \
  --schema=spark \
  --no-owner \
  /backups/spark/db_20250101_030000.dump
```

---

## 13. Обновление приложения

```bash
cd /opt/spark

# Получаем новый код
git pull origin main

# Применяем новые миграции
for migration in db_migrations/V*.sql; do
  psql "postgresql://spark_user:ПАРОЛЬ@localhost/spark_db" \
    --set=search_path=spark \
    -f "$migration" 2>/dev/null || true
done

# Пересобираем фронтенд
bun install
bun run build
sudo cp -r dist/* /var/www/spark/

# Перезапускаем сервисы
sudo systemctl restart spark-auth spark-profiles spark-likes spark-matches spark-upload

echo "Обновление завершено!"
```

---

## 14. Мониторинг производительности

```bash
# Медленные запросы PostgreSQL
psql "postgresql://spark_user:ПАРОЛЬ@localhost/spark_db" -c "
SELECT query, mean_exec_time, calls, total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
"

# Статистика соединений
psql "postgresql://spark_user:ПАРОЛЬ@localhost/spark_db" -c "
SELECT count(*), state FROM pg_stat_activity GROUP BY state;
"

# Размер таблиц
psql "postgresql://spark_user:ПАРОЛЬ@localhost/spark_db" -c "
SELECT schemaname, tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'spark'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
"
```

---

## 15. Настройка SMTP для восстановления пароля

После деплоя войдите в **Admin Panel → Настройки** и укажите:

| Ключ | Значение |
|------|---------|
| `smtp_host` | smtp.yandex.ru |
| `smtp_port` | 587 |
| `smtp_user` | ваш@email.ru |
| `smtp_pass` | пароль_приложения |
| `smtp_from` | noreply@ваш-домен.ru |
| `app_url` | https://ваш-домен.ru |

> Для Yandex: создайте пароль приложения в настройках безопасности аккаунта.

---

## 16. Безопасность — чеклист

- [ ] Поменяли `ADMIN_KEY` на длинный случайный ключ
- [ ] Поменяли `PASSWORD_SALT` на уникальное значение
- [ ] Настроили SSL сертификат (HTTPS)
- [ ] Nginx rate limiting включён
- [ ] Бэкапы настроены и протестированы
- [ ] Firewall настроен (только 80, 443 открыты публично)
- [ ] PostgreSQL не доступен извне (только localhost)
- [ ] Настроен fail2ban для SSH

```bash
# Настройка firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

## Поддержка

При проблемах: https://poehali.dev/help
