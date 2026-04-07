"""
Мэтчи и сообщения: список мэтчей, история сообщений, отправка сообщения.
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

def handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    path = event.get('path', '/')
    method = event.get('httpMethod', 'GET')
    token = event.get('headers', {}).get('x-auth-token') or event.get('headers', {}).get('X-Auth-Token', '')

    conn = get_db()
    cur = conn.cursor()

    try:
        user_id = get_user_id(cur, token)
        if not user_id:
            return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Не авторизован'})}

        # GET /list — все мэтчи
        if method == 'GET' and path.endswith('/list'):
            cur.execute("""
                SELECT
                    m.id,
                    CASE WHEN m.user1_id = %s THEN m.user2_id ELSE m.user1_id END AS other_id,
                    m.created_at,
                    (SELECT text FROM spark_messages WHERE match_id = m.id ORDER BY created_at DESC LIMIT 1) AS last_msg,
                    (SELECT created_at FROM spark_messages WHERE match_id = m.id ORDER BY created_at DESC LIMIT 1) AS last_time,
                    (SELECT COUNT(*) FROM spark_messages WHERE match_id = m.id AND sender_id != %s AND read = FALSE) AS unread
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
                match_id, other_id, matched_at, last_msg, last_time, unread = r
                cur.execute("SELECT name, photos, age, verified FROM spark_profiles WHERE user_id = %s", (other_id,))
                p = cur.fetchone()
                if p:
                    result.append({
                        'match_id': str(match_id),
                        'other_user_id': str(other_id),
                        'name': p[0],
                        'photo': (p[1] or [''])[0],
                        'age': p[2],
                        'verified': p[3],
                        'matched_at': matched_at.isoformat(),
                        'last_message': last_msg,
                        'last_time': last_time.isoformat() if last_time else None,
                        'unread': int(unread),
                        'online': True,
                    })
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'matches': result})}

        # GET /messages/<match_id>
        if method == 'GET' and '/messages/' in path:
            match_id = path.split('/messages/')[-1]
            cur.execute(
                "SELECT id FROM spark_matches WHERE id = %s AND (user1_id = %s OR user2_id = %s)",
                (match_id, user_id, user_id)
            )
            if not cur.fetchone():
                return {'statusCode': 403, 'headers': CORS, 'body': json.dumps({'error': 'Нет доступа'})}

            cur.execute(
                "SELECT id, sender_id, text, read, created_at FROM spark_messages WHERE match_id = %s ORDER BY created_at ASC",
                (match_id,)
            )
            msgs = cur.fetchall()

            cur.execute(
                "UPDATE spark_messages SET read = TRUE WHERE match_id = %s AND sender_id != %s AND read = FALSE",
                (match_id, user_id)
            )
            conn.commit()

            return {
                'statusCode': 200,
                'headers': CORS,
                'body': json.dumps({
                    'messages': [
                        {'id': str(m[0]), 'sender_id': str(m[1]), 'text': m[2], 'read': m[3], 'created_at': m[4].isoformat()}
                        for m in msgs
                    ]
                })
            }

        # POST /send
        if method == 'POST' and path.endswith('/send'):
            body = json.loads(event.get('body') or '{}')
            match_id = body.get('match_id')
            text = body.get('text', '').strip()

            if not match_id or not text:
                return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Нет match_id или текста'})}

            cur.execute(
                "SELECT id FROM spark_matches WHERE id = %s AND (user1_id = %s OR user2_id = %s)",
                (match_id, user_id, user_id)
            )
            if not cur.fetchone():
                return {'statusCode': 403, 'headers': CORS, 'body': json.dumps({'error': 'Нет доступа'})}

            cur.execute(
                "INSERT INTO spark_messages (match_id, sender_id, text) VALUES (%s, %s, %s) RETURNING id, created_at",
                (match_id, user_id, text)
            )
            row = cur.fetchone()
            conn.commit()

            return {
                'statusCode': 200,
                'headers': CORS,
                'body': json.dumps({
                    'id': str(row[0]),
                    'sender_id': str(user_id),
                    'text': text,
                    'created_at': row[1].isoformat(),
                    'read': False,
                })
            }

        return {'statusCode': 404, 'headers': CORS, 'body': json.dumps({'error': 'Not found'})}

    finally:
        cur.close()
        conn.close()
