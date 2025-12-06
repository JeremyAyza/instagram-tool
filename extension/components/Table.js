import { Badge } from './Badge.js';

export class Table {
  constructor(containerId, data, onUnfollow) {
    this.container = document.getElementById(containerId);
    this.originalData = data;
    this.currentData = [...data];
    this.onUnfollow = onUnfollow;
    this.sortDir = 1;
    this.lastSortKey = null;
  }

  render() {
    this.container.innerHTML = '';
    
    // Controls
    const controls = document.createElement('div');
    controls.className = 'table-controls';
    controls.innerHTML = `
      <input type="text" id="table-search" placeholder="Filtrar por usuario..." style="width:100%; padding:8px; margin-bottom:8px; border-radius:4px; border:1px solid #333; background:#1a1d24; color:white;">
    `;
    this.container.appendChild(controls);

    // Table
    const table = document.createElement('table');
    table.className = 'custom-table';
    
    // Header
    const thead = document.createElement('thead');
    thead.innerHTML = `
      <tr>
        <th data-key="username" style="cursor:pointer">Usuario ↕</th>
        <th data-key="full_name" style="cursor:pointer">Nombre ↕</th>
        <th data-key="is_verified" style="cursor:pointer; width:40px;">Verif</th>
        <th style="width:80px;">Acciones</th>
      </tr>
    `;
    table.appendChild(thead);

    // Body
    const tbody = document.createElement('tbody');
    this.currentData.forEach(u => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <div style="display:flex; align-items:center;">
            <img src="${u.profile_pic_url}" onerror="this.style.display='none'" style="width:24px; height:24px; border-radius:50%; margin-right:8px;">
            <a href="https://instagram.com/${u.username}" target="_blank" style="color:white; text-decoration:none; font-weight:500;">
              ${u.username}
            </a>
            ${Badge.renderBadges(u)}
          </div>
        </td>
        <td style="color:#aaa; font-size:11px;">${u.full_name}</td>
        <td style="text-align:center;">${u.is_verified ? '✅' : ''}</td>
        <td></td>
      `;

      // Action Cell
      const actionCell = tr.lastElementChild;
      const btn = document.createElement('button');
      btn.className = 'btn-danger-outline';
      btn.textContent = 'Unfollow';
      btn.style.fontSize = '10px';
      btn.style.padding = '2px 6px';
      btn.onclick = () => this.onUnfollow(u, btn);
      actionCell.appendChild(btn);

      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    this.container.appendChild(table);

    // Events
    this.setupEvents(controls, thead);
  }

  setupEvents(controls, thead) {
    // Search
    controls.querySelector('#table-search').addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase();
      this.currentData = this.originalData.filter(u => 
        u.username.toLowerCase().includes(term) || 
        u.full_name.toLowerCase().includes(term)
      );
      this.renderBodyOnly();
    });

    // Sort
    thead.querySelectorAll('th[data-key]').forEach(th => {
      th.addEventListener('click', () => {
        const key = th.dataset.key;
        if (this.lastSortKey === key) this.sortDir *= -1;
        else this.sortDir = 1;
        this.lastSortKey = key;

        this.currentData.sort((a, b) => {
          if (a[key] < b[key]) return -1 * this.sortDir;
          if (a[key] > b[key]) return 1 * this.sortDir;
          return 0;
        });
        this.renderBodyOnly();
      });
    });
  }

  renderBodyOnly() {
    // Re-render just the body (simplified for this demo, usually we'd diff)
    // For simplicity in vanilla JS, we can just re-render the whole table or swap tbody
    // Let's just re-call render() but keep focus if possible. 
    // Actually, re-rendering the whole thing is easiest for this scale.
    // But to keep input focus, we shouldn't destroy the input.
    // Let's just update the tbody.
    const tbody = this.container.querySelector('tbody');
    tbody.innerHTML = '';
    
    this.currentData.forEach(u => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <div style="display:flex; align-items:center;">
            <img src="${u.profile_pic_url}" onerror="this.style.display='none'" style="width:24px; height:24px; border-radius:50%; margin-right:8px;">
            <a href="https://instagram.com/${u.username}" target="_blank" style="color:white; text-decoration:none; font-weight:500;">
              ${u.username}
            </a>
            ${Badge.renderBadges(u)}
          </div>
        </td>
        <td style="color:#aaa; font-size:11px;">${u.full_name}</td>
        <td style="text-align:center;">${u.is_verified ? '✅' : ''}</td>
        <td></td>
      `;
      const actionCell = tr.lastElementChild;
      const btn = document.createElement('button');
      btn.className = 'btn-danger-outline';
      btn.textContent = 'Unfollow';
      btn.style.fontSize = '10px';
      btn.style.padding = '2px 6px';
      btn.onclick = () => this.onUnfollow(u, btn);
      actionCell.appendChild(btn);
      tbody.appendChild(tr);
    });
  }
}
