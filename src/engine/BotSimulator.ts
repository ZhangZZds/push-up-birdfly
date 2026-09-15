import { DEFAULT_REP_PERIOD_SEC } from './constants';
import { Pipe } from '../types/game';

/**
 * Intelligent AI Autopilot & Bot Simulator.
 * Intelligently targets approaching pipe gaps for safe clearance,
 * and performs authentic push-up cycles between obstacles to demonstrate mechanics.
 */
export class BotSimulator {
  private startTime: number = 0;
  private period: number = DEFAULT_REP_PERIOD_SEC; // 2.60s per repetition
  private amplitude: number = 0.42;
  private midOffset: number = 0.50;
  private currentY: number = 0.20;

  constructor(period: number = DEFAULT_REP_PERIOD_SEC) {
    this.period = period;
  }

  public setCadence(periodSeconds: number): void {
    this.period = Math.max(periodSeconds, 1.2);
  }

  public reset(nowMs: number): void {
    this.startTime = nowMs;
    this.currentY = 0.20;
  }

  /**
   * Sample the AI simulated Y coordinate.
   * If a pipe is approaching, smoothly steers towards pipe.gapCenterY to pass cleanly.
   * Between pipes, cycles from top lockout to bottom chest to demonstrate rep counting.
   */
  public sample(nowMs: number, upcomingPipe?: Pipe, birdX: number = 100): number {
    if (this.startTime === 0) {
      this.startTime = nowMs;
    }

    // 1. If an obstacle pipe is approaching within alert horizon
    if (upcomingPipe && upcomingPipe.x - birdX < 260 && upcomingPipe.x + 80 >= birdX - 10) {
      // Intelligently target the safe center of the gap
      const targetGapY = upcomingPipe.gapCenterY;
      const dx = upcomingPipe.x - birdX;
      // Interpolate smoothly as bird approaches the obstacle
      const urgency = Math.max(0, Math.min(1, (260 - dx) / 180));
      const steerSpeed = 0.12 + 0.28 * urgency;
      
      this.currentY += (targetGapY - this.currentY) * steerSpeed;
      return Math.min(Math.max(this.currentY, 0.05), 0.95);
    }

    // 2. Between pipes: perform authentic push-up demonstration cycle
    const elapsed = (nowMs - this.startTime) / 1000;
    const phase = (2 * Math.PI / this.period) * elapsed - Math.PI / 2;
    const targetSineY = this.midOffset + this.amplitude * Math.sin(phase);

    this.currentY += (targetSineY - this.currentY) * 0.14;
    return Math.min(Math.max(this.currentY, 0.05), 0.95);
  }
}
