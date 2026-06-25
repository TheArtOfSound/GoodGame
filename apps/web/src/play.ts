// Real, playable browser games served sandboxed at /play/:slug.
// Each game is a small vanilla-canvas engine themed by the game's accent.
// Templates: arena, runner, racer, merge, logic, breaker, orbit, snake, stack.
// No backticks / ${} inside SHELL_JS — it lives in a template literal.

const SHELL_JS = `
var GG = window.GG || {};
var accent = GG.accent || '#6b93ff';
var canvas = document.getElementById('c');
var ctx = canvas.getContext('2d');
var DPR = Math.min(window.devicePixelRatio || 1, 2);
var state = 'menu';
var scoreEl = document.getElementById('score');
var ov = document.getElementById('ov');
var ovTitle = document.getElementById('ovt');
var ovText = document.getElementById('ovp');
var ovScore = document.getElementById('ovs');
var ovBtn = document.getElementById('ovb');

var A = {
  ctx: ctx, W: 0, H: 0, accent: accent, keys: {}, pointer: { x: 0, y: 0, down: false, seen: false },
  score: 0, runStarted: 0,
  rand: function (a, b) { return a + Math.random() * (b - a); },
  setScore: function (s) { A.score = s; if (scoreEl) scoreEl.textContent = String(s); },
  over: function (s, title) { endGame(s, title); },
  emit: function (type, extra) {
    try {
      var payload = { type: type, slug: GG.slug, template: GG.template, build: GG.build || '1.0.0' };
      if (extra) for (var k in extra) payload[k] = extra[k];
      parent.postMessage(payload, '*');
    } catch (e) {}
  }
};

function rrect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function circle(c, x, y, r) { c.beginPath(); c.arc(x, y, r, 0, 6.2832); c.fill(); }
A.rrect = rrect; A.circle = circle;

function resize() {
  A.W = canvas.clientWidth; A.H = canvas.clientHeight;
  canvas.width = A.W * DPR; canvas.height = A.H * DPR;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (game && game.resize) game.resize();
}
window.addEventListener('resize', resize);

window.addEventListener('keydown', function (e) {
  var k = e.key.toLowerCase(); A.keys[k] = true;
  if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].indexOf(k) >= 0) e.preventDefault();
  if (k === 'f') {
    if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(function () {});
    return;
  }
  if (k === 'p' && (state === 'playing' || state === 'paused')) { togglePause(); return; }
  if (state !== 'playing') { startGame(); return; }
  if (game.key) game.key(k);
});
window.addEventListener('keyup', function (e) { A.keys[e.key.toLowerCase()] = false; });

var pdown = null;
canvas.addEventListener('pointerdown', function (e) {
  var r = canvas.getBoundingClientRect(); A.pointer.x = e.clientX - r.left; A.pointer.y = e.clientY - r.top; A.pointer.down = true; A.pointer.seen = true;
  pdown = { x: A.pointer.x, y: A.pointer.y };
  if (state === 'playing' && game.pointerdown) game.pointerdown(A.pointer.x, A.pointer.y);
});
canvas.addEventListener('pointermove', function (e) { var r = canvas.getBoundingClientRect(); A.pointer.x = e.clientX - r.left; A.pointer.y = e.clientY - r.top; A.pointer.seen = true; });
window.addEventListener('pointerup', function () {
  A.pointer.down = false;
  if (state === 'playing' && pdown && game.swipe) {
    var dx = A.pointer.x - pdown.x, dy = A.pointer.y - pdown.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) > 28) game.swipe(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  }
  pdown = null;
});

function startGame() {
  state = 'playing'; ov.classList.add('hidden'); A.setScore(0); A.runStarted = Date.now(); game.init();
  A.emit('goodgame:run-start', { started_at: A.runStarted });
}
function togglePause() {
  if (state === 'playing') {
    state = 'paused'; ovTitle.textContent = 'Paused'; ovScore.style.display = 'none';
    ovText.textContent = 'Press P or choose resume when you are ready.'; ovBtn.textContent = 'Resume'; ov.classList.remove('hidden');
  } else if (state === 'paused') {
    state = 'playing'; ov.classList.add('hidden');
  }
}
function endGame(s, title) {
  if (state === 'over') return;
  state = 'over';
  ovTitle.textContent = title || 'Game over';
  ovScore.textContent = 'Score  ' + s; ovScore.style.display = 'block';
  ovText.textContent = game.controls || '';
  ovBtn.textContent = 'Play again';
  ov.classList.remove('hidden');
  A.emit('goodgame:score', { score: Math.max(0, Math.round(Number(s) || 0)), duration_ms: Math.max(0, Date.now() - A.runStarted) });
}
ovBtn.addEventListener('click', function () { if (state === 'paused') togglePause(); else startGame(); });

var last = 0;
var deterministicClock = typeof window.__drainVirtualTimePending === 'function';
function loop(t) {
  var dt = Math.min((t - last) / 1000, 0.05); last = t;
  if (state === 'playing' && !deterministicClock) game.update(dt);
  game.render();
  requestAnimationFrame(loop);
}

function bg() { var c = ctx; var g = c.createLinearGradient(0, 0, A.W, A.H); g.addColorStop(0, '#0a0f1c'); g.addColorStop(1, '#070a11'); c.fillStyle = g; c.fillRect(0, 0, A.W, A.H); }
function dots(c) { c.fillStyle = 'rgba(255,255,255,0.035)'; for (var x = 0; x < A.W; x += 34) for (var y = 0; y < A.H; y += 34) { c.fillRect(x, y, 1.5, 1.5); } }

// ----------------------------------------------------------------- ARENA
function makeArena() {
  var p, enemies, bullets, parts, fireT, spawnT, t, wave;
  function init() { p = { x: A.W / 2, y: A.H / 2, r: 11, sp: 235, shield: 3, inv: 0 }; enemies = []; bullets = []; parts = []; fireT = 0; spawnT = -0.7; t = 0; wave = 1; }
  function spawn() {
    var s = Math.hypot(A.W, A.H) * 0.58 + 36, a = Math.random() * 6.283;
    var heavy = t > 18 && Math.random() < Math.min(0.28, t / 180);
    enemies.push({
      x: A.W / 2 + Math.cos(a) * s, y: A.H / 2 + Math.sin(a) * s,
      r: heavy ? 17 : 9 + Math.random() * 5,
      sp: heavy ? 42 + t * 1.25 : 62 + Math.random() * 34 + t * 1.7,
      hp: heavy ? 3 : 1, heavy: heavy
    });
  }
  function boom(x, y) { for (var i = 0; i < 11; i++) { var a = Math.random() * 6.283, s = 40 + Math.random() * 130; parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.45 }); } }
  function update(dt) {
    t += dt; wave = 1 + Math.floor(t / 18); p.inv = Math.max(0, p.inv - dt);
    var dx = (A.keys['arrowright'] || A.keys['d'] ? 1 : 0) - (A.keys['arrowleft'] || A.keys['a'] ? 1 : 0);
    var dy = (A.keys['arrowdown'] || A.keys['s'] ? 1 : 0) - (A.keys['arrowup'] || A.keys['w'] ? 1 : 0);
    if (A.pointer.down) { var ax = A.pointer.x - p.x, ay = A.pointer.y - p.y, mm = Math.hypot(ax, ay) || 1; if (mm > 5) { dx = ax / mm; dy = ay / mm; } }
    var m = Math.hypot(dx, dy) || 1; p.x += dx / m * p.sp * dt; p.y += dy / m * p.sp * dt;
    p.x = Math.max(p.r, Math.min(A.W - p.r, p.x)); p.y = Math.max(p.r, Math.min(A.H - p.r, p.y));
    spawnT += dt; if (spawnT > Math.max(0.34, 1.08 - t * 0.014)) { spawnT = 0; spawn(); }
    fireT -= dt;
    if (fireT <= 0 && enemies.length) { var best = null, bd = 1e9; for (var i = 0; i < enemies.length; i++) { var e = enemies[i], d = (e.x - p.x) * (e.x - p.x) + (e.y - p.y) * (e.y - p.y); if (d < bd) { bd = d; best = e; } } var a2 = Math.atan2(best.y - p.y, best.x - p.x); bullets.push({ x: p.x, y: p.y, vx: Math.cos(a2) * 480, vy: Math.sin(a2) * 480 }); fireT = 0.2; }
    for (var i = bullets.length - 1; i >= 0; i--) { var b = bullets[i]; b.x += b.vx * dt; b.y += b.vy * dt; if (b.x < -10 || b.x > A.W + 10 || b.y < -10 || b.y > A.H + 10) bullets.splice(i, 1); }
    for (var i = enemies.length - 1; i >= 0; i--) {
      var e = enemies[i], a = Math.atan2(p.y - e.y, p.x - e.x); e.x += Math.cos(a) * e.sp * dt; e.y += Math.sin(a) * e.sp * dt;
      if (Math.hypot(e.x - p.x, e.y - p.y) < e.r + p.r && p.inv <= 0) {
        p.shield--; p.inv = 1.05; boom(p.x, p.y);
        var push = Math.atan2(e.y - p.y, e.x - p.x); e.x += Math.cos(push) * 46; e.y += Math.sin(push) * 46;
        if (p.shield <= 0) return A.over(A.score);
      }
      for (var j = bullets.length - 1; j >= 0; j--) {
        var b2 = bullets[j];
        if (Math.hypot(e.x - b2.x, e.y - b2.y) < e.r + 4) {
          bullets.splice(j, 1); e.hp--;
          if (e.hp <= 0) { enemies.splice(i, 1); A.setScore(A.score + (e.heavy ? 3 : 1)); boom(e.x, e.y); }
          break;
        }
      }
    }
    for (var i = parts.length - 1; i >= 0; i--) { var q = parts[i]; q.x += q.vx * dt; q.y += q.vy * dt; q.life -= dt; if (q.life <= 0) parts.splice(i, 1); }
  }
  function render() {
    var c = A.ctx; bg(); dots(c);
    c.fillStyle = accent; for (var i = 0; i < bullets.length; i++) circle(c, bullets[i].x, bullets[i].y, 3.5);
    c.fillStyle = '#f0556b'; for (var i = 0; i < enemies.length; i++) { var e = enemies[i]; c.globalAlpha = e.heavy ? .78 : 1; circle(c, e.x, e.y, e.r); if (e.heavy) { c.strokeStyle = '#ff9aac'; c.lineWidth = 2; c.stroke(); } } c.globalAlpha = 1;
    for (var i = 0; i < parts.length; i++) { var q = parts[i]; c.globalAlpha = Math.max(0, q.life * 2); c.fillStyle = accent; circle(c, q.x, q.y, 3); } c.globalAlpha = 1;
    c.save(); c.globalAlpha = p.inv > 0 && Math.floor(p.inv * 12) % 2 ? .35 : 1; c.shadowColor = accent; c.shadowBlur = 20; c.fillStyle = '#fff'; circle(c, p.x, p.y, p.r); c.restore();
    c.textAlign = 'right'; c.textBaseline = 'top'; c.font = '700 11px Inter, system-ui, sans-serif'; c.fillStyle = 'rgba(255,255,255,.58)'; c.fillText('WAVE ' + wave, A.W - 16, 15);
    for (var h = 0; h < 3; h++) { c.fillStyle = h < p.shield ? accent : 'rgba(255,255,255,.1)'; circle(c, A.W - 18 - h * 16, 42, 4.5); }
  }
  function snapshot() { return { seconds: Math.round(t * 10) / 10, wave: wave, shield: p.shield, player: { x: Math.round(p.x), y: Math.round(p.y) }, enemies: enemies.length, bullets: bullets.length }; }
  return { init: init, update: update, render: render, snapshot: snapshot, controls: 'Move with WASD / arrows, or hold to point. Auto-fire targets the nearest threat. Your shield can absorb three hits.' };
}

// ---------------------------------------------------------------- RUNNER
function makeRunner() {
  var gy, px, py, vy, ground, obs, spd, dist, nextGap, coyote, jumpBuffer;
  function init() { gy = A.H * 0.76; px = A.W * 0.22; py = gy; vy = 0; ground = true; obs = []; spd = 300; dist = 0; nextGap = 330; coyote = .1; jumpBuffer = 0; }
  function queueJump() { jumpBuffer = .12; }
  function key(k) { if (k === ' ' || k === 'arrowup' || k === 'w') queueJump(); }
  function pointerdown() { queueJump(); }
  function update(dt) {
    spd += dt * 9; dist += spd * dt; A.setScore(Math.floor(dist / 10));
    jumpBuffer = Math.max(0, jumpBuffer - dt); coyote = ground ? .1 : Math.max(0, coyote - dt);
    if (jumpBuffer > 0 && coyote > 0) { vy = -575; ground = false; coyote = 0; jumpBuffer = 0; }
    vy += 1600 * dt; py += vy * dt;
    if (py >= gy) { py = gy; vy = 0; ground = true; } else ground = false;
    for (var i = 0; i < obs.length; i++) obs[i].x -= spd * dt;
    if (obs.length === 0 || obs[obs.length - 1].x < A.W - nextGap) {
      var h = 24 + Math.random() * Math.min(42, 24 + dist / 900);
      obs.push({ x: A.W + 24, h: h, w: 18 + Math.random() * 15 });
      nextGap = Math.max(230, 350 - spd * .12) + Math.random() * 125;
    }
    for (var i = obs.length - 1; i >= 0; i--) { if (obs[i].x < -40) obs.splice(i, 1); }
    for (var i = 0; i < obs.length; i++) { var o = obs[i]; if (px + 12 > o.x && px - 12 < o.x + o.w && py > gy - o.h - 2) return A.over(A.score); }
  }
  function render() {
    var c = A.ctx; bg();
    c.fillStyle = 'rgba(255,255,255,.025)';
    for (var sx = -((dist * .08) % 130); sx < A.W + 130; sx += 130) { var sh = 45 + ((sx + 500) % 90); c.fillRect(sx, gy - sh - 10, 86, sh); }
    c.strokeStyle = accent; c.globalAlpha = 0.55; c.lineWidth = 2; c.beginPath(); c.moveTo(0, gy + 14); c.lineTo(A.W, gy + 14); c.stroke(); c.globalAlpha = 1;
    c.strokeStyle = 'rgba(255,255,255,0.05)'; var off = (dist * 0.5) % 60; for (var x = -off; x < A.W; x += 60) { c.beginPath(); c.moveTo(x, gy + 14); c.lineTo(x - 22, A.H); c.stroke(); }
    c.fillStyle = '#f0556b'; for (var i = 0; i < obs.length; i++) { var o = obs[i]; rrect(c, o.x, gy - o.h, o.w, o.h + 14, 3); c.fill(); }
    c.save(); c.shadowColor = accent; c.shadowBlur = 16; c.fillStyle = '#fff'; rrect(c, px - 12, py - 24, 24, 24, 6); c.fill(); c.restore();
  }
  function snapshot() { return { distance: Math.floor(dist), speed: Math.round(spd), player: { x: Math.round(px), y: Math.round(py), vy: Math.round(vy), grounded: ground }, obstacles: obs.map(function (o) { return { x: Math.round(o.x), width: Math.round(o.w), height: Math.round(o.h) }; }).slice(0, 4) }; }
  return { init: init, update: update, render: render, key: key, pointerdown: pointerdown, snapshot: snapshot, controls: 'Press Space, Up, W, or tap to jump. Inputs just before landing are buffered for consistent timing.' };
}

// ----------------------------------------------------------------- RACER
function makeRacer() {
  var px, targetX, lane, cars, spd, dist, spawnT, passed, lastPattern;
  function road() { var w = Math.min(A.W * 0.72, 430); return { x: (A.W - w) / 2, w: w }; }
  function laneX(index) { var r = road(); return r.x + r.w * ((index + .5) / 3); }
  function setLane(index) { lane = Math.max(0, Math.min(2, index)); targetX = laneX(lane); }
  function init() { lane = 1; px = targetX = laneX(lane); cars = []; spd = 330; dist = 0; spawnT = -.65; passed = 0; lastPattern = -1; }
  function key(k) { if (k === 'arrowleft' || k === 'a') setLane(lane - 1); else if (k === 'arrowright' || k === 'd') setLane(lane + 1); }
  function swipe(d) { if (d === 'left') setLane(lane - 1); else if (d === 'right') setLane(lane + 1); }
  function pointerdown(x) {
    var r = road();
    setLane(Math.floor((Math.max(r.x, Math.min(r.x + r.w - 1, x)) - r.x) / (r.w / 3)));
  }
  function spawnWave() {
    var count = dist > 1800 && Math.random() < Math.min(.48, dist / 9000) ? 2 : 1;
    var pattern = Math.floor(Math.random() * 3);
    if (count === 1 && pattern === lastPattern) pattern = (pattern + 1 + Math.floor(Math.random() * 2)) % 3;
    lastPattern = pattern;
    for (var i = 0; i < count; i++) {
      var blockedLane = count === 1 ? pattern : (pattern + i) % 3;
      cars.push({ lane: blockedLane, x: laneX(blockedLane), y: -50, counted: false });
    }
  }
  function update(dt) {
    spd += dt * 11; dist += spd * dt; A.setScore(Math.floor(dist / 10)); var r = road();
    targetX = laneX(lane); px += (targetX - px) * Math.min(1, dt * 13);
    spawnT += dt;
    if (spawnT > Math.max(.72, 1.08 - dist / 10000)) { spawnT = 0; spawnWave(); }
    for (var i = cars.length - 1; i >= 0; i--) {
      var o = cars[i]; o.x = laneX(o.lane); o.y += spd * dt;
      if (!o.counted && o.y > A.H - 20) { o.counted = true; passed++; }
      if (o.y > A.H + 50) { cars.splice(i, 1); continue; }
      if (Math.abs(o.x - px) < 28 && Math.abs(o.y - (A.H - 58)) < 48) return A.over(A.score);
    }
  }
  function render() {
    var c = A.ctx; c.fillStyle = '#070a11'; c.fillRect(0, 0, A.W, A.H); var r = road();
    c.fillStyle = '#0c1120'; c.fillRect(r.x, 0, r.w, A.H);
    c.strokeStyle = accent; c.globalAlpha = 0.6; c.lineWidth = 3; c.beginPath(); c.moveTo(r.x, 0); c.lineTo(r.x, A.H); c.moveTo(r.x + r.w, 0); c.lineTo(r.x + r.w, A.H); c.stroke(); c.globalAlpha = 1;
    c.strokeStyle = 'rgba(255,255,255,0.16)'; c.lineWidth = 4; c.setLineDash([26, 26]); var off = dist % 52; for (var k = 1; k < 3; k++) { var lx = r.x + r.w * k / 3; c.beginPath(); c.moveTo(lx, -52 + off); c.lineTo(lx, A.H); c.stroke(); } c.setLineDash([]);
    c.fillStyle = 'rgba(255,255,255,.035)'; c.fillRect(r.x + lane * r.w / 3, 0, r.w / 3, A.H);
    c.fillStyle = '#f0556b'; for (var i = 0; i < cars.length; i++) { var o = cars[i]; rrect(c, o.x - 15, o.y - 26, 30, 52, 7); c.fill(); c.fillStyle = '#ff9aac'; c.fillRect(o.x - 9, o.y - 17, 18, 8); c.fillStyle = '#f0556b'; }
    c.save(); c.shadowColor = accent; c.shadowBlur = 18; c.fillStyle = '#fff'; rrect(c, px - 16, A.H - 86, 32, 56, 8); c.fill(); c.restore();
  }
  function resize() { targetX = laneX(lane); px = targetX; }
  function snapshot() { return { lane: lane + 1, speed: Math.round(spd), distance: Math.floor(dist), passed: passed, traffic: cars.map(function (o) { return { lane: o.lane + 1, y: Math.round(o.y) }; }).slice(0, 6) }; }
  return { init: init, update: update, render: render, resize: resize, key: key, swipe: swipe, pointerdown: pointerdown, snapshot: snapshot, controls: 'Use Left / Right, A / D, swipe, or tap a lane. Traffic waves always leave at least one route open.' };
}

// ------------------------------------------------------------------ MERGE (2048)
function makeMerge() {
  var grid, n, score, moves, won, tile, gap, ox, oy;
  function init() { n = 4; grid = []; for (var i = 0; i < n * n; i++) grid.push(0); score = 0; moves = 0; won = false; add(); add(); layout(); }
  function layout() { var s = Math.min(A.W, A.H) - 40; gap = s * 0.028; tile = (s - gap * (n + 1)) / n; ox = (A.W - s) / 2 + gap; oy = (A.H - s) / 2 + gap; }
  function resize() { layout(); }
  function add() { var e = []; for (var i = 0; i < grid.length; i++) if (!grid[i]) e.push(i); if (!e.length) return; grid[e[Math.floor(Math.random() * e.length)]] = Math.random() < 0.9 ? 2 : 4; }
  function slide(line) { var a = []; for (var i = 0; i < line.length; i++) if (line[i]) a.push(line[i]); for (var i = 0; i < a.length - 1; i++) { if (a[i] === a[i + 1]) { a[i] *= 2; score += a[i]; a.splice(i + 1, 1); } } while (a.length < n) a.push(0); return a; }
  function move(dir) {
    var before = grid.join(',');
    for (var i = 0; i < n; i++) { var line = []; for (var j = 0; j < n; j++) { var idx = dir < 2 ? i * n + j : j * n + i; line.push(grid[idx]); } if (dir === 1 || dir === 3) line.reverse(); line = slide(line); if (dir === 1 || dir === 3) line.reverse(); for (var j = 0; j < n; j++) { var idx = dir < 2 ? i * n + j : j * n + i; grid[idx] = line[j]; } }
    if (grid.join(',') !== before) {
      moves++; add(); A.setScore(score);
      if (!won && bestTile() >= 2048) { won = true; return A.over(score, '2048 forged'); }
    }
    if (!canMove()) A.over(score);
  }
  function bestTile() { var best = 0; for (var i = 0; i < grid.length; i++) best = Math.max(best, grid[i]); return best; }
  function canMove() { for (var i = 0; i < grid.length; i++) { if (!grid[i]) return true; var x = i % n, y = (i / n | 0); if (x < n - 1 && grid[i] === grid[i + 1]) return true; if (y < n - 1 && grid[i] === grid[i + n]) return true; } return false; }
  function key(k) { if (k === 'arrowleft' || k === 'a') move(0); else if (k === 'arrowright' || k === 'd') move(1); else if (k === 'arrowup' || k === 'w') move(2); else if (k === 'arrowdown' || k === 's') move(3); }
  function swipe(d) { move(d === 'left' ? 0 : d === 'right' ? 1 : d === 'up' ? 2 : 3); }
  function tint(v) {
    var raw = accent.replace('#', '');
    if (raw.length === 3) raw = raw[0] + raw[0] + raw[1] + raw[1] + raw[2] + raw[2];
    var base = parseInt(raw, 16); if (!Number.isFinite(base)) base = 0x6b93ff;
    var mix = Math.min(.78, .08 + Math.log2(v) * .062);
    var r = base >> 16, g = (base >> 8) & 255, b = base & 255;
    r = Math.round(r + (255 - r) * mix); g = Math.round(g + (255 - g) * mix); b = Math.round(b + (255 - b) * mix);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }
  function render() {
    var c = A.ctx; bg(); var s = tile * n + gap * (n + 1);
    c.fillStyle = '#0e1320'; rrect(c, ox - gap, oy - gap, s, s, 14); c.fill();
    for (var i = 0; i < grid.length; i++) {
      var x = ox + (i % n) * (tile + gap), y = oy + ((i / n | 0)) * (tile + gap), v = grid[i];
      c.fillStyle = v ? tint(v) : 'rgba(255,255,255,0.04)'; rrect(c, x, y, tile, tile, 9); c.fill();
      if (v) { c.fillStyle = v <= 4 ? '#0a0e18' : '#0a0e18'; c.font = '700 ' + Math.round(tile * (v < 100 ? 0.42 : v < 1000 ? 0.34 : 0.26)) + 'px Inter, system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(v), x + tile / 2, y + tile / 2 + 1); }
    }
    c.fillStyle = 'rgba(255,255,255,.5)'; c.font = '700 11px Inter, system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.fillText('BEST ' + bestTile() + '  ·  MOVES ' + moves, A.W / 2, Math.max(18, oy - gap - 12));
  }
  function snapshot() { return { board: grid.slice(), best_tile: bestTile(), moves: moves, points: score, can_move: canMove() }; }
  return { init: init, update: function () { }, render: render, key: key, swipe: swipe, resize: resize, snapshot: snapshot, controls: 'Arrow keys or swipe to slide tiles. Merge matching numbers to forge 2048.' };
}

// ------------------------------------------------------------------ LOGIC (lights out)
function makeLogic() {
  var n, cells, level, moves, cursor, tile, gap, ox, oy;
  function init() { level = 1; build(); }
  function build() {
    n = Math.min(3 + (level - 1), 6); cells = []; moves = 0; cursor = Math.floor(n * n / 2);
    for (var i = 0; i < n * n; i++) cells.push(false);
    var last = -1, scrambleMoves = n * n + level * 2;
    for (var k = 0; k < scrambleMoves; k++) {
      var pick = Math.floor(Math.random() * n * n);
      if (pick === last) pick = (pick + 1 + Math.floor(Math.random() * (n * n - 1))) % (n * n);
      flip(pick); last = pick;
    }
    if (solved()) flip(Math.floor(n * n / 2));
    A.setScore(level - 1); layout();
  }
  function layout() { var s = Math.min(A.W - 48, A.H - 104); gap = Math.max(7, s * 0.03); tile = (s - gap * (n - 1)) / n; ox = (A.W - (tile * n + gap * (n - 1))) / 2; oy = (A.H - (tile * n + gap * (n - 1))) / 2 + 16; }
  function resize() { layout(); }
  function flip(i) { var x = i % n, y = (i / n | 0), nb = [[x, y], [x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]; for (var k = 0; k < nb.length; k++) { var a = nb[k][0], b = nb[k][1]; if (a >= 0 && a < n && b >= 0 && b < n) cells[b * n + a] = !cells[b * n + a]; } }
  function solved() { for (var i = 0; i < cells.length; i++) if (cells[i]) return false; return true; }
  function choose(index) {
    cursor = index; moves++; flip(index);
    if (solved()) { if (level >= 6) { A.setScore(6); A.over(6, 'Grid restored'); } else { level++; build(); } }
  }
  function pointerdown(x, y) { var gx = Math.floor((x - ox) / (tile + gap)), gy = Math.floor((y - oy) / (tile + gap)); if (gx < 0 || gy < 0 || gx >= n || gy >= n) return; if ((x - ox) - gx * (tile + gap) > tile || (y - oy) - gy * (tile + gap) > tile) return; choose(gy * n + gx); }
  function key(k) {
    var x = cursor % n, y = (cursor / n | 0);
    if (k === 'arrowleft' || k === 'a') x = (x + n - 1) % n;
    else if (k === 'arrowright' || k === 'd') x = (x + 1) % n;
    else if (k === 'arrowup' || k === 'w') y = (y + n - 1) % n;
    else if (k === 'arrowdown' || k === 's') y = (y + 1) % n;
    else if (k === ' ' || k === 'enter') return choose(cursor);
    else return;
    cursor = y * n + x;
  }
  function render() {
    var c = A.ctx; bg();
    c.fillStyle = 'rgba(255,255,255,0.5)'; c.font = '700 13px Inter, system-ui, sans-serif'; c.textAlign = 'center'; c.fillText('LEVEL ' + level + '  ·  MOVES ' + moves + '  ·  TURN EVERY TILE OFF', A.W / 2, oy - 18);
    for (var i = 0; i < cells.length; i++) {
      var x = ox + (i % n) * (tile + gap), y = oy + ((i / n | 0)) * (tile + gap);
      if (cells[i]) { c.save(); c.shadowColor = accent; c.shadowBlur = 22; c.fillStyle = accent; rrect(c, x, y, tile, tile, 10); c.fill(); c.restore(); }
      else { c.fillStyle = '#0e1320'; rrect(c, x, y, tile, tile, 10); c.fill(); c.strokeStyle = 'rgba(255,255,255,0.06)'; c.lineWidth = 1; c.stroke(); }
      if (i === cursor) { c.strokeStyle = '#fff'; c.lineWidth = 2; rrect(c, x + 3, y + 3, tile - 6, tile - 6, 8); c.stroke(); }
    }
  }
  function snapshot() { return { level: level, size: n, moves: moves, cursor: { x: cursor % n, y: cursor / n | 0 }, lights: cells.map(function (v) { return v ? 1 : 0; }) }; }
  return { init: init, update: function () { }, render: render, pointerdown: pointerdown, key: key, resize: resize, snapshot: snapshot, controls: 'Tap a tile, or move the cursor with arrows / WASD and press Enter or Space. Turn every light off.' };
}

// ------------------------------------------------------------------ BREAKER
function makeBreaker() {
  var paddle, ball, bricks, rows, cols, gap, bw, bh, ox, top, lives, resetT;
  function layout() { cols = Math.max(6, Math.min(10, Math.floor(A.W / 72))); rows = 5; gap = 7; bw = Math.min(76, (A.W - 44 - gap * (cols - 1)) / cols); bh = 18; ox = (A.W - (bw * cols + gap * (cols - 1))) / 2; top = Math.max(58, A.H * 0.12); }
  function resetBall() { ball = { x: paddle.x, y: paddle.y - 24, vx: (Math.random() < .5 ? -1 : 1) * 190, vy: -280, r: 7 }; resetT = .55; }
  function init() {
    layout(); paddle = { x: A.W / 2, y: A.H - 42, w: Math.min(112, A.W * 0.23), h: 13 };
    lives = 3; resetBall();
    bricks = [];
    for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) bricks.push({ x: ox + x * (bw + gap), y: top + y * (bh + gap), w: bw, h: bh, row: y });
  }
  function resize() { layout(); if (paddle) { paddle.y = A.H - 42; paddle.x = Math.max(paddle.w / 2, Math.min(A.W - paddle.w / 2, paddle.x)); } }
  function update(dt) {
    var dir = (A.keys['arrowright'] || A.keys['d'] ? 1 : 0) - (A.keys['arrowleft'] || A.keys['a'] ? 1 : 0);
    if (A.pointer.seen) paddle.x += (A.pointer.x - paddle.x) * Math.min(1, dt * 14); else paddle.x += dir * 430 * dt;
    paddle.x = Math.max(paddle.w / 2, Math.min(A.W - paddle.w / 2, paddle.x));
    if (resetT > 0) { resetT -= dt; ball.x = paddle.x; ball.y = paddle.y - 24; return; }
    var velocity = Math.hypot(ball.vx, ball.vy), steps = Math.max(1, Math.ceil(velocity * dt / Math.max(4, ball.r * .7))), stepDt = dt / steps;
    for (var step = 0; step < steps; step++) {
      var oldX = ball.x, oldY = ball.y; ball.x += ball.vx * stepDt; ball.y += ball.vy * stepDt;
      if (ball.x < ball.r) { ball.x = ball.r; ball.vx = Math.abs(ball.vx); }
      if (ball.x > A.W - ball.r) { ball.x = A.W - ball.r; ball.vx = -Math.abs(ball.vx); }
      if (ball.y < ball.r) { ball.y = ball.r; ball.vy = Math.abs(ball.vy); }
      if (ball.vy > 0 && ball.y + ball.r >= paddle.y && oldY + ball.r <= paddle.y + 3 && Math.abs(ball.x - paddle.x) <= paddle.w / 2 + ball.r) {
        var hit = (ball.x - paddle.x) / (paddle.w / 2); ball.y = paddle.y - ball.r; ball.vy = -Math.min(560, Math.abs(ball.vy) * 1.025); ball.vx = Math.max(-460, Math.min(460, ball.vx + hit * 110));
      }
      for (var i = bricks.length - 1; i >= 0; i--) {
        var b = bricks[i];
        if (ball.x + ball.r >= b.x && ball.x - ball.r <= b.x + b.w && ball.y + ball.r >= b.y && ball.y - ball.r <= b.y + b.h) {
          var fromSide = oldX + ball.r <= b.x || oldX - ball.r >= b.x + b.w;
          bricks.splice(i, 1);
          if (fromSide) { ball.x = oldX; ball.vx *= -1; } else { ball.y = oldY; ball.vy *= -1; }
          A.setScore(A.score + 10); break;
        }
      }
    }
    if (!bricks.length) { A.setScore(A.score + 100); return A.over(A.score, 'Prism cleared'); }
    if (ball.y - ball.r > A.H) { lives--; if (lives <= 0) return A.over(A.score); resetBall(); }
  }
  function render() {
    var c = A.ctx; bg(); dots(c);
    for (var i = 0; i < bricks.length; i++) { var b = bricks[i]; c.globalAlpha = 0.48 + (b.row / Math.max(1, rows - 1)) * 0.5; c.fillStyle = accent; rrect(c, b.x, b.y, b.w, b.h, 4); c.fill(); }
    c.globalAlpha = 1; c.fillStyle = '#fff'; rrect(c, paddle.x - paddle.w / 2, paddle.y, paddle.w, paddle.h, 6); c.fill();
    c.save(); c.shadowColor = accent; c.shadowBlur = 18; c.fillStyle = accent; circle(c, ball.x, ball.y, ball.r); c.restore();
    c.textAlign = 'right'; c.textBaseline = 'top'; c.font = '700 11px Inter, system-ui, sans-serif'; c.fillStyle = 'rgba(255,255,255,.55)'; c.fillText('LIVES ' + lives, A.W - 16, 15);
  }
  function snapshot() { return { lives: lives, bricks: bricks.length, paddle_x: Math.round(paddle.x), ball: { x: Math.round(ball.x), y: Math.round(ball.y), vx: Math.round(ball.vx), vy: Math.round(ball.vy) }, ready_ms: Math.max(0, Math.round(resetT * 1000)) }; }
  return { init: init, update: update, render: render, resize: resize, snapshot: snapshot, controls: 'Move with Left / Right, A / D, mouse, or touch. Clear every prism before all three balls are lost.' };
}

// -------------------------------------------------------------------- ORBIT
function makeOrbit() {
  var angle, dir, radius, items, spawnT, speed;
  function init() { angle = -1.57; dir = 1; radius = Math.min(A.W, A.H) * 0.28; items = []; spawnT = 0; speed = 1.9; }
  function resize() { radius = Math.min(A.W, A.H) * 0.28; }
  function switchDir() { dir *= -1; }
  function key(k) { if (k === ' ' || k === 'arrowleft' || k === 'arrowright' || k === 'a' || k === 'd') switchDir(); }
  function pointerdown() { switchDir(); }
  function angularDistance(a, b) { return Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))); }
  function spawnItem() {
    var candidate = 0, tries = 0;
    do {
      candidate = Math.random() * 6.283; tries++;
    } while (tries < 24 && (angularDistance(candidate, angle) < .72 || items.some(function (it) { return angularDistance(candidate, it.a) < .34; })));
    items.push({ a: candidate, life: 5.4, age: 0, bad: Math.random() < Math.min(.42, .13 + A.score * .012) });
  }
  function update(dt) {
    angle += dir * speed * dt; spawnT += dt;
    if (spawnT > Math.max(0.58, 1.15 - A.score * 0.02)) {
      spawnT = 0; spawnItem();
    }
    for (var i = items.length - 1; i >= 0; i--) {
      var it = items[i]; it.life -= dt; it.age += dt; it.a -= dir * 0.1 * dt;
      var d = angularDistance(angle, it.a);
      if (it.age > .36 && d < 0.105) { items.splice(i, 1); if (it.bad) return A.over(A.score); A.setScore(A.score + 1); speed += 0.035; continue; }
      if (it.life <= 0) items.splice(i, 1);
    }
  }
  function render() {
    var c = A.ctx; bg(); var cx = A.W / 2, cy = A.H / 2;
    c.strokeStyle = 'rgba(255,255,255,.12)'; c.lineWidth = 2; c.beginPath(); c.arc(cx, cy, radius, 0, 6.283); c.stroke();
    c.fillStyle = 'rgba(255,255,255,.05)'; circle(c, cx, cy, radius * .18);
    for (var i = 0; i < items.length; i++) {
      var it = items[i], x = cx + Math.cos(it.a) * radius, y = cy + Math.sin(it.a) * radius;
      c.globalAlpha = Math.min(1, it.age / .36);
      if (it.bad) { c.save(); c.translate(x, y); c.rotate(.785); c.fillStyle = '#ff5d73'; c.fillRect(-7, -7, 14, 14); c.strokeStyle = '#fff'; c.globalAlpha *= .65; c.lineWidth = 1.5; c.strokeRect(-7, -7, 14, 14); c.restore(); }
      else { c.fillStyle = accent; circle(c, x, y, 6); }
    }
    c.globalAlpha = 1;
    var px = cx + Math.cos(angle) * radius, py = cy + Math.sin(angle) * radius;
    c.save(); c.shadowColor = accent; c.shadowBlur = 22; c.fillStyle = '#fff'; circle(c, px, py, 10); c.restore();
  }
  function snapshot() { return { angle: Math.round(angle * 1000) / 1000, direction: dir, speed: Math.round(speed * 100) / 100, items: items.map(function (it) { return { angle: Math.round(it.a * 1000) / 1000, hazard: it.bad, age_ms: Math.round(it.age * 1000), life_ms: Math.round(it.life * 1000), distance: Math.round(angularDistance(angle, it.a) * 1000) / 1000 }; }) }; }
  return { init: init, update: update, render: render, resize: resize, key: key, pointerdown: pointerdown, snapshot: snapshot, controls: 'Tap, click, or press Space to reverse direction. Collect round signals and avoid red diamonds.' };
}

// -------------------------------------------------------------------- SNAKE
function makeSnake() {
  var n, cell, ox, oy, snake, food, dir, next, tick, interval, turnQueued;
  function layout() { cell = Math.max(8, Math.floor(Math.min((A.W - 28) / n, (A.H - 46) / n))); ox = Math.floor((A.W - cell * n) / 2); oy = Math.floor((A.H - cell * n) / 2); }
  function placeFood() {
    var open = [];
    for (var y = 0; y < n; y++) for (var x = 0; x < n; x++) if (!snake.some(function (s) { return s.x === x && s.y === y; })) open.push({ x: x, y: y });
    if (!open.length) { food = null; A.over(A.score, 'Network complete'); return false; }
    food = open[Math.floor(Math.random() * open.length)]; return true;
  }
  function init() { n = A.W < 520 ? 18 : 22; layout(); var m = Math.floor(n / 2); snake = [{ x: m, y: m }, { x: m - 1, y: m }, { x: m - 2, y: m }]; dir = { x: 1, y: 0 }; next = { x: 1, y: 0 }; tick = 0; interval = .13; turnQueued = false; placeFood(); }
  function resize() { layout(); }
  function turn(x, y) { if (turnQueued || (x === -dir.x && y === -dir.y)) return; next = { x: x, y: y }; turnQueued = true; }
  function key(k) { if (k === 'arrowleft' || k === 'a') turn(-1, 0); else if (k === 'arrowright' || k === 'd') turn(1, 0); else if (k === 'arrowup' || k === 'w') turn(0, -1); else if (k === 'arrowdown' || k === 's') turn(0, 1); }
  function swipe(d) { if (d === 'left') turn(-1, 0); else if (d === 'right') turn(1, 0); else if (d === 'up') turn(0, -1); else turn(0, 1); }
  function step() {
    dir = next; turnQueued = false; var h = snake[0], head = { x: h.x + dir.x, y: h.y + dir.y };
    var eating = food && head.x === food.x && head.y === food.y;
    var bodyLength = snake.length - (eating ? 0 : 1), hitBody = false;
    for (var i = 0; i < bodyLength; i++) if (snake[i].x === head.x && snake[i].y === head.y) { hitBody = true; break; }
    if (head.x < 0 || head.x >= n || head.y < 0 || head.y >= n || hitBody) return A.over(A.score);
    snake.unshift(head);
    if (eating) { A.setScore(A.score + 1); interval = Math.max(.065, interval - .003); placeFood(); } else snake.pop();
  }
  function update(dt) { tick += dt; while (tick >= interval && state === 'playing') { tick -= interval; step(); } }
  function render() {
    var c = A.ctx; bg();
    c.fillStyle = 'rgba(255,255,255,.03)'; c.fillRect(ox, oy, cell * n, cell * n);
    if (food) { c.fillStyle = '#ffcf4a'; rrect(c, ox + food.x * cell + 3, oy + food.y * cell + 3, cell - 6, cell - 6, 4); c.fill(); }
    for (var i = snake.length - 1; i >= 0; i--) { var s = snake[i]; c.globalAlpha = .42 + (1 - i / snake.length) * .58; c.fillStyle = i === 0 ? '#fff' : accent; rrect(c, ox + s.x * cell + 2, oy + s.y * cell + 2, cell - 4, cell - 4, 4); c.fill(); }
    c.globalAlpha = 1;
  }
  function snapshot() { return { grid: n, length: snake.length, interval_ms: Math.round(interval * 1000), direction: { x: dir.x, y: dir.y }, head: { x: snake[0].x, y: snake[0].y }, food: food ? { x: food.x, y: food.y } : null, body: snake.slice(0, 12).map(function (s) { return { x: s.x, y: s.y }; }) }; }
  return { init: init, update: update, render: render, resize: resize, key: key, swipe: swipe, snapshot: snapshot, controls: 'Use arrows, WASD, or swipe. Collect packets, grow, and never cross the wall or your trail.' };
}

// -------------------------------------------------------------------- STACK
function makeStack() {
  var blocks, moving, scraps, baseY, blockH, speed, direction, camera, cameraTarget, perfects, flash, lastW;
  function init() {
    blockH = Math.max(18, Math.min(30, A.H * .045)); baseY = A.H - 38; camera = 0; cameraTarget = 0; perfects = 0; flash = 0; scraps = []; lastW = A.W;
    blocks = [{ x: A.W / 2 - Math.min(170, A.W * .32) / 2, y: baseY, w: Math.min(170, A.W * .32), h: blockH }];
    nextBlock();
  }
  function nextBlock() {
    var prev = blocks[blocks.length - 1]; direction = blocks.length % 2 ? 1 : -1; speed = Math.min(620, 310 + blocks.length * 16);
    moving = { x: direction > 0 ? 0 : A.W - prev.w, y: baseY - blocks.length * blockH, w: prev.w, h: blockH };
  }
  function drop() {
    if (!moving) return; var prev = blocks[blocks.length - 1], left = Math.max(moving.x, prev.x), right = Math.min(moving.x + moving.w, prev.x + prev.w), w = right - left;
    if (w <= 3) return A.over(A.score);
    if (Math.abs(moving.x - prev.x) <= 5) { moving.x = prev.x; moving.w = prev.w; w = prev.w; perfects++; flash = .22; }
    else {
      perfects = 0;
      var cutX = moving.x < prev.x ? moving.x : right, cutW = moving.w - w;
      if (cutW > 2) scraps.push({ x: cutX, y: moving.y, w: cutW, vy: 30, life: .65 });
      moving.x = left; moving.w = w;
    }
    blocks.push(moving); A.setScore(blocks.length - 1); moving = null;
    if (blocks.length > 8) cameraTarget = (blocks.length - 8) * blockH;
    nextBlock();
  }
  function key(k) { if (k === ' ' || k === 'arrowdown' || k === 'enter') drop(); }
  function pointerdown() { drop(); }
  function update(dt) {
    flash = Math.max(0, flash - dt); camera += (cameraTarget - camera) * Math.min(1, dt * 10);
    for (var i = scraps.length - 1; i >= 0; i--) { var s = scraps[i]; s.vy += 900 * dt; s.y += s.vy * dt; s.life -= dt; if (s.life <= 0) scraps.splice(i, 1); }
    moving.x += direction * speed * dt;
    if (direction > 0 && moving.x + moving.w >= A.W) { moving.x = A.W - moving.w; direction = -1; }
    if (direction < 0 && moving.x <= 0) { moving.x = 0; direction = 1; }
  }
  function render() {
    var c = A.ctx; bg(); dots(c);
    for (var i = 0; i < blocks.length; i++) { var b = blocks[i]; c.globalAlpha = .58 + i / Math.max(1, blocks.length) * .42; c.fillStyle = accent; rrect(c, b.x, b.y + camera, b.w, b.h - 2, 3); c.fill(); }
    if (moving) { c.globalAlpha = 1; c.fillStyle = '#fff'; rrect(c, moving.x, moving.y + camera, moving.w, moving.h - 2, 3); c.fill(); }
    for (var i = 0; i < scraps.length; i++) { var s = scraps[i]; c.globalAlpha = Math.max(0, s.life / .65); c.fillStyle = '#f0556b'; rrect(c, s.x, s.y + camera, s.w, blockH - 2, 3); c.fill(); }
    c.globalAlpha = 1;
    if (flash > 0) { c.fillStyle = 'rgba(255,255,255,' + (flash * .45) + ')'; c.fillRect(0, 0, A.W, A.H); }
    c.textAlign = 'right'; c.textBaseline = 'top'; c.font = '700 11px Inter, system-ui, sans-serif'; c.fillStyle = 'rgba(255,255,255,.55)'; c.fillText(perfects ? 'PERFECT ×' + perfects : 'ALIGN THE EDGES', A.W - 16, 15);
  }
  function resize() {
    if (!blocks || !lastW) return;
    var scale = A.W / lastW; baseY = A.H - 38;
    for (var i = 0; i < blocks.length; i++) { blocks[i].x *= scale; blocks[i].w *= scale; blocks[i].y = baseY - i * blockH; }
    if (moving) { moving.x *= scale; moving.w *= scale; moving.y = baseY - blocks.length * blockH; }
    for (var j = 0; j < scraps.length; j++) { scraps[j].x *= scale; scraps[j].w *= scale; }
    lastW = A.W; cameraTarget = blocks.length > 8 ? (blocks.length - 8) * blockH : 0; camera = cameraTarget;
  }
  function snapshot() { var top = blocks[blocks.length - 1]; return { height: blocks.length - 1, perfect_streak: perfects, camera: Math.round(camera), top: { x: Math.round(top.x), width: Math.round(top.w) }, moving: moving ? { x: Math.round(moving.x), width: Math.round(moving.w), direction: direction, speed: Math.round(speed) } : null, scraps: scraps.length }; }
  return { init: init, update: update, render: render, resize: resize, key: key, pointerdown: pointerdown, snapshot: snapshot, controls: 'Tap, click, or press Space to drop each slab. Drops within five pixels snap perfectly; overhangs are cut away.' };
}

var FACTORIES = { arena: makeArena, runner: makeRunner, racer: makeRacer, merge: makeMerge, logic: makeLogic, breaker: makeBreaker, orbit: makeOrbit, snake: makeSnake, stack: makeStack };
var game = (FACTORIES[GG.template] || makeArena)();
resize();
if (ovTitle) { ovTitle.textContent = GG.title || 'Play'; ovText.textContent = game.controls; ovScore.style.display = 'none'; ovBtn.textContent = '\\u25B6 Play'; }
game.init();
if (location.search.indexOf('auto') >= 0) { startGame(); var _d = ['arrowleft', 'arrowdown', 'arrowright', 'arrowdown']; for (var _i = 0; _i < 90; _i++) { try { game.update(0.05); } catch (e) {} if (game.key && _i % 2 === 0) { try { game.key(_d[(_i / 2) % 4]); } catch (e) {} } } }
window.render_game_to_text = function () {
  return JSON.stringify({
    coordinate_system: 'origin top-left; x right; y down',
    mode: state,
    game: GG.title,
    slug: GG.slug,
    template: GG.template,
    score: A.score,
    viewport: { width: Math.round(A.W), height: Math.round(A.H) },
    controls: game.controls || '',
    state: game.snapshot ? game.snapshot() : null
  });
};
window.advanceTime = function (ms) {
  var steps = Math.max(1, Math.round(ms / (1000 / 60)));
  for (var i = 0; i < steps; i++) if (state === 'playing') game.update(1 / 60);
  game.render();
};
requestAnimationFrame(loop);
`;

const PLAY_CSS = `*{margin:0;box-sizing:border-box}html,body{height:100%}body{background:#070a11;overflow:hidden;font-family:Inter,system-ui,-apple-system,sans-serif;color:#fff}
#c{display:block;width:100vw;height:100vh;touch-action:none;cursor:crosshair}
#hud{position:fixed;top:13px;left:16px;z-index:5;pointer-events:none;text-shadow:0 1px 6px rgba(0,0,0,.6)}
#hud .t{font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.5);font-weight:700}
#hud .s{font-size:24px;font-weight:800;letter-spacing:-.02em;line-height:1.1}
#ov{position:fixed;inset:0;z-index:10;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:11px;text-align:center;padding:24px;background:rgba(7,10,17,.8);backdrop-filter:blur(7px)}
#ov.hidden{display:none}
#ov h2{font-size:32px;letter-spacing:-.03em}
#ov p{color:rgba(255,255,255,.68);max-width:42ch;font-size:14px;line-height:1.6}
#ovs{font-size:16px;font-weight:700;color:var(--ac)}
#ov button{margin-top:6px;border:0;border-radius:13px;padding:14px 30px;font-weight:800;font-size:15px;cursor:pointer;background:#fff;color:#0a0e18;font-family:inherit}
#ov button:hover{transform:translateY(-1px)}`;

export function playDoc(o: { slug: string; title: string; accent: string; template: string }): string {
  const theme = JSON.stringify({ slug: o.slug, title: o.title, accent: o.accent, template: o.template, build: '1.1.0' });
  return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/>' +
    '<meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no"/>' +
    '<title>' + o.title.replace(/</g, '&lt;') + ' — Play</title>' +
    '<link rel="preconnect" href="https://fonts.googleapis.com"/>' +
    '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800&display=swap" rel="stylesheet"/>' +
    '<style>' + PLAY_CSS + '</style></head><body style="--ac:' + o.accent + '">' +
    '<canvas id="c"></canvas>' +
    '<div id="hud"><div class="t">' + o.title.replace(/</g, '&lt;') + '</div><div class="s" id="score">0</div></div>' +
    '<div id="ov"><h2 id="ovt">Play</h2><div id="ovs"></div><p id="ovp"></p><button id="ovb">Play</button></div>' +
    '<script>window.GG=' + theme + ';</' + 'script>' +
    '<script>' + SHELL_JS + '</' + 'script>' +
    '</body></html>';
}

// Human label for each template (used by the create form + play page).
export const TEMPLATES: { id: string; name: string; blurb: string }[] = [
  { id: 'arena', name: 'Arena survivor', blurb: 'Top-down auto-fire arena. Move, survive escalating waves.' },
  { id: 'runner', name: 'Endless runner', blurb: 'One-button jumper that speeds up the longer you last.' },
  { id: 'racer', name: 'Lane racer', blurb: 'Dodge oncoming traffic down a neon road.' },
  { id: 'merge', name: '2048 merge', blurb: 'Slide and merge numbered tiles to 2048.' },
  { id: 'logic', name: 'Lights out', blurb: 'Flip tiles and their neighbors to clear the board.' },
  { id: 'breaker', name: 'Brick breaker', blurb: 'Paddle-and-ball arcade game with a full prism wall.' },
  { id: 'orbit', name: 'Orbit reflex', blurb: 'One-tap direction switching, pickups, and hazards.' },
  { id: 'snake', name: 'Grid snake', blurb: 'Classic growing trail with keyboard and swipe controls.' },
  { id: 'stack', name: 'Perfect stack', blurb: 'One-button timing game about clean overlap and height.' },
];
export const TEMPLATE_IDS = TEMPLATES.map((t) => t.id);
