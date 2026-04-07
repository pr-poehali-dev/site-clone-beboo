"""
Лайки: поставить лайк/пропустить, получить кто лайкнул тебя, взаимные лайки создают мэтч.
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

        # POST /like — поставить лайк
        if method == 'POST' and path.endswith('/like'):
            body = json.loads(event.get('body') or '{}')
            to_id = body.get('to_user_id')
            is_super = body.get('is_super', False)

            if not to_id:
                return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Не указан to_user_id'})}

            cur.execute(
                "INSERT INTO spark_likes (from_user_id, to_user_id, is_super) VALUES (%s, %s, %s) ON CONFLICT DO NOTHING",
                (user_id, to_id, is_super)
            )

            cur.execute(
                "SELECT id FROM spark_likes WHERE from_user_id = %s AND to_user_id = %s",
                (to_id, user_id)
            )
            mutual = cur.fetchone()
            match_id = None
            is_match = False

            if mutual:
                u1, u2 = (str(user_id), str(to_id)) if str(user_id) < str(to_id) else (str(to_id), str(user_id))
                cur.execute(
                    "INSERT INTO spark_matches (user1_id, user2_id) VALUES (%s, %s) ON CONFLICT DO NOTHING RETURNING id",
                    (u1, u2)
                )
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

            cur.execute(
                "SELECT name, photos FROM spark_profiles WHERE user_id = %s",
                (to_id,)
            )
            p = cur.fetchone()
            profile_info = {'name': p[0], 'photo': (p[1] or [''])[0]} if p else {}

            return {
                'statusCode': 200,
                'headers': CORS,
                'body': json.dumps({'is_match': is_match, 'match_id': match_id, 'profile': profile_info})
            }

        # POST /pass — пропустить
        if method == 'POST' and path.endswith('/pass'):
            body = json.loads(event.get('body') or '{}')
            to_id = body.get('to_user_id')
            if not to_id:
                return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Не указан to_user_id'})}
            cur.execute(
                "INSERT INTO spark_likes (from_user_id, to_user_id, is_super) VALUES (%s, %s, FALSE) ON CONFLICT DO NOTHING",
                (user_id, to_id)
            )
            conn.commit()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True})}

        # GET /incoming — кто лайкнул тебя
        if method == 'GET' and path.endswith('/incoming'):
            cur.execute("""
                SELECT l.from_user_id, p.name, p.photos, p.age, l.is_super, l.created_at
                FROM spark_likes l
                JOIN spark_profiles p ON p.user_id = l.from_user_id
                WHERE l.to_user_id = %s
                  AND l.from_user_id NOT IN (
                      SELECT to_user_id FROM spark_likes WHERE from_user_id = %s
                  )
                ORDER BY l.created_at DESC
                LIMIT 50
            """, (user_id, user_id))
            rows = cur.fetchall()
            result = [
                {'user_id': str(r[0]), 'name': r[1], 'photo': (r[2] or [''])[0],
                 'age': r[3], 'is_super': r[4], 'created_at': r[5].isoformat()}
                for r in rows
            ]
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'likes': result})}

        return {'statusCode': 404, 'headers': CORS, 'body': json.dumps({'error': 'Not found'})}

    finally:
        cur.close()
        conn.close()
