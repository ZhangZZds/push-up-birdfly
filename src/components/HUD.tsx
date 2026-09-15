import React from 'react';
import { Volume2, VolumeX, RefreshCw, Sliders, Flame, Award, Dumbbell } from 'lucide-react';
import { RepState } from '../types/game';

interface HUDProps {
  score: number;
  reps: number;
  calories: number;
  bestScore: number;
  bestReps: number;
  repState: RepState;
  isDepthReached: boolean;
  isMuted: boolean;
  cameraOpacity: number;
  onToggleMute: () => void;
  onRestart: () => void;
  onOpenCalibration: () => void;
  onChangeOpacity: (val: number) => void;
  isRepPunching: boolean;
}

export const HUD: React.FC<HUDProps> = ({
  score,
  reps,
  calories,
  bestScore,
  bestReps,
  repState,
  isDepthReached,
  isMuted,
  cameraOpacity,
  onToggleMute,
  onRestart,
  onOpenCalibration,
  onChangeOpacity,
  isRepPunching,
}) => {
  // Rep State display styling
  const getStateBadge = () => {
    switch (repState) {
      case 'TOP':
        return { label: 'TOP LOCKOUT (顶峰锁定)', color: 'bg-blue-600/80 text-blue-100 border-blue-400' };
      case 'DESCENDING':
        return { label: 'DESCENDING ↓ (下沉中)', color: 'bg-amber-600/80 text-amber-100 border-amber-400' };
      case 'BOTTOM':
        return { label: 'BOTTOM CHEST 🎯 (触底到位)', color: 'bg-emerald-600/90 text-emerald-100 border-emerald-300 animate-pulse' };
      case 'ASCENDING':
        return { label: 'PUSHING UP ↑ (推起发力)', color: 'bg-purple-600/80 text-purple-100 border-purple-400' };
    }
  };

  const stateBadge = getStateBadge();

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3 select-none">
      {/* Top Header Bar */}
      <div className="flex items-start justify-between">
        {/* Rep & Score HUD */}
        <div className="flex flex-col gap-1.5">
          {/* Main Reps Counter with Scale Punch */}
          <div
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-black/60 backdrop-blur-md border border-white/15 shadow-xl transition-transform duration-150 ${
              isRepPunching ? 'scale-125 border-emerald-400 bg-emerald-950/70' : 'scale-100'
            }`}
          >
            <Dumbbell className={`w-6 h-6 ${isRepPunching ? 'text-emerald-300' : 'text-amber-400'}`} />
            <div className="flex items-baseline gap-1.5">
              <span className="text-xs font-bold tracking-wider text-amber-400/90 uppercase">REPS</span>
              <span className="text-3xl font-black tracking-tight text-white font-mono">{reps}</span>
            </div>
            {bestReps > 0 && (
              <span className="text-[10px] text-zinc-400 font-medium ml-1">MAX {bestReps}</span>
            )}
          </div>

          {/* Pipes Score & Calories */}
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/50 backdrop-blur-md border border-white/10 text-xs">
              <Award className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-zinc-300">PIPES:</span>
              <span className="font-bold text-white font-mono">{score}</span>
              <span className="text-[10px] text-zinc-500">({bestScore})</span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/50 backdrop-blur-md border border-white/10 text-xs">
              <Flame className="w-3.5 h-3.5 text-rose-400" />
              <span className="font-mono text-white font-bold">{calories}</span>
              <span className="text-[10px] text-zinc-400">kcal</span>
            </div>
          </div>
        </div>

        {/* Quick Actions (Sound, Opacity, Calibration) */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Camera Opacity Quick Slider / Toggle */}
          <div className="flex items-center gap-1 px-2 py-1 rounded-xl bg-black/50 backdrop-blur-md border border-white/15 text-zinc-300">
            <span className="text-[10px] text-zinc-400">CAM</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={cameraOpacity}
              onChange={(e) => onChangeOpacity(parseFloat(e.target.value))}
              className="w-14 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
              title={`Camera Opacity: ${Math.round(cameraOpacity * 100)}%`}
            />
          </div>

          {/* Mute Toggle */}
          <button
            onClick={onToggleMute}
            className="p-2 rounded-xl bg-black/50 hover:bg-black/70 active:scale-95 transition-all backdrop-blur-md border border-white/15 text-zinc-300 hover:text-white"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          {/* Calibration Wizard Button */}
          <button
            onClick={onOpenCalibration}
            className="px-2.5 py-1.5 rounded-xl bg-black/50 hover:bg-black/70 active:scale-95 transition-all backdrop-blur-md border border-white/15 text-xs font-medium text-zinc-200 flex items-center gap-1.5"
            title="Calibrate Push-Up Depth"
          >
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">校准</span>
          </button>

          {/* Restart */}
          <button
            onClick={onRestart}
            className="p-2 rounded-xl bg-black/50 hover:bg-black/70 active:scale-95 transition-all backdrop-blur-md border border-white/15 text-zinc-300 hover:text-white"
            title="Restart Game"
          >
            <RefreshCw className="w-4 h-4 text-zinc-300 hover:rotate-180 transition-transform duration-300" />
          </button>
        </div>
      </div>

      {/* Bottom Center State Pill */}
      <div className="flex flex-col items-center gap-2 mb-2">
        {/* Dynamic Biomechanical State Badge */}
        <div
          className={`px-3 py-1 rounded-full text-xs font-bold border backdrop-blur-md shadow-lg transition-colors duration-200 ${stateBadge.color}`}
        >
          {stateBadge.label}
        </div>
      </div>
    </div>
  );
};
