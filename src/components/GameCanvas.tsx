import React, { useRef, useEffect } from 'react';
import { MOUSE_PAD_RATIO, REF_HEIGHT, REF_WIDTH, USE_SMOOTHSTEP_MOUSE } from '../engine/constants';
import { ControlMode } from '../types/game';

interface GameCanvasProps {
  controlMode: ControlMode;
  onCanvasReady: (canvas: HTMLCanvasElement) => void;
  onSimulatedInputY: (normalizedY: number) => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  controlMode,
  onCanvasReady,
  onSimulatedInputY,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (canvasRef.current) {
      onCanvasReady(canvasRef.current);
    }
  }, [onCanvasReady]);

  // Handle Mouse Simulator coordinates mapping from game_design_spec.md Section 5.1
  const handlePointerMove = (clientY: number) => {
    if (controlMode !== 'MOUSE' || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const hWin = rect.height;
    const yPad = hWin * MOUSE_PAD_RATIO;

    // Linear clamped normalization
    const relY = clientY - rect.top;
    const mouseNorm = Math.min(Math.max((relY - yPad) / (hWin - 2 * yPad), 0.0), 1.0);

    // Ergonomic S-Curve Transfer (smoothstep)
    let ySim = mouseNorm;
    if (USE_SMOOTHSTEP_MOUSE) {
      ySim = 3 * Math.pow(mouseNorm, 2) - 2 * Math.pow(mouseNorm, 3);
    }

    onSimulatedInputY(ySim);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={(e) => handlePointerMove(e.clientY)}
      onMouseDown={(e) => handlePointerMove(e.clientY)}
      onTouchMove={(e) => {
        if (e.touches.length > 0) {
          handlePointerMove(e.touches[0].clientY);
        }
      }}
      onTouchStart={(e) => {
        if (e.touches.length > 0) {
          handlePointerMove(e.touches[0].clientY);
        }
      }}
      className="relative w-full h-full max-w-[500px] max-h-[890px] aspect-[9/16] mx-auto overflow-hidden flex items-center justify-center bg-black select-none shadow-2xl rounded-none sm:rounded-3xl border-0 sm:border border-zinc-800"
    >
      <canvas
        ref={canvasRef}
        width={REF_WIDTH}
        height={REF_HEIGHT}
        className="w-full h-full object-contain touch-none"
      />
    </div>
  );
};
