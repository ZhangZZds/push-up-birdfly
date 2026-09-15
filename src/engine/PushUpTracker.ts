import {
  CALIB_DECAY_RATE,
  CALIB_HEADROOM_RATIO,
  EMA_ALPHA_MAX,
  EMA_ALPHA_MIN,
  EMA_VELOCITY_CUTOFF,
  MAX_REP_TIMEOUT_SEC,
  MIN_BOTTOM_DWELL_SEC,
  MIN_REP_TIME_SEC,
  SENSOR_DEADZONE,
  THRESH_BOT_ENTER,
  THRESH_BOT_EXIT,
  THRESH_TOP_ENTER,
  THRESH_TOP_EXIT,
} from './constants';
import { RepState, TrackingMetrics } from '../types/game';

export interface TrackerCallbacks {
  onRepComplete?: (repCount: number, duration: number) => void;
  onDepthReached?: () => void;
  onStateChange?: (state: RepState) => void;
}

export class PushUpTracker {
  // Calibration baseline (in raw landmark space [0, 1])
  // In camera coordinates: 0 is top of screen, 1 is bottom.
  // When user is in top plank: nose is higher -> rawY is smaller (e.g. 0.25).
  // When user is chest to floor: nose is lower -> rawY is larger (e.g. 0.75).
  private yMin: number = 0.28; // Dynamic top estimate
  private yMax: number = 0.72; // Dynamic bottom estimate
  private isCalibrated: boolean = false;
  private hasFirstSample: boolean = false;

  // Smoothing states
  private ySmooth: number = 0.15;
  private lastTime: number = 0;
  private currentVelocity: number = 0;

  // Rep counting FSM
  private state: RepState = 'TOP';
  private repCount: number = 0;
  private repStartTime: number = 0;
  private bottomEnterTime: number = 0;
  private depthTriggeredInCurrentRep: boolean = false;

  private callbacks: TrackerCallbacks;
  private sensitivity: number = 1.4; // Sensitivity multiplier (0.8x to 3.2x)

  constructor(callbacks: TrackerCallbacks = {}) {
    this.callbacks = callbacks;
  }

  public setCallbacks(callbacks: TrackerCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  public setSensitivity(s: number): void {
    this.sensitivity = Math.max(0.8, Math.min(s, 3.2));
  }

  public getSensitivity(): number {
    return this.sensitivity;
  }

  /**
   * Set manual calibration bounds from the calibration wizard
   */
  public setManualCalibration(topY: number, bottomY: number): void {
    const sortedMin = Math.min(topY, bottomY);
    const sortedMax = Math.max(topY, bottomY);
    const spread = sortedMax - sortedMin;
    if (spread > 0.08) {
      this.yMin = sortedMin;
      this.yMax = sortedMax;
      this.isCalibrated = true;
    }
  }

  /**
   * Reset rep counter and FSM state
   */
  public reset(resetRepCount: boolean = true): void {
    this.state = 'TOP';
    if (resetRepCount) {
      this.repCount = 0;
      this.hasFirstSample = false;
    }
    this.repStartTime = 0;
    this.bottomEnterTime = 0;
    this.depthTriggeredInCurrentRep = false;
    this.lastTime = 0;
    this.currentVelocity = 0;
  }

  /**
   * Main tracking update loop.
   * Consumes raw normalized landmark Y [0.0, 1.0] and returns smoothed metrics.
   */
  public processLandmark(rawY: number, nowMs: number): TrackingMetrics {
    // 0. Robustness guard against NaN, undefined, or non-finite coordinates
    if (typeof rawY !== 'number' || isNaN(rawY) || !isFinite(rawY)) {
      rawY = this.ySmooth;
    }
    rawY = Math.max(0.0, Math.min(1.0, rawY));

    if (this.lastTime === 0) {
      this.lastTime = nowMs;
      this.ySmooth = rawY;
    }

    const dt = Math.min(Math.max((nowMs - this.lastTime) / 1000, 0.001), 0.1);
    this.lastTime = nowMs;

    // 1. Initial Auto-Calibration Anchoring on First Detection
    if (!this.hasFirstSample && !this.isCalibrated) {
      this.hasFirstSample = true;
      // Frame around player's head starting altitude (top plank)
      this.yMin = Math.max(0.03, rawY - 0.05);
      this.yMax = Math.min(0.97, rawY + 0.18);
      this.ySmooth = 0.15;
    }

    // Dynamic Calibration Tracking with Leaky Asymmetric Decay
    if (rawY < this.yMin) {
      this.yMin = rawY;
    }
    if (rawY > this.yMax) {
      this.yMax = rawY;
    }

    // Leaky decay towards nominal center (0.50) to adapt to shifting camera distance
    this.yMin += CALIB_DECAY_RATE * dt * (0.50 - this.yMin);
    this.yMax -= CALIB_DECAY_RATE * dt * (this.yMax - 0.50);

    // 2. Headroom Normalized Mapping with Dynamic Sensitivity Scaling
    const range = Math.max(this.yMax - this.yMin, 0.08);
    const center = (this.yMin + this.yMax) * 0.5;
    const effectiveHalfRange = Math.max((range * 0.5) / Math.max(this.sensitivity, 0.1), 0.01);

    const yNorm = Math.min(
      Math.max((rawY - (center - effectiveHalfRange)) / (2 * effectiveHalfRange), 0.0),
      1.0
    );

    // 3. Adaptive Dual-Speed EMA Filter
    const diff = Math.abs(yNorm - this.ySmooth);
    if (diff > SENSOR_DEADZONE) {
      this.currentVelocity = diff / dt;
      // High velocity -> high alpha (responsive, low latency); Low velocity -> low alpha (tremor filtering)
      const alpha =
        EMA_ALPHA_MIN +
        (EMA_ALPHA_MAX - EMA_ALPHA_MIN) *
          (this.currentVelocity / (this.currentVelocity + EMA_VELOCITY_CUTOFF));
      this.ySmooth = alpha * yNorm + (1.0 - alpha) * this.ySmooth;
    } else {
      this.currentVelocity = 0;
    }

    // 4. Biomechanical Rep Counting State Machine
    this.updateFSM(this.ySmooth, nowMs);

    const isDepthReached = this.ySmooth >= THRESH_BOT_ENTER;

    return {
      rawY,
      normY: yNorm,
      smoothY: this.ySmooth,
      velocity: this.currentVelocity,
      state: this.state,
      repCount: this.repCount,
      calibMinY: this.yMin,
      calibMaxY: this.yMax,
      isDepthReached,
    };
  }

  private updateFSM(y: number, nowMs: number): void {
    const prevState = this.state;

    // Timeout guard: reset if stuck in active rep for too long
    if (
      this.state !== 'TOP' &&
      this.repStartTime > 0 &&
      (nowMs - this.repStartTime) / 1000 > MAX_REP_TIMEOUT_SEC
    ) {
      this.state = 'TOP';
      this.repStartTime = 0;
      this.depthTriggeredInCurrentRep = false;
      if (this.callbacks.onStateChange) this.callbacks.onStateChange(this.state);
      return;
    }

    switch (this.state) {
      case 'TOP':
        if (y > THRESH_TOP_EXIT) {
          this.state = 'DESCENDING';
          this.repStartTime = nowMs;
          this.depthTriggeredInCurrentRep = false;
        }
        break;

      case 'DESCENDING':
        if (y >= THRESH_BOT_ENTER) {
          this.state = 'BOTTOM';
          this.bottomEnterTime = nowMs;
          if (!this.depthTriggeredInCurrentRep) {
            this.depthTriggeredInCurrentRep = true;
            if (this.callbacks.onDepthReached) {
              this.callbacks.onDepthReached();
            }
          }
        } else if (y <= THRESH_TOP_ENTER) {
          // Aborted descent before hitting bottom
          this.state = 'TOP';
          this.repStartTime = 0;
        }
        break;

      case 'BOTTOM':
        // Require minimum dwell at bottom to filter out sensor bounce
        if (
          y < THRESH_BOT_EXIT &&
          (nowMs - this.bottomEnterTime) / 1000 >= MIN_BOTTOM_DWELL_SEC
        ) {
          this.state = 'ASCENDING';
        }
        break;

      case 'ASCENDING':
        if (y <= THRESH_TOP_ENTER) {
          const duration = (nowMs - this.repStartTime) / 1000;
          this.state = 'TOP';

          // Validate rep duration: must take at least 1.0s to disqualify head-bobs
          if (duration >= MIN_REP_TIME_SEC && duration <= MAX_REP_TIMEOUT_SEC) {
            this.repCount += 1;
            if (this.callbacks.onRepComplete) {
              this.callbacks.onRepComplete(this.repCount, duration);
            }
          }
          this.repStartTime = 0;
          this.depthTriggeredInCurrentRep = false;
        } else if (y >= THRESH_BOT_ENTER) {
          // Re-dropped without completing top lockout
          this.state = 'BOTTOM';
          this.bottomEnterTime = nowMs;
        }
        break;
    }

    if (this.state !== prevState && this.callbacks.onStateChange) {
      this.callbacks.onStateChange(this.state);
    }
  }

  public getRepCount(): number {
    return this.repCount;
  }

  public getState(): RepState {
    return this.state;
  }

  public getSmoothY(): number {
    return this.ySmooth;
  }
}
