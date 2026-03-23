const sounds: Record<string, string> = {
  add: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3', // Pop/Bubble
  remove: 'https://assets.mixkit.co/active_storage/sfx/2570/2570-preview.mp3', // Click/Slide
  order: 'https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3', // Success/Chime
};

type SoundKey = keyof typeof sounds;

class SoundService {
  private audioElements: Partial<Record<SoundKey, HTMLAudioElement>> = {};
  private initialized = false;

  constructor() {
    this.init();
  }

  init(): void {
    if (typeof window === 'undefined') return;
    (Object.keys(sounds) as SoundKey[]).forEach((key) => {
      try {
        const audio = new Audio();
        audio.src = sounds[key];
        audio.preload = 'auto';
        this.audioElements[key] = audio;
      } catch (e) {
        console.warn(`[SOUND] Failed to initialize sound "${key}":`, e);
      }
    });
    this.initialized = true;
  }

  async play(key: SoundKey): Promise<void> {
    if (!this.initialized) this.init();

    const audio = this.audioElements[key];
    if (!audio) return;

    try {
      audio.currentTime = 0;
      await audio.play();
    } catch (e) {
      if (e instanceof Error) {
        if (e.name === 'NotSupportedError') {
          console.warn(
            `[SOUND] Sound "${key}" not supported or blocked. Attempting to reload source.`
          );
          audio.src = sounds[key];
          audio.load();
        } else if (e.name === 'NotAllowedError') {
          console.log('[SOUND] Playback blocked until user interaction');
        } else {
          console.warn(`[SOUND] Error playing "${key}":`, e);
        }
      }
    }
  }
}

export const soundService = new SoundService();
