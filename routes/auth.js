// routes/auth.js
// Wallet accounts yaliyorekebishwa kutumia MongoDB Atlas (Async/Await)

const express = require('express');
const router = express.Router();
const db = require('../lib/db');
const { hashPassword, verifyPassword } = require('../lib/passwords');

function publicUser(u) {
  return { id: u.id, username: u.username, phone: u.phone, coins: u.coins };
}

router.post('/register', async (req, res) => {
  try {
    const { username, password, phone } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Weka jina la mtumiaji na password.' });
    }
    if (String(username).trim().length < 3) {
      return res.status(400).json({ error: 'Jina la mtumiaji liwe angalau herufi 3.' });
    }
    if (String(password).length < 4) {
      return res.status(400).json({ error: 'Password iwe angalau herufi 4.' });
    }

    const users = await db.readCollection('users');
    const exists = users.find(
      (u) => u.username.toLowerCase() === String(username).toLowerCase()
    );
    if (exists) {
      return res.status(409).json({ error: 'Jina hili la mtumiaji tayari limetumika.' });
    }

    const user = {
      id: db.nextId(users),
      username: String(username).trim(),
      phone: phone ? String(phone).trim() : '',
      passwordHash: hashPassword(password),
      coins: 0,
      createdAt: new Date().toISOString(),
    };
    users.push(user);
    await db.writeCollection('users', users);

    req.session.userId = user.id;
    res.status(201).json({ user: publicUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Hitilafu imetokea wakati wa usajili.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const users = await db.readCollection('users');
    const user = users.find(
      (u) => u.username.toLowerCase() === String(username || '').toLowerCase()
    );
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ error: 'Jina la mtumiaji au password si sahihi.' });
    }
    req.session.userId = user.id;
    res.json({ user: publicUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Hitilafu imetokea wakati wa kuingia.' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

router.get('/me', async (req, res) => {
  try {
    if (!req.session.userId) return res.json({ user: null });
    const users = await db.readCollection('users');
    const user = users.find((u) => u.id === req.session.userId);
    if (!user) return res.json({ user: null });
    res.json({ user: publicUser(user) });
  } catch (err) {
    console.error(err);
    res.json({ user: null });
  }
});

module.exports = router;
