"""
Аутентификация: регистрация, вход, проверка сессии, выход.
Роутинг через query-параметр ?action=register|login|me|logout
"""
import json
import os
import hashlib
import secrets
import psycopg2

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
}

def get_db():
    return psycopg2.connect(os.environ['DATABASE_URL'], options=f"-c search_path={os.environ['MAIN_DB_SCHEMA']}")

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    params = event.get('queryStringParameters') or {}
    action = params.get('action', '')
    body = json.loads(event.get('body') or '{}')
    method = event.get('httpMethod', 'GET')
    token = (event.get('headers') or {}).get('x-auth-token') or (event.get('headers') or {}).get('X-Auth-Token', '')

    conn = get_db()
    cur = conn.cursor()

    try:
        # register
        if action == 'register' and method == 'POST':
            email = body.get('email', '').strip().lower()
            password = body.get('password', '')
            name = body.get('name', '').strip()
            age = body.get('age', 18)
            gender = body.get('gender', 'other')

            if not email or not password or not name:
                return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Заполните все поля'})}
            if len(password) < 6:
                return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Пароль минимум 6 символов'})}

            cur.execute("SELECT id FROM spark_users WHERE email = %s", (email,))
            if cur.fetchone():
                return {'statusCode': 409, 'headers': CORS, 'body': json.dumps({'error': 'Email уже зарегистрирован'})}

            cur.execute("INSERT INTO spark_users (email, password_hash) VALUES (%s, %s) RETURNING id", (email, hash_password(password)))
            user_id = cur.fetchone()[0]
            cur.execute("INSERT INTO spark_profiles (user_id, name, age, gender) VALUES (%s, %s, %s, %s)", (user_id, name, age, gender))
            token_new = secrets.token_hex(32)
            cur.execute("INSERT INTO spark_sessions (user_id, token) VALUES (%s, %s)", (user_id, token_new))
            conn.commit()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'token': token_new, 'user_id': str(user_id), 'name': name})}

        # login
        if action == 'login' and method == 'POST':
            email = body.get('email', '').strip().lower()
            password = body.get('password', '')
            cur.execute("SELECT u.id, u.password_hash, p.name FROM spark_users u JOIN spark_profiles p ON p.user_id = u.id WHERE u.email = %s", (email,))
            row = cur.fetchone()
            if not row or row[1] != hash_password(password):
                return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Неверный email или пароль'})}
            user_id, _, name = row
            token_new = secrets.token_hex(32)
            cur.execute("INSERT INTO spark_sessions (user_id, token) VALUES (%s, %s)", (user_id, token_new))
            conn.commit()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'token': token_new, 'user_id': str(user_id), 'name': name})}

        # me
        if action == 'me' and method == 'GET':
            if not token:
                return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Нет токена'})}
            cur.execute("SELECT user_id FROM spark_sessions WHERE token = %s AND expires_at > NOW()", (token,))
            row = cur.fetchone()
            if not row:
                return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Сессия истекла'})}
            user_id = row[0]
            cur.execute("SELECT name, age, gender, city, bio, photos, tags, job, education, height, search_radius, search_gender, search_age_min, search_age_max, verified FROM spark_profiles WHERE user_id = %s", (user_id,))
            p = cur.fetchone()
            if not p:
                return {'statusCode': 404, 'headers': CORS, 'body': json.dumps({'error': 'Профиль не найден'})}
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({
                'user_id': str(user_id), 'name': p[0], 'age': p[1], 'gender': p[2], 'city': p[3],
                'bio': p[4], 'photos': p[5] or [], 'tags': p[6] or [],
                'job': p[7], 'education': p[8], 'height': p[9],
                'search_radius': p[10], 'search_gender': p[11], 'search_age_min': p[12], 'search_age_max': p[13], 'verified': p[14],
            })}

        # logout
        if action == 'logout' and method == 'POST':
            if token:
                cur.execute("UPDATE spark_sessions SET expires_at = NOW() WHERE token = %s", (token,))
                conn.commit()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True})}

        return {'statusCode': 404, 'headers': CORS, 'body': json.dumps({'error': 'Unknown action'})}

    finally:
        cur.close()
        conn.close()
