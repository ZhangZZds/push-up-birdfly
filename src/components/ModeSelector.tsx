import React from 'react';
import { Camera, MousePointer, Bot, AlertCircle, Settings, Trophy } from 'lucide-react';
import { ControlMode, Difficulty } from '../types/game';
import { VisionStatus } from '../engine/VisionPipeline';

interface ModeSelectorProps {
  currentMode: ControlMode;
  difficulty: Difficulty;
  visionStatus: VisionStatus;
  visionMessage?: string;
  onSelectMode: (mode: ControlMode) => void;
  onRetryCamera?: () => void;
  onOpenSettings: () => void;
  onOpenLeaderboard: () => void;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({
  currentMode,
  difficulty,
  visionStatus,
  visionMessage,
  onSelectMode,
  onRetryCamera,
  onOpenSettings,
  onOpenLeaderboard,
}) => {
  const getDifficultyBadge = () => {
    switch (difficulty) {
      case 'EASY': return '休闲 🌱';
      case 'NORMAL': return '标准 🎯';
      case 'HARD': return '极限 🔥';
    }
  };

  return (
    <div className="w-full max-w-[500px] flex flex-col items-center gap-1.5 z-20 pointer-events-auto">
      {/* Clean Top Navigation Bar */}
      <div className="w-full flex items-center justify-between px-1">
        {/* Left: App Brand Badge & Quick Mode Switch Pills */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1 p-1 pr-2 rounded-2xl bg-black/70 hover:bg-black/90 active:scale-95 backdrop-blur-xl border border-white/20 shadow-xl transition-all"
            title="Push-Up Bird 俯卧撑小鸟"
          >
            <img src="/pushup_bird_icon.png" alt="PushUp Bird" className="w-5 h-5 rounded-full object-cover ring-1 ring-orange-400/60 shadow" />
            <span className="hidden xs:inline font-black text-[11px] tracking-tight bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 bg-clip-text text-transparent">PushUp</span>
          </button>

          <div className="inline-flex p-0.5 rounded-2xl bg-black/70 backdrop-blur-xl border border-white/20 shadow-xl">
          <button
            onClick={() => onSelectMode('CAMERA')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
              currentMode === 'CAMERA'
                ? 'bg-gradient-to-r from-amber-600 to-orange-500 text-white shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
            title="摄像头识别模式"
          >
            <Camera className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">摄像头</span>
          </button>

          <button
            onClick={() => onSelectMode('MOUSE')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
              currentMode === 'MOUSE'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-500 text-white shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
            title="鼠标模拟测试模式"
          >
            <MousePointer className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">鼠标</span>
          </button>

          <button
            onClick={() => onSelectMode('BOT')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
              currentMode === 'BOT'
                ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
            title="AI 自动机器人"
          >
            <Bot className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">机器人</span>
          </button>
        </div>
      </div>

        {/* Right: Leaderboard & Settings Trigger Buttons */}
        <div className="flex items-center gap-1.5">
          {/* Difficulty indicator pill that opens settings */}
          <button
            onClick={onOpenSettings}
            className="hidden sm:inline-flex items-center px-2 py-1 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-xl border border-white/15 text-[11px] font-medium text-zinc-300 hover:text-white transition-colors"
            title="点击切换难度"
          >
            <span>{getDifficultyBadge()}</span>
          </button>

          {/* Leaderboard Button */}
          <button
            onClick={onOpenLeaderboard}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 active:scale-95 transition-all backdrop-blur-xl border border-amber-500/40 text-amber-300 text-xs font-bold shadow-lg"
            title="查看排行榜与训练战绩"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>排行榜</span>
          </button>

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-black/70 hover:bg-black/90 active:scale-95 transition-all backdrop-blur-xl border border-white/20 text-zinc-200 hover:text-white text-xs font-bold shadow-xl"
            title="打开游戏与控制设置"
          >
            <Settings className="w-3.5 h-3.5 text-orange-400 hover:rotate-90 transition-transform duration-300" />
            <span>设置</span>
          </button>
        </div>
      </div>

      {/* Mode Guidance & Status Warnings (Floating pill only when relevant) */}
      {currentMode === 'MOUSE' && (
        <div className="text-[10px] sm:text-[11px] text-zinc-300 bg-black/70 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 flex items-center gap-1.5 shadow-md">
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping shrink-0" />
          <span>🖱️ <b>鼠标模拟已激活</b>：垂直滑动鼠标模拟推起与下沉</span>
        </div>
      )}

      {currentMode === 'BOT' && (
        <div className="text-[10px] sm:text-[11px] text-purple-200 bg-purple-950/80 backdrop-blur-md px-3 py-1 rounded-full border border-purple-400/40 flex items-center gap-1.5 shadow-lg">
          <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping shrink-0" />
          <span>🤖 <b>AI 自动巡航中</b>：演示标准俯卧撑深度与水管避障</span>
        </div>
      )}

      {currentMode === 'CAMERA' && (visionStatus === 'CAMERA_DENIED' || visionStatus === 'ERROR') && (
        <div className="w-full text-[11px] text-rose-200 bg-rose-950/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-rose-500/50 flex items-center gap-2 shadow-xl">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span className="flex-1 leading-tight">{visionMessage || '摄像头权限未开启或启动失败'}</span>
          {onRetryCamera && (
            <button
              onClick={onRetryCamera}
              className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-[10px] shrink-0 active:scale-95"
            >
              重试连接
            </button>
          )}
        </div>
      )}

      {currentMode === 'CAMERA' && visionStatus === 'INITIALIZING' && (
        <div className="text-[11px] text-amber-300 bg-black/70 backdrop-blur-md px-3 py-1 rounded-full border border-amber-500/30 flex items-center gap-1.5 shadow-md">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
          <span>{visionMessage || '正在启动前置摄像头 & 人脸识别模型...'}</span>
        </div>
      )}

      {currentMode === 'CAMERA' && visionStatus === 'READY' && (
        <div className="text-[11px] text-emerald-300 bg-black/70 backdrop-blur-md px-3 py-1 rounded-full border border-emerald-500/30 flex items-center gap-1.5 shadow-md">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
          <span>📷 摄像头与鼻尖追踪就绪：请面对屏幕做俯卧撑</span>
        </div>
      )}
    </div>
  );
};
