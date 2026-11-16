"""飞译 self-hosted API. Python 3.11+, SQLite; no external dependencies."""
import argparse
import getpass
import hashlib
import hmac
import json
import os
from pathlib import Path
import secrets
import sqlite3
import time
from contextlib import contextmanager
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit

SCHEMA = '''
CREATE TABLE IF NOT EXISTS users(email TEXT PRIMARY KEY, salt TEXT NOT NULL,
 password TEXT NOT NULL, seats INTEGER NOT NULL DEFAULT 3);
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, email TEXT NOT NULL,
 device TEXT NOT NULL, name TEXT NOT NULL, expires INTEGER NOT NULL, seen INTEGER NOT NULL,
 UNIQUE(email,device));
CREATE TABLE IF NOT EXISTS documents(email TEXT NOT NULL, kind TEXT NOT NULL,
 body TEXT NOT NULL, PRIMARY KEY(email,kind));
CREATE TABLE IF NOT EXISTS attempts(ip TEXT PRIMARY KEY, count INTEGER, reset INTEGER);
'''

def password_hash(password, salt):
    return hashlib.pbkdf2_hmac('sha256', password.encode(), bytes.fromhex(salt), 600_000).hex()

def token_hash(token):
    return hashlib.sha256(token.encode()).hexdigest()

class ApiError(Exception):
    def __init__(self, status, message):
        self.status, self.message = status, message

class Store:
    def __init__(self, path):
        self.path = str(path)
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        with self.connect() as db:
            db.executescript(SCHEMA)

    @contextmanager
    def connect(self):
        db = sqlite3.connect(self.path, timeout=10)
        db.row_factory = sqlite3.Row
        try:
            with db:
                yield db
        finally:
            db.close()

    def create_user(self, email, password, seats=3):
        email = email.strip().lower()
        if '@' not in email or len(email) > 254 or len(password) < 12 or not 1 <= seats <= 100:
            raise ValueError('需要有效邮箱、至少 12 位密码、1–100 个席位')
        salt = secrets.token_hex(16)
        with self.connect() as db:
            db.execute('INSERT INTO users VALUES(?,?,?,?)', (email, salt, password_hash(password, salt), seats))

    def request(self, method, path, body, token, ip='local'):
        now = int(time.time())
        if path == '/health' and method == 'GET':
            return {'ok': True, 'service': 'Falo', 'version': '2.6.5'}
        if path == '/v1/update' and method == 'GET':
            return {'ok': True, 'has_update': False, 'version': '2.6.5'}
        if path in ('/membership/list_plans', '/v1/membership/plans') and method == 'GET':
            return {'ok': True, 'success': True, 'plans': [], 'message': '自托管服务，由管理员配置账号与席位'}
        if path in ('/membership/register', '/membership/auth', '/membership/renew'):
            raise ApiError(501, '自托管服务由管理员创建账号；邮件注册、许可证激活和在线续费尚未配置')
        with self.connect() as db:
            # Serializes seat admission and document writes across request threads.
            db.execute('BEGIN IMMEDIATE')
            db.execute('DELETE FROM sessions WHERE expires <= ?', (now,))
            db.execute('DELETE FROM attempts WHERE reset <= ?', (now,))
            if path == '/v1/membership/login' and method == 'POST' and body.get('action', 'login') == 'login':
                attempt = db.execute('SELECT * FROM attempts WHERE ip=?', (ip,)).fetchone()
                if attempt and attempt['count'] >= 10:
                    raise ApiError(429, '登录尝试过多，请 15 分钟后再试')
                # Commit rate limit before credential validation so errors cannot roll it back.
                db.execute('INSERT INTO attempts VALUES(?,1,?) ON CONFLICT(ip) DO UPDATE SET count=count+1', (ip, now+900))
                db.commit()
                email = str(body.get('email') or body.get('account') or '').strip().lower()
                password = str(body.get('password') or '')
                user = db.execute('SELECT * FROM users WHERE email=?', (email,)).fetchone()
                salt = user['salt'] if user else '00'*16
                actual = password_hash(password, salt)
                if not user or not hmac.compare_digest(actual, user['password']):
                    raise ApiError(401, 'invalid credentials')
                device = str(body.get('device_id') or '').strip()
                if not device or len(device) > 200:
                    raise ApiError(400, '缺少有效设备标识')
                db.execute('BEGIN IMMEDIATE')
                existing = db.execute('SELECT 1 FROM sessions WHERE email=? AND device=? AND expires>?', (email, device, now)).fetchone()
                count = db.execute('SELECT count(*) FROM sessions WHERE email=? AND expires>?', (email, now)).fetchone()[0]
                if not existing and count >= user['seats']:
                    raise ApiError(409, '设备席位已满，请在已登录设备退出或联系管理员')
                raw = secrets.token_urlsafe(32)
                db.execute('INSERT OR REPLACE INTO sessions VALUES(?,?,?,?,?,?)', (token_hash(raw), email, device, str(body.get('device_name') or '飞译')[:100], now+30*86400, now))
                result = self.status(db, user, device)
                result['token'] = raw
                return result
            session = db.execute('SELECT * FROM sessions WHERE token=? AND expires>?', (token_hash(token), now)).fetchone() if token else None
            if path == '/v1/membership/status' and method == 'GET' and not session:
                return {'ok': True, 'logged_in': False}
            if not session:
                raise ApiError(401, '请先登录')
            email, device = session['email'], session['device']
            user = db.execute('SELECT * FROM users WHERE email=?', (email,)).fetchone()
            if not user:
                raise ApiError(401, '账号不存在')
            db.execute('UPDATE sessions SET seen=? WHERE token=?', (now, token_hash(token)))
            if path == '/v1/membership/status' and method == 'GET':
                return self.status(db, user, device)
            if path == '/v1/membership/login' and method == 'POST' and body.get('action') == 'logout':
                db.execute('DELETE FROM sessions WHERE token=?', (token_hash(token),))
                return {'ok': True, 'logged_in': False}
            if path in ('/v1/membership/devices', '/membership/list_devices'):
                if method == 'POST' and body.get('action') == 'logout':
                    target = str(body.get('device_id') or body.get('id') or '')
                    if not target:
                        raise ApiError(400, '缺少 device_id')
                    db.execute('DELETE FROM sessions WHERE email=? AND device=?', (email, target))
                elif method != 'GET' and path != '/membership/list_devices':
                    raise ApiError(405, '不支持该操作')
                devices = self.devices(db, email, device)
                return {'ok': True, 'devices': devices, 'seats_in_use': len(devices),
                        'current_device_name': session['name'], 'local_seats': [{'device_id':device, 'device_name':session['name']}]}
            if path == '/membership/logout_others' and method == 'POST':
                db.execute('DELETE FROM sessions WHERE email=? AND device<>?', (email, device))
                return {'ok': True}
            if path == '/v1/contacts/backup':
                raise ApiError(501, '联系人分步备份任务协议尚未接入')
            if path in ('/v1/phrases', '/v1/todos'):
                kind = path.rsplit('/', 1)[-1]
                if method == 'POST':
                    value = body.get(kind, []) if kind != 'backup' else body
                    if kind != 'backup' and (not isinstance(value, list) or not all(isinstance(x, dict) for x in value)):
                        raise ApiError(400, '同步内容必须是对象数组')
                    db.execute('INSERT INTO documents VALUES(?,?,?) ON CONFLICT(email,kind) DO UPDATE SET body=excluded.body', (email, kind, json.dumps(value, ensure_ascii=False)))
                    return {'ok': True, kind: value}
                if method == 'GET':
                    row = db.execute('SELECT body FROM documents WHERE email=? AND kind=?', (email, kind)).fetchone()
                    return {'ok': True, kind: json.loads(row[0]) if row else []}
            if path == '/v1/membership/pay':
                raise ApiError(501, '尚未配置支付渠道，请联系管理员')
            if path in ('/v1/membership/seat/pick', '/v1/proxy/check', '/v1/translate/test'):
                raise ApiError(501, '此接口尚未配置；翻译使用客户端供应商配置')
            raise ApiError(404, '接口不存在')

    @staticmethod
    def devices(db, email, current):
        return [dict(id=r['device'], device_id=r['device'], name=r['name'], last_seen=r['seen'], active=True, is_current=r['device']==current)
                for r in db.execute('SELECT * FROM sessions WHERE email=? AND expires>?', (email, int(time.time())))]

    def status(self, db, user, device):
        devices = self.devices(db, user['email'], device)
        return {'ok': True, 'logged_in': True, 'email': user['email'], 'plan': 'self_hosted', 'plan_name': '自托管',
                'status': 'active', 'subscription_status': 'active', 'device_limit': user['seats'], 'seats': user['seats'],
                'seats_in_use': len(devices), 'devices': devices, 'expires_at': None}

class Handler(BaseHTTPRequestHandler):
    server_version = 'FaloAPI'
    def log_message(self, *args):
        pass  # Avoid credentials/query tokens in access logs.

    def handle_request(self):
        self.connection.settimeout(15)
        try:
            body = {}
            if self.command == 'POST':
                length = int(self.headers.get('Content-Length', '0'))
                if length < 0 or length > 1024*1024:
                    raise ApiError(413, '请求超过 1 MB 限制')
                if self.headers.get_content_type() != 'application/json':
                    raise ApiError(415, '需要 application/json')
                body = json.loads(self.rfile.read(length))
                if not isinstance(body, dict):
                    raise ApiError(400, '请求必须是 JSON 对象')
            authorization = self.headers.get('Authorization', '')
            token = authorization[7:] if authorization.startswith('Bearer ') else ''
            result = self.server.store.request(self.command, urlsplit(self.path).path, body, token, self.client_address[0])
            self.respond(200, result)
        except ApiError as error:
            self.respond(error.status, {'error': error.message})
        except (ValueError, UnicodeError):
            self.respond(400, {'error': '无效的 JSON 或请求长度'})
        except (TimeoutError, ConnectionError):
            self.close_connection = True
        except Exception:
            self.respond(500, {'error': '服务器内部错误'})

    def respond(self, status, body):
        data = json.dumps(body, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(data)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.end_headers()
        self.wfile.write(data)

    do_GET = handle_request
    do_POST = handle_request

def main():
    parser = argparse.ArgumentParser(description='飞译自托管服务')
    parser.add_argument('--db', default=os.environ.get('FALO_DB', str(Path(__file__).parent/'data/falo.sqlite3')))
    sub = parser.add_subparsers(dest='command', required=True)
    create = sub.add_parser('create-user')
    create.add_argument('email')
    create.add_argument('--seats', type=int, default=3)
    revoke = sub.add_parser('revoke-sessions')
    revoke.add_argument('email')
    serve = sub.add_parser('serve')
    serve.add_argument('--host', default='127.0.0.1')
    serve.add_argument('--port', type=int, default=8787)
    args = parser.parse_args()
    store = Store(args.db)
    if args.command == 'create-user':
        password = getpass.getpass('Password (12+ characters): ')
        if password != getpass.getpass('Confirm password: '):
            parser.error('密码不一致')
        store.create_user(args.email, password, args.seats)
        print('账号已创建')
    elif args.command == 'revoke-sessions':
        with store.connect() as db:
            db.execute('DELETE FROM sessions WHERE email=?', (args.email.strip().lower(),))
        print('该账号所有设备已退出')
    else:
        httpd = ThreadingHTTPServer((args.host, args.port), Handler)
        httpd.store = store
        print(f'飞译 API: http://{args.host}:{args.port}', flush=True)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass
        finally:
            httpd.server_close()

if __name__ == '__main__':
    main()
