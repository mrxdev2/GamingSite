// public/js/wallet.js

let WALLET_INFO = { coinPriceTsh: 500, paymentNumber: '0775710774', paymentNetwork: 'Yas' };

async function loadWalletInfo() {
  WALLET_INFO = await api('/wallet/info');
  document.getElementById('coin-price').textContent = fmtTsh(WALLET_INFO.coinPriceTsh);
  document.getElementById('payment-number').textContent = WALLET_INFO.paymentNumber;
  document.getElementById('payment-network').textContent = WALLET_INFO.paymentNetwork;
  document.getElementById('receipt-number').textContent = WALLET_INFO.paymentNumber;
  updateReceipt();
}

function updateReceipt() {
  const coins = Math.max(1, Number(document.getElementById('coins-input').value) || 1);
  document.getElementById('receipt-coins').textContent = fmtCoins(coins);
  document.getElementById('receipt-amount').textContent = fmtTsh(coins * WALLET_INFO.coinPriceTsh);
}

async function checkSession() {
  const { user } = await api('/auth/me');
  if (user) {
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('wallet-section').style.display = 'block';
    document.getElementById('welcome-line').textContent = `Karibu tena, ${user.username}.`;
    document.getElementById('balance-amount').textContent = fmtCoins(user.coins);
    loadDeposits();
  } else {
    document.getElementById('auth-section').style.display = 'block';
    document.getElementById('wallet-section').style.display = 'none';
  }
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const alertBox = document.getElementById('login-alert');
  alertBox.className = 'alert';
  try {
    await api('/auth/login', {
      method: 'POST',
      body: {
        username: document.getElementById('login-username').value.trim(),
        password: document.getElementById('login-password').value,
      },
    });
    await checkSession();
    refreshNavWallet();
  } catch (err) {
    alertBox.textContent = err.message;
    alertBox.classList.add('show', 'error');
  }
});

document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const alertBox = document.getElementById('register-alert');
  alertBox.className = 'alert';
  try {
    await api('/auth/register', {
      method: 'POST',
      body: {
        username: document.getElementById('reg-username').value.trim(),
        phone: document.getElementById('reg-phone').value.trim(),
        password: document.getElementById('reg-password').value,
      },
    });
    await checkSession();
    refreshNavWallet();
  } catch (err) {
    alertBox.textContent = err.message;
    alertBox.classList.add('show', 'error');
  }
});

document.getElementById('logout-btn').addEventListener('click', async () => {
  await api('/auth/logout', { method: 'POST' });
  await checkSession();
  refreshNavWallet();
});

document.getElementById('coins-input').addEventListener('input', updateReceipt);

document.getElementById('submit-deposit').addEventListener('click', async () => {
  const alertBox = document.getElementById('deposit-alert');
  alertBox.className = 'alert';
  try {
    await api('/wallet/deposit', {
      method: 'POST',
      body: {
        coins: Number(document.getElementById('coins-input').value),
        payerPhone: document.getElementById('payer-phone').value.trim(),
        transactionRef: document.getElementById('txn-ref').value.trim(),
      },
    });
    alertBox.textContent = 'Ombi limetumwa! Coin zitaongezwa mara admin atakapothibitisha malipo yako.';
    alertBox.classList.add('show', 'success');
    document.getElementById('payer-phone').value = '';
    document.getElementById('txn-ref').value = '';
    loadDeposits();
  } catch (err) {
    alertBox.textContent = err.message;
    alertBox.classList.add('show', 'error');
  }
});

function statusLabel(status) {
  if (status === 'pending') return '<span class="status-pill status-pending">Inasubiri</span>';
  if (status === 'approved') return '<span class="status-pill status-approved">Imekubaliwa</span>';
  return '<span class="status-pill status-rejected">Imekataliwa</span>';
}

async function loadDeposits() {
  const { deposits } = await api('/wallet/deposits');
  const container = document.getElementById('deposit-history');
  if (deposits.length === 0) {
    container.innerHTML = '<div class="hint">Bado hujawahi kuomba coin.</div>';
    return;
  }
  container.innerHTML = deposits.map((d) => `
    <div class="deposit-item">
      <div>
        <b>${fmtCoins(d.coins)} coin</b> &middot; ${fmtTsh(d.amountTsh)}
        <div class="hint">${fmtDate(d.createdAt)} &middot; Ref: ${escapeHtml(d.transactionRef)}</div>
      </div>
      ${statusLabel(d.status)}
    </div>
  `).join('');

  // Balance may have changed if a deposit was just approved.
  const { coins } = await api('/wallet/balance');
  document.getElementById('balance-amount').textContent = fmtCoins(coins);
}

loadWalletInfo();
checkSession();
