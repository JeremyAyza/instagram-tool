export const Compare = {
  /**
   * Encuentra usuarios que sigues pero no te siguen de vuelta
   * @param {Array} followers - Lista de seguidores
   * @param {Array} following - Lista de seguidos
   * @returns {Array} - Usuarios que no te siguen
   */
  findNonFollowers: (followers, following) => {
    const followerIds = new Set(followers.map(f => String(f.id)));
    return following.filter(u => !followerIds.has(String(u.id)));
  },

  /**
   * Encuentra fans (gente que te sigue pero tú no sigues)
   * @param {Array} followers 
   * @param {Array} following 
   * @returns {Array}
   */
  findFans: (followers, following) => {
    const followingIds = new Set(following.map(f => String(f.id)));
    return followers.filter(u => !followingIds.has(String(u.id)));
  },

  /**
   * Encuentra amigos mutuos
   * @param {Array} followers 
   * @param {Array} following 
   * @returns {Array}
   */
  findMutual: (followers, following) => {
    const followingIds = new Set(following.map(f => String(f.id)));
    return followers.filter(u => followingIds.has(String(u.id)));
  }
};
