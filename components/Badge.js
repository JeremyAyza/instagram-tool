export const Badge = {
  verified: () => `<span title="Verificado" style="color:#0095f6; margin-left:4px;">☑</span>`,
  private: () => `<span title="Privado" style="font-size:12px; margin-left:4px;">🔒</span>`,
  creator: () => `<span title="Creador" style="font-size:12px; margin-left:4px;">✨</span>`,
  
  renderBadges: (user) => {
    let html = '';
    if (user.is_verified) html += Badge.verified();
    if (user.is_creator) html += Badge.creator();
    if (user.is_private) html += Badge.private();
    return html;
  }
};
