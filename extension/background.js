import { CSV } from './utils/csv.js';

// --- CONFIGURACIÓN Y ESTADO ---
let currentConfig = null;
let isProcessing = false;
let shouldStop = false;

// --- UTILS INTERNOS (Adaptados del código original) ---

function parseFetchString(fetchString) {
  try {
    const cleanStr = fetchString.trim().replace(/;$/, '');
    const urlMatch = cleanStr.match(/fetch\("([^"]+)",\s*\{/);
    if (!urlMatch) throw new Error("No se pudo extraer la URL");
    const url = urlMatch[1];

    const configStart = cleanStr.indexOf('{');
    const configEnd = cleanStr.lastIndexOf('}') + 1;
    if (configStart === -1 || configEnd === 0) throw new Error("No se pudo extraer la configuración");

    const configStr = cleanStr.slice(configStart, configEnd);
    // Nota: JSON.parse puede fallar si el string del fetch copiado no es JSON válido estricto (ej: claves sin comillas)
    // En un entorno real, a veces es mejor usar un parser más laxo o pedir al usuario que copie el objeto.
    // Para este caso, asumiremos que el usuario copia del navegador Chrome que suele dar formato válido o ajustaremos.
    // El código original usaba JSON.parse, así que lo mantenemos.
    const config = JSON.parse(configStr);

    return { url, config };
  } catch (error) {
    console.error('Error parsing fetch:', error);
    return null;
  }
}

const delay = ms => new Promise(r => setTimeout(r, ms));

// --- API CORE (Lógica original adaptada) ---

async function getUsers(config, type, count, excludeVerified, onProgress) {
  let results = [], nextId = null;
  const baseUrl = `https://www.instagram.com/api/v1/friendships/${config.userId}/${type}/?count=${count}`;
  let pageCount = 0;

  do {
    if (shouldStop) break;

    const url = nextId ? `${baseUrl}&max_id=${nextId}` : baseUrl;
    try {
      const response = await fetch(url, {
        headers: config.baseHeaders,
        referrer: config.referrer,
        credentials: config.credentials,
        mode: config.mode
      });
			console.log(url, {
				headers: config.baseHeaders,
        referrer: config.referrer,
        credentials: config.credentials,
        mode: config.mode
			})
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();

      const newUsers = data.users
        .filter(u => excludeVerified ? !u.is_verified : true)
        .map(u => ({ id: u.pk, username: u.username, is_verified: u.is_verified }));

      results.push(...newUsers);
      nextId = data.next_max_id;
      pageCount++;

      // Notificar progreso
      if (onProgress) onProgress(results.length, nextId != null);

      // Delay aleatorio para seguridad
      await delay(Math.floor(Math.random() * 1000) + 1000);

    } catch (e) {
      console.error("Error fetching page:", e);
      // Intentar continuar o parar?
      await delay(5000); // Esperar más si hay error
    }
  } while (nextId);

  return results;
}

async function executeUnfollow(config, userId, onResult) {
  try {
    const response = await fetch(`https://www.instagram.com/api/v1/friendships/destroy/${userId}/`, {
      method: 'POST',
      headers: { ...config.baseHeaders, 'content-type': 'application/x-www-form-urlencoded' },
      body: `user_id=${userId}`,
      credentials: config.credentials
    });
    
    const data = await response.json();
    if (onResult) onResult(data.status === 'ok', userId);
    return data.status === 'ok';
  } catch (error) {
    console.error(`Error unfollowing ${userId}:`, error);
    if (onResult) onResult(false, userId);
    return false;
  }
}

// --- MESSAGE HANDLERS ---

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'PARSE_CONFIG') {
    const parsed = parseFetchString(request.fetchString);
    if (parsed) {
      const userIdMatch = parsed.url.match(/friendships\/(\d+)/);
      const userId = userIdMatch ? userIdMatch[1] : 'self';
      
      currentConfig = {
        userId,
        baseHeaders: parsed.config.headers,
        referrer: parsed.config.referrer,
        credentials: parsed.config.credentials,
        mode: parsed.config.mode
      };
      
      // Guardar config en storage para persistencia simple
      chrome.storage.local.set({ apiConfig: currentConfig });
      sendResponse({ success: true, userId });
    } else {
      sendResponse({ success: false, error: 'Formato inválido' });
    }
  }

  else if (request.action === 'START_FETCH') {
		console.log('START_FETCH')
    if (!currentConfig) {
      sendResponse({ success: false, error: 'No hay configuración. Pega el fetch primero.' });
      return;
    }

    isProcessing = true;
    shouldStop = false;
    const { type } = request; // 'followers' or 'following'
    
    // Iniciar proceso asíncrono sin bloquear response
    (async () => {
      try {
        const users = await getUsers(
          currentConfig, 
          type, 
          type === 'following' ? 200 : 12, // Count original
          false, // Exclude verified (default false for fetching)
          (count, hasMore) => {
            chrome.runtime.sendMessage({ 
              action: 'FETCH_PROGRESS', 
              type, 
              count, 
              status: hasMore ? 'loading' : 'complete' 
            });
          }
        );

        // Guardar resultados
        const storageKey = type === 'followers' ? 'localFollowers' : 'localFollowing';
        await chrome.storage.local.set({ [storageKey]: users });
				console.log('FETCH_COMPLETE')

        chrome.runtime.sendMessage({ 
          action: 'FETCH_COMPLETE', 
          type, 
          count: users.length, 
          data: users 
        });

      } catch (err) {
        chrome.runtime.sendMessage({ action: 'FETCH_ERROR', error: err.message });
      } finally {
        isProcessing = false;
      }
    })();

    sendResponse({ success: true, message: 'Iniciando descarga...' });
  }

  else if (request.action === 'STOP_PROCESS') {
    shouldStop = true;
    sendResponse({ success: true });
  }

  else if (request.action === 'DOWNLOAD_CSV') {
    // Generar CSV y descargar
    const { data, filename } = request;
    const csvContent = CSV.jsonToCSV(data);
    const base64 = btoa(unescape(encodeURIComponent(csvContent)));
    
    chrome.downloads.download({
      url: `data:text/csv;charset=utf-8;base64,${base64}`,
      filename: `${filename}.csv`,
      saveAs: true
    });
    sendResponse({ success: true });
  }

  else if (request.action === 'EXECUTE_UNFOLLOW') {
    if (!currentConfig) return sendResponse({ success: false });
    
    const { users } = request;
    isProcessing = true;
    shouldStop = false;

    (async () => {
      let successCount = 0;
      for (let i = 0; i < users.length; i++) {
        if (shouldStop) break;
        
        const user = users[i];
        await executeUnfollow(currentConfig, user.id, (success) => {
          if (success) successCount++;
          chrome.runtime.sendMessage({
            action: 'UNFOLLOW_PROGRESS',
            current: i + 1,
            total: users.length,
            username: user.username,
            success
          });
        });

        // Delay inteligente
        await delay(Math.floor(Math.random() * 1000) + 1000); 
        if (i % 10 === 0) await delay(2000); // Pausa extra cada 10
      }
      
      isProcessing = false;
      chrome.runtime.sendMessage({ action: 'UNFOLLOW_COMPLETE', count: successCount });
    })();

    sendResponse({ success: true });
  }

  return true; // Keep channel open
});
