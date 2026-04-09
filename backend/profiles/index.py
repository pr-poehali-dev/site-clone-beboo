"""
Профили: анкеты для свайпов, обновление профиля, просмотр чужого.
Роутинг: ?action=discover|my|update|get
Исправлено: SQL injection в gender_filter, N+1 запросы, валидация входных данных.
"""
import json
import os
import re
import psycopg2

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
}

ALLOWED_GENDERS = {'male', 'female', 'other', 'all'}
ALLOWED_FIELDS = {'name', 'age', 'city', 'bio', 'tags', 'job', 'education', 'height',
                  'search_radius', 'search_gender', 'search_age_min', 'search_age_max'}

def get_db():
    return psycopg2.connect(os.environ['DATABASE_URL'], options=f"-c search_path={os.environ['MAIN_DB_SCHEMA']}")

def get_user_id(cur, token: str):
    if not token:
        return None
    cur.execute("SELECT user_id FROM spark_sessions WHERE token = %s AND expires_at > NOW() LIMIT 1", (token,))
    row = cur.fetchone()
    return row[0] if row else None

def fix_photos(photos):
    return [url.replace('/files/spark/', '/bucket/spark/') for url in (photos or [])]

def profile_to_dict(row) -> dict:
    return {
        'user_id': str(row[0]), 'name': row[1], 'age': row[2], 'gender': row[3], 'city': row[4],
        'bio': row[5] or '', 'photos': fix_photos(row[6]), 'tags': row[7] or [],
        'job': row[8] or '', 'education': row[9] or '', 'height': row[10],
        'verified': row[11], 'online': True, 'distance': 3,
    }

def ok(data: dict) -> dict:
    return {'statusCode': 200, 'headers': CORS, 'body': json.dumps(data)}

def err(msg: str, code: int = 400) -> dict:
    return {'statusCode': code, 'headers': CORS, 'body': json.dumps({'error': msg})}

def parse_body(event: dict) -> dict:
    try:
        return json.loads(event.get('body') or '{}')
    except (json.JSONDecodeError, ValueError):
        return {}

def handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    params = event.get('queryStringParameters') or {}
    action = params.get('action', '')
    method = event.get('httpMethod', 'GET')
    headers_raw = event.get('headers') or {}
    token = params.get('_t') or headers_raw.get('x-auth-token') or headers_raw.get('X-Auth-Token', '')

    conn = get_db()
    cur = conn.cursor()

    try:
        user_id = get_user_id(cur, token)
        if not user_id:
            return err('Не авторизован', 401)

        # ── Поиск анкет ──────────────────────────────────────────────────
        if action == 'discover':
            cur.execute("""
                SELECT search_gender, search_age_min, search_age_max, incognito
                FROM spark_profiles WHERE user_id = %s
            """, (user_id,))
            prefs = cur.fetchone()
            gender_filter = (prefs[0] if prefs else 'all') or 'all'
            age_min = prefs[1] if prefs else 18
            age_max = prefs[2] if prefs else 45

            # Валидируем gender_filter через whitelist (НЕ string format!)
            if gender_filter not in ALLOWED_GENDERS:
                gender_filter = 'all'
            try:
                age_min = max(18, int(age_min or 18))
                age_max = min(100, int(age_max or 45))
            except (ValueError, TypeError):
                age_min, age_max = 18, 45

            # Параметризованный запрос — никакой SQL injection
            # Буст: активные буст-профили идут первыми, потом по online_at
            if gender_filter == 'all':
                cur.execute("""
                    SELECT p.user_id, p.name, p.age, p.gender, p.city, p.bio, p.photos, p.tags,
                           p.job, p.education, p.height, p.verified,
                           EXISTS(SELECT 1 FROM spark_boosts b WHERE b.user_id = p.user_id AND b.expires_at > NOW()) AS is_boosted
                    FROM spark_profiles p
                    WHERE p.user_id != %s
                      AND p.age >= %s AND p.age <= %s
                      AND (p.incognito IS NULL OR p.incognito = FALSE)
                      AND p.user_id NOT IN (
                          SELECT to_user_id FROM spark_likes WHERE from_user_id = %s
                      )
                      AND array_length(p.photos, 1) > 0
                    ORDER BY
                        EXISTS(SELECT 1 FROM spark_boosts b WHERE b.user_id = p.user_id AND b.expires_at > NOW()) DESC,
                        p.online_at DESC NULLS LAST
                    LIMIT 20
                """, (user_id, age_min, age_max, user_id))
            else:
                cur.execute("""
                    SELECT p.user_id, p.name, p.age, p.gender, p.city, p.bio, p.photos, p.tags,
                           p.job, p.education, p.height, p.verified,
                           EXISTS(SELECT 1 FROM spark_boosts b WHERE b.user_id = p.user_id AND b.expires_at > NOW()) AS is_boosted
                    FROM spark_profiles p
                    WHERE p.user_id != %s
                      AND p.gender = %s
                      AND p.age >= %s AND p.age <= %s
                      AND (p.incognito IS NULL OR p.incognito = FALSE)
                      AND p.user_id NOT IN (
                          SELECT to_user_id FROM spark_likes WHERE from_user_id = %s
                      )
                      AND array_length(p.photos, 1) > 0
                    ORDER BY
                        EXISTS(SELECT 1 FROM spark_boosts b WHERE b.user_id = p.user_id AND b.expires_at > NOW()) DESC,
                        p.online_at DESC NULLS LAST
                    LIMIT 20
                """, (user_id, gender_filter, age_min, age_max, user_id))

            rows = cur.fetchall()
            profiles = []
            for r in rows:
                d = profile_to_dict(r)
                d['is_boosted'] = bool(r[12])
                profiles.append(d)
            return ok({'profiles': profiles})

        # ── Мой профиль ──────────────────────────────────────────────────
        if action == 'my':
            cur.execute("""
                SELECT p.user_id, p.name, p.age, p.gender, p.city, p.bio, p.photos, p.tags, p.job, p.education,
                       p.height, p.verified, p.search_radius, p.search_gender, p.search_age_min, p.search_age_max, p.is_premium
                FROM spark_profiles p WHERE p.user_id = %s
            """, (user_id,))
            row = cur.fetchone()
            if not row:
                return err('Профиль не найден', 404)
            d = profile_to_dict(row)
            d['search_radius'] = row[12]
            d['search_gender'] = row[13]
            d['search_age_min'] = row[14]
            d['search_age_max'] = row[15]
            d['is_premium'] = bool(row[16])
            return ok(d)

        # ── Обновить профиль ─────────────────────────────────────────────
        if action == 'update' and method in ('POST', 'PUT'):
            body = parse_body(event)
            updates = {}
            for k, v in body.items():
                if k not in ALLOWED_FIELDS:
                    continue
                # Валидация каждого поля
                if k == 'name':
                    v = str(v).strip()[:50]
                    if len(v) < 2: continue
                elif k == 'city':
                    v = str(v).strip()[:100]
                elif k == 'bio':
                    v = str(v).strip()[:600]
                elif k == 'job':
                    v = str(v).strip()[:60]
                elif k == 'education':
                    v = str(v).strip()[:100]
                elif k == 'age':
                    try: v = max(18, min(100, int(v)))
                    except (ValueError, TypeError): continue
                elif k == 'height':
                    try: v = max(100, min(250, int(v))) if v else None
                    except (ValueError, TypeError): continue
                elif k == 'search_radius':
                    try: v = max(1, min(500, int(v)))
                    except (ValueError, TypeError): continue
                elif k == 'search_age_min':
                    try: v = max(18, min(99, int(v)))
                    except (ValueError, TypeError): continue
                elif k == 'search_age_max':
                    try: v = max(18, min(99, int(v)))
                    except (ValueError, TypeError): continue
                elif k == 'search_gender':
                    if v not in ALLOWED_GENDERS: continue
                elif k == 'tags':
                    if not isinstance(v, list): v = []
                    v = [str(t)[:30] for t in v[:20]]
                updates[k] = v

            if not updates:
                return err('Нет полей для обновления')

            set_parts = []
            values = []
            for k, v in updates.items():
                if k == 'tags':
                    set_parts.append(f"{k} = %s::text[]")
                else:
                    set_parts.append(f"{k} = %s")
                values.append(v)
            set_parts.append("updated_at = NOW()")
            values.append(user_id)
            cur.execute(f"UPDATE spark_profiles SET {', '.join(set_parts)} WHERE user_id = %s", values)
            conn.commit()
            return ok({'ok': True})

        # ── Чужой профиль ─────────────────────────────────────────────────
        if action == 'get':
            target_id = params.get('user_id', '').strip()
            if not target_id:
                return err('Нет user_id')
            # Валидируем UUID формат
            if not re.match(r'^[0-9a-f-]{36}$', target_id):
                return err('Некорректный user_id')
            cur.execute("""
                SELECT p.user_id, p.name, p.age, p.gender, p.city, p.bio, p.photos, p.tags,
                       p.job, p.education, p.height, p.verified
                FROM spark_profiles p WHERE p.user_id = %s
            """, (target_id,))
            row = cur.fetchone()
            if not row:
                return err('Не найден', 404)
            return ok(profile_to_dict(row))

        return err('Unknown action', 404)

    except psycopg2.Error:
        try: conn.rollback()
        except Exception: pass
        return err('Ошибка базы данных', 500)
    except Exception:
        try: conn.rollback()
        except Exception: pass
        return err('Внутренняя ошибка сервера', 500)
    finally:
        try:
            cur.close()
            conn.close()
        except Exception:
            pass