import { useState } from 'react';
import { supabase } from '../../lib/supabase';

interface JoinGameProps {
  onGameJoined: (gameId: string, playerId: string) => void;
  onClose?: () => void;
}

export function JoinGame({ onGameJoined, onClose }: JoinGameProps) {
  // Check URL for room code on mount
  const urlParams = new URLSearchParams(window.location.search);
  const urlRoomCode = urlParams.get('room');
  
  const [roomCode, setRoomCode] = useState(urlRoomCode || '');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoin = async () => {
    if (!roomCode.trim() || !nickname.trim()) {
      setError('Please enter both room code and nickname');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Find game by room code (case-insensitive)
      const { data: game, error: gameError } = await supabase
        .from('games')
        .select('*')
        .ilike('room_code', roomCode.trim())
        .eq('status', 'lobby')
        .single();

      if (gameError || !game) {
        throw new Error('Game not found or already started');
      }

      // Get current player count
      const { count } = await supabase
        .from('players')
        .select('*', { count: 'exact', head: true })
        .eq('game_id', game.id);

      // Check if game is full (max 10 players)
      if ((count || 0) >= 10) {
        throw new Error('Game is full (10 players max)');
      }

      const userId = crypto.randomUUID(); // In production, use auth user ID

      // Create player
      const { data: player, error: playerError } = await supabase
        .from('players')
        .insert({
          game_id: game.id,
          user_id: userId,
          nickname: nickname.trim(),
          turn_order: (count || 0) + 1,
          is_host: false,
        })
        .select()
        .single();

      if (playerError) throw playerError;

      onGameJoined(game.id, player.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join game');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="join-game-modal"
      onClick={() => onClose?.()}
    >
      <div 
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <h2>Join Game</h2>
        <div className="form-group">
          <label htmlFor="room-code">Room Code</label>
          <input
            id="room-code"
            type="text"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value)}
            placeholder="Enter room code (e.g. sunny creek inn)"
          />
        </div>
        <div className="form-group">
          <label htmlFor="nickname-join">Nickname</label>
          <input
            id="nickname-join"
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Enter your nickname"
            maxLength={20}
          />
        </div>
        {error && <div className="error-message">{error}</div>}
        <button
          className="btn btn-primary"
          onClick={handleJoin}
          disabled={loading || !roomCode.trim() || !nickname.trim()}
        >
          {loading ? 'Joining...' : 'Join Game'}
        </button>
      </div>
    </div>
  );
}

