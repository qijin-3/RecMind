import React, { useEffect, useRef } from 'react';

interface VisualizerProps {
  analyser: AnalyserNode | null;
  isActive: boolean;
}

const Visualizer: React.FC<VisualizerProps> = ({ analyser, isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    
    // Clear initial state
    if (ctx && canvas) {
         ctx.fillStyle = '#1f2937'; // Dark LCD background
         ctx.fillRect(0, 0, canvas.width, canvas.height);
         
         // Draw grid/empty LEDs
         drawGrid(ctx, canvas.width, canvas.height);
    }

    if (!isActive || !analyser || !ctx || !canvas) {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        return;
    }

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.fillStyle = '#1f2937';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // We want about 30 columns for retro feel
      const numColumns = 32;
      const numRows = 10;
      
      const colWidth = canvas.width / numColumns;
      const rowHeight = canvas.height / numRows;
      
      const gap = 2; 

      // Sample the frequency data
      const step = Math.floor(bufferLength / numColumns);

      for (let i = 0; i < numColumns; i++) {
        const value = dataArray[i * step];
        const percent = value / 255;
        const activeRows = Math.floor(percent * numRows);

        for (let j = 0; j < numRows; j++) {
            // Invert J because 0 is top
            const currentRow = (numRows - 1) - j;
            
            if (j < activeRows) {
                // Color Logic
                if (j > numRows - 3) {
                    ctx.fillStyle = '#ef4444'; // Red (Peak)
                    ctx.shadowColor = '#ef4444';
                } else if (j > numRows - 6) {
                    ctx.fillStyle = '#eab308'; // Yellow (Mid)
                    ctx.shadowColor = '#eab308';
                } else {
                    ctx.fillStyle = '#22c55e'; // Green (Low)
                    ctx.shadowColor = '#22c55e';
                }
                ctx.shadowBlur = 4;
            } else {
                 ctx.fillStyle = '#374151'; // Unlit LED
                 ctx.shadowBlur = 0;
            }

            ctx.fillRect(
                i * colWidth + gap/2, 
                currentRow * rowHeight + gap/2, 
                colWidth - gap, 
                rowHeight - gap
            );
        }
      }
      ctx.shadowBlur = 0; // Reset
    };

    draw();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [analyser, isActive]);

  const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      const numColumns = 32;
      const numRows = 10;
      const colWidth = width / numColumns;
      const rowHeight = height / numRows;
      const gap = 2;

      ctx.fillStyle = '#374151'; // Unlit color
      
      for (let i = 0; i < numColumns; i++) {
        for (let j = 0; j < numRows; j++) {
            ctx.fillRect(
                i * colWidth + gap/2, 
                j * rowHeight + gap/2, 
                colWidth - gap, 
                rowHeight - gap
            );
        }
      }
  }

  return (
    <canvas 
      ref={canvasRef} 
      width={320} 
      height={80} 
      className="w-full h-full bg-gray-900"
    />
  );
};

export default Visualizer;