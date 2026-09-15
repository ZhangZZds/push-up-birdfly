/**
 * Master Numerical Specification Constants
 * Directly from game_design_spec.md Section 6
 */

// Biomechanics & Kinematics
export const NOMINAL_STROKE_CM = 40.0;
export const DEFAULT_REP_PERIOD_SEC = 2.60;
export const ECCENTRIC_DURATION_SEC = 1.20;
export const BOTTOM_DWELL_SEC = 0.20;
export const CONCENTRIC_DURATION_SEC = 1.00;
export const MIN_REP_TIME_SEC = 1.00;
export const MAX_REP_TIMEOUT_SEC = 8.00;
export const MIN_BOTTOM_DWELL_SEC = 0.10;

// Game World & Canvas Dimensions
export const REF_WIDTH = 450;
export const REF_HEIGHT = 800;
export const BIRD_WIDTH = 48;
export const BIRD_HEIGHT = 34;
export const BIRD_HITBOX_INSET_X = 8;
export const BIRD_HITBOX_INSET_Y = 6;

export const PIPE_WIDTH = 70;
export const PIPE_LIP_HEIGHT = 24;
export const PIPE_LIP_OVERHANG = 4;
export const PIPE_HITBOX_FORGIVENESS = 8;

// Game Pacing
export const SCROLL_VELOCITY_PX_S = 125.0;     // Horizontal scroll speed in px/s
export const PIPE_DISTANCE_PX = 360.0;         // Spacing between consecutive pipes
export const PIPE_INTERVAL_SEC = 3.00;         // Time for a pipe to traverse bird line

// Dynamic Clearance Gaps
export const PIPE_GAP_RATIO = 0.35;            // 35% of H (standard gap = 280px)
export const PIPE_GAP_HARD_RATIO = 0.28;       // 28% of H (hardcore gap = 224px)
export const PIPE_GAP_FATIGUE_RATIO = 0.40;    // 40% of H (fatigue relief = 320px)

// Vertical Pipe Gaps
export const GAP_Y_HIGH = 0.22;
export const GAP_Y_MID = 0.50;
export const GAP_Y_LOW = 0.78;

// Computer Vision Filter (Ultra-Agile Dual-Speed EMA - Near Zero Latency)
export const EMA_ALPHA_MIN = 0.85;             // 85% instantaneous response on slow moves (was 0.50)
export const EMA_ALPHA_MAX = 0.98;             // 98% 1-frame response on dynamic push-ups (was 0.94)
export const EMA_VELOCITY_CUTOFF = 0.10;       // Swiftly reaches maximum alpha (was 0.40)
export const SENSOR_DEADZONE = 0.001;          // Sub-millimeter sensitivity (was 0.003)
export const CALIB_HEADROOM_RATIO = 0.06;      // 6% headroom
export const CALIB_DECAY_RATE = 0.002;         // Very slow leaky decay (was 0.004)

// Biomechanical Push-Up FSM Thresholds (Easier, more natural rep detection)
export const THRESH_TOP_ENTER = 0.25;          // Reaches top lockout smoothly (was 0.20)
export const THRESH_TOP_EXIT = 0.38;           // Start of descent
export const THRESH_BOT_ENTER = 0.75;          // Chest-to-floor depth triggers readily (was 0.80)
export const THRESH_BOT_EXIT = 0.62;           // Initiation of push up

// Mouse Simulator
export const MOUSE_PAD_RATIO = 0.08;
export const USE_SMOOTHSTEP_MOUSE = true;

// Calories
export const KCAL_PER_REP = 0.36;              // ~0.36 kcal per validated push-up
