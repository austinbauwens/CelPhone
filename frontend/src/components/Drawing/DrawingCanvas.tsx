import { useEffect, useRef, useState, useCallback } from 'react';
import { Stage, Layer, Line, Rect } from 'react-konva';
import { useDrawing } from './DrawingContext';
import { supabase } from '../../lib/supabase';
import { throttle } from '../../lib/utils';
import { soundManager } from '../../lib/sounds';
import type { KonvaEventObject } from 'konva/lib/Node';

interface DrawingCanvasProps {
  gameId: string;
  playerId: string;
  roundId: string;
  frameNumber: number;
  framesPerRound: number;
  onFrameComplete?: (frameNum: number) => void;
}

interface LineData {
  points: number[];
  color: string;
  brushSize: number;
  tool: 'brush' | 'eraser' | 'paintbucket';
  fillArea?: { x: number; y: number; width: number; height: number };
}

export function DrawingCanvas({
  playerId,
  roundId,
  frameNumber,
  onFrameComplete,
}: DrawingCanvasProps) {
  const [lines, setLines] = useState<Record<number, LineData[]>>({});
  const [isDrawing, setIsDrawing] = useState(false);
  const { color, brushSize, tool } = useDrawing();
  const stageRef = useRef<any>(null);

  // Load saved frame data
  useEffect(() => {
    if (!roundId) return;

    loadFrameData();
  }, [roundId, frameNumber]);

  const loadFrameData = async () => {
    try {
      // Handle duplicates by getting the latest frame
      const { data, error } = await supabase
        .from('frames')
        .select('*')
        .eq('round_id', roundId)
        .eq('player_id', playerId)
        .eq('frame_number', frameNumber)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 is "no rows returned" which is fine
        console.error('Error loading frame:', error);
        return;
      }

      if (data?.image_data) {
        // Parse saved line data
        try {
          const savedLines = JSON.parse(data.image_data);
          setLines((prev) => ({ ...prev, [frameNumber]: savedLines }));
        } catch {
          // If parsing fails, start fresh
          setLines((prev) => ({ ...prev, [frameNumber]: [] }));
        }
      } else {
        setLines((prev) => ({ ...prev, [frameNumber]: [] }));
      }
    } catch (err) {
      console.error('Error loading frame data:', err);
    }
  };

  const saveFrameData = throttle(async (frameLines: LineData[]) => {
    if (!roundId) return;

    try {
      const imageData = JSON.stringify(frameLines);

      // Always update existing frame if it exists, otherwise create new one
      // This ensures we only have one frame per frame_number per player
      const { data: existingFrames, error: checkError } = await supabase
        .from('frames')
        .select('id')
        .eq('round_id', roundId)
        .eq('player_id', playerId)
        .eq('frame_number', frameNumber)
        .order('created_at', { ascending: false })
        .limit(1);

      if (checkError) {
        console.error('Error checking for existing frame:', checkError);
        return;
      }

      if (existingFrames && existingFrames.length > 0) {
        // Update existing frame (don't create duplicates)
        const existingId = existingFrames[0].id;
        await supabase
          .from('frames')
          .update({ image_data: imageData })
          .eq('id', existingId);
      } else {
        // Create new frame only if it doesn't exist
        await supabase.from('frames').insert({
          round_id: roundId,
          player_id: playerId,
          frame_number: frameNumber,
          image_data: imageData,
        });
      }

      // Notify parent that frame is complete (has data)
      if (frameLines.length > 0 && onFrameComplete) {
        onFrameComplete(frameNumber);
      }
    } catch (err) {
      console.error('Error saving frame:', err);
    }
  }, 1000); // Increased throttle to 1 second to reduce saves

  // Flood fill algorithm for paint bucket (memoized)
  const floodFill = useCallback((ctx: CanvasRenderingContext2D, startX: number, startY: number, fillColor: string) => {
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

      // Check if pixel matches target color (with tolerance for anti-aliasing)
      const tolerance = 30; // Increased tolerance to handle background and anti-aliasing
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
  }, []);

  const handleMouseDown = async (e: KonvaEventObject<MouseEvent>) => {
    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return;

    if (tool === 'paintbucket') {
      soundManager.playClick();
      
      // Simply save the paint bucket fill - the useEffect will handle rendering
      const currentLines = lines[frameNumber] || [];
      
      // Save as a paint bucket fill
      const fillData: LineData = {
        points: [pos.x, pos.y],
        color,
        brushSize: 0,
        tool: 'paintbucket',
      };

      const updatedLines = [...currentLines, fillData];
      setLines((prev) => ({
        ...prev,
        [frameNumber]: updatedLines,
      }));

      // Save to database
      saveFrameData(updatedLines);
    } else {
      setIsDrawing(true);
      soundManager.playDraw();
      const newLine: LineData = {
        points: [pos.x, pos.y],
        color: tool === 'eraser' ? '#FFFFFF' : color,
        brushSize: tool === 'eraser' ? brushSize * 2 : brushSize,
        tool,
      };

      setLines((prev) => ({
        ...prev,
        [frameNumber]: [...(prev[frameNumber] || []), newLine],
      }));
    }
  };

  // Throttle mouse move to reduce lag
  const handleMouseMove = useCallback((e: KonvaEventObject<MouseEvent>) => {
    if (!isDrawing) return;

    const stage = e.target.getStage();
    const point = stage?.getPointerPosition();
    if (!point) return;

    setLines((prev) => {
      const frameLines = prev[frameNumber] || [];
      const lastLine = frameLines[frameLines.length - 1];
      if (!lastLine) return prev;

      const newLine = {
        ...lastLine,
        points: [...lastLine.points, point.x, point.y],
      };

      return {
        ...prev,
        [frameNumber]: [...frameLines.slice(0, -1), newLine],
      };
    });
  }, [isDrawing, frameNumber]);

  // Throttled save on mouse move (separate from state update for performance)
  const saveTimeoutRef = useRef<number | null>(null);
  useEffect(() => {
    if (isDrawing) {
      // Clear any pending save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      // Save after a short delay (debounced)
      saveTimeoutRef.current = window.setTimeout(() => {
        saveFrameData(lines[frameNumber] || []);
      }, 500); // Save every 500ms while drawing
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [lines, frameNumber, isDrawing]);

  const handleMouseUp = () => {
    setIsDrawing(false);
    // Final save
    saveFrameData(lines[frameNumber] || []);
  };

  // Expose color and brush size setters for parent component
  useEffect(() => {
    // This will be connected via context or props in a real implementation
  }, []);

  const currentLines = lines[frameNumber] || [];

  // Optimized rendering: Use requestAnimationFrame to batch updates and reduce lag
  const renderTimeoutRef = useRef<number | null>(null);
  const lastRenderLinesRef = useRef<string>(''); // Track last rendered lines to avoid unnecessary renders
  
  useEffect(() => {
    if (!stageRef.current) return;

    // Check if lines actually changed to avoid unnecessary renders
    const linesKey = JSON.stringify(currentLines);
    if (linesKey === lastRenderLinesRef.current && renderTimeoutRef.current) {
      return; // Skip if nothing changed
    }
    lastRenderLinesRef.current = linesKey;

    // Clear any pending render
    if (renderTimeoutRef.current) {
      cancelAnimationFrame(renderTimeoutRef.current);
    }

    // Batch render updates using requestAnimationFrame
    renderTimeoutRef.current = requestAnimationFrame(() => {
      if (!stageRef.current) return;

      const stage = stageRef.current;
      const layer = stage.getLayers()[0];
      const canvas = layer.getCanvas()._canvas;
      const ctx = canvas.getContext('2d', { willReadFrequently: false }); // Optimize context
      if (!ctx) return;

      // Use imageSmoothingEnabled for better performance
      ctx.imageSmoothingEnabled = false;

      // Start with background
      ctx.fillStyle = '#FFF5F5';
      ctx.fillRect(0, 0, 800, 600);

      // Separate paint bucket fills from other lines
      const paintBucketFills = currentLines.filter((line) => line.tool === 'paintbucket');
      const otherLines = currentLines.filter((line) => line.tool !== 'paintbucket');

      // Apply all paint bucket fills first (these fill background areas)
      paintBucketFills.forEach((line) => {
        if (line.points.length >= 2) {
          floodFill(ctx, line.points[0], line.points[1], line.color);
        }
      });

      // Then draw all lines on top of the fills - batch similar operations
      ctx.save(); // Save context state
      otherLines.forEach((line) => {
        ctx.strokeStyle = line.color;
        ctx.lineWidth = line.brushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalCompositeOperation = line.tool === 'eraser' ? 'destination-out' : 'source-over';

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
      ctx.restore(); // Restore context state

      // Only redraw layer if needed
      layer.batchDraw();
    });

    return () => {
      if (renderTimeoutRef.current) {
        cancelAnimationFrame(renderTimeoutRef.current);
      }
    };
  }, [currentLines, floodFill]);

  // Get cursor class based on tool
  const getCursorClass = () => {
    switch (tool) {
      case 'brush':
        return 'cursor-brush';
      case 'eraser':
        return 'cursor-eraser';
      case 'paintbucket':
        return 'cursor-paintbucket';
      default:
        return 'cursor-default';
    }
  };

  return (
    <div className={`drawing-canvas-container ${getCursorClass()}`}>
      <Stage
        width={800}
        height={600}
        onMouseDown={handleMouseDown}
        onMousemove={handleMouseMove}
        onMouseup={handleMouseUp}
        onMouseLeave={handleMouseUp}
        ref={stageRef}
      >
        <Layer>
          {/* Background is rendered in useEffect, but we need a placeholder for Konva */}
          <Rect width={800} height={600} fill="#FFF5F5" />
          {/* Lines are rendered via direct canvas manipulation in useEffect for better performance */}
          {/* Only render lines in Konva for interactivity during drawing */}
          {isDrawing && currentLines.length > 0 && (() => {
            const lastLine = currentLines[currentLines.length - 1];
            if (lastLine && lastLine.tool !== 'paintbucket' && lastLine.points.length >= 2) {
              return (
                <Line
                  key={currentLines.length - 1}
                  points={lastLine.points}
                  stroke={lastLine.color}
                  strokeWidth={lastLine.brushSize}
                  tension={0.5}
                  lineCap="round"
                  lineJoin="round"
                  globalCompositeOperation={lastLine.tool === 'eraser' ? 'destination-out' : 'source-over'}
                  listening={false}
                />
              );
            }
            return null;
          })()}
        </Layer>
      </Stage>
    </div>
  );
}

