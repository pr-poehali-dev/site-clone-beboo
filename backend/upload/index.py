"""
Загрузка фото + Админ-панель + Платежи (ЮKassa/Робокасса).
Upload: ?action=photo|remove|selfie|selfie_status
Admin: ?action=stats|users|user_detail|ban|unban|verify|grant_premium|revoke_premium|settings|update_setting|reports|resolve_report|top_users|selfie_requests|approve_selfie
Payment: ?action=pay_create|pay_status|pay_webhook_yukassa|pay_webhook_robokassa
Admin защита: заголовок X-Admin-Key
"""
import json
import os
import base64
import uuid
import hashlib
import hmac
import urllib.request
import urllib.parse
import psycopg2
import boto3

PLANS = {
    '1m':  {'days': 30,  'amount': 299,  'label': '1 месяц'},
    '3m':  {'days': 90,  'amount': 699,  'label': '3 месяца'},
    '12m': {'days': 365, 'amount': 1999, 'label': '12 месяцев'},
}

def get_setting_val(cur, key, default=''):
    cur.execute("SELECT value FROM spark_settings WHERE key = %s", (key,))
    row = cur.fetchone()
    return row[0] if row else default

def activate_premium(cur, user_id, plan):
    days = PLANS[plan]['days']
    amount = PLANS[plan]['amount']
    cur.execute("UPDATE spark_profiles SET is_premium = TRUE WHERE user_id = %s", (user_id,))
    cur.execute("""
        INSERT INTO spark_subscriptions (user_id, plan, price, status, expires_at)
        VALUES (%s, %s, %s, 'active', NOW() + %s * INTERVAL '1 day')
    """, (user_id, plan, amount, days))

def yukassa_create(shop_id, secret_key, amount, order_id, description, return_url):
    data = json.dumps({
        'amount': {'value': f'{amount}.00', 'currency': 'RUB'},
        'confirmation': {'type': 'redirect', 'return_url': return_url},
        'capture': True, 'description': description,
        'metadata': {'order_id': order_id},
    }).encode()
    creds = base64.b64encode(f"{shop_id}:{secret_key}".encode()).decode()
    req = urllib.request.Request(
        'https://api.yookassa.ru/v3/payments', data=data, method='POST',
        headers={'Authorization': f'Basic {creds}', 'Content-Type': 'application/json',
                 'Idempotence-Key': str(uuid.uuid4())})
    with urllib.request.urlopen(req, timeout=15) as r:
        res = json.loads(r.read())
    return res['id'], res['confirmation']['confirmation_url']

def yukassa_check(shop_id, secret_key, payment_id):
    creds = base64.b64encode(f"{shop_id}:{secret_key}".encode()).decode()
    req = urllib.request.Request(f'https://api.yookassa.ru/v3/payments/{payment_id}',
                                  headers={'Authorization': f'Basic {creds}'})
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read())['status']

def robokassa_url(login, pass1, amount, inv_id, description):
    sig = hashlib.md5(f"{login}:{amount:.2f}:{inv_id}:{pass1}".encode()).hexdigest()
    p = urllib.parse.urlencode({'MerchantLogin': login, 'OutSum': f'{amount:.2f}', 'InvId': inv_id,
                                'Description': description, 'SignatureValue': sig, 'IsTest': 0})
    return f"https://auth.robokassa.ru/Merchant/Index.aspx?{p}"

def robokassa_check_sig(pass2, out_sum, inv_id, sig):
    expected = hashlib.md5(f"{out_sum}:{inv_id}:{pass2}".encode()).hexdigest()
    return hmac.compare_digest(expected.lower(), sig.lower())

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
    return f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"

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

        # ── Загрузка селфи для верификации ──────────────────────
        if action == 'selfie':
            user_id = get_user_id(cur, token)
            if not user_id:
                return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Не авторизован'})}
            body = json.loads(event.get('body') or '{}')
            data_url = body.get('data')
            if not data_url:
                return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Нет данных'})}
            cur.execute("SELECT selfie_status FROM spark_users WHERE id = %s", (user_id,))
            row = cur.fetchone()
            if row and row[0] == 'approved':
                return {'statusCode': 409, 'headers': CORS, 'body': json.dumps({'error': 'Уже верифицирован'})}
            try:
                selfie_url = upload_image(data_url, f"selfies/{user_id}")
            except ValueError as e:
                return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': str(e)})}
            cur.execute("UPDATE spark_users SET selfie_url = %s, selfie_status = 'pending' WHERE id = %s", (selfie_url, user_id))
            conn.commit()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True, 'status': 'pending'})}

        if action == 'selfie_status':
            user_id = get_user_id(cur, token)
            if not user_id:
                return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Не авторизован'})}
            cur.execute("SELECT selfie_status FROM spark_users WHERE id = %s", (user_id,))
            row = cur.fetchone()
            status = row[0] if row else 'none'
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'status': status})}

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

        # ── Мэтчи пользователя (для админа) ─────────────────────────────
        if action == 'user_matches':
            uid = params.get('user_id', '')
            cur.execute("""
                SELECT m.id,
                    CASE WHEN m.user1_id = %s THEN m.user2_id ELSE m.user1_id END AS other_id,
                    m.created_at,
                    (SELECT text FROM spark_messages WHERE match_id = m.id ORDER BY created_at DESC LIMIT 1),
                    (SELECT COUNT(*) FROM spark_messages WHERE match_id = m.id)
                FROM spark_matches m
                WHERE m.user1_id = %s OR m.user2_id = %s
                ORDER BY m.created_at DESC LIMIT 50
            """, (uid, uid, uid))
            rows = cur.fetchall()
            result = []
            for r in rows:
                cur.execute("SELECT name, photos FROM spark_profiles WHERE user_id = %s", (r[1],))
                p = cur.fetchone()
                result.append({
                    'match_id': str(r[0]), 'other_id': str(r[1]),
                    'other_name': p[0] if p else '?', 'other_photo': ((p[1] or [''])[0]) if p else '',
                    'created_at': r[2].isoformat(), 'last_message': r[3] or '',
                    'messages_count': r[4],
                })
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'matches': result})}

        # ── Переписка в мэтче (для админа) ───────────────────────────────
        if action == 'read_chat':
            match_id = params.get('match_id', '')
            cur.execute("""
                SELECT m.id, m.sender_id, m.text, m.image_url, m.msg_type, m.created_at, p.name
                FROM spark_messages m
                LEFT JOIN spark_profiles p ON p.user_id = m.sender_id
                WHERE m.match_id = %s ORDER BY m.created_at ASC LIMIT 200
            """, (match_id,))
            msgs = cur.fetchall()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'messages': [
                {'id': str(r[0]), 'sender_id': str(r[1]), 'text': r[2] or '', 'image_url': r[3],
                 'msg_type': r[4] or 'text', 'created_at': r[5].isoformat(), 'sender_name': r[6] or '?'}
                for r in msgs
            ]})}

        # ── Список заявок на верификацию (admin) ────────────────────────
        if action == 'selfie_requests':
            cur.execute("""
                SELECT u.id, u.email, u.selfie_url, u.selfie_status, u.created_at,
                       p.name, p.age, p.photos
                FROM spark_users u
                LEFT JOIN spark_profiles p ON p.user_id = u.id
                WHERE u.selfie_status = 'pending'
                ORDER BY u.created_at ASC LIMIT 50
            """)
            rows = cur.fetchall()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'requests': [
                {'user_id': str(r[0]), 'email': r[1], 'selfie_url': r[2], 'status': r[3],
                 'created_at': r[4].isoformat(), 'name': r[5], 'age': r[6],
                 'photo': ((r[7] or [''])[0]) if r[7] else ''} for r in rows
            ]})}

        # ── Одобрить/отклонить верификацию (admin) ──────────────────────
        if action == 'approve_selfie' and method == 'POST':
            uid = body.get('user_id')
            approved = body.get('approved', True)
            status = 'approved' if approved else 'rejected'
            cur.execute("UPDATE spark_users SET selfie_status = %s WHERE id = %s", (status, uid))
            if approved:
                cur.execute("UPDATE spark_profiles SET verified = TRUE WHERE user_id = %s", (uid,))
            conn.commit()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True, 'status': status})}

        # ════════════════════════════════════════════════════════
        # PAYMENT (требует auth-token, публичные)
        # ════════════════════════════════════════════════════════
        if action == 'pay_create' and method == 'POST':
            pay_user = get_user_id(cur, token)
            if not pay_user:
                return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Не авторизован'})}
            pay_body = json.loads(event.get('body') or '{}')
            plan = pay_body.get('plan', '1m')
            if plan not in PLANS:
                return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Неверный план'})}
            provider = get_setting_val(cur, 'payment_provider', 'yukassa')
            if get_setting_val(cur, 'payment_enabled', 'false') != 'true':
                return {'statusCode': 503, 'headers': CORS, 'body': json.dumps({'error': 'Оплата временно недоступна'})}
            amount = PLANS[plan]['amount']
            cur.execute("INSERT INTO spark_payments (user_id, provider, plan, amount, status) VALUES (%s, %s, %s, %s, 'pending') RETURNING id", (pay_user, provider, plan, amount))
            pid = str(cur.fetchone()[0])
            conn.commit()
            return_url = pay_body.get('return_url', 'https://spark.poehali.dev/')
            if provider == 'yukassa':
                shop_id = get_setting_val(cur, 'yukassa_shop_id')
                secret = get_setting_val(cur, 'yukassa_secret_key')
                if not shop_id or not secret:
                    return {'statusCode': 503, 'headers': CORS, 'body': json.dumps({'error': 'ЮKassa не настроена'})}
                ext_id, pay_url = yukassa_create(shop_id, secret, amount, pid, f"Spark Premium {PLANS[plan]['label']}", return_url)
                cur.execute("UPDATE spark_payments SET external_id = %s WHERE id = %s", (ext_id, pid))
            else:
                login = get_setting_val(cur, 'robokassa_login')
                p1 = get_setting_val(cur, 'robokassa_pass1')
                if not login or not p1:
                    return {'statusCode': 503, 'headers': CORS, 'body': json.dumps({'error': 'Робокасса не настроена'})}
                inv_id = int(pid.replace('-', '')[:8], 16) % 2147483647
                pay_url = robokassa_url(login, p1, amount, inv_id, f"Spark Premium {PLANS[plan]['label']}")
                cur.execute("UPDATE spark_payments SET external_id = %s WHERE id = %s", (str(inv_id), pid))
            conn.commit()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'payment_id': pid, 'pay_url': pay_url, 'amount': amount, 'plan': plan, 'provider': provider})}

        if action == 'pay_status':
            pay_user = get_user_id(cur, token)
            if not pay_user:
                return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Не авторизован'})}
            pid = params.get('payment_id', '')
            cur.execute("SELECT id, provider, external_id, plan, status FROM spark_payments WHERE id = %s AND user_id = %s", (pid, pay_user))
            row = cur.fetchone()
            if not row:
                return {'statusCode': 404, 'headers': CORS, 'body': json.dumps({'error': 'Не найден'})}
            db_id, prov, ext_id, plan, db_status = row
            if db_status == 'paid':
                return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'status': 'paid', 'plan': plan})}
            if prov == 'yukassa' and ext_id:
                yk = yukassa_check(get_setting_val(cur, 'yukassa_shop_id'), get_setting_val(cur, 'yukassa_secret_key'), ext_id)
                if yk == 'succeeded':
                    cur.execute("UPDATE spark_payments SET status = 'paid', paid_at = NOW() WHERE id = %s", (db_id,))
                    activate_premium(cur, pay_user, plan)
                    conn.commit()
                    return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'status': 'paid', 'plan': plan})}
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'status': db_status})}

        if action == 'pay_webhook_yukassa' and method == 'POST':
            wb = json.loads(event.get('body') or '{}')
            obj = wb.get('object', {})
            if obj.get('status') == 'succeeded':
                cur.execute("SELECT id, user_id, plan FROM spark_payments WHERE external_id = %s AND status = 'pending'", (obj.get('id'),))
                row = cur.fetchone()
                if row:
                    cur.execute("UPDATE spark_payments SET status = 'paid', paid_at = NOW() WHERE id = %s", (row[0],))
                    activate_premium(cur, row[1], row[2])
                    conn.commit()
            return {'statusCode': 200, 'headers': CORS, 'body': 'ok'}

        if action == 'pay_webhook_robokassa' and method == 'POST':
            parts = {}
            for p in (event.get('body') or '').split('&'):
                if '=' in p:
                    k, v = p.split('=', 1)
                    parts[urllib.parse.unquote_plus(k)] = urllib.parse.unquote_plus(v)
            inv_id = parts.get('InvId', '')
            if robokassa_check_sig(get_setting_val(cur, 'robokassa_pass2'), parts.get('OutSum', ''), inv_id, parts.get('SignatureValue', '')):
                cur.execute("SELECT id, user_id, plan FROM spark_payments WHERE external_id = %s AND status = 'pending'", (inv_id,))
                row = cur.fetchone()
                if row:
                    cur.execute("UPDATE spark_payments SET status = 'paid', paid_at = NOW() WHERE id = %s", (row[0],))
                    activate_premium(cur, row[1], row[2])
                    conn.commit()
            return {'statusCode': 200, 'headers': {'Content-Type': 'text/plain', **CORS}, 'body': f'OK{inv_id}'}

        return {'statusCode': 404, 'headers': CORS, 'body': json.dumps({'error': 'Unknown action'})}

    finally:
        cur.close()
        conn.close()