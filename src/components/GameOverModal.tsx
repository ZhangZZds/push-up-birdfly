import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { RotateCcw, Dumbbell, Award, Flame, Trophy } from 'lucide-react';

interface GameOverModalProps {
  isOpen: boolean;
  score: number;
  reps: number;
  calories: number;
  bestScore: number;
  bestReps: number;
  onRestart: () => void;
  onOpenLeaderboard?: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  score,
  reps,
  calories,
  bestScore,
  bestReps,
  onRestart,
  onOpenLeaderboard,
}) => {
  useEffect(() => {
    if (isOpen && (reps >= 5 || reps > bestReps || score > bestScore)) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#F97316', '#F59E0B', '#10B981', '#60A5FA'],
      });
    }
  }, [isOpen, reps, score, bestReps, bestScore]);

  if (!isOpen) return null;

  const isNewRepRecord = reps > 0 && reps >= bestReps;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-sm rounded-3xl bg-zinc-900 border border-zinc-700 p-6 shadow-2xl text-center">
        {/* Header Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 text-xs font-bold uppercase tracking-wider mb-3">
          Push Day Killer 💀
        </div>

        {/* Mascot Avatar */}
        <div className="relative mx-auto mb-3 w-20 h-20">
          <img
            src="/pushup_bird_pose.png"
            alt="Workout Mascot"
            className="w-full h-full rounded-2xl object-cover shadow-2xl border-2 border-orange-500/50 ring-4 ring-orange-500/20"
          />
          <span className="absolute -bottom-1 -right-1 text-xl animate-bounce">
            💪
          </span>
        </div>

        <h2 className="text-2xl font-black text-white tracking-tight mb-4">
          WORKOUT COMPLETED!
        </h2>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          {/* Push-Up Reps Box */}
          <div className="relative p-3.5 rounded-2xl bg-zinc-800/80 border border-zinc-700/80 flex flex-col items-center">
            {isNewRepRecord && (
              <span className="absolute -top-2.5 px-2 py-0.5 rounded-full bg-amber-500 text-[10px] font-black text-black uppercase">
                NEW RECORD!
              </span>
            )}
            <Dumbbell className="w-5 h-5 text-amber-400 mb-1" />
            <span className="text-xs text-zinc-400 font-semibold uppercase">REPS</span>
            <span className="text-3xl font-black text-white font-mono">{reps}</span>
            <span className="text-[10px] text-zinc-500">Best: {bestReps}</span>
          </div>

          {/* Pipes Cleared Box */}
          <div className="p-3.5 rounded-2xl bg-zinc-800/80 border border-zinc-700/80 flex flex-col items-center">
            <Award className="w-5 h-5 text-orange-400 mb-1" />
            <span className="text-xs text-zinc-400 font-semibold uppercase">PIPES</span>
            <span className="text-3xl font-black text-white font-mono">{score}</span>
            <span className="text-[10px] text-zinc-500">Best: {bestScore}</span>
          </div>
        </div>

        {/* Calories Burned Banner */}
        <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-rose-950/40 border border-rose-500/30 mb-6">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-rose-400" />
            <span className="text-xs font-semibold text-rose-200">能量消耗</span>
          </div>
          <span className="text-sm font-bold text-white font-mono">
            {calories} <span className="text-xs font-normal text-rose-300">kcal</span>
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2">
          <button
            onClick={onRestart}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-base shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <RotateCcw className="w-5 h-5" />
            <span>再练一组 (PLAY AGAIN)</span>
          </button>

          {onOpenLeaderboard && (
            <button
              onClick={onOpenLeaderboard}
              className="w-full py-2.5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 active:scale-98 transition-all border border-zinc-700 text-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 shadow"
            >
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>查看排行榜与训练战绩</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
