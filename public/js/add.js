// public/js/add.js

const form = document.getElementById('add-form');
const formAlert = document.getElementById('form-alert');
const submitBtn = document.getElementById('submit-btn');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  formAlert.className = 'alert';
  submitBtn.disabled = true;
  submitBtn.textContent = 'Inachapisha...';

  try {
    await api('/games', {
      method: 'POST',
      body: {
        name: document.getElementById('name').value.trim(),
        iconUrl: document.getElementById('iconUrl').value.trim(),
        previewUrl: document.getElementById('previewUrl').value.trim(),
        downloadUrl: document.getElementById('downloadUrl').value.trim(),
        priceCoins: Number(document.getElementById('priceCoins').value),
        password: document.getElementById('password').value,
      },
    });
    formAlert.textContent = 'Mchezo umechapishwa! Unaweza kuuona kwenye ukurasa wa Michezo.';
    formAlert.classList.add('show', 'success');
    form.reset();
    document.getElementById('priceCoins').value = 0;
  } catch (err) {
    formAlert.textContent = err.message;
    formAlert.classList.add('show', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Chapisha Mchezo';
  }
});

// ---------------- Manage (edit/delete) ----------------

let manageResultsCache = [];
let activeManageId = null;

const manageSearch = document.getElementById('manage-search');
const manageResults = document.getElementById('manage-results');
const manageModal = document.getElementById('manage-modal');
const manageAlert = document.getElementById('manage-alert');
const manageForm = document.getElementById('manage-form');

let searchTimer = null;
manageSearch.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(runManageSearch, 250);
});

async function runManageSearch() {
  const q = manageSearch.value.trim().toLowerCase();
  if (!q) { manageResults.innerHTML = ''; return; }
  const { games } = await api('/games');
  manageResultsCache = games.filter((g) => g.name.toLowerCase().includes(q));
  if (manageResultsCache.length === 0) {
    manageResults.innerHTML = `<div class="hint">Hakuna mchezo unaolingana na "${escapeHtml(manageSearch.value)}".</div>`;
    return;
  }
  manageResults.innerHTML = manageResultsCache.map((g) => `
    <div class="deposit-item">
      <div style="display:flex; align-items:center; gap:10px;">
        <img src="${escapeHtml(g.iconUrl)}" style="width:32px;height:32px;border-radius:8px;object-fit:cover;" onerror="this.style.opacity=0.2" />
        <b>${escapeHtml(g.name)}</b>
      </div>
      <button class="btn btn-ghost" data-id="${g.id}" onclick="openManageModal(${g.id})">Simamia</button>
    </div>
  `).join('');
}

function openManageModal(id) {
  activeManageId = id;
  manageAlert.className = 'alert';
  manageForm.reset();
  document.getElementById('manage-title').textContent = 'Simamia Mchezo';
  manageModal.classList.add('show');
}

document.getElementById('manage-cancel').addEventListener('click', () => {
  manageModal.classList.remove('show');
  activeManageId = null;
});
manageModal.addEventListener('click', (e) => {
  if (e.target.id === 'manage-modal') { manageModal.classList.remove('show'); activeManageId = null; }
});

manageForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  manageAlert.className = 'alert';
  const password = document.getElementById('manage-password').value;
  const name = document.getElementById('manage-name').value.trim();
  const icon = document.getElementById('manage-icon').value.trim();
  const preview = document.getElementById('manage-preview').value.trim();
  const download = document.getElementById('manage-download').value.trim();
  const priceRaw = document.getElementById('manage-price').value;

  const body = { password };
  if (name) body.name = name;
  if (icon) body.iconUrl = icon;
  if (preview) body.previewUrl = preview;
  if (download) body.downloadUrl = download;
  if (priceRaw !== '') body.priceCoins = Number(priceRaw);

  try {
    await api(`/games/${activeManageId}`, { method: 'PUT', body });
    manageAlert.textContent = 'Mabadiliko yamehifadhiwa.';
    manageAlert.classList.add('show', 'success');
    runManageSearch();
  } catch (err) {
    manageAlert.textContent = err.message;
    manageAlert.classList.add('show', 'error');
  }
});

document.getElementById('manage-delete').addEventListener('click', async () => {
  manageAlert.className = 'alert';
  const password = document.getElementById('manage-password').value;
  if (!password) {
    manageAlert.textContent = 'Weka password kwanza kabla ya kufuta.';
    manageAlert.classList.add('show', 'error');
    return;
  }
  if (!confirm('Una uhakika unataka kufuta mchezo huu? Hatua hii haiwezi kurudishwa.')) return;

  try {
    await api(`/games/${activeManageId}`, { method: 'DELETE', body: { password } });
    manageModal.classList.remove('show');
    activeManageId = null;
    runManageSearch();
  } catch (err) {
    manageAlert.textContent = err.message;
    manageAlert.classList.add('show', 'error');
  }
});
