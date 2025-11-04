import { useState, memo, useCallback } from 'react';
import { soundManager } from '../../lib/sounds';

interface PromptInputProps {
  onPromptSubmit: (prompt: string) => void;
  currentPrompt?: string;
  isSubmitted?: boolean;
}

export const PromptInput = memo(function PromptInput({ onPromptSubmit, currentPrompt, isSubmitted = false }: PromptInputProps) {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    // Prevent submission if already submitted or prompt is empty
    if (isSubmitted || !prompt.trim()) {
      return;
    }
    soundManager.playSubmit();
    onPromptSubmit(prompt.trim());
    setPrompt('');
  }, [isSubmitted, prompt, onPromptSubmit]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    // Play typing sound for printable characters (not special keys)
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      soundManager.playTyping();
    }
  }, []);

  // If already submitted, don't show the form
  if (isSubmitted) {
    return null;
  }

  return (
    <div className="prompt-input">
      {currentPrompt && (
        <div className="current-prompt">
          <p>Previous prompt: <strong>{currentPrompt}</strong></p>
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="prompt">Write a prompt for the next player:</label>
          <input
            id="prompt"
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter your prompt..."
            maxLength={100}
            required
            disabled={isSubmitted}
          />
        </div>
        <button 
          type="submit" 
          className="btn btn-primary"
          disabled={isSubmitted || !prompt.trim()}
          onMouseEnter={() => soundManager.playHover()}
        >
          Submit Prompt
        </button>
      </form>
    </div>
  );
});

