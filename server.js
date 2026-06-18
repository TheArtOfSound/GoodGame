import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { createReadStream, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const PORT = Number(process.env.PORT || 3000);
const SERVICE_NAME = process.env.SERVICE_NAME || 'GoodGame.center';
const STARTED_AT = new Date().toISOString();

const MIME = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
  ['.ico', 'image/x-icon'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.md', 'text/markdown; charset=utf-8']
]);

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function markdownToHtml(markdown) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  let inCode = false;
  const out = [];
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.trim().startsWith('```')) {
      out.push(inCode ? '</code></pre>' : '<pre><code>');
      inCode = !inCode;
      continue;
    }
    if (inCode) {
      out.push(escapeHtml(raw) + '\n');
      continue;
    }
    if (!line.trim()) {
      out.push('<br>');
      continue;
    }
    const h = line.match(/^(#{1,6})\s+(.+)$/);
    if (h) {
      const level = h[1].length;
      out.push(`<h${level}>${escapeHtml(h[2])}</h${level}>`);
      continue;
    }
    const bullet = line.match(/^[-*]\s+(.+)$/);
    if (bullet) {
      out.push(`<p class="bullet">• ${escapeHtml(bullet[1])}</p>`);
      continue;
    }
    out.push(`<p>${escapeHtml(line)}</p>`);
  }
  if (inCode) out.push('</code></pre>');
  return out.join('\n');
}

function page(title, body, status = 200) {
  return {
    status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff'
    },
    body: `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="GoodGame.center live Railway deployment">
  <style>
    :root{color-scheme:dark;--bg:#050505;--panel:#101010;--gold:#f6c451;--muted:#9a9a9a;--line:#2a2414}
    *{box-sizing:border-box} body{margin:0;background:radial-gradient(circle at top,#1b1405,#050505 42%);color:#f5f2e8;font:16px/1.55 ui-sans-serif,system-ui,-apple-system,Segoe UI,Arial,sans-serif}
    header{border-bottom:1px solid var(--line);background:rgba(0,0,0,.72);backdrop-filter:blur(12px);position:sticky;top:0;z-index:2}
    .wrap{max-width:1120px;margin:0 auto;padding:22px}
    nav{display:flex;justify-content:space-between;gap:16px;align-items:center}.brand{font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:var(--gold)}
    .pill{border:1px solid var(--line);padding:8px 12px;background:#0b0b0b;color:var(--muted);font-size:13px}
    main{padding:44px 0}.card{background:linear-gradient(180deg,rgba(255,255,255,.045),rgba(255,255,255,.015));border:1px solid var(--line);box-shadow:0 18px 70px rgba(0,0,0,.45);padding:28px}
    h1,h2,h3{line-height:1.05;margin:0 0 16px}h1{font-size:clamp(34px,6vw,76px);letter-spacing:-.06em}h2{font-size:30px;color:var(--gold)}
    p{max-width:860px;color:#ddd}.muted{color:var(--muted)}a{color:var(--gold)}pre{overflow:auto;background:#030303;border:1px solid #2b2619;padding:16px}code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin:22px 0}.mini{border:1px solid var(--line);background:#080808;padding:14px}.bullet{margin:.35rem 0}.ok{color:#72f29a}
  </style>
</head>
<body>
<header><div class="wrap"><nav><div class="brand">GoodGame.center</div><div class="pill">Railway live host</div></nav></div></header>
<main><div class="wrap"><section class="card">${body}</section></div></main>
</body>
</html>`
  };
}

function send(res, result) {
  res.writeHead(result.status || 200, result.headers || {});
  res.end(result.body || '');
}

function versionPayload(req) {
  return {
    ok: true,
    service: SERVICE_NAME,
    host: req.headers.host || null,
    provider: 'railway',
    commit_sha: process.env.RAILWAY_GIT_COMMIT_SHA || process.env.GIT_SHA || process.env.SOURCE_COMMIT || null,
    branch: process.env.RAILWAY_GIT_BRANCH || process.env.GIT_BRANCH || null,
    deployment_id: process.env.RAILWAY_DEPLOYMENT_ID || null,
    started_at: STARTED_AT,
    node: process.version
  };
}

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const normalized = path.normalize(decoded).replace(/^([/\\])+/, '');
  if (!normalized || normalized.includes('..')) return null;
  return normalized;
}

async function tryFile(relativePath) {
  const full = path.join(ROOT, relativePath);
  if (!full.startsWith(ROOT)) return null;
  const s = await stat(full).catch(() => null);
  if (!s || !s.isFile()) return null;
  return full;
}

async function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const clean = safePath(url.pathname);
  if (!clean) return false;
  const candidates = [];
  if (url.pathname === '/') {
    candidates.push('public/index.html', 'dist/index.html', 'build/index.html', 'index.html');
  } else {
    candidates.push(`public/${clean}`, `dist/${clean}`, `build/${clean}`, clean);
  }
  for (const candidate of candidates) {
    const file = await tryFile(candidate);
    if (!file) continue;
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, {
      'content-type': MIME.get(ext) || 'application/octet-stream',
      'cache-control': ext === '.html' ? 'no-store' : 'public, max-age=3600',
      'x-content-type-options': 'nosniff'
    });
    createReadStream(file).pipe(res);
    return true;
  }
  return false;
}

async function renderReadme() {
  const readme = await readFile(path.join(ROOT, 'README.md'), 'utf8').catch(() => '# GoodGame.center\n\nRailway host is live.');
  return page('GoodGame.center', `
    <p class="muted">This deployment is serving the current GitHub repository through Railway. Edit the repo and redeploy to update the live domain.</p>
    <div class="grid">
      <div class="mini"><strong class="ok">Live</strong><br><span class="muted">/healthz</span></div>
      <div class="mini"><strong>Version</strong><br><span class="muted">/__version</span></div>
      <div class="mini"><strong>Source</strong><br><span class="muted">README + static files</span></div>
    </div>
    <hr style="border:0;border-top:1px solid var(--line);margin:24px 0">
    ${markdownToHtml(readme)}
  `);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    if (url.pathname === '/healthz') {
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
      res.end(JSON.stringify({ ok: true, service: SERVICE_NAME, started_at: STARTED_AT }));
      return;
    }
    if (url.pathname === '/__version') {
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
      res.end(JSON.stringify(versionPayload(req), null, 2));
      return;
    }
    const served = await serveStatic(req, res);
    if (served) return;
    if (!path.extname(url.pathname)) return send(res, await renderReadme());
    return send(res, page('Not found', '<h1>404</h1><p class="muted">That file was not found in the repository.</p>', 404));
  } catch (err) {
    console.error(err);
    return send(res, page('Server error', '<h1>500</h1><p class="muted">Server error.</p>', 500));
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`${SERVICE_NAME} listening on 0.0.0.0:${PORT}`);
});

process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 8000).unref();
});
