// 8-bit sound effects using Web Audio API

class SoundManager {
  private audioContext: AudioContext | null = null;

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
    this.playTone(800, 0.1, 'square', 0.15);
  }

  // Button hover sound
  playHover() {
    this.playTone(600, 0.05, 'square', 0.08);
  }

  // Drawing sound (brush stroke)
  playDraw() {
    this.playTone(400, 0.05, 'sawtooth', 0.1);
  }

  // Success/completion sound
  playSuccess() {
    // Two-tone chime
    this.playTone(600, 0.1, 'square', 0.15);
    setTimeout(() => {
      this.playTone(800, 0.15, 'square', 0.15);
    }, 100);
  }

  // Error sound
  playError() {
    this.playTone(200, 0.2, 'sawtooth', 0.2);
  }

  // Submit sound
  playSubmit() {
    // Ascending notes
    this.playTone(400, 0.1, 'square', 0.15);
    setTimeout(() => {
      this.playTone(600, 0.1, 'square', 0.15);
    }, 100);
    setTimeout(() => {
      this.playTone(800, 0.15, 'square', 0.15);
    }, 200);
  }

  // Round transition sound
  playTransition() {
    // Descending notes
    this.playTone(800, 0.1, 'square', 0.15);
    setTimeout(() => {
      this.playTone(600, 0.1, 'square', 0.15);
    }, 100);
    setTimeout(() => {
      this.playTone(400, 0.15, 'square', 0.15);
    }, 200);
  }

  // Timer warning sound
  playWarning() {
    this.playTone(300, 0.2, 'square', 0.2);
    setTimeout(() => {
      this.playTone(300, 0.2, 'square', 0.2);
    }, 200);
  }

  // Timer tick sound (for countdown)
  playTick() {
    this.playTone(500, 0.05, 'square', 0.08);
  }

  // Frame completion sound
  playFrameComplete() {
    this.playTone(700, 0.1, 'square', 0.12);
  }

  // Player join sound
  playPlayerJoin() {
    // Upward arpeggio
    this.playTone(400, 0.08, 'square', 0.12);
    setTimeout(() => {
      this.playTone(500, 0.08, 'square', 0.12);
    }, 80);
    setTimeout(() => {
      this.playTone(600, 0.08, 'square', 0.12);
    }, 160);
  }

  // Game start sound
  playGameStart() {
    // Fanfare
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
  }

  // Timer low sound (when under 30 seconds)
  playTimerLow() {
    this.playTone(250, 0.15, 'sawtooth', 0.15);
  }

  // Drawing complete sound
  playDrawingComplete() {
    // Three-tone completion
    this.playTone(500, 0.1, 'square', 0.15);
    setTimeout(() => {
      this.playTone(600, 0.1, 'square', 0.15);
    }, 100);
    setTimeout(() => {
      this.playTone(700, 0.15, 'square', 0.15);
    }, 200);
  }

  // Download/GIF generation sound
  playDownload() {
    // Success chime
    this.playTone(600, 0.1, 'square', 0.15);
    setTimeout(() => {
      this.playTone(800, 0.15, 'square', 0.15);
    }, 100);
  }
}

export const soundManager = new SoundManager();

