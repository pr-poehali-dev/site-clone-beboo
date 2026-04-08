"""
Мэтчи и сообщения: список мэтчей, история, отправка текста и фото.
Роутинг: ?action=list|messages|send|send_image&match_id=...
"""
import json
import os
import base64
import uuid
from datetime import datetime, timezone
import psycopg2
import boto3

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

        if action == 'list':
            cur.execute("""
                SELECT m.id,
                    CASE WHEN m.user1_id = %s THEN m.user2_id ELSE m.user1_id END AS other_id,
                    m.created_at,
                    (SELECT text FROM spark_messages WHERE match_id = m.id ORDER BY created_at DESC LIMIT 1),
                    (SELECT msg_type FROM spark_messages WHERE match_id = m.id ORDER BY created_at DESC LIMIT 1),
                    (SELECT created_at FROM spark_messages WHERE match_id = m.id ORDER BY created_at DESC LIMIT 1),
                    (SELECT COUNT(*) FROM spark_messages WHERE match_id = m.id AND sender_id != %s AND read = FALSE)
                FROM spark_matches m
                WHERE m.user1_id = %s OR m.user2_id = %s
                ORDER BY COALESCE(
                    (SELECT created_at FROM spark_messages WHERE match_id = m.id ORDER BY created_at DESC LIMIT 1),
                    m.created_at
                ) DESC
            """, (user_id, user_id, user_id, user_id))
            rows = cur.fetchall()
            result = []
            for r in rows:
                match_id, other_id, matched_at, last_msg, last_type, last_time, unread = r
                cur.execute("SELECT name, photos, age, verified, is_premium, online_at FROM spark_profiles WHERE user_id = %s", (other_id,))
                p = cur.fetchone()
                if not p:
                    continue
                online = False
                if p[5]:
                    try:
                        delta = datetime.now(timezone.utc) - p[5].replace(tzinfo=timezone.utc)
                        online = delta.total_seconds() < 300
                    except Exception:
                        pass
                preview = '📷 Фото' if last_type == 'image' else (last_msg or '')
                result.append({
                    'match_id': str(match_id), 'other_user_id': str(other_id),
                    'name': p[0], 'photo': (p[1] or [''])[0], 'age': p[2],
                    'verified': p[3], 'is_premium': p[4],
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
            cur.execute("UPDATE spark_messages SET read = TRUE WHERE match_id = %s AND sender_id != %s AND read = FALSE", (match_id, user_id))
            conn.commit()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'messages': [msg_dict(m, user_id) for m in msgs]})}

        if action == 'send' and method == 'POST':
            body = json.loads(event.get('body') or '{}')
            match_id = body.get('match_id')
            text = body.get('text', '').strip()
            if not match_id or not text:
                return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Нет данных'})}
            if not check_match(cur, match_id, user_id):
                return {'statusCode': 403, 'headers': CORS, 'body': json.dumps({'error': 'Нет доступа'})}
            cur.execute("INSERT INTO spark_messages (match_id, sender_id, text, msg_type) VALUES (%s, %s, %s, 'text') RETURNING id, created_at", (match_id, user_id, text))
            row = cur.fetchone()
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
            image_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/files/{key}"

            cur.execute("INSERT INTO spark_messages (match_id, sender_id, text, image_url, msg_type) VALUES (%s, %s, '', %s, 'image') RETURNING id, created_at", (match_id, user_id, image_url))
            row = cur.fetchone()
            conn.commit()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps(msg_dict((row[0], user_id, '', image_url, 'image', False, row[1]), user_id))}

        return {'statusCode': 404, 'headers': CORS, 'body': json.dumps({'error': 'Unknown action'})}

    finally:
        cur.close()
        conn.close()
