"""
Загрузка фото профиля + вся Админ-панель.
Upload: ?action=photo|remove
Admin: ?action=stats|users|user_detail|ban|unban|verify|grant_premium|revoke_premium|settings|update_setting|reports|resolve_report|top_users
Admin защита: заголовок X-Admin-Key = 'sparkladmin2024'
"""
import json
import os
import base64
import uuid
import psycopg2
import boto3

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token, X-Admin-Key',
}

ADMIN_KEY = os.environ.get('ADMIN_KEY', 'sparkladmin2024')

def get_db():
    return psycopg2.connect(os.environ['DATABASE_URL'], options=f"-c search_path={os.environ['MAIN_DB_SCHEMA']}")

def get_user_id(cur, token):
    cur.execute("SELECT user_id FROM spark_sessions WHERE token = %s AND expires_at > NOW()", (token,))
    row = cur.fetchone()
    return row[0] if row else None

def check_admin(event):
    key = (event.get('headers') or {}).get('x-admin-key') or (event.get('headers') or {}).get('X-Admin-Key', '')
    return key == ADMIN_KEY

def s3_client():
    return boto3.client('s3', endpoint_url='https://bucket.poehali.dev',
                        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
                        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'])

def upload_image(data_url, folder):
    if ',' in data_url:
        header, b64 = data_url.split(',', 1)
        ext = 'png' if 'png' in header else 'jpg'
    else:
        b64, ext = data_url, 'jpg'
    img_bytes = base64.b64decode(b64)
    if len(img_bytes) > 15 * 1024 * 1024:
        raise ValueError('Файл слишком большой (макс 15MB)')
    key = f"spark/{folder}/{uuid.uuid4()}.{ext}"
    s3_client().put_object(Bucket='files', Key=key, Body=img_bytes, ContentType=f'image/{ext}')
    return f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/files/{key}"

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
        # ════════════════════════════════════════════════════════
        # UPLOAD (требует auth)
        # ════════════════════════════════════════════════════════
        if action in ('photo', 'remove'):
            user_id = get_user_id(cur, token)
            if not user_id:
                return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Не авторизован'})}

            body = json.loads(event.get('body') or '{}')

            if action == 'photo':
                data_url = body.get('data')
                if not data_url:
                    return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Нет данных'})}
                try:
                    cdn_url = upload_image(data_url, f"photos/{user_id}")
                except ValueError as e:
                    return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': str(e)})}

                cur.execute("UPDATE spark_profiles SET photos = array_append(photos, %s), updated_at = NOW() WHERE user_id = %s RETURNING photos", (cdn_url, user_id))
                photos = cur.fetchone()[0]
                conn.commit()
                return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'url': cdn_url, 'photos': photos})}

            if action == 'remove':
                url = body.get('url')
                if not url:
                    return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Нет url'})}
                cur.execute("UPDATE spark_profiles SET photos = array_remove(photos, %s), updated_at = NOW() WHERE user_id = %s RETURNING photos", (url, user_id))
                row = cur.fetchone()
                conn.commit()
                return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'photos': row[0] if row else []})}

        # ════════════════════════════════════════════════════════
        # ADMIN (требует X-Admin-Key)
        # ════════════════════════════════════════════════════════
        if not check_admin(event):
            return {'statusCode': 403, 'headers': CORS, 'body': json.dumps({'error': 'Forbidden'})}

        body = json.loads(event.get('body') or '{}')

        if action == 'stats':
            cur.execute("SELECT COUNT(*) FROM spark_users")
            total_users = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM spark_users WHERE created_at > NOW() - INTERVAL '24 hours'")
            new_today = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM spark_users WHERE created_at > NOW() - INTERVAL '7 days'")
            new_week = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM spark_matches")
            total_matches = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM spark_messages")
            total_messages = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM spark_likes")
            total_likes = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM spark_profiles WHERE is_premium = TRUE")
            premium_users = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM spark_bans")
            banned_users = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM spark_reports WHERE status = 'pending'")
            open_reports = cur.fetchone()[0]
            cur.execute("""
                SELECT TO_CHAR(created_at, 'YYYY-MM-DD'), COUNT(*)
                FROM spark_users WHERE created_at > NOW() - INTERVAL '7 days'
                GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD') ORDER BY 1
            """)
            daily_signups = [{'date': r[0], 'count': r[1]} for r in cur.fetchall()]
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({
                'total_users': total_users, 'new_today': new_today, 'new_week': new_week,
                'total_matches': total_matches, 'total_messages': total_messages,
                'total_likes': total_likes, 'premium_users': premium_users,
                'banned_users': banned_users, 'open_reports': open_reports,
                'daily_signups': daily_signups,
            })}

        if action == 'users':
            page = int(params.get('page', '1'))
            limit = 20
            offset = (page - 1) * limit
            search = params.get('search', '')
            args = []
            where = ""
            if search:
                where = "WHERE (u.email ILIKE %s OR p.name ILIKE %s)"
                args = [f'%{search}%', f'%{search}%']
            cur.execute(f"""
                SELECT u.id, u.email, u.is_admin, u.created_at,
                       p.name, p.age, p.gender, p.city, p.is_premium,
                       array_length(p.photos, 1),
                       EXISTS(SELECT 1 FROM spark_bans b WHERE b.user_id = u.id),
                       p.verified
                FROM spark_users u LEFT JOIN spark_profiles p ON p.user_id = u.id
                {where} ORDER BY u.created_at DESC LIMIT %s OFFSET %s
            """, args + [limit, offset])
            rows = cur.fetchall()
            cur.execute(f"SELECT COUNT(*) FROM spark_users u LEFT JOIN spark_profiles p ON p.user_id = u.id {where}", args)
            total = cur.fetchone()[0]
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({
                'users': [{'id': str(r[0]), 'email': r[1], 'is_admin': r[2],
                           'created_at': r[3].isoformat(), 'name': r[4], 'age': r[5],
                           'gender': r[6], 'city': r[7], 'is_premium': r[8],
                           'photos_count': r[9] or 0, 'is_banned': r[10], 'verified': r[11]} for r in rows],
                'total': total, 'page': page,
            })}

        if action == 'user_detail':
            uid = params.get('user_id', '')
            cur.execute("""
                SELECT u.id, u.email, u.is_admin, u.created_at,
                       p.name, p.age, p.gender, p.city, p.bio, p.photos, p.tags,
                       p.job, p.height, p.is_premium, p.verified
                FROM spark_users u LEFT JOIN spark_profiles p ON p.user_id = u.id WHERE u.id = %s
            """, (uid,))
            r = cur.fetchone()
            if not r:
                return {'statusCode': 404, 'headers': CORS, 'body': json.dumps({'error': 'Not found'})}
            cur.execute("SELECT COUNT(*) FROM spark_likes WHERE from_user_id = %s", (uid,))
            likes_sent = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM spark_likes WHERE to_user_id = %s", (uid,))
            likes_recv = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM spark_matches WHERE user1_id = %s OR user2_id = %s", (uid, uid))
            matches_c = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM spark_messages WHERE sender_id = %s", (uid,))
            msgs_c = cur.fetchone()[0]
            cur.execute("SELECT 1 FROM spark_bans WHERE user_id = %s", (uid,))
            is_banned = bool(cur.fetchone())
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({
                'id': str(r[0]), 'email': r[1], 'is_admin': r[2], 'created_at': r[3].isoformat(),
                'name': r[4], 'age': r[5], 'gender': r[6], 'city': r[7], 'bio': r[8],
                'photos': r[9] or [], 'tags': r[10] or [], 'job': r[11], 'height': r[12],
                'is_premium': r[13], 'verified': r[14], 'is_banned': is_banned,
                'stats': {'likes_sent': likes_sent, 'likes_received': likes_recv, 'matches': matches_c, 'messages': msgs_c},
            })}

        if action == 'ban' and method == 'POST':
            uid = body.get('user_id')
            reason = body.get('reason', 'Нарушение правил')
            cur.execute("INSERT INTO spark_bans (user_id, reason) VALUES (%s, %s) ON CONFLICT (user_id) DO UPDATE SET reason = %s", (uid, reason, reason))
            cur.execute("UPDATE spark_sessions SET expires_at = NOW() WHERE user_id = %s", (uid,))
            conn.commit()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True})}

        if action == 'unban' and method == 'POST':
            uid = body.get('user_id')
            cur.execute("DELETE FROM spark_bans WHERE user_id = %s", (uid,))
            conn.commit()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True})}

        if action == 'verify' and method == 'POST':
            uid = body.get('user_id')
            val = body.get('verified', True)
            cur.execute("UPDATE spark_profiles SET verified = %s WHERE user_id = %s", (val, uid))
            conn.commit()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True})}

        if action == 'grant_premium' and method == 'POST':
            uid = body.get('user_id')
            days = int(body.get('days', 30))
            cur.execute("UPDATE spark_profiles SET is_premium = TRUE WHERE user_id = %s", (uid,))
            cur.execute("INSERT INTO spark_subscriptions (user_id, plan, price, status, expires_at) VALUES (%s, 'admin_grant', 0, 'active', NOW() + %s * INTERVAL '1 day')", (uid, days))
            conn.commit()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True})}

        if action == 'revoke_premium' and method == 'POST':
            uid = body.get('user_id')
            cur.execute("UPDATE spark_profiles SET is_premium = FALSE WHERE user_id = %s", (uid,))
            cur.execute("UPDATE spark_subscriptions SET status = 'cancelled' WHERE user_id = %s AND status = 'active'", (uid,))
            conn.commit()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True})}

        if action == 'settings':
            cur.execute("SELECT key, value, description FROM spark_settings ORDER BY key")
            rows = cur.fetchall()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({
                'settings': [{'key': r[0], 'value': r[1], 'description': r[2]} for r in rows]
            })}

        if action == 'update_setting' and method == 'POST':
            key = body.get('key')
            value = str(body.get('value', ''))
            cur.execute("UPDATE spark_settings SET value = %s, updated_at = NOW() WHERE key = %s", (value, key))
            conn.commit()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True})}

        if action == 'reports':
            cur.execute("""
                SELECT r.id, r.from_user_id, r.to_user_id, r.reason, r.status, r.created_at,
                       p1.name, p2.name
                FROM spark_reports r
                LEFT JOIN spark_profiles p1 ON p1.user_id = r.from_user_id
                LEFT JOIN spark_profiles p2 ON p2.user_id = r.to_user_id
                ORDER BY r.created_at DESC LIMIT 100
            """)
            rows = cur.fetchall()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'reports': [
                {'id': str(r[0]), 'from_user_id': str(r[1]), 'to_user_id': str(r[2]),
                 'reason': r[3], 'status': r[4], 'created_at': r[5].isoformat(),
                 'from_name': r[6], 'to_name': r[7]} for r in rows
            ]})}

        if action == 'resolve_report' and method == 'POST':
            rid = body.get('report_id')
            cur.execute("UPDATE spark_reports SET status = 'resolved' WHERE id = %s", (rid,))
            conn.commit()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True})}

        if action == 'top_users':
            cur.execute("""
                SELECT p.user_id, p.name, p.age,
                       (SELECT COUNT(*) FROM spark_messages WHERE sender_id = p.user_id),
                       (SELECT COUNT(*) FROM spark_matches WHERE user1_id = p.user_id OR user2_id = p.user_id),
                       p.is_premium, p.verified
                FROM spark_profiles p ORDER BY 4 DESC LIMIT 10
            """)
            rows = cur.fetchall()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'users': [
                {'user_id': str(r[0]), 'name': r[1], 'age': r[2],
                 'messages': r[3], 'matches': r[4], 'is_premium': r[5], 'verified': r[6]} for r in rows
            ]})}

        return {'statusCode': 404, 'headers': CORS, 'body': json.dumps({'error': 'Unknown action'})}

    finally:
        cur.close()
        conn.close()
