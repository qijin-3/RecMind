import React, { Suspense } from 'react';

const Visualizer = React.lazy(() => import('./Visualizer'));

interface LazyVisualizerProps {
  analyser: AnalyserNode | null;
  isActive: boolean;
  fallbackNode?: React.ReactNode;
}

/**
 * 为 Visualizer 提供 Suspense 包裹与统一的占位渲染，避免主线程阻塞。
 */
const LazyVisualizer: React.FC<LazyVisualizerProps> = ({ analyser, isActive, fallbackNode }) => {
  const placeholder = fallbackNode ?? (
    <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-500">
      ...
    </div>
  );

  return (
    <Suspense fallback={placeholder}>
      <Visualizer analyser={analyser} isActive={isActive} />
    </Suspense>
  );
};

export default LazyVisualizer;

