// routes/admin.js
// Minimal admin area protected by a single shared password stored in
// the ADMIN_PASSWORD environment variable. Its only job is approving
// or rejecting pending coin deposits (see routes/wallet.js).

const express = require('express');
const router = express.Router();
const db = require('../lib/db');
const { requireAdmin } = require('../lib/middleware');

router.post('/login', (req, res) => {
  const { password } = req.body;
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  if (password !== adminPassword) {
    return res.status(401).json({ error: 'Password ya admin si sahihi.' });
  }
  req.session.isAdmin = true;
  res.json({ ok: true });
});

router.post('/logout', (req, res) => {
  req.session.isAdmin = false;
  res.json({ ok: true });
});

router.get('/session', (req, res) => {
  res.json({ isAdmin: !!req.session.isAdmin });
});

router.get('/deposits', requireAdmin, (req, res) => {
  const deposits = db
    .readCollection('deposits')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const users = db.readCollection('users');
  const withUsernames = deposits.map((d) => ({
    ...d,
    username: (users.find((u) => u.id === d.userId) || {}).username || '—',
  }));
  res.json({ deposits: withUsernames });
});

router.post('/deposits/:id/approve', requireAdmin, async (req, res) => {
  const deposits = db.readCollection('deposits');
  const deposit = deposits.find((d) => d.id === Number(req.params.id));
  if (!deposit) return res.status(404).json({ error: 'Muamala haupo.' });
  if (deposit.status !== 'pending') {
    return res.status(409).json({ error: 'Muamala huu tayari umeshughulikiwa.' });
  }

  const users = db.readCollection('users');
  const user = users.find((u) => u.id === deposit.userId);
  if (!user) return res.status(404).json({ error: 'Mtumiaji hayupo.' });

  user.coins += deposit.coins;
  deposit.status = 'approved';
  deposit.approvedAt = new Date().toISOString();

  await db.writeCollection('users', users);
  await db.writeCollection('deposits', deposits);

  res.json({ ok: true, deposit, newBalance: user.coins });
});

router.post('/deposits/:id/reject', requireAdmin, async (req, res) => {
  const deposits = db.readCollection('deposits');
  const deposit = deposits.find((d) => d.id === Number(req.params.id));
  if (!deposit) return res.status(404).json({ error: 'Muamala haupo.' });
  if (deposit.status !== 'pending') {
    return res.status(409).json({ error: 'Muamala huu tayari umeshughulikiwa.' });
  }
  deposit.status = 'rejected';
  deposit.rejectedAt = new Date().toISOString();
  await db.writeCollection('deposits', deposits);
  res.json({ ok: true, deposit });
});

// Basic stats for the admin dashboard header
router.get('/stats', requireAdmin, (req, res) => {
  const games = db.readCollection('games');
  const users = db.readCollection('users');
  const deposits = db.readCollection('deposits');
  res.json({
    totalGames: games.length,
    totalUsers: users.length,
    pendingDeposits: deposits.filter((d) => d.status === 'pending').length,
    totalCoinsInCirculation: users.reduce((sum, u) => sum + (u.coins || 0), 0),
  });
});

module.exports = router;
