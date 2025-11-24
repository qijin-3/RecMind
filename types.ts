export interface Note {
  id: string;
  timestamp: number; // Milliseconds relative to recording start
  text: string;
  imageUrl?: string;
  createdAt: Date;
}

export enum RecordingState {
  IDLE = 'IDLE',
  RECORDING = 'RECORDING',
  PAUSED = 'PAUSED',
}

export interface AudioDeviceConfig {
  micId?: string;
  includeSystemAudio: boolean;
}