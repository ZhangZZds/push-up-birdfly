import React, { useState } from 'react';
import { Trophy, X, Dumbbell, Award, Flame, Calendar, Trash2, Medal, ArrowDownUp } from 'lucide-react';
import { WorkoutRecord } from '../types/game';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: WorkoutRecord[];
  onClearRecords: () => void;
}

type SortBy = 'REPS' | 'PIPES' | 'RECENT';

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  isOpen,
  onClose,
  records,
  onClearRecords,
}) => {
  const [sortBy, setSortBy] = useState<SortBy>('REPS');

  if (!isOpen) return null;

  // Lifetime Statistics
  const totalReps = records.reduce((acc, r) => acc + r.reps, 0);
  const totalCalories = Number(records.reduce((acc, r) => acc + r.calories, 0).toFixed(1));
  const bestReps = records.reduce((max, r) => Math.max(max, r.reps), 0);
  const bestScore = records.reduce((max, r) => Math.max(max, r.score), 0);

  // Sorted list
  const sortedRecords = [...records].sort((a, b) => {
    if (sortBy === 'REPS') {
      return b.reps - a.reps || b.score - a.score || b.timestamp - a.timestamp;
    } else if (sortBy === 'PIPES') {
      return b.score - a.score || b.reps - a.reps || b.timestamp - a.timestamp;
    } else {
      return b.timestamp - a.timestamp;
    }
  });

  const getRankBadge = (index: number) => {
    if (sortBy === 'RECENT') {
      return <span className="text-xs font-mono text-zinc-500 font-semibold">#{index + 1}</span>;
    }
    if (index === 0) {
      return <span className="text-base" title="第 1 名">🥇</span>;
    } else if (index === 1) {
      return <span className="text-base" title="第 2 名">🥈</span>;
    } else if (index === 2) {
      return <span className="text-base" title="第 3 名">🥉</span>;
    }
    return <span className="text-xs font-mono text-zinc-400 font-semibold">#{index + 1}</span>;
  };

  const getDifficultyLabel = (diff: string) => {
    switch (diff) {
      case 'EASY': return '休闲';
      case 'NORMAL': return '标准';
      case 'HARD': return '极限';
      default: return diff;
    }
  };

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'CAMERA': return '📷';
      case 'MOUSE': return '🖱️';
      case 'BOT': return '🤖';
      default: return '';
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg rounded-3xl bg-zinc-900/95 border border-zinc-700/80 shadow-2xl p-5 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">训练成就与排行榜</h3>
              <p className="text-[11px] text-zinc-400">见证每一次汗水与突破</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lifetime Stats Cards */}
        <div className="grid grid-cols-4 gap-2 my-3 shrink-0">
          <div className="p-2.5 rounded-2xl bg-zinc-800/60 border border-zinc-700/50 flex flex-col items-center text-center">
            <Medal className="w-4 h-4 text-amber-400 mb-0.5" />
            <span className="text-[10px] text-zinc-400 font-semibold">最高俯卧撑</span>
            <span className="text-base font-black text-white font-mono">{bestReps}</span>
            <span className="text-[9px] text-zinc-500">REPS</span>
          </div>

          <div className="p-2.5 rounded-2xl bg-zinc-800/60 border border-zinc-700/50 flex flex-col items-center text-center">
            <Award className="w-4 h-4 text-orange-400 mb-0.5" />
            <span className="text-[10px] text-zinc-400 font-semibold">最高过管</span>
            <span className="text-base font-black text-white font-mono">{bestScore}</span>
            <span className="text-[9px] text-zinc-500">PIPES</span>
          </div>

          <div className="p-2.5 rounded-2xl bg-zinc-800/60 border border-zinc-700/50 flex flex-col items-center text-center">
            <Dumbbell className="w-4 h-4 text-emerald-400 mb-0.5" />
            <span className="text-[10px] text-zinc-400 font-semibold">生涯总次数</span>
            <span className="text-base font-black text-white font-mono">{totalReps}</span>
            <span className="text-[9px] text-zinc-500">总 REPS</span>
          </div>

          <div className="p-2.5 rounded-2xl bg-zinc-800/60 border border-zinc-700/50 flex flex-col items-center text-center">
            <Flame className="w-4 h-4 text-rose-400 mb-0.5" />
            <span className="text-[10px] text-zinc-400 font-semibold">累计消耗</span>
            <span className="text-base font-black text-white font-mono">{totalCalories}</span>
            <span className="text-[9px] text-zinc-500">kcal</span>
          </div>
        </div>

        {/* Tab Filter Bar */}
        <div className="flex items-center justify-between gap-2 p-1 rounded-2xl bg-black/50 border border-zinc-800 mb-3 shrink-0 text-xs font-semibold">
          <div className="flex items-center gap-1 w-full">
            <button
              onClick={() => setSortBy('REPS')}
              className={`flex-1 py-1.5 rounded-xl transition-all flex items-center justify-center gap-1 ${
                sortBy === 'REPS'
                  ? 'bg-amber-500 text-black font-bold shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Dumbbell className="w-3.5 h-3.5" />
              <span>俯卧撑榜</span>
            </button>

            <button
              onClick={() => setSortBy('PIPES')}
              className={`flex-1 py-1.5 rounded-xl transition-all flex items-center justify-center gap-1 ${
                sortBy === 'PIPES'
                  ? 'bg-orange-500 text-white font-bold shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>过管得分榜</span>
            </button>

            <button
              onClick={() => setSortBy('RECENT')}
              className={`flex-1 py-1.5 rounded-xl transition-all flex items-center justify-center gap-1 ${
                sortBy === 'RECENT'
                  ? 'bg-zinc-700 text-white font-bold shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>近期训练</span>
            </button>
          </div>
        </div>

        {/* Records Table / List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[160px]">
          {sortedRecords.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center text-center text-zinc-500">
              <Dumbbell className="w-8 h-8 text-zinc-600 mb-2 animate-bounce" />
              <p className="text-sm font-semibold text-zinc-400">暂无训练战绩</p>
              <p className="text-xs text-zinc-500 mt-1">完成任意一组俯卧撑游戏，即可自动载入排行榜！</p>
            </div>
          ) : (
            sortedRecords.map((record, index) => {
              const isTop3 = sortBy !== 'RECENT' && index < 3;
              return (
                <div
                  key={record.id || index}
                  className={`flex items-center justify-between p-2.5 rounded-2xl border transition-all ${
                    isTop3
                      ? 'bg-gradient-to-r from-amber-950/30 to-zinc-900 border-amber-500/40 shadow-sm'
                      : 'bg-zinc-800/40 border-zinc-800/80 hover:bg-zinc-800/60'
                  }`}
                >
                  {/* Left: Rank & Date */}
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 text-center shrink-0">
                      {getRankBadge(index)}
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white">
                          {record.date}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                          {getModeIcon(record.mode)} {getDifficultyLabel(record.difficulty)}
                        </span>
                      </div>
                      <div className="text-[10px] text-zinc-500 mt-0.5 flex items-center gap-1">
                        <Flame className="w-3 h-3 text-rose-400/80" />
                        <span>{record.calories} kcal</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Scores */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-[10px] text-zinc-400 uppercase font-semibold">REPS</div>
                      <div className="font-mono text-base font-black text-amber-400">
                        {record.reps}
                      </div>
                    </div>

                    <div className="text-right pl-2 border-l border-zinc-700/60">
                      <div className="text-[10px] text-zinc-400 uppercase font-semibold">PIPES</div>
                      <div className="font-mono text-base font-black text-white">
                        {record.score}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center justify-between shrink-0">
          {records.length > 0 ? (
            <button
              onClick={() => {
                if (window.confirm('确定要清空所有排行榜与历史训练记录吗？')) {
                  onClearRecords();
                }
              }}
              className="text-xs text-zinc-500 hover:text-rose-400 flex items-center gap-1 py-1 px-2 rounded-lg hover:bg-rose-950/30 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>清空记录</span>
            </button>
          ) : <div />}

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs shadow active:scale-95 transition-transform"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};
