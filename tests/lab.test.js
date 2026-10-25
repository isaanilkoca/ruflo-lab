const test = require('node:test');
const assert = require('node:assert');
const { CATALOG, BY_ID, MONITOR, server } = require('../src/ruflo-lab/server');

const items = CATALOG.flatMap(g => g.items);

test('buton kimlikleri benzersiz', () => {
  assert.strictEqual(new Set(items.map(i => i.id)).size, items.length);
  assert.strictEqual(Object.keys(BY_ID).length, items.length);
});

test('args içindeki her {token} için bir alan var', () => {
  for (const it of items) {
    const names = (it.fields || []).map(f => f.name);
    for (const a of it.args) for (const [, k] of a.matchAll(/\{(\w+)\}/g)) assert.ok(names.includes(k), `${it.id}: {${k}} alanı yok`);
  }
});

test('token harcayan veya kalıcı süreç başlatan komut yok', () => {
  for (const it of [...items, ...MONITOR]) {
    const line = it.args.join(' ');
    assert.ok(!/--claude|daemon|\bmcp\b/.test(line), `${it.id}: yasak bayrak`);
  }
});

test('bilinmeyen komut 404, monitor ve katalog çalışır', async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const bad = await fetch(base + '/api/run', { method: 'POST', body: JSON.stringify({ id: 'rm-rf' }) });
  assert.strictEqual(bad.status, 404);
  assert.strictEqual((await fetch(base + '/api/catalog')).status, 200);
  const mon = await (await fetch(base + '/api/monitor')).json();
  assert.deepStrictEqual(mon.map(m => m.key), MONITOR.map(m => m.key));
  server.close();
});
