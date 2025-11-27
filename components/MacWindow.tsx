import React from 'react';
import Minimize2 from 'lucide-react/icons/minimize-2';

interface MacWindowProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
  onClose?: () => void;
  onMinimize?: () => void;
  onFullscreen?: () => void;
  onMiniMode?: () => void;
  isMinimized?: boolean;
  isMiniModeEnabled?: boolean;
  width?: number | string;
  height?: number | 'auto' | string;
  contentAutoHeight?: boolean;
  headerRightContent?: React.ReactNode;
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
  onMiniMode,
  isMinimized = false,
  isMiniModeEnabled = false,
  width,
  height,
  contentAutoHeight = false,
  headerRightContent,
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
        ...(contentAutoHeight ? {} : { height: resolvedHeight })
      }}
      className={`relative flex flex-col transition-all duration-200 ease-out ${className}`}
    >
      
      {/* Outer Casing / Bezel */}
      <div className="absolute inset-0 bg-[#d4d4d8] rounded-xl border-b-4 border-r-4 border-[#9ca3af] z-0 pointer-events-none"></div>
      
      {/* Metallic Texture Overlay */}
      <div className="absolute inset-[3px] rounded-lg bg-gradient-to-br from-[#f3f4f6] to-[#d1d5db] z-0 pointer-events-none border border-white/50"></div>

      {/* Content Container */}
      <div className={`relative z-10 flex flex-col rounded-lg m-[6px] border border-gray-400 bg-[#e5e5e5] ${contentAutoHeight ? '' : 'h-full'}`} style={{ overflow: 'hidden' }}>
        
        {/* Retro Header / Faceplate Top */}
        <div 
          className="h-10 bg-gradient-to-b from-[#e5e7eb] to-[#d1d5db] border-b border-gray-400 flex items-center justify-between px-3 select-none shrink-0 shadow-sm drag-region relative"
          style={{ overflow: 'visible', zIndex: 100 }}
          onDoubleClick={onFullscreen}
        >
          
          {/* Jewel Buttons */}
          <div className="flex items-center gap-2.5 no-drag z-10">
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

          {/* Engraved Title - 绝对定位居中 */}
          <div className="absolute left-1/2 -translate-x-1/2 font-['Share_Tech_Mono'] text-gray-500 text-xs tracking-[0.2em] uppercase text-shadow-engraved cursor-default">
            {title || 'RECORDER-3000'}
          </div>

          {/* Right side buttons: Language Switcher + Mini Mode */}
          <div className="flex items-center gap-2 no-drag z-[100]">
            {/* Language Switcher */}
            {headerRightContent}
            
            {/* Mini Mode Button */}
            {onMiniMode && (
              <button
                type="button"
                onClick={onMiniMode}
                disabled={isMiniModeEnabled}
                aria-label="Enter mini mode"
                className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${
                  isMiniModeEnabled 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'cursor-pointer active:scale-95'
                }`}
              >
                <Minimize2 size={14} className="text-gray-600" />
              </button>
            )}
            {/* 如果没有 mini mode 按钮，添加一个占位元素以保持布局平衡 */}
            {!onMiniMode && !headerRightContent && <div className="w-6"></div>}
          </div>
        </div>
        
        {/* Main Interface */}
        <div className={`flex flex-col relative overflow-hidden ${contentAutoHeight ? 'flex-none' : 'flex-1 min-h-0'}`}>
          {children}
        </div>
      </div>

    </div>
  );
};

export default MacWindow;