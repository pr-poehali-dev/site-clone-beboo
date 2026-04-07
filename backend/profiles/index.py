"""
Профили: получение анкет для свайпов, обновление своего профиля, просмотр чужого.
"""
import json
import os
import psycopg2

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
}

def get_db():
    return psycopg2.connect(os.environ['DATABASE_URL'], options=f"-c search_path={os.environ['MAIN_DB_SCHEMA']}")

def get_user_id(cur, token):
    cur.execute("SELECT user_id FROM spark_sessions WHERE token = %s AND expires_at > NOW()", (token,))
    row = cur.fetchone()
    return row[0] if row else None

def profile_row_to_dict(row, user_id=None):
    return {
        'user_id': str(row[0]),
        'name': row[1], 'age': row[2], 'gender': row[3], 'city': row[4],
        'bio': row[5], 'photos': row[6] or [], 'tags': row[7] or [],
        'job': row[8] or '', 'education': row[9] or '', 'height': row[10],
        'verified': row[11],
        'online': True,
        'distance': 3,
    }

def handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    path = event.get('path', '/')
    method = event.get('httpMethod', 'GET')
    token = event.get('headers', {}).get('x-auth-token') or event.get('headers', {}).get('X-Auth-Token', '')
    params = event.get('queryStringParameters') or {}

    conn = get_db()
    cur = conn.cursor()

    try:
        user_id = get_user_id(cur, token)
        if not user_id:
            return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Не авторизован'})}

        # GET /discover — анкеты для свайпов
        if method == 'GET' and path.endswith('/discover'):
            cur.execute("SELECT search_gender, search_age_min, search_age_max FROM spark_profiles WHERE user_id = %s", (user_id,))
            prefs = cur.fetchone()
            gender_filter = prefs[0] if prefs else 'all'
            age_min = prefs[1] if prefs else 18
            age_max = prefs[2] if prefs else 45

            gender_clause = "" if gender_filter == 'all' else f"AND p.gender = '{gender_filter}'"

            cur.execute(f"""
                SELECT p.user_id, p.name, p.age, p.gender, p.city, p.bio, p.photos, p.tags, p.job, p.education, p.height, p.verified
                FROM spark_profiles p
                WHERE p.user_id != %s
                  AND p.age >= %s AND p.age <= %s
                  {gender_clause}
                  AND p.user_id NOT IN (
                      SELECT to_user_id FROM spark_likes WHERE from_user_id = %s
                  )
                  AND array_length(p.photos, 1) > 0
                ORDER BY p.online_at DESC
                LIMIT 20
            """, (user_id, age_min, age_max, user_id))

            rows = cur.fetchall()
            profiles = [profile_row_to_dict(r) for r in rows]
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'profiles': profiles})}

        # GET /profile/<user_id>
        if method == 'GET' and '/profile/' in path:
            target_id = path.split('/profile/')[-1]
            cur.execute(
                "SELECT p.user_id, p.name, p.age, p.gender, p.city, p.bio, p.photos, p.tags, p.job, p.education, p.height, p.verified FROM spark_profiles p WHERE p.user_id = %s",
                (target_id,)
            )
            row = cur.fetchone()
            if not row:
                return {'statusCode': 404, 'headers': CORS, 'body': json.dumps({'error': 'Профиль не найден'})}
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps(profile_row_to_dict(row))}

        # PUT /update — обновить свой профиль
        if method == 'PUT' and path.endswith('/update'):
            body = json.loads(event.get('body') or '{}')
            allowed = ['name', 'age', 'city', 'bio', 'tags', 'job', 'education', 'height',
                       'search_radius', 'search_gender', 'search_age_min', 'search_age_max']
            updates = {k: v for k, v in body.items() if k in allowed}
            if not updates:
                return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Нет полей для обновления'})}

            set_parts = []
            values = []
            for k, v in updates.items():
                if k == 'tags':
                    set_parts.append(f"{k} = %s::text[]")
                    values.append(v)
                else:
                    set_parts.append(f"{k} = %s")
                    values.append(v)
            set_parts.append("updated_at = NOW()")
            values.append(user_id)

            cur.execute(f"UPDATE spark_profiles SET {', '.join(set_parts)} WHERE user_id = %s", values)
            conn.commit()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True})}

        # GET /my — свой профиль
        if method == 'GET' and path.endswith('/my'):
            cur.execute(
                "SELECT p.user_id, p.name, p.age, p.gender, p.city, p.bio, p.photos, p.tags, p.job, p.education, p.height, p.verified FROM spark_profiles p WHERE p.user_id = %s",
                (user_id,)
            )
            row = cur.fetchone()
            if not row:
                return {'statusCode': 404, 'headers': CORS, 'body': json.dumps({'error': 'Профиль не найден'})}

            d = profile_row_to_dict(row)
            cur.execute("SELECT search_radius, search_gender, search_age_min, search_age_max FROM spark_profiles WHERE user_id = %s", (user_id,))
            prefs = cur.fetchone()
            if prefs:
                d['search_radius'] = prefs[0]
                d['search_gender'] = prefs[1]
                d['search_age_min'] = prefs[2]
                d['search_age_max'] = prefs[3]
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps(d)}

        return {'statusCode': 404, 'headers': CORS, 'body': json.dumps({'error': 'Not found'})}

    finally:
        cur.close()
        conn.close()
