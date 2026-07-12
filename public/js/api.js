// public/js/api.js
// Tiny fetch wrapper shared by every page + shared navbar wallet pill logic.

async function api(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    method: options.method || 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  let data = {};
  try {
    data = await res.json();
  } catch (e) {
    data = {};
  }
  if (!res.ok) {
    const err = new Error(data.error || 'Hitilafu imetokea.');
    err.status = res.status;
    err.payload = data;
    throw err;
  }
  return data;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function fmtCoins(n) {
  return new Intl.NumberFormat('en-US').format(n);
}

function fmtTsh(n) {
  return new Intl.NumberFormat('en-US').format(n) + ' TSH';
}

function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleString('sw-TZ', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// Populates the wallet pill + login state in the navbar on every page.
async function refreshNavWallet() {
  const pill = document.getElementById('nav-wallet-pill');
  if (!pill) return;
  try {
    const { user } = await api('/auth/me');
    if (user) {
      pill.innerHTML = `<span class="coin-dot"></span> ${fmtCoins(user.coins)} <span style="color:var(--muted); font-weight:500;">&middot; ${escapeHtml(user.username)}</span>`;
      pill.onclick = () => { window.location.href = '/wallet.html'; };
    } else {
      pill.innerHTML = `<span class="coin-dot"></span> Ingia / Jisajili`;
      pill.onclick = () => { window.location.href = '/wallet.html'; };
    }
    pill.style.cursor = 'pointer';
  } catch (e) {
    pill.textContent = 'Pochi';
  }
}

document.addEventListener('DOMContentLoaded', refreshNavWallet);
