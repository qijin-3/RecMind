import React from 'react';

interface MacWindowProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
  onClose?: () => void;
  onMinimize?: () => void;
  onFullscreen?: () => void;
  isMinimized?: boolean;
  width?: number | string;
  height?: number | 'auto' | string;
}

/**
 * MacWindow 组件用于模拟复古 Mac 外壳，并承载应用内容。
 */
const MacWindow: React.FC<MacWindowProps> = ({ 
  children, 
  title, 
  className = "", 
  onClose,
  onMinimize,
  onFullscreen,
  isMinimized = false,
  width,
  height,
}) => {
  const resolvedWidth = typeof width === 'number' ? `${width}px` : width;
  let resolvedHeight: string | undefined;

  if (typeof height === 'number') {
    resolvedHeight = `${height}px`;
  } else if (height === 'auto') {
    resolvedHeight = 'auto';
  } else {
    resolvedHeight = height;
  }

  return (
    <div 
      style={{ 
        width: resolvedWidth, 
        height: resolvedHeight
      }}
      className={`relative flex flex-col transition-all duration-200 ease-out ${className}`}
    >
      
      {/* Outer Casing / Bezel */}
      <div className="absolute inset-0 bg-[#d4d4d8] rounded-xl border-b-4 border-r-4 border-[#9ca3af] z-0 pointer-events-none"></div>
      
      {/* Metallic Texture Overlay */}
      <div className="absolute inset-[3px] rounded-lg bg-gradient-to-br from-[#f3f4f6] to-[#d1d5db] z-0 pointer-events-none border border-white/50"></div>

      {/* Content Container */}
      <div className="relative z-10 flex flex-col h-full rounded-lg overflow-hidden m-[6px] border border-gray-400 bg-[#e5e5e5]">
        
        {/* Retro Header / Faceplate Top */}
        <div 
          className="h-10 bg-gradient-to-b from-[#e5e7eb] to-[#d1d5db] border-b border-gray-400 flex items-center justify-between px-3 select-none shrink-0 shadow-sm drag-region"
          onDoubleClick={onFullscreen}
        >
          
          {/* Jewel Buttons */}
          <div className="flex items-center gap-2.5 no-drag">
            <button
              type="button"
              onClick={onClose}
              aria-label="Close window"
              className={`w-3.5 h-3.5 rounded-full bg-red-500 border border-red-700 shadow-[inset_1px_1px_2px_rgba(255,255,255,0.5),1px_1px_1px_rgba(0,0,0,0.2)] ${onClose ? 'cursor-pointer active:brightness-90' : 'opacity-50 cursor-not-allowed'}`}
            >
              <span className="sr-only">close</span>
            </button>
            <button
              type="button"
              onClick={onMinimize}
              aria-label="Minimize window"
              className={`w-3.5 h-3.5 rounded-full bg-yellow-400 border border-yellow-600 shadow-[inset_1px_1px_2px_rgba(255,255,255,0.5),1px_1px_1px_rgba(0,0,0,0.2)] ${onMinimize ? 'cursor-pointer active:brightness-90' : 'opacity-50 cursor-not-allowed'}`}
            >
              <span className="sr-only">minimize</span>
            </button>
            <button
              type="button"
              onClick={onFullscreen}
              aria-label="Toggle fullscreen"
              className={`w-3.5 h-3.5 rounded-full bg-green-500 border border-green-700 shadow-[inset_1px_1px_2px_rgba(255,255,255,0.5),1px_1px_1px_rgba(0,0,0,0.2)] ${onFullscreen ? 'cursor-pointer active:brightness-90' : 'opacity-50 cursor-not-allowed'}`}
            >
              <span className="sr-only">fullscreen</span>
            </button>
          </div>

          {/* Engraved Title */}
          <div className="font-['Share_Tech_Mono'] text-gray-500 text-xs tracking-[0.2em] uppercase text-shadow-engraved cursor-default">
            {title || 'RECORDER-3000'}
          </div>
        </div>
        
        {/* Main Interface */}
        <div className="flex-1 flex flex-col relative overflow-hidden">
          {children}
        </div>
      </div>

    </div>
  );
};

export default MacWindow;