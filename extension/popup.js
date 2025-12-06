import { CSV } from './utils/csv.js';
import { Compare } from './utils/compare.js';

// State
let state = {
  followers: [],
  following: [],
  nonFollowers: [],
  apiConnected: false
};

// DOM Elements
const els = {
  fetchInput: document.getElementById('fetch-input'),
  btnConnect: document.getElementById('btn-connect'),
  connectionMsg: document.getElementById('connection-msg'),
  btnFetchFollowers: document.getElementById('btn-fetch-followers'),
  btnFetchFollowing: document.getElementById('btn-fetch-following'),
  apiProgress: document.getElementById('api-progress'),
  countFollowers: document.getElementById('count-followers'),
  countFollowing: document.getElementById('count-following'),
  fileFollowers: document.getElementById('file-followers'),
  fileFollowing: document.getElementById('file-following'),
  btnCompare: document.getElementById('btn-compare'),
  resultsArea: document.getElementById('analysis-results'),
  resultsTable: document.getElementById('results-table').querySelector('tbody'),
  nonFollowersCount: document.getElementById('non-followers-count'),
  btnUnfollowAll: document.getElementById('btn-unfollow-all'),
  unfollowProgress: document.getElementById('unfollow-progress'),
  btnExportFollowers: document.getElementById('btn-export-followers'),
  btnExportFollowing: document.getElementById('btn-export-following')
};

// --- INITIALIZATION ---

document.addEventListener('DOMContentLoaded', async () => {
  // Load saved data
  const stored = await chrome.storage.local.get(['localFollowers', 'localFollowing', 'apiConfig']);
  
  if (stored.localFollowers) {
    state.followers = stored.localFollowers;
    updateStats();
  }
  if (stored.localFollowing) {
    state.following = stored.localFollowing;
    updateStats();
  }
  if (stored.apiConfig) {
    state.apiConnected = true;
    updateConnectionUI(true);
  }

  setupTabs();
  setupListeners();
});

// --- UI HELPERS ---

function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.content').forEach(c => c.classList.remove('active'));
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
  els.btnConnect.textContent = connected ? 'Conectado ✅' : 'Conectar API';
  els.btnConnect.classList.toggle('btn-success', connected);
  els.btnFetchFollowers.disabled = !connected;
  els.btnFetchFollowing.disabled = !connected;
  
  if (connected) {
    els.connectionMsg.style.display = 'block';
    els.connectionMsg.className = 'alert alert-success';
    els.connectionMsg.textContent = 'API Lista para usar';
  }
}

// --- LOGIC ---

function setupListeners() {
  // 1. Connect API
  els.btnConnect.addEventListener('click', () => {
    const fetchString = els.fetchInput.value;
    if (!fetchString) return alert('Pega el código fetch primero');

    chrome.runtime.sendMessage({ action: 'PARSE_CONFIG', fetchString }, (res) => {
      if (res.success) {
        state.apiConnected = true;
        updateConnectionUI(true);
        alert(`Conectado como ID: ${res.userId}`);
      } else {
        alert('Error: ' + res.error);
      }
    });
  });

  // 2. Fetch Data Buttons
  ['followers', 'following'].forEach(type => {
    const btn = type === 'followers' ? els.btnFetchFollowers : els.btnFetchFollowing;
		console.log(btn)
    btn.addEventListener('click', () => {
			console.log('event')
      els.apiProgress.classList.add('active');
      chrome.runtime.sendMessage({ action: 'START_FETCH', type }, (res) => {
				console.log('message')
        if (!res.success) alert(res.error);
      });
    });
  });

  // 3. File Uploads
  els.fileFollowers.addEventListener('change', (e) => handleFileUpload(e, 'followers'));
  els.fileFollowing.addEventListener('change', (e) => handleFileUpload(e, 'following'));

  // 4. Compare
  els.btnCompare.addEventListener('click', () => {
    state.nonFollowers = Compare.findNonFollowers(state.followers, state.following);
    renderResults(state.nonFollowers);
  });

  // 5. Unfollow All
  els.btnUnfollowAll.addEventListener('click', () => {
    if (!confirm(`¿Seguro que quieres dejar de seguir a ${state.nonFollowers.length} usuarios?`)) return;
    
    els.unfollowProgress.classList.add('active');
    chrome.runtime.sendMessage({ 
      action: 'EXECUTE_UNFOLLOW', 
      users: state.nonFollowers 
    });
  });

  // 6. Exports
  els.btnExportFollowers.addEventListener('click', () => exportData(state.followers, 'followers'));
  els.btnExportFollowing.addEventListener('click', () => exportData(state.following, 'following'));
}

function handleFileUpload(event, type) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const data = CSV.parseCSV(e.target.result);
    state[type] = data;
    chrome.storage.local.set({ [type === 'followers' ? 'localFollowers' : 'localFollowing']: data });
    updateStats();
    alert(`Cargados ${data.length} usuarios en ${type}`);
  };
  reader.readAsText(file);
}

function renderResults(users) {
  els.resultsArea.style.display = 'block';
  els.nonFollowersCount.textContent = users.length;
  els.resultsTable.innerHTML = '';

  users.forEach(u => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div class="user-cell">
          <a href="https://instagram.com/${u.username}" target="_blank" style="color:white;text-decoration:none;">
            @${u.username}
          </a>
        </div>
      </td>
      <td>${u.is_verified ? '✅' : ''}</td>
      <td>
        <button class="btn btn-danger" style="padding:2px 6px; font-size:10px;" data-id="${u.id}">Unfollow</button>
      </td>
    `;
    
    // Individual unfollow
    tr.querySelector('button').addEventListener('click', (e) => {
      if(confirm(`Unfollow @${u.username}?`)) {
        chrome.runtime.sendMessage({ action: 'EXECUTE_UNFOLLOW', users: [u] });
        e.target.textContent = '...';
        e.target.disabled = true;
      }
    });

    els.resultsTable.appendChild(tr);
  });
}

function exportData(data, filename) {
  chrome.runtime.sendMessage({ action: 'DOWNLOAD_CSV', data, filename });
}

// --- MESSAGE LISTENER (Progress updates) ---

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === 'FETCH_PROGRESS') {
    const bar = els.apiProgress.querySelector('.progress-fill');
    const text = els.apiProgress.querySelector('.progress-text');
    
    // Indeterminate progress mostly, or just showing count
    text.textContent = `Obtenidos: ${msg.count} (${msg.type})`;
    bar.style.width = '50%'; // Just show activity
    if (msg.status === 'complete') bar.style.width = '100%';
  }

  else if (msg.action === 'FETCH_COMPLETE') {
    els.apiProgress.classList.remove('active');
    state[msg.type] = msg.data;
    updateStats();
    alert(`Completado: ${msg.count} ${msg.type}`);
  }

  else if (msg.action === 'UNFOLLOW_PROGRESS') {
    const bar = els.unfollowProgress.querySelector('.progress-fill');
    const text = els.unfollowProgress.querySelector('.progress-text');
    
    const pct = (msg.current / msg.total) * 100;
    bar.style.width = `${pct}%`;
    text.textContent = `Procesando ${msg.current}/${msg.total}: ${msg.username}`;
  }

  else if (msg.action === 'UNFOLLOW_COMPLETE') {
    els.unfollowProgress.classList.remove('active');
    alert(`Proceso finalizado. Se dejaron de seguir ${msg.count} cuentas.`);
    // Refresh comparison?
  }
});
