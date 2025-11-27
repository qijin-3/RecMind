import { useState, useRef, useCallback, useEffect } from 'react';
import { RecordingState } from '../types';

interface UseAudioRecorderReturn {
  recordingState: RecordingState;
  startRecording: (enableMic: boolean, enableSystem: boolean) => Promise<void>;
  stopRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  audioBlob: Blob | null;
  audioMimeType: string | null; // 录制的音频 MIME 类型
  duration: number; // in seconds
  analyser: AnalyserNode | null;
}

/**
 * 检测浏览器支持的最佳音频录制格式
 * 优先级：audio/mp4 (M4A) > audio/webm;codecs=opus > 浏览器默认格式
 * @returns 支持的 MIME 类型字符串
 */
function getBestAudioMimeType(): string {
  const preferredTypes = [
    'audio/mp4', // Mac Safari 原生支持，直接就是 M4A
    'audio/webm;codecs=opus', // Chrome 支持，文件更小
    'audio/webm', // 降级选项
  ];

  for (const mimeType of preferredTypes) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      console.log(`使用音频格式: ${mimeType}`);
      return mimeType;
    }
  }

  // 如果都不支持，返回空字符串，让浏览器使用默认格式
  console.warn('未找到支持的音频格式，使用浏览器默认格式');
  return '';
}

export const useAudioRecorder = (): UseAudioRecorderReturn => {
  const [recordingState, setRecordingState] = useState<RecordingState>(RecordingState.IDLE);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioMimeType, setAudioMimeType] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamsRef = useRef<MediaStream[]>([]);
  const chunksRef = useRef<Blob[]>([]);
  const frameStartRef = useRef<number>(0);
  const timerRafRef = useRef<number | null>(null);
  const durationRef = useRef(0);

  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);
  const mimeTypeRef = useRef<string>(''); // 保存当前录制使用的 MIME 类型

  // Timer logic based on requestAnimationFrame, synchronized with performance.now
  useEffect(() => {
    if (recordingState === RecordingState.RECORDING) {
      frameStartRef.current = performance.now() - durationRef.current * 1000;
      const tick = () => {
        const elapsed = performance.now() - frameStartRef.current;
        setDuration(Math.floor(elapsed / 1000));
        timerRafRef.current = requestAnimationFrame(tick);
      };
      timerRafRef.current = requestAnimationFrame(tick);
    } else if (timerRafRef.current) {
      cancelAnimationFrame(timerRafRef.current);
      timerRafRef.current = null;
    }

    return () => {
      if (timerRafRef.current) {
        cancelAnimationFrame(timerRafRef.current);
        timerRafRef.current = null;
      }
    };
  }, [recordingState]);

  const startRecording = useCallback(async (enableMic: boolean, enableSystem: boolean) => {
    try {
      if (!enableMic && !enableSystem) {
        throw new Error("At least one audio source must be selected.");
      }

      setAudioBlob(null);
      chunksRef.current = [];
      setDuration(0);
      streamsRef.current = [];

      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = ctx;

      // Create a mixer node to combine mic and system audio
      const mixer = ctx.createGain();

      // Destination for the MediaRecorder
      const dest = ctx.createMediaStreamDestination();

      // Analyser for visualization
      const analyserNode = ctx.createAnalyser();
      analyserNode.fftSize = 256;
      setAnalyser(analyserNode);

      // Connect Mixer -> Destination (for recording)
      mixer.connect(dest);
      // Connect Mixer -> Analyser (for visuals)
      mixer.connect(analyserNode);

      // 1. Get Microphone
      if (enableMic) {
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          streamsRef.current.push(micStream);
          const micSource = ctx.createMediaStreamSource(micStream);
          micSource.connect(mixer);
        } catch (err) {
          console.error("Microphone access failed:", err);
          // If mic was the only source, this will effectively fail later or record silence if we don't stop.
          if (!enableSystem) throw err;
        }
      }

      // 2. Get System Audio
      if (enableSystem) {
        try {
          const displayStream = await navigator.mediaDevices.getDisplayMedia({ 
            video: true, 
            audio: true 
          });
          streamsRef.current.push(displayStream);
          
          if (displayStream.getAudioTracks().length > 0) {
            const sysSource = ctx.createMediaStreamSource(displayStream);
            sysSource.connect(mixer);
            
            // Stop recording if the user stops sharing the screen
            displayStream.getVideoTracks()[0].onended = () => {
              if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
              }
            };
          } else {
            console.warn("System audio was requested but not shared by user.");
            // If audio wasn't shared, we might want to alert the user, but for now we proceed if mic is active.
            displayStream.getTracks().forEach(t => t.stop());
          }
        } catch (err) {
          console.warn("System audio selection cancelled or failed", err);
          if (!enableMic) throw err; // If this was the only source, rethrow
        }
      }

      // 3. 检测并选择最佳音频格式
      const mimeType = getBestAudioMimeType();
      mimeTypeRef.current = mimeType;
      setAudioMimeType(mimeType);

      // 4. 创建 MediaRecorder，指定格式和比特率
      const options: MediaRecorderOptions = {
        mimeType: mimeType || undefined, // 如果为空字符串，使用浏览器默认
        audioBitsPerSecond: 96000, // 96kbps，平衡质量和文件大小
      };

      const recorder = new MediaRecorder(dest.stream, options);
      mediaRecorderRef.current = recorder;

      // 记录实际使用的 MIME 类型（可能与请求的不同）
      const actualMimeType = recorder.mimeType || mimeType || 'audio/webm';
      console.log(`实际使用的音频格式: ${actualMimeType}, 比特率: ${recorder.audioBitsPerSecond || 96000}bps`);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        // 使用实际录制的 MIME 类型创建 Blob
        const finalMimeType = recorder.mimeType || mimeTypeRef.current || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: finalMimeType });
        setAudioBlob(blob);
        setAudioMimeType(finalMimeType);
        
        // Stop all tracks in all collected streams
        streamsRef.current.forEach(stream => {
            stream.getTracks().forEach(t => t.stop());
        });
        streamsRef.current = [];

        if (audioContextRef.current?.state !== 'closed') {
           audioContextRef.current?.close();
        }
        setAnalyser(null);
        setRecordingState(RecordingState.IDLE);
      };

      recorder.start(100); // Collect 100ms chunks
      setRecordingState(RecordingState.RECORDING);

    } catch (error) {
      console.error("Failed to start recording:", error);
      alert("Could not start recording. Please ensure permissions are granted and a source is selected.");
      setRecordingState(RecordingState.IDLE);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setRecordingState(RecordingState.PAUSED);
    }
  }, []);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setRecordingState(RecordingState.RECORDING);
    }
  }, []);

  return {
    recordingState,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    audioBlob,
    audioMimeType,
    duration,
    analyser
  };
};