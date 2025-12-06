export const CSV = {
  /**
   * Convierte un array de objetos a string CSV con todos los campos
   * @param {Array} data - Array de objetos usuarios
   * @returns {string} - Contenido CSV
   */
  jsonToCSV: (data) => {
    if (!data || !data.length) return '';
    
    // Columnas extendidas
    const headers = [
      'id', 
      'username', 
      'full_name', 
      'is_verified', 
      'is_private', 
      'is_creator',
      'profile_url', 
      'profile_pic_url',
      'latest_reel_media'
    ];

    const rows = data.map(u => [
      u.id,
      u.username,
      // Escapar comillas dobles en nombres
      (u.full_name || '').replace(/"/g, '""'),
      u.is_verified ? 'Yes' : 'No',
      u.is_private ? 'Yes' : 'No',
      u.is_creator ? 'Yes' : 'No',
      `https://instagram.com/${u.username}`,
      u.profile_pic_url || '',
      u.latest_reel_media || 0
    ]);

    return [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${val}"`).join(','))
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

    // Detectar cabeceras para mapeo dinámico si fuera necesario, 
    // pero por ahora asumimos el orden fijo de nuestra exportación para simplificar
    // o hacemos un parseo básico.
    
    return lines.slice(1).map(line => {
      // Regex simple para CSV que respeta comillas: 
      // Divide por comas solo si no están dentro de comillas
      const parts = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
      const cleanParts = parts.map(p => p.replace(/^"|"$/g, '').replace(/""/g, '"'));

      // Fallback si el regex falla (caso simple)
      const p = cleanParts.length >= 2 ? cleanParts : line.split(',');

      return {
        id: p[0],
        username: p[1],
        full_name: p[2] || '',
        is_verified: p[3] === 'Yes',
        is_private: p[4] === 'Yes',
        is_creator: p[5] === 'Yes',
        profile_url: p[6],
        profile_pic_url: p[7] || '',
        latest_reel_media: p[8] || 0
      };
    });
  }
};
