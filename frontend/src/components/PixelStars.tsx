import { useEffect } from 'react';

export function PixelStars() {
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Calculate parallax offset based on mouse position
      // Normalize mouse position to -1 to 1 range
      const mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      const mouseY = (e.clientY / window.innerHeight) * 2 - 1;
      
      // Set CSS variables for parallax layers
      // Layer 1 (furthest): 0.1x multiplier
      // Layer 2 (middle): 0.3x multiplier
      // Layer 3 (closest): 0.5x multiplier
      document.documentElement.style.setProperty('--parallax-x-1', `${mouseX * 10}px`);
      document.documentElement.style.setProperty('--parallax-y-1', `${mouseY * 10}px`);
      document.documentElement.style.setProperty('--parallax-x-2', `${mouseX * 30}px`);
      document.documentElement.style.setProperty('--parallax-y-2', `${mouseY * 30}px`);
      document.documentElement.style.setProperty('--parallax-x-3', `${mouseX * 50}px`);
      document.documentElement.style.setProperty('--parallax-y-3', `${mouseY * 50}px`);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="pixel-stars">
      <div className="stars-layer stars-layer-1" />
      <div className="stars-layer stars-layer-2" />
      <div className="stars-layer stars-layer-3" />
    </div>
  );
}

