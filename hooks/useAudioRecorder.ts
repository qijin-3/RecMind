import { useState, useRef, useCallback, useEffect } from 'react';
import { RecordingState } from '../types';

interface UseAudioRecorderReturn {
  recordingState: RecordingState;
  startRecording: (enableMic: boolean, enableSystem: boolean) => Promise<void>;
  stopRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  audioBlob: Blob | null;
  duration: number; // in seconds
  analyser: AnalyserNode | null;
}

export const useAudioRecorder = (): UseAudioRecorderReturn => {
  const [recordingState, setRecordingState] = useState<RecordingState>(RecordingState.IDLE);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [duration, setDuration] = useState(0);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamsRef = useRef<MediaStream[]>([]);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const timerIntervalRef = useRef<number | null>(null);

  // Timer logic
  useEffect(() => {
    if (recordingState === RecordingState.RECORDING) {
      const start = Date.now() - (duration * 1000);
      startTimeRef.current = start;
      timerIntervalRef.current = window.setInterval(() => {
        setDuration(Math.floor((Date.now() - start) / 1000));
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
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

      // 3. Start Recorder
      const recorder = new MediaRecorder(dest.stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        
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
    duration,
    analyser
  };
};