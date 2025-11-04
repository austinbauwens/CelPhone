import { memo, useMemo } from 'react';

interface DrawingTimerProps {
  timeRemaining: number;
}

export const DrawingTimer = memo(function DrawingTimer({ timeRemaining }: DrawingTimerProps) {
  const formattedTime = useMemo(() => {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, [timeRemaining]);

  const color = useMemo(() => {
    if (timeRemaining > 60) return 'var(--color-success)';
    if (timeRemaining > 30) return 'var(--color-warning)';
    return 'var(--color-error)';
  }, [timeRemaining]);

  return (
    <div className="drawing-timer" style={{ color }}>
      <div className="timer-display">{formattedTime}</div>
    </div>
  );
});

