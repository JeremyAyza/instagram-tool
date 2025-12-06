import { Badge } from './Badge.js';
import { Buttons } from './Buttons.js';

export class Table {
  constructor(containerId, data, onUnfollow) {
    this.container = document.getElementById(containerId);
    this.originalData = data;
    this.currentData = [...data];
    this.onUnfollow = onUnfollow;
    this.sortDir = 1;
    this.lastSortKey = null;
    this.defaultImage = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2NjYyI+PHBhdGggZD0iTTEyIDEyYzIuMjEgMCA0LTEuNzkgNC00cy0xLjc5LTQtNC00LTQgMS43OS00IDQgMS43OSA0IDQgNHptMCAyYy0yLjY3IDAtOCAxLjM0LTggNHYyaDE2di0yYzAtMi42Ni01LjMzLTQtOC00eiIvPjwvc3ZnPg==';
  }

  render() {
    this.container.innerHTML = '';
    
    // Controls
    const controls = document.createElement('div');
    controls.className = 'table-controls';
    controls.innerHTML = `
      <input type="text" id="table-search" placeholder="Buscar por usuario, nombre o ID..." class="search-input">
    `;
    this.container.appendChild(controls);

    // Table
    const table = document.createElement('table');
    table.className = 'custom-table';
    
    // Header
    const thead = document.createElement('thead');
    thead.innerHTML = `
      <tr>
        <th style="width: 50px;">Foto</th>
        <th data-key="username" class="sortable">Usuario ↕</th>
        <th data-key="full_name" class="sortable">Nombre ↕</th>
        <th data-key="is_verified" class="sortable" style="width:60px;">Verif.</th>
        <th style="width:80px;">Tipo</th>
        <th style="width:140px;">Acciones</th>
      </tr>
    `;
    table.appendChild(thead);

    // Body
    const tbody = document.createElement('tbody');
    table.appendChild(tbody);
    this.container.appendChild(table);
    
    this.tbody = tbody; // Save reference
    this.renderRows();  // Initial render

    // Events
    this.setupEvents(controls, thead);
  }

  renderRows() {
    this.tbody.innerHTML = '';
    
    if (this.currentData.length === 0) {
      this.tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px;">No se encontraron resultados</td></tr>';
      return;
    }

    this.currentData.forEach(u => {
      const tr = document.createElement('tr');
      
      // Determine Type
      let userType = 'Común';
      if (u.is_verified) userType = 'Verificado';
      else if (u.is_creator) userType = 'Creador';
      else if (u.is_private) userType = 'Privado';

      // Image Handling
      const imgSrc = u.profile_pic_url && u.profile_pic_url.startsWith('http') ? u.profile_pic_url : this.defaultImage;

      tr.innerHTML = `
        <td>
          <img src="${imgSrc}" class="user-avatar" alt="pic">
        </td>
        <td>
          <div class="user-info">
            <span class="username">@${u.username}</span>
            ${Badge.renderBadges(u)}
          </div>
        </td>
        <td class="text-muted">${u.full_name || '-'}</td>
        <td class="text-center">${u.is_verified ? '✅' : ''}</td>
        <td class="text-muted" style="font-size:11px;">${userType}</td>
        <td>
          <div class="action-buttons">
            <!-- Buttons injected via JS -->
          </div>
        </td>
      `;

      // Inject Buttons
      const actionsDiv = tr.querySelector('.action-buttons');
      
      // 1. View Profile
      const btnProfile = Buttons.iconBtn('🔗', 'Ver Perfil', () => {
        window.open(`https://instagram.com/${u.username}`, '_blank');
      }, '#0095f6');
      btnProfile.classList.add('btn-icon');
      actionsDiv.appendChild(btnProfile);

      // 2. Unfollow
      const btnUnfollow = document.createElement('button');
      btnUnfollow.className = 'btn-danger-outline small-btn';
      btnUnfollow.textContent = 'Unfollow';
      btnUnfollow.onclick = () => this.onUnfollow(u, btnUnfollow);
      actionsDiv.appendChild(btnUnfollow);

      // Image Error Handler
      const img = tr.querySelector('img');
      img.onerror = () => { img.src = this.defaultImage; };

      this.tbody.appendChild(tr);
    });
  }

  setupEvents(controls, thead) {
    // Search
    const searchInput = controls.querySelector('#table-search');
    searchInput.addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase();
      this.currentData = this.originalData.filter(u => 
        (u.username && u.username.toLowerCase().includes(term)) || 
        (u.full_name && u.full_name.toLowerCase().includes(term)) ||
        (u.id && String(u.id).includes(term))
      );
      this.renderRows();
    });

    // Sort
    thead.querySelectorAll('th.sortable').forEach(th => {
      th.addEventListener('click', () => {
        const key = th.dataset.key;
        if (this.lastSortKey === key) this.sortDir *= -1;
        else this.sortDir = 1;
        this.lastSortKey = key;

        this.currentData.sort((a, b) => {
          const valA = a[key] || '';
          const valB = b[key] || '';
          
          if (valA < valB) return -1 * this.sortDir;
          if (valA > valB) return 1 * this.sortDir;
          return 0;
        });
        this.renderRows();
      });
    });
  }
}
