import { createContext, useContext, useState, type ReactNode } from 'react';

interface DrawingContextType {
  color: string;
  brushSize: number;
  tool: 'brush' | 'eraser' | 'paintbucket';
  setColor: (color: string) => void;
  setBrushSize: (size: number) => void;
  setTool: (tool: 'brush' | 'eraser' | 'paintbucket') => void;
}

const DrawingContext = createContext<DrawingContextType | undefined>(undefined);

export function DrawingProvider({ children }: { children: ReactNode }) {
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(5);
  const [tool, setTool] = useState<'brush' | 'eraser' | 'paintbucket'>('brush');

  return (
    <DrawingContext.Provider
      value={{
        color,
        brushSize,
        tool,
        setColor,
        setBrushSize,
        setTool,
      }}
    >
      {children}
    </DrawingContext.Provider>
  );
}

export function useDrawing() {
  const context = useContext(DrawingContext);
  if (!context) {
    throw new Error('useDrawing must be used within DrawingProvider');
  }
  return context;
}

