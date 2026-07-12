// routes/wallet.js
//
// How buying coins works here (read this!):
// There is no automatic mobile-money API wired up, because that
// requires a real merchant account with an aggregator (e.g. Selcom
// Pesa, Azampay, ClickPesa, or the operator's own API) and API keys
// that only you can obtain. So this app uses an honest manual flow:
//
//   1) User picks how many coins they want (1 coin = 500 TSH).
//   2) The app shows the USSD instructions to send that amount via
//      mobile money to the configured number (Yas / Tigo Pesa etc).
//   3) User submits the phone number they paid from + the
//      transaction reference/message they received, creating a
//      "pending" deposit.
//   4) You (the admin) check your mobile money SMS/statement, and
//      approve or reject the deposit from /admin. Approving credits
//      the coins to that user's wallet instantly.
//
// If you later get a real payment aggregator account, replace step
// 2-4 with a webhook that calls the same "approve" logic automatically.

const express = require('express');
const router = express.Router();
const db = require('../lib/db');
const { requireLogin, requireAdmin } = require('../lib/middleware');

const COIN_PRICE_TSH = Number(process.env.COIN_PRICE_TSH || 500);
const PAYMENT_NUMBER = process.env.PAYMENT_NUMBER || '0775710774';
const PAYMENT_NETWORK = process.env.PAYMENT_NETWORK || 'Yas (Tigo Pesa/Mixx by Yas)';

router.get('/info', (req, res) => {
  res.json({
    coinPriceTsh: COIN_PRICE_TSH,
    paymentNumber: PAYMENT_NUMBER,
    paymentNetwork: PAYMENT_NETWORK,
  });
});

router.get('/balance', requireLogin, (req, res) => {
  const users = db.readCollection('users');
  const user = users.find((u) => u.id === req.session.userId);
  res.json({ coins: user ? user.coins : 0 });
});

// POST /api/wallet/deposit -> create a pending deposit request
router.post('/deposit', requireLogin, async (req, res) => {
  const { coins, payerPhone, transactionRef } = req.body;
  const coinAmount = Number(coins);
  if (!Number.isFinite(coinAmount) || coinAmount <= 0 || !Number.isInteger(coinAmount)) {
    return res.status(400).json({ error: 'Weka idadi sahihi ya coin unazotaka kununua.' });
  }
  if (!payerPhone || String(payerPhone).trim().length < 9) {
    return res.status(400).json({ error: 'Weka namba ya simu uliyotumia kulipia.' });
  }
  if (!transactionRef || String(transactionRef).trim().length < 3) {
    return res.status(400).json({ error: 'Weka namba ya muamala (transaction reference) kutoka kwenye ujumbe wa malipo.' });
  }

  const deposits = db.readCollection('deposits');
  const deposit = {
    id: db.nextId(deposits),
    userId: req.session.userId,
    coins: coinAmount,
    amountTsh: coinAmount * COIN_PRICE_TSH,
    payerPhone: String(payerPhone).trim(),
    transactionRef: String(transactionRef).trim(),
    status: 'pending', // pending | approved | rejected
    createdAt: new Date().toISOString(),
  };
  deposits.push(deposit);
  await db.writeCollection('deposits', deposits);

  res.status(201).json({ deposit });
});

// GET /api/wallet/deposits -> the logged-in user's own deposit history
router.get('/deposits', requireLogin, (req, res) => {
  const deposits = db
    .readCollection('deposits')
    .filter((d) => d.userId === req.session.userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ deposits });
});

module.exports = router;
