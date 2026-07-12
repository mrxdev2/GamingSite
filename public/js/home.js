// public/js/home.js

let ALL_GAMES = [];
let ACTIVE_GAME = null;

function priceHexHtml(game) {
  if (game.priceCoins === 0) return `<div class="price-hex free">BURE</div>`;
  return `<div class="price-hex">${fmtCoins(game.priceCoins)}</div>`;
}

function gameCardHtml(game) {
  return `
    <article class="game-card" data-id="${game.id}">
      <img class="preview" src="${escapeHtml(game.previewUrl)}" alt="Picha ya mchezo ${escapeHtml(game.name)}" loading="lazy" onerror="this.style.opacity=0.25" />
      <div class="body">
        <div class="title-row">
          <img class="icon" src="${escapeHtml(game.iconUrl)}" alt="" loading="lazy" onerror="this.style.opacity=0.25" />
          <div>
            <h3>${escapeHtml(game.name)}</h3>
            <div class="meta">${fmtCoins(game.downloads)} downloads</div>
          </div>
        </div>
        <div class="footer-row">
          ${priceHexHtml(game)}
          <button class="btn btn-teal btn-download" data-id="${game.id}">Pakua</button>
        </div>
      </div>
    </article>
  `;
}

function renderGrid(games) {
  const grid = document.getElementById('game-grid');
  const empty = document.getElementById('empty');
  if (games.length === 0) {
    grid.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';
  grid.innerHTML = games.map(gameCardHtml).join('');

  grid.querySelectorAll('.btn-download').forEach((btn) => {
    btn.addEventListener('click', () => openDownloadModal(Number(btn.dataset.id)));
  });
}

function applyFilters() {
  const q = document.getElementById('search').value.trim().toLowerCase();
  const priceFilter = document.getElementById('filter-price').value;
  let filtered = ALL_GAMES.filter((g) => g.name.toLowerCase().includes(q));
  if (priceFilter === 'free') filtered = filtered.filter((g) => g.priceCoins === 0);
  if (priceFilter === 'paid') filtered = filtered.filter((g) => g.priceCoins > 0);
  renderGrid(filtered);
}

async function loadGames() {
  const { games } = await api('/games');
  ALL_GAMES = games;
  document.getElementById('stat-games').textContent = fmtCoins(games.length);
  document.getElementById('stat-downloads').textContent = fmtCoins(
    games.reduce((sum, g) => sum + (g.downloads || 0), 0)
  );
  applyFilters();
}

function openDownloadModal(id) {
  ACTIVE_GAME = ALL_GAMES.find((g) => g.id === id);
  if (!ACTIVE_GAME) return;
  const modal = document.getElementById('download-modal');
  const title = document.getElementById('dl-title');
  const sub = document.getElementById('dl-sub');
  const alertBox = document.getElementById('dl-alert');
  alertBox.className = 'alert';

  title.textContent = `Pakua ${ACTIVE_GAME.name}`;
  if (ACTIVE_GAME.priceCoins === 0) {
    sub.textContent = 'Mchezo huu ni bure. Bofya thibitisha kupakua.';
  } else {
    sub.textContent = `Mchezo huu unahitaji coin ${ACTIVE_GAME.priceCoins}. Zitatolewa kwenye Pochi yako mara utakapopakua.`;
  }
  modal.classList.add('show');
}

function closeModal() {
  document.getElementById('download-modal').classList.remove('show');
  ACTIVE_GAME = null;
}

async function confirmDownload() {
  if (!ACTIVE_GAME) return;
  const alertBox = document.getElementById('dl-alert');
  alertBox.className = 'alert';
  try {
    const { downloadUrl } = await api(`/games/${ACTIVE_GAME.id}/download`, { method: 'POST' });
    closeModal();
    await loadGames();
    window.open(downloadUrl, '_blank', 'noopener');
  } catch (e) {
    if (e.status === 401) {
      alertBox.textContent = 'Ingia kwenye Pochi yako kwanza ili kupakua mchezo.';
    } else if (e.status === 402) {
      alertBox.textContent = e.message + ' Nenda Pochi kununua coin zaidi.';
    } else {
      alertBox.textContent = e.message;
    }
    alertBox.classList.add('show', 'error');
  }
}

document.getElementById('search').addEventListener('input', applyFilters);
document.getElementById('filter-price').addEventListener('change', applyFilters);
document.getElementById('dl-cancel').addEventListener('click', closeModal);
document.getElementById('dl-confirm').addEventListener('click', confirmDownload);
document.getElementById('download-modal').addEventListener('click', (e) => {
  if (e.target.id === 'download-modal') closeModal();
});

loadGames().catch((e) => console.error(e));
