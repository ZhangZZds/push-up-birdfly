# Push-Up Flappy Bird (俯卧撑小鸟)
## Sports Biomechanics & Game Numerical Design Specification

---

### Executive Summary & System Architecture

**Push-Up Flappy Bird** is a computer-vision-driven exergaming experience where the player's physical vertical head displacement during push-ups continuously controls the flight trajectory of an in-game bird through scrolling obstacle pipes. Unlike conventional Flappy Bird, which relies on discrete impulse flaps (gravity vs. jump impulses), this adaptation implements **continuous positional tracking**: the bird's vertical screen position is directly tied to the user's filtered real-time push-up elevation. Concurrently, a robust biomechanical state machine validates full range-of-motion repetitions, tallying push-up counts while the player navigates clearance gaps.

```
       +-------------------------------------------------------------+
       |                  Webcam Video Stream (30/60 FPS)            |
       +------------------------------+------------------------------+
                                      |
                                      v
       +-------------------------------------------------------------+
       |               MediaPipe Pose / FaceMesh Detection           |
       |                   Extract Landmark[0] (Nose Tip)            |
       +------------------------------+------------------------------+
                                      | Normalized Raw y in [0.0, 1.0]
                                      v
       +-------------------------------------------------------------+
       |          Dynamic Auto-Ranging Calibration Engine            |
       |       - Online Min/Max Baseline Tracking with Asymmetric Decay|
       |       - Dynamic Normalization: y_norm in [0.0, 1.0]         |
       +------------------------------+------------------------------+
                                      |
                                      v
       +-------------------------------------------------------------+
       |             Adaptive Dual-Speed EMA Filter                  |
       |       - Fast alpha on rapid motion (low latency)            |
       |       - Slow alpha on static hold (tremor suppression)      |
       +--------------+-------------------------------+--------------+
                      |                               |
                      v                               v
       +------------------------------+ +----------------------------+
       |    Game Engine Mapping       | | Push-Up Rep Counting FSM   |
       | - bird_y = f(y_filtered)     | | - TOP -> DESC -> BOT -> ASC|
       | - Obstacle scrolling & spawn | | - Dual hysteresis & guards |
       | - Sub-pixel collision check  | | - Rep count + Form scoring |
       +------------------------------+ +----------------------------+
```

---

## 1. Push-up Biomechanics & Kinematics

### 1.1 Anthropometrics & Vertical Head Displacement

During a standard push-up, the human body acts as a second-class lever pivoting about the metatarsophalangeal joints (balls of the feet). The vertical displacement of the head/nose is a direct function of arm length, shoulder biomechanics, and spine angle.

```
   [Top Position (Plank Lockout)]
   O  (Head/Nose) ~ 45 - 60 cm above floor
   |\
   | \_____ Torso & Legs (straight line, ~15° - 20° inclination)
  / \      \
 Arms      Feet Pivot
 Locked

   [Bottom Position (Chest-to-Floor)]
   O  (Head/Nose) ~ 8 - 15 cm above floor
   ====____ Torso parallel to floor (~3° - 5° inclination)
   Elbows 90°
```

#### Anthropometric Distribution (Adult Population)

| Parameter | 5th Percentile | 50th Percentile (Median) | 95th Percentile | Design Target |
| :--- | :--- | :--- | :--- | :--- |
| **Total Upper Limb Length** | 68.0 cm | 76.5 cm | 85.0 cm | **76.0 cm** |
| **Top Position Nose Height ($H_{\text{top}}$)** | 42.0 cm | 52.0 cm | 62.0 cm | **50.0 cm** |
| **Bottom Position Nose Height ($H_{\text{bottom}}$)** | 6.0 cm | 10.0 cm | 15.0 cm | **10.0 cm** |
| **Net Vertical Head Displacement ($\Delta H$)** | **32.0 cm** | **42.0 cm** | **48.0 cm** | **$\mathbf{40.0\pm 5.0\text{ cm}}$** |

*Note: In front-facing camera setups (device placed on the floor or a low stand 1.0–1.5m ahead), the camera captures perspective projection. In normalized camera space ($y \in [0.0, 1.0]$ from top to bottom), a displacement of 40 cm typically translates to a normalized screen excursion of $\Delta y_{\text{raw}} \approx 0.25 \text{ to } 0.45$, depending on camera lens FOV and distance.*

---

### 1.2 Temporal Kinematics & Phase Breakdown

High-quality push-up execution follows an asymmetric cadence optimizing motor control, safety, and muscle activation:

$$\begin{aligned}
T_{\text{rep}} &= T_{\text{eccentric}} + T_{\text{inflection\_bottom}} + T_{\text{concentric}} + T_{\text{inflection\_top}} \\
&= 1.2\text{ s} + 0.2\text{ s} + 1.0\text{ s} + 0.2\text{ s} = \mathbf{2.60\text{ s}} \quad (\approx 23 \text{ reps/min})
\end{aligned}$$

```
 Elevation
    ^
    |      Top Pause (0.2s)
H_top +---.                .-----------------.
    |      \              /                   \
    |       \ Eccentric  / Concentric          \
    |        \ (1.2s)   / (1.0s)                \
    |         \        /                         \
H_bot +--------'------'                           '------
              Bottom Pause (0.2s)
    +----------------------------------------------------> Time (s)
      0.0   1.2 1.4  2.4 2.6
      |<------- Rep 1 ------->|<------- Rep 2 ------->|
```

1. **Eccentric Lowering Phase ($T_{\text{ecc}} = 1.2\text{ s}$):** Controlled deceleration against gravitational torque. Peak downward velocity reaches $v_{\text{ecc\_peak}} \approx -0.45\text{ m/s}$ at midpoint ($\sim 0.6\text{s}$).
2. **Bottom Inflection / Isometric Turnaround ($T_{\text{bot}} = 0.2\text{ s}$):** Deceleration to zero velocity at chest-to-floor position ($90^\circ$ elbow flexion, pectoralis major pre-stretch).
3. **Concentric Pushing Phase ($T_{\text{con}} = 1.0\text{ s}$):** Acceleration against $\approx 64\%$ of total body weight (the effective load in standard push-up posture). Peak upward velocity reaches $v_{\text{con\_peak}} \approx +0.55\text{ m/s}$.
4. **Top Lockout & Respiratory Reset ($T_{\text{top}} = 0.2\text{ s}$):** Full elbow extension and serratus anterior protraction.

---

### 1.3 Physiological Fatigue Curves & Degradation Dynamics

As muscular endurance wanes through high-volume repetitions (lactic acid accumulation, peripheral neuromuscular transmission failure), kinematics degrade systematically. The game design must absorb these changes rather than penalizing the user with unintended game over states:

```
 Repetition Progression ->
 Metric               Rep 1-5 (Fresh)        Rep 6-12 (Fatigued)     Rep 13+ (Failure Imminent)
 ------------------------------------------------------------------------------------------
 Cycle Time (T_rep)   2.4 s - 2.6 s          3.0 s - 3.6 s           4.2 s - 6.0 s
 Concentric Speed     0.55 m/s (Snappy)      0.30 m/s (Grinding)     0.12 m/s (Near-Stall)
 ROM Truncation       0% (Full depth)        10% - 15% shallow       25% - 40% (Half-reps)
 Tremor / Oscillation < 0.3 cm               ± 1.2 cm (4-8 Hz)       ± 3.0 cm (Spastic Jitter)
 Sticking Point       None                   At 45° elbow angle      Severe stall at midpoint
```

```
 Normalized
 Velocity (m/s)
   0.6 +-------. Fresh Concentric
   0.4 |      / \
   0.2 |     /   \       Fatigued Concentric (Sticking Point Dip)
   0.0 +----+-----+----\--.----+-------------------------> Time (s)
  -0.2 |                 \_/ \/
  -0.4 |
```

#### Key Design Takeaway for Game Mechanics:
1. **Never enforce rigid cycle times:** Pipe frequency must allow for slower rep rates or grant generous clearance windows.
2. **Dynamic Range Accommodation:** As the user tires and fails to reach maximum depth or lockout, the auto-calibration engine must slowly adapt its envelope.
3. **Tremor Immunity:** Shivering at the bottom or midpoint must not cause collision with pipe lips.

---

### 1.4 Form Integrity vs. "Cheating" Biomechanics

In camera-based exergaming, users intuitively discover shortcuts ("cheats") when exhausted:
- **Pigeon Necking (Head Bobs):** Bending the neck downward while keeping elbows locked to fake depth.
- **Lumbar Sagging / Banana Back:** Dropping pelvis to floor while chest stays high.
- **Piking:** Pushing hips up into an inverted-V to relieve shoulder load.

**Countermeasure in Game Design:**
MediaPipe Nose landmark ($y$) is the primary driver, but rep-counting state logic incorporates:
1. Minimum vertical excursion requirement ($\Delta y_{\text{norm}} \ge 0.50$ of calibrated ROM).
2. Minimum cycle duration ($T_{\text{rep}} \ge 1.0\text{ s}$): A head bob takes $<0.4\text{s}$, immediately discarded as invalid.

---

## 2. Game Pacing & Numerical Balance System

### 2.1 Reference Coordinate Frames & Viewport Adaptation

To maintain uniform physics across varying screens (Mobile portrait vs. Tablet/Desktop), all gameplay parameters are defined in **Normalized Game Units (NGU)**, where:
- Coordinate Origin $(0, 0)$ is **Top-Left**.
- Full Viewport Width = $W$, Height = $H$.
- Playable Game Field: $X \in [0.0, 1.0]$, $Y \in [0.0, 1.0]$.
- Standard Reference Resolution for Rendering: $W_{\text{ref}} = 450\text{ px}, H_{\text{ref}} = 800\text{ px}$ (9:16 aspect ratio).

```
 (0.0, 0.0) -------------------------------+ Top (0.0)
 |                                         |
 |   [Pipe Top]                            |
 |      ||                                 |
 |      ||                                 |
 |    ==++==                               |
 |      |                                  |
 |      |  <--- Pipe Gap Height (G_pipe)   |  Y-axis increases downward
 |      |                                  |
 |    ==++==                               |
 |      ||                                 |
 |      ||                                 |
 |   [Pipe Bottom]                         |
 +-----------------------------------------+ Bottom (1.0)
```

---

### 2.2 Scroll Velocity & Push-Up Cadence Synchronization

In standard Flappy Bird, horizontal velocity is $v_x \approx 180\text{ px/s}$ with pipe spacing $\approx 1.2\text{s}$. Because human push-up cadence is bounded by $2.4\text{s} - 3.2\text{s}$, the game world must scroll at a rate that allows one push-up cycle per pipe cycle.

#### The Golden Pacing Equation:
Let $T_{\text{pipe}}$ be the temporal interval between two successive pipe obstacles arriving at the bird's horizontal collision line ($X_{\text{bird}}$):

$$T_{\text{pipe}} = \frac{\Delta X_{\text{pipe}}}{v_x}$$

Where:
- $\Delta X_{\text{pipe}}$: Distance between pipes in pixels (or normalized units).
- $v_x$: Horizontal scrolling speed.

#### Recommended Pacing Profiles

| Difficulty Mode | Target $T_{\text{pipe}}$ | Cadence Equivalent | $v_x$ (at $W=450\text{px}$) | Pipe Spacing $\Delta X$ | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Warm-Up / Casual** | **3.60 s** | 16.7 reps/min | $100\text{ px/s}$ ($0.222\ W/\text{s}$) | $360\text{ px}$ ($0.80\ W$) | Generous timing, allows steady deliberate form. |
| **Standard / Fitness (Default)** | **3.00 s** | 20.0 reps/min | **$120\text{ px/s}$ ($0.267\ W/\text{s}$)** | **$360\text{ px}$ ($0.80\ W$)** | **Calibrated to healthy adult push-up cadence.** |
| **High-Intensity / Pro** | **2.40 s** | 25.0 reps/min | $150\text{ px/s}$ ($0.333\ W/\text{s}$) | $360\text{ px}$ ($0.80\ W$) | Fast explosive concentric reps required. |
| **Isometric Endurance** | **4.80 s** | 12.5 reps/min | $80\text{ px/s}$ ($0.178\ W/\text{s}$) | $384\text{ px}$ ($0.85\ W$) | Long hover gaps requiring isometric holds. |

---

### 2.3 Pipe Gap Height ($G_{\text{pipe}}$) Calibration

In original Flappy Bird, the gap height is tight ($\approx 20\% - 22\%$ of screen height). For push-up control, this is unplayable due to involuntary motor tremors ($\pm 1.5 - 3.0\text{ cm}$) and camera latency.

$$\text{Required Minimum Gap} = H_{\text{bird}} + 2 \times (\text{Jitter Buffer} + \text{Form Drift Margin})$$

- Bird Visual Height: $H_{\text{bird}} = 0.060\ H$ ($48\text{ px}$ on an $800\text{ px}$ screen).
- Physiological Jitter Buffer: $\pm 0.045\ H$ ($\pm 36\text{ px}$, covering muscular trembling).
- Human Tracking Latency Slack: $\pm 0.040\ H$ ($\pm 32\text{ px}$, covering $100\text{ms}$ latency at $0.4\text{ m/s}$).
- Margin of Error: $0.15\ H$.

$$\mathbf{G_{\text{pipe\_standard}} = 0.35\ H \quad (280\text{ px on } H=800\text{ px})}$$

#### Dynamic Gap Scaling by Fatigue & Streak

```
  Gap Height (% H)
     40% +                       .--- High Fatigue Relief (38% - 40%)
     35% +----------------------' Standard Baseline (35%)
     30% +         .--- Hardcore / Streak > 10 (30%)
     25% +________/
          0      5      10     15     20    Rep Count / Streak
```

- **Base Gap:** $35.0\%$ of $H$.
- **Precision Gap (Hardcore):** $30.0\%$ of $H$ (experienced athletes).
- **Fatigue Relief Assist:** If the user's velocity in the last 3 reps drops below $50\%$ of baseline, gap widens to $38.0\% - 40.0\%$ to prevent immediate failure.

---

### 2.4 Vertical Pipe Choreography & Workout Intentions

The vertical center of the pipe gap ($Y_{\text{gap\_center}} \in [0.15, 0.85]$) dictates the exact physical posture required:

```
 Screen Y      Target Posture               Physical Mechanism
 --------------------------------------------------------------------------------------
 [0.15 - 0.25] High Gap   (TOP)            Arms fully extended, locked out plank.
 [0.45 - 0.55] Mid Gap    (ISOMETRIC HOLD) Elbows at 45°-60°, brutal static hold.
 [0.75 - 0.85] Low Gap    (BOTTOM)         Deep chest-to-floor, nose hovering ~5-10cm.
```

```
 Pipe 1 (High)       Pipe 2 (Low)        Pipe 3 (High)       Pipe 4 (Mid - Isometric)
   [TOP]               [BOTTOM]            [TOP]               [ISOMETRIC HOLD]
   +-----+             +-----+             +-----+             +-----+
   |     |             |     |             |     |             |     |
   |     |             |     |             |     |             |     |
   |     |             |     |             |     |             +--+--+
   |     |             |     |             |     |                |  <--- Gap
   +--+--+             |     |             +--+--+             +--+--+
      |  <--- Gap      |     |                |  <--- Gap      |     |
   +--+--+             +--+--+             +--+--+             |     |
   |     |                |  <--- Gap      |     |             |     |
   |     |             +--+--+             |     |             |     |
   |     |             |     |             |     |             |     |
   +-----+             +-----+             +-----+             +-----+
```

#### Structured Choreography Patterns

1. **Standard Rep Pattern (High $\to$ Low $\to$ High):**
   - Pipe $N$: High ($Y = 0.20$)
   - Pipe $N+1$: Low ($Y = 0.80$)
   - Pipe $N+2$: High ($Y = 0.20$)
   - *Result:* Forces exactly 1 complete, high-quality push-up rep every 2 pipes.
2. **The "Drop & Burn" Isometric Challenge:**
   - Pipe $N$: High ($Y = 0.20$)
   - Pipe $N+1$: Mid ($Y = 0.50$)
   - Pipe $N+2$: Mid ($Y = 0.50$)
   - Pipe $N+3$: Low ($Y = 0.80$)
   - *Result:* Forces player to lower to $90^\circ$ and hold for $3.0\text{ seconds}$ straight before completing the rep.
3. **Ascending Wave (Staircase):**
   - Low ($0.80$) $\to$ Mid-Low ($0.65$) $\to$ Mid-High ($0.35$) $\to$ High ($0.20$).
   - *Result:* Slow, controlled concentric tempo training.

---

### 2.5 Hitbox Geometry, Tolerance Insets, and Fair Play Margins

Real-time computer vision input has noise and latency. Hard pixel-perfect rectangle collisions produce immense user frustration. We employ **Dual-Tier Convex Hull Insets**:

```
 [Visual Boundary: 48px x 34px]
 +-----------------------------------+
 |   [Collision Hitbox: 36px x 24px] |
 |   +---------------------------+   |
 |   |          (•)             |   |  Inset: dx = 6px (12.5%)
 |   |          Bird             |   |         dy = 5px (14.7%)
 |   +---------------------------+   |
 +-----------------------------------+
```

#### Collision Parameters:
- **Bird Bounding Box (Visual):** $W_{\text{bird}} = 48\text{ px}$, $H_{\text{bird}} = 34\text{ px}$.
- **Bird Collision Box (Physical):**
  - $X_{\text{col}} = X_{\text{bird}} + 6\text{ px}$
  - $Y_{\text{col}} = Y_{\text{bird}} + 5\text{ px}$
  - $W_{\text{col}} = 36\text{ px}$
  - $H_{\text{col}} = 24\text{ px}$
- **Pipe Collision Geometry:**
  - Pipe Width: $W_{\text{pipe}} = 70\text{ px}$ ($0.155\ W$).
  - Pipe Lip Height: $H_{\text{lip}} = 24\text{ px}$.
  - Pipe Lip Overhang: $4\text{ px}$ per side.
  - **Forgiveness Inset:** The top and bottom pipe hitboxes are retracted by $4\text{ px}$ vertically, allowing the bird's feathers to visually skim the edge without triggering death.

---

## 3. Computer Vision Tracking & Dynamic Calibration Engine

### 3.1 MediaPipe Landmark Selection & Normalized Space

- **Detector:** MediaPipe Pose (or MediaPipe FaceMesh / FaceLandmarker).
- **Target Landmark:** Index `0` (`NOSE_TIP`).
  - *Rationale:* The nose provides the cleanest, least occluded vertical displacement vector during push-ups. Wrist landmarks remain static on the floor; shoulders suffer from perspective foreshortening as the back flexes.
- **Raw MediaPipe Coordinates:**
  $$\mathbf{P}_{\text{raw}} = (x_{\text{raw}}, y_{\text{raw}}, z_{\text{raw}}), \quad y_{\text{raw}} \in [0.0, 1.0]$$
  - In camera coordinate space: $y_{\text{raw}} = 0.0$ is the top of the video feed, $y_{\text{raw}} = 1.0$ is the bottom.
  - When the user pushes UP, head approaches camera top $\implies y_{\text{raw}} \to \text{smaller}$ (towards $0$).
  - When the user descends DOWN, head approaches floor $\implies y_{\text{raw}} \to \text{larger}$ (towards $1$).

---

### 3.2 Dynamic Auto-Ranging Calibration Algorithm

Because camera distance, arm length, and body elevation vary dramatically per user and workout environment, static hardcoded thresholds fail. The engine runs a **Continuous Online Asymmetric Extrema Tracker**:

```
      Normalized Y
    (Top Lockout)
        Y_min  + - - - - - - - - - - - - - - - - - - - - - - - -
               |   ^               ^
               |  / \             / \         Decay rate: lambda_decay
               | /   \           /   \        Pushes limits inward slowly
               |/     \         /     \       Expands instantly on new peak
        Y_max  + - - - - - - - - - - - - - - - - - - - - - - - -
   (Chest to Floor)
```

#### Mathematical Formulation:

Let $Y_{\text{min}}(t)$ be the calibrated top position (minimum raw $y$), and $Y_{\text{max}}(t)$ be the calibrated bottom position (maximum raw $y$).

At each video frame $t$ with raw nose position $y_{\text{raw}}(t)$:

1. **Expansion (Instantaneous update upon exceeding limits):**
   $$Y_{\text{min}}(t) = \min\left(Y_{\text{min}}(t-1), y_{\text{raw}}(t)\right)$$
   $$Y_{\text{max}}(t) = \max\left(Y_{\text{max}}(t-1), y_{\text{raw}}(t)\right)$$

2. **Asymmetric Leaky Decay (Slow contraction to adapt to fatigue & drift):**
   $$Y_{\text{min}}(t) \leftarrow Y_{\text{min}}(t) + \lambda_{\text{decay}} \cdot \Delta t \cdot (Y_{\text{center}} - Y_{\text{min}}(t))$$
   $$Y_{\text{max}}(t) \leftarrow Y_{\text{max}}(t) - \lambda_{\text{decay}} \cdot \Delta t \cdot (Y_{\text{max}}(t) - Y_{\text{center}})$$
   *Recommended Decay Constant:* $\lambda_{\text{decay}} = 0.005\text{ s}^{-1}$ (retains calibration over $\sim 3\text{ minutes}$ without resetting).

3. **Dynamic Normalization with Comfort Headroom:**
   To ensure the player doesn't have to strain painfully to hit the absolute top or smash their nose into the floor to hit the bottom, we add a $10\%$ headroom padding ($\rho = 0.10$):

   $$\text{Range}(t) = Y_{\text{max}}(t) - Y_{\text{min}}(t)$$
   $$Y_{\text{top\_effective}} = Y_{\text{min}}(t) + \rho \cdot \text{Range}(t)$$
   $$Y_{\text{bot\_effective}} = Y_{\text{max}}(t) - \rho \cdot \text{Range}(t)$$

   $$\mathbf{y_{\text{norm}}(t) = \text{clamp}\left(\frac{y_{\text{raw}}(t) - Y_{\text{top\_effective}}}{Y_{\text{bot\_effective}} - Y_{\text{top\_effective}}}, \ 0.0, \ 1.0\right)}$$

   - $y_{\text{norm}} = 0.0 \implies$ Full Extension (Top Plank Lockout).
   - $y_{\text{norm}} = 1.0 \implies$ Full Chest-to-Floor Depth.

---

### 3.3 Adaptive Dual-Speed Exponential Moving Average (EMA)

A standard fixed-coefficient low-pass filter exhibits a harsh trade-off: high $\alpha$ preserves responsive tracking but jitters violently under muscle fatigue; low $\alpha$ provides butter-smooth movement but introduces unacceptable latency ($>200\text{ms}$), causing the bird to clip pipes.

We employ an **Adaptive Velocity-Dependent EMA Filter**:

$$y_{\text{smooth}}(t) = \alpha(t) \cdot y_{\text{norm}}(t) + (1 - \alpha(t)) \cdot y_{\text{smooth}}(t - 1)$$

Where $\alpha(t)$ is modulated by instantaneous vertical velocity:

$$v_y(t) = \frac{|y_{\text{norm}}(t) - y_{\text{smooth}}(t - 1)|}{\Delta t}$$

$$\alpha(t) = \alpha_{\text{min}} + (\alpha_{\text{max}} - \alpha_{\text{min}}) \cdot \left(\frac{v_y(t)}{v_y(t) + v_{\text{cutoff}}}\right)$$

#### Recommended Numerical Constants:

| Constant | Value | Physical Rationale |
| :--- | :--- | :--- |
| $\alpha_{\text{min}}$ | **$0.18$** | Applied during static holds / isometric hover. Suppresses 4–8 Hz muscle tremor completely. |
| $\alpha_{\text{max}}$ | **$0.65$** | Applied during rapid concentric push or eccentric drop. Reduces phase lag to $< 40\text{ms}$. |
| $v_{\text{cutoff}}$ | **$1.20\text{ s}^{-1}$** | Half-saturation velocity in normalized units per second. |
| $\text{Deadzone } \delta$ | **$0.012$** | If $|y_{\text{norm}}(t) - y_{\text{smooth}}(t-1)| < \delta$, set update to 0. Eliminates camera sensor grain noise. |

```
 Smoothing Factor alpha
  0.65 +                                   .--- High Velocity (Fast descent/ascent)
       |                                  /
  0.40 |                      .----------'
  0.18 +---------------------' Low Velocity (Tremor suppression / Hover)
       +----------------------------------------> Instantaneous Velocity v_y
       0.0                   1.2
```

---

### 3.4 Bird Vertical Mapping Function

In game space, $Y_{\text{bird}} \in [Y_{\text{bird\_min}}, Y_{\text{bird\_max}}]$:

$$Y_{\text{bird}}(t) = Y_{\text{bird\_min}} + y_{\text{smooth}}(t) \cdot (Y_{\text{bird\_max}} - Y_{\text{bird\_min}})$$

- Top boundary margin: $Y_{\text{bird\_min}} = 0.08\ H$ ($64\text{ px}$).
- Bottom boundary margin: $Y_{\text{bird\_max}} = 0.92\ H - H_{\text{bird}}$ ($688\text{ px}$).

---

## 4. Push-Up Rep Counting Finite State Machine (FSM)

Push-up counting must never produce double-counts or false positives from camera noise, head oscillations, or partial twitches. We specify a formal **5-State Hysteresis Automaton**.

```
                           +------------------------+
                           |       STATE 0:         |
                           |       CALIBRATE        |
                           +-----------+------------+
                                       | Calibration complete
                                       v
                     +------------------------------------+
                     |              STATE 1:              | <-----------------------+
        +----------> |                TOP                 |                         |
        |            +-----------------+------------------+                         |
        |                              |                                            |
        |                              | y_smooth > THRESH_TOP_EXIT (0.35)          |
        |                              v                                            |
        |            +------------------------------------+                         |
        |            |              STATE 2:              |                         |
        |            |             DESCENDING             |                         |
        |            +-----------------+------------------+                         |
        |                              |                                            |
        |                              | y_smooth >= THRESH_BOT_ENTER (0.80)        |
        |                              v                                            |
        |            +------------------------------------+                         |
        |            |              STATE 3:              |                         |
        |            |               BOTTOM               |                         |
        |            +-----------------+------------------+                         |
        |                              |                                            |
        |                              | y_smooth < THRESH_BOT_EXIT (0.65)          |
        |                              v                                            |
        |            +------------------------------------+                         |
        |            |              STATE 4:              |                         |
        |            |             ASCENDING              |                         |
        |            +-----------------+------------------+                         |
        |                              |                                            |
        |                              | y_smooth <= THRESH_TOP_ENTER (0.20)        |
        |                              | & Delta_t >= MIN_REP_DURATION (1.0s)       |
        |                              v                                            |
        |                    [ REP_COUNT += 1 ]                                     |
        |                    [ Trigger Chime  ]                                     |
        +---------------------------------------------------------------------------+
```

---

### 4.1 State Definitions & Hysteresis Thresholds

To guarantee stability, the state machine utilizes **Schmitt-Trigger-style dual hysteresis bands**:

```
 Normalized Y
   0.0 +------- Top Lockout Limit
       |
  0.20 +======= THRESH_TOP_ENTER (Transition to TOP / Complete Rep)
       |       [Top Hysteresis Deadband = 0.15]
  0.35 +======= THRESH_TOP_EXIT  (Initiate DESCENDING)
       |
       |       --- Neutral Mid Zone ---
       |
  0.65 +======= THRESH_BOT_EXIT  (Initiate ASCENDING)
       |       [Bottom Hysteresis Deadband = 0.15]
  0.80 +======= THRESH_BOT_ENTER (Confirm BOTTOM reach)
       |
   1.0 +------- Full Chest-to-Floor Limit
```

#### Exact Threshold Constants:
- $\text{THRESH\_TOP\_ENTER} = \mathbf{0.20}$ (Bird at high elevation, full arm extension).
- $\text{THRESH\_TOP\_EXIT}  = \mathbf{0.35}$ (User drops past $35\%$ depth).
- $\text{THRESH\_BOT\_ENTER} = \mathbf{0.80}$ (User reaches genuine chest-to-floor depth).
- $\text{THRESH\_BOT\_EXIT}  = \mathbf{0.65}$ (User pushes back up past $65\%$ depth).

---

### 4.2 Temporal Guards & Anti-Cheat Validation

Every transition is guarded by hardware timers:

1. **Minimum Repetition Duration ($T_{\text{min\_rep}} = 1.00\text{ s}$):**
   $$\Delta t_{\text{rep}} = t_{\text{now}} - t_{\text{rep\_start}}$$
   If $\Delta t_{\text{rep}} < 1.00\text{ s}$, the rep is classified as an invalid cheat/head-bob; counter does not increment.
2. **Minimum Bottom Hold Duration ($T_{\text{min\_bottom}} = 0.10\text{ s}$):**
   User must dwell in `STATE_BOTTOM` for at least $100\text{ms}$ to prevent instantaneous bounce artifacts.
3. **Maximum Repetition Timeout ($T_{\text{max\_rep}} = 8.00\text{ s}$):**
   If user gets stuck in descending or ascending state longer than $8.0\text{s}$, the state resets to `TOP` without counting.

---

### 4.3 Transition Logic Table

| Current State | Event / Condition | Next State | Action Executed |
| :--- | :--- | :--- | :--- |
| `CALIBRATE` | Countdown elapsed (3.0s) & baseline acquired | `TOP` | Emit sound: `READY_GO` |
| `TOP` | $y_{\text{smooth}} > 0.35$ | `DESCENDING` | $t_{\text{rep\_start}} = t_{\text{now}}$ |
| `DESCENDING` | $y_{\text{smooth}} \ge 0.80$ | `BOTTOM` | $t_{\text{bottom\_enter}} = t_{\text{now}}$ |
| `DESCENDING` | $y_{\text{smooth}} \le 0.20$ (aborted rep) | `TOP` | Cancel rep attempt |
| `BOTTOM` | $y_{\text{smooth}} < 0.65$ AND $(t_{\text{now}} - t_{\text{bot\_enter}} \ge 0.10\text{s})$ | `ASCENDING` | Record depth achievement |
| `ASCENDING` | $y_{\text{smooth}} \le 0.20$ AND $(t_{\text{now}} - t_{\text{rep\_start}} \ge 1.0\text{s})$ | `TOP` | **`rep_count += 1`**, emit `REP_SUCCESS` SFX |
| `ASCENDING` | $y_{\text{smooth}} \ge 0.80$ (re-drop before lockout) | `BOTTOM` | Reset ascent; mark rep incomplete |
| Any Active | $t_{\text{now}} - t_{\text{rep\_start}} > 8.0\text{s}$ | `TOP` | Reset state machine |

---

## 5. Mouse Simulator Mapping (Desktop & E2E Testing)

For automated end-to-end testing, headless unit verification, and desk-bound development without physical exertion, the engine includes an input abstraction layer: the **Mouse Push-Up Emulator**.

```
 Browser Window Y (Pixels)                          Simulated Nose Space
  [0 px] Top -------------------------------------> y_sim = 0.0 (Top Lockout)
                     |
                     |  Linear / Ergonomic Transfer Curve
                     v
  [H_win px] Bottom ------------------------------> y_sim = 1.0 (Chest to Floor)
```

---

### 5.1 Coordinate Mapping & Sensitivity Curves

Let $Y_{\text{client}}$ be the mouse cursor vertical position in pixels, $H_{\text{win}}$ the window height, and $Y_{\text{pad}}$ the top/bottom boundary padding (to avoid hitting browser window edges):

$$y_{\text{mouse\_norm}} = \text{clamp}\left(\frac{Y_{\text{client}} - Y_{\text{pad}}}{H_{\text{win}} - 2 \cdot Y_{\text{pad}}}, \ 0.0, \ 1.0\right)$$

Where $Y_{\text{pad}} = 0.10 \cdot H_{\text{win}}$.

#### Non-Linear Ergonomic Response (S-Curve Transfer Function)
Human wrist movement on a mouse desk surface is most precise in the center and stiff at extremes. We provide an optional cubic spline (smoothstep) transfer function:

$$y_{\text{sim}} = 3 \cdot (y_{\text{mouse\_norm}})^2 - 2 \cdot (y_{\text{mouse\_norm}})^3$$

- **Center slope:** $\approx 1.5$ (high agility for navigating gaps).
- **Edge slope:** $\to 0$ (soft landing at lockout and bottom depth).

---

### 5.2 Autonomous Sine Wave Mock Generator (Bot Testing)

To stress-test collision detection and state machine transitions without user input, an automated sine-wave generator mocks MediaPipe output:

$$y_{\text{mock}}(t) = Y_{\text{mid}} + A(t) \cdot \sin\left(\frac{2\pi}{T_{\text{rep}}} \cdot t - \frac{\pi}{2}\right) + \eta(t)$$

#### Parameters:
- Baseline Offset: $Y_{\text{mid}} = 0.50$.
- Amplitude: $A = 0.45$ (sweeps normalized range $0.05 \to 0.95$).
- Push-up Period: $T_{\text{rep}} = 2.60\text{ s}$ (or customizable cadence).
- Neuromuscular Noise Injection: $\eta(t) = \mathcal{N}(0, \sigma^2)$ with $\sigma = 0.015$ (simulates camera jitter).

---

## 6. Master Numerical Specification Table

*This table serves as the definitive engineering reference for game and vision constants.*

| Category | Parameter Name | Canonical Value | Unit / Range | Code Constant Identifier |
| :--- | :--- | :--- | :--- | :--- |
| **Biomechanics** | Typical Head Stroke | `40.0` | cm ($\pm 8\text{ cm}$) | `NOMINAL_STROKE_CM` |
| | Fresh Cadence Period | `2.60` | seconds | `DEFAULT_REP_PERIOD_SEC` |
| | Eccentric Duration | `1.20` | seconds | `ECCENTRIC_DURATION_SEC` |
| | Bottom Dwell Time | `0.20` | seconds | `BOTTOM_DWELL_SEC` |
| | Concentric Duration | `1.00` | seconds | `CONCENTRIC_DURATION_SEC` |
| | Min Allowed Rep Time | `1.00` | seconds | `MIN_REP_TIME_SEC` |
| | Max Allowed Rep Time | `8.00` | seconds | `MAX_REP_TIMEOUT_SEC` |
| **Game Dimensions** | Reference Resolution | `450 x 800` | pixels (9:16) | `REF_WIDTH`, `REF_HEIGHT` |
| | Bird Visual Size | `48 x 34` | pixels ($0.060\ H$) | `BIRD_WIDTH`, `BIRD_HEIGHT` |
| | Bird Hitbox Inset | `6, 5` | pixels ($dx, dy$) | `BIRD_HITBOX_INSET_X`, `_Y` |
| | Pipe Width | `70` | pixels ($0.155\ W$) | `PIPE_WIDTH` |
| | Pipe Lip Height | `24` | pixels | `PIPE_LIP_HEIGHT` |
| **Game Pacing** | Horizontal Speed ($v_x$) | `120.0` | px/sec ($0.267\ W/\text{s}$) | `SCROLL_VELOCITY_PX_S` |
| | Pipe Interval Time | `3.00` | seconds | `PIPE_INTERVAL_SEC` |
| | Pipe Spacing Distance | `360.0` | pixels ($0.80\ W$) | `PIPE_DISTANCE_PX` |
| | Standard Gap Height | `0.35` | normalized ($280\text{ px}$) | `PIPE_GAP_RATIO` |
| | Hardcore Gap Height | `0.28` | normalized ($224\text{ px}$) | `PIPE_GAP_HARD_RATIO` |
| | Fatigue Relieved Gap | `0.40` | normalized ($320\text{ px}$) | `PIPE_GAP_FATIGUE_RATIO` |
| **Pipes Vertical** | High Gap Center | `0.20` | normalized ($160\text{ px}$) | `GAP_Y_HIGH` |
| | Mid Gap Center | `0.50` | normalized ($400\text{ px}$) | `GAP_Y_MID` |
| | Low Gap Center | `0.80` | normalized ($640\text{ px}$) | `GAP_Y_LOW` |
| **Tracking Filter** | EMA Alpha (Min/Static) | `0.18` | unitless | `EMA_ALPHA_MIN` |
| | EMA Alpha (Max/Moving) | `0.65` | unitless | `EMA_ALPHA_MAX` |
| | Velocity Cutoff | `1.20` | normalized/sec | `EMA_VELOCITY_CUTOFF` |
| | Sensor Deadzone | `0.012` | normalized | `SENSOR_DEADZONE` |
| | Calibration Headroom | `0.10` | 10% each end | `CALIB_HEADROOM_RATIO` |
| | Calibration Decay | `0.005` | $\text{sec}^{-1}$ | `CALIB_DECAY_RATE` |
| **Rep Counting** | Top Enter Threshold | `0.20` | normalized | `THRESH_TOP_ENTER` |
| | Top Exit Threshold | `0.35` | normalized | `THRESH_TOP_EXIT` |
| | Bottom Enter Threshold | `0.80` | normalized | `THRESH_BOT_ENTER` |
| | Bottom Exit Threshold | `0.65` | normalized | `THRESH_BOT_EXIT` |
| | Min Bottom Dwell | `0.10` | seconds | `MIN_BOTTOM_DWELL_SEC` |
| **Mouse Sim** | Viewport Padding | `0.10` | ratio (10% margins) | `MOUSE_PAD_RATIO` |
| | S-Curve Non-Linearity | `true` | boolean | `USE_SMOOTHSTEP_MOUSE` |

---

## 7. Implementation Blueprint & Data Flow

### 7.1 Real-Time Vision Pipeline Implementation Pseudocode

```typescript
// Core Tracking & Filtering Pipeline
export class PushUpTracker {
  private yMin: number = 0.2; // Initial baseline top estimate
  private yMax: number = 0.8; // Initial baseline bottom estimate
  private ySmooth: number = 0.5;
  private lastTime: number = performance.now();

  public processNoseLandmark(rawY: number, now: number): { birdY: number; repCompleted: boolean } {
    const dt = Math.max((now - this.lastTime) / 1000, 0.001);
    this.lastTime = now;

    // 1. Online Dynamic Calibration Tracking with Leaky Asymmetric Contraction
    if (rawY < this.yMin) this.yMin = rawY;
    if (rawY > this.yMax) this.yMax = rawY;
    
    // Slow decay back towards center (0.5) to adapt to shifting camera or posture drift
    const decayRate = 0.005;
    this.yMin += decayRate * dt * (0.5 - this.yMin);
    this.yMax -= decayRate * dt * (this.yMax - 0.5);

    // 2. Headroom Normalized Mapping
    const range = Math.max(this.yMax - this.yMin, 0.15);
    const topEffective = this.yMin + 0.10 * range;
    const botEffective = this.yMax - 0.10 * range;
    const yNorm = Math.min(Math.max((rawY - topEffective) / (botEffective - topEffective), 0.0), 1.0);

    // 3. Adaptive Dual-Speed EMA Filter
    const diff = Math.abs(yNorm - this.ySmooth);
    if (diff > 0.012) { // Deadzone check
      const velocity = diff / dt;
      const alpha = 0.18 + (0.65 - 0.18) * (velocity / (velocity + 1.20));
      this.ySmooth = alpha * yNorm + (1.0 - alpha) * this.ySmooth;
    }

    // 4. Update Rep Counting State Machine
    const repCompleted = this.updateRepStateMachine(this.ySmooth, now);

    return { birdY: this.ySmooth, repCompleted };
  }

  private state: 'TOP' | 'DESCENDING' | 'BOTTOM' | 'ASCENDING' = 'TOP';
  private repStartTime: number = 0;
  private bottomEnterTime: number = 0;

  private updateRepStateMachine(y: number, now: number): boolean {
    switch (this.state) {
      case 'TOP':
        if (y > 0.35) {
          this.state = 'DESCENDING';
          this.repStartTime = now;
        }
        break;
      case 'DESCENDING':
        if (y >= 0.80) {
          this.state = 'BOTTOM';
          this.bottomEnterTime = now;
        } else if (y <= 0.20) {
          this.state = 'TOP'; // Aborted descent
        }
        break;
      case 'BOTTOM':
        if (y < 0.65 && (now - this.bottomEnterTime) >= 100) {
          this.state = 'ASCENDING';
        }
        break;
      case 'ASCENDING':
        if (y <= 0.20) {
          const duration = (now - this.repStartTime) / 1000;
          this.state = 'TOP';
          if (duration >= 1.00 && duration <= 8.00) {
            return true; // Rep counted!
          }
        } else if (y >= 0.80) {
          this.state = 'BOTTOM'; // Double dip
        }
        break;
    }
    return false;
  }
}
```

---

### 7.2 UI/UX Feedback Design

1. **Rep Counter Display:**
   - Large retro arcade digits at the top center of the screen.
   - Upon successful repetition completion: Scale punch animation ($1.0 \to 1.3 \to 1.0$ over $150\text{ms}$) with a bright green bloom.
2. **Real-time Depth HUD (Left or Right Margin):**
   - A vertical gauge showing current nose elevation, dynamic top lockout line ($y=0.20$), and bottom target line ($y=0.80$).
   - When the user reaches valid depth ($y \ge 0.80$), the bottom gauge changes from orange to bright emerald green.
3. **Audio Cues:**
   - `BOTTOM_CHIME`: Gentle high-frequency pip ($880\text{ Hz}$, $60\text{ms}$) confirming depth reached.
   - `REP_COUNT_SFX`: Traditional coin pickup or power-up chime ($523\text{ Hz} \to 659\text{ Hz} \to 784\text{ Hz}$) confirming rep tally.
   - `PIPE_PASS_SFX`: Soft whoosh confirming successful pipe clearance.
