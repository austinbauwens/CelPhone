import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { generateRoomCode } from '../../lib/utils';
import type { FramesPerRound } from '../../types';

interface CreateGameProps {
  onGameCreated: (gameId: string, playerId: string) => void;
}

export function CreateGame({ onGameCreated }: CreateGameProps) {
  const [nickname, setNickname] = useState('');
  const [framesPerRound, setFramesPerRound] = useState<FramesPerRound>(3);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!nickname.trim()) {
      setError('Please enter a nickname');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const roomCode = generateRoomCode();
      const hostId = crypto.randomUUID(); // In production, use auth user ID

      // Create game - total_rounds will be set based on player count when game starts
      const { data: game, error: gameError } = await supabase
        .from('games')
        .insert({
          room_code: roomCode,
          host_id: hostId,
          frames_per_round: framesPerRound,
          current_round: 0,
          total_rounds: 1, // Will be updated when game starts based on player count
          status: 'lobby',
        })
        .select()
        .single();

      if (gameError) throw gameError;

      // Create host player
      const { data: player, error: playerError } = await supabase
        .from('players')
        .insert({
          game_id: game.id,
          user_id: hostId,
          nickname: nickname.trim(),
          turn_order: 1,
          is_host: true,
        })
        .select()
        .single();

      if (playerError) throw playerError;

      onGameCreated(game.id, player.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create game');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-game-modal">
      <div className="modal-content">
        <h2>Create Game</h2>
        <div className="form-group">
          <label htmlFor="nickname">Nickname</label>
          <input
            id="nickname"
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Enter your nickname"
            maxLength={20}
          />
        </div>
        <div className="form-group">
          <label htmlFor="frames">Frames per Round</label>
          <div className="radio-group">
            <label>
              <input
                type="radio"
                value="3"
                checked={framesPerRound === 3}
                onChange={() => setFramesPerRound(3)}
              />
              3 Frames
            </label>
            <label>
              <input
                type="radio"
                value="5"
                checked={framesPerRound === 5}
                onChange={() => setFramesPerRound(5)}
              />
              5 Frames
            </label>
            <label>
              <input
                type="radio"
                value="8"
                checked={framesPerRound === 8}
                onChange={() => setFramesPerRound(8)}
              />
              8 Frames
            </label>
          </div>
        </div>
        {error && <div className="error-message">{error}</div>}
        <button
          className="btn btn-primary"
          onClick={handleCreate}
          disabled={loading || !nickname.trim()}
        >
          {loading ? 'Creating...' : 'Create Game'}
        </button>
      </div>
    </div>
  );
}

