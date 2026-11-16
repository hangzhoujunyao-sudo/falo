import json
from pathlib import Path
import tempfile
import threading
import http.client
import unittest
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from http.server import ThreadingHTTPServer
from app import Store, Handler, ApiError

class ServiceTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.store = Store(Path(self.temp.name)/'test.sqlite3')
        self.store.create_user('one@example.com', 'a-long-test-password', 1)
        self.store.create_user('two@example.com', 'another-test-password', 2)

    def tearDown(self):
        self.temp.cleanup()

    def login(self, email='one@example.com', password='a-long-test-password', device='desktop'):
        return self.store.request('POST', '/v1/membership/login', {'email':email, 'password':password, 'device_id':device}, '', ip=device)

    def test_login_seats_logout_and_revocation(self):
        first = self.login()
        self.assertTrue(first['logged_in'])
        with self.assertRaises(ApiError) as failure:
            self.login(device='second')
        self.assertEqual(failure.exception.status, 409)
        replaced = self.login()
        self.assertFalse(self.store.request('GET','/v1/membership/status',{},first['token'])['logged_in'])
        self.store.request('POST','/v1/membership/login',{'action':'logout'},replaced['token'])
        self.assertFalse(self.store.request('GET','/v1/membership/status',{},replaced['token'])['logged_in'])
        self.assertTrue(self.login(device='second')['logged_in'])

    def test_isolation_persistence_and_invalid_auth(self):
        one = self.login()['token']
        two = self.login('two@example.com','another-test-password','two')['token']
        value = [{'id':'p1','text':'hello','lang':'en','tags':[]}]
        self.store.request('POST','/v1/phrases',{'phrases':value},one)
        reopened = Store(self.store.path)
        self.assertEqual(reopened.request('GET','/v1/phrases',{},one)['phrases'],value)
        self.assertEqual(reopened.request('GET','/v1/phrases',{},two)['phrases'],[])
        with self.assertRaises(ApiError):
            reopened.request('GET','/v1/phrases',{},'invalid')
        with self.store.connect() as db:
            self.assertNotEqual(db.execute('SELECT password FROM users LIMIT 1').fetchone()[0], 'a-long-test-password')
            self.assertNotEqual(db.execute('SELECT token FROM sessions LIMIT 1').fetchone()[0], one)

    def test_device_removal_cannot_cross_users(self):
        one = self.login()['token']
        two = self.login('two@example.com','another-test-password','two')['token']
        self.store.request('POST','/v1/membership/devices',{'action':'logout','device_id':'two'},one)
        self.assertTrue(self.store.request('GET','/v1/membership/status',{},two)['logged_in'])

    def test_concurrent_login_respects_seat_limit(self):
        from concurrent.futures import ThreadPoolExecutor
        def attempt(device):
            try:
                return self.login(device=device)['logged_in']
            except ApiError as error:
                return error.status
        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(attempt, ['concurrent-one','concurrent-two']))
        self.assertEqual(results.count(True),1)
        self.assertEqual(results.count(409),1)

    def test_bad_credentials_and_rate_limit(self):
        for _ in range(10):
            with self.assertRaises(ApiError) as failure:
                self.login(password='wrong')
            self.assertEqual(failure.exception.status,401)
        with self.assertRaises(ApiError) as failure:
            self.login()
        self.assertEqual(failure.exception.status,429)

    def test_http_contract_and_body_limits(self):
        server = ThreadingHTTPServer(('127.0.0.1',0),Handler)
        server.store = self.store
        thread = threading.Thread(target=server.serve_forever,daemon=True)
        thread.start()
        base = f'http://127.0.0.1:{server.server_port}'
        try:
            with urlopen(base+'/health',timeout=5) as response:
                self.assertTrue(json.load(response)['ok'])
            data = json.dumps({'email':'one@example.com','password':'a-long-test-password','device_id':'http'}).encode()
            with urlopen(Request(base+'/v1/membership/login', data=data, headers={'Content-Type':'application/json'}),timeout=5) as response:
                token = json.load(response)['token']
            with urlopen(Request(base+'/v1/membership/status',headers={'Authorization':'Bearer '+token}),timeout=5) as response:
                self.assertTrue(json.load(response)['logged_in'])
            connection = http.client.HTTPConnection('127.0.0.1',server.server_port,timeout=5)
            connection.request('POST','/v1/phrases',headers={'Content-Type':'application/json','Content-Length':str(1024*1024+1)})
            self.assertEqual(connection.getresponse().status,413)
            connection.close()
        finally:
            server.shutdown()
            server.server_close()
            thread.join()

if __name__ == '__main__':
    unittest.main()
