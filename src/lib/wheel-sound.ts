/**
 * Звуки колеса опитування: MP3 під час обертання (стандартний або свій),
 * клацання на межах секторів і фанфари для переможця (Web Audio API).
 * Якщо MP3 не вдалося відтворити — грає синтезований «тривожний» мотив.
 */
export const DEFAULT_SPIN_SOUND = "sounds/wheel-spin.mp3";

export class WheelSound {
  muted = false;
  private ctx: AudioContext | null = null;
  private audio: HTMLAudioElement;
  private customUrl: string | null = null;
  private synthTimer: number | null = null;
  private spinning = false;

  constructor() {
    this.audio = new Audio(DEFAULT_SPIN_SOUND);
    this.audio.preload = "auto";
  }

  private getCtx() {
    try {
      if (!this.ctx) {
        const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new Ctor();
      }
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return this.ctx;
    } catch {
      return null;
    }
  }

  /** Свій MP3 на цей сеанс (файл не завантажується на сервер). */
  setCustomFile(file: File) {
    if (this.customUrl) URL.revokeObjectURL(this.customUrl);
    this.customUrl = URL.createObjectURL(file);
    this.audio.src = this.customUrl;
  }

  resetToDefault() {
    if (this.customUrl) URL.revokeObjectURL(this.customUrl);
    this.customUrl = null;
    this.audio.src = DEFAULT_SPIN_SOUND;
  }

  startSpin() {
    this.spinning = true;
    if (this.muted) return;
    this.getCtx(); // розблоковуємо аудіо в момент натискання
    try {
      this.audio.currentTime = 0;
    } catch {
      /* ще не завантажено */
    }
    this.audio.play().catch(() => this.startSynth());
  }

  stopSpin() {
    this.spinning = false;
    this.audio.pause();
    try {
      this.audio.currentTime = 0;
    } catch {
      /* ignore */
    }
    if (this.synthTimer) window.clearTimeout(this.synthTimer);
    this.synthTimer = null;
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (m) {
      this.audio.pause();
      if (this.synthTimer) window.clearTimeout(this.synthTimer);
      this.synthTimer = null;
    } else if (this.spinning) {
      this.audio.play().catch(() => this.startSynth());
    }
  }

  private startSynth() {
    const ctx = this.getCtx();
    if (!ctx || this.muted) return;
    let step = 0;
    let tempo = 700;
    const playNote = () => {
      if (!this.spinning || this.muted) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(step % 2 === 0 ? 41.2 : 43.65, ctx.currentTime);
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(250, ctx.currentTime);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (tempo / 1000) * 0.85);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + (tempo / 1000) * 0.85);
      step++;
      tempo = Math.max(110, tempo * 0.92);
      this.synthTimer = window.setTimeout(playNote, tempo);
    };
    playNote();
  }

  tick() {
    if (this.muted) return;
    const ctx = this.getCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(350, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.03);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.03);
  }

  fanfare() {
    if (this.muted) return;
    const ctx = this.getCtx();
    if (!ctx) return;
    [261.63, 329.63, 392.0, 523.25, 659.25, 783.99].forEach((freq, i) => {
      const t = ctx.currentTime + i * 0.07;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.4);
    });
  }

  dispose() {
    this.stopSpin();
    if (this.customUrl) URL.revokeObjectURL(this.customUrl);
    void this.ctx?.close().catch(() => {});
  }
}
