export const Buttons = {
  actionBtn: (text, onClick, colorClass = 'btn-secondary') => {
    const btn = document.createElement('button');
    btn.className = `btn ${colorClass}`;
    btn.textContent = text;
    btn.onclick = onClick;
    return btn;
  },
  
  iconBtn: (icon, title, onClick, color = '#fff') => {
    const btn = document.createElement('button');
    btn.innerHTML = icon;
    btn.title = title;
    btn.style.background = 'none';
    btn.style.border = 'none';
    btn.style.color = color;
    btn.style.cursor = 'pointer';
    btn.style.padding = '4px';
    btn.onclick = onClick;
    return btn;
  }
};
