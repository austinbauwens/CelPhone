import { useEffect } from 'react';

interface ShimmerGridProps {
  gridSize?: number;
}

export function ShimmerGrid({ gridSize = 50 }: ShimmerGridProps) {
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Calculate which grid cell the mouse is in
      const gridX = Math.floor(e.clientX / gridSize) * gridSize;
      const gridY = Math.floor(e.clientY / gridSize) * gridSize;
      
      // Update CSS variables for grid-aligned highlight
      document.documentElement.style.setProperty('--mouse-x', `${gridX}px`);
      document.documentElement.style.setProperty('--mouse-y', `${gridY}px`);
      document.documentElement.style.setProperty('--grid-size', `${gridSize}px`);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [gridSize]);

  return <div className="shimmer-grid" />;
}

