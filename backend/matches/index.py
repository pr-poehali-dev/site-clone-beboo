"""
Мэтчи и сообщения: список мэтчей, история, отправка текста и фото.
Роутинг: ?action=list|messages|send|send_image&match_id=...
"""
import json
import os
import base64
import uuid
from datetime import datetime, timezone
import re
import psycopg2
import boto3

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
}

BANNED_RE = re.compile(
    r'\b(tg|vk|vк|тг|тгк|телег\w*|телеграм\w*|вконтакт\w*|инстаграм\w*|инста\b|ватсап\w*|вайбер\w*|скайп\w*|дискорд\w*|twitter|facebook|whatsapp|viber|snapchat|тикток|tiktok|онлифанс|onlyfans|блядь|бляд[ьъ]|пизд[аеёиоуы]\w*|хуй|хую|хуе|хуя|еб[аё]\w*|нахуй|пиздец|заебал|ебать|ёбать|залупа|мудак|мудил|долбоёб|долбоеб|шлюх[аи]|проститутк[аи]|сука\b|гандон|пидор|пидар)\b',
    re.IGNORECASE
)
CONTACTS_RE = re.compile(
    r'(@[\w.]+|https?://|www\.|t\.me/|vk\.com/|instagram\.com/|\+?[78][\s.(]?\d{3}|whatsapp|telegram)',
    re.IGNORECASE
)
PHONE_RE = re.compile(r'\b(\d[\s\-()]{0,3}){7,}\d\b')

def check_message(text: str):
    if BANNED_RE.search(text):
        return 'Сообщение содержит запрещённые слова или упоминания мессенджеров'
    if CONTACTS_RE.search(text):
        return 'Контакты и ссылки запрещены — общайтесь только внутри приложения'
    if PHONE_RE.search(text):
        return 'Телефонные номера запрещены — общайтесь только внутри приложения'
    return None

def get_db():
    return psycopg2.connect(os.environ['DATABASE_URL'], options=f"-c search_path={os.environ['MAIN_DB_SCHEMA']}")

def get_user_id(cur, token):
    cur.execute("SELECT user_id FROM spark_sessions WHERE token = %s AND expires_at > NOW()", (token,))
    row = cur.fetchone()
    return row[0] if row else None

def check_match(cur, match_id, user_id):
    cur.execute("SELECT id FROM spark_matches WHERE id = %s AND (user1_id = %s OR user2_id = %s)", (match_id, user_id, user_id))
    return bool(cur.fetchone())

def msg_dict(m, user_id):
    return {
        'id': str(m[0]), 'sender_id': str(m[1]),
        'text': m[2] or '', 'image_url': m[3],
        'msg_type': m[4] or 'text', 'read': m[5],
        'created_at': m[6].isoformat(), 'is_mine': str(m[1]) == str(user_id),
    }

def handler(event: dict, context) -> dict:
    """Мэтчи, сообщения, чат"""
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
        # Ensure spark_blocks table exists
        cur.execute("""
            CREATE TABLE IF NOT EXISTS spark_blocks (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                blocker_id UUID NOT NULL,
                blocked_id UUID NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                UNIQUE(blocker_id, blocked_id)
            )
        """)
        conn.commit()

        user_id = get_user_id(cur, token)
        if not user_id:
            return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Не авторизован'})}

        if action == 'list':
            # Оптимизированный запрос — один JOIN вместо N+1 SELECT в цикле
            cur.execute("""
                SELECT
                    m.id AS match_id,
                    CASE WHEN m.user1_id = %s THEN m.user2_id ELSE m.user1_id END AS other_id,
                    m.created_at AS matched_at,
                    last_msg.text AS last_text,
                    last_msg.msg_type AS last_type,
                    last_msg.created_at AS last_time,
                    COALESCE(unread.cnt, 0) AS unread_count,
                    p.name, p.photos, p.age, p.verified, p.is_premium, p.online_at
                FROM spark_matches m
                JOIN spark_profiles p ON p.user_id = (
                    CASE WHEN m.user1_id = %s THEN m.user2_id ELSE m.user1_id END
                )
                LEFT JOIN LATERAL (
                    SELECT text, msg_type, created_at
                    FROM spark_messages
                    WHERE match_id = m.id
                    ORDER BY created_at DESC LIMIT 1
                ) last_msg ON TRUE
                LEFT JOIN LATERAL (
                    SELECT COUNT(*) AS cnt
                    FROM spark_messages
                    WHERE match_id = m.id AND sender_id != %s AND read = FALSE
                ) unread ON TRUE
                WHERE m.user1_id = %s OR m.user2_id = %s
                ORDER BY COALESCE(last_msg.created_at, m.created_at) DESC
            """, (user_id, user_id, user_id, user_id, user_id))
            rows = cur.fetchall()
            result = []
            for r in rows:
                match_id, other_id, matched_at, last_text, last_type, last_time, unread, name, photos, age, verified, is_premium, online_at = r
                online = False
                if online_at:
                    try:
                        delta = datetime.now(timezone.utc) - online_at.replace(tzinfo=timezone.utc)
                        online = delta.total_seconds() < 300
                    except Exception:
                        pass
                fixed_photos = [url.replace('/files/spark/', '/bucket/spark/') for url in (photos or [])]
                preview = '📷 Фото' if last_type == 'image' else (last_text or '')
                result.append({
                    'match_id': str(match_id), 'other_user_id': str(other_id),
                    'name': name, 'photo': (fixed_photos or [''])[0], 'age': age,
                    'verified': bool(verified), 'is_premium': bool(is_premium),
                    'matched_at': matched_at.isoformat(),
                    'last_message': preview,
                    'last_time': last_time.isoformat() if last_time else None,
                    'unread': int(unread), 'online': online,
                })
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'matches': result})}

        if action == 'messages':
            match_id = params.get('match_id', '')
            if not check_match(cur, match_id, user_id):
                return {'statusCode': 403, 'headers': CORS, 'body': json.dumps({'error': 'Нет доступа'})}
            cur.execute("SELECT id, sender_id, text, image_url, msg_type, read, created_at FROM spark_messages WHERE match_id = %s ORDER BY created_at ASC", (match_id,))
            msgs = cur.fetchall()
            cur.execute("UPDATE spark_messages SET read = TRUE, read_at = NOW() WHERE match_id = %s AND sender_id != %s AND read = FALSE", (match_id, user_id))
            # Обновляем online_at при чтении сообщений
            cur.execute("UPDATE spark_profiles SET online_at = NOW() WHERE user_id = %s", (user_id,))
            conn.commit()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'messages': [msg_dict(m, user_id) for m in msgs]})}

        # ── Typing indicator ──────────────────────────────────────────────
        if action == 'typing' and method == 'POST':
            body = json.loads(event.get('body') or '{}')
            match_id = body.get('match_id', '')
            if not check_match(cur, match_id, user_id):
                return {'statusCode': 403, 'headers': CORS, 'body': json.dumps({'error': 'Нет доступа'})}
            # Обновляем онлайн при наборе
            cur.execute("UPDATE spark_profiles SET online_at = NOW() WHERE user_id = %s", (user_id,))
            conn.commit()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True})}

        # ── Online ping ───────────────────────────────────────────────────
        if action == 'ping' and method == 'POST':
            cur.execute("UPDATE spark_profiles SET online_at = NOW() WHERE user_id = %s", (user_id,))
            conn.commit()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True})}

        # ── Unmatch (удалить мэтч) ─────────────────────────────────────────
        if action == 'unmatch' and method == 'POST':
            body = json.loads(event.get('body') or '{}')
            match_id = body.get('match_id', '')
            if not check_match(cur, match_id, user_id):
                return {'statusCode': 403, 'headers': CORS, 'body': json.dumps({'error': 'Нет доступа'})}
            cur.execute("DELETE FROM spark_messages WHERE match_id = %s", (match_id,))
            cur.execute("DELETE FROM spark_matches WHERE id = %s", (match_id,))
            conn.commit()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True})}

        # ── Блокировка пользователя ────────────────────────────────────────
        if action == 'block' and method == 'POST':
            body = json.loads(event.get('body') or '{}')
            target_id = body.get('target_id', '')
            if not target_id:
                return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Нет target_id'})}
            cur.execute("INSERT INTO spark_blocks (blocker_id, blocked_id) VALUES (%s, %s) ON CONFLICT DO NOTHING", (user_id, target_id))
            # Удаляем все мэтчи между ними
            u1, u2 = sorted([str(user_id), str(target_id)])
            cur.execute("SELECT id FROM spark_matches WHERE user1_id = %s AND user2_id = %s", (u1, u2))
            match_row = cur.fetchone()
            if match_row:
                cur.execute("DELETE FROM spark_messages WHERE match_id = %s", (match_row[0],))
                cur.execute("DELETE FROM spark_matches WHERE id = %s", (match_row[0],))
            conn.commit()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True})}

        # ── Typing status check ────────────────────────────────────────────
        if action == 'typing_status':
            match_id = params.get('match_id', '')
            if not check_match(cur, match_id, user_id):
                return {'statusCode': 403, 'headers': CORS, 'body': json.dumps({'error': 'Нет доступа'})}
            cur.execute("""
                SELECT p.user_id, p.online_at FROM spark_matches m
                JOIN spark_profiles p ON p.user_id = (
                    CASE WHEN m.user1_id = %s THEN m.user2_id ELSE m.user1_id END
                )
                WHERE m.id = %s
            """, (user_id, match_id))
            row = cur.fetchone()
            typing = False
            if row and row[1]:
                from datetime import datetime, timezone
                delta = (datetime.now(timezone.utc) - row[1].replace(tzinfo=timezone.utc)).total_seconds()
                typing = delta < 5
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'typing': typing})}

        if action == 'send' and method == 'POST':
            body = json.loads(event.get('body') or '{}')
            match_id = body.get('match_id')
            text = body.get('text', '').strip()
            if not match_id or not text:
                return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Нет данных'})}
            if not check_match(cur, match_id, user_id):
                return {'statusCode': 403, 'headers': CORS, 'body': json.dumps({'error': 'Нет доступа'})}
            # Антиспам: макс 10 сообщений в минуту
            cur.execute("SELECT COUNT(*) FROM spark_messages WHERE sender_id = %s AND created_at > NOW() - INTERVAL '1 minute'", (user_id,))
            msg_rate = cur.fetchone()[0]
            if msg_rate >= 10:
                return {'statusCode': 429, 'headers': CORS, 'body': json.dumps({'error': 'Слишком много сообщений. Подождите немного.'})}

            violation = check_message(text)
            if violation:
                return {'statusCode': 422, 'headers': CORS, 'body': json.dumps({'error': violation})}
            cur.execute("INSERT INTO spark_messages (match_id, sender_id, text, msg_type) VALUES (%s, %s, %s, 'text') RETURNING id, created_at", (match_id, user_id, text))
            row = cur.fetchone()
            cur.execute("UPDATE spark_profiles SET online_at = NOW() WHERE user_id = %s", (user_id,))
            # Уведомление о новом сообщении
            cur.execute("SELECT CASE WHEN user1_id = %s THEN user2_id ELSE user1_id END FROM spark_matches WHERE id = %s", (user_id, match_id))
            other_row = cur.fetchone()
            if other_row:
                cur.execute("SELECT name FROM spark_profiles WHERE user_id = %s", (user_id,))
                sender_name = (cur.fetchone() or ('',))[0]
                preview = text[:50] + ('...' if len(text) > 50 else '')
                cur.execute("INSERT INTO spark_notifications (user_id, type, title, body) VALUES (%s, 'message', %s, %s)",
                    (other_row[0], f'Сообщение от {sender_name}', preview))
            conn.commit()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps(msg_dict((row[0], user_id, text, None, 'text', False, row[1]), user_id))}

        if action == 'send_image' and method == 'POST':
            body = json.loads(event.get('body') or '{}')
            match_id = body.get('match_id')
            data_url = body.get('data', '')
            if not match_id or not data_url:
                return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Нет данных'})}
            if not check_match(cur, match_id, user_id):
                return {'statusCode': 403, 'headers': CORS, 'body': json.dumps({'error': 'Нет доступа'})}

            if ',' in data_url:
                header, b64 = data_url.split(',', 1)
                ext = 'png' if 'png' in header else 'jpg'
            else:
                b64, ext = data_url, 'jpg'
            img_bytes = base64.b64decode(b64)
            if len(img_bytes) > 15 * 1024 * 1024:
                return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Файл слишком большой'})}

            key = f"spark/chat/{match_id}/{uuid.uuid4()}.{ext}"
            s3 = boto3.client('s3', endpoint_url='https://bucket.poehali.dev',
                              aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
                              aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'])
            s3.put_object(Bucket='files', Key=key, Body=img_bytes, ContentType=f'image/{ext}')
            image_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"

            cur.execute("INSERT INTO spark_messages (match_id, sender_id, text, image_url, msg_type) VALUES (%s, %s, '', %s, 'image') RETURNING id, created_at", (match_id, user_id, image_url))
            row = cur.fetchone()
            conn.commit()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps(msg_dict((row[0], user_id, '', image_url, 'image', False, row[1]), user_id))}

        return {'statusCode': 404, 'headers': CORS, 'body': json.dumps({'error': 'Unknown action'})}

    finally:
        cur.close()
        conn.close()