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
      audio.currentTime = 0;
      audio.play().catch(e => console.warn('Sound blocked by browser policy:', e));
    }
  }
}

export const soundService = new SoundService();
