import { CONFIG } from '../config/constants.js';

const delay = ms => new Promise(r => setTimeout(r, ms));

/**
 * Normaliza headers permitidos (no prohibidos).
 * Los headers prohibidos (Sec-*) se manejan ahora vía declarativeNetRequest en rules.json.
 */
function normalizeHeaders(baseHeaders) {
  const headers = {};
  
  if (baseHeaders) {
    Object.keys(baseHeaders).forEach(key => {
      const lowerKey = key.toLowerCase();
      // Filtramos headers que el navegador bloquearía o que manejamos en rules.json
      if (!lowerKey.startsWith('sec-') && lowerKey !== 'host' && lowerKey !== 'connection') {
        headers[lowerKey] = baseHeaders[key];
      }
    });
  }

  // Asegurar headers permitidos críticos
  if (!headers['x-requested-with']) headers['x-requested-with'] = 'XMLHttpRequest';
  if (!headers['priority']) headers['priority'] = 'u=1, i';

  return headers;
}

export const InstagramAPI = {
  /**
   * Parsea el string de fetch copiado del navegador
   */
  parseFetchString: (fetchString) => {
    try {
      const cleanStr = fetchString.trim().replace(/;$/, '');
      
      const urlMatch = cleanStr.match(/fetch\("([^"]+)",\s*\{/);
      if (!urlMatch) throw new Error("No se pudo extraer la URL");
      const url = urlMatch[1];

      const configStart = cleanStr.indexOf('{');
      const configEnd = cleanStr.lastIndexOf('}') + 1;
      if (configStart === -1 || configEnd === 0) throw new Error("No se pudo extraer la configuración");

      const configStr = cleanStr.slice(configStart, configEnd);
      let config;
      try {
        config = JSON.parse(configStr);
      } catch (e) {
        console.error("Error parseando JSON de config:", e);
        throw new Error("El formato del fetch no es JSON válido.");
      }

      const userIdMatch = url.match(/friendships\/(\d+)/);
      const userId = userIdMatch ? userIdMatch[1] : 'self';

      // Referrer Logic
      let referrer = config.referrer;
      if (!referrer && config.headers) {
        const headerKey = Object.keys(config.headers).find(k => k.toLowerCase() === 'referer');
        if (headerKey) referrer = config.headers[headerKey];
      }
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
      console.error('❌ Error al analizar el fetch:', error);
      return null;
    }
  },

  /**
   * Obtiene lista de usuarios
   */
  getUsers: async (apiConfig, type, onProgress, shouldStop) => {
    let results = [], nextId = null;
    const count = type === 'following' ? CONFIG.MAX_FETCH_COUNT_FOLLOWING : CONFIG.MAX_FETCH_COUNT_FOLLOWERS;
    const baseUrl = `https://www.instagram.com/api/v1/friendships/${apiConfig.userId}/${type}/?count=${count}`;
    const waitTime = type === 'following' ? CONFIG.GET_FOLLOWING_DELAY : CONFIG.GET_FOLLOWERS_DELAY;

    const requestHeaders = normalizeHeaders(apiConfig.baseHeaders);

    do {
      if (shouldStop()) break;

      const url = nextId ? `${baseUrl}&max_id=${nextId}` : baseUrl;
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: requestHeaders,
          referrer: apiConfig.referrer,
          credentials: apiConfig.credentials,
          mode: apiConfig.mode
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();

        const newUsers = data.users.map(u => ({
          ...u,
          id: u.pk,
          is_creator: u.account_badges?.some(b => b.type === 'creator') || false,
          profile_url: `https://instagram.com/${u.username}`
        }));

        results.push(...newUsers);
        nextId = data.next_max_id;

        if (onProgress) onProgress(results.length, nextId != null);
        await delay(waitTime + Math.random() * 500);

      } catch (e) {
        console.error("Error fetching page:", e);
        await delay(5000);
      }
    } while (nextId);

    return results;
  },

  /**
   * Ejecuta unfollow
   */
  unfollowUser: async (apiConfig, userId) => {
    const requestHeaders = normalizeHeaders(apiConfig.baseHeaders);
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
