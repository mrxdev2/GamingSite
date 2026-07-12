// public/js/admin.js

function statusLabel(status) {
  if (status === 'pending') return '<span class="status-pill status-pending">Inasubiri</span>';
  if (status === 'approved') return '<span class="status-pill status-approved">Imekubaliwa</span>';
  return '<span class="status-pill status-rejected">Imekataliwa</span>';
}

async function checkAdminSession() {
  const { isAdmin } = await api('/admin/session');
  document.getElementById('admin-login-section').style.display = isAdmin ? 'none' : 'block';
  document.getElementById('admin-dashboard').style.display = isAdmin ? 'block' : 'none';
  if (isAdmin) {
    loadStats();
    loadDeposits();
  }
}

document.getElementById('admin-login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const alertBox = document.getElementById('admin-login-alert');
  alertBox.className = 'alert';
  try {
    await api('/admin/login', {
      method: 'POST',
      body: { password: document.getElementById('admin-password').value },
    });
    await checkAdminSession();
  } catch (err) {
    alertBox.textContent = err.message;
    alertBox.classList.add('show', 'error');
  }
});

document.getElementById('admin-logout-btn').addEventListener('click', async () => {
  await api('/admin/logout', { method: 'POST' });
  await checkAdminSession();
});

async function loadStats() {
  const stats = await api('/admin/stats');
  document.getElementById('stat-games').textContent = fmtCoins(stats.totalGames);
  document.getElementById('stat-users').textContent = fmtCoins(stats.totalUsers);
  document.getElementById('stat-pending').textContent = fmtCoins(stats.pendingDeposits);
  document.getElementById('stat-coins').textContent = fmtCoins(stats.totalCoinsInCirculation);
}

async function loadDeposits() {
  const { deposits } = await api('/admin/deposits');
  const tbody = document.getElementById('deposits-tbody');
  if (deposits.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="hint">Hakuna maombi bado.</td></tr>';
    return;
  }
  tbody.innerHTML = deposits.map((d) => `
    <tr>
      <td>${fmtDate(d.createdAt)}</td>
      <td>${escapeHtml(d.username)}</td>
      <td>${fmtCoins(d.coins)}</td>
      <td>${fmtTsh(d.amountTsh)}</td>
      <td>${escapeHtml(d.payerPhone)}</td>
      <td>${escapeHtml(d.transactionRef)}</td>
      <td>${statusLabel(d.status)}</td>
      <td>
        ${d.status === 'pending' ? `
          <div class="row-actions">
            <button class="btn btn-teal" data-action="approve" data-id="${d.id}">Kubali</button>
            <button class="btn btn-danger" data-action="reject" data-id="${d.id}">Kataa</button>
          </div>
        ` : '—'}
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('button[data-action]').forEach((btn) => {
    btn.addEventListener('click', () => handleDecision(btn.dataset.id, btn.dataset.action));
  });
}

async function handleDecision(id, action) {
  const alertBox = document.getElementById('admin-alert');
  alertBox.className = 'alert';
  try {
    await api(`/admin/deposits/${id}/${action}`, { method: 'POST' });
    await loadStats();
    await loadDeposits();
  } catch (err) {
    alertBox.textContent = err.message;
    alertBox.classList.add('show', 'error');
  }
}

checkAdminSession();
