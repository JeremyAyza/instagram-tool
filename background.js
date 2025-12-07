import { InstagramAPI } from './utils/instagram-api.js';
import { CONFIG } from './config/constants.js';

// --- ESTADO ---
let currentConfig = null;
let isProcessing = false;
let shouldStop = false;

// --- LISTENERS ---

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  
  // 1. Parsear Configuración
  if (request.action === 'PARSE_CONFIG') {
    const parsed = InstagramAPI.parseFetchString(request.fetchString);
    if (parsed) {
      currentConfig = parsed;
      chrome.storage.local.set({ apiConfig: currentConfig });
      sendResponse({ success: true, userId: parsed.userId });
    } else {
      sendResponse({ success: false, error: 'Formato inválido. Asegúrate de copiar el fetch completo.' });
    }
  }

  // 2. Iniciar Descarga (Followers/Following)
  else if (request.action === 'START_FETCH') {
    if (!currentConfig) {
      sendResponse({ success: false, error: 'No hay configuración. Conecta la API primero.' });
      return;
    }

    isProcessing = true;
    shouldStop = false;
    const { type } = request;

    (async () => {
      try {
        const users = await InstagramAPI.getUsers(
          currentConfig,
          type,
          (count, hasMore) => {
            chrome.runtime.sendMessage({ 
              action: 'FETCH_PROGRESS', 
              type, 
              count, 
              status: hasMore ? 'loading' : 'complete' 
            });
          },
          () => shouldStop // Callback para chequear stop
        );

        const storageKey = type === 'followers' ? 'localFollowers' : 'localFollowing';
        await chrome.storage.local.set({ [storageKey]: users });

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

    sendResponse({ success: true });
  }

  // 3. Detener Proceso
  else if (request.action === 'STOP_PROCESS') {
    shouldStop = true;
    sendResponse({ success: true });
  }

  // 4. Ejecutar Unfollows Masivos
  else if (request.action === 'EXECUTE_UNFOLLOW') {
    if (!currentConfig) return sendResponse({ success: false, error: 'No config' });
    
    const { users } = request;
    isProcessing = true;
    shouldStop = false;

    (async () => {
      let successCount = 0;
      for (let i = 0; i < users.length; i++) {
        if (shouldStop) break;
        
        const user = users[i];
        const success = await InstagramAPI.unfollowUser(currentConfig, user.id);
        
        if (success) successCount++;
        
        chrome.runtime.sendMessage({
          action: 'UNFOLLOW_PROGRESS',
          current: i + 1,
          total: users.length,
          username: user.username,
          success
        });

        // Delay inteligente usando constantes
        const delayTime = CONFIG.UNFOLLOW_DELAY + Math.random() * CONFIG.UNFOLLOW_DELAY_EXTRA;
        await new Promise(r => setTimeout(r, delayTime));
      }
      
      isProcessing = false;
      chrome.runtime.sendMessage({ action: 'UNFOLLOW_COMPLETE', count: successCount });
    })();

    sendResponse({ success: true });
  }

  return true; // Keep channel open
});
