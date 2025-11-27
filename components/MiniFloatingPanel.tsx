import React from 'react';
import { TFunction } from 'i18next';
import { Monitor, Maximize2, Pause, Play, Camera } from 'lucide-react';
import { RecordingState } from '../types';
import LazyVisualizer from './LazyVisualizer';

interface MiniFloatingPanelProps {
  t: TFunction;
  duration: number;
  recordingState: RecordingState;
  showVisualizer: boolean;
  onToggleVisualizer: () => void;
  onExitMiniMode: () => void;
  onPause: () => void;
  onResume: () => void;
  onCaptureScreen: () => void;
  onStop: () => void;
  analyser: AnalyserNode | null;
}

/**
 * 迷你浮窗面板，提供简化的录音状态显示和关键操作。
 */
const MiniFloatingPanel: React.FC<MiniFloatingPanelProps> = ({
  t,
  duration,
  recordingState,
  showVisualizer,
  onToggleVisualizer,
  onExitMiniMode,
  onPause,
  onResume,
  onCaptureScreen,
  onStop,
  analyser,
}) => {
  const isRecording = recordingState === RecordingState.RECORDING;

  return (
    <div className="fixed top-6 right-6 w-[260px] bg-[#0b1220] border border-[#1f2937] rounded-xl p-3 z-50 text-white font-['Share_Tech_Mono'] drag-region cursor-move">
      <div className="flex items-center justify-between text-[9px] uppercase tracking-[0.3em] text-[#9ca3af] mb-2">
        <span>{t('common.timer')}</span>
        <div className="flex items-center gap-1.5">
          <div
            className={`w-2 h-2 rounded-full ${
              isRecording ? 'bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.9)] animate-pulse' : 'bg-red-900'
            }`}
          />
          <span>{t('common.rec')}</span>
          <button
            onClick={onToggleVisualizer}
            className="text-[#94a3b8] hover:text-white transition-colors no-drag p-0.5"
            title={showVisualizer ? t('common.hideVisualizer') : t('common.showVisualizer')}
          >
            <Monitor size={12} />
          </button>
          <button onClick={onExitMiniMode} className="text-[#94a3b8] hover:text-white transition-colors no-drag">
            <Maximize2 size={14} />
          </button>
        </div>
      </div>

      <div className="text-center text-3xl mb-2 text-[#4ade80] drop-shadow-[0_0_6px_rgba(74,222,128,0.7)]">
        {formatTime(duration)}
      </div>

      {showVisualizer && (
        <div className="h-10 bg-[#020617] border border-[#1e293b] rounded-md overflow-hidden relative mb-2">
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
          <LazyVisualizer analyser={analyser} isActive={isRecording} />
        </div>
      )}

      <div className="flex items-center gap-1.5">
        <button
          onClick={isRecording ? onPause : onResume}
          className="flex-1 bg-[#1e293b] hover:bg-[#0f172a] border border-[#334155] rounded-md py-1.5 flex items-center justify-center gap-1 text-xs transition-colors no-drag"
        >
          {isRecording ? (
            <>
              <Pause size={14} />
              <span>{t('common.pause')}</span>
            </>
          ) : (
            <>
              <Play size={14} />
              <span>{t('common.resume')}</span>
            </>
          )}
        </button>
        <button
          onClick={onCaptureScreen}
          className="w-10 h-8 bg-[#1e293b] hover:bg-[#0f172a] border border-[#334155] rounded-md flex items-center justify-center transition-colors no-drag"
          title={t('common.captureScreen')}
        >
          <Camera size={14} />
        </button>
        <button
          onClick={onStop}
          className="w-14 bg-[#ef4444] hover:bg-[#dc2626] border border-[#7f1d1d] rounded-md py-1.5 flex items-center justify-center text-xs font-semibold transition-colors no-drag"
        >
          {t('common.stop')}
        </button>
      </div>
    </div>
  );
};

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export default React.memo(MiniFloatingPanel);

