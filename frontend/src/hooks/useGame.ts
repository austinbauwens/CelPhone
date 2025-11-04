import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Game } from '../types';

export function useGame(gameId: string | null) {
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchGame = useCallback(async () => {
    if (!gameId) return;
    
    try {
      setLoading(true);
      // Only fetch essential fields for better performance
      const { data, error } = await supabase
        .from('games')
        .select('id, status, current_round, total_rounds, frames_per_round, room_code, host_id, created_at, updated_at')
        .eq('id', gameId)
        .single();

      if (error) throw error;
      
      // Only update if data actually changed to prevent unnecessary re-renders
      setGame(prevGame => {
        if (prevGame && JSON.stringify(prevGame) === JSON.stringify(data)) {
          return prevGame;
        }
        return data;
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch game'));
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  useEffect(() => {
    if (!gameId) {
      setGame(null);
      setLoading(false);
      return;
    }

    // Initial fetch
    fetchGame();

    // Always poll for game updates (works without realtime)
    // Reduced polling frequency - 3 seconds is sufficient for game status updates
    let pollInterval: ReturnType<typeof setInterval> | null = null;
    pollInterval = setInterval(() => {
      fetchGame();
    }, 3000); // Poll every 3 seconds to reduce database load

    // Try realtime subscription (optional optimization)
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase
        .channel(`game:${gameId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'games',
            filter: `id=eq.${gameId}`,
          },
          (payload) => {
            if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
              console.log('Game update received via realtime:', payload);
              setGame(payload.new as Game);
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('Game hook: Successfully subscribed to realtime updates');
            // Reduce polling frequency if realtime works (still keep as backup)
            if (pollInterval) {
              clearInterval(pollInterval);
              // Poll every 5 seconds as backup (realtime is primary)
              pollInterval = setInterval(() => {
                fetchGame();
              }, 5000);
            }
          }
        });
    } catch (error) {
      console.warn('Game hook: Realtime not available, using polling only');
      // Polling already set up above
    }

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [gameId, fetchGame]);

  return { game, loading, error, refetch: fetchGame };
}

