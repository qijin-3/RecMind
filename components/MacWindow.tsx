import React, { useRef } from 'react';

interface MacWindowProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
  onMinimize?: () => void;
  onMaximize?: () => void;
  isMinimized?: boolean;
  width?: number;
  height?: number | 'auto';
  onResize?: (width: number, height: number) => void;
}

const MacWindow: React.FC<MacWindowProps> = ({ 
  children, 
  title, 
  className = "", 
  onMinimize,
  onMaximize,
  isMinimized = false,
  width,
  height,
  onResize
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (direction: 'e' | 's' | 'se', e: React.MouseEvent) => {
    if (!onResize) return;
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startY = e.clientY;
    
    // Get current dimensions. If 'auto', compute from DOM.
    const rect = containerRef.current?.getBoundingClientRect();
    const startW = rect ? rect.width : (width || 380);
    const startH = rect ? rect.height : (typeof height === 'number' ? height : 0);

    const onMouseMove = (moveEvent: MouseEvent) => {
      let newWidth = startW;
      let newHeight = startH;

      if (direction.includes('e')) {
        newWidth = Math.max(300, startW + (moveEvent.clientX - startX));
      }
      if (direction.includes('s')) {
        // If we were auto, we are now fixed pixel height
        newHeight = Math.max(200, startH + (moveEvent.clientY - startY));
      }

      // If we only dragged 'e' (width), preserve current height (which might be 'auto')
      // If direction is 'e', pass current height prop if it's 'auto', or new calculated height if we are resizing height too.
      const finalH = direction === 'e' ? height || 'auto' : newHeight;
      const finalW = direction === 's' ? width || 380 : newWidth;

      // Type cast to satisfy strict number requirement for calculations, 
      // but callback needs to handle 'auto' logic if we implemented that in parent. 
      // Here we convert to numbers for resizing.
      onResize(finalW as number, finalH as number);
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  return (
    <div 
      ref={containerRef}
      style={{ 
        width: width ? `${width}px` : undefined, 
        height: height === 'auto' ? 'auto' : `${height}px` 
      }}
      className={`relative flex flex-col transition-all duration-200 ease-out ${className}`}
    >
      
      {/* Outer Casing / Bezel */}
      <div className="absolute inset-0 bg-[#d4d4d8] rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.4)_inset] border-b-4 border-r-4 border-[#9ca3af] z-0 pointer-events-none"></div>
      
      {/* Metallic Texture Overlay */}
      <div className="absolute inset-[3px] rounded-lg bg-gradient-to-br from-[#f3f4f6] to-[#d1d5db] z-0 pointer-events-none border border-white/50"></div>

      {/* Content Container */}
      <div className="relative z-10 flex flex-col h-full rounded-lg overflow-hidden m-[6px] border border-gray-400 bg-[#e5e5e5]">
        
        {/* Retro Header / Faceplate Top */}
        <div 
          className="h-10 bg-gradient-to-b from-[#e5e7eb] to-[#d1d5db] border-b border-gray-400 flex items-center justify-between px-3 select-none shrink-0 shadow-sm drag-region"
          onDoubleClick={onMaximize}
        >
          
          {/* Jewel Buttons */}
          <div className="flex items-center gap-2.5 no-drag">
            <div className="w-3.5 h-3.5 rounded-full bg-red-500 border border-red-700 shadow-[inset_1px_1px_2px_rgba(255,255,255,0.5),1px_1px_1px_rgba(0,0,0,0.2)]" />
            <div 
              onClick={onMinimize}
              className={`w-3.5 h-3.5 rounded-full bg-yellow-400 border border-yellow-600 shadow-[inset_1px_1px_2px_rgba(255,255,255,0.5),1px_1px_1px_rgba(0,0,0,0.2)] ${onMinimize ? 'cursor-pointer active:brightness-90' : 'opacity-50'}`} 
            />
            <div 
              onClick={onMaximize}
              className={`w-3.5 h-3.5 rounded-full bg-green-500 border border-green-700 shadow-[inset_1px_1px_2px_rgba(255,255,255,0.5),1px_1px_1px_rgba(0,0,0,0.2)] ${onMaximize ? 'cursor-pointer active:brightness-90' : 'opacity-50'}`} 
            />
          </div>

          {/* Engraved Title */}
          <div className="font-['Share_Tech_Mono'] text-gray-500 text-xs tracking-[0.2em] uppercase text-shadow-engraved cursor-default">
            {title || 'RECORDER-3000'}
          </div>

          {/* Screw decoration */}
          <div className="w-2.5 h-2.5 rounded-full bg-gray-300 border border-gray-400 shadow-inner flex items-center justify-center transform rotate-45">
             <div className="w-full h-[1px] bg-gray-400" />
             <div className="h-full w-[1px] bg-gray-400 absolute" />
          </div>
        </div>
        
        {/* Main Interface */}
        <div className="flex-1 flex flex-col relative overflow-hidden">
          {children}
        </div>
      </div>

      {/* Resize Handles (Only if onResize provided) */}
      {onResize && !isMinimized && (
        <>
          {/* Right Edge */}
          <div 
            className="absolute top-4 bottom-4 -right-1 w-4 cursor-e-resize z-50 group flex items-center justify-center"
            onMouseDown={(e) => handleMouseDown('e', e)}
          >
             {/* Invisible hit area but visible tooltip/effect could go here */}
          </div>

          {/* Bottom Edge */}
          <div 
            className="absolute -bottom-1 left-4 right-4 h-4 cursor-s-resize z-50 group"
            onMouseDown={(e) => handleMouseDown('s', e)}
          />

          {/* Bottom Right Corner (Grip) */}
          <div 
            className="absolute -bottom-1 -right-1 w-6 h-6 cursor-se-resize z-50 flex items-end justify-end pr-1 pb-1"
            onMouseDown={(e) => handleMouseDown('se', e)}
          >
             {/* Visual Grip Lines */}
             <div className="w-full h-full relative overflow-hidden rounded-br-xl">
                <div className="absolute bottom-[4px] right-[4px] w-[1px] h-[8px] bg-gray-500 rotate-45" />
                <div className="absolute bottom-[4px] right-[7px] w-[1px] h-[12px] bg-gray-500 rotate-45" />
                <div className="absolute bottom-[4px] right-[10px] w-[1px] h-[16px] bg-gray-500 rotate-45" />
             </div>
          </div>
        </>
      )}
    </div>
  );
};

export default MacWindow;