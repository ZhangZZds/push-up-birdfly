import React from 'react';
import { THRESH_BOT_ENTER, THRESH_TOP_ENTER } from '../engine/constants';

interface DepthGaugeProps {
  smoothY: number;         // [0, 1] normalized vertical position
  isDepthReached: boolean; // True when chest hits depth
}

export const DepthGauge: React.FC<DepthGaugeProps> = ({
  smoothY,
  isDepthReached,
}) => {
  // Clamped position for the pointer
  const pointerPercent = Math.min(Math.max(smoothY * 100, 0), 100);
  const topThresholdPercent = THRESH_TOP_ENTER * 100;
  const bottomThresholdPercent = THRESH_BOT_ENTER * 100;

  return (
    <div className="absolute right-2 top-28 bottom-28 w-8 pointer-events-none flex flex-col items-center justify-between z-10">
      {/* Gauge Container */}
      <div className="relative w-3.5 h-full rounded-full bg-black/60 backdrop-blur-md border border-white/20 shadow-inner overflow-hidden flex flex-col">
        {/* Top Lockout Zone (0% - 20%) */}
        <div
          className="w-full bg-blue-500/20 border-b border-blue-400/50"
          style={{ height: `${topThresholdPercent}%` }}
        />

        {/* Middle Zone (20% - 80%) */}
        <div className="w-full flex-1" />

        {/* Bottom Depth Zone (80% - 100%) */}
        <div
          className={`w-full border-t transition-colors duration-200 ${
            isDepthReached
              ? 'bg-emerald-500/60 border-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.8)]'
              : 'bg-amber-500/20 border-amber-400/50'
          }`}
          style={{ height: `${100 - bottomThresholdPercent}%` }}
        />

        {/* Real-time Indicator Bar filling down */}
        <div
          className={`absolute top-0 left-0 right-0 opacity-40 transition-all duration-75 ${
            isDepthReached ? 'bg-emerald-400' : 'bg-amber-400'
          }`}
          style={{ height: `${pointerPercent}%` }}
        />

        {/* Floating Indicator Pip */}
        <div
          className={`absolute left-[-3px] right-[-3px] h-2 rounded-full shadow-md transition-all duration-75 border ${
            isDepthReached
              ? 'bg-emerald-300 border-white shadow-[0_0_10px_#10B981]'
              : 'bg-white border-zinc-300'
          }`}
          style={{ top: `calc(${pointerPercent}% - 4px)` }}
        />
      </div>

      {/* Side Labels */}
      <div className="absolute right-5 top-0 text-[10px] font-bold text-blue-300 drop-shadow">
        TOP
      </div>
      <div
        className={`absolute right-5 bottom-0 text-[10px] font-bold drop-shadow transition-colors ${
          isDepthReached ? 'text-emerald-300 font-extrabold scale-110' : 'text-amber-300'
        }`}
      >
        BOT
      </div>
    </div>
  );
};
