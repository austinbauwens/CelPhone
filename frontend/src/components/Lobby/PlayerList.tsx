import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import type { Player } from '../../types';

interface PlayerListProps {
  gameId: string;
  playerId: string | null;
}

export function PlayerList({ gameId, playerId }: PlayerListProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPlayers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('game_id', gameId)
        .order('turn_order', { ascending: true });

      if (error) throw error;
      setPlayers(data || []);
    } catch (err) {
      console.error('Error fetching players:', err);
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  useEffect(() => {
    if (!gameId) return;

    // Initial fetch
    fetchPlayers();

    // Try to subscribe to real-time updates with polling fallback
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let pollInterval: ReturnType<typeof setInterval> | null = null;

    // Always set up polling as fallback (works even without realtime)
    pollInterval = setInterval(() => {
      console.log('Polling for player updates...');
      fetchPlayers();
    }, 1000); // Poll every second

    // Try realtime subscription
    try {
      channel = supabase
        .channel(`players-realtime:${gameId}`)
        .on(
          'postgres_changes',
          {
            event: '*', // INSERT, UPDATE, DELETE
            schema: 'public',
            table: 'players',
            filter: `game_id=eq.${gameId}`,
          },
          (payload) => {
            console.log('Player list update received via realtime:', payload.eventType, payload);
            // Immediately refetch to get the latest state
            fetchPlayers();
          }
        )
        .subscribe((status) => {
          console.log('Player list subscription status:', status);
          if (status === 'SUBSCRIBED') {
            console.log('Successfully subscribed to player updates - realtime active');
            // Keep polling as backup (realtime can be unreliable)
            // But reduce polling frequency if realtime works
            if (pollInterval) {
              clearInterval(pollInterval);
              // Poll every 2 seconds as backup if realtime is working
              pollInterval = setInterval(() => {
                fetchPlayers();
              }, 2000);
            }
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.warn('Realtime subscription failed, using polling only');
            // Ensure polling is active
            if (!pollInterval) {
              pollInterval = setInterval(() => {
                fetchPlayers();
              }, 1000);
            }
          }
        });
    } catch (error) {
      console.warn('Realtime not available, using polling only:', error);
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
  }, [gameId, fetchPlayers]);

  return (
    <div className="player-list-panel">
      <h2>PLAYERS</h2>
      <div className="player-list">
        {loading ? (
          <p>Loading players...</p>
        ) : players.length === 0 ? (
          <p>No players yet</p>
        ) : (
          players.map((player) => (
            <div
              key={player.id}
              className={`player-item ${player.id === playerId ? 'current-player' : ''}`}
            >
              <div className="player-avatar"></div>
              <span className="player-name">{player.nickname}</span>
              {player.is_host && <span className="host-badge">HOST</span>}
            </div>
          ))
        )}
      </div>
      <button className="btn btn-secondary btn-small">LOAD MORE</button>
    </div>
  );
}

