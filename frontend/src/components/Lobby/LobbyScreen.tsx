import { useState, useEffect, useRef } from 'react';
import { CreateGame } from './CreateGame';
import { JoinGame } from './JoinGame';
import { PlayerList } from './PlayerList';
import { useGame } from '../../hooks/useGame';
import { supabase } from '../../lib/supabase';
import { soundManager } from '../../lib/sounds';
import type { Game } from '../../types';

interface LobbyScreenProps {
  gameId: string | null;
  playerId: string | null;
  onGameJoined: (gameId: string, playerId: string) => void;
  onGameStatusChange: (status: 'lobby' | 'drawing' | 'viewing' | 'complete' | 'prompt') => void;
}

export function LobbyScreen({ gameId, playerId, onGameJoined, onGameStatusChange }: LobbyScreenProps) {
  const { game } = useGame(gameId);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [starting, setStarting] = useState(false);
  const [isHost, setIsHost] = useState(false);

  // Also watch the game status from useGame hook as backup
  useEffect(() => {
    if (game?.status && game.status !== 'lobby') {
      console.log('Game status changed via useGame hook:', game.status);
      onGameStatusChange(game.status);
    }
  }, [game?.status, onGameStatusChange]);

  // Track last status using ref to persist across renders
  const lastStatusRef = useRef<string | null>(null);

  // Subscribe to game status changes for real-time updates with polling fallback
  useEffect(() => {
    if (!gameId) return;

    let channel: ReturnType<typeof supabase.channel> | null = null;
    let pollInterval: ReturnType<typeof setInterval> | null = null;

    // Initialize lastStatus with current game status or fetch it
    if (game?.status) {
      lastStatusRef.current = game.status;
    } else {
      // Fetch initial status
      supabase
        .from('games')
        .select('status')
        .eq('id', gameId)
        .single()
        .then(({ data, error }) => {
          if (!error && data) {
            lastStatusRef.current = data.status;
          }
        });
    }

    // Always start polling (works even without realtime)
    // Reduced frequency - 3 seconds is sufficient for status updates
    pollInterval = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from('games')
          .select('status')
          .eq('id', gameId)
          .single();
        
        if (!error && data) {
          const currentStatus = data.status;
          const previousStatus = lastStatusRef.current;
          
          // Check if status changed
          if (previousStatus !== null && currentStatus !== previousStatus) {
            console.log('Game status changed via polling:', previousStatus, '->', currentStatus);
            if (currentStatus !== 'lobby') {
              onGameStatusChange(currentStatus);
            }
          }
          lastStatusRef.current = currentStatus;
        }
      } catch (err) {
        console.error('Error polling game status:', err);
      }
    }, 3000); // Poll every 3 seconds to reduce database load

    // Try realtime subscription (optional optimization)
    try {
      channel = supabase
        .channel(`game-status-sync:${gameId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'games',
            filter: `id=eq.${gameId}`,
          },
          (payload) => {
            console.log('Game status update received via realtime:', payload);
            const updatedGame = payload.new as Game;
            const oldStatus = lastStatusRef.current;
            lastStatusRef.current = updatedGame.status;
            if (updatedGame.status !== 'lobby' && oldStatus !== updatedGame.status) {
              onGameStatusChange(updatedGame.status);
            }
          }
        )
        .subscribe((status) => {
          console.log('Game status subscription status:', status);
          if (status === 'SUBSCRIBED') {
            console.log('Successfully subscribed to game status updates - realtime active');
            // Keep polling as backup (realtime can be unreliable)
          }
        });
    } catch (error) {
      console.warn('Realtime not available for game status, using polling only:', error);
      // Polling already set up above
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [gameId, game?.status, onGameStatusChange]);

  useEffect(() => {
    if (game && playerId && gameId) {
      supabase
        .from('players')
        .select('is_host')
        .eq('id', playerId)
        .eq('game_id', game.id)
        .single()
        .then(({ data, error }) => {
          if (!error && data) {
            setIsHost(data.is_host);
          }
        });
    }
  }, [game, playerId, gameId]);

  const handleGameCreated = (newGameId: string, newPlayerId: string) => {
    onGameJoined(newGameId, newPlayerId);
    setShowCreate(false);
    setShowJoin(false);
  };

  const handleGameJoined = (newGameId: string, newPlayerId: string) => {
    onGameJoined(newGameId, newPlayerId);
    setShowCreate(false);
    setShowJoin(false);
  };

  const handleStartGame = async () => {
    if (!gameId || !game) {
      console.error('Cannot start game: missing gameId or game');
      return;
    }

    setStarting(true);
    try {
      // Get player count to set total_rounds (like Gartic Phone - one round per player)
      const { data: players, error: playersError } = await supabase
        .from('players')
        .select('id')
        .eq('game_id', gameId);

      if (playersError) {
        console.error('Error fetching players:', playersError);
        throw playersError;
      }

      const playerCount = players?.length || 1;
      const totalRounds = playerCount; // One round per player

      // Update total_rounds based on player count
      const { error: updateRoundsError } = await supabase
        .from('games')
        .update({ total_rounds: totalRounds })
        .eq('id', gameId);

      if (updateRoundsError) {
        console.error('Error updating total_rounds:', updateRoundsError);
        throw updateRoundsError;
      }

      // Create first round - game starts with prompt writing phase (like Gartic Phone)
      const { data: _round, error: roundError } = await supabase
        .from('rounds')
        .insert({
          game_id: gameId,
          round_number: 1,
          prompt: '', // Will be set by players in prompt phase
        })
        .select()
        .single();

      if (roundError) {
        console.error('Error creating round:', roundError);
        throw roundError;
      }

      // Update game status to prompt phase (everyone writes initial prompt)
      // Note: If 'prompt' status is not allowed, database constraint needs to be updated
      const { error: updateError } = await supabase
        .from('games')
        .update({
          status: 'prompt',
          current_round: 1,
        })
        .eq('id', gameId);

      if (updateError) {
        console.error('Error updating game status:', updateError);
        // Check if it's a constraint violation
        if (updateError.code === '23514' || updateError.message.includes('check constraint')) {
          throw new Error('Database constraint error: Please update the games table to allow "prompt" status. Run: ALTER TABLE games DROP CONSTRAINT IF EXISTS games_status_check; ALTER TABLE games ADD CONSTRAINT games_status_check CHECK (status IN (\'lobby\', \'drawing\', \'viewing\', \'prompt\', \'complete\'));');
        }
        throw updateError;
      }

      // Manually trigger status change for host
      onGameStatusChange('prompt');
    } catch (err) {
      console.error('Error starting game:', err);
      alert(`Error starting game: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setStarting(false);
    }
  };

  if (!gameId) {
    return (
      <div className="lobby-screen">
        <div className="lobby-header">
          <h1 className="game-title">CEL PHONE</h1>
          <p className="game-subtitle">Create or join an animation game</p>
          <div className="lobby-actions">
            <button 
              className="btn btn-primary btn-large" 
              onClick={() => { 
                soundManager.playClick();
                setShowCreate(true); 
                setShowJoin(false); 
              }}
              onMouseEnter={() => soundManager.playHover()}
            >
              CREATE GAME
            </button>
            <button 
              className="btn btn-secondary btn-large" 
              onClick={() => { 
                soundManager.playClick();
                setShowJoin(true); 
                setShowCreate(false); 
              }}
              onMouseEnter={() => soundManager.playHover()}
            >
              JOIN GAME
            </button>
          </div>
        </div>
        {showCreate && (
          <CreateGame 
            onGameCreated={handleGameCreated} 
            onClose={() => {
              soundManager.playClick();
              setShowCreate(false);
            }}
          />
        )}
        {showJoin && (
          <JoinGame 
            onGameJoined={handleGameJoined} 
            onClose={() => {
              soundManager.playClick();
              setShowJoin(false);
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="lobby-screen">
      <div className="lobby-layout">
        <div className="lobby-left">
          <PlayerList gameId={gameId} playerId={playerId} />
        </div>
        <div className="lobby-center">
          <h1 className="game-title">CEL PHONE</h1>
          {game?.status === 'lobby' && (
            <div className="game-info">
              <div className="room-code-display">
                <p className="room-code-label">Room Code</p>
                <p className="room-code-value">{game?.room_code}</p>
              </div>
              <p className="frames-info">Frames per Round: <strong>{game?.frames_per_round}</strong></p>
              {isHost && (
                <button
                  className="btn btn-primary btn-large"
                  onClick={() => {
                    soundManager.playSubmit();
                    handleStartGame();
                  }}
                  onMouseEnter={() => soundManager.playHover()}
                  disabled={starting}
                >
                  {starting ? 'Starting...' : 'PLAY'}
                </button>
              )}
              {!isHost && (
                <p className="waiting-text">Waiting for host to start the game...</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
