interface PromptDisplayProps {
  prompt: string;
}

export function PromptDisplay({ prompt }: PromptDisplayProps) {
  return (
    <div className="prompt-display">
      <div className="prompt-box">
        <p>{prompt}</p>
      </div>
    </div>
  );
}

