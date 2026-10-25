const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createServer } = require('../src/todo-app/server');

async function withServer(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'todo-'));
  const server = createServer(path.join(dir, 'todos.json'));
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = (method, p, body) => fetch(base + p, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  try { await fn(call, dir); } finally { server.close(); fs.rmSync(dir, { recursive: true, force: true }); }
}

test('boş liste ile başlar', () => withServer(async call => {
  assert.deepStrictEqual(await (await call('GET', '/api/todos')).json(), []);
}));

test('ekle, tamamla, düzenle, sil', () => withServer(async call => {
  const created = await call('POST', '/api/todos', { title: '  Süt al  ' });
  assert.strictEqual(created.status, 201);
  const todo = await created.json();
  assert.strictEqual(todo.title, 'Süt al');
  assert.strictEqual(todo.done, false);

  const done = await (await call('PATCH', `/api/todos/${todo.id}`, { done: true })).json();
  assert.strictEqual(done.done, true);
  const renamed = await (await call('PATCH', `/api/todos/${todo.id}`, { title: 'Ekmek al' })).json();
  assert.strictEqual(renamed.title, 'Ekmek al');

  assert.strictEqual((await call('DELETE', `/api/todos/${todo.id}`)).status, 200);
  assert.deepStrictEqual(await (await call('GET', '/api/todos')).json(), []);
}));

test('geçersiz girdiyi reddeder', () => withServer(async call => {
  for (const title of ['', '   ', 5, 'x'.repeat(201), undefined]) {
    assert.strictEqual((await call('POST', '/api/todos', { title })).status, 400, `title=${String(title).slice(0, 5)}`);
  }
  const { id } = await (await call('POST', '/api/todos', { title: 'a' })).json();
  assert.strictEqual((await call('PATCH', `/api/todos/${id}`, { done: 'evet' })).status, 400);
}));

test('olmayan todo için 404', () => withServer(async call => {
  assert.strictEqual((await call('PATCH', '/api/todos/yok', { done: true })).status, 404);
  assert.strictEqual((await call('DELETE', '/api/todos/yok')).status, 404);
  assert.strictEqual((await call('GET', '/api/baska')).status, 404);
}));

test('veri yeniden başlatmada korunur', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'todo-'));
  const file = path.join(dir, 'todos.json');
  for (const step of ['yaz', 'oku']) {
    const server = createServer(file);
    await new Promise(r => server.listen(0, '127.0.0.1', r));
    const base = `http://127.0.0.1:${server.address().port}`;
    if (step === 'yaz') await fetch(base + '/api/todos', { method: 'POST', body: JSON.stringify({ title: 'kalıcı' }) });
    else assert.strictEqual((await (await fetch(base + '/api/todos')).json())[0].title, 'kalıcı');
    server.close();
  }
  fs.rmSync(dir, { recursive: true, force: true });
});
