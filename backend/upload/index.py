"""
Загрузка/удаление фото профиля. Роутинг: ?action=photo|remove
"""
import json
import os
import base64
import uuid
import psycopg2
import boto3

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

    params = event.get('queryStringParameters') or {}
    action = params.get('action', '')
    token = (event.get('headers') or {}).get('x-auth-token') or (event.get('headers') or {}).get('X-Auth-Token', '')
    body = json.loads(event.get('body') or '{}')

    conn = get_db()
    cur = conn.cursor()

    try:
        user_id = get_user_id(cur, token)
        if not user_id:
            return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Не авторизован'})}

        if action == 'photo':
            data_url = body.get('data')
            if not data_url:
                return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Нет данных'})}

            if ',' in data_url:
                header, b64data = data_url.split(',', 1)
                ext = 'png' if 'png' in header else 'jpg'
            else:
                b64data = data_url
                ext = 'jpg'

            img_bytes = base64.b64decode(b64data)
            if len(img_bytes) > 10 * 1024 * 1024:
                return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Файл слишком большой (макс 10MB)'})}

            key = f"spark/photos/{user_id}/{uuid.uuid4()}.{ext}"
            s3 = boto3.client('s3', endpoint_url='https://bucket.poehali.dev',
                              aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
                              aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'])
            s3.put_object(Bucket='files', Key=key, Body=img_bytes, ContentType=f'image/{ext}')
            cdn_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/files/{key}"

            cur.execute("UPDATE spark_profiles SET photos = array_append(photos, %s), updated_at = NOW() WHERE user_id = %s RETURNING photos", (cdn_url, user_id))
            photos = cur.fetchone()[0]
            conn.commit()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'url': cdn_url, 'photos': photos})}

        if action == 'remove':
            url = body.get('url')
            if not url:
                return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Нет url'})}
            cur.execute("UPDATE spark_profiles SET photos = array_remove(photos, %s), updated_at = NOW() WHERE user_id = %s RETURNING photos", (url, user_id))
            photos = cur.fetchone()[0]
            conn.commit()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'photos': photos})}

        return {'statusCode': 404, 'headers': CORS, 'body': json.dumps({'error': 'Unknown action'})}

    finally:
        cur.close()
        conn.close()
