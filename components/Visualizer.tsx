import React, { useEffect, useRef } from 'react';

interface VisualizerProps {
  analyser: AnalyserNode | null;
  isActive: boolean;
}

const Visualizer: React.FC<VisualizerProps> = ({ analyser, isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const cachedFrameRef = useRef<Uint8Array | null>(null);
  const lastTimestampRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');

    if (!canvas || !ctx) {
      return;
    }

    ctx.fillStyle = '#1f2937';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawGrid(ctx, canvas.width, canvas.height);

    if (!analyser) {
      return;
    }

    const bufferLength = analyser.frequencyBinCount;
    if (!dataArrayRef.current || dataArrayRef.current.length !== bufferLength) {
      dataArrayRef.current = new Uint8Array(bufferLength);
    }

    const targetFrameInterval = 1000 / 30; // 30fps

    const renderVisualizer = (frequencySnapshot: Uint8Array) => {
      ctx.fillStyle = '#1f2937';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const numColumns = 32;
      const numRows = 10;
      const colWidth = canvas.width / numColumns;
      const rowHeight = canvas.height / numRows;
      const gap = 2;
      const step = Math.max(1, Math.floor(frequencySnapshot.length / numColumns));

      for (let i = 0; i < numColumns; i++) {
        const value = frequencySnapshot[Math.min(i * step, frequencySnapshot.length - 1)];
        const percent = value / 255;
        const activeRows = Math.floor(percent * numRows);

        for (let j = 0; j < numRows; j++) {
          const currentRow = numRows - 1 - j;
          if (j < activeRows) {
            if (j > numRows - 3) {
              ctx.fillStyle = '#ef4444';
              ctx.shadowColor = '#ef4444';
            } else if (j > numRows - 6) {
              ctx.fillStyle = '#eab308';
              ctx.shadowColor = '#eab308';
            } else {
              ctx.fillStyle = '#22c55e';
              ctx.shadowColor = '#22c55e';
            }
            ctx.shadowBlur = 4;
          } else {
            ctx.fillStyle = '#374151';
            ctx.shadowBlur = 0;
          }

          ctx.fillRect(
            i * colWidth + gap / 2,
            currentRow * rowHeight + gap / 2,
            colWidth - gap,
            rowHeight - gap
          );
        }
      }
      ctx.shadowBlur = 0;
    };

    const draw = (timestamp: number) => {
      if (!isActive) {
        if (cachedFrameRef.current) {
          renderVisualizer(cachedFrameRef.current);
        }
        return;
      }

      if (timestamp - lastTimestampRef.current >= targetFrameInterval) {
        lastTimestampRef.current = timestamp;
        const dataArray = dataArrayRef.current!;
        analyser.getByteFrequencyData(dataArray);
        cachedFrameRef.current = new Uint8Array(dataArray);
        renderVisualizer(dataArray);
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    if (isActive) {
      rafRef.current = requestAnimationFrame(draw);
    } else if (cachedFrameRef.current) {
      renderVisualizer(cachedFrameRef.current);
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
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
  };

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