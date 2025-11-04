// GIF Generator component - dynamically imports gif.js only when needed
import { soundManager } from '../../lib/sounds';

interface GIFGeneratorProps {
  frames: any[];
  canvasRef: React.RefObject<HTMLCanvasElement>;
}

export function GIFGenerator({ frames, canvasRef }: GIFGeneratorProps) {
  const handleDownload = async () => {
    if (frames.length === 0) {
      alert('No frames to download');
      return;
    }
    
    soundManager.playDownload();

    // Dynamically import gif.js only when needed
    try {
      // @ts-ignore - gif.js doesn't have proper TypeScript definitions
      const GIFModule = await import('gif.js');
      // @ts-ignore
      const GIF = GIFModule.default || GIFModule.GIF || GIFModule;

      if (!GIF) {
        throw new Error('Failed to load gif.js module');
      }

      // Create a temporary canvas for GIF generation
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = 800;
      tempCanvas.height = 600;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) {
        alert('Failed to create canvas context');
        return;
      }

      // Create new GIF instance for each download
      // Configure worker script path - served from public folder
      const gif = new GIF({
        workers: 2,
        quality: 10,
        width: 800,
        height: 600,
        workerScript: '/gif.worker.js',
      });

      // Add error handler
      gif.on('progress', (p: number) => {
        console.log('GIF generation progress:', Math.round(p * 100) + '%');
      });

      // Add each frame to the GIF
      for (let i = 0; i < frames.length; i++) {
        // Clear canvas with background color
        tempCtx.fillStyle = '#FFF5F5';
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

        try {
          const lineData = JSON.parse(frames[i].image_data);
          
          if (!Array.isArray(lineData)) {
            console.error('Invalid line data format for frame', i);
            continue;
          }

          // Separate paint bucket fills from other lines
          const nonPaintBucketLines = lineData.filter((line: any) => line.tool !== 'paintbucket');
          const paintBucketLines = lineData.filter((line: any) => line.tool === 'paintbucket');

          // Draw all non-paintbucket lines first
          nonPaintBucketLines.forEach((line: any) => {
            if (!line.points || line.points.length < 2) return;

            tempCtx.strokeStyle = line.color;
            tempCtx.lineWidth = line.brushSize;
            tempCtx.lineCap = 'round';
            tempCtx.lineJoin = 'round';

            if (line.tool === 'eraser') {
              tempCtx.globalCompositeOperation = 'destination-out';
            } else {
              tempCtx.globalCompositeOperation = 'source-over';
            }

            tempCtx.beginPath();
            for (let j = 0; j < line.points.length - 2; j += 2) {
              const x = line.points[j];
              const y = line.points[j + 1];
              if (j === 0) {
                tempCtx.moveTo(x, y);
              } else {
                tempCtx.lineTo(x, y);
              }
            }
            tempCtx.stroke();
          });

          // Then apply paint bucket fills
          paintBucketLines.forEach((line: any) => {
            if (line.points && line.points.length >= 2) {
              floodFill(tempCtx, line.points[0], line.points[1], line.color);
            }
          });

        } catch (err) {
          console.error('Error parsing/drawing frame', i, ':', err);
          continue;
        }

        // Add frame to GIF (250ms delay = 4fps)
        gif.addFrame(tempCanvas, { delay: 250, copy: true });
      }

      // Render and download
      gif.on('finished', (blob: Blob) => {
        try {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `animation-${Date.now()}.gif`;
          document.body.appendChild(a);
          a.click();
          setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }, 100);
        } catch (err) {
          console.error('Error downloading GIF:', err);
          alert('Failed to download GIF. Please try again.');
        }
      });

      gif.on('error', (err: Error) => {
        console.error('GIF generation error:', err);
        alert('Failed to generate GIF: ' + err.message);
      });

      console.log(`Starting GIF generation for ${frames.length} frames...`);
      gif.render();
    } catch (err) {
      console.error('Error loading gif.js:', err);
      alert('Failed to generate GIF: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };


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

  return (
    <div className="gif-generator">
      <button className="btn btn-secondary" onClick={handleDownload}>
        Download as GIF
      </button>
    </div>
  );
}
