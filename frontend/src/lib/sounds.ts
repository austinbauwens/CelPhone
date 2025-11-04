// 8-bit sound effects using audio files with fallback to Web Audio API

type SoundEffect = 
  | 'click'
  | 'hover'
  | 'draw'
  | 'success'
  | 'error'
  | 'submit'
  | 'transition'
  | 'warning'
  | 'tick'
  | 'frameComplete'
  | 'playerJoin'
  | 'gameStart'
  | 'timerLow'
  | 'drawingComplete'
  | 'download'
  | 'powerup'
  | 'pickup'
  | 'jump'
  | 'coin'
  | 'menu'
  | 'typing';

class SoundManager {
  private audioContext: AudioContext | null = null;
  private audioCache: Map<string, HTMLAudioElement> = new Map();
  private soundEnabled: boolean = true;

  constructor() {
    // Initialize audio context on first user interaction
    if (typeof window !== 'undefined') {
      document.addEventListener('click', this.initAudioContext, { once: true });
      document.addEventListener('keydown', this.initAudioContext, { once: true });
    }
  }

  private initAudioContext = () => {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  };

  // Sound file mappings - maps our sound effects to OpenGameArt filenames
  private soundFiles: Record<SoundEffect, string> = {
    click: 'ui-click.wav',
    hover: 'ui-hover.wav',
    draw: 'brush.wav',
    success: 'powerup.wav',
    error: 'error.wav',
    submit: 'coin.wav',
    transition: 'transition.wav',
    warning: 'warning.wav',
    tick: 'tick.wav',
    frameComplete: 'pickup.wav',
    playerJoin: 'jump.wav',
    gameStart: 'powerup.wav',
    timerLow: 'warning.wav',
    drawingComplete: 'success.wav',
    download: 'coin.wav',
    powerup: 'powerup.wav',
    pickup: 'pickup.wav',
    jump: 'jump.wav',
    coin: 'coin.wav',
    menu: 'ui-click.wav',
    typing: 'tick.wav', // Use tick sound for typing
  };

  // Load and cache an audio file - optimized for performance
  private async loadAudio(soundName: SoundEffect): Promise<HTMLAudioElement | null> {
    const fileName = this.soundFiles[soundName];
    if (!fileName) return null;

    // Check cache first (synchronous lookup for performance)
    const cached = this.audioCache.get(fileName);
    if (cached) {
      return cached;
    }

    try {
      const audio = new Audio(`/sounds/${fileName}`);
      audio.volume = 0.15; // Quiet volume (15%)
      audio.preload = 'auto'; // Preload for better performance

      // Cache immediately (before load completes) to avoid duplicate requests
      this.audioCache.set(fileName, audio);

      // Preload (audio.load() returns void, not a Promise)
      try {
        audio.load();
      } catch {
        // Silently handle load errors - will fallback to programmatic tone
      }

      return audio;
    } catch (error) {
      console.warn(`Failed to load sound: ${fileName}`, error);
      return null;
    }
  }

  // Play a sound file with fallback to programmatic tone
  // Applies low-pass filter to soften sharp 8-bit sounds
  private async playSound(soundName: SoundEffect, fallbackTone?: () => void) {
    if (!this.soundEnabled) return;

    // Initialize audio context if needed
    if (!this.audioContext) {
      this.initAudioContext();
    }

    const audio = await this.loadAudio(soundName);
    if (audio && this.audioContext) {
      try {
        // Fetch and decode the audio file
        const response = await fetch(audio.src);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

        // Create a new audio source for this playback
        const source = this.audioContext.createBufferSource();
        source.buffer = audioBuffer;

        // Create low-pass filter to soften sharp sounds
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 2500; // Cut frequencies above 2.5kHz for softer sound
        filter.Q.value = 1;

        // Create gain node for volume control
        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = 0.15; // Quiet volume (15%)

        // Connect: source -> filter -> gain -> destination
        source.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        // Play the filtered sound
        source.start(0);
        return;
      } catch (error) {
        console.warn(`Failed to play filtered sound: ${soundName}`, error);
        // Fall through to simple playback fallback
      }
    }

    // Fallback: simple playback without filter
    if (audio) {
      try {
        const audioElement = new Audio(audio.src);
        audioElement.volume = 0.15;
        audioElement.onerror = () => {
          if (fallbackTone) fallbackTone();
        };
        await audioElement.play().catch(() => {
          if (fallbackTone) fallbackTone();
        });
        return;
      } catch (error) {
        console.warn(`Failed to play sound: ${soundName}`, error);
      }
    }

    // Final fallback to programmatic tone
    if (fallbackTone) {
      fallbackTone();
    }
  }

  private playTone(frequency: number, duration: number, type: OscillatorType = 'square', volume: number = 0.1) {
    if (!this.audioContext) {
      this.initAudioContext();
    }
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = type;

    gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  // Button click sound
  playClick() {
    this.playSound('click', () => this.playTone(800, 0.1, 'square', 0.15));
  }

  // Button hover sound
  playHover() {
    this.playSound('hover', () => this.playTone(600, 0.05, 'square', 0.08));
  }

  // Drawing sound (brush stroke)
  playDraw() {
    this.playSound('draw', () => this.playTone(400, 0.05, 'sawtooth', 0.1));
  }

  // Success/completion sound
  playSuccess() {
    this.playSound('success', () => {
      this.playTone(600, 0.1, 'square', 0.15);
      setTimeout(() => {
        this.playTone(800, 0.15, 'square', 0.15);
      }, 100);
    });
  }

  // Error sound
  playError() {
    this.playSound('error', () => this.playTone(200, 0.2, 'sawtooth', 0.2));
  }

  // Submit sound
  playSubmit() {
    this.playSound('submit', () => {
      this.playTone(400, 0.1, 'square', 0.15);
      setTimeout(() => {
        this.playTone(600, 0.1, 'square', 0.15);
      }, 100);
      setTimeout(() => {
        this.playTone(800, 0.15, 'square', 0.15);
      }, 200);
    });
  }

  // Round transition sound
  playTransition() {
    this.playSound('transition', () => {
      this.playTone(800, 0.1, 'square', 0.15);
      setTimeout(() => {
        this.playTone(600, 0.1, 'square', 0.15);
      }, 100);
      setTimeout(() => {
        this.playTone(400, 0.15, 'square', 0.15);
      }, 200);
    });
  }

  // Timer warning sound
  playWarning() {
    this.playSound('warning', () => {
      this.playTone(300, 0.2, 'square', 0.2);
      setTimeout(() => {
        this.playTone(300, 0.2, 'square', 0.2);
      }, 200);
    });
  }

  // Timer tick sound (for countdown)
  playTick() {
    this.playSound('tick', () => this.playTone(500, 0.05, 'square', 0.08));
  }

  // Frame completion sound
  playFrameComplete() {
    this.playSound('frameComplete', () => this.playTone(700, 0.1, 'square', 0.12));
  }

  // Player join sound
  playPlayerJoin() {
    this.playSound('playerJoin', () => {
      this.playTone(400, 0.08, 'square', 0.12);
      setTimeout(() => {
        this.playTone(500, 0.08, 'square', 0.12);
      }, 80);
      setTimeout(() => {
        this.playTone(600, 0.08, 'square', 0.12);
      }, 160);
    });
  }

  // Game start sound
  playGameStart() {
    this.playSound('gameStart', () => {
      this.playTone(600, 0.1, 'square', 0.15);
      setTimeout(() => {
        this.playTone(700, 0.1, 'square', 0.15);
      }, 100);
      setTimeout(() => {
        this.playTone(800, 0.1, 'square', 0.15);
      }, 200);
      setTimeout(() => {
        this.playTone(1000, 0.2, 'square', 0.15);
      }, 300);
    });
  }

  // Timer low sound (when under 30 seconds)
  playTimerLow() {
    this.playSound('timerLow', () => this.playTone(250, 0.15, 'sawtooth', 0.15));
  }

  // Drawing complete sound
  playDrawingComplete() {
    this.playSound('drawingComplete', () => {
      this.playTone(500, 0.1, 'square', 0.15);
      setTimeout(() => {
        this.playTone(600, 0.1, 'square', 0.15);
      }, 100);
      setTimeout(() => {
        this.playTone(700, 0.15, 'square', 0.15);
      }, 200);
    });
  }

  // Download/GIF generation sound
  playDownload() {
    this.playSound('download', () => {
      this.playTone(600, 0.1, 'square', 0.15);
      setTimeout(() => {
        this.playTone(800, 0.15, 'square', 0.15);
      }, 100);
    });
  }

  // Typing sound (very subtle) - optimized for performance
  private lastTypingTime = 0;
  private typingThrottle = 50; // Minimum ms between typing sounds
  private typingAudioCache: { buffer: AudioBuffer; source: AudioBufferSourceNode | null } | null = null;
  
  playTyping() {
    // Throttle typing sounds to avoid too many overlapping sounds
    const now = Date.now();
    if (now - this.lastTypingTime < this.typingThrottle) {
      return;
    }
    this.lastTypingTime = now;

    if (!this.soundEnabled) return;

    // Initialize audio context if needed
    if (!this.audioContext) {
      this.initAudioContext();
    }

    // Use cached audio buffer if available (much faster)
    if (this.typingAudioCache && this.typingAudioCache.buffer && this.audioContext) {
      try {
        const source = this.audioContext.createBufferSource();
        source.buffer = this.typingAudioCache.buffer;

        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 2500;
        filter.Q.value = 1;

        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = 0.05;

        source.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        source.start(0);
        return;
      } catch (error) {
        // Fallback if cached buffer fails
      }
    }

    // Load and cache audio buffer on first use
    const audio = this.loadAudio('typing');
    audio.then((audioElement) => {
      if (audioElement && this.audioContext) {
        try {
          // Fetch and decode once, then cache the buffer
          fetch(audioElement.src)
            .then(response => response.arrayBuffer())
            .then(arrayBuffer => this.audioContext!.decodeAudioData(arrayBuffer))
            .then(audioBuffer => {
              // Cache the decoded buffer for future use
              this.typingAudioCache = { buffer: audioBuffer, source: null };
              
              // Play immediately
              const source = this.audioContext!.createBufferSource();
              source.buffer = audioBuffer;

              const filter = this.audioContext!.createBiquadFilter();
              filter.type = 'lowpass';
              filter.frequency.value = 2500;
              filter.Q.value = 1;

              const gainNode = this.audioContext!.createGain();
              gainNode.gain.value = 0.05;

              source.connect(filter);
              filter.connect(gainNode);
              gainNode.connect(this.audioContext!.destination);
              source.start(0);
            })
            .catch(() => {
              // Fallback to very quiet programmatic tone
              this.playTone(800, 0.03, 'square', 0.03);
            });
        } catch (error) {
          // Fallback to very quiet programmatic tone
          this.playTone(800, 0.03, 'square', 0.03);
        }
      } else {
        // Fallback to very quiet programmatic tone
        this.playTone(800, 0.03, 'square', 0.03);
      }
    });
  }
}

export const soundManager = new SoundManager();
