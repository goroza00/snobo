export class Sfx {
  #enabled = true;
  #ctx = null;

  get enabled() { return this.#enabled; }

  setEnabled(v) {
    this.#enabled = !!v;
    if (this.#enabled) this.beep('sine', 520, 0.06, 0.04);
  }

  resumeIfNeeded() {
    if (!this.#enabled) return;
    if (!this.#ctx) {
      try { this.#ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch {}
    }
  }

  beep(type = 'sine', freq = 440, dur = 0.08, gain = 0.05) {
    if (!this.#enabled) return;
    try {
      if (!this.#ctx) this.#ctx = new (window.AudioContext || window.webkitAudioContext)();
      const t0 = this.#ctx.currentTime;
      const o = this.#ctx.createOscillator();
      const g = this.#ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t0);
      g.gain.setValueAtTime(gain, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g).connect(this.#ctx.destination);
      o.start(t0);
      o.stop(t0 + dur);
    } catch { /* ignore */ }
  }
}
