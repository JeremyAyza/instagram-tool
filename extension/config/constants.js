export const CONFIG = {
  // Delays (en milisegundos)
  GET_FOLLOWERS_DELAY: 1200,      // Tiempo entre páginas de seguidores
  GET_FOLLOWING_DELAY: 1500,      // Tiempo entre páginas de seguidos
  UNFOLLOW_DELAY: 2000,           // Tiempo base entre unfollows
  UNFOLLOW_DELAY_EXTRA: 1000,     // Tiempo extra aleatorio (0 - 1000ms)
  
  // Límites de seguridad
  MAX_FETCH_COUNT_FOLLOWERS: 12,  // Cantidad por petición (API default: 12)
  MAX_FETCH_COUNT_FOLLOWING: 200, // Cantidad por petición (API default: 200)
  DAILY_UNFOLLOW_LIMIT: 150,      // Límite sugerido (no forzado, pero para advertencias)

  // Configuración de UI
  COLORS: {
    FOLLOWERS: '#0095f6', // Azul Instagram
    FOLLOWING: '#8e44ad', // Morado
    COMPARE: '#f39c12',   // Naranja
    DANGER: '#ed4956',    // Rojo
    SUCCESS: '#00d26a',   // Verde
    TEXT_SEC: '#8e8e8e'
  }
};
