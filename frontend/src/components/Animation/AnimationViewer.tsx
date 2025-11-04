import { useState, useEffect, useRef } from 'react';
import { GIFGenerator } from './GIFGenerator';
import { soundManager } from '../../lib/sounds';
import type { Frame } from '../../types';

interface AnimationViewerProps {
  frames: Frame[];
  playerName?: string;
}

export function AnimationViewer({ frames, playerName }: AnimationViewerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Parse frame data and draw to canvas
  useEffect(() => {
    if (!canvasRef.current || frames.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#FFF5F5';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw current frame
    const frame = frames[currentFrameIndex];
    if (frame) {
      try {
        const lineData = JSON.parse(frame.image_data);
        
        // First draw all non-paintbucket lines
        const nonPaintBucketLines = lineData.filter((line: any) => line.tool !== 'paintbucket');
        const paintBucketLines = lineData.filter((line: any) => line.tool === 'paintbucket');
        
        // Draw lines first
        drawLines(ctx, nonPaintBucketLines);
        
        // Then apply paint bucket fills
        paintBucketLines.forEach((line: any) => {
          if (line.points.length >= 2) {
            floodFill(ctx, line.points[0], line.points[1], line.color);
          }
        });
      } catch (err) {
        console.error('Error parsing frame data:', err);
      }
    }
  }, [frames, currentFrameIndex]);

  // Flood fill algorithm for paint bucket fills
  const floodFill = (ctx: CanvasRenderingContext2D, startX: number, startY: number, fillColor: string) => {
    const canvas = ctx.canvas;
    const width = canvas.width;
    const height = canvas.height;

    // Get image data
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // Parse fill color
    const fillR = parseInt(fillColor.slice(1, 3), 16);
    const fillG = parseInt(fillColor.slice(3, 5), 16);
    const fillB = parseInt(fillColor.slice(5, 7), 16);

    // Get target color at start position
    const startXInt = Math.floor(startX);
    const startYInt = Math.floor(startY);
    
    if (startXInt < 0 || startXInt >= width || startYInt < 0 || startYInt >= height) {
      return;
    }

    const startIdx = (startYInt * width + startXInt) * 4;
    const targetR = data[startIdx];
    const targetG = data[startIdx + 1];
    const targetB = data[startIdx + 2];

    // If target color matches fill color, return
    if (targetR === fillR && targetG === fillG && targetB === fillB) {
      return;
    }

    // Queue for flood fill
    const queue: number[][] = [[startXInt, startYInt]];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const [x, y] = queue.shift()!;
      const key = `${x},${y}`;

      if (x < 0 || x >= width || y < 0 || y >= height || visited.has(key)) {
        continue;
      }

      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      // Check if pixel matches target color (with tolerance)
      const tolerance = 30;
      if (
        Math.abs(r - targetR) > tolerance ||
        Math.abs(g - targetG) > tolerance ||
        Math.abs(b - targetB) > tolerance
      ) {
        continue;
      }

      visited.add(key);

      // Fill pixel
      data[idx] = fillR;
      data[idx + 1] = fillG;
      data[idx + 2] = fillB;
      data[idx + 3] = 255;

      // Add neighbors to queue
      queue.push([x + 1, y]);
      queue.push([x - 1, y]);
      queue.push([x, y + 1]);
      queue.push([x, y - 1]);
    }

    // Apply the filled image data back to the canvas
    ctx.putImageData(imageData, 0, 0);
  };

  // Animation loop
  useEffect(() => {
    if (isPlaying && frames.length > 0) {
      intervalRef.current = setInterval(() => {
        setCurrentFrameIndex((prev) => (prev + 1) % frames.length);
      }, 250); // 4fps = 250ms per frame
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, frames.length]);

  const drawLines = (ctx: CanvasRenderingContext2D, lines: any[]) => {
    // Draw non-paintbucket lines first
    lines.forEach((line: any) => {
      if (line.tool === 'paintbucket') {
        return; // Skip paint bucket fills - handled separately
      }

      ctx.strokeStyle = line.color;
      ctx.lineWidth = line.brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (line.tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
      } else {
        ctx.globalCompositeOperation = 'source-over';
      }

      ctx.beginPath();
      for (let i = 0; i < line.points.length - 2; i += 2) {
        const x = line.points[i];
        const y = line.points[i + 1];
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    });
  };

  const handlePlayPause = () => {
    soundManager.playClick();
    setIsPlaying(!isPlaying);
  };

  const handleFrameSelect = (index: number) => {
    soundManager.playClick();
    setIsPlaying(false);
    setCurrentFrameIndex(index);
  };

  return (
    <div className="animation-viewer">
      {playerName && <h3 className="player-name">{playerName}</h3>}
      <div className="canvas-container">
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className="animation-canvas"
        />
      </div>
      <div className="animation-controls">
        <button className="btn btn-secondary" onClick={handlePlayPause}>
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <div className="frame-indicator">
          Frame {currentFrameIndex + 1} / {frames.length}
        </div>
        <div className="frame-nav">
          {frames.map((_, index) => (
            <button
              key={index}
              className={`frame-nav-btn ${currentFrameIndex === index ? 'active' : ''}`}
              onClick={() => handleFrameSelect(index)}
            >
              {index + 1}
            </button>
          ))}
        </div>
      </div>
      <GIFGenerator frames={frames} canvasRef={canvasRef as React.RefObject<HTMLCanvasElement>} />
    </div>
  );
}

