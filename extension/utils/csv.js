export const CSV = {
  /**
   * Convierte un array de objetos a string CSV
   * @param {Array} data - Array de objetos usuarios
   * @returns {string} - Contenido CSV
   */
  jsonToCSV: (data) => {
    if (!data || !data.length) return '';
    
    const headers = ['id', 'username', 'is_verified', 'profile_url'];
    const rows = data.map(u => [
      u.id,
      u.username,
      u.is_verified ? 'Sí' : 'No',
      `https://instagram.com/${u.username}`
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

    // Asumimos el orden: id, username, is_verified, profile_url
    // Saltamos la cabecera
    return lines.slice(1).map(line => {
      // Manejo básico de CSV (respetando comillas si las hubiera, aunque el generador es simple)
      const parts = line.split(',').map(p => p.replace(/^"|"$/g, ''));
      return {
        id: parts[0],
        username: parts[1],
        is_verified: parts[2] === 'Sí',
        profile_url: parts[3]
      };
    });
  }
};
