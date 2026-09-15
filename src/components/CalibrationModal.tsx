import React, { useState, useEffect, useRef } from 'react';
import { X, CheckCircle2, ArrowUpCircle, ArrowDownCircle, Sparkles } from 'lucide-react';

interface CalibrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRawY: number;
  onSaveCalibration: (topY: number, botY: number) => void;
}

export const CalibrationModal: React.FC<CalibrationModalProps> = ({
  isOpen,
  onClose,
  currentRawY,
  onSaveCalibration,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [topY, setTopY] = useState<number | null>(null);
  const [botY, setBotY] = useState<number | null>(null);
  const [countdown, setCountdown] = useState<number>(3);

  const rawYRef = useRef<number>(currentRawY);
  rawYRef.current = currentRawY;

  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setTopY(null);
      setBotY(null);
      setCountdown(3);
      return;
    }

    // Countdown timer for capturing calibration points (decoupled from 60fps rawY changes)
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (step === 1) {
            setTopY(rawYRef.current);
            setStep(2);
            return 3;
          } else if (step === 2) {
            setBotY(rawYRef.current);
            setStep(3);
            return 0;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, step]);

  if (!isOpen) return null;

  const handleFinish = () => {
    let finalTop = topY !== null ? topY : 0.25;
    let finalBot = botY !== null ? botY : 0.75;
    if (finalTop >= finalBot) {
      const tmp = finalTop;
      finalTop = finalBot;
      finalBot = tmp;
    }
    if (finalBot - finalTop < 0.08) {
      finalTop = Math.max(0.05, finalTop - 0.1);
      finalBot = Math.min(0.95, finalBot + 0.1);
    }
    onSaveCalibration(finalTop, finalBot);
    onClose();
  };

  const handleUseDefault = () => {
    onSaveCalibration(0.25, 0.75);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-sm rounded-3xl bg-zinc-900 border border-zinc-700 p-6 shadow-2xl text-center">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-full text-zinc-400 hover:text-white bg-zinc-800"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex justify-center mb-3">
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Sparkles className="w-8 h-8" />
          </div>
        </div>

        <h3 className="text-lg font-bold text-white mb-1">
          俯卧撑深度校准 (Calibration)
        </h3>
        <p className="text-xs text-zinc-400 mb-6">
          自动匹配你的手臂长度与摄像头摆放距离
        </p>

        {/* Wizard Steps */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-blue-950/40 border border-blue-500/30">
              <ArrowUpCircle className="w-10 h-10 text-blue-400 animate-bounce" />
              <div className="text-sm font-semibold text-blue-200">
                第一步：支撑推起到最高位 (Top Lockout)
              </div>
              <p className="text-xs text-blue-300/80">
                双臂伸直，保持标准俯卧撑起始平板姿势
              </p>
            </div>
            <div className="text-3xl font-black text-white font-mono">{countdown}s</div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30">
              <ArrowDownCircle className="w-10 h-10 text-emerald-400 animate-bounce" />
              <div className="text-sm font-semibold text-emerald-200">
                第二步：下沉贴地到最深处 (Chest to Floor)
              </div>
              <p className="text-xs text-emerald-300/80">
                胸部靠近地面，手肘约90度，保持稳定
              </p>
            </div>
            <div className="text-3xl font-black text-white font-mono">{countdown}s</div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-zinc-800/80 border border-zinc-600">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
              <div className="text-sm font-semibold text-white">校准完成！</div>
              <div className="text-xs text-zinc-400 font-mono">
                Top: {topY?.toFixed(2)} | Bottom: {botY?.toFixed(2)}
              </div>
            </div>

            <button
              onClick={handleFinish}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 font-bold text-white shadow-lg active:scale-95 transition-transform"
            >
              保存并开始游戏
            </button>
          </div>
        )}

        {step !== 3 && (
          <div className="mt-6 pt-4 border-t border-zinc-800 flex justify-center">
            <button
              onClick={handleUseDefault}
              className="text-xs text-zinc-400 hover:text-zinc-200 underline"
            >
              跳过校准，使用动态自适应
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
