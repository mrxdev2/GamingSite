// server.js
require('dotenv').config();

const path = require('path');
const express = require('express');
const session = require('express-session');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const gameRoutes = require('./routes/games');
const walletRoutes = require('./routes/wallet');
const adminRoutes = require('./routes/admin');

const app = express();

// Render/Heroku/Railway all sit behind a proxy; needed for secure
// cookies + correct req.ip.
app.set('trust proxy', 1);

app.use(express.json({ limit: '200kb' }));
app.use(express.urlencoded({ extended: true, limit: '200kb' }));

app.use(
  session({
    name: 'gaminghub.sid',
    secret: process.env.SESSION_SECRET || 'change-this-secret-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    },
  })
);

// Basic protection against someone hammering login/deposit endpoints.
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/admin', adminRoutes);

app.use(express.static(path.join(__dirname, 'public')));

// SPA-style fallback for the few HTML pages we ship.
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Central error handler so a stray throw doesn't crash the dyno.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Hitilafu ya ndani ya server. Jaribu tena baadaye.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`GamingHub inaendesha kwenye port ${PORT}`);
});
