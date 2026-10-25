// Todo uygulaması: bağımlılıksız Node HTTP sunucusu + JSON dosya depolama.
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MAX_TITLE = 200;

function createStore(file) {
  const load = () => { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return []; } };
  const save = todos => {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const tmp = file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(todos, null, 2));
    fs.renameSync(tmp, file); // atomik yazım: yarım dosya kalmaz
  };
  return { load, save };
}

function cleanTitle(v) {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t && t.length <= MAX_TITLE ? t : null;
}

function createServer(dataFile = path.join(__dirname, 'data', 'todos.json')) {
  const store = createStore(dataFile);
  return http.createServer(async (req, res) => {
    const send = (code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
    const url = new URL(req.url, 'http://x');
    if (req.method === 'GET' && url.pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(fs.readFileSync(path.join(__dirname, 'index.html')));
    }
    const m = url.pathname.match(/^\/api\/todos(?:\/([\w-]+))?$/);
    if (!m) return send(404, { error: 'bulunamadı' });
    const id = m[1];
    const todos = store.load();

    if (req.method === 'GET' && !id) return send(200, todos);

    let body = {};
    if (req.method === 'POST' || req.method === 'PATCH') {
      let raw = '';
      for await (const c of req) { raw += c; if (raw.length > 1e4) return send(413, { error: 'çok büyük' }); }
      try { body = JSON.parse(raw || '{}'); } catch { return send(400, { error: 'geçersiz JSON' }); }
    }

    if (req.method === 'POST' && !id) {
      const title = cleanTitle(body.title);
      if (!title) return send(400, { error: `başlık 1-${MAX_TITLE} karakter olmalı` });
      const todo = { id: crypto.randomUUID(), title, done: false, createdAt: new Date().toISOString() };
      todos.push(todo); store.save(todos);
      return send(201, todo);
    }
    const idx = todos.findIndex(t => t.id === id);
    if (id && idx < 0) return send(404, { error: 'todo yok' });

    if (req.method === 'PATCH' && id) {
      if ('title' in body) { const t = cleanTitle(body.title); if (!t) return send(400, { error: 'geçersiz başlık' }); todos[idx].title = t; }
      if ('done' in body) { if (typeof body.done !== 'boolean') return send(400, { error: 'done boolean olmalı' }); todos[idx].done = body.done; }
      store.save(todos);
      return send(200, todos[idx]);
    }
    if (req.method === 'DELETE' && id) { const [gone] = todos.splice(idx, 1); store.save(todos); return send(200, gone); }
    send(405, { error: 'yöntem desteklenmiyor' });
  });
}

module.exports = { createServer };
if (require.main === module) {
  const port = Number(process.env.PORT) || 4200;
  createServer().listen(port, '127.0.0.1', () => console.log(`Todo: http://127.0.0.1:${port}`));
}
