import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { HUD } from './components/HUD';
import { DepthGauge } from './components/DepthGauge';
import { ModeSelector } from './components/ModeSelector';
import { CalibrationModal } from './components/CalibrationModal';
import { GameOverModal } from './components/GameOverModal';
import { GameEngine } from './engine/GameEngine';
import { AudioSynthesizer } from './engine/AudioSynthesizer';
import { PushUpTracker } from './engine/PushUpTracker';
import { VisionPipeline, VisionStatus } from './engine/VisionPipeline';
import { BotSimulator } from './engine/BotSimulator';
import { ControlMode, Difficulty, RepState } from './types/game';

export const App: React.FC = () => {
  // Game & Workout Metrics
  const [score, setScore] = useState<number>(0);
  const [reps, setReps] = useState<number>(0);
  const [calories, setCalories] = useState<number>(0);
  const [bestScore, setBestScore] = useState<number>(() => {
    return parseInt(localStorage.getItem('pushup_bird_best_score') || '0', 10);
  });
  const [bestReps, setBestReps] = useState<number>(() => {
    return parseInt(localStorage.getItem('pushup_bird_best_reps') || '0', 10);
  });

  // Tracking & State
  const [repState, setRepState] = useState<RepState>('TOP');
  const [smoothY, setSmoothY] = useState<number>(0.2);
  const [rawY, setRawY] = useState<number>(0.25);
  const [isDepthReached, setIsDepthReached] = useState<boolean>(false);
  const [isRepPunching, setIsRepPunching] = useState<boolean>(false);

  // Settings & Modes
  const [controlMode, setControlMode] = useState<ControlMode>('CAMERA');
  const [difficulty, setDifficulty] = useState<Difficulty>('EASY');
  const [sensitivity, setSensitivity] = useState<number>(1.4);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [cameraOpacity, setCameraOpacity] = useState<number>(0.85);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [isCalibrationOpen, setIsCalibrationOpen] = useState<boolean>(false);

  // Vision Pipeline Status
  const [visionStatus, setVisionStatus] = useState<VisionStatus>('UNINITIALIZED');
  const [visionMessage, setVisionMessage] = useState<string>('');

  // Engine references
  const audioRef = useRef<AudioSynthesizer | null>(null);
  const trackerRef = useRef<PushUpTracker | null>(null);
  const botRef = useRef<BotSimulator | null>(null);
  const visionRef = useRef<VisionPipeline | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // Initialize Core Engines
  if (!audioRef.current) audioRef.current = new AudioSynthesizer();
  if (!trackerRef.current) trackerRef.current = new PushUpTracker();
  if (!botRef.current) botRef.current = new BotSimulator();

  // Handle Score and Rep Updates
  const handleScoreUpdate = useCallback((newScore: number, newReps: number, newCalories: number) => {
    setScore(newScore);
    setReps(newReps);
    setCalories(newCalories);

    setBestScore((prev) => {
      if (newScore > prev) {
        localStorage.setItem('pushup_bird_best_score', String(newScore));
        return newScore;
      }
      return prev;
    });

    setBestReps((prev) => {
      if (newReps > prev) {
        localStorage.setItem('pushup_bird_best_reps', String(newReps));
        return newReps;
      }
      return prev;
    });
  }, []);

  const handleGameOver = useCallback((finalScore: number, finalReps: number, finalCalories: number) => {
    setIsGameOver(true);
    setScore(finalScore);
    setReps(finalReps);
    setCalories(finalCalories);
  }, []);

  const handleRepPunch = useCallback(() => {
    setIsRepPunching(true);
    setTimeout(() => setIsRepPunching(false), 200);
  }, []);

  // Process Normalized or Raw Landmark through Tracker & Engine
  const processInputY = useCallback((inputY: number, inputX: number = 0.5, nowMs: number = performance.now()) => {
    setRawY(inputY);
    if (!trackerRef.current || !engineRef.current) return;

    const metrics = trackerRef.current.processLandmark(inputY, nowMs);
    setSmoothY(metrics.smoothY);
    setRepState(metrics.state);
    setIsDepthReached(metrics.isDepthReached);

    engineRef.current.updateBirdTargetNormalized(metrics.smoothY);
    engineRef.current.setDetectedLandmark(inputY, inputX);
  }, []);

  // Setup Vision Pipeline
  useEffect(() => {
    const vision = new VisionPipeline({
      onLandmark: (rawNoseY, rawNoseX) => {
        if (controlMode === 'CAMERA') {
          processInputY(rawNoseY, rawNoseX ?? 0.5, performance.now());
        }
      },
      onStatusChange: (status, msg) => {
        setVisionStatus(status);
        if (msg) setVisionMessage(msg);
      },
    });

    visionRef.current = vision;

    if (controlMode === 'CAMERA') {
      vision.start().then(() => {
        if (engineRef.current && vision.getVideo()) {
          engineRef.current.setVideoElement(vision.getVideo());
        }
      });
    }

    return () => {
      vision.stop();
    };
  }, [controlMode, processInputY]);

  // Handle Mode Switch
  const handleSelectMode = (newMode: ControlMode) => {
    setControlMode(newMode);
    if (engineRef.current) {
      engineRef.current.setControlMode(newMode);
    }

    if (newMode === 'CAMERA') {
      visionRef.current?.start().then(() => {
        if (engineRef.current && visionRef.current?.getVideo()) {
          engineRef.current.setVideoElement(visionRef.current.getVideo());
        }
      });
    } else {
      if (newMode === 'BOT') {
        botRef.current?.reset(performance.now());
      }
    }
  };

  const handleRetryCamera = () => {
    if (visionRef.current) {
      visionRef.current.stop();
      visionRef.current.start().then(() => {
        if (engineRef.current && visionRef.current?.getVideo()) {
          engineRef.current.setVideoElement(visionRef.current.getVideo());
        }
      });
    }
  };

  // Bot Simulator animation loop when in BOT mode
  useEffect(() => {
    if (controlMode !== 'BOT') return;

    let animId: number;
    const botLoop = () => {
      if (botRef.current && controlMode === 'BOT') {
        const upcomingPipe = engineRef.current?.getUpcomingPipe();
        const simulatedY = botRef.current.sample(performance.now(), upcomingPipe, 100);
        processInputY(simulatedY, 0.5, performance.now());
      }
      animId = requestAnimationFrame(botLoop);
    };

    animId = requestAnimationFrame(botLoop);
    return () => cancelAnimationFrame(animId);
  }, [controlMode, processInputY]);

  // Handle Mouse Simulator input
  const handleSimulatedInputY = useCallback((simY: number) => {
    if (controlMode === 'MOUSE') {
      processInputY(simY, 0.5, performance.now());
    }
  }, [controlMode, processInputY]);

  // Initialize Game Canvas
  const handleCanvasReady = useCallback((canvas: HTMLCanvasElement) => {
    if (!audioRef.current || !trackerRef.current) return;

    const engine = new GameEngine({
      canvas,
      audio: audioRef.current,
      tracker: trackerRef.current,
      onScoreUpdate: handleScoreUpdate,
      onGameOver: handleGameOver,
      onRepCountPunch: handleRepPunch,
    });

    engine.setControlMode(controlMode);
    engine.setDifficulty(difficulty);
    engine.setCameraOpacity(cameraOpacity);
    if (visionRef.current?.getVideo()) {
      engine.setVideoElement(visionRef.current.getVideo());
    }

    engineRef.current = engine;
    engine.start();
  }, [cameraOpacity, controlMode, difficulty, handleGameOver, handleRepPunch, handleScoreUpdate]);

  const handleCameraOpacityChange = (val: number) => {
    setCameraOpacity(val);
    if (engineRef.current) {
      engineRef.current.setCameraOpacity(val);
    }
  };

  // Controls
  const toggleMute = () => {
    if (audioRef.current) {
      const nextMute = !isMuted;
      audioRef.current.setMuted(nextMute);
      setIsMuted(nextMute);
    }
  };

  const restartGame = () => {
    setIsGameOver(false);
    if (engineRef.current) {
      engineRef.current.restart();
    }
  };

  const handleSaveCalibration = (topY: number, botY: number) => {
    if (trackerRef.current) {
      trackerRef.current.setManualCalibration(topY, botY);
    }
  };

  const handleSensitivityChange = (newSens: number) => {
    setSensitivity(newSens);
    if (trackerRef.current) {
      trackerRef.current.setSensitivity(newSens);
    }
  };

  const handleDifficultyChange = (newDiff: Difficulty) => {
    setDifficulty(newDiff);
    if (engineRef.current) {
      engineRef.current.setDifficulty(newDiff);
    }
  };

  return (
    <div className="relative w-full h-full min-h-screen bg-zinc-950 flex flex-col items-center justify-center overflow-hidden font-sans select-none">
      {/* Top Floating Control Bar */}
      <div className="absolute top-2 left-0 right-0 z-30 flex justify-center px-3">
        <ModeSelector
          currentMode={controlMode}
          visionStatus={visionStatus}
          visionMessage={visionMessage}
          sensitivity={sensitivity}
          difficulty={difficulty}
          onSelectMode={handleSelectMode}
          onRetryCamera={handleRetryCamera}
          onChangeSensitivity={handleSensitivityChange}
          onChangeDifficulty={handleDifficultyChange}
        />
      </div>

      {/* Main Game Container */}
      <div className="relative w-full h-full flex items-center justify-center pt-12 pb-2 px-2">
        <GameCanvas
          controlMode={controlMode}
          onCanvasReady={handleCanvasReady}
          onSimulatedInputY={handleSimulatedInputY}
        />

        {/* Vertical Real-Time Depth Gauge */}
        <DepthGauge
          smoothY={smoothY}
          isDepthReached={isDepthReached}
        />

        {/* HUD Overlay */}
        <HUD
          score={score}
          reps={reps}
          calories={calories}
          bestScore={bestScore}
          bestReps={bestReps}
          repState={repState}
          isDepthReached={isDepthReached}
          isMuted={isMuted}
          cameraOpacity={cameraOpacity}
          onToggleMute={toggleMute}
          onRestart={restartGame}
          onOpenCalibration={() => setIsCalibrationOpen(true)}
          onChangeOpacity={handleCameraOpacityChange}
          isRepPunching={isRepPunching}
        />
      </div>

      {/* Calibration Wizard Modal */}
      <CalibrationModal
        isOpen={isCalibrationOpen}
        onClose={() => setIsCalibrationOpen(false)}
        currentRawY={rawY}
        onSaveCalibration={handleSaveCalibration}
      />

      {/* Game Over Modal */}
      <GameOverModal
        isOpen={isGameOver}
        score={score}
        reps={reps}
        calories={calories}
        bestScore={bestScore}
        bestReps={bestReps}
        onRestart={restartGame}
      />
    </div>
  );
};

export default App;
