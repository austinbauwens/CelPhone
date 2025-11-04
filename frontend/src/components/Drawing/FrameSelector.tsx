import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { soundManager } from '../../lib/sounds';
import type { Frame } from '../../types';

interface FrameSelectorProps {
  frames: number;
  currentFrame: number;
  onFrameSelect: (frame: number) => void;
  roundId: string;
  playerId: string;
  completedFrames: Set<number>;
  onFrameCompleteToggle: (frameNum: number, isComplete: boolean) => void;
}

export function FrameSelector({
  frames,
  currentFrame,
  onFrameSelect,
  roundId,
  playerId,
  completedFrames,
  onFrameCompleteToggle,
}: FrameSelectorProps) {
  const [frameData, setFrameData] = useState<Record<number, Frame>>({});
  const canvasRefs = useRef<Record<number, HTMLCanvasElement | null>>({});

  useEffect(() => {
    if (!roundId) return;

    // Load all frames for this player
    const loadFrames = async () => {
      try {
        const { data, error } = await supabase
          .from('frames')
          .select('*')
          .eq('round_id', roundId)
          .eq('player_id', playerId)
          .order('frame_number', { ascending: true })
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Get latest frame for each frame_number
        const latestFrames: Record<number, Frame> = {};
        (data || []).forEach((frame) => {
          const existing = latestFrames[frame.frame_number];
          if (!existing || new Date(frame.created_at) > new Date(existing.created_at)) {
            latestFrames[frame.frame_number] = frame;
          }
        });

        setFrameData(latestFrames);
      } catch (err) {
        console.error('Error loading frames:', err);
      }
    };

    loadFrames();

    // Subscribe to frame updates (use separate filters for compatibility)
    const channel = supabase
      .channel(`frames-selector:${roundId}:${playerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'frames',
          filter: `round_id=eq.${roundId}`,
        },
        (payload) => {
          // Only reload if the frame belongs to this player
          if (payload.new && (payload.new as any).player_id === playerId) {
            loadFrames();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roundId, playerId]);

  // Draw thumbnails
  useEffect(() => {
    Object.keys(frameData).forEach((frameNumStr) => {
      const frameNum = parseInt(frameNumStr);
      const canvas = canvasRefs.current[frameNum];
      const frame = frameData[frameNum];
      if (!canvas || !frame) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Clear canvas with light background to show drawings
      ctx.fillStyle = '#FFF5F5';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      try {
        const lineData = JSON.parse(frame.image_data);
        drawLines(ctx, lineData, canvas.width, canvas.height);
      } catch (err) {
        console.error('Error drawing thumbnail:', err);
      }
    });
  }, [frameData]);

  const drawLines = (
    ctx: CanvasRenderingContext2D,
    lines: any[],
    canvasWidth: number,
    canvasHeight: number
  ) => {
    // Scale factor for thumbnail (assuming original is 800x600)
    const scaleX = canvasWidth / 800;
    const scaleY = canvasHeight / 600;

    lines.forEach((line: any) => {
      ctx.strokeStyle = line.color;
      ctx.lineWidth = line.brushSize * Math.min(scaleX, scaleY);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (line.tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
      } else {
        ctx.globalCompositeOperation = 'source-over';
      }

      ctx.beginPath();
      for (let i = 0; i < line.points.length - 2; i += 2) {
        const x = line.points[i] * scaleX;
        const y = line.points[i + 1] * scaleY;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    });
  };

  return (
    <div className="frame-selector">
      <h3>Frames</h3>
      <div className="frame-grid">
        {Array.from({ length: frames }, (_, i) => {
          const frame = frameData[i];
          const isComplete = completedFrames.has(i);

          return (
            <div key={i} className={`frame-thumbnail-wrapper ${currentFrame === i ? 'active' : ''} ${isComplete ? 'complete' : ''}`}>
              <button
                className={`frame-thumbnail ${currentFrame === i ? 'active' : ''} ${isComplete ? 'complete' : ''}`}
                onClick={() => {
                  soundManager.playClick();
                  onFrameSelect(i);
                }}
              >
                {frame ? (
                  <canvas
                    ref={(el) => {
                      canvasRefs.current[i] = el;
                    }}
                    width={100}
                    height={75}
                    className="frame-thumbnail-canvas"
                  />
                ) : (
                  <div className="frame-number">{i + 1}</div>
                )}
              </button>
              <label className="frame-checkbox-label">
                <input
                  type="checkbox"
                  checked={isComplete}
                  onChange={(e) => {
                    e.stopPropagation();
                    onFrameCompleteToggle(i, e.target.checked);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="frame-checkbox"
                />
                <span className="frame-checkbox-text">Complete</span>
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
}

