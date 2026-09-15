export type GameState = 'IDLE' | 'CALIBRATING' | 'PLAYING' | 'GAMEOVER' | 'PAUSED';

export type ControlMode = 'CAMERA' | 'MOUSE' | 'BOT';

export type Difficulty = 'EASY' | 'NORMAL' | 'HARD';

export type RepState = 'TOP' | 'DESCENDING' | 'BOTTOM' | 'ASCENDING';

export interface Pipe {
  id: number;
  x: number;
  topHeight: number;       // Bottom of top pipe (pixels)
  bottomY: number;         // Top of bottom pipe (pixels)
  gapHeight: number;       // Clearance gap height (pixels)
  gapCenterY: number;      // Center Y of the gap in normalized units [0, 1]
  passed: boolean;
  type: 'HIGH' | 'MID' | 'LOW';
}

export interface Bird {
  x: number;               // Horizontal position (fixed line)
  y: number;               // Vertical position (pixels)
  targetY: number;         // Target position from tracking (pixels)
  prevY: number;           // Previous Y for tilt calculation
  tilt: number;            // Rotation in radians (-20deg to +20deg)
  width: number;
  height: number;
  wingPhase: number;       // Wing animation cycle [0, 2PI]
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface TrackingMetrics {
  rawY: number;            // [0, 1] normalized raw landmark Y
  normY: number;           // [0, 1] auto-calibrated normalized Y
  smoothY: number;         // [0, 1] filtered Y driving the bird
  velocity: number;        // Instantaneous vertical velocity (units/sec)
  state: RepState;         // Biomechanical FSM state
  repCount: number;        // Validated full push-up count
  calibMinY: number;       // Dynamic top lockout baseline
  calibMaxY: number;       // Dynamic bottom chest baseline
  isDepthReached: boolean; // True when chest hits bottom depth
}

export interface CalibrationStep {
  step: 'TOP' | 'BOTTOM' | 'DONE';
  message: string;
  countdown: number;
}

export interface WorkoutRecord {
  id: string;
  timestamp: number;
  date: string;
  reps: number;
  score: number;
  calories: number;
  difficulty: Difficulty;
  mode: ControlMode;
}
