// lib/db.js
// Very small JSON-file "database" with a write queue so concurrent
// requests never corrupt the file. No native modules -> installs
// cleanly on Heroku, Render, and Railway free tiers.
//
// IMPORTANT (read this before going to production):
// Heroku's and most Render/Railway free-tier filesystems are EPHEMERAL.
// That means data/*.json gets wiped whenever the app restarts or
// redeploys. This is fine for a demo / MVP. For real production use,
// either:
//   1) Attach a persistent volume (Railway + Render both offer this
//      on paid plans), or
//   2) Swap this file for a real database (Postgres/Mongo Atlas are
//      both free-tier friendly). The rest of the app only talks to
//      the functions exported below, so swapping the storage engine
//      later only means rewriting this one file.

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const FILES = {
  games: path.join(DATA_DIR, 'games.json'),
  users: path.join(DATA_DIR, 'users.json'),
  deposits: path.join(DATA_DIR, 'deposits.json'),
  purchases: path.join(DATA_DIR, 'purchases.json'),
};

function ensureFile(file) {
  if (!fs.existsSync(file)) fs.writeFileSync(file, '[]', 'utf8');
}
Object.values(FILES).forEach(ensureFile);

// Per-file write queues to serialize writes and avoid race conditions
// when two requests hit the same collection at once.
const queues = {};
function withQueue(file, fn) {
  const prev = queues[file] || Promise.resolve();
  const next = prev.then(fn, fn);
  queues[file] = next.catch(() => {});
  return next;
}

function readCollection(name) {
  const file = FILES[name];
  const raw = fs.readFileSync(file, 'utf8') || '[]';
  try {
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

function writeCollection(name, data) {
  const file = FILES[name];
  return withQueue(file, () =>
    fs.promises.writeFile(file, JSON.stringify(data, null, 2), 'utf8')
  );
}

function nextId(collection) {
  return collection.reduce((max, item) => Math.max(max, item.id || 0), 0) + 1;
}

module.exports = {
  readCollection,
  writeCollection,
  nextId,
};
