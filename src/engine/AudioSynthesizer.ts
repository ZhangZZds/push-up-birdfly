/**
 * Web Audio API procedural sound synthesizer.
 * Provides authentic 8-bit arcade and fitness sound effects without external audio files.
 */
export class AudioSynthesizer {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    // AudioContext will be lazily initialized on first user gesture
  }

  private initContext(): AudioContext | null {
    if (this.isMuted) return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (muted && this.ctx && this.ctx.state === 'running') {
      this.ctx.suspend().catch(() => {});
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Bird flap whoosh: quick descending sine glide
   */
  public playFlap(): void {
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const now = ctx.currentTime;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(260, now + 0.12);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.13);
    } catch {
      // Ignore audio errors on unmounted contexts
    }
  }

  /**
   * Pipe clearance score: high retro bell ping
   */
  public playScore(): void {
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(987.77, now); // B5
      osc.frequency.setValueAtTime(1318.51, now + 0.08); // E6

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.29);
    } catch {
      // Ignore
    }
  }

  /**
   * Depth reached pip: gentle confirmation ping
   */
  public playDepthPip(): void {
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now); // A5

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.08);
    } catch {
      // Ignore
    }
  }

  /**
   * Push-up repetition validated: triumphant ascending arpeggio chime (C5 -> E5 -> G5 -> C6)
   */
  public playRepSuccess(repCount: number): void {
    const ctx = this.initContext();
    if (!ctx) return;

    // Check for major milestone fanfare (every 5 reps)
    if (repCount > 0 && repCount % 5 === 0) {
      this.playMilestoneFanfare();
      return;
    }

    try {
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      const noteDuration = 0.06;

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = now + idx * noteDuration;

        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.14, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + noteDuration * 1.5);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + noteDuration * 1.5);
      });
    } catch {
      // Ignore
    }
  }

  /**
   * Milestone Fanfare for 5, 10, 20 reps!
   */
  public playMilestoneFanfare(): void {
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // High-energy fanfare chord progression
      const chords = [
        { freq: 587.33, start: 0.00, dur: 0.10 }, // D5
        { freq: 659.25, start: 0.10, dur: 0.10 }, // E5
        { freq: 783.99, start: 0.20, dur: 0.10 }, // G5
        { freq: 1046.5, start: 0.30, dur: 0.35 }, // C6
        { freq: 1318.5, start: 0.30, dur: 0.35 }, // E6 harmonic
      ];

      chords.forEach(({ freq, start, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const t = now + start;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.20, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(t);
        osc.stop(t + dur + 0.05);
      });
    } catch {
      // Ignore
    }
  }

  /**
   * Collision hit thud / crash sound
   */
  public playHit(): void {
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      
      // Low square hit
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.25);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.26);

      // Noise punch
      const bufferSize = ctx.sampleRate * 0.15;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.2, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      noise.connect(noiseGain);
      noiseGain.connect(ctx.destination);

      noise.start(now);
    } catch {
      // Ignore
    }
  }

  /**
   * Ready / countdown beep
   */
  public playReadyGo(isFinal: boolean = false): void {
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(isFinal ? 880 : 440, now);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (isFinal ? 0.3 : 0.12));

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + (isFinal ? 0.32 : 0.14));
    } catch {
      // Ignore
    }
  }
}
