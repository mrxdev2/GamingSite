// routes/wallet.js
// Mfumo wa wallet uliorekebishwa kutumia MongoDB Atlas (Async/Await)

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

router.get('/balance', requireLogin, async (req, res) => {
  try {
    const users = await db.readCollection('users');
    const user = users.find((u) => u.id === req.session.userId);
    res.json({ coins: user ? user.coins : 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Imefeli kusoma salio.' });
  }
});

// POST /api/wallet/deposit -> create a pending deposit request
router.post('/deposit', requireLogin, async (req, res) => {
  try {
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

    const deposits = await db.readCollection('deposits');
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
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Imefeli kuwasilisha ombi la muamala.' });
  }
});

// GET /api/wallet/deposits -> the logged-in user's own deposit history
router.get('/deposits', requireLogin, async (req, res) => {
  try {
    const deposits = await db.readCollection('deposits');
    const userDeposits = deposits
      .filter((d) => d.userId === req.session.userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ deposits: userDeposits });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Imefeli kusoma historia ya miamala.' });
  }
});

// -----------------------------------------------------------------
// Withdrawals: how "toa coin" (cash out) works here.
//
//   1) User bonyeza "Toa Coin", anaweka idadi ya coin na namba ya
//      simu atakayopokelea pesa, na hilo linatengeneza ombi
//      ("pending") — coin bado HAZIJATOLEWA kwenye salio lake.
//   2) Admin anaona ombi hilo kwenye /admin, anatuma pesa mkononi
//      kwa mtumiaji kupitia namba aliyoitoa.
//   3) Admin akishatuma pesa, ana-"approve" ombi kutoka /admin — hapo
//      ndipo coin zinatolewa (kukatwa) kwenye salio la mtumiaji.
//      Akikataa ("reject"), salio la mtumiaji halibadiliki kabisa.
// -----------------------------------------------------------------

// POST /api/wallet/withdraw -> create a pending withdrawal request
router.post('/withdraw', requireLogin, async (req, res) => {
  try {
    const { coins, phone } = req.body;
    const coinAmount = Number(coins);
    if (!Number.isFinite(coinAmount) || coinAmount <= 0 || !Number.isInteger(coinAmount)) {
      return res.status(400).json({ error: 'Weka idadi sahihi ya coin unazotaka kutoa.' });
    }
    if (!phone || String(phone).trim().length < 9) {
      return res.status(400).json({ error: 'Weka namba ya simu utakayopokelea pesa.' });
    }

    const users = await db.readCollection('users');
    const user = users.find((u) => u.id === req.session.userId);
    if (!user) return res.status(401).json({ error: 'Akaunti haipo.' });
    if (user.coins < coinAmount) {
      return res.status(402).json({
        error: `Huna coin za kutosha. Una coin ${user.coins}, umeomba kutoa coin ${coinAmount}.`,
      });
    }

    const withdrawals = await db.readCollection('withdrawals');
    const withdrawal = {
      id: db.nextId(withdrawals),
      userId: user.id,
      coins: coinAmount,
      amountTsh: coinAmount * COIN_PRICE_TSH,
      phone: String(phone).trim(),
      status: 'pending', // pending | approved | rejected
      createdAt: new Date().toISOString(),
    };
    withdrawals.push(withdrawal);
    await db.writeCollection('withdrawals', withdrawals);

    res.status(201).json({ withdrawal });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Imefeli kuwasilisha ombi la kutoa coin.' });
  }
});

// GET /api/wallet/withdrawals -> the logged-in user's own withdrawal history
router.get('/withdrawals', requireLogin, async (req, res) => {
  try {
    const withdrawals = await db.readCollection('withdrawals');
    const userWithdrawals = withdrawals
      .filter((w) => w.userId === req.session.userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ withdrawals: userWithdrawals });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Imefeli kusoma historia ya kutoa coin.' });
  }
});

module.exports = router;
