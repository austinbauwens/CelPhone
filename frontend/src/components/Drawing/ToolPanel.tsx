import { useDrawing } from './DrawingContext';
import { soundManager } from '../../lib/sounds';

export function ToolPanel() {
  const { color, brushSize, tool, setColor, setBrushSize, setTool } = useDrawing();

  const colors = ['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'];

  return (
    <div className="tool-panel">
      <div className="tool-section">
        <h4>Color</h4>
        <div className="color-picker">
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="color-input"
          />
          <div className="color-palette">
            {colors.map((c) => (
              <button
                key={c}
                className={`color-swatch ${color === c ? 'active' : ''}`}
                style={{ backgroundColor: c }}
                onClick={() => {
                  soundManager.playClick();
                  setColor(c);
                }}
              />
            ))}
          </div>
        </div>
      </div>
      <div className="tool-section">
        <h4>Brush Size</h4>
        <div className="brush-size-control">
          <input
            type="range"
            min="1"
            max="50"
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="brush-slider"
          />
          <span className="brush-size-value">{brushSize}px</span>
        </div>
      </div>
      <div className="tool-section">
        <h4>Tools</h4>
        <div className="tool-buttons">
          <button
            className={`tool-btn ${tool === 'brush' ? 'active' : ''}`}
            onClick={() => {
              soundManager.playClick();
              setTool('brush');
            }}
          >
            Brush
          </button>
          <button
            className={`tool-btn ${tool === 'eraser' ? 'active' : ''}`}
            onClick={() => {
              soundManager.playClick();
              setTool('eraser');
            }}
          >
            Eraser
          </button>
          <button
            className={`tool-btn ${tool === 'paintbucket' ? 'active' : ''}`}
            onClick={() => {
              soundManager.playClick();
              setTool('paintbucket');
            }}
          >
            Paint Bucket
          </button>
        </div>
      </div>
    </div>
  );
}

