// lib/middleware.js

function requireLogin(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Ingia kwenye akaunti ya Pochi kwanza.' });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.isAdmin) {
    return res.status(401).json({ error: 'Huna ruhusa. Ingia kama admin kwanza.' });
  }
  next();
}

module.exports = { requireLogin, requireAdmin };
