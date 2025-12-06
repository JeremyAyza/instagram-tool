export const CSV = {
  /**
   * Convierte un array de objetos a string CSV con todos los campos raw + profile_url
   * @param {Array} data - Array de objetos usuarios
   * @returns {string} - Contenido CSV
   */
  jsonToCSV: (data) => {
    if (!data || !data.length) return '';
    
    // Definimos las columnas explícitamente para mantener orden
    const headers = [
      'id',
      'username',
      'full_name',
      'is_verified',
      'is_private',
      'profile_pic_url',
      'profile_url', // Campo calculado
      'is_creator',  // Derivado de badges para facilidad, pero guardamos badges raw también
      'fbid_v2',
      'pk_id',
      'strong_id__',
      'profile_pic_id',
      'third_party_downloads_enabled',
      'latest_reel_media',
      'account_badges' // Guardado como JSON string si es complejo
    ];

    const rows = data.map(u => {
      // Asegurar profile_url
      const profileUrl = `https://instagram.com/${u.username}`;
      
      // Serializar badges si es array/objeto
      const badges = typeof u.account_badges === 'object' ? JSON.stringify(u.account_badges).replace(/"/g, '""') : u.account_badges;

      return [
        u.id || u.pk,
        u.username,
        (u.full_name || '').replace(/"/g, '""'), // Escapar comillas
        u.is_verified,
        u.is_private,
        u.profile_pic_url || '',
        profileUrl,
        u.is_creator,
        u.fbid_v2 || '',
        u.pk_id || '',
        u.strong_id__ || '',
        u.profile_pic_id || '',
        u.third_party_downloads_enabled || 0,
        u.latest_reel_media || 0,
        `"${badges}"` // Envolver JSON en comillas
      ];
    });

    return [
      headers.join(','),
      ...rows.map(row => row.map(val => {
        // Si ya tiene comillas (como el JSON), no añadir más, o manejar escape CSV estándar
        // Simplificación: convertir todo a string y si tiene comas, envolver.
        const str = String(val === undefined || val === null ? '' : val);
        if (str.startsWith('"') && str.endsWith('"')) return str; // Ya escapado
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(','))
    ].join('\n');
  },

  /**
   * Parsea un string CSV a array de objetos
   * @param {string} csvText - Contenido del archivo CSV
   * @returns {Array} - Array de objetos usuarios
   */
  parseCSV: (csvText) => {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    
    // Helper para parsear línea CSV respetando comillas
    const parseLine = (text) => {
      const result = [];
      let cur = '';
      let inQuote = false;
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '"') {
          if (inQuote && text[i+1] === '"') {
            cur += '"';
            i++;
          } else {
            inQuote = !inQuote;
          }
        } else if (char === ',' && !inQuote) {
          result.push(cur);
          cur = '';
        } else {
          cur += char;
        }
      }
      result.push(cur);
      return result;
    };

    return lines.slice(1).map(line => {
      const values = parseLine(line);
      const obj = {};
      
      headers.forEach((header, index) => {
        let val = values[index];
        
        // Conversión de tipos básicos
        if (val === 'true') val = true;
        if (val === 'false') val = false;
        if (header === 'account_badges' && val.startsWith('{') || val.startsWith('[')) {
          try { val = JSON.parse(val); } catch(e) {}
        }
        
        obj[header] = val;
      });

      // Normalización para la app
      obj.id = obj.id || obj.pk; // Asegurar ID
      
      return obj;
    });
  }
};
