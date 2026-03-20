const sounds = {
  add: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3', // Pop/Bubble
  remove: 'https://assets.mixkit.co/active_storage/sfx/2570/2570-preview.mp3', // Click/Slide
  order: 'https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3', // Success/Chime
};

class SoundService {
  constructor() {
    this.audioElements = {};
    Object.keys(sounds).forEach(key => {
      this.audioElements[key] = new Audio(sounds[key]);
      this.audioElements[key].preload = 'auto';
    });
  }

  play(key) {
    const audio = this.audioElements[key];
    if (audio) {
      // Re-set src if it somehow became invalid (for "no supported sources" error)
      if (!audio.src || audio.src === 'null' || audio.src.includes('undefined')) {
        audio.src = sounds[key];
      }

      // If already playing or loading, don't interrupt unless needed
      // But for small sounds like 'add', we usually want to restart
      audio.currentTime = 0;
      
      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        playPromise.catch(e => {
          // If it failed because of sources, try to reload once with a small delay
          if (e.name === 'NotSupportedError' || e.message.includes('supported sources')) {
            console.warn(`[SOUND] Source error for ${key}. Attempting reload...`);
            
            // Debounce reloads to avoid infinite loops if the source is truly dead
            const now = Date.now();
            if (!audio._lastReload || now - audio._lastReload > 2000) {
              audio._lastReload = now;
              audio.load();
              // Try playing once more after a short delay
              setTimeout(() => {
                audio.play().catch(() => {});
              }, 500);
            }
          } else if (e.name === 'NotAllowedError') {
            // User hasn't interacted with the page yet
            // This is expected and fine
          } else {
            console.warn(`[SOUND] Error playing ${key}:`, e);
          }
        });
      }
    }
  }
}

export const soundService = new SoundService();
