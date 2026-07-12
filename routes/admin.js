// routes/admin.js
// Jopo la usimamizi lililorekebishwa kutumia MongoDB Atlas (Async/Await)

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

router.get('/deposits', requireAdmin, async (req, res) => {
  try {
    const deposits = await db.readCollection('deposits');
    const sortedDeposits = deposits.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const users = await db.readCollection('users');
    
    const withUsernames = sortedDeposits.map((d) => ({
      ...d,
      username: (users.find((u) => u.id === d.userId) || {}).username || '—',
    }));
    res.json({ deposits: withUsernames });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Imefeli kusoma deposits.' });
  }
});

router.post('/deposits/:id/approve', requireAdmin, async (req, res) => {
  try {
    const deposits = await db.readCollection('deposits');
    const deposit = deposits.find((d) => d.id === Number(req.params.id));
    if (!deposit) return res.status(404).json({ error: 'Muamala haupo.' });
    if (deposit.status !== 'pending') {
      return res.status(409).json({ error: 'Muamala huu tayari umeshughulikiwa.' });
    }

    const users = await db.readCollection('users');
    const user = users.find((u) => u.id === deposit.userId);
    if (!user) return res.status(404).json({ error: 'Mtumiaji hayupo.' });

    user.coins += deposit.coins;
    deposit.status = 'approved';
    deposit.approvedAt = new Date().toISOString();

    await db.writeCollection('users', users);
    await db.writeCollection('deposits', deposits);

    res.json({ ok: true, deposit, newBalance: user.coins });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Imefeli kuidhinisha muamala.' });
  }
});

router.post('/deposits/:id/reject', requireAdmin, async (req, res) => {
  try {
    const deposits = await db.readCollection('deposits');
    const deposit = deposits.find((d) => d.id === Number(req.params.id));
    if (!deposit) return res.status(404).json({ error: 'Muamala haupo.' });
    if (deposit.status !== 'pending') {
      return res.status(409).json({ error: 'Muamala huu tayari umeshughulikiwa.' });
    }
    deposit.status = 'rejected';
    deposit.rejectedAt = new Date().toISOString();
    await db.writeCollection('deposits', deposits);
    res.json({ ok: true, deposit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Imefeli kukataa muamala.' });
  }
});

// Basic stats for the admin dashboard header
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const games = await db.readCollection('games');
    const users = await db.readCollection('users');
    const deposits = await db.readCollection('deposits');
    res.json({
      totalGames: games.length,
      totalUsers: users.length,
      pendingDeposits: deposits.filter((d) => d.status === 'pending').length,
      totalCoinsInCirculation: users.reduce((sum, u) => sum + (u.coins || 0), 0),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Imefeli kusoma takwimu.' });
  }
});

module.exports = router;
