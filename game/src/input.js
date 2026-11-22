// Night Vault — keyboard and mouse state, read once per frame by main.
// WASD and the arrow keys move, SHIFT sneaks, F or a click tosses a coin
// toward the pointer, P or ESC pauses, M mutes, ENTER confirms screens.

export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.mouseX = 0;
    this.mouseY = 0;
    this.coinTossQueued = false;
    this.confirmQueued = false;
    this.pauseQueued = false;
    this.muteQueued = false;

    window.addEventListener('keydown', (event) => {
      const key = event.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) event.preventDefault();
      if (!event.repeat) {
        if (key === 'f') this.coinTossQueued = true;
        if (key === 'enter' || key === ' ') this.confirmQueued = true;
        if (key === 'p' || key === 'escape') this.pauseQueued = true;
        if (key === 'm') this.muteQueued = true;
      }
      this.keys.add(key);
    });
    window.addEventListener('keyup', (event) => {
      this.keys.delete(event.key.toLowerCase());
    });
    window.addEventListener('blur', () => this.keys.clear());

    const trackMouse = (event) => {
      const rect = canvas.getBoundingClientRect();
      this.mouseX = (event.clientX - rect.left) * (canvas.width / rect.width);
      this.mouseY = (event.clientY - rect.top) * (canvas.height / rect.height);
    };
    canvas.addEventListener('mousemove', trackMouse);
    canvas.addEventListener('mousedown', (event) => {
      trackMouse(event);
      this.coinTossQueued = true;
      this.confirmQueued = true;
    });
  }

  /** The movement vector from the held keys, each axis -1, 0 or 1. */
  moveVector() {
    const held = (name) => this.keys.has(name);
    const x = (held('d') || held('arrowright') ? 1 : 0) - (held('a') || held('arrowleft') ? 1 : 0);
    const y = (held('s') || held('arrowdown') ? 1 : 0) - (held('w') || held('arrowup') ? 1 : 0);
    return [x, y];
  }

  get sneaking() {
    return this.keys.has('shift');
  }

  /** One-shot reads: each returns true once per press, then clears itself. */
  takeCoinToss() {
    const was = this.coinTossQueued;
    this.coinTossQueued = false;
    return was;
  }

  takeConfirm() {
    const was = this.confirmQueued;
    this.confirmQueued = false;
    return was;
  }

  takePause() {
    const was = this.pauseQueued;
    this.pauseQueued = false;
    return was;
  }

  takeMute() {
    const was = this.muteQueued;
    this.muteQueued = false;
    return was;
  }
}
