import React from 'react';
import { Camera, MousePointer, Bot, AlertCircle } from 'lucide-react';
import { ControlMode, Difficulty } from '../types/game';
import { VisionStatus } from '../engine/VisionPipeline';

interface ModeSelectorProps {
  currentMode: ControlMode;
  visionStatus: VisionStatus;
  visionMessage?: string;
  sensitivity: number;
  difficulty: Difficulty;
  onSelectMode: (mode: ControlMode) => void;
  onRetryCamera?: () => void;
  onChangeSensitivity: (s: number) => void;
  onChangeDifficulty: (d: Difficulty) => void;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({
  currentMode,
  visionStatus,
  visionMessage,
  sensitivity,
  difficulty,
  onSelectMode,
  onRetryCamera,
  onChangeSensitivity,
  onChangeDifficulty,
}) => {
  return (
    <div className="flex flex-col items-center gap-1.5 z-20 pointer-events-auto">
      {/* Mode, Difficulty & Sensitivity Bar */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {/* Mode Buttons */}
        <div className="inline-flex p-1 rounded-2xl bg-black/70 backdrop-blur-xl border border-white/20 shadow-2xl">
          <button
            onClick={() => onSelectMode('CAMERA')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
              currentMode === 'CAMERA'
                ? 'bg-gradient-to-r from-amber-600 to-orange-500 text-white shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>摄像头识别</span>
          </button>

          <button
            onClick={() => onSelectMode('MOUSE')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
              currentMode === 'MOUSE'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-500 text-white shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <MousePointer className="w-3.5 h-3.5" />
            <span>鼠标模拟测试</span>
          </button>

          <button
            onClick={() => onSelectMode('BOT')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
              currentMode === 'BOT'
                ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>自动机器人</span>
          </button>
        </div>

        {/* Difficulty Selector */}
        <div className="inline-flex p-1 rounded-2xl bg-black/70 backdrop-blur-xl border border-white/20 shadow-2xl items-center gap-1 text-[11px]">
          <span className="text-zinc-400 pl-2 pr-1 font-medium">难度:</span>
          {[
            { label: '慢速休闲 🌱', val: 'EASY' as Difficulty },
            { label: '标准健身 🎯', val: 'NORMAL' as Difficulty },
            { label: '极限挑战 🔥', val: 'HARD' as Difficulty },
          ].map((item) => (
            <button
              key={item.val}
              onClick={() => onChangeDifficulty(item.val)}
              className={`px-2 py-1 rounded-lg font-medium transition-all ${
                difficulty === item.val
                  ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Sensitivity Pills */}
        <div className="inline-flex p-1 rounded-2xl bg-black/70 backdrop-blur-xl border border-white/20 shadow-2xl items-center gap-1 text-[11px]">
          <span className="text-zinc-400 pl-2 pr-1 font-medium">灵敏度:</span>
          {[
            { label: '1.0x', val: 1.0 },
            { label: '1.5x ⚡', val: 1.5 },
            { label: '2.0x 🔥', val: 2.0 },
            { label: '2.5x 🚀', val: 2.5 },
          ].map((item) => (
            <button
              key={item.val}
              onClick={() => onChangeSensitivity(item.val)}
              className={`px-2 py-1 rounded-lg font-medium transition-all ${
                Math.abs(sensitivity - item.val) < 0.15
                  ? 'bg-orange-500/90 text-white font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mode Guidance & Status Warnings */}
      {currentMode === 'MOUSE' && (
        <div className="text-[11px] text-zinc-300 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
          <span>🖱️ <b>鼠标模拟已激活</b>：在屏幕垂直移动鼠标，模拟推起与下沉</span>
        </div>
      )}

      {currentMode === 'BOT' && (
        <div className="text-[11px] text-purple-200 bg-purple-950/70 backdrop-blur-md px-3 py-1 rounded-full border border-purple-400/40 flex items-center gap-1.5 shadow-lg">
          <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
          <span>🤖 <b>AI 自动巡航规避中</b>：正在计算管道缺口自动避障，并进行标准俯卧撑深度演示</span>
        </div>
      )}

      {currentMode === 'CAMERA' && (visionStatus === 'CAMERA_DENIED' || visionStatus === 'ERROR') && (
        <div className="max-w-md text-[11px] text-rose-200 bg-rose-950/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-rose-500/50 flex items-center gap-2 shadow-lg">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span className="flex-1 leading-tight">{visionMessage || '摄像头权限未开启或启动失败'}</span>
          {onRetryCamera && (
            <button
              onClick={onRetryCamera}
              className="px-2 py-0.5 rounded-md bg-rose-600 hover:bg-rose-500 text-white font-medium text-[10px] shrink-0"
            >
              重试连接
            </button>
          )}
        </div>
      )}

      {currentMode === 'CAMERA' && visionStatus === 'INITIALIZING' && (
        <div className="text-[11px] text-amber-300 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-amber-500/30 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          <span>{visionMessage || '正在启动前置摄像头 & 人脸识别模型...'}</span>
        </div>
      )}

      {currentMode === 'CAMERA' && visionStatus === 'READY' && (
        <div className="text-[11px] text-emerald-300 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-emerald-500/30 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>📷 摄像头与鼻尖追踪就绪：请面向摄像头做俯卧撑</span>
        </div>
      )}
    </div>
  );
};
