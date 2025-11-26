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

declare global {
  interface DesktopBridge {
    platform: NodeJS.Platform;
    version: string;
    send: (channel: string, payload?: unknown) => void;
    on: (channel: string, listener: (...args: unknown[]) => void) => () => void;
    invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
  }

  interface Window {
    desktop?: DesktopBridge;
  }
}

export {};