interface DrawingTimerProps {
  timeRemaining: number;
}

export function DrawingTimer({ timeRemaining }: DrawingTimerProps) {
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const formattedTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  const getColor = () => {
    if (timeRemaining > 60) return 'var(--color-success)';
    if (timeRemaining > 30) return 'var(--color-warning)';
    return 'var(--color-error)';
  };

  return (
    <div className="drawing-timer" style={{ color: getColor() }}>
      <div className="timer-display">{formattedTime}</div>
    </div>
  );
}

