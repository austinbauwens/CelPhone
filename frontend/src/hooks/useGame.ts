import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Game } from '../types';

export function useGame(gameId: string | null) {
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  async function fetchGame() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single();

      if (error) throw error;
      setGame(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch game'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!gameId) {
      setGame(null);
      setLoading(false);
      return;
    }

    // Initial fetch
    fetchGame();

    // Always poll for game updates (works without realtime)
    let pollInterval: ReturnType<typeof setInterval> | null = null;
    pollInterval = setInterval(() => {
      fetchGame();
    }, 1000); // Poll every second

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
              // Poll every 2 seconds as backup
              pollInterval = setInterval(() => {
                fetchGame();
              }, 2000);
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
  }, [gameId]);

  return { game, loading, error, refetch: fetchGame };
}

