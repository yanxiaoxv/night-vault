// Night Vault — every sound is synthesised with WebAudio; there are no
// audio files. Soft heel clicks pace the burglar, a coin sings when it
// lands, and the guards' alarm is a two-note brass sting. M mutes all of it.

export class SoundFX {
  constructor() {
    this.context = null;
    this.master = null;
    this.muted = false;
    this.stepSide = 1;
  }

  /** Browsers only let audio start after a gesture; call on any input. */
  unlock() {
    if (this.context) {
      if (this.context.state === 'suspended') this.context.resume();
      return;
    }
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return;
    this.context = new AudioCtor();
    this.master = this.context.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.context.destination);
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  tone({ frequency = 440, endFrequency = null, seconds = 0.12, type = 'sine', volume = 0.2, delay = 0 }) {
    if (!this.context || this.muted) return;
    const start = this.context.currentTime + delay;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + seconds);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
    oscillator.connect(gain);
    gain.connect(this.master);
    oscillator.start(start);
    oscillator.stop(start + seconds + 0.05);
  }

  footstep() {
    this.stepSide = -this.stepSide;
    this.tone({ frequency: this.stepSide > 0 ? 190 : 165, seconds: 0.05, type: 'triangle', volume: 0.10 });
  }

  coinToss() {
    this.tone({ frequency: 1240, seconds: 0.07, type: 'sine', volume: 0.10 });
  }

  coinPing() {
    this.tone({ frequency: 2093, seconds: 0.16, type: 'sine', volume: 0.20 });
    this.tone({ frequency: 2637, seconds: 0.22, type: 'sine', volume: 0.14, delay: 0.05 });
  }

  guardHears() {
    this.tone({ frequency: 320, endFrequency: 380, seconds: 0.09, type: 'square', volume: 0.05 });
  }

  warning() {
    this.tone({ frequency: 660, seconds: 0.08, type: 'square', volume: 0.10 });
    this.tone({ frequency: 660, seconds: 0.08, type: 'square', volume: 0.10, delay: 0.12 });
  }

  alertSting() {
    this.tone({ frequency: 392, seconds: 0.16, type: 'sawtooth', volume: 0.20 });
    this.tone({ frequency: 587, seconds: 0.26, type: 'sawtooth', volume: 0.20, delay: 0.13 });
  }

  caughtThud() {
    this.tone({ frequency: 130, endFrequency: 48, seconds: 0.4, type: 'sine', volume: 0.34 });
    this.tone({ frequency: 233, seconds: 0.3, type: 'sawtooth', volume: 0.12, delay: 0.03 });
  }

  levelClear() {
    for (const [i, note] of [523, 659, 784, 1047].entries()) {
      this.tone({ frequency: note, seconds: 0.22, type: 'triangle', volume: 0.16, delay: i * 0.09 });
    }
  }

  gameClear() {
    for (const [i, note] of [523, 659, 784, 1047, 784, 1047, 1319].entries()) {
      this.tone({ frequency: note, seconds: 0.26, type: 'triangle', volume: 0.16, delay: i * 0.1 });
    }
  }
}
