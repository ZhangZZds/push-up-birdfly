import React from 'react';
import { X, Sliders, Volume2, VolumeX, Eye, Camera, MousePointer, Bot, RotateCcw, ArrowUpDown, Sparkles } from 'lucide-react';
import { ControlMode, Difficulty } from '../types/game';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  controlMode: ControlMode;
  difficulty: Difficulty;
  sensitivity: number;
  verticalOffset: number;
  cameraOpacity: number;
  isMuted: boolean;
  onSelectMode: (mode: ControlMode) => void;
  onChangeDifficulty: (diff: Difficulty) => void;
  onChangeSensitivity: (sens: number) => void;
  onChangeVerticalOffset: (offset: number) => void;
  onChangeCameraOpacity: (opacity: number) => void;
  onToggleMute: () => void;
  onOpenCalibration: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  controlMode,
  difficulty,
  sensitivity,
  verticalOffset,
  cameraOpacity,
  isMuted,
  onSelectMode,
  onChangeDifficulty,
  onChangeSensitivity,
  onChangeVerticalOffset,
  onChangeCameraOpacity,
  onToggleMute,
  onOpenCalibration,
}) => {
  if (!isOpen) return null;

  const offsetPercent = Math.round(verticalOffset * 100);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md rounded-3xl bg-zinc-900/95 border border-zinc-700/80 shadow-2xl p-5 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
          <div className="flex items-center gap-3">
            <img
              src="/pushup_bird_icon.png"
              alt="PushUp Bird"
              className="w-11 h-11 rounded-2xl object-cover shadow-lg border border-orange-500/40 ring-2 ring-orange-500/20"
            />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-tight">游戏与控制设置</h3>
                <span className="px-1.5 py-0.5 rounded-full bg-orange-500/20 border border-orange-500/40 text-[10px] font-mono text-orange-300">v1.0.3</span>
              </div>
              <p className="text-[11px] text-zinc-400">Push-Up Bird 俯卧撑体感运动引擎</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 text-xs">
          {/* 1. Control Mode Section */}
          <div className="space-y-1.5">
            <label className="font-semibold text-zinc-300 flex items-center gap-1.5">
              <span>🎮 控制模式 (Control Mode)</span>
            </label>
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-black/50 border border-zinc-800">
              <button
                onClick={() => onSelectMode('CAMERA')}
                className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl font-medium transition-all ${
                  controlMode === 'CAMERA'
                    ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md font-bold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Camera className="w-4 h-4" />
                <span className="text-[11px]">摄像头识别</span>
              </button>

              <button
                onClick={() => onSelectMode('MOUSE')}
                className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl font-medium transition-all ${
                  controlMode === 'MOUSE'
                    ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md font-bold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <MousePointer className="w-4 h-4" />
                <span className="text-[11px]">鼠标模拟</span>
              </button>

              <button
                onClick={() => onSelectMode('BOT')}
                className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl font-medium transition-all ${
                  controlMode === 'BOT'
                    ? 'bg-gradient-to-br from-purple-500 to-pink-600 text-white shadow-md font-bold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Bot className="w-4 h-4" />
                <span className="text-[11px]">自动巡航</span>
              </button>
            </div>
          </div>

          {/* 2. Game Difficulty Section */}
          <div className="space-y-1.5">
            <label className="font-semibold text-zinc-300">
              🎯 游戏难度与流速 (Difficulty & Speed)
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { val: 'EASY' as Difficulty, label: '慢速休闲 🌱', desc: '开口大·适合新手' },
                { val: 'NORMAL' as Difficulty, label: '标准健身 🎯', desc: '标准俯卧撑节奏' },
                { val: 'HARD' as Difficulty, label: '极限挑战 🔥', desc: '快速窄隙·高手进阶' },
              ].map((item) => (
                <button
                  key={item.val}
                  onClick={() => onChangeDifficulty(item.val)}
                  className={`p-2 rounded-xl border text-left transition-all ${
                    difficulty === item.val
                      ? 'bg-emerald-950/60 border-emerald-500/80 text-white shadow-md'
                      : 'bg-zinc-800/50 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                  }`}
                >
                  <div className="font-bold text-[11px] mb-0.5">{item.label}</div>
                  <div className="text-[9px] text-zinc-500">{item.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 3. Vertical Offset Adjustment (User Request 3) */}
          <div className="p-3 rounded-2xl bg-zinc-800/40 border border-zinc-700/60 space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-zinc-200 flex items-center gap-1.5">
                <ArrowUpDown className="w-3.5 h-3.5 text-orange-400" />
                <span>垂直基准偏移量 (Vertical Offset)</span>
              </label>
              <div className="flex items-center gap-2">
                <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded-md ${
                  offsetPercent === 0
                    ? 'bg-zinc-700 text-zinc-300'
                    : offsetPercent > 0
                    ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40'
                    : 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                }`}>
                  {offsetPercent > 0 ? `+${offsetPercent}% (向下偏)` : offsetPercent < 0 ? `${offsetPercent}% (向上偏)` : '0% (居中)'}
                </span>
                {offsetPercent !== 0 && (
                  <button
                    onClick={() => onChangeVerticalOffset(0)}
                    className="p-1 rounded-md bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-[10px] flex items-center gap-0.5"
                    title="重置为 0%"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            <p className="text-[10px] text-zinc-400 leading-tight">
              调整小鸟与鼻尖在屏幕上的初始高低基准。如果手机放在地面仰角拍摄导致小鸟偏高，向右滑动使小鸟下移；若手机立在桌上俯拍，向左滑动使小鸟上移。
            </p>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => onChangeVerticalOffset(Math.max(-0.30, verticalOffset - 0.04))}
                className="w-7 h-7 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white font-bold flex items-center justify-center shrink-0"
                title="向上微调 -4%"
              >
                -
              </button>
              <input
                type="range"
                min="-0.30"
                max="0.30"
                step="0.01"
                value={verticalOffset}
                onChange={(e) => onChangeVerticalOffset(parseFloat(e.target.value))}
                className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
              <button
                onClick={() => onChangeVerticalOffset(Math.min(0.30, verticalOffset + 0.04))}
                className="w-7 h-7 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white font-bold flex items-center justify-center shrink-0"
                title="向下微调 +4%"
              >
                +
              </button>
            </div>
          </div>

          {/* 4. Action Sensitivity Multiplier */}
          <div className="p-3 rounded-2xl bg-zinc-800/40 border border-zinc-700/60 space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-zinc-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>动作灵敏度倍率 (Motion Sensitivity)</span>
              </label>
              <span className="font-mono text-xs font-bold text-amber-400 px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40">
                {sensitivity.toFixed(1)}x
              </span>
            </div>

            <p className="text-[10px] text-zinc-400 leading-tight">
              放大鼻尖垂直行程。倍率越高，小幅度推起即可带动小鸟大范围移动，适合体能消耗大时或做半程俯卧撑。
            </p>

            <div className="grid grid-cols-4 gap-1.5 pt-1">
              {[
                { val: 1.0, label: '1.0x 标准' },
                { val: 1.5, label: '1.5x 灵敏 ⚡' },
                { val: 2.0, label: '2.0x 爆发 🔥' },
                { val: 2.5, label: '2.5x 极速 🚀' },
              ].map((item) => (
                <button
                  key={item.val}
                  onClick={() => onChangeSensitivity(item.val)}
                  className={`py-1.5 px-1 rounded-xl text-center font-medium transition-all ${
                    Math.abs(sensitivity - item.val) < 0.15
                      ? 'bg-amber-500 text-black font-bold shadow-md'
                      : 'bg-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  <span className="text-[10px]">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 5. Camera Background Opacity & Audio Switches */}
          <div className="grid grid-cols-2 gap-2">
            {/* Opacity Slider */}
            <div className="p-3 rounded-2xl bg-zinc-800/40 border border-zinc-700/60 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-zinc-300 flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5 text-zinc-400" />
                  摄像头透光度
                </span>
                <span className="font-mono text-[11px] text-white">
                  {Math.round(cameraOpacity * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={cameraOpacity}
                onChange={(e) => onChangeCameraOpacity(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            {/* Audio Mute Toggle */}
            <div className="p-3 rounded-2xl bg-zinc-800/40 border border-zinc-700/60 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-zinc-300 flex items-center gap-1">
                  {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
                  8-bit 复古音效
                </span>
                <span className={`text-[10px] font-bold ${isMuted ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {isMuted ? '已静音' : '开启中'}
                </span>
              </div>
              <button
                onClick={onToggleMute}
                className={`w-full py-1 rounded-xl text-center text-[10px] font-semibold transition-colors ${
                  isMuted ? 'bg-rose-950/60 text-rose-300 border border-rose-600/40' : 'bg-emerald-950/60 text-emerald-300 border border-emerald-600/40'
                }`}
              >
                {isMuted ? '点击恢复声音' : '点击静音'}
              </button>
            </div>
          </div>

          {/* 6. Calibration Wizard Button */}
          <div className="pt-1">
            <button
              onClick={() => {
                onClose();
                onOpenCalibration();
              }}
              className="w-full py-2.5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 active:scale-98 transition-all border border-zinc-700 text-zinc-200 font-semibold flex items-center justify-center gap-2"
            >
              <Sliders className="w-4 h-4 text-amber-400" />
              <span>启动 3 秒高低位精细标定向导 (Calibration)</span>
            </button>
          </div>
        </div>

        {/* Close confirmation */}
        <div className="mt-5 pt-3 border-t border-zinc-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-xs shadow-lg active:scale-95 transition-transform"
          >
            完成并返回游戏
          </button>
        </div>
      </div>
    </div>
  );
};
