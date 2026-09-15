import {
  BIRD_HEIGHT,
  BIRD_HITBOX_INSET_X,
  BIRD_HITBOX_INSET_Y,
  BIRD_WIDTH,
  GAP_Y_HIGH,
  GAP_Y_LOW,
  GAP_Y_MID,
  KCAL_PER_REP,
  PIPE_DISTANCE_PX,
  PIPE_GAP_RATIO,
  PIPE_HITBOX_FORGIVENESS,
  PIPE_LIP_HEIGHT,
  PIPE_LIP_OVERHANG,
  PIPE_WIDTH,
  REF_HEIGHT,
  REF_WIDTH,
  SCROLL_VELOCITY_PX_S,
} from './constants';
import { Bird, ControlMode, Difficulty, GameState, Particle, Pipe } from '../types/game';
import { AudioSynthesizer } from './AudioSynthesizer';
import { PushUpTracker } from './PushUpTracker';

export interface GameEngineOptions {
  canvas: HTMLCanvasElement;
  audio: AudioSynthesizer;
  tracker: PushUpTracker;
  onScoreUpdate?: (score: number, reps: number, calories: number) => void;
  onGameOver?: (score: number, reps: number, calories: number) => void;
  onRepCountPunch?: (reps: number) => void;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private audio: AudioSynthesizer;
  private tracker: PushUpTracker;

  // Game loop
  private animId: number | null = null;
  private lastTimestamp: number = 0;
  private state: GameState = 'IDLE';
  private controlMode: ControlMode = 'MOUSE';
  private difficulty: Difficulty = 'EASY';

  // Game state
  private bird: Bird;
  private pipes: Pipe[] = [];
  private particles: Particle[] = [];
  private nextPipeId: number = 1;
  private score: number = 0;
  private reps: number = 0;
  private calories: number = 0;
  private pipePatternIndex: number = 0;

  // Camera video element for background rendering
  private videoElement: HTMLVideoElement | null = null;
  private cameraOpacity: number = 0.85;
  private verticalOffset: number = 0;
  private detectedLandmark: { rawY: number; rawX: number; timestamp: number } | null = null;

  // Callbacks
  private onScoreUpdate?: (score: number, reps: number, calories: number) => void;
  private onGameOver?: (score: number, reps: number, calories: number) => void;
  private onRepCountPunch?: (reps: number) => void;

  constructor(options: GameEngineOptions) {
    this.canvas = options.canvas;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D context from canvas');
    this.ctx = ctx;

    this.audio = options.audio;
    this.tracker = options.tracker;
    this.onScoreUpdate = options.onScoreUpdate;
    this.onGameOver = options.onGameOver;
    this.onRepCountPunch = options.onRepCountPunch;

    this.bird = {
      x: 100,
      y: REF_HEIGHT * 0.25,
      targetY: REF_HEIGHT * 0.25,
      prevY: REF_HEIGHT * 0.25,
      tilt: 0,
      width: BIRD_WIDTH,
      height: BIRD_HEIGHT,
      wingPhase: 0,
    };

    // Attach tracker rep listener
    this.tracker.setCallbacks({
      onRepComplete: (repCount) => {
        this.reps = repCount;
        this.calories = Number((this.reps * KCAL_PER_REP).toFixed(1));
        this.audio.playRepSuccess(this.reps);
        this.spawnRepBurst(this.bird.x + 20, this.bird.y);
        if (this.onRepCountPunch) this.onRepCountPunch(this.reps);
        if (this.onScoreUpdate) this.onScoreUpdate(this.score, this.reps, this.calories);
      },
      onDepthReached: () => {
        this.audio.playDepthPip();
      },
    });
  }

  public setVideoElement(video: HTMLVideoElement | null): void {
    this.videoElement = video;
  }

  public setCameraOpacity(opacity: number): void {
    this.cameraOpacity = Math.max(0, Math.min(1, opacity));
  }

  public setControlMode(mode: ControlMode): void {
    this.controlMode = mode;
  }

  public setVerticalOffset(offset: number): void {
    this.verticalOffset = Math.max(-0.35, Math.min(0.35, offset));
  }

  public getVerticalOffset(): number {
    return this.verticalOffset;
  }

  public setDifficulty(diff: Difficulty): void {
    this.difficulty = diff;
  }

  public getDifficulty(): Difficulty {
    return this.difficulty;
  }

  public getUpcomingPipe(): Pipe | undefined {
    return this.pipes.find((p) => p.x + PIPE_WIDTH >= this.bird.x - 20);
  }

  public getBird(): Bird {
    return this.bird;
  }

  public getState(): GameState {
    return this.state;
  }

  public start(): void {
    this.state = 'PLAYING';
    this.score = 0;
    this.reps = this.tracker.getRepCount();
    this.calories = Number((this.reps * KCAL_PER_REP).toFixed(1));
    this.pipes = [];
    this.particles = [];
    this.pipePatternIndex = 0;
    this.nextPipeId = 1;

    this.bird.y = REF_HEIGHT * 0.25;
    this.bird.targetY = REF_HEIGHT * 0.25;
    this.bird.prevY = REF_HEIGHT * 0.25;
    this.bird.tilt = 0;

    // Spawn first pipe at generous warmup distance (gives player time to get in plank position)
    const warmupOffset =
      this.difficulty === 'EASY' ? 280 : this.difficulty === 'NORMAL' ? 180 : 100;
    this.spawnPipe(REF_WIDTH + warmupOffset);

    if (this.onScoreUpdate) {
      this.onScoreUpdate(this.score, this.reps, this.calories);
    }

    this.lastTimestamp = performance.now();
    if (!this.animId) {
      this.animId = requestAnimationFrame(this.gameLoop);
    }
  }

  public restart(): void {
    this.tracker.reset(false);
    this.start();
  }

  public pause(): void {
    if (this.state === 'PLAYING') {
      this.state = 'PAUSED';
    }
  }

  public resume(): void {
    if (this.state === 'PAUSED') {
      this.state = 'PLAYING';
      this.lastTimestamp = 0; // Reset timestamp to prevent large dt jump upon unpausing
    }
  }

  public stop(): void {
    if (this.animId !== null) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
  }

  /**
   * Feed tracking input (smoothY in [0, 1]) from mouse, camera, or bot
   */
  public updateBirdTargetNormalized(smoothY: number): void {
    if (typeof smoothY !== 'number' || isNaN(smoothY) || !isFinite(smoothY)) {
      return;
    }
    // Map normalized [0, 1] to playable canvas height with user vertical offset [-0.35, 0.35]
    const effectiveY = Math.max(0, Math.min(1, smoothY + this.verticalOffset));
    const minY = 56;
    const maxY = REF_HEIGHT - 80;
    this.bird.targetY = minY + effectiveY * (maxY - minY);
  }

  /**
   * Set raw landmark position from vision pipeline for HUD reticle rendering
   */
  public setDetectedLandmark(rawY: number, rawX: number): void {
    if (typeof rawY !== 'number' || isNaN(rawY) || typeof rawX !== 'number' || isNaN(rawX)) {
      return;
    }
    this.detectedLandmark = { rawY, rawX, timestamp: performance.now() };
  }

  /**
   * Main 60 FPS Game Loop
   */
  private gameLoop = (timestamp: number): void => {
    if (this.lastTimestamp === 0) {
      this.lastTimestamp = timestamp;
    }
    const dt = Math.min((timestamp - this.lastTimestamp) / 1000, 0.05); // Cap to 50ms to prevent huge jumps
    this.lastTimestamp = timestamp;

    if (this.state === 'PLAYING') {
      this.update(dt);
    }

    this.render();

    this.animId = requestAnimationFrame(this.gameLoop);
  };

  /**
   * Physics, Scrolling, and Collisions Update
   */
  private update(dt: number): void {
    // 1. Update Bird Position: Instantaneous physical 1:1 follow with soft screen bounds clamping
    this.bird.prevY = this.bird.y;
    const minClampedY = 16;
    const maxClampedY = REF_HEIGHT - BIRD_HEIGHT - 16;
    this.bird.y = Math.max(minClampedY, Math.min(maxClampedY, this.bird.targetY));

    // Calculate vertical velocity for dynamic tilt angle
    const vy = (this.bird.y - this.bird.prevY) / dt;
    // Map velocity to tilt: rising (-vy) -> tilt up (-20 deg); falling (+vy) -> tilt down (+20 deg)
    const targetTilt = Math.max(Math.min(vy * 0.0018, 0.35), -0.35);
    this.bird.tilt += (targetTilt - this.bird.tilt) * (1 - Math.exp(-15 * dt));

    // Wing flapping animation (faster when moving)
    const flapSpeed = 12 + Math.abs(vy) * 0.02;
    this.bird.wingPhase = (this.bird.wingPhase + flapSpeed * dt) % (Math.PI * 2);

    // Occasional wing flap sound effect when rising rapidly
    if (vy < -350 && Math.random() < 0.15) {
      this.audio.playFlap();
    }

    // Feather particle trail behind the bird
    if (Math.random() < 0.3) {
      this.particles.push({
        x: this.bird.x - 6,
        y: this.bird.y + (Math.random() * 10 - 5),
        vx: -(SCROLL_VELOCITY_PX_S * 0.6) + (Math.random() * 20 - 10),
        vy: (Math.random() * 40 - 20),
        color: Math.random() > 0.5 ? '#FBBF24' : '#F97316',
        size: Math.random() * 3 + 2,
        alpha: 0.7,
        life: 0,
        maxLife: 0.45,
      });
    }

    // 2. Scroll and Manage Pipes based on Difficulty Speed
    const scrollSpeed =
      this.difficulty === 'EASY' ? 75 : this.difficulty === 'NORMAL' ? 105 : 135;
    const pipeDistance =
      this.difficulty === 'EASY' ? 390 : this.difficulty === 'NORMAL' ? 360 : 330;
    const scrollDist = scrollSpeed * dt;

    for (let i = this.pipes.length - 1; i >= 0; i--) {
      const pipe = this.pipes[i];
      pipe.x -= scrollDist;

      // Score check: when pipe passes bird's X coordinate
      if (!pipe.passed && pipe.x + PIPE_WIDTH < this.bird.x) {
        pipe.passed = true;
        this.score += 1;
        this.audio.playScore();
        if (this.onScoreUpdate) {
          this.onScoreUpdate(this.score, this.reps, this.calories);
        }
      }

      // Despawn pipes that move offscreen
      if (pipe.x + PIPE_WIDTH < -50) {
        this.pipes.splice(i, 1);
      }
    }

    // Spawn new pipes if needed
    const lastPipe = this.pipes[this.pipes.length - 1];
    if (!lastPipe || lastPipe.x <= REF_WIDTH - pipeDistance) {
      this.spawnPipe(REF_WIDTH + 40);
    }

    // 3. Collision Detection (with Fair Play Inset Hitboxes)
    if (this.checkCollisions()) {
      this.triggerGameOver();
      return;
    }

    // 4. Update Particle System
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha = 1 - p.life / p.maxLife;
    }
  }

  /**
   * Spawn a new pipe following the structured Push-Up Choreography
   */
  private spawnPipe(x: number): void {
    const gapRatio =
      this.difficulty === 'EASY' ? 0.42 : this.difficulty === 'NORMAL' ? 0.35 : 0.28;
    const gapHeight = REF_HEIGHT * gapRatio;
    
    // Biomechanical choreography sequence:
    // Alternate HIGH (0.22) -> LOW (0.78) -> HIGH (0.22) -> MID (0.50)
    const pattern = [GAP_Y_HIGH, GAP_Y_LOW, GAP_Y_HIGH, GAP_Y_MID];
    const gapCenterYRatio = pattern[this.pipePatternIndex % pattern.length];
    this.pipePatternIndex++;

    const gapCenterY = gapCenterYRatio * REF_HEIGHT;
    const topHeight = gapCenterY - gapHeight / 2;
    const bottomY = gapCenterY + gapHeight / 2;

    let type: 'HIGH' | 'MID' | 'LOW' = 'MID';
    if (gapCenterYRatio < 0.35) type = 'HIGH';
    else if (gapCenterYRatio > 0.65) type = 'LOW';

    this.pipes.push({
      id: this.nextPipeId++,
      x,
      topHeight,
      bottomY,
      gapHeight,
      gapCenterY: gapCenterYRatio,
      passed: false,
      type,
    });
  }

  /**
   * Collision Detection using dual-tier insets from Section 2.5
   */
  private checkCollisions(): boolean {
    const birdBox = {
      x: this.bird.x + BIRD_HITBOX_INSET_X,
      y: this.bird.y + BIRD_HITBOX_INSET_Y,
      w: BIRD_WIDTH - BIRD_HITBOX_INSET_X * 2,
      h: BIRD_HEIGHT - BIRD_HITBOX_INSET_Y * 2,
    };

    for (const pipe of this.pipes) {
      // Horizontal overlap check
      if (
        birdBox.x + birdBox.w > pipe.x &&
        birdBox.x < pipe.x + PIPE_WIDTH
      ) {
        // Top pipe collision (with forgiveness inset)
        if (birdBox.y < pipe.topHeight - PIPE_HITBOX_FORGIVENESS) {
          return true;
        }
        // Bottom pipe collision (with forgiveness inset)
        if (birdBox.y + birdBox.h > pipe.bottomY + PIPE_HITBOX_FORGIVENESS) {
          return true;
        }
      }
    }

    return false;
  }

  private triggerGameOver(): void {
    if (this.state === 'GAMEOVER') return;
    this.state = 'GAMEOVER';
    this.audio.playHit();
    this.spawnCrashBurst(this.bird.x + BIRD_WIDTH / 2, this.bird.y + BIRD_HEIGHT / 2);

    if (this.onGameOver) {
      this.onGameOver(this.score, this.reps, this.calories);
    }
  }

  private spawnRepBurst(x: number, y: number): void {
    for (let i = 0; i < 24; i++) {
      const angle = (Math.PI * 2 * i) / 24 + Math.random() * 0.2;
      const speed = 120 + Math.random() * 160;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: i % 2 === 0 ? '#10B981' : '#34D399',
        size: Math.random() * 4 + 3,
        alpha: 1,
        life: 0,
        maxLife: 0.6,
      });
    }
  }

  private spawnCrashBurst(x: number, y: number): void {
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 200;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: ['#EF4444', '#F97316', '#F59E0B', '#FFFFFF'][Math.floor(Math.random() * 4)],
        size: Math.random() * 5 + 2,
        alpha: 1,
        life: 0,
        maxLife: 0.8,
      });
    }
  }

  /**
   * Rendering Engine: Metallic Copper Cylinders, Flappy Bird, Camera Feed, Overlays
   */
  public render(): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);

    // 1. Render Camera Video Stream Overlay in Background
    if (this.videoElement && this.videoElement.readyState >= 2) {
      ctx.save();
      ctx.globalAlpha = this.cameraOpacity;

      // Mirror video horizontally so player sees self naturally (selfie mirror mode)
      ctx.translate(w, 0);
      ctx.scale(-1, 1);

      // Aspect-fill video into canvas
      const vw = this.videoElement.videoWidth || 640;
      const vh = this.videoElement.videoHeight || 480;
      const vAspect = vw / vh;
      const cAspect = w / h;

      let drawW = w;
      let drawH = h;
      let offX = 0;
      let offY = 0;

      if (vAspect > cAspect) {
        drawH = h;
        drawW = h * vAspect;
        offX = (drawW - w) / 2;
      } else {
        drawW = w;
        drawH = w / vAspect;
        offY = (drawH - h) / 2;
      }

      ctx.drawImage(this.videoElement, -offX, -offY, drawW, drawH);
      ctx.restore();

      // Subtle dark vignette to increase pipe & bird visual contrast
      const grad = ctx.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.85);
      grad.addColorStop(0, 'rgba(10, 10, 14, 0.2)');
      grad.addColorStop(1, 'rgba(10, 10, 14, 0.65)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Real-time Nose Tracking Reticle HUD
      if (this.controlMode === 'CAMERA' && this.detectedLandmark && performance.now() - this.detectedLandmark.timestamp < 500) {
        const noseX = (1 - this.detectedLandmark.rawX) * w;
        const noseY = this.detectedLandmark.rawY * h;

        ctx.save();
        const pulse = Math.sin(performance.now() * 0.008) * 2;

        ctx.strokeStyle = '#10B981';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#10B981';
        ctx.shadowBlur = 6;

        // Outer targeting ring
        ctx.beginPath();
        ctx.arc(noseX, noseY, 14 + pulse, 0, Math.PI * 2);
        ctx.stroke();

        // 4 crosshair ticks
        const r1 = 8 + pulse;
        const r2 = 18 + pulse;
        ctx.beginPath();
        ctx.moveTo(noseX - r2, noseY); ctx.lineTo(noseX - r1, noseY);
        ctx.moveTo(noseX + r1, noseY); ctx.lineTo(noseX + r2, noseY);
        ctx.moveTo(noseX, noseY - r2); ctx.lineTo(noseX, noseY - r1);
        ctx.moveTo(noseX, noseY + r1); ctx.lineTo(noseX, noseY + r2);
        ctx.stroke();

        // Center dot
        ctx.fillStyle = '#34D399';
        ctx.beginPath();
        ctx.arc(noseX, noseY, 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Targeting badge
        ctx.shadowBlur = 0;
        ctx.font = 'bold 11px system-ui, sans-serif';
        ctx.fillStyle = '#10B981';
        ctx.textAlign = 'center';
        ctx.fillText('👃 鼻子已锁定', noseX, noseY - 20);

        ctx.restore();
      }
    } else {
      // Fallback stylized gym arcade background
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#1c1917');
      grad.addColorStop(0.5, '#292524');
      grad.addColorStop(1, '#0c0a09');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }

    // 2. Render Metallic Copper 3D Pipes (Matching WeChat Screenshot)
    for (const pipe of this.pipes) {
      this.renderMetallicPipe(ctx, pipe);
    }

    // 3. Render Particles
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 4. Render Flappy Bird
    this.renderBird(ctx);

    // 5. Render Title Arcade Badge: "Push day killer 💀"
    this.renderTitleBadge(ctx);

    // 6. Render Paused State Badge if game is paused
    if (this.state === 'PAUSED') {
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.fillRect(0, 0, w, h);

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.fillStyle = '#F59E0B';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 10;
      ctx.fillText('⏸️ 游戏已暂停', w / 2, h / 2);
      ctx.restore();
    }
  }

  /**
   * Render Metallic 3D Copper Cylindrical Pipe with Shiny Specular Highlights
   */
  private renderMetallicPipe(ctx: CanvasRenderingContext2D, pipe: Pipe): void {
    const x = pipe.x;
    const pw = PIPE_WIDTH;
    const lipH = PIPE_LIP_HEIGHT;
    const lipOverhang = PIPE_LIP_OVERHANG;

    // Helper: Generate metallic copper cylindrical gradient
    const createCopperGradient = (left: number, width: number) => {
      const g = ctx.createLinearGradient(left, 0, left + width, 0);
      g.addColorStop(0.0, '#602B13');   // Deep shadow edge
      g.addColorStop(0.12, '#8A4222');  // Mid-dark copper
      g.addColorStop(0.35, '#E59567');  // Specular sheen
      g.addColorStop(0.48, '#F8CEB4');  // Brightest highlight reflection
      g.addColorStop(0.65, '#B86B42');  // Warm copper
      g.addColorStop(0.88, '#8A4222');  // Shadow transition
      g.addColorStop(1.0, '#4E210D');   // Dark far edge
      return g;
    };

    // ---- TOP PIPE ----
    const topBodyHeight = Math.max(0, pipe.topHeight - lipH);

    // Top Pipe Body
    if (topBodyHeight > 0) {
      ctx.fillStyle = createCopperGradient(x, pw);
      ctx.fillRect(x, 0, pw, topBodyHeight);

      // Subtle vertical stroke border
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, topBodyHeight);
      ctx.moveTo(x + pw, 0);
      ctx.lineTo(x + pw, topBodyHeight);
      ctx.stroke();
    }

    // Top Pipe Cap (Lip)
    const topLipX = x - lipOverhang;
    const topLipY = topBodyHeight;
    const topLipW = pw + lipOverhang * 2;

    ctx.fillStyle = createCopperGradient(topLipX, topLipW);
    ctx.fillRect(topLipX, topLipY, topLipW, lipH);

    // Top Lip Bevel Rims
    ctx.strokeStyle = 'rgba(255, 220, 200, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(topLipX, topLipY);
    ctx.lineTo(topLipX + topLipW, topLipY);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(30, 10, 5, 0.8)';
    ctx.beginPath();
    ctx.moveTo(topLipX, topLipY + lipH);
    ctx.lineTo(topLipX + topLipW, topLipY + lipH);
    ctx.stroke();

    // Top Lip Outline
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.strokeRect(topLipX, topLipY, topLipW, lipH);

    // ---- BOTTOM PIPE ----
    // Bottom Pipe Cap (Lip)
    const botLipX = x - lipOverhang;
    const botLipY = pipe.bottomY;
    const botLipW = pw + lipOverhang * 2;

    ctx.fillStyle = createCopperGradient(botLipX, botLipW);
    ctx.fillRect(botLipX, botLipY, botLipW, lipH);

    // Bottom Lip Bevel Rims
    ctx.strokeStyle = 'rgba(255, 220, 200, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(botLipX, botLipY);
    ctx.lineTo(botLipX + botLipW, botLipY);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(30, 10, 5, 0.8)';
    ctx.beginPath();
    ctx.moveTo(botLipX, botLipY + lipH);
    ctx.lineTo(botLipX + botLipW, botLipY + lipH);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.strokeRect(botLipX, botLipY, botLipW, lipH);

    // Bottom Pipe Body
    const botBodyY = pipe.bottomY + lipH;
    const botBodyH = Math.max(0, REF_HEIGHT - botBodyY);

    if (botBodyH > 0) {
      ctx.fillStyle = createCopperGradient(x, pw);
      ctx.fillRect(x, botBodyY, pw, botBodyH);

      // Subtle vertical borders
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x, botBodyY);
      ctx.lineTo(x, REF_HEIGHT);
      ctx.moveTo(x + pw, botBodyY);
      ctx.lineTo(x + pw, REF_HEIGHT);
      ctx.stroke();
    }
  }

  /**
   * Render Classic Flappy Bird with dynamic tilt angle and wing flapping
   */
  private renderBird(ctx: CanvasRenderingContext2D): void {
    const { x, y, width, height, tilt, wingPhase } = this.bird;

    ctx.save();
    ctx.translate(x + width / 2, y + height / 2);
    ctx.rotate(tilt);

    // 1. Bird Body (Plump Orange Oval)
    ctx.fillStyle = '#EA580C';
    ctx.strokeStyle = '#9A3412';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, width * 0.45, height * 0.46, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 2. Belly (Pale Yellow Patch)
    ctx.fillStyle = '#FEF3C7';
    ctx.beginPath();
    ctx.ellipse(-width * 0.08, height * 0.12, width * 0.24, height * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();

    // 3. Eye (Big Cartoon White Eyeball + Pupil)
    const eyeX = width * 0.18;
    const eyeY = -height * 0.16;
    const eyeR = height * 0.24;

    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#18181B';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(eyeX, eyeY, eyeR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Pupil looking forward
    ctx.fillStyle = '#18181B';
    ctx.beginPath();
    ctx.arc(eyeX + 3, eyeY, eyeR * 0.45, 0, Math.PI * 2);
    ctx.fill();

    // Catchlight in pupil
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(eyeX + 4.5, eyeY - 2, eyeR * 0.18, 0, Math.PI * 2);
    ctx.fill();

    // 4. Beak (Upper & Lower Orange Beak)
    const beakStartX = width * 0.32;
    const beakY = height * 0.02;

    // Upper beak
    ctx.fillStyle = '#F59E0B';
    ctx.strokeStyle = '#B45309';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(beakStartX, beakY - 4);
    ctx.lineTo(beakStartX + 16, beakY + 2);
    ctx.lineTo(beakStartX, beakY + 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Lower beak
    ctx.fillStyle = '#D97706';
    ctx.beginPath();
    ctx.moveTo(beakStartX, beakY + 4);
    ctx.lineTo(beakStartX + 12, beakY + 7);
    ctx.lineTo(beakStartX, beakY + 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 5. Flapping Wing
    const wingYOffset = Math.sin(wingPhase) * 5;
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#EA580C';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(-width * 0.18, height * 0.02 + wingYOffset, width * 0.22, height * 0.18, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Title Arcade Badge matching WeChat screenshot: "Push day killer 💀"
   */
  private renderTitleBadge(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const text = 'Push day killer 💀';
    const textY = 32;

    ctx.font = 'bold 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

    // Black text shadow/glow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(text, REF_WIDTH / 2, textY);

    ctx.restore();
  }
}
