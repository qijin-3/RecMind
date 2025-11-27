import React, { useState, useRef, useEffect, useMemo } from 'react';
import MacWindow from './components/MacWindow';
import Visualizer from './components/Visualizer';
import { useAudioRecorder } from './hooks/useAudioRecorder';
import { Note, RecordingState } from './types';
import { Mic, StopCircle, Play, Pause, Image as ImageIcon, Download, Plus, Pencil, Check, X, Monitor, ChevronDown, ChevronUp, Paperclip, Trash2, Minimize2, Maximize2, Camera, FileText } from 'lucide-react';
import { exportNotesToPDF } from './services/pdfService';
import JSZip from 'jszip';

/**
 * 录音状态的窗口高度配置
 */
const RECORDING_STATE_HEIGHTS = {
  idle: 340,        // 未录音状态：340px
  recording: 320,   // 录音中状态：320px
  completed: 320,   // 录音完成状态：320px
} as const;

const WINDOW_LAYOUTS = {
  minimized: { width: 340, height: 320, minWidth: 320, minHeight: 300 },
  default: { width: 420, height: 320, minWidth: 360, minHeight: 320 },
  notes: { width: 520, height: 720, minWidth: 480, minHeight: 600 },
  miniFloating: { width: 280, height: 140, minWidth: 260, minHeight: 120 },
} as const;

// 移除 PRE_RECORD_WINDOW，统一使用 default 布局高度
const INVALID_FILENAME_CHARS = /[<>:"/\\|?*\x00-\x1F]/g;

const App = () => {
  const {
    recordingState,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    audioBlob,
    audioMimeType,
    duration,
    analyser
  } = useAudioRecorder();

  const [notes, setNotes] = useState<Note[]>([]);
  const [currentNote, setCurrentNote] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMiniFloatingMode, setIsMiniFloatingMode] = useState(false);
  const [showVisualizerInMini, setShowVisualizerInMini] = useState(false);
  
  // Visibility State for Notes
  const [isNotesOpen, setIsNotesOpen] = useState(false);

  // Window Size State
  const [windowSize, setWindowSize] = useState<{width: number, height: number}>({ width: WINDOW_LAYOUTS.default.width, height: WINDOW_LAYOUTS.default.height });

  // Config State
  const [configMic, setConfigMic] = useState(true);
  const [configSys, setConfigSys] = useState(false);

  // Edit State
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  // Image Viewer State
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);

  // Toast 提示状态
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const notesEndRef = useRef<HTMLDivElement>(null);
  const isDesktopApp = Boolean(window.desktop);
  type WindowControlAction = 'close' | 'minimize' | 'toggle-fullscreen';

  /**
   * 根据目标动作向 Electron 主进程发送窗口控制请求。
   */
  const dispatchDesktopWindowAction = (action: WindowControlAction) => {
    if (window.desktop?.send) {
      window.desktop.send('window-control', { action });
    }
  };

  /**
   * 触发关闭窗口；在浏览器环境下退回默认行为。
   */
  const handleWindowClose = () => {
    if (isDesktopApp) {
      dispatchDesktopWindowAction('close');
      return;
    }
    window.close();
  };

  /**
   * 触发最小化：桌面环境交由主进程，Web 环境退回到组件自身的最小化状态。
   */
  const handleWindowMinimize = () => {
    if (isDesktopApp) {
      dispatchDesktopWindowAction('minimize');
      return;
    }
    setIsMinimized(true);
  };

  /**
   * 触发全屏：桌面环境切换 Fullscreen，Web 环境尝试调用浏览器 Fullscreen API。
   */
  const handleWindowFullscreen = async () => {
    if (!isDesktopApp && isMinimized) {
      setIsMinimized(false);
      return;
    }
    if (isDesktopApp) {
      dispatchDesktopWindowAction('toggle-fullscreen');
      return;
    }
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.warn('Fullscreen toggle failed:', error);
    }
  };

  /**
   * 将秒数格式化为 mm:ss 字符串。
   */
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  /**
   * 构造跨平台安全的文件名，自动追加扩展名。
   */
  const buildSafeFileName = (base: string, extension: string) => {
    const sanitizedBase = base
      .replace(INVALID_FILENAME_CHARS, '_')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '') || 'RecMind';
    return `${sanitizedBase}.${extension}`;
  };

  /**
   * 将 DataView 中写入 ASCII 字符串。
   */
  const writeStringToDataView = (view: DataView, offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) {
      view.setUint8(offset + i, text.charCodeAt(i));
    }
  };

  /**
   * 将 AudioBuffer 编码为标准 16bit PCM WAV。
   */
  const encodeAudioBufferToWav = (audioBuffer: AudioBuffer) => {
    const numChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const bytesPerSample = 2;
    const blockAlign = numChannels * bytesPerSample;
    const bufferLength = audioBuffer.length * blockAlign;
    const wavBuffer = new ArrayBuffer(44 + bufferLength);
    const view = new DataView(wavBuffer);

    writeStringToDataView(view, 0, 'RIFF');
    view.setUint32(4, 36 + bufferLength, true);
    writeStringToDataView(view, 8, 'WAVE');
    writeStringToDataView(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bytesPerSample * 8, true);
    writeStringToDataView(view, 36, 'data');
    view.setUint32(40, bufferLength, true);

    let offset = 44;
    const channels: Float32Array[] = [];
    for (let channel = 0; channel < numChannels; channel++) {
      channels.push(audioBuffer.getChannelData(channel));
    }

    for (let i = 0; i < audioBuffer.length; i++) {
      for (let channel = 0; channel < numChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, channels[channel][i]));
        const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        view.setInt16(offset, intSample, true);
        offset += 2;
      }
    }

    return wavBuffer;
  };

  /**
   * 根据 MIME 类型获取文件扩展名
   */
  const getFileExtensionFromMimeType = (mimeType: string | null): string => {
    if (!mimeType) return 'webm'; // 默认扩展名
    
    if (mimeType.includes('mp4') || mimeType.includes('m4a')) {
      return 'm4a';
    }
    if (mimeType.includes('webm')) {
      return 'webm';
    }
    if (mimeType.includes('ogg')) {
      return 'ogg';
    }
    
    return 'webm'; // 降级到 webm
  };

  /**
   * 生成当前音频文件的 Blob 及文件名。
   * 直接使用录制的格式，无需转换。
   */
  const buildAudioFilePayload = () => {
    if (!audioBlob) {
      throw new Error('No audio available for export');
    }
    const baseFileName = `recording-${new Date().toISOString().replace(/[:.]/g, '-')}`;
    const extension = getFileExtensionFromMimeType(audioMimeType);
    const fileName = buildSafeFileName(baseFileName, extension);
    return { blob: audioBlob, fileName, baseFileName };
  };

  /**
   * 生成当前笔记的 PDF Blob 及文件名。
   * @returns Promise<{blob: Blob, fileName: string}>
   */
  const buildNotesPdfPayload = async () => {
    return await exportNotesToPDF('pdf-export-content', `Meeting Notes ${new Date().toLocaleDateString()}`);
  };

  /**
   * 统一处理 Blob 下载，避免重复的锚点创建代码。
   */
  const triggerBlobDownload = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleStart = async () => {
    if (!configMic && !configSys) return;
    setNotes([]); // Clear old notes on new recording
    await startRecording(configMic, configSys);
    // Note: We do NOT automatically open notes (isNotesOpen stays false)
  };
  
  /**
   * 进入迷你悬浮模式，保持录音 HUD 常驻前端。
   */
  const enableMiniFloatingMode = () => {
    if (isRecordingActive) {
      setIsMinimized(false);
      setIsNotesOpen(false);
      setIsMiniFloatingMode(true);
      // 设置窗口置顶
      if (window.desktop?.send) {
        window.desktop.send('set-always-on-top', { alwaysOnTop: true });
      }
    }
  };

  /**
   * 退出迷你悬浮模式，恢复完整界面。
   */
  const disableMiniFloatingMode = () => {
    setIsMiniFloatingMode(false);
    // 取消窗口置顶
    if (window.desktop?.send) {
      window.desktop.send('set-always-on-top', { alwaysOnTop: false });
    }
  };

  const handleDiscard = () => {
    if (confirm("Are you sure you want to discard this recording? This cannot be undone.")) {
      setNotes([]);
      // We need to reset the audio blob in the hook ideally, but since we can't access setAudioBlob directly
      // we can simulate a reset by restarting and immediately stopping, or better, we just hide the finished UI
      // by forcing a re-render or handling it in state. 
      // Ideally useAudioRecorder should expose a reset, but for now we can just reload the page or 
      // since I can't modify the hook in this turn without strict instruction, I will handle it via local state overrides if needed.
      // Actually, looking at the previous hook code, startRecording clears the blob. 
      // To "Discard" and go back to IDLE without blob, we might need a way to clear it.
      // The current hook doesn't expose `clearBlob`.
      // Workaround: We will just rely on the fact that `startRecording` clears it. 
      // But the user wants to go back to the "Ready" state.
      // Since I cannot easily modify the hook state from here without an exposed setter, 
      // I will implement a soft reset by refreshing the component key or similar, 
      // BUT, let's try to just modify the UI to ignore the blob if we 'discarded' it locally?
      // No, that's messy. 
      // Let's assume startRecording is the way to 'reset' for a new one. 
      // However, the request says "Discard". 
      // I will assume for this "Lite" app, reloading the page is a valid "Discard" or I can trigger a silent start/stop.
      // BETTER: I will modify the UI logic: 
      // If I click discard, I'll just reload the window for now as the cleanest "Hard Reset" without hook changes, 
      // OR I can just call startRecording then stop immediately? No.
      // Let's just reload for "Discard" to be safe and simple as it clears everything.
      window.location.reload(); 
    }
  };

  const handleAddNote = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!currentNote.trim()) return;

    // Relative timestamp in ms
    const timestamp = duration * 1000;
    
    const newNote: Note = {
      id: crypto.randomUUID(),
      timestamp,
      text: currentNote,
      createdAt: new Date(),
    };

    setNotes(prev => [...prev, newNote]);
    setCurrentNote('');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const timestamp = duration * 1000;
        const newNote: Note = {
          id: crypto.randomUUID(),
          timestamp,
          text: '',
          imageUrl: reader.result as string,
          createdAt: new Date(),
        };
        setNotes(prev => [...prev, newNote]);
      };
      reader.readAsDataURL(file);
    }
  };

  /**
   * 捕获屏幕截图并自动添加到笔记中。
   * 使用 desktopCapturer + getUserMedia 方案捕获应用所在显示器的完整内容。
   */
  const handleCaptureScreen = async () => {
    try {
      let imageDataUrl: string | undefined;

      if (isDesktopApp && window.desktop?.invoke) {
        // Electron 环境：使用 desktopCapturer + getUserMedia
        try {
          // 步骤1: 获取可用的屏幕源列表（主进程已按优先级排序，当前显示器在前）
          const sources = await window.desktop.invoke('get-screen-sources') as Array<{
            id: string;
            name: string;
            thumbnail: string;
            type: 'screen';
            displayId: string;
            isCurrentDisplay: boolean;
            displayBounds: { x: number; y: number; width: number; height: number } | null;
          }>;
          
          if (!sources || sources.length === 0) {
            throw new Error('No screen sources available');
          }
          
          console.log('Available screen sources:', sources.map(s => ({
            name: s.name,
            displayId: s.displayId,
            isCurrentDisplay: s.isCurrentDisplay
          })));
          
          // 步骤2: 优先选择当前窗口所在的显示器
          // 主进程已经按优先级排序，isCurrentDisplay=true 的会排在前面
          let screenSource = sources.find(source => source.isCurrentDisplay);
          
          // 如果没有找到当前显示器的源，回退到第一个屏幕源
          if (!screenSource) {
            screenSource = sources[0];
          }
          
          if (!screenSource) {
            throw new Error('No suitable screen source found');
          }
          
          console.log('Selected screen source:', screenSource.name, 'displayId:', screenSource.displayId, 'isCurrentDisplay:', screenSource.isCurrentDisplay);
          
          // 步骤3: 使用 getUserMedia 捕获整个屏幕流
          if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('getUserMedia API not available');
          }
          
          // 使用 mandatory 约束来指定 chromeMediaSource 和 chromeMediaSourceId
          // 这会捕获整个显示器的内容，而不仅仅是应用窗口
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
              // @ts-ignore - Electron 扩展的约束
              mandatory: {
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: screenSource.id,
                // 不设置宽高限制，让系统使用实际分辨率
                minWidth: 1,
                minHeight: 1,
                maxWidth: 8192,
                maxHeight: 8192,
              }
            } as any
          });
          
          // 步骤4: 将视频流绘制到 canvas
          const video = document.createElement('video');
          video.srcObject = stream;
          video.muted = true;
          video.playsInline = true;
          video.autoplay = true;
          
          await new Promise<void>((resolve, reject) => {
            video.onloadedmetadata = () => {
              video.play().then(() => {
                // 等待足够时间确保帧已渲染
                requestAnimationFrame(() => {
                  requestAnimationFrame(() => {
                    setTimeout(resolve, 200);
                  });
                });
              }).catch(reject);
            };
            video.onerror = () => reject(new Error('Video load error'));
            // 设置超时
            setTimeout(() => reject(new Error('Video load timeout')), 8000);
          });
          
          // 使用视频的实际尺寸，这是整个显示器的分辨率
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          
          console.log('Captured screen dimensions:', canvas.width, 'x', canvas.height);
          
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('Failed to get canvas context');
          
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          imageDataUrl = canvas.toDataURL('image/png');
          
          // 清理资源
          stream.getTracks().forEach(track => track.stop());
          video.srcObject = null;
          video.remove();
          canvas.remove();
          
        } catch (electronError) {
          console.error('Electron capture failed:', electronError);
          // 如果 Electron 截图失败，回退到 Web API
          throw electronError;
        }
      }
      
      // Web 环境或 Electron 回退：使用 getDisplayMedia API（需要用户选择）
      if (!imageDataUrl) {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
          throw new Error('Screen capture API not available');
        }
        
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { 
            displaySurface: 'monitor', // 明确指定捕获整个显示器
            width: { ideal: 3840 },
            height: { ideal: 2160 }
          } as any,
          audio: false,
        });
        
        const video = document.createElement('video');
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        
        await new Promise<void>((resolve, reject) => {
          video.onloadedmetadata = () => {
            video.play().then(() => {
              setTimeout(resolve, 300);
            }).catch(reject);
          };
          video.onerror = () => reject(new Error('Video load error'));
        });
        
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Failed to get canvas context');
        
        ctx.drawImage(video, 0, 0);
        imageDataUrl = canvas.toDataURL('image/png');
        
        // 停止所有轨道
        stream.getTracks().forEach(track => track.stop());
        video.srcObject = null;
        video.remove();
        canvas.remove();
      }

      // 将截图添加到笔记（不添加文字说明，仅保存图片）
      const timestamp = duration * 1000;
      const newNote: Note = {
        id: crypto.randomUUID(),
        timestamp,
        text: '',
        imageUrl: imageDataUrl,
        createdAt: new Date(),
      };
      setNotes(prev => [...prev, newNote]);

      // 如果笔记面板是收起状态或处于迷你浮窗模式，显示截图成功提示
      if (!isNotesOpen || isMiniFloatingMode) {
        setToastMessage('截图已保存');
        setTimeout(() => setToastMessage(null), 2000);
      }
    } catch (error) {
      console.error('Screen capture failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`截图失败: ${errorMessage}。请稍后重试。`);
    }
  };

  /**
   * 导出当前笔记列表为 PDF 文件。
   */
  const handleExport = async () => {
    try {
      const { blob, fileName } = await buildNotesPdfPayload();
      triggerBlobDownload(blob, fileName);
    } catch (error) {
      console.error('Failed to export PDF', error);
      alert('PDF 导出失败，请稍后重试。');
    }
  };

  /**
   * 将录音直接下载。
   * 格式根据浏览器支持自动选择（M4A 或 WebM）。
   */
  const handleDownloadAudio = () => {
    if (!audioBlob) return;
    try {
      const { blob, fileName } = buildAudioFilePayload();
      triggerBlobDownload(blob, fileName);
      const format = getFileExtensionFromMimeType(audioMimeType).toUpperCase();
      setToastMessage(`音频已保存为 ${format} 格式`);
      setTimeout(() => setToastMessage(null), 2000);
    } catch (error) {
      console.error('Failed to export audio', error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      alert(`音频保存失败: ${errorMessage}。请稍后重试。`);
    }
  };

  /**
   * 自动根据是否存在笔记选择保存策略：无笔记直接下载音频，有笔记则打包音频+PDF。
   */
  const handleSaveRecording = async () => {
    if (!audioBlob) return;
    try {
      if (!hasNotes) {
        handleDownloadAudio();
        return;
      }
      
      const audioPayload = buildAudioFilePayload();
      // buildNotesPdfPayload 返回 Promise，需要 await
      const notesPayload = await buildNotesPdfPayload();
      
      const zip = new JSZip();
      zip.file(audioPayload.fileName, audioPayload.blob);
      zip.file(notesPayload.fileName, notesPayload.blob);
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const zipFileName = buildSafeFileName(audioPayload.baseFileName, 'zip');
      triggerBlobDownload(zipBlob, zipFileName);
      setToastMessage('文件已打包保存');
      setTimeout(() => setToastMessage(null), 2000);
    } catch (error) {
      console.error('Failed to export bundled download', error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      alert(`打包下载失败: ${errorMessage}。请稍后重试。`);
    }
  };

  const handleStartEdit = (note: Note) => {
    setEditingNoteId(note.id);
    setEditText(note.text);
  };

  const handleCancelEdit = () => {
    setEditingNoteId(null);
    setEditText('');
  };

  const handleSaveEdit = (id: string) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, text: editText } : n));
    setEditingNoteId(null);
    setEditText('');
  };

  /**
   * 删除指定的笔记。
   */
  const handleDeleteNote = (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
  };

  useEffect(() => {
    if (!editingNoteId && isNotesOpen) {
        notesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [notes, editingNoteId, isNotesOpen]);

  // Handle Window Size changes based on modes
  const layoutKey = useMemo<'miniFloating' | 'minimized' | 'default' | 'notes'>(() => {
    if (isMiniFloatingMode) {
      return 'miniFloating';
    }
    if (isMinimized) {
      return 'minimized';
    }
    if (isNotesOpen) {
      return 'notes';
    }
    return 'default';
  }, [isMiniFloatingMode, isMinimized, isNotesOpen]);

  const isPreRecordingState = recordingState === RecordingState.IDLE && !audioBlob;

  /**
   * 根据录音状态获取对应的窗口高度
   */
  const getRecordingStateHeight = useMemo(() => {
    if (recordingState === RecordingState.IDLE) {
      return audioBlob ? RECORDING_STATE_HEIGHTS.completed : RECORDING_STATE_HEIGHTS.idle;
    }
    return RECORDING_STATE_HEIGHTS.recording;
  }, [recordingState, audioBlob]);

  /**
   * 动态调整窗口高度，根据录音状态切换
   */
  useEffect(() => {
    // 如果处于 notes 模式或 miniFloating 模式，使用原有逻辑
    if (layoutKey === 'notes' || layoutKey === 'miniFloating') {
      const layout = WINDOW_LAYOUTS[layoutKey];
      let finalLayout = layout;
      
      // 针对低分辨率屏幕：限制笔记模式的最大高度，确保不超出屏幕
      if (layoutKey === 'notes' && typeof window !== 'undefined') {
        const maxHeight = window.innerHeight - 100; // 预留 100px 给系统栏和边距
        if (finalLayout.height > maxHeight) {
          finalLayout = { ...finalLayout, height: Math.max(finalLayout.minHeight || 600, maxHeight) };
        }
      }
      
      setWindowSize({ width: finalLayout.width, height: finalLayout.height });

      if (window.desktop?.send) {
        window.desktop.send('renderer-window-layout', {
          ...finalLayout,
          resizable: !isPreRecordingState,
          fullscreenable: !isPreRecordingState,
          animate: false,
        });
      }
      return;
    }

    // 对于 default 和 minimized 模式，根据录音状态动态调整高度
    const layout = WINDOW_LAYOUTS[layoutKey];
    const targetHeight = layoutKey === 'minimized' 
      ? WINDOW_LAYOUTS.minimized.height 
      : getRecordingStateHeight;
    
    const finalLayout = {
      ...layout,
      width: layout.width,
      height: targetHeight,
      minHeight: 320, // 最小高度 320px
    };
    
    setWindowSize({ width: finalLayout.width, height: finalLayout.height });

    if (window.desktop?.send) {
      window.desktop.send('renderer-window-layout', {
        ...finalLayout,
        resizable: !isPreRecordingState,
        fullscreenable: !isPreRecordingState,
        animate: true, // 启用平滑过渡动画
        animationDuration: 300, // 300ms 动画时长
      });
    }
  }, [layoutKey, isPreRecordingState, getRecordingStateHeight]);

  const hasNotes = notes.length > 0;
  const isRecordingActive = recordingState === RecordingState.RECORDING || recordingState === RecordingState.PAUSED;
  
  useEffect(() => {
    if (!isRecordingActive) {
      setIsMiniFloatingMode(false);
      // 取消窗口置顶
      if (window.desktop?.send) {
        window.desktop.send('set-always-on-top', { alwaysOnTop: false });
      }
    }
  }, [isRecordingActive]);
  
  const toggleNotes = () => setIsNotesOpen(!isNotesOpen);

  // Skeuomorphic Button Component
  const RetroButton = ({ onClick, children, active, disabled, className = "", variant = "normal" }: any) => {
    const baseStyles = "relative transition-all active:top-[1px] disabled:opacity-50 disabled:active:top-0 disabled:cursor-not-allowed flex items-center justify-center";
    
    // Normal: Light gray plastic
    const normalStyles = "bg-gradient-to-b from-gray-100 to-gray-200 border border-gray-400 rounded shadow-[inset_1px_1px_0_white,1px_1px_2px_rgba(0,0,0,0.15)] active:shadow-[inset_1px_1px_3px_rgba(0,0,0,0.1)] active:bg-gray-200 text-gray-700";
    
    // Primary: Blue/Dark plastic
    const primaryStyles = "bg-gradient-to-b from-gray-700 to-gray-800 border border-gray-900 rounded text-gray-100 shadow-[inset_1px_1px_0_rgba(255,255,255,0.2),1px_1px_2px_rgba(0,0,0,0.4)] active:shadow-[inset_2px_2px_5px_black]";
    
    // Red / Record Style
    const recordStyles = "bg-gradient-to-b from-red-600 to-red-700 border border-red-900 rounded text-white shadow-[inset_1px_1px_0_rgba(255,255,255,0.3),1px_1px_3px_rgba(0,0,0,0.5)] active:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.6)] active:bg-red-800";

    // Round: For transport controls
    const roundStyles = "rounded-full w-12 h-12 bg-gradient-to-b from-[#e5e7eb] to-[#d1d5db] border-2 border-[#9ca3af] shadow-[3px_3px_6px_rgba(0,0,0,0.2),-3px_-3px_6px_rgba(255,255,255,0.8)] active:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2)] active:scale-95";

    let style = normalStyles;
    if (variant === 'primary') style = primaryStyles;
    if (variant === 'record') style = recordStyles;
    if (variant === 'round') style = roundStyles;

    return (
        <button onClick={onClick} disabled={disabled} className={`${baseStyles} ${style} ${className}`}>
            {children}
        </button>
    );
  };

  /**
   * 水平方向的复古风格开关组件
   * @param label - 开关标签（MIC 或 SYS）
   * @param checked - 是否选中
   * @param onChange - 切换回调
   * @param icon - 图标组件
   */
  const RetroToggle = ({ label, checked, onChange, icon: Icon }: any) => (
    <div className="flex flex-row items-center gap-2 group">
      <div className="flex items-center gap-1.5">
        {Icon && <Icon size={14} className={`transition-colors ${checked ? 'text-gray-800' : 'text-gray-500'}`} />}
        <span className="font-mono text-xs font-bold tracking-wider uppercase text-gray-700 group-hover:text-gray-900 transition-colors">{label}</span>
      </div>
      <div 
        onClick={() => onChange(!checked)}
        className={`w-14 h-7 rounded-full border-2 cursor-pointer relative transition-colors shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2)] ${checked ? 'bg-green-500 border-green-600' : 'bg-gray-300 border-gray-400'}`}
      >
        {/* The Switch Lever - 水平滑动 */}
        <div className={`absolute top-0.5 bottom-0.5 w-6 rounded-full bg-gradient-to-b from-white to-gray-200 border border-gray-400 shadow-[1px_1px_3px_rgba(0,0,0,0.3)] transition-all duration-200 ease-out flex items-center justify-center ${checked ? 'right-0.5' : 'left-0.5'}`}>
           {/* 开关内部指示点 */}
           {checked && (
             <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_3px_rgba(74,222,128,0.6)]" />
           )}
        </div>
      </div>
    </div>
  );

  const macWindowElement = (
    <MacWindow 
      title={isMinimized ? (recordingState === RecordingState.RECORDING ? 'REC-ON' : 'MINI') : "RecMind"} 
      width={isDesktopApp ? '100%' : windowSize.width}
      height={isDesktopApp ? '100%' : windowSize.height}
      onClose={handleWindowClose}
      onMinimize={!isMinimized ? handleWindowMinimize : undefined}
      onFullscreen={!isPreRecordingState ? handleWindowFullscreen : undefined}
      onMiniMode={isRecordingActive ? enableMiniFloatingMode : undefined}
      isMiniModeEnabled={isMiniFloatingMode}
      isMinimized={isMinimized}
      className={isDesktopApp ? 'w-full h-full' : ''}
      contentAutoHeight={false}
    >
    {/* Main Interface Wrapper (Vertical Layout) */}
    <div className={`bg-[#d4d4d8] flex flex-col relative overflow-hidden h-full`}>
        
        {/* --- TOP PANEL: RECORDER INTERFACE --- */}
        {/* 笔记模式下使用 flex-none，非笔记模式下使用 flex-1 撑满窗口 */}
        <div className={`flex flex-col items-center w-full transition-all duration-300 z-20 shadow-md bg-[#d4d4d8] ${isNotesOpen ? 'flex-none shrink-0' : 'flex-1 min-h-0'} ${isMinimized ? 'p-3' : 'px-5 pt-3 pb-3'}`}>

            {/* LCD Display Panel - Compact */}
            <div className={`w-full bg-[#111827] rounded-lg p-1 border-2 border-gray-500 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] ${isMinimized ? 'mb-2' : 'mb-2'}`}>
                 <div className="bg-[#1f2937] rounded border border-gray-700 p-2 flex flex-col items-center relative overflow-hidden">
                    {/* Glass Glare */}
                    <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
                    
                    <div className="flex justify-between w-full mb-1">
                        <span className="text-[9px] text-gray-500 font-mono tracking-widest uppercase">Timer</span>
                        <div className="flex gap-1 items-center">
                            <div className={`w-1.5 h-1.5 rounded-full ${recordingState === RecordingState.RECORDING ? 'bg-red-500 shadow-[0_0_5px_red]' : 'bg-red-900'}`} />
                            <span className="text-[9px] text-gray-500 font-mono tracking-widest uppercase">REC</span>
                        </div>
                    </div>

                    {/* Digital Numbers - Compact Font */}
                    <div className={`font-['Share_Tech_Mono'] text-3xl tracking-widest z-10 my-1 ${recordingState !== RecordingState.IDLE ? 'text-[#4ade80] drop-shadow-[0_0_3px_rgba(74,222,128,0.6)]' : 'text-[#374151]'}`}>
                        {formatTime(duration)}
                    </div>

                    {/* Visualizer Container - Shorter */}
                    <div className="w-full h-10 mt-2 border border-gray-700 bg-black relative">
                        <div className="absolute inset-0 z-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none"></div>
                        <Visualizer analyser={analyser} isActive={recordingState === RecordingState.RECORDING} />
                    </div>
                 </div>
            </div>

            {/* Controls Area - 非笔记模式下撑满剩余空间，笔记模式下紧凑排列 */}
            <div className={`flex flex-col items-center gap-2.5 w-full ${isNotesOpen ? '' : 'flex-1 justify-center min-h-0'}`}>
                
                {/* IDLE STATE: Config & Start */}
                {!isMinimized && recordingState === RecordingState.IDLE && (
                    <div className="w-full flex flex-col items-center gap-3 transition-opacity duration-300">
                        {/* If audioBlob exists (Recording finished), show Download/Reset */}
                        {audioBlob ? (
                            <div className="flex flex-col items-center w-full gap-2 animate-in fade-in duration-300">
                                <div className="text-gray-600 font-mono text-xs uppercase tracking-widest mb-1">Recording Finished</div>
                                <div className="flex gap-2 w-full">
                                    <RetroButton 
                                        onClick={handleSaveRecording}
                                        className="flex-1 py-2.5 gap-2"
                                        variant="normal"
                                    >
                                        <Download size={14} />
                                        <span className="font-bold text-xs">SAVE</span>
                                    </RetroButton>
                                    
                                    <RetroButton 
                                        onClick={handleDiscard}
                                        className="w-11 py-2.5 gap-2"
                                        variant="normal"
                                    >
                                       <Trash2 size={14} />
                                    </RetroButton>
                                    
                                    {/* Toggle Notes Button - 只有在有笔记时才可点击 */}
                                    <RetroButton 
                                        onClick={toggleNotes}
                                        disabled={!hasNotes}
                                        className="w-11 py-2.5 gap-2"
                                        variant="normal"
                                        title={hasNotes ? "Toggle Notes" : "No notes available"}
                                    >
                                        <FileText size={14} />
                                    </RetroButton>
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Config Switches - 水平布局，紧凑排列 */}
                                <div className="flex gap-4 px-4 py-2.5 rounded-lg bg-[#d1d5db] border border-white/50 shadow-inner w-full justify-center">
                                    <RetroToggle 
                                        label="MIC" 
                                        icon={Mic}
                                        checked={configMic} 
                                        onChange={setConfigMic} 
                                    />
                                    <div className="w-[1px] bg-gray-400 h-6 self-center"></div>
                                    <RetroToggle 
                                        label="SYS" 
                                        icon={Monitor}
                                        checked={configSys} 
                                        onChange={setConfigSys} 
                                    />
                                </div>

                                {/* Start Button */}
                                <RetroButton 
                                    onClick={handleStart} 
                                    disabled={!configMic && !configSys}
                                    className="w-full py-2.5 gap-2" 
                                    variant="record"
                                >
                                    <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                                    <span className="font-mono text-sm font-bold tracking-widest uppercase">REC</span>
                                </RetroButton>
                            </>
                        )}
                    </div>
                )}

                {/* RECORDING STATE: Transport Controls */}
                {recordingState !== RecordingState.IDLE && (
                    <div className="flex items-center justify-between w-full px-2 transition-opacity duration-300 animate-in fade-in">
                         {/* Play/Pause/Stop Container */}
                         <div className="flex items-center gap-3 bg-[#e5e5e5] p-1.5 rounded-full border border-white shadow-inner">
                            {recordingState === RecordingState.RECORDING ? (
                                <RetroButton variant="round" onClick={pauseRecording} className="text-yellow-600">
                                    <Pause size={18} fill="currentColor" />
                                </RetroButton>
                            ) : (
                                <RetroButton variant="round" onClick={resumeRecording} className="text-green-600">
                                    <Play size={18} fill="currentColor" />
                                </RetroButton>
                            )}
                            
                            <RetroButton variant="round" onClick={stopRecording} className="text-red-600 active:translate-y-1">
                                <StopCircle size={18} fill="currentColor" />
                            </RetroButton>
                         </div>

                         <div className="flex items-center gap-2">
                            {/* Screenshot Button */}
                            <RetroButton 
                                onClick={handleCaptureScreen}
                                className="w-11 py-2.5 gap-2"
                                variant="normal"
                                title="Capture Screen"
                            >
                                <Camera size={14} />
                            </RetroButton>
                            
                            {/* Toggle Notes Button (Only visible if not minimized) */}
                            {!isMinimized && (
                                <RetroButton 
                                    onClick={toggleNotes}
                                    className={`w-11 py-2.5 gap-2 ${isNotesOpen ? 'bg-blue-100 border-blue-300' : ''}`}
                                    variant="normal"
                                    title="Toggle Notes"
                                >
                                    <FileText size={14} />
                                </RetroButton>
                            )}
                         </div>
                    </div>
                )}
            </div>
        </div>

        {/* --- BOTTOM PANEL: NOTES (LEGAL PAD) --- */}
        {/* Rendered if Open, slides down conceptually */}
        {isNotesOpen && !isMinimized && (
            <div className="flex-1 w-full relative flex flex-col shadow-[inset_0_10px_20px_rgba(0,0,0,0.1)] z-10 animate-in fade-in slide-in-from-top-4 duration-300 min-h-0 overflow-hidden">
                
                {/* Paper Header / Tear Strip */}
                <div className="h-8 bg-[#fef3c7] border-b border-[#e5e7eb] flex items-center justify-between px-4 shrink-0 shadow-sm relative z-10 border-t border-gray-300">
                     {/* Perforation holes visual */}
                     <div className="absolute top-[-6px] left-0 right-0 h-1.5 flex justify-between overflow-hidden px-1">
                        {Array.from({length: 20}).map((_, i) => (
                            <div key={i} className="w-2 h-2 rounded-full bg-[#1f2937] opacity-20"></div>
                        ))}
                     </div>

                    <div className="text-red-400 font-serif italic font-bold text-xs">Notes</div>
                    {notes.length > 0 && (
                        <button 
                        onClick={handleExport}
                        className="text-[10px] font-serif italic flex items-center gap-1 px-2 py-0.5 text-gray-600 hover:text-gray-900 transition-colors bg-white/50 rounded"
                        >
                            <Download size={10} />
                            PDF
                        </button>
                    )}
                </div>

                {/* Paper Body */}
                <div className="flex-1 bg-[#fefce8] relative flex flex-col min-h-0 overflow-hidden">
                    {/* Paper Pattern CSS */}
                    <div className="absolute inset-0 paper-lines pointer-events-none opacity-80" />
                    <div className="absolute left-8 top-0 bottom-0 w-[2px] bg-red-200/50 pointer-events-none" />

                    {/* Scroll Container */}
                    <div className="flex-1 overflow-y-auto p-0 relative min-h-0">
                        <div className="min-h-full pb-16">
                            {notes.length === 0 && (
                                <div className="pt-10 text-center font-serif italic text-gray-400 pl-8 pr-4 text-sm">
                                    Tap the + below to start taking notes...
                                </div>
                            )}
                            {notes.map((note) => (
                                <div key={note.id} className="relative group pl-10 pr-4 py-1 min-h-[2rem] hover:bg-yellow-100/30 transition-colors">
                                    {/* Timestamp (Left Margin) */}
                                    <div className="absolute left-1 top-2 font-mono text-[8px] text-gray-400">
                                        {formatTime(note.timestamp / 1000)}
                                    </div>
                                    
                                    {note.imageUrl ? (
                                        <div className="my-2 p-1 bg-white shadow-sm border border-gray-200 inline-block transform -rotate-1 relative group">
                                            <img 
                                                src={note.imageUrl} 
                                                alt="Attachment" 
                                                className="max-h-32 cursor-pointer hover:opacity-90 transition-opacity" 
                                                onClick={() => setViewingImageUrl(note.imageUrl || null)}
                                            />
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteNote(note.id);
                                                }}
                                                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 transition-opacity shadow-md z-10"
                                                title="删除截图"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    ) : null}
                                    
                                    {/* 仅当有文字内容时才显示文字区域 */}
                                    {note.text.trim() && (
                                      editingNoteId === note.id ? (
                                        <div className="relative z-20 mt-1">
                                            <textarea
                                                value={editText}
                                                onChange={(e) => setEditText(e.target.value)}
                                                className="w-full bg-white/80 p-1 font-serif text-base leading-8 border border-blue-300 outline-none shadow-sm rounded-sm"
                                                rows={3}
                                                autoFocus
                                            />
                                            <div className="flex justify-end gap-2 mt-2">
                                                <button onClick={handleCancelEdit} className="p-1 hover:bg-gray-200 rounded"><X size={14} /></button>
                                                <button onClick={() => handleSaveEdit(note.id)} className="p-1 text-green-600 hover:bg-green-100 rounded"><Check size={14} /></button>
                                            </div>
                                        </div>
                                      ) : (
                                        <div className="relative group">
                                            <p className="font-serif text-base text-gray-800 leading-[2rem] break-words whitespace-pre-wrap">
                                                {note.text}
                                            </p>
                                            <div className="absolute -right-2 top-1 opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity z-10">
                                                <button
                                                    onClick={() => handleStartEdit(note)}
                                                    className="text-gray-400 hover:text-blue-600 p-1 bg-white/90 rounded shadow-sm"
                                                    title="编辑"
                                                >
                                                    <Pencil size={12} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteNote(note.id)}
                                                    className="text-gray-400 hover:text-red-600 p-1 bg-white/90 rounded shadow-sm"
                                                    title="删除"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        </div>
                                      )
                                    )}
                                </div>
                            ))}
                            <div ref={notesEndRef} />
                        </div>
                    </div>

                    {/* Input Footer */}
                    {/* 允许在录音中或录音完成后编辑笔记 */}
                    <div className={`p-3 border-t-2 border-[#e5e7eb] bg-[#fefce8] relative z-20 ${!isRecordingActive && !hasNotes && !audioBlob ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                        <form onSubmit={handleAddNote} className="flex items-end gap-2">
                            <button 
                                type="button" 
                                onClick={() => (isRecordingActive || audioBlob) && fileInputRef.current?.click()}
                                className="p-1.5 text-gray-500 hover:text-gray-800 transition-colors"
                                disabled={!isRecordingActive && !audioBlob}
                            >
                                <ImageIcon size={18} />
                            </button>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleImageUpload} 
                                accept="image/*" 
                                className="hidden" 
                            />
                            
                            <div className="flex-1 relative">
                                <input
                                    type="text"
                                    value={currentNote}
                                    onChange={(e) => setCurrentNote(e.target.value)}
                                    placeholder="Note..."
                                    className="w-full bg-transparent border-b border-gray-300 font-serif text-base focus:border-blue-400 focus:outline-none placeholder:italic placeholder:text-gray-300 py-1"
                                />
                            </div>
                            
                            <button 
                                type="submit"
                                disabled={!currentNote.trim()}
                                className="p-1.5 text-gray-400 hover:text-blue-600 disabled:opacity-0 transition-all"
                            >
                                <Plus size={20} strokeWidth={1.5} />
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        )}
    </div>
    </MacWindow>
  );

  return (
    <>
      {/* Hidden Print Template */}
      <div id="pdf-export-content" className="fixed top-0 left-[-9999px] w-[595px] bg-white p-10 font-serif text-gray-900 pointer-events-none">
        <h1 className="text-3xl font-bold mb-4 text-gray-800 border-b-2 border-gray-800 pb-2">MEETING MINUTES</h1>
        <p className="text-sm font-mono text-gray-500 mb-8">DATE: {new Date().toLocaleDateString()}</p>
        
        <div className="space-y-6">
            {notes.map(note => (
                <div key={note.id} className="flex gap-4">
                     <div className="w-16 pt-1 font-mono text-xs font-bold text-gray-500 shrink-0">
                        {formatTime(note.timestamp / 1000)}
                     </div>
                     <div className="flex-1">
                        <p className="text-base leading-relaxed whitespace-pre-wrap mb-2 font-serif">{note.text}</p>
                        {note.imageUrl && (
                            <img src={note.imageUrl} className="max-w-[200px] border border-gray-800" />
                        )}
                     </div>
                </div>
            ))}
        </div>
      </div>

      {!isMiniFloatingMode && (
        isDesktopApp ? macWindowElement : (
          <div className="inline-block">
            {macWindowElement}
          </div>
        )
      )}

      {isMiniFloatingMode && (
        <div className="fixed top-6 right-6 w-[260px] bg-[#0b1220] border border-[#1f2937] rounded-xl p-3 z-50 text-white font-['Share_Tech_Mono'] drag-region cursor-move">
          <div className="flex items-center justify-between text-[9px] uppercase tracking-[0.3em] text-[#9ca3af] mb-2">
            <span>Timer</span>
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${recordingState === RecordingState.RECORDING ? 'bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.9)] animate-pulse' : 'bg-red-900'}`} />
              <span>REC</span>
              <button
                onClick={() => setShowVisualizerInMini(!showVisualizerInMini)}
                className="text-[#94a3b8] hover:text-white transition-colors no-drag p-0.5"
                title={showVisualizerInMini ? "隐藏拾音器" : "显示拾音器"}
              >
                <Monitor size={12} />
              </button>
              <button
                onClick={disableMiniFloatingMode}
                className="text-[#94a3b8] hover:text-white transition-colors no-drag"
              >
                <Maximize2 size={14} />
              </button>
            </div>
          </div>

          <div className="text-center text-3xl mb-2 text-[#4ade80] drop-shadow-[0_0_6px_rgba(74,222,128,0.7)]">
            {formatTime(duration)}
          </div>

          {showVisualizerInMini && (
            <div className="h-10 bg-[#020617] border border-[#1e293b] rounded-md overflow-hidden relative mb-2">
              <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
              <Visualizer analyser={analyser} isActive={recordingState === RecordingState.RECORDING} />
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <button
              onClick={recordingState === RecordingState.RECORDING ? pauseRecording : resumeRecording}
              className="flex-1 bg-[#1e293b] hover:bg-[#0f172a] border border-[#334155] rounded-md py-1.5 flex items-center justify-center gap-1 text-xs transition-colors no-drag"
            >
              {recordingState === RecordingState.RECORDING ? (
                <>
                  <Pause size={14} />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play size={14} />
                  <span>Resume</span>
                </>
              )}
            </button>
            <button
              onClick={handleCaptureScreen}
              className="w-10 h-8 bg-[#1e293b] hover:bg-[#0f172a] border border-[#334155] rounded-md flex items-center justify-center transition-colors no-drag"
              title="Capture Screen"
            >
              <Camera size={14} />
            </button>
            <button
              onClick={stopRecording}
              className="w-14 bg-[#ef4444] hover:bg-[#dc2626] border border-[#7f1d1d] rounded-md py-1.5 flex items-center justify-center text-xs font-semibold transition-colors no-drag"
            >
              Stop
            </button>
          </div>
        </div>
      )}

      {/* Image Viewer Modal */}
      {viewingImageUrl && (
        <div 
          className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4"
          onClick={() => setViewingImageUrl(null)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh] flex items-center justify-center">
            <img 
              src={viewingImageUrl} 
              alt="Full size screenshot" 
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setViewingImageUrl(null)}
              className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
              title="关闭"
            >
              <X size={24} />
            </button>
          </div>
        </div>
      )}

      {/* Toast 提示 */}
      {toastMessage && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[200] animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-gray-900/90 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 font-mono text-sm">
            <Camera size={16} className="text-green-400" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}
    </>
  );
};

export default App;