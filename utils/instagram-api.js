import { CONFIG } from '../config/constants.js';

const delay = ms => new Promise(r => setTimeout(r, ms));

/**
 * Normaliza y completa los headers críticos para simular un navegador real.
 * Asegura que los headers de seguridad (sec-ch-*) estén presentes y correctos.
 */
function normalizeHeaders(baseHeaders) {
  // Copia para no mutar el original
  const headers = {};
  
  // Convertir todas las keys a minúsculas para evitar duplicados (HTTP/2 suele usar lowercase)
  Object.keys(baseHeaders).forEach(key => {
    headers[key.toLowerCase()] = baseHeaders[key];
  });

  // Defaults basados en un Chrome moderno en Windows (fallback si el usuario no los tiene)
  const defaults = {
    'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-ch-ua-full-version-list': '"Chromium";v="124.0.0.0", "Google Chrome";v="124.0.0.0", "Not-A.Brand";v="99.0.0.0"',
    'sec-ch-ua-model': '""',
    'sec-ch-prefers-color-scheme': 'dark',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin', // CRÍTICO: Forzado a same-origin
    'x-requested-with': 'XMLHttpRequest',
    'priority': 'u=1, i'
  };

  // Aplicar defaults y correcciones
  Object.keys(defaults).forEach(key => {
    // Caso especial: sec-fetch-site SIEMPRE debe ser same-origin
    if (key === 'sec-fetch-site') {
			console.log('antes', headers[key])
      headers[key] = 'same-origin';
			console.log('despues', headers[key])
    } 
    // Si falta el header, usar el default
    else if (!headers[key]) {
      headers[key] = defaults[key];
    }
  });

  return headers;
}

export const InstagramAPI = {
  /**
   * Parsea el string de fetch copiado del navegador
   */
  parseFetchString: (fetchString) => {
    try {
      const cleanStr = fetchString.trim().replace(/;$/, '');
      
      // 1. Extraer URL
      const urlMatch = cleanStr.match(/fetch\("([^"]+)",\s*\{/);
      if (!urlMatch) throw new Error("No se pudo extraer la URL");
      const url = urlMatch[1];

      // 2. Extraer Configuración (JSON)
      const configStart = cleanStr.indexOf('{');
      const configEnd = cleanStr.lastIndexOf('}') + 1;
      if (configStart === -1 || configEnd === 0) throw new Error("No se pudo extraer la configuración");

      const configStr = cleanStr.slice(configStart, configEnd);
      let config;
      try {
        config = JSON.parse(configStr);
      } catch (e) {
        console.error("Error parseando JSON de config. Intentando limpieza básica...", e);
        // Fallback muy básico por si las keys no tienen comillas (aunque Chrome suele ponerlas)
        // Esto es arriesgado, mejor pedir al usuario que copie bien.
        throw new Error("El formato del fetch no es JSON válido. Asegúrate de copiar 'Copy as fetch' en Chrome.");
      }

      // 3. Extraer User ID de la URL
      const userIdMatch = url.match(/friendships\/(\d+)/);
      const userId = userIdMatch ? userIdMatch[1] : 'self';

      // 4. Extraer Referrer
      // A veces viene en el objeto config, a veces no. Si no viene, construimos uno default.
      let referrer = config.referrer;
      if (!referrer) {
        referrer = `https://www.instagram.com/${userId !== 'self' ? userId : ''}/following/`;
      }

      return {
        userId,
        baseHeaders: config.headers || {},
        referrer: referrer,
        credentials: config.credentials || 'include',
        mode: config.mode || 'cors'
      };
    } catch (error) {
      console.error('Error parsing fetch:', error);
      return null;
    }
  },

  /**
   * Obtiene lista de usuarios (seguidores o seguidos)
   */
  getUsers: async (apiConfig, type, onProgress, shouldStop) => {
    let results = [], nextId = null;
    const count = type === 'following' ? CONFIG.MAX_FETCH_COUNT_FOLLOWING : CONFIG.MAX_FETCH_COUNT_FOLLOWERS;
    const baseUrl = `https://www.instagram.com/api/v1/friendships/${apiConfig.userId}/${type}/?count=${count}`;
    const waitTime = type === 'following' ? CONFIG.GET_FOLLOWING_DELAY : CONFIG.GET_FOLLOWERS_DELAY;

    // Preparar headers normalizados una sola vez
    const requestHeaders = normalizeHeaders(apiConfig.baseHeaders);

    do {
      if (shouldStop()) break;

      const url = nextId ? `${baseUrl}&max_id=${nextId}` : baseUrl;
      try {
        const response = await fetch(url, {
          headers: requestHeaders,
          referrer: apiConfig.referrer,
          credentials: apiConfig.credentials,
          mode: apiConfig.mode,
          method: 'GET'
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();

        // Mapeo extendido: Guardamos TODO lo que viene
        const newUsers = data.users.map(u => {
          // Extraemos account_badges para calcular is_creator, pero NO lo guardamos en el objeto final
          const isCreator = u?.account_badges?.some(b => b.type === 'creator') || false;
          
          // Creamos copia limpia sin account_badges
          const cleanUser = { ...u };
          delete cleanUser.account_badges; 

          return {
            ...cleanUser,
            id: u.pk, // Asegurar ID estándar
            is_creator: isCreator,
            profile_url: `https://instagram.com/${u.username}`
          };
        });

        results.push(...newUsers);
        nextId = data.next_max_id;

        if (onProgress) onProgress(results.length, nextId != null);

        // Delay configurado + jitter aleatorio
        await delay(waitTime + Math.random() * 500);

      } catch (e) {
        console.error("Error fetching page:", e);
        // Si falla, esperamos un poco más antes de reintentar o salir
        await delay(5000);
        // Opcional: break; si queremos detenernos al primer error grave
      }
    } while (nextId);

    return results;
  },

  /**
   * Ejecuta unfollow a un usuario específico
   */
  unfollowUser: async (apiConfig, userId) => {
    const requestHeaders = normalizeHeaders(apiConfig.baseHeaders);
    // Para POST, necesitamos content-type
    requestHeaders['content-type'] = 'application/x-www-form-urlencoded';

    try {
      const response = await fetch(`https://www.instagram.com/api/v1/friendships/destroy/${userId}/`, {
        method: 'POST',
        headers: requestHeaders,
        body: `user_id=${userId}`,
        referrer: apiConfig.referrer,
        credentials: apiConfig.credentials,
        mode: apiConfig.mode
      });
      
      const data = await response.json();
      return data.status === 'ok';
    } catch (error) {
      console.error(`Error unfollowing ${userId}:`, error);
      return false;
    }
  }
};
