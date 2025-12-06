export const Compare = {
  /**
   * Encuentra usuarios que sigues pero no te siguen de vuelta
   */
  findNonFollowers: (followers, following) => {
    const followerIds = new Set(followers.map(f => String(f.id)));
    return following.filter(u => !followerIds.has(String(u.id)));
  },

  /**
   * Encuentra fans (gente que te sigue pero tú no sigues)
   */
  findFans: (followers, following) => {
    const followingIds = new Set(following.map(f => String(f.id)));
    return followers.filter(u => !followingIds.has(String(u.id)));
  },

  /**
   * Encuentra amigos mutuos
   */
  findMutual: (followers, following) => {
    const followingIds = new Set(following.map(f => String(f.id)));
    return followers.filter(u => followingIds.has(String(u.id)));
  }
};
