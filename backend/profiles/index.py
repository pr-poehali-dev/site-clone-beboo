"""
Профили: анкеты для свайпов, обновление профиля, просмотр чужого.
Роутинг: ?action=discover|my|update|get&user_id=...
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

def fix_photos(photos):
    return [url.replace('/files/spark/', '/bucket/spark/') for url in (photos or [])]

def profile_to_dict(row):
    return {
        'user_id': str(row[0]), 'name': row[1], 'age': row[2], 'gender': row[3], 'city': row[4],
        'bio': row[5], 'photos': fix_photos(row[6]), 'tags': row[7] or [],
        'job': row[8] or '', 'education': row[9] or '', 'height': row[10],
        'verified': row[11], 'online': True, 'distance': 3,
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

        if action == 'discover':
            cur.execute("SELECT search_gender, search_age_min, search_age_max, incognito FROM spark_profiles WHERE user_id = %s", (user_id,))
            prefs = cur.fetchone()
            gender_filter = prefs[0] if prefs else 'all'
            age_min = prefs[1] if prefs else 18
            age_max = prefs[2] if prefs else 45
            gender_clause = "" if gender_filter == 'all' else f"AND p.gender = '{gender_filter}'"
            # Буст: профили с активным бустом идут первыми, потом онлайн
            cur.execute(f"""
                SELECT p.user_id, p.name, p.age, p.gender, p.city, p.bio, p.photos, p.tags, p.job, p.education, p.height, p.verified,
                       EXISTS(SELECT 1 FROM spark_boosts b WHERE b.user_id = p.user_id AND b.expires_at > NOW()) AS is_boosted
                FROM spark_profiles p
                WHERE p.user_id != %s AND p.age >= %s AND p.age <= %s {gender_clause}
                  AND (p.incognito IS NULL OR p.incognito = FALSE)
                  AND p.user_id NOT IN (SELECT to_user_id FROM spark_likes WHERE from_user_id = %s)
                  AND array_length(p.photos, 1) > 0
                ORDER BY
                    EXISTS(SELECT 1 FROM spark_boosts b WHERE b.user_id = p.user_id AND b.expires_at > NOW()) DESC,
                    p.online_at DESC NULLS LAST
                LIMIT 20
            """, (user_id, age_min, age_max, user_id))
            rows = cur.fetchall()
            profiles = []
            for r in rows:
                d = profile_to_dict(r)
                d['is_boosted'] = r[12]
                profiles.append(d)
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'profiles': profiles})}

        if action == 'my':
            cur.execute("""
                SELECT p.user_id, p.name, p.age, p.gender, p.city, p.bio, p.photos, p.tags, p.job, p.education, p.height, p.verified,
                       p.search_radius, p.search_gender, p.search_age_min, p.search_age_max
                FROM spark_profiles p WHERE p.user_id = %s
            """, (user_id,))
            row = cur.fetchone()
            if not row:
                return {'statusCode': 404, 'headers': CORS, 'body': json.dumps({'error': 'Профиль не найден'})}
            d = profile_to_dict(row)
            d['search_radius'] = row[12]
            d['search_gender'] = row[13]
            d['search_age_min'] = row[14]
            d['search_age_max'] = row[15]
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps(d)}

        if action == 'update' and method in ('POST', 'PUT'):
            body = json.loads(event.get('body') or '{}')
            allowed = ['name', 'age', 'city', 'bio', 'tags', 'job', 'education', 'height',
                       'search_radius', 'search_gender', 'search_age_min', 'search_age_max']
            updates = {k: v for k, v in body.items() if k in allowed}
            if not updates:
                return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Нет полей'})}
            set_parts, values = [], []
            for k, v in updates.items():
                set_parts.append(f"{k} = %s::text[]" if k == 'tags' else f"{k} = %s")
                values.append(v)
            set_parts.append("updated_at = NOW()")
            values.append(user_id)
            cur.execute(f"UPDATE spark_profiles SET {', '.join(set_parts)} WHERE user_id = %s", values)
            conn.commit()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True})}

        if action == 'get':
            target_id = params.get('user_id', '')
            cur.execute("""
                SELECT p.user_id, p.name, p.age, p.gender, p.city, p.bio, p.photos, p.tags, p.job, p.education, p.height, p.verified
                FROM spark_profiles p WHERE p.user_id = %s
            """, (target_id,))
            row = cur.fetchone()
            if not row:
                return {'statusCode': 404, 'headers': CORS, 'body': json.dumps({'error': 'Не найден'})}
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps(profile_to_dict(row))}

        return {'statusCode': 404, 'headers': CORS, 'body': json.dumps({'error': 'Unknown action'})}

    finally:
        cur.close()
        conn.close()