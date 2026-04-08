"""
Лайки, буст, избранные, trial.
Роутинг: ?action=like|pass|incoming|boost|favorite|unfavorite|favorites|trial
"""
import json
import os
import psycopg2

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
}

def get_db():
    return psycopg2.connect(os.environ['DATABASE_URL'], options=f"-c search_path={os.environ['MAIN_DB_SCHEMA']}")

def get_user_id(cur, token):
    cur.execute("SELECT user_id FROM spark_sessions WHERE token = %s AND expires_at > NOW()", (token,))
    row = cur.fetchone()
    return row[0] if row else None

def fix_photos(photos):
    return [url.replace('/files/spark/', '/bucket/spark/') for url in (photos or [])]

def handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    params = event.get('queryStringParameters') or {}
    action = params.get('action', '')
    method = event.get('httpMethod', 'GET')
    token = (event.get('headers') or {}).get('x-auth-token') or (event.get('headers') or {}).get('X-Auth-Token', '')

    conn = get_db()
    cur = conn.cursor()

    try:
        user_id = get_user_id(cur, token)
        if not user_id:
            return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Не авторизован'})}

        # ── Лайк ────────────────────────────────────────────────────────
        if action == 'like' and method == 'POST':
            body = json.loads(event.get('body') or '{}')
            to_id = body.get('to_user_id')
            is_super = body.get('is_super', False)
            if not to_id:
                return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Нет to_user_id'})}
            cur.execute("INSERT INTO spark_likes (from_user_id, to_user_id, is_super) VALUES (%s, %s, %s) ON CONFLICT DO NOTHING", (user_id, to_id, is_super))
            cur.execute("SELECT id FROM spark_likes WHERE from_user_id = %s AND to_user_id = %s", (to_id, user_id))
            mutual = cur.fetchone()
            match_id = None
            is_match = False
            if mutual:
                u1, u2 = sorted([str(user_id), str(to_id)])
                cur.execute("INSERT INTO spark_matches (user1_id, user2_id) VALUES (%s, %s) ON CONFLICT DO NOTHING RETURNING id", (u1, u2))
                row = cur.fetchone()
                if row:
                    match_id = str(row[0])
                    is_match = True
                else:
                    cur.execute("SELECT id FROM spark_matches WHERE user1_id = %s AND user2_id = %s", (u1, u2))
                    r = cur.fetchone()
                    if r:
                        match_id = str(r[0])
                        is_match = True
            conn.commit()
            cur.execute("SELECT name, photos FROM spark_profiles WHERE user_id = %s", (to_id,))
            p = cur.fetchone()
            photos = fix_photos(p[1]) if p else []
            profile_info = {'name': p[0], 'photo': (photos or [''])[0]} if p else {}
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'is_match': is_match, 'match_id': match_id, 'profile': profile_info})}

        # ── Пропуск ─────────────────────────────────────────────────────
        if action == 'pass' and method == 'POST':
            body = json.loads(event.get('body') or '{}')
            to_id = body.get('to_user_id')
            if not to_id:
                return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Нет to_user_id'})}
            cur.execute("INSERT INTO spark_likes (from_user_id, to_user_id, is_super) VALUES (%s, %s, FALSE) ON CONFLICT DO NOTHING", (user_id, to_id))
            conn.commit()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True})}

        # ── Входящие лайки ──────────────────────────────────────────────
        if action == 'incoming':
            cur.execute("""
                SELECT l.from_user_id, p.name, p.photos, p.age, l.is_super, l.created_at
                FROM spark_likes l JOIN spark_profiles p ON p.user_id = l.from_user_id
                WHERE l.to_user_id = %s
                  AND l.from_user_id NOT IN (SELECT to_user_id FROM spark_likes WHERE from_user_id = %s)
                ORDER BY l.created_at DESC LIMIT 50
            """, (user_id, user_id))
            rows = cur.fetchall()
            result = [{'user_id': str(r[0]), 'name': r[1], 'photo': (fix_photos(r[2]) or [''])[0], 'age': r[3], 'is_super': r[4], 'created_at': r[5].isoformat()} for r in rows]
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'likes': result})}

        # ── Буст (поднять профиль в выдаче) ─────────────────────────────
        if action == 'boost' and method == 'POST':
            cur.execute("SELECT COUNT(*) FROM spark_boosts WHERE user_id = %s AND created_at > NOW() - INTERVAL '30 days'", (user_id,))
            used = cur.fetchone()[0]
            cur.execute("SELECT is_premium FROM spark_profiles WHERE user_id = %s", (user_id,))
            pr = cur.fetchone()
            is_premium = pr[0] if pr else False
            limit = 5 if is_premium else 1
            if used >= limit:
                return {'statusCode': 429, 'headers': CORS, 'body': json.dumps({'error': 'Лимит бустов исчерпан', 'used': used, 'limit': limit})}
            cur.execute("SELECT value FROM spark_settings WHERE key = 'boost_duration_min'")
            dur_row = cur.fetchone()
            dur = int(dur_row[0]) if dur_row else 30
            cur.execute("INSERT INTO spark_boosts (user_id, expires_at) VALUES (%s, NOW() + %s * INTERVAL '1 minute') RETURNING id, expires_at", (user_id, dur))
            boost = cur.fetchone()
            cur.execute("UPDATE spark_profiles SET online_at = NOW() WHERE user_id = %s", (user_id,))
            conn.commit()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({
                'ok': True, 'boost_id': str(boost[0]), 'expires_at': boost[1].isoformat(),
                'used': used + 1, 'limit': limit, 'duration_min': dur,
            })}

        # ── Избранные: добавить ──────────────────────────────────────────
        if action == 'favorite' and method == 'POST':
            body = json.loads(event.get('body') or '{}')
            target_id = body.get('target_id')
            if not target_id:
                return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Нет target_id'})}
            cur.execute("INSERT INTO spark_favorites (user_id, target_id) VALUES (%s, %s) ON CONFLICT DO NOTHING", (user_id, target_id))
            conn.commit()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True})}

        # ── Избранные: удалить ───────────────────────────────────────────
        if action == 'unfavorite' and method == 'POST':
            body = json.loads(event.get('body') or '{}')
            target_id = body.get('target_id')
            if not target_id:
                return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Нет target_id'})}
            cur.execute("DELETE FROM spark_favorites WHERE user_id = %s AND target_id = %s", (user_id, target_id))
            conn.commit()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True})}

        # ── Список избранных ─────────────────────────────────────────────
        if action == 'favorites':
            cur.execute("""
                SELECT f.target_id, p.name, p.photos, p.age, p.city, p.verified, p.bio, f.created_at
                FROM spark_favorites f
                JOIN spark_profiles p ON p.user_id = f.target_id
                WHERE f.user_id = %s
                ORDER BY f.created_at DESC LIMIT 50
            """, (user_id,))
            rows = cur.fetchall()
            result = [{
                'user_id': str(r[0]), 'name': r[1], 'photo': (fix_photos(r[2]) or [''])[0],
                'age': r[3], 'city': r[4], 'verified': r[5], 'bio': r[6] or '',
                'created_at': r[7].isoformat(),
            } for r in rows]
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'favorites': result})}

        # ── Trial Premium ────────────────────────────────────────────────
        if action == 'trial' and method == 'POST':
            cur.execute("SELECT trial_used FROM spark_users WHERE id = %s", (user_id,))
            row = cur.fetchone()
            if row and row[0]:
                return {'statusCode': 409, 'headers': CORS, 'body': json.dumps({'error': 'Триал уже использован'})}
            cur.execute("SELECT value FROM spark_settings WHERE key = 'trial_enabled'")
            te = cur.fetchone()
            if not te or te[0] != 'true':
                return {'statusCode': 403, 'headers': CORS, 'body': json.dumps({'error': 'Триал отключён'})}
            cur.execute("SELECT value FROM spark_settings WHERE key = 'trial_days'")
            td = cur.fetchone()
            days = int(td[0]) if td else 3
            cur.execute("UPDATE spark_profiles SET is_premium = TRUE WHERE user_id = %s", (user_id,))
            cur.execute("UPDATE spark_users SET trial_used = TRUE WHERE id = %s", (user_id,))
            cur.execute("INSERT INTO spark_subscriptions (user_id, plan, price, status, expires_at) VALUES (%s, 'trial', 0, 'active', NOW() + %s * INTERVAL '1 day')", (user_id, days))
            conn.commit()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True, 'days': days})}

        # ── Отмена последнего свайпа (undo) ─────────────────────────────
        if action == 'undo' and method == 'POST':
            cur.execute("SELECT is_premium FROM spark_profiles WHERE user_id = %s", (user_id,))
            pr = cur.fetchone()
            if not pr or not pr[0]:
                return {'statusCode': 403, 'headers': CORS, 'body': json.dumps({'error': 'Только для Premium'})}
            cur.execute("""
                SELECT to_user_id FROM spark_likes
                WHERE from_user_id = %s
                ORDER BY created_at DESC LIMIT 1
            """, (user_id,))
            last = cur.fetchone()
            if not last:
                return {'statusCode': 404, 'headers': CORS, 'body': json.dumps({'error': 'Нечего отменять'})}
            to_id = last[0]
            cur.execute("UPDATE spark_likes SET created_at = '2000-01-01' WHERE from_user_id = %s AND to_user_id = %s", (user_id, to_id))
            u1, u2 = sorted([str(user_id), str(to_id)])
            cur.execute("UPDATE spark_matches SET created_at = '2000-01-01' WHERE user1_id = %s AND user2_id = %s", (u1, u2))
            cur.execute("SELECT p.user_id, p.name, p.photos, p.age, p.city, p.bio, p.tags, p.job, p.education, p.height, p.verified FROM spark_profiles p WHERE p.user_id = %s", (to_id,))
            row = cur.fetchone()
            conn.commit()
            profile = None
            if row:
                profile = {
                    'user_id': str(row[0]), 'name': row[1],
                    'photos': fix_photos(row[2]), 'age': row[3], 'city': row[4],
                    'bio': row[5] or '', 'tags': row[6] or [], 'job': row[7] or '',
                    'education': row[8] or '', 'height': row[9], 'verified': row[10], 'online': False,
                }
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True, 'restored_profile': profile})}

        # ── Записать просмотр профиля ────────────────────────────────────
        if action == 'view' and method == 'POST':
            body = json.loads(event.get('body') or '{}')
            target_id = body.get('target_id')
            if not target_id or str(target_id) == str(user_id):
                return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Нет target_id'})}
            # Инкогнито: не записывать если смотрящий скрыт
            cur.execute("SELECT incognito FROM spark_profiles WHERE user_id = %s", (user_id,))
            inc = cur.fetchone()
            if not inc or not inc[0]:
                cur.execute("INSERT INTO spark_profile_views (viewer_id, target_id) VALUES (%s, %s)", (user_id, target_id))
                conn.commit()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True})}

        # ── Кто просматривал мой профиль (Premium) ──────────────────────
        if action == 'my_viewers':
            cur.execute("SELECT is_premium FROM spark_profiles WHERE user_id = %s", (user_id,))
            pr = cur.fetchone()
            if not pr or not pr[0]:
                cur.execute("SELECT COUNT(*) FROM spark_profile_views WHERE target_id = %s AND created_at > NOW() - INTERVAL '7 days'", (user_id,))
                cnt = cur.fetchone()[0]
                return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'locked': True, 'count': cnt, 'viewers': []})}
            cur.execute("""
                SELECT DISTINCT ON (v.viewer_id) v.viewer_id, p.name, p.photos, p.age, p.city, p.verified, v.created_at
                FROM spark_profile_views v
                JOIN spark_profiles p ON p.user_id = v.viewer_id
                WHERE v.target_id = %s AND v.created_at > NOW() - INTERVAL '7 days'
                ORDER BY v.viewer_id, v.created_at DESC
                LIMIT 30
            """, (user_id,))
            rows = cur.fetchall()
            viewers = [{
                'user_id': str(r[0]), 'name': r[1],
                'photo': (fix_photos(r[2]) or [''])[0],
                'age': r[3], 'city': r[4], 'verified': r[5],
                'viewed_at': r[6].isoformat(),
            } for r in rows]
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'locked': False, 'count': len(viewers), 'viewers': viewers})}

        # ── Переключить инкогнито ────────────────────────────────────────
        if action == 'incognito' and method == 'POST':
            cur.execute("SELECT is_premium FROM spark_profiles WHERE user_id = %s", (user_id,))
            pr = cur.fetchone()
            if not pr or not pr[0]:
                return {'statusCode': 403, 'headers': CORS, 'body': json.dumps({'error': 'Только для Premium'})}
            body = json.loads(event.get('body') or '{}')
            enabled = body.get('enabled', True)
            cur.execute("UPDATE spark_profiles SET incognito = %s WHERE user_id = %s", (enabled, user_id))
            conn.commit()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True, 'incognito': enabled})}

        # ── Статус инкогнито ─────────────────────────────────────────────
        if action == 'incognito_status':
            cur.execute("SELECT incognito, is_premium FROM spark_profiles WHERE user_id = %s", (user_id,))
            row = cur.fetchone()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({
                'incognito': row[0] if row else False,
                'is_premium': row[1] if row else False,
            })}

        # ── Пожаловаться на пользователя ────────────────────────────────
        if action == 'report' and method == 'POST':
            body = json.loads(event.get('body') or '{}')
            to_id = body.get('to_user_id')
            reason = body.get('reason', 'Нарушение правил').strip()
            if not to_id or not reason:
                return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Нет данных'})}
            # Проверяем не дублируем
            cur.execute("SELECT id FROM spark_reports WHERE from_user_id = %s AND to_user_id = %s AND status = 'open'", (user_id, to_id))
            if cur.fetchone():
                return {'statusCode': 409, 'headers': CORS, 'body': json.dumps({'error': 'Жалоба уже отправлена'})}
            cur.execute("INSERT INTO spark_reports (from_user_id, to_user_id, reason, status) VALUES (%s, %s, %s, 'open')", (user_id, to_id, reason))
            conn.commit()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True})}

        # ── Действия ботов (вызывается без токена, по секретному ключу) ────
        if action == 'bot_run' and method == 'POST':
            import random
            bot_key = (event.get('headers') or {}).get('x-bot-key', '')
            expected_key = os.environ.get('ADMIN_KEY', 'sparkladmin2024')
            if bot_key != expected_key:
                return {'statusCode': 403, 'headers': CORS, 'body': json.dumps({'error': 'Forbidden'})}

            cur.execute("SELECT value FROM spark_settings WHERE key = 'bot_enabled'")
            row = cur.fetchone()
            if not row or row[0] != 'true':
                return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True, 'skipped': 'bots disabled'})}

            # Получаем ID ботов
            cur.execute("SELECT id FROM spark_users WHERE is_bot = TRUE LIMIT 10")
            bot_ids = [r[0] for r in cur.fetchall()]
            if not bot_ids:
                return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True, 'skipped': 'no bots'})}

            # Получаем реальных пользователей (не ботов)
            cur.execute("""
                SELECT u.id FROM spark_users u
                JOIN spark_profiles p ON p.user_id = u.id
                WHERE u.is_bot = FALSE
                AND array_length(p.photos, 1) > 0
                AND u.created_at > NOW() - INTERVAL '30 days'
                ORDER BY RANDOM() LIMIT 20
            """)
            real_users = [r[0] for r in cur.fetchall()]
            if not real_users:
                return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True, 'skipped': 'no real users'})}

            stats = {'likes': 0, 'views': 0, 'messages': 0, 'matches': 0}

            for bot_id in random.sample(bot_ids, min(3, len(bot_ids))):
                bot_targets = random.sample(real_users, min(3, len(real_users)))
                for target_id in bot_targets:
                    # Записываем просмотр
                    cur.execute("INSERT INTO spark_profile_views (viewer_id, target_id) VALUES (%s, %s)", (bot_id, target_id))
                    stats['views'] += 1

                    # Ставим лайк (если ещё не лайкали)
                    cur.execute("SELECT 1 FROM spark_likes WHERE from_user_id = %s AND to_user_id = %s", (bot_id, target_id))
                    if not cur.fetchone():
                        cur.execute("INSERT INTO spark_likes (from_user_id, to_user_id, is_super) VALUES (%s, %s, FALSE) ON CONFLICT DO NOTHING", (bot_id, target_id))
                        stats['likes'] += 1

                        # Проверяем взаимный лайк → создаём мэтч
                        cur.execute("SELECT 1 FROM spark_likes WHERE from_user_id = %s AND to_user_id = %s", (target_id, bot_id))
                        if cur.fetchone():
                            u1, u2 = sorted([str(bot_id), str(target_id)])
                            cur.execute("""
                                INSERT INTO spark_matches (user1_id, user2_id)
                                VALUES (%s::uuid, %s::uuid)
                                ON CONFLICT DO NOTHING
                                RETURNING id
                            """, (u1, u2))
                            match_row = cur.fetchone()
                            if match_row:
                                stats['matches'] += 1
                                # Бот пишет приветственное сообщение
                                greetings = [
                                    'Привет! Рад нашему знакомству 😊',
                                    'Привет! Как дела?',
                                    'Привет! Интересный профиль у тебя 👋',
                                    'Привет! Мы мэтч! Как ты? 😊',
                                    'Привет! Рада познакомиться ✨',
                                ]
                                cur.execute("""
                                    INSERT INTO spark_messages (match_id, sender_id, text, msg_type)
                                    VALUES (%s, %s, %s, 'text')
                                """, (match_row[0], bot_id, random.choice(greetings)))
                                stats['messages'] += 1

            # Обновляем online_at ботов
            for bot_id in bot_ids:
                cur.execute("UPDATE spark_profiles SET online_at = NOW() WHERE user_id = %s", (bot_id,))

            conn.commit()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True, 'stats': stats})}

        return {'statusCode': 404, 'headers': CORS, 'body': json.dumps({'error': 'Unknown action'})}

    finally:
        cur.close()
        conn.close()