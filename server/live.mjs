// Live relay: the storyteller's iPad publishes the public state of the game, the TV and phones follow it.
// No dependency. Rooms are kept in memory and in a JSON file, so a restart (or a refresh) loses nothing.
//
//   POST /api/live                → { code, token }       create a room
//   PUT  /api/live/:code          (Bearer token) body = public snapshot
//   GET  /api/live/:code          → { snap, updatedAt, now }
//   GET  /api/live/:code/events   → Server-Sent Events, the same payload on every change
//   DELETE /api/live/:code        (Bearer token) close the room
//   POST /api/live/unlock         body = { password } → 204 if right (or no password set), 403 otherwise
//
// Handing out characters on the players' phones (setup only):
//   PUT  /api/live/:code/seats    (Bearer token) body = { gameId, players: [{ id, name, role, alignment }] } | null
//   POST /api/live/:code/claim    body = { id, key? } → { key, role, alignment, name }  ("this is me": first come, first served)
//   POST /api/live/:code/seen     body = { id, key }  → 204  (the player has looked at their character)
//   POST /api/live/:code/release  body = { id, key } or Bearer token → 204  (not me / the storyteller frees the seat)
// The characters never go out in the public payload: only names and who has claimed / seen their seat.
// They are dropped as soon as the storyteller closes the hand-out (the game starts).
//
// Env: LIVE_PORT (8081), LIVE_HOST (127.0.0.1), LIVE_DATA_DIR (no file if empty), LIVE_TTL_HOURS (24),
// GRIMOIRE_PASSWORD (empty = no password): needed on the home page to create games, and to open a room.
// Watching a room (GET) never needs it: the TV and the phones only have the link.
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { join } from 'node:path';

const PORT = Number(process.env.LIVE_PORT ?? 8081);
const HOST = process.env.LIVE_HOST ?? '127.0.0.1';
const DATA_DIR = process.env.LIVE_DATA_DIR ?? '';
const PASSWORD = process.env.GRIMOIRE_PASSWORD ?? '';
const TTL = Number(process.env.LIVE_TTL_HOURS ?? 24) * 3600_000;
const MAX_ROOMS = 1000;
const MAX_BODY = 64 * 1024;
const MAX_LISTENERS = 50;
// No 0/O/1/I/L: the code is also read aloud and typed by hand.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/**
 * @typedef {{ id: string, name: string, role: string, alignment: string, v: number }} Seat
 * @typedef {{ gameId: string, players: Seat[], claims: Record<string, { key: string, seen: boolean }> }} Seats
 * @type {Map<string, { token: string, snap: unknown, seats?: Seats | null, closed?: unknown, updatedAt: number, listeners: Set<import('node:http').ServerResponse> }>}
 */
const rooms = new Map();

// --- persistence ---------------------------------------------------------------------------

const file = DATA_DIR ? join(DATA_DIR, 'rooms.json') : '';
function load() {
  if (!file) return;
  try {
    const saved = JSON.parse(readFileSync(file, 'utf8'));
    for (const [code, r] of Object.entries(saved)) rooms.set(code, { token: r.token, snap: r.snap, seats: r.seats ?? null, closed: r.closed ?? null, updatedAt: r.updatedAt, listeners: new Set() });
  } catch { /* first start */ }
}
let saveTimer = null;
function save() {
  if (!file || saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    const out = {};
    for (const [code, r] of rooms) out[code] = { token: r.token, snap: r.snap, seats: r.seats ?? null, closed: r.closed ?? null, updatedAt: r.updatedAt };
    try {
      mkdirSync(DATA_DIR, { recursive: true });
      writeFileSync(`${file}.tmp`, JSON.stringify(out));
      renameSync(`${file}.tmp`, file);
    } catch (e) { console.error('live: cannot save rooms', e); }
  }, 1000);
}

function sweep() {
  const now = Date.now();
  let changed = false;
  for (const [code, r] of rooms) {
    if (now - r.updatedAt > TTL && r.listeners.size === 0) { rooms.delete(code); changed = true; }
  }
  if (changed) save();
}

// --- helpers -------------------------------------------------------------------------------

function newCode() {
  for (;;) {
    const bytes = randomBytes(4);
    const code = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
    if (!rooms.has(code)) return code;
  }
}

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(body === undefined ? '' : JSON.stringify(body));
}

function authorised(req, room) {
  const given = Buffer.from((req.headers.authorization ?? '').replace(/^Bearer\s+/i, ''));
  const expected = Buffer.from(room.token);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

const sha = (s) => createHash('sha256').update(s).digest();
/** The storyteller's app sends the password it was unlocked with in this header when it opens a room. */
const passwordOk = (given) => !PASSWORD || timingSafeEqual(sha(String(given ?? '')), sha(PASSWORD));
/** Header values are ASCII only: the app sends the password URI-encoded. */
const headerPassword = (req) => { try { return decodeURIComponent(req.headers['x-grimoire-password'] ?? ''); } catch { return ''; } };

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) { reject(new Error('too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

/** Public side of the hand-out: names, and who has claimed / seen their seat. Never the characters. */
const publicSeats = (seats) => seats && {
  gameId: seats.gameId,
  players: seats.players.map((p) => ({ id: p.id, name: p.name, v: p.v, claimed: !!seats.claims[p.id], seen: !!seats.claims[p.id]?.seen })),
};
const payload = (room) => ({ snap: room.snap, seats: publicSeats(room.seats), updatedAt: room.updatedAt, now: Date.now() });

const sig = (p) => createHash('sha256').update(`${p.role}/${p.alignment}`).digest('base64url').slice(0, 12);
const sameKey = (a, b) => {
  const x = Buffer.from(String(a ?? '')), y = Buffer.from(String(b ?? ''));
  return x.length === y.length && x.length > 0 && timingSafeEqual(x, y);
};
const str = (v, max = 64) => (typeof v === 'string' && v.length > 0 && v.length <= max ? v : null);

/** New list of seats from the storyteller: claims survive for the same game, and "seen" is reset if a character changed. */
function setSeats(room, body) {
  if (body === null) {
    // Kept without the characters (only a fingerprint), so that going back a step and returning keeps the claims.
    if (room.seats) room.closed = { gameId: room.seats.gameId, claims: room.seats.claims, players: room.seats.players.map((p) => ({ id: p.id, v: p.v, sig: sig(p) })) };
    room.seats = null;
    return true;
  }
  const gameId = str(body?.gameId);
  if (!gameId || !Array.isArray(body.players) || body.players.length > 30) return false;
  const players = [];
  for (const p of body.players) {
    const id = str(p?.id), name = str(p?.name, 40), role = str(p?.role), alignment = str(p?.alignment, 8);
    if (!id || !name || !role || !alignment) return false;
    players.push({ id, name, role, alignment, v: 0 });
  }
  const prev = room.seats?.gameId === gameId ? room.seats : room.closed?.gameId === gameId ? room.closed : null;
  const claims = {};
  for (const p of players) {
    const old = prev?.players.find((q) => q.id === p.id);
    const changed = !!old && (old.sig ?? sig(old)) !== sig(p);
    p.v = old ? old.v + (changed ? 1 : 0) : 0;
    const c = prev?.claims[p.id];
    if (c) claims[p.id] = { key: c.key, seen: c.seen && !changed };
  }
  room.seats = { gameId, players, claims };
  room.closed = null;
  return true;
}

async function seatAction(req, res, room, action) {
  if (action === 'seats') {
    if (req.method !== 'PUT') return send(res, 405, { error: 'method' });
    if (!authorised(req, room)) return send(res, 403, { error: 'forbidden' });
    let body;
    try { body = JSON.parse(await readBody(req)); } catch { return send(res, 400, { error: 'bad body' }); }
    if (!setSeats(room, body)) return send(res, 400, { error: 'bad body' });
    room.updatedAt = Date.now();
    broadcast(room);
    save();
    return send(res, 204);
  }
  if (req.method !== 'POST') return send(res, 405, { error: 'method' });
  let body;
  try { body = JSON.parse(await readBody(req)); } catch { return send(res, 400, { error: 'bad body' }); }
  const seats = room.seats;
  const seat = seats?.players.find((p) => p.id === body?.id);
  if (!seats || !seat) return send(res, 409, { error: 'closed' });
  const claim = seats.claims[seat.id];
  const mine = !!claim && sameKey(claim.key, body.key);

  if (action === 'claim') {
    if (claim && !mine) return send(res, 409, { error: 'taken' });
    const key = claim?.key ?? randomBytes(18).toString('base64url');
    if (!claim) { seats.claims[seat.id] = { key, seen: false }; broadcast(room); save(); }
    return send(res, 200, { key, name: seat.name, role: seat.role, alignment: seat.alignment, v: seat.v });
  }
  if (action === 'seen') {
    if (!mine) return send(res, 403, { error: 'forbidden' });
    if (!claim.seen) { claim.seen = true; broadcast(room); save(); }
    return send(res, 204);
  }
  // release: the player ("not me") or the storyteller.
  if (!mine && !authorised(req, room)) return send(res, 403, { error: 'forbidden' });
  if (claim) { delete seats.claims[seat.id]; broadcast(room); save(); }
  return send(res, 204);
}

function broadcast(room, event = 'state') {
  const data = event === 'state' ? JSON.stringify(payload(room)) : '{}';
  for (const res of room.listeners) res.write(`event: ${event}\ndata: ${data}\n\n`);
}

// --- routes --------------------------------------------------------------------------------

async function handle(req, res) {
  const url = new URL(req.url ?? '/', 'http://x');
  if (url.pathname.replace(/\/$/, '') === '/api/live/unlock') {
    if (req.method !== 'POST') return send(res, 405, { error: 'method' });
    let body;
    try { body = JSON.parse(await readBody(req)); } catch { return send(res, 400, { error: 'bad body' }); }
    if (passwordOk(body?.password)) return send(res, 204);
    // Slows down guessing.
    await new Promise((r) => setTimeout(r, 1000));
    return send(res, 403, { error: 'wrong password' });
  }
  const m = url.pathname.match(/^\/api\/live(?:\/([A-Z0-9]{4,8}))?(?:\/(events|seats|claim|seen|release))?\/?$/);
  if (!m) return send(res, 404, { error: 'not found' });
  const [, code, sub] = m;
  const events = sub === 'events';
  if (sub && !code) return send(res, 404, { error: 'not found' });

  if (!code) {
    if (req.method !== 'POST') return send(res, 405, { error: 'method' });
    if (!passwordOk(headerPassword(req))) return send(res, 403, { error: 'forbidden' });
    sweep();
    if (rooms.size >= MAX_ROOMS) return send(res, 503, { error: 'full' });
    const room = { token: randomBytes(24).toString('base64url'), snap: null, updatedAt: Date.now(), listeners: new Set() };
    const c = newCode();
    rooms.set(c, room);
    save();
    return send(res, 201, { code: c, token: room.token });
  }

  let room = rooms.get(code);
  // A room the relay no longer knows (expired, data lost, opened offline) is claimed by the first push.
  if (!room && req.method === 'PUT' && /^Bearer\s+\S{16,}$/i.test(req.headers.authorization ?? '')) {
    if (!passwordOk(headerPassword(req))) return send(res, 403, { error: 'forbidden' });
    if (rooms.size >= MAX_ROOMS) return send(res, 503, { error: 'full' });
    room = { token: req.headers.authorization.replace(/^Bearer\s+/i, ''), snap: null, updatedAt: Date.now(), listeners: new Set() };
    rooms.set(code, room);
  }
  if (!room) return send(res, 404, { error: 'unknown room' });
  if (sub && !events) return seatAction(req, res, room, sub);

  if (events) {
    if (req.method !== 'GET') return send(res, 405, { error: 'method' });
    if (room.listeners.size >= MAX_LISTENERS) return send(res, 503, { error: 'busy' });
    // Small writes go out at once (no Nagle delay): the TV follows the iPad as closely as possible.
    req.socket.setNoDelay(true);
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-store',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.write(`retry: 3000\nevent: state\ndata: ${JSON.stringify(payload(room))}\n\n`);
    room.listeners.add(res);
    const ping = setInterval(() => res.write(': ping\n\n'), 25_000);
    req.on('close', () => { clearInterval(ping); room.listeners.delete(res); });
    return;
  }

  if (req.method === 'GET') return send(res, 200, payload(room));

  if (req.method === 'PUT') {
    if (!authorised(req, room)) return send(res, 403, { error: 'forbidden' });
    let snap;
    try { snap = JSON.parse(await readBody(req)); } catch { return send(res, 400, { error: 'bad body' }); }
    if (!snap || typeof snap !== 'object') return send(res, 400, { error: 'bad body' });
    room.snap = snap;
    room.updatedAt = Date.now();
    broadcast(room);
    save();
    return send(res, 204);
  }

  if (req.method === 'DELETE') {
    if (!authorised(req, room)) return send(res, 403, { error: 'forbidden' });
    broadcast(room, 'closed');
    for (const l of room.listeners) l.end();
    rooms.delete(code);
    save();
    return send(res, 204);
  }

  return send(res, 405, { error: 'method' });
}

load();
setInterval(sweep, 3600_000).unref();
const server = createServer({ noDelay: true }, (req, res) => {
  handle(req, res).catch((e) => { console.error(e); if (!res.headersSent) send(res, 500, { error: 'server' }); });
});
server.listen(PORT, HOST, () => console.log(`live relay on http://${HOST}:${PORT}`));
