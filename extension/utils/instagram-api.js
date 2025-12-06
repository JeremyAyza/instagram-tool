import { CONFIG } from '../config/constants.js';

const delay = ms => new Promise(r => setTimeout(r, ms));

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
      const config = JSON.parse(configStr);

      const userIdMatch = url.match(/friendships\/(\d+)/);
      const userId = userIdMatch ? userIdMatch[1] : 'self';

      return {
        userId,
        baseHeaders: config.headers,
        referrer: config.referrer,
        credentials: config.credentials,
        mode: config.mode
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

    do {
      if (shouldStop()) break;

      const url = nextId ? `${baseUrl}&max_id=${nextId}` : baseUrl;
      try {
        const response = await fetch(url, {
          headers: apiConfig.baseHeaders,
          referrer: apiConfig.referrer,
          credentials: apiConfig.credentials,
          mode: apiConfig.mode
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();

        // Mapeo extendido de datos
        const newUsers = data.users.map(u => ({
          id: u.pk,
          pk: u.pk,
          username: u.username,
          full_name: u.full_name || '',
          is_verified: u.is_verified || false,
          is_private: u.is_private || false,
          profile_pic_url: u.profile_pic_url || '',
          is_creator: u.account_badges?.some(b => b.type === 'creator') || false, // Inferencia simple
          latest_reel_media: u.latest_reel_media || 0
        }));

        results.push(...newUsers);
        nextId = data.next_max_id;

        if (onProgress) onProgress(results.length, nextId != null);

        // Delay configurado + jitter aleatorio pequeño
        await delay(waitTime + Math.random() * 500);
				

      } catch (e) {
        console.error("Error fetching page:", e);
        await delay(5000); // Espera de seguridad en error
      }
    } while (nextId);

    return results;
  },

  /**
   * Ejecuta unfollow a un usuario específico
   */
  unfollowUser: async (apiConfig, userId) => {
    try {
      const response = await fetch(`https://www.instagram.com/api/v1/friendships/destroy/${userId}/`, {
        method: 'POST',
        headers: { ...apiConfig.baseHeaders, 'content-type': 'application/x-www-form-urlencoded' },
        body: `user_id=${userId}`,
        credentials: apiConfig.credentials
      });
      
      const data = await response.json();
      return data.status === 'ok';
    } catch (error) {
      console.error(`Error unfollowing ${userId}:`, error);
      return false;
    }
  }
};
