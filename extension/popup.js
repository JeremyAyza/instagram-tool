import { CSV } from './utils/csv.js';
import { Compare } from './utils/compare.js';
import { Table } from './components/Table.js';

// --- STATE ---
const initialState = {
  followers: [],
  following: [],
  nonFollowers: [],
  apiConnected: false,
  tableInstance: null
};

let state = { ...initialState };

// --- DOM ELEMENTS ---
const els = {
  // Global
  tabs: document.querySelectorAll('.tab-btn'),
  contents: document.querySelectorAll('.content'),
  btnReset: document.getElementById('btn-reset'),
  
  // Connect
  fetchInput: document.getElementById('fetch-input'),
  btnConnect: document.getElementById('btn-connect'),
  connectionMsg: document.getElementById('connection-msg'),
  statusIndicator: document.getElementById('status-indicator'),
  
  // Data
  btnFetchFollowers: document.getElementById('btn-fetch-followers'),
  btnFetchFollowing: document.getElementById('btn-fetch-following'),
  apiProgress: document.getElementById('api-progress'),
  countFollowers: document.getElementById('count-followers'),
  countFollowing: document.getElementById('count-following'),
  
  // Files
  fileFollowers: document.getElementById('file-followers'),
  fileFollowing: document.getElementById('file-following'),
  btnExportFollowers: document.getElementById('btn-export-followers'),
  btnExportFollowing: document.getElementById('btn-export-following'),
  
  // Analyze
  btnCompare: document.getElementById('btn-compare'),
  analysisResults: document.getElementById('analysis-results'),
  nonFollowersCount: document.getElementById('non-followers-count'),
  btnExportNonFollowers: document.getElementById('btn-export-non-followers'),
  
  // Unfollow Buttons
  btnUnfollowCommon: document.getElementById('btn-unfollow-common'),
  btnUnfollowAll: document.getElementById('btn-unfollow-all'),
  unfollowProgress: document.getElementById('unfollow-progress'),
  
  // Modal
  modal: document.getElementById('confirm-modal'),
  modalTitle: document.getElementById('modal-title'),
  modalDesc: document.getElementById('modal-desc'),
  modalConfirm: document.getElementById('modal-confirm'),
  modalCancel: document.getElementById('modal-cancel')
};

// --- INIT ---
document.addEventListener('DOMContentLoaded', async () => {
  await loadState();
  setupTabs();
  setupListeners();
});

async function loadState() {
  const stored = await chrome.storage.local.get(['localFollowers', 'localFollowing', 'apiConfig']);
  
  if (stored.localFollowers) state.followers = stored.localFollowers;
  if (stored.localFollowing) state.following = stored.localFollowing;
  if (stored.apiConfig) {
    state.apiConnected = true;
    updateConnectionUI(true);
  }
  updateStats();
}

// --- UI HELPERS ---
function setupTabs() {
  els.tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      els.tabs.forEach(b => b.classList.remove('active'));
      els.contents.forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab).classList.add('active');
    });
  });
}

function updateStats() {
  els.countFollowers.textContent = state.followers.length;
  els.countFollowing.textContent = state.following.length;
  
  const hasData = state.followers.length > 0 && state.following.length > 0;
  els.btnCompare.disabled = !hasData;
  els.btnExportFollowers.disabled = state.followers.length === 0;
  els.btnExportFollowing.disabled = state.following.length === 0;
}

function updateConnectionUI(connected) {
  els.statusIndicator.classList.toggle('connected', connected);
  els.statusIndicator.title = connected ? 'Conectado' : 'Desconectado';
  
  if (connected) {
    els.btnConnect.textContent = '✅ API Conectada';
    els.btnConnect.classList.remove('btn-primary');
    els.btnConnect.classList.add('btn-secondary');
    els.connectionMsg.textContent = 'Conexión establecida correctamente.';
    els.connectionMsg.className = 'alert alert-success';
    els.connectionMsg.classList.remove('hidden');
    
    els.btnFetchFollowers.disabled = false;
    els.btnFetchFollowing.disabled = false;
  } else {
    els.btnConnect.textContent = '🔗 Conectar API';
    els.btnConnect.classList.add('btn-primary');
    els.btnConnect.classList.remove('btn-secondary');
    els.connectionMsg.classList.add('hidden');
    els.btnFetchFollowers.disabled = true;
    els.btnFetchFollowing.disabled = true;
  }
}

function resetExtension() {
  if (!confirm('¿Estás seguro de que quieres borrar todos los datos y reiniciar la extensión?')) return;
  
  chrome.storage.local.clear(() => {
    state = { ...initialState };
    state.followers = [];
    state.following = [];
    state.nonFollowers = [];
    
    // Reset UI
    els.fetchInput.value = '';
    updateConnectionUI(false);
    updateStats();
    els.analysisResults.classList.add('hidden');
    if (state.tableInstance) {
      document.getElementById('table-container').innerHTML = '';
      state.tableInstance = null;
    }
    
    alert('Datos borrados. La extensión se ha reiniciado.');
    location.reload();
  });
}

// --- CORE LOGIC ---

function setupListeners() {
  
  // 0. Reset
  els.btnReset.addEventListener('click', resetExtension);

  // 1. Connect
  els.btnConnect.addEventListener('click', () => {
    const fetchString = els.fetchInput.value;
    if (!fetchString) return alert('Por favor pega el código fetch primero.');
    
    chrome.runtime.sendMessage({ action: 'PARSE_CONFIG', fetchString }, (res) => {
      if (res.success) {
        state.apiConnected = true;
        updateConnectionUI(true);
      } else {
        alert(res.error);
      }
    });
  });

  // 2. Fetch
  [els.btnFetchFollowers, els.btnFetchFollowing].forEach(btn => {
    btn.addEventListener('click', (e) => {
      const type = e.target.id.includes('followers') ? 'followers' : 'following';
      els.apiProgress.classList.remove('hidden');
      
      chrome.runtime.sendMessage({ action: 'START_FETCH', type }, (res) => {
        if (!res.success) alert(res.error);
      });
    });
  });

  // 3. Files
  els.fileFollowers.addEventListener('change', (e) => handleFile(e, 'followers'));
  els.fileFollowing.addEventListener('change', (e) => handleFile(e, 'following'));
  
  els.btnExportFollowers.addEventListener('click', () => exportCSV(state.followers, 'followers'));
  els.btnExportFollowing.addEventListener('click', () => exportCSV(state.following, 'following'));

  // 4. Compare
  els.btnCompare.addEventListener('click', () => {
    state.nonFollowers = Compare.findNonFollowers(state.followers, state.following);
    renderAnalysis(state.nonFollowers);
    els.analysisResults.classList.remove('hidden');
  });
  
  // Export Non-Followers
  els.btnExportNonFollowers.addEventListener('click', () => exportCSV(state.nonFollowers, 'non_followers'));

  // 5. Unfollow Buttons
  els.btnUnfollowCommon.addEventListener('click', () => confirmUnfollow('common'));
  els.btnUnfollowAll.addEventListener('click', () => confirmUnfollow('all'));

  // Modal Cancel
  els.modalCancel.addEventListener('click', () => els.modal.classList.add('hidden'));
}

function handleFile(e, type) {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = (ev) => {
    const data = CSV.parseCSV(ev.target.result);
    state[type] = data;
    chrome.storage.local.set({ [type === 'followers' ? 'localFollowers' : 'localFollowing']: data });
    updateStats();
    alert(`Cargados ${data.length} usuarios.`);
  };
  reader.readAsText(file);
}

function exportCSV(data, filename) {
  if (!data || data.length === 0) return alert('No hay datos para exportar');
  const csvContent = CSV.jsonToCSV(data);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  chrome.downloads.download({
    url: url,
    filename: `${filename}_${new Date().toISOString().slice(0,10)}.csv`
  });
}

function renderAnalysis(users) {
  els.nonFollowersCount.textContent = users.length;
  
  // Initialize Table Component
  if (!state.tableInstance) {
    state.tableInstance = new Table('table-container', users, (user, btn) => {
      // Single unfollow callback
      if (confirm(`¿Dejar de seguir a @${user.username}?`)) {
        chrome.runtime.sendMessage({ action: 'EXECUTE_UNFOLLOW', users: [user] });
        btn.textContent = '...';
        btn.disabled = true;
      }
    });
  }
  state.tableInstance.originalData = users;
  state.tableInstance.currentData = [...users];
  state.tableInstance.render();
}

// --- UNFOLLOW LOGIC ---

function confirmUnfollow(strategy) {
  let targets = [];
  let title = '';
  
  switch(strategy) {
    case 'common':
      // Heurística para "Usuarios Comunes":
      // NO verificados, NO creadores, NO privados (opcional, pero suelen ser comunes)
      // Aquí asumimos que si no es verificado ni creador, es "común".
      targets = state.nonFollowers.filter(u => !u.is_verified && !u.is_creator);
      title = 'Unfollow Comunes (Excluyendo VIPs)';
      break;
      
    case 'all':
      targets = state.nonFollowers;
      title = '⚠️ Unfollow A TODOS (Peligroso)';
      break;
  }

  if (targets.length === 0) return alert('No hay usuarios que coincidan con este criterio.');

  // Show Modal
  els.modalTitle.textContent = title;
  els.modalDesc.textContent = `Se dejarán de seguir ${targets.length} cuentas. Esta acción tomará tiempo para evitar bloqueos. ¿Continuar?`;
  els.modal.classList.remove('hidden');
  
  // Setup Confirm Action
  els.modalConfirm.onclick = () => {
    els.modal.classList.add('hidden');
    startUnfollowProcess(targets);
  };
}

function startUnfollowProcess(users) {
  els.unfollowProgress.classList.remove('hidden');
  chrome.runtime.sendMessage({ action: 'EXECUTE_UNFOLLOW', users });
}

// --- MESSAGES ---
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === 'FETCH_PROGRESS') {
    const bar = els.apiProgress.querySelector('.progress-fill');
    const text = els.apiProgress.querySelector('.progress-text');
    text.textContent = `Cargando ${msg.count}...`;
    bar.style.width = msg.status === 'complete' ? '100%' : '50%';
  }
  
  else if (msg.action === 'FETCH_COMPLETE') {
    state[msg.type] = msg.data;
    updateStats();
    els.apiProgress.classList.add('hidden');
    alert(`Completado: ${msg.count} usuarios obtenidos.`);
  }
  
  else if (msg.action === 'UNFOLLOW_PROGRESS') {
    const bar = els.unfollowProgress.querySelector('.progress-fill');
    const text = els.unfollowProgress.querySelector('.progress-text');
    const pct = (msg.current / msg.total) * 100;
    bar.style.width = `${pct}%`;
    text.textContent = `${msg.current}/${msg.total}: ${msg.username}`;
  }
  
  else if (msg.action === 'UNFOLLOW_COMPLETE') {
    els.unfollowProgress.classList.add('hidden');
    alert(`Proceso finalizado. ${msg.count} cuentas dejadas de seguir.`);
  }
});
