// routes/games.js
// Games catalogue. Each game is uploaded with an icon link, a preview
// image link, a download link, a price in coins, and a PASSWORD that
// only that uploader knows (used later to edit or delete the listing).
// That password is completely separate from wallet login accounts.

const express = require('express');
const router = express.Router();
const db = require('../lib/db');
const { hashPassword, verifyPassword } = require('../lib/passwords');
const { requireLogin } = require('../lib/middleware');

function isValidUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch (e) {
    return false;
  }
}

// Never send passwordHash to the client.
function publicGame(g, unlocked) {
  return {
    id: g.id,
    name: g.name,
    iconUrl: g.iconUrl,
    previewUrl: g.previewUrl,
    priceCoins: g.priceCoins,
    downloads: g.downloads || 0,
    createdAt: g.createdAt,
    // downloadUrl is only revealed once it's "unlocked" (free game,
    // or the logged-in user has already paid for it).
    downloadUrl: unlocked ? g.downloadUrl : null,
    unlocked: !!unlocked,
  };
}

// GET /api/games  -> catalogue for the browse page
router.get('/', (req, res) => {
  const games = db.readCollection('games');
  let purchasedIds = new Set();
  if (req.session.userId) {
    const purchases = db.readCollection('purchases');
    purchasedIds = new Set(
      purchases
        .filter((p) => p.userId === req.session.userId)
        .map((p) => p.gameId)
    );
  }
  const list = games
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((g) => publicGame(g, g.priceCoins === 0 || purchasedIds.has(g.id)));
  res.json({ games: list });
});

// GET /api/games/:id -> single game detail
router.get('/:id', (req, res) => {
  const games = db.readCollection('games');
  const game = games.find((g) => g.id === Number(req.params.id));
  if (!game) return res.status(404).json({ error: 'Game haipo.' });

  let unlocked = game.priceCoins === 0;
  if (!unlocked && req.session.userId) {
    const purchases = db.readCollection('purchases');
    unlocked = purchases.some(
      (p) => p.userId === req.session.userId && p.gameId === game.id
    );
  }
  res.json({ game: publicGame(game, unlocked) });
});

// POST /api/games -> add a new game listing
router.post('/', async (req, res) => {
  const { name, iconUrl, previewUrl, downloadUrl, priceCoins, password } = req.body;

  if (!name || String(name).trim().length < 2) {
    return res.status(400).json({ error: 'Jina la mchezo si sahihi.' });
  }
  if (!isValidUrl(iconUrl)) {
    return res.status(400).json({ error: 'Link ya picha ya icon si sahihi.' });
  }
  if (!isValidUrl(previewUrl)) {
    return res.status(400).json({ error: 'Link ya picha ya preview si sahihi.' });
  }
  if (!isValidUrl(downloadUrl)) {
    return res.status(400).json({ error: 'Link ya download si sahihi.' });
  }
  const price = Number(priceCoins);
  if (!Number.isFinite(price) || price < 0 || !Number.isInteger(price)) {
    return res.status(400).json({ error: 'Bei ya coin lazima iwe namba nzima, mfano 0, 1, 5.' });
  }
  if (!password || String(password).length < 4) {
    return res.status(400).json({ error: 'Weka password (angalau herufi 4) ya kutumia kufuta/kubadili baadaye.' });
  }

  const games = db.readCollection('games');
  const game = {
    id: db.nextId(games),
    name: String(name).trim(),
    iconUrl: String(iconUrl).trim(),
    previewUrl: String(previewUrl).trim(),
    downloadUrl: String(downloadUrl).trim(),
    priceCoins: price,
    passwordHash: hashPassword(password),
    downloads: 0,
    createdAt: new Date().toISOString(),
  };
  games.push(game);
  await db.writeCollection('games', games);

  res.status(201).json({ game: publicGame(game, price === 0) });
});

// PUT /api/games/:id -> edit, requires the per-game password
router.put('/:id', async (req, res) => {
  const games = db.readCollection('games');
  const idx = games.findIndex((g) => g.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Game haipo.' });

  const game = games[idx];
  const { password, name, iconUrl, previewUrl, downloadUrl, priceCoins } = req.body;
  if (!verifyPassword(password, game.passwordHash)) {
    return res.status(403).json({ error: 'Password si sahihi.' });
  }

  if (name && String(name).trim().length >= 2) game.name = String(name).trim();
  if (iconUrl) {
    if (!isValidUrl(iconUrl)) return res.status(400).json({ error: 'Link ya icon si sahihi.' });
    game.iconUrl = String(iconUrl).trim();
  }
  if (previewUrl) {
    if (!isValidUrl(previewUrl)) return res.status(400).json({ error: 'Link ya preview si sahihi.' });
    game.previewUrl = String(previewUrl).trim();
  }
  if (downloadUrl) {
    if (!isValidUrl(downloadUrl)) return res.status(400).json({ error: 'Link ya download si sahihi.' });
    game.downloadUrl = String(downloadUrl).trim();
  }
  if (priceCoins !== undefined) {
    const price = Number(priceCoins);
    if (!Number.isFinite(price) || price < 0 || !Number.isInteger(price)) {
      return res.status(400).json({ error: 'Bei ya coin si sahihi.' });
    }
    game.priceCoins = price;
  }

  games[idx] = game;
  await db.writeCollection('games', games);
  res.json({ game: publicGame(game, game.priceCoins === 0) });
});

// DELETE /api/games/:id -> requires the per-game password
router.delete('/:id', async (req, res) => {
  const games = db.readCollection('games');
  const idx = games.findIndex((g) => g.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Game haipo.' });

  const { password } = req.body;
  if (!verifyPassword(password, games[idx].passwordHash)) {
    return res.status(403).json({ error: 'Password si sahihi.' });
  }

  games.splice(idx, 1);
  await db.writeCollection('games', games);

  // Clean up purchase records for the deleted game too.
  const purchases = db.readCollection('purchases');
  const remaining = purchases.filter((p) => p.gameId !== Number(req.params.id));
  await db.writeCollection('purchases', remaining);

  res.json({ ok: true });
});

// POST /api/games/:id/download -> pay coins (if needed) and unlock the link
router.post('/:id/download', requireLogin, async (req, res) => {
  const games = db.readCollection('games');
  const game = games.find((g) => g.id === Number(req.params.id));
  if (!game) return res.status(404).json({ error: 'Game haipo.' });

  const purchases = db.readCollection('purchases');
  const already = purchases.some(
    (p) => p.userId === req.session.userId && p.gameId === game.id
  );

  if (game.priceCoins > 0 && !already) {
    const users = db.readCollection('users');
    const user = users.find((u) => u.id === req.session.userId);
    if (!user) return res.status(401).json({ error: 'Akaunti haipo.' });
    if (user.coins < game.priceCoins) {
      return res.status(402).json({
        error: `Huna coin za kutosha. Bei ni coin ${game.priceCoins}, wewe una coin ${user.coins}.`,
        needCoins: game.priceCoins - user.coins,
      });
    }
    user.coins -= game.priceCoins;
    await db.writeCollection('users', users);

    purchases.push({
      id: db.nextId(purchases),
      userId: user.id,
      gameId: game.id,
      pricePaid: game.priceCoins,
      createdAt: new Date().toISOString(),
    });
    await db.writeCollection('purchases', purchases);
  }

  game.downloads = (game.downloads || 0) + 1;
  const idx = games.findIndex((g) => g.id === game.id);
  games[idx] = game;
  await db.writeCollection('games', games);

  res.json({ downloadUrl: game.downloadUrl });
});

module.exports = router;
