import React from 'react';
import { TFunction } from 'i18next';
import Mic from 'lucide-react/icons/mic';
import Monitor from 'lucide-react/icons/monitor';
import Download from 'lucide-react/icons/download';
import Trash2 from 'lucide-react/icons/trash-2';
import FileText from 'lucide-react/icons/file-text';
import Camera from 'lucide-react/icons/camera';
import Pause from 'lucide-react/icons/pause';
import Play from 'lucide-react/icons/play';
import StopCircle from 'lucide-react/icons/stop-circle';
import { RecordingState } from '../types';
import LazyVisualizer from './LazyVisualizer';

interface RecorderPanelProps {
  t: TFunction;
  recordingState: RecordingState;
  duration: number;
  analyser: AnalyserNode | null;
  isNotesOpen: boolean;
  isMinimized: boolean;
  hasNotes: boolean;
  audioBlob: Blob | null;
  configMic: boolean;
  configSys: boolean;
  onToggleMic: (value: boolean) => void;
  onToggleSys: (value: boolean) => void;
  onStart: () => void;
  onSaveRecording: () => void;
  onDiscard: () => void;
  onToggleNotes: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onCaptureScreen: () => void;
  formatTime: (seconds: number) => string;
}

interface RetroButtonProps {
  onClick?: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
  variant?: 'normal' | 'primary' | 'record' | 'round';
}

interface RetroToggleProps {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
}

/**
 * 录音面板组件，负责呈现计时屏、可视化波形以及录音/截图等控制区域。
 */
const RecorderPanel: React.FC<RecorderPanelProps> = ({
  t,
  recordingState,
  duration,
  analyser,
  isNotesOpen,
  isMinimized,
  hasNotes,
  audioBlob,
  configMic,
  configSys,
  onToggleMic,
  onToggleSys,
  onStart,
  onSaveRecording,
  onDiscard,
  onToggleNotes,
  onPause,
  onResume,
  onStop,
  onCaptureScreen,
  formatTime,
}) => {
  const isRecording = recordingState === RecordingState.RECORDING;
  const isIdle = recordingState === RecordingState.IDLE;

  return (
    <div
      className={`flex flex-col items-center w-full transition-all duration-300 z-20 shadow-md bg-[#d4d4d8] ${
        isNotesOpen ? 'flex-none shrink-0' : 'flex-1 min-h-0'
      } ${isMinimized ? 'p-3' : 'px-5 pt-3 pb-3'}`}
    >
      <div
        className={`w-full bg-[#111827] rounded-lg p-1 border-2 border-gray-500 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] ${
          isMinimized ? 'mb-2' : 'mb-2'
        }`}
      >
        <div className="bg-[#1f2937] rounded border border-gray-700 p-2 flex flex-col items-center relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
          <div className="flex justify-between w-full mb-1">
            <span className="text-[9px] text-gray-500 font-mono tracking-widest uppercase">{t('common.timer')}</span>
            <div className="flex gap-1 items-center">
              <div
                className={`w-1.5 h-1.5 rounded-full ${
                  isRecording ? 'bg-red-500 shadow-[0_0_5px_red]' : 'bg-red-900'
                }`}
              />
              <span className="text-[9px] text-gray-500 font-mono tracking-widest uppercase">{t('common.rec')}</span>
            </div>
          </div>
          <div
            className={`font-['Share_Tech_Mono'] text-3xl tracking-widest z-10 my-1 ${
              !isIdle ? 'text-[#4ade80] drop-shadow-[0_0_3px_rgba(74,222,128,0.6)]' : 'text-[#374151]'
            }`}
          >
            {formatTime(duration)}
          </div>
          <div className="w-full h-10 mt-2 border border-gray-700 bg-black relative">
            <div className="absolute inset-0 z-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none"></div>
            <LazyVisualizer analyser={analyser} isActive={isRecording} />
          </div>
        </div>
      </div>

      <div className={`flex flex-col items-center gap-2.5 w-full ${isNotesOpen ? '' : 'flex-1 justify-center min-h-0'}`}>
        {!isMinimized && isIdle && (
          <div className="w-full flex flex-col items-center gap-3 transition-opacity duration-300">
            {audioBlob ? (
              <div className="flex flex-col items-center w-full gap-2 animate-in fade-in duration-300">
                <div className="text-gray-600 font-mono text-xs uppercase tracking-widest mb-1">
                  {t('common.recordingFinished')}
                </div>
                <div className="flex gap-2 w-full">
                  <RetroButton onClick={onSaveRecording} className="flex-1 py-2.5 gap-2" variant="normal">
                    <Download size={14} />
                    <span className="font-bold text-xs">{t('common.save')}</span>
                  </RetroButton>
                  <RetroButton onClick={onDiscard} className="w-11 py-2.5 gap-2" variant="normal">
                    <Trash2 size={14} />
                  </RetroButton>
                  <RetroButton
                    onClick={onToggleNotes}
                    disabled={!hasNotes}
                    className="w-11 py-2.5 gap-2"
                    variant="normal"
                    title={hasNotes ? t('common.toggleNotes') : t('common.noNotesAvailable')}
                  >
                    <FileText size={14} />
                  </RetroButton>
                </div>
              </div>
            ) : (
              <>
                <div className="flex gap-4 px-4 py-2.5 rounded-lg bg-[#d1d5db] border border-white/50 shadow-inner w-full justify-center">
                  <RetroToggle label={t('common.mic')} icon={Mic} checked={configMic} onChange={onToggleMic} />
                  <div className="w-[1px] bg-gray-400 h-6 self-center"></div>
                  <RetroToggle label={t('common.sys')} icon={Monitor} checked={configSys} onChange={onToggleSys} />
                </div>
                <RetroButton
                  onClick={onStart}
                  disabled={!configMic && !configSys}
                  className="w-full py-2.5 gap-2"
                  variant="record"
                >
                  <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  <span className="font-mono text-sm font-bold tracking-widest uppercase">{t('common.rec')}</span>
                </RetroButton>
              </>
            )}
          </div>
        )}

        {!isIdle && (
          <div className="flex items-center justify-between w-full px-2 transition-opacity duration-300 animate-in fade-in">
            <div className="flex items-center gap-3 bg-[#e5e5e5] p-1.5 rounded-full border border-white shadow-inner">
              {isRecording ? (
                <RetroButton variant="round" onClick={onPause} className="text-yellow-600">
                  <Pause size={18} fill="currentColor" />
                </RetroButton>
              ) : (
                <RetroButton variant="round" onClick={onResume} className="text-green-600">
                  <Play size={18} fill="currentColor" />
                </RetroButton>
              )}
              <RetroButton variant="round" onClick={onStop} className="text-red-600 active:translate-y-1">
                <StopCircle size={18} fill="currentColor" />
              </RetroButton>
            </div>

            <div className="flex items-center gap-2">
              <RetroButton
                onClick={onCaptureScreen}
                className="w-11 py-2.5 gap-2"
                variant="normal"
                title={t('common.captureScreen')}
              >
                <Camera size={14} />
              </RetroButton>
              {!isMinimized && (
                <RetroButton
                  onClick={onToggleNotes}
                  className={`w-11 py-2.5 gap-2 ${isNotesOpen ? 'bg-blue-100 border-blue-300' : ''}`}
                  variant="normal"
                  title={t('common.toggleNotes')}
                >
                  <FileText size={14} />
                </RetroButton>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * 复古风格按钮，封装常用配色与阴影效果。
 */
const RetroButton: React.FC<RetroButtonProps> = ({
  onClick,
  children,
  disabled,
  className = '',
  variant = 'normal',
}) => {
  const baseStyles =
    'relative transition-all active:top-[1px] disabled:opacity-50 disabled:active:top-0 disabled:cursor-not-allowed flex items-center justify-center';
  const variants: Record<Required<RetroButtonProps>['variant'], string> = {
    normal:
      'bg-gradient-to-b from-gray-100 to-gray-200 border border-gray-400 rounded shadow-[inset_1px_1px_0_white,1px_1px_2px_rgba(0,0,0,0.15)] active:shadow-[inset_1px_1px_3px_rgba(0,0,0,0.1)] active:bg-gray-200 text-gray-700',
    primary:
      'bg-gradient-to-b from-gray-700 to-gray-800 border border-gray-900 rounded text-gray-100 shadow-[inset_1px_1px_0_rgba(255,255,255,0.2),1px_1px_2px_rgba(0,0,0,0.4)] active:shadow-[inset_2px_2px_5px_black]',
    record:
      'bg-gradient-to-b from-red-600 to-red-700 border border-red-900 rounded text-white shadow-[inset_1px_1px_0_rgba(255,255,255,0.3),1px_1px_3px_rgba(0,0,0,0.5)] active:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.6)] active:bg-red-800',
    round:
      'rounded-full w-12 h-12 bg-gradient-to-b from-[#e5e7eb] to-[#d1d5db] border-2 border-[#9ca3af] shadow-[3px_3px_6px_rgba(0,0,0,0.2),-3px_-3px_6px_rgba(255,255,255,0.8)] active:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2)] active:scale-95',
  };

  return (
    <button onClick={onClick} disabled={disabled} className={`${baseStyles} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
};

/**
 * 复古风格开关，支持图标与指示灯效果。
 */
const RetroToggle: React.FC<RetroToggleProps> = ({ label, checked, onChange, icon: Icon }) => (
  <div className="flex flex-row items-center gap-2 group">
    <div className="flex items-center gap-1.5">
      {Icon && <Icon size={14} className={`transition-colors ${checked ? 'text-gray-800' : 'text-gray-500'}`} />}
      <span className="font-mono text-xs font-bold tracking-wider uppercase text-gray-700 group-hover:text-gray-900 transition-colors">
        {label}
      </span>
    </div>
    <div
      onClick={() => onChange(!checked)}
      className={`w-14 h-7 rounded-full border-2 cursor-pointer relative transition-colors shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2)] ${
        checked ? 'bg-green-500 border-green-600' : 'bg-gray-300 border-gray-400'
      }`}
    >
      <div
        className={`absolute top-0.5 bottom-0.5 w-6 rounded-full bg-gradient-to-b from-white to-gray-200 border border-gray-400 shadow-[1px_1px_3px_rgba(0,0,0,0.3)] transition-all duration-200 ease-out flex items-center justify-center ${
          checked ? 'right-0.5' : 'left-0.5'
        }`}
      >
        {checked && <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_3px_rgba(74,222,128,0.6)]" />}
      </div>
    </div>
  </div>
);

export default React.memo(RecorderPanel);

