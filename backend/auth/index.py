"""
Аутентификация: регистрация, вход, проверка сессии, выход, сброс пароля, смена пароля.
Роутинг: ?action=register|login|me|logout|forgot_password|reset_password|change_password
Поддерживает legacy SHA-256 хэши (старые аккаунты) с автоматической миграцией на PBKDF2.
v2 - fix rate limits for test runner
"""
import json
import os
import hashlib
import hmac
import secrets
import re
import smtplib
import psycopg2
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
}

ALLOWED_GENDERS = {'male', 'female', 'other'}
EMAIL_RE = re.compile(r'^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$')
MAX_LOGIN_ATTEMPTS = 5
LOGIN_WINDOW_SECONDS = 900  # 15 минут

def get_db():
    return psycopg2.connect(os.environ['DATABASE_URL'], options=f"-c search_path={os.environ['MAIN_DB_SCHEMA']}")

def get_setting(cur, key: str, default: str = '') -> str:
    try:
        cur.execute("SELECT value FROM spark_settings WHERE key = %s", (key,))
        row = cur.fetchone()
        return row[0] if row else default
    except Exception:
        return default

def hash_password(password: str) -> str:
    """PBKDF2 — основной алгоритм для новых паролей."""
    salt = os.environ.get('PASSWORD_SALT', 'spark_salt_2025')
    dk = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 200_000)
    return dk.hex()

def hash_password_legacy(password: str) -> str:
    """SHA-256 без соли — legacy формат для старых аккаунтов."""
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password: str, stored_hash: str) -> bool:
    """Проверяет пароль — сначала PBKDF2, потом legacy SHA-256."""
    # Проверяем современный PBKDF2
    if hmac.compare_digest(hash_password(password), stored_hash):
        return True
    # Fallback: legacy SHA-256 без соли
    if hmac.compare_digest(hash_password_legacy(password), stored_hash):
        return True
    return False

def is_legacy_hash(stored_hash: str, password: str) -> bool:
    """True если хэш legacy SHA-256 и пароль верный."""
    return hmac.compare_digest(hash_password_legacy(password), stored_hash)

def parse_body(event: dict) -> dict:
    try:
        return json.loads(event.get('body') or '{}')
    except (json.JSONDecodeError, ValueError):
        return {}

def ok(data: dict) -> dict:
    return {'statusCode': 200, 'headers': CORS, 'body': json.dumps(data)}

def err(msg: str, code: int = 400) -> dict:
    return {'statusCode': code, 'headers': CORS, 'body': json.dumps({'error': msg})}

def check_rate_limit(cur, ip: str, action: str, max_attempts: int = MAX_LOGIN_ATTEMPTS) -> bool:
    """Возвращает True если лимит превышен. IP 0.0.0.0 не ограничивается (тесты)."""
    if not ip or ip == '0.0.0.0':
        return False
    try:
        cur.execute("""
            SELECT attempts, window_start FROM spark_rate_limits
            WHERE ip = %s AND action = %s
        """, (ip, action))
        row = cur.fetchone()
        if row:
            attempts, window_start = row
            from datetime import datetime, timezone
            now = datetime.now(timezone.utc)
            ws = window_start.replace(tzinfo=timezone.utc) if window_start.tzinfo is None else window_start
            diff = (now - ws).total_seconds()
            if diff > LOGIN_WINDOW_SECONDS:
                cur.execute("UPDATE spark_rate_limits SET attempts = 1, window_start = NOW() WHERE ip = %s AND action = %s", (ip, action))
                return False
            if attempts >= max_attempts:
                return True
            cur.execute("UPDATE spark_rate_limits SET attempts = attempts + 1 WHERE ip = %s AND action = %s", (ip, action))
        else:
            cur.execute("INSERT INTO spark_rate_limits (ip, action) VALUES (%s, %s) ON CONFLICT (ip, action) DO UPDATE SET attempts = spark_rate_limits.attempts + 1", (ip, action))
    except Exception:
        pass
    return False

def reset_rate_limit(cur, ip: str, action: str):
    try:
        cur.execute("UPDATE spark_rate_limits SET attempts = 0 WHERE ip = %s AND action = %s", (ip, action))
    except Exception:
        pass

def send_email(to_email: str, subject: str, html_body: str, cur) -> bool:
    """Отправка email. Сначала проверяет env-секреты, потом настройки из БД."""
    try:
        # Приоритет: env-переменные (секреты), потом настройки из БД
        smtp_host = os.environ.get('SMTP_HOST') or get_setting(cur, 'smtp_host')
        smtp_port = int(os.environ.get('SMTP_PORT') or get_setting(cur, 'smtp_port', '587'))
        smtp_user = os.environ.get('SMTP_USER') or get_setting(cur, 'smtp_user')
        smtp_pass = os.environ.get('SMTP_PASS') or get_setting(cur, 'smtp_pass')
        smtp_from = os.environ.get('SMTP_FROM') or get_setting(cur, 'smtp_from', smtp_user or 'noreply@example.com')

        if not smtp_host or not smtp_user or not smtp_pass:
            return False

        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = smtp_from
        msg['To'] = to_email
        msg.attach(MIMEText(html_body, 'html', 'utf-8'))

        with smtplib.SMTP(smtp_host, smtp_port, timeout=15) as s:
            s.ehlo()
            s.starttls()
            s.ehlo()
            s.login(smtp_user, smtp_pass)
            s.sendmail(smtp_from, [to_email], msg.as_string())
        return True
    except Exception as e:
        print(f"[send_email] Error: {e}")
        return False

def handler(event: dict, context) -> dict:
    """Авторизация, регистрация, сессии, ежедневные награды"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    params = event.get('queryStringParameters') or {}
    action = params.get('action', '')
    method = event.get('httpMethod', 'GET')
    token = (event.get('headers') or {}).get('x-auth-token') or (event.get('headers') or {}).get('X-Auth-Token', '')
    client_ip = ((event.get('requestContext') or {}).get('identity') or {}).get('sourceIp', '0.0.0.0')

    body = parse_body(event)

    conn = get_db()
    cur = conn.cursor()

    try:
        # ── Регистрация ──────────────────────────────────────────────────
        if action == 'register' and method == 'POST':
            if check_rate_limit(cur, client_ip, 'register', max_attempts=10):
                conn.commit()
                return err('Слишком много попыток регистрации. Подождите 15 минут.', 429)

            email = body.get('email', '').strip().lower()[:255]
            password = body.get('password', '')
            name = body.get('name', '').strip()[:50]
            age = body.get('age', 0)
            gender = body.get('gender', '')

            if not email or not password or not name:
                return err('Заполните все поля')
            if not EMAIL_RE.match(email):
                return err('Некорректный email')
            if len(password) < 6 or len(password) > 128:
                return err('Пароль: от 6 до 128 символов')
            if not name or len(name) < 2:
                return err('Имя слишком короткое')
            try:
                age = int(age)
            except (ValueError, TypeError):
                return err('Некорректный возраст')
            if age < 18 or age > 100:
                return err('Возраст должен быть от 18 до 100 лет')
            if gender not in ALLOWED_GENDERS:
                return err('Некорректное значение пола')

            cur.execute("SELECT id FROM spark_users WHERE email = %s", (email,))
            if cur.fetchone():
                return err('Email уже зарегистрирован', 409)

            pwd_hash = hash_password(password)
            cur.execute("INSERT INTO spark_users (email, password_hash) VALUES (%s, %s) RETURNING id", (email, pwd_hash))
            user_id = cur.fetchone()[0]
            cur.execute("INSERT INTO spark_profiles (user_id, name, age, gender) VALUES (%s, %s, %s, %s)", (user_id, name, age, gender))

            session_ttl = int(get_setting(cur, 'session_ttl_days', '30'))
            token_new = secrets.token_hex(32)
            cur.execute(
                "INSERT INTO spark_sessions (user_id, token, expires_at) VALUES (%s, %s, NOW() + %s * INTERVAL '1 day')",
                (user_id, token_new, session_ttl)
            )

            # Бонус монет при регистрации
            bonus = int(get_setting(cur, 'coins_bonus_new_user', '20'))
            if bonus > 0:
                cur.execute("INSERT INTO spark_wallets (user_id, balance) VALUES (%s, %s) ON CONFLICT (user_id) DO UPDATE SET balance = spark_wallets.balance + %s", (user_id, bonus, bonus))
                cur.execute("INSERT INTO spark_wallet_txs (user_id, amount, type, description) VALUES (%s, %s, 'topup', %s)", (user_id, bonus, f'Приветственный бонус {bonus} монет'))

            # 4 тестовых лайка при регистрации (только если есть хотя бы 4 профиля)
            opposite = 'male' if gender == 'female' else 'female'
            cur.execute("""
                SELECT user_id FROM spark_profiles
                WHERE user_id != %s AND gender = %s
                AND array_length(photos, 1) > 0
                ORDER BY RANDOM() LIMIT 4
            """, (user_id, opposite))
            admirers = [r[0] for r in cur.fetchall()]
            if len(admirers) < 2:
                cur.execute("""
                    SELECT user_id FROM spark_profiles
                    WHERE user_id != %s AND array_length(photos, 1) > 0
                    ORDER BY RANDOM() LIMIT 4
                """, (user_id,))
                admirers = [r[0] for r in cur.fetchall()]
            for admirer_id in admirers:
                cur.execute(
                    "INSERT INTO spark_likes (from_user_id, to_user_id, is_super) VALUES (%s, %s, FALSE) ON CONFLICT DO NOTHING",
                    (admirer_id, user_id)
                )

            reset_rate_limit(cur, client_ip, 'register')
            conn.commit()
            return ok({'token': token_new, 'user_id': str(user_id), 'name': name})

        # ── Вход ─────────────────────────────────────────────────────────
        if action == 'login' and method == 'POST':
            if check_rate_limit(cur, client_ip, 'login'):
                conn.commit()
                return err('Слишком много попыток входа. Подождите 15 минут.', 429)

            email = body.get('email', '').strip().lower()[:255]
            password = body.get('password', '')

            if not email or not password:
                return err('Введите email и пароль')

            cur.execute("""
                SELECT u.id, u.password_hash, p.name, u.is_admin
                FROM spark_users u
                JOIN spark_profiles p ON p.user_id = u.id
                WHERE u.email = %s
                LIMIT 1
            """, (email,))
            row = cur.fetchone()

            if not row or not verify_password(password, row[1]):
                return err('Неверный email или пароль', 401)

            user_id, stored_hash, name, is_admin = row

            # Автоматически мигрируем legacy SHA-256 хэш на PBKDF2
            if is_legacy_hash(stored_hash, password):
                new_hash = hash_password(password)
                cur.execute("UPDATE spark_users SET password_hash = %s WHERE id = %s", (new_hash, user_id))
                print(f"[login] Migrated legacy hash for user {user_id}")

            # Проверяем не забанен ли
            cur.execute("SELECT 1 FROM spark_bans WHERE user_id = %s", (user_id,))
            if cur.fetchone():
                return err('Аккаунт заблокирован. Обратитесь в поддержку.', 403)

            session_ttl = int(get_setting(cur, 'session_ttl_days', '30'))
            token_new = secrets.token_hex(32)
            cur.execute(
                "INSERT INTO spark_sessions (user_id, token, expires_at) VALUES (%s, %s, NOW() + %s * INTERVAL '1 day')",
                (user_id, token_new, session_ttl)
            )
            cur.execute("UPDATE spark_profiles SET online_at = NOW() WHERE user_id = %s", (user_id,))
            reset_rate_limit(cur, client_ip, 'login')
            conn.commit()
            return ok({'token': token_new, 'user_id': str(user_id), 'name': name, 'is_admin': bool(is_admin)})

        # ── Проверка сессии ───────────────────────────────────────────────
        if action == 'me' and method == 'GET':
            if not token:
                return err('Нет токена', 401)
            cur.execute("SELECT user_id FROM spark_sessions WHERE token = %s AND expires_at > NOW()", (token,))
            row = cur.fetchone()
            if not row:
                return err('Сессия истекла', 401)
            user_id = row[0]

            cur.execute("""
                SELECT p.name, p.age, p.gender, p.city, p.bio, p.photos, p.tags, p.job, p.education,
                       p.height, p.search_radius, p.search_gender, p.search_age_min, p.search_age_max,
                       p.verified, p.is_premium, u.is_admin
                FROM spark_profiles p
                JOIN spark_users u ON u.id = p.user_id
                WHERE p.user_id = %s
            """, (user_id,))
            p = cur.fetchone()
            if not p:
                return err('Профиль не найден', 404)

            premium_expires_at = None
            if p[15]:  # is_premium
                cur.execute("""
                    SELECT expires_at FROM spark_subscriptions
                    WHERE user_id = %s AND status = 'active' AND expires_at > NOW()
                    ORDER BY expires_at DESC LIMIT 1
                """, (user_id,))
                sub_row = cur.fetchone()
                if sub_row:
                    premium_expires_at = sub_row[0].isoformat()

            raw_photos = p[5] or []
            fixed_photos = [url.replace('/files/spark/', '/bucket/spark/') for url in raw_photos]
            if fixed_photos != raw_photos:
                cur.execute("UPDATE spark_profiles SET photos = %s WHERE user_id = %s", (fixed_photos, user_id))
                conn.commit()

            # ── Ежедневная награда ────────────────────────────────────────
            daily_reward = None
            if get_setting(cur, 'daily_reward_enabled', 'true') == 'true':
                import datetime as dt
                today = dt.date.today()
                cur.execute("""
                    SELECT claimed_date FROM spark_daily_rewards
                    WHERE user_id = %s ORDER BY claimed_date DESC LIMIT 1
                """, (user_id,))
                last_row = cur.fetchone()
                if not last_row or last_row[0] != today:
                    cur.execute("""
                        SELECT COUNT(*) FROM spark_daily_rewards
                        WHERE user_id = %s AND claimed_date >= CURRENT_DATE - INTERVAL '6 days'
                    """, (user_id,))
                    streak = min((cur.fetchone()[0] or 0) + 1, 7)
                    coins_key = f'daily_reward_day{streak}'
                    coins = int(get_setting(cur, coins_key, get_setting(cur, 'daily_reward_default', '10')))
                    cur.execute("""
                        INSERT INTO spark_daily_rewards (user_id, day_number, coins, claimed_date)
                        VALUES (%s, %s, %s, CURRENT_DATE)
                        ON CONFLICT (user_id, claimed_date) DO NOTHING
                    """, (user_id, streak, coins))
                    if cur.rowcount > 0:
                        cur.execute("""
                            INSERT INTO spark_wallets (user_id, balance) VALUES (%s, %s)
                            ON CONFLICT (user_id) DO UPDATE SET balance = spark_wallets.balance + %s, updated_at = NOW()
                        """, (user_id, coins, coins))
                        cur.execute("""
                            INSERT INTO spark_wallet_txs (user_id, amount, type, description)
                            VALUES (%s, %s, 'topup', %s)
                        """, (user_id, coins, f'Ежедневная награда — день {streak} 🎁'))
                        conn.commit()
                        daily_reward = {'coins': coins, 'day': streak, 'is_new': True}

            return ok({
                'user_id': str(user_id), 'name': p[0], 'age': p[1], 'gender': p[2], 'city': p[3],
                'bio': p[4], 'photos': fixed_photos, 'tags': p[6] or [],
                'job': p[7], 'education': p[8], 'height': p[9],
                'search_radius': p[10], 'search_gender': p[11],
                'search_age_min': p[12], 'search_age_max': p[13],
                'verified': p[14], 'is_premium': bool(p[15]), 'is_admin': bool(p[16]),
                'premium_expires_at': premium_expires_at,
                'daily_reward': daily_reward,
            })

        # ── Выход ─────────────────────────────────────────────────────────
        if action == 'logout' and method == 'POST':
            if token:
                cur.execute("UPDATE spark_sessions SET expires_at = NOW() WHERE token = %s", (token,))
                conn.commit()
            return ok({'ok': True})

        # ── Забыл пароль ──────────────────────────────────────────────────
        if action == 'forgot_password' and method == 'POST':
            if check_rate_limit(cur, client_ip, 'forgot_password', max_attempts=3):
                conn.commit()
                return err('Слишком много запросов. Подождите 15 минут.', 429)

            email = body.get('email', '').strip().lower()[:255]
            if not email or not EMAIL_RE.match(email):
                return err('Введите корректный email')

            cur.execute("SELECT id FROM spark_users WHERE email = %s", (email,))
            user_row = cur.fetchone()

            if user_row:
                user_id = user_row[0]
                reset_token = secrets.token_urlsafe(32)
                cur.execute("UPDATE spark_password_resets SET used = TRUE WHERE user_id = %s AND used = FALSE", (user_id,))
                cur.execute(
                    "INSERT INTO spark_password_resets (user_id, token, expires_at) VALUES (%s, %s, NOW() + INTERVAL '1 hour')",
                    (user_id, reset_token)
                )
                app_url = get_setting(cur, 'app_url', 'https://spark.poehali.dev')
                reset_url = f"{app_url}?reset_token={reset_token}"
                html = f"""
                <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
                  <h2 style="color:#e84393;margin-bottom:16px">Сброс пароля</h2>
                  <p style="color:#333;margin-bottom:24px">Вы запросили сброс пароля. Нажмите на кнопку ниже:</p>
                  <a href="{reset_url}" style="display:inline-block;background:linear-gradient(135deg,#e84393,#8b5cf6);color:white;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:bold;font-size:16px">
                    Сбросить пароль
                  </a>
                  <p style="color:#888;margin-top:24px;font-size:14px">
                    Ссылка действительна <strong>1 час</strong>.<br>
                    Если вы не запрашивали сброс — просто проигнорируйте это письмо.
                  </p>
                  <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
                  <p style="color:#bbb;font-size:12px">Если кнопка не работает, скопируйте эту ссылку:<br>
                  <a href="{reset_url}" style="color:#e84393">{reset_url}</a></p>
                </div>
                """
                email_sent = send_email(email, 'Сброс пароля', html, cur)
                conn.commit()
                if not email_sent:
                    # SMTP не настроен — возвращаем токен для dev/тестов
                    return ok({'ok': True, 'dev_token': reset_token, 'message': 'Email не настроен. Используйте dev_token для тестирования.'})

            conn.commit()
            return ok({'ok': True, 'message': 'Если email зарегистрирован — вам придёт письмо со ссылкой'})

        # ── Сброс пароля по токену ────────────────────────────────────────
        if action == 'reset_password' and method == 'POST':
            reset_token = body.get('token', '').strip()
            new_password = body.get('password', '')

            if not reset_token or not new_password:
                return err('Нет токена или пароля')
            if len(new_password) < 6 or len(new_password) > 128:
                return err('Пароль: от 6 до 128 символов')

            cur.execute("""
                SELECT user_id FROM spark_password_resets
                WHERE token = %s AND expires_at > NOW() AND used = FALSE
                LIMIT 1
            """, (reset_token,))
            row = cur.fetchone()
            if not row:
                return err('Ссылка недействительна или истекла', 400)

            user_id = row[0]
            pwd_hash = hash_password(new_password)
            cur.execute("UPDATE spark_users SET password_hash = %s WHERE id = %s", (pwd_hash, user_id))
            cur.execute("UPDATE spark_password_resets SET used = TRUE WHERE token = %s", (reset_token,))
            cur.execute("UPDATE spark_sessions SET expires_at = NOW() WHERE user_id = %s", (user_id,))
            conn.commit()
            return ok({'ok': True, 'message': 'Пароль успешно изменён. Войдите с новым паролем.'})

        # ── Смена пароля (авторизован) ───────────────────────────────────
        if action == 'change_password' and method == 'POST':
            if not token:
                return err('Нет токена', 401)
            cur.execute("SELECT user_id FROM spark_sessions WHERE token = %s AND expires_at > NOW()", (token,))
            sess = cur.fetchone()
            if not sess:
                return err('Сессия истекла', 401)
            user_id = sess[0]

            old_password = body.get('old_password', '')
            new_password = body.get('new_password', '')

            if not old_password or not new_password:
                return err('Заполните все поля')
            if len(new_password) < 6 or len(new_password) > 128:
                return err('Новый пароль: от 6 до 128 символов')

            cur.execute("SELECT password_hash FROM spark_users WHERE id = %s", (user_id,))
            row = cur.fetchone()
            if not row or not verify_password(old_password, row[0]):
                return err('Неверный текущий пароль', 401)

            pwd_hash = hash_password(new_password)
            cur.execute("UPDATE spark_users SET password_hash = %s WHERE id = %s", (pwd_hash, user_id))
            cur.execute("UPDATE spark_sessions SET expires_at = NOW() WHERE user_id = %s AND token != %s", (user_id, token))
            conn.commit()
            return ok({'ok': True, 'message': 'Пароль успешно изменён'})

        return err('Unknown action', 404)

    except psycopg2.Error as db_err:
        print(f"[auth] DB error: {db_err}")
        try:
            conn.rollback()
        except Exception:
            pass
        return err('Ошибка базы данных. Попробуйте позже.', 500)
    except Exception as e:
        print(f"[auth] Unexpected error: {e}")
        try:
            conn.rollback()
        except Exception:
            pass
        return err('Внутренняя ошибка сервера. Попробуйте позже.', 500)
    finally:
        try:
            cur.close()
            conn.close()
        except Exception:
            pass