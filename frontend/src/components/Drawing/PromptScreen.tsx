import { useState, useEffect, useCallback, useRef } from 'react';
import { PromptInput } from './PromptInput';
import { AnimationViewer } from '../Animation/AnimationViewer';
import { useGame } from '../../hooks/useGame';
import { supabase } from '../../lib/supabase';
import type { Round, Frame, Player, Prompt } from '../../types';

interface PromptScreenProps {
  gameId: string;
  playerId: string;
  onStatusChange: (status: 'lobby' | 'drawing' | 'viewing' | 'prompt' | 'complete') => void;
}

export function PromptScreen({ gameId, playerId, onStatusChange }: PromptScreenProps) {
  const { game } = useGame(gameId);
  const [frames, setFrames] = useState<Frame[]>([]);
  const [_players, setPlayers] = useState<Player[]>([]);
  const [_round, setRound] = useState<Round | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [previousPlayer, setPreviousPlayer] = useState<Player | null>(null);
  const [currentPrompt, setCurrentPrompt] = useState<Prompt | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(60); // 60 seconds for prompt writing
  const [submissionProgress, setSubmissionProgress] = useState({ submitted: 0, total: 0 });
  const initializedRoundRef = useRef<number | null>(null); // Track which round we've initialized for
  const timerInitializedRef = useRef(false); // Track if timer has been initialized for this round
  const currentPromptRef = useRef<Prompt | null>(null); // Track current prompt to avoid closure issues
  const lastGameStatusRef = useRef<string | null>(null); // Track last game status for polling
  const timerStartRef = useRef<number | null>(null); // Track when timer started
  const timerDurationRef = useRef<number>(60); // Track initial duration

  useEffect(() => {
    if (!game) return;

    const currentRound = game.current_round || 1;
    
    // If we already have a prompt for this round, skip all initialization
    // This prevents resetting state after submission
    if (currentPromptRef.current && currentPromptRef.current.round_number === currentRound) {
      console.log('Already have prompt for this round, skipping initialization');
      return;
    }
    
    // Reset initialization flag when round changes
    if (initializedRoundRef.current !== currentRound) {
      console.log('Round changed:', initializedRoundRef.current, '->', currentRound);
      initializedRoundRef.current = currentRound;
      timerInitializedRef.current = false;
      // Only clear currentPrompt if we're actually moving to a new round
      // AND the current prompt is for a different round
      if (currentPromptRef.current && currentPromptRef.current.round_number !== currentRound) {
        setCurrentPrompt(null); // Clear prompt state for new round
        currentPromptRef.current = null;
      }
      if (!currentPromptRef.current || currentPromptRef.current.round_number !== currentRound) {
        setTimeRemaining(60); // Reset timer for new round
      }
    }
    
    // Get all players to determine chain order (always fetch, even if we have a prompt)
    supabase
      .from('players')
      .select('*')
      .eq('game_id', gameId)
      .order('turn_order', { ascending: true })
      .then(({ data: allPlayers, error: playersError }) => {
        if (!playersError && allPlayers) {
          setPlayers(allPlayers);
          
          // Get current player
          const current = allPlayers.find(p => p.id === playerId);
          if (current) {
            setCurrentPlayer(current);
          }
        }
      });

    // For Round 1, there's no previous animation - everyone writes initial prompt
    // For subsequent rounds, show previous player's animation (circular chain)
    const previousRoundNumber = (game.current_round || 1) - 1;
    if (previousRoundNumber > 0) {
      // Get all players to find previous player in chain
      supabase
        .from('players')
        .select('*')
        .eq('game_id', gameId)
        .order('turn_order', { ascending: true })
        .then(({ data: allPlayers, error: playersError }) => {
          if (!playersError && allPlayers) {
            const current = allPlayers.find(p => p.id === playerId);
            if (current) {
              // Find previous player in chain (circular: Player 1 sees Player N's animation)
              // This is the player who drew the animation we're writing a prompt for
              const currentIndex = allPlayers.findIndex(p => p.id === playerId);
              const previousIndex = currentIndex === 0 ? allPlayers.length - 1 : currentIndex - 1;
              const previous = allPlayers[previousIndex];
              
              if (previous) {
                setPreviousPlayer(previous);
                
                // Get previous round (handle duplicates by ordering and limiting)
                supabase
                  .from('rounds')
                  .select('*')
                  .eq('game_id', gameId)
                  .eq('round_number', previousRoundNumber)
                  .order('started_at', { ascending: false })
                  .limit(1)
                  .maybeSingle()
                  .then(({ data: prevRound, error: roundError }) => {
                    if (!roundError && prevRound) {
                      loadFrames(prevRound.id, previous.id);
                    } else if (roundError) {
                      console.error('Error fetching previous round:', roundError);
                    }
                  });
              }
            }
          }
        });
    } else {
      // Round 1: No previous animation, just write initial prompt
      setPreviousPlayer(null);
      setFrames([]);
    }

    // Fetch current round (handle duplicates by ordering and limiting)
      // currentRound already declared at the top of this useEffect
      supabase
        .from('rounds')
        .select('*')
        .eq('game_id', gameId)
        .eq('round_number', currentRound)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      .then(({ data, error }) => {
        if (!error && data) {
          setRound(data);
        } else if (error) {
          console.error('Error fetching current round:', error);
        } else if (!data) {
          console.log('No round found for round_number:', currentRound);
        }
      });

    // Fetch current player's prompt for this round (if exists) - only once per round
    // Skip if we already have a prompt for this round in state (use ref to avoid closure issues)
    if (!timerInitializedRef.current && !(currentPromptRef.current && currentPromptRef.current.round_number === currentRound)) {
      timerInitializedRef.current = true; // Mark as initialized to prevent re-fetching
      
      supabase
        .from('prompts')
        .select('*')
        .eq('game_id', gameId)
        .eq('round_number', game.current_round || 1)
        .eq('player_id', playerId)
        .single()
        .then(({ data: prompt, error }) => {
          // Use ref to check current state (avoids closure issues)
          // Only update if we don't already have a prompt in state
          // This prevents overwriting the prompt state after submission
          if (currentPromptRef.current && currentPromptRef.current.round_number === currentRound) {
            console.log('Skipping prompt fetch - already have prompt in state');
            return;
          }
          
          if (!error && prompt) {
            // Player has already submitted - set prompt and stop timer
            console.log('Found existing prompt for round', game.current_round, ':', prompt);
            setCurrentPrompt(prompt);
            currentPromptRef.current = prompt;
            setTimeRemaining(0); // Stop timer
          } else {
            // Player hasn't submitted yet - timer should already be set
            console.log('No existing prompt for round', game.current_round, ', timer should already be set');
          }
        });
    }
  }, [gameId, game, playerId]); // Removed currentPrompt from deps to prevent re-runs when prompt is set

  // Robust helper to verify all players have submitted (shared logic with DrawingScreen)
  const verifyAllPlayersSubmitted = useCallback(async (
    phase: 'drawing' | 'prompt',
    roundNumber: number,
    maxRetries: number = 3
  ): Promise<{ allSubmitted: boolean; playerCount: number; submittedCount: number; missingPlayers: string[] }> => {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Get all players with retry
        const { data: allPlayers, error: playersError } = await supabase
          .from('players')
          .select('id, nickname')
          .eq('game_id', gameId)
          .order('turn_order', { ascending: true });

        if (playersError) {
          console.error(`[verifyAllPlayersSubmitted] Attempt ${attempt + 1}: Error fetching players:`, playersError);
          if (attempt < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
            continue;
          }
          return { allSubmitted: false, playerCount: 0, submittedCount: 0, missingPlayers: [] };
        }

        const playerCount = allPlayers?.length || 0;
        if (playerCount === 0) {
          console.warn('[verifyAllPlayersSubmitted] No players found in game');
          return { allSubmitted: false, playerCount: 0, submittedCount: 0, missingPlayers: [] };
        }

        const allPlayerIds = new Set(allPlayers.map(p => p.id));

        // Check submissions based on phase
        let submissions: any[] = [];
        if (phase === 'drawing') {
          const { data: submittedDrawings, error: submissionsError } = await supabase
            .from('player_submissions')
            .select('player_id')
            .eq('game_id', gameId)
            .eq('round_number', roundNumber)
            .eq('phase', 'drawing');

          if (submissionsError) {
            console.error(`[verifyAllPlayersSubmitted] Attempt ${attempt + 1}: Error checking submissions:`, submissionsError);
            if (attempt < maxRetries - 1) {
              await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
              continue;
            }
            return { allSubmitted: false, playerCount, submittedCount: 0, missingPlayers: Array.from(allPlayerIds) };
          }
          submissions = submittedDrawings || [];
        } else {
          // Prompt phase
          const { data: submittedPrompts, error: promptsError } = await supabase
            .from('prompts')
            .select('player_id')
            .eq('game_id', gameId)
            .eq('round_number', roundNumber);

          if (promptsError) {
            console.error(`[verifyAllPlayersSubmitted] Attempt ${attempt + 1}: Error checking prompts:`, promptsError);
            if (attempt < maxRetries - 1) {
              await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
              continue;
            }
            return { allSubmitted: false, playerCount, submittedCount: 0, missingPlayers: Array.from(allPlayerIds) };
          }
          submissions = submittedPrompts || [];
        }

        // Get unique submitted player IDs
        const submittedPlayerIds = new Set(submissions.map(s => s.player_id));
        const submittedCount = submittedPlayerIds.size;

        // Find missing players
        const missingPlayers = Array.from(allPlayerIds).filter(id => !submittedPlayerIds.has(id));
        const missingPlayerNames = missingPlayers
          .map(id => allPlayers.find(p => p.id === id)?.nickname || id)
          .filter(Boolean);

        // Verify completeness
        const allSubmitted = submittedCount >= playerCount && missingPlayers.length === 0;

        if (!allSubmitted && attempt < maxRetries - 1) {
          console.log(`[verifyAllPlayersSubmitted] Attempt ${attempt + 1}: Not all players submitted. Missing: ${missingPlayerNames.join(', ')}`);
          await new Promise(resolve => setTimeout(resolve, 1500));
          continue;
        }

        return {
          allSubmitted,
          playerCount,
          submittedCount,
          missingPlayers: missingPlayerNames
        };
      } catch (error) {
        console.error(`[verifyAllPlayersSubmitted] Attempt ${attempt + 1} failed:`, error);
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
          continue;
        }
      }
    }

    return { allSubmitted: false, playerCount: 0, submittedCount: 0, missingPlayers: [] };
  }, [gameId]);

  // Define checkAndTransitionToDrawing BEFORE it's used in useEffect
  const checkAndTransitionToDrawing = useCallback(async () => {
    if (!game) return;

    const currentRound = game.current_round || 1;
    console.log('[checkAndTransitionToDrawing] Checking for round', currentRound);

    // Robust verification with retries
    const verification = await verifyAllPlayersSubmitted('prompt', currentRound, 3);
    
    setSubmissionProgress({ submitted: verification.submittedCount, total: verification.playerCount });
    console.log(`[checkAndTransitionToDrawing] Prompts submitted: ${verification.submittedCount}/${verification.playerCount} for round ${currentRound}`);
    
    if (verification.missingPlayers.length > 0) {
      console.log(`[checkAndTransitionToDrawing] Missing players: ${verification.missingPlayers.join(', ')}`);
    }

    // If all players have submitted (with verification), move to drawing phase
    if (verification.allSubmitted && verification.submittedCount >= verification.playerCount) {
      console.log('[checkAndTransitionToDrawing] All prompts submitted, checking game status...');
      
      // Double-check current game status
      const { data: currentGame, error: gameError } = await supabase
        .from('games')
        .select('status, current_round')
        .eq('id', gameId)
        .single();

      if (gameError) {
        console.error('[checkAndTransitionToDrawing] Error fetching game:', gameError);
        return;
      }

      // Final verification: Double-check all players are still accounted for
      const finalVerification = await verifyAllPlayersSubmitted('prompt', currentRound, 2);
      if (!finalVerification.allSubmitted) {
        console.warn('[checkAndTransitionToDrawing] Final verification failed. Missing players:', finalVerification.missingPlayers);
        setSubmissionProgress({ submitted: finalVerification.submittedCount, total: finalVerification.playerCount });
        return;
      }

      // Verify we're still on the same round and status
      if (currentGame && currentGame.status === 'prompt' && currentGame.current_round === currentRound) {
        // Move to drawing phase with retry mechanism
        let updateSuccess = false;
        for (let retry = 0; retry < 3; retry++) {
          const { error: updateError } = await supabase
            .from('games')
            .update({ status: 'drawing' })
            .eq('id', gameId)
            .eq('status', 'prompt')
            .eq('current_round', currentRound);

          if (!updateError) {
            console.log('[checkAndTransitionToDrawing] Successfully updated game status to drawing, transitioning...');
            onStatusChange('drawing');
            updateSuccess = true;
            break;
          } else {
            console.warn(`[checkAndTransitionToDrawing] Status update attempt ${retry + 1} failed:`, updateError);
            // Check if another player already updated
            const { data: latestGame } = await supabase
              .from('games')
              .select('status, current_round')
              .eq('id', gameId)
              .single();
            
            if (latestGame && latestGame.status === 'drawing' && latestGame.current_round === currentRound) {
              console.log('[checkAndTransitionToDrawing] Status already updated to drawing by another player');
              onStatusChange('drawing');
              updateSuccess = true;
              break;
            }
            
            if (retry < 2) {
              await new Promise(resolve => setTimeout(resolve, 1000 * (retry + 1)));
            }
          }
        }

        if (!updateSuccess) {
          console.error('[checkAndTransitionToDrawing] Failed to update status after all retries. Will retry on next poll.');
        }
      } else {
        console.log(`[checkAndTransitionToDrawing] Game status mismatch. Current: ${currentGame?.status}, Round: ${currentGame?.current_round}, Expected: prompt/${currentRound}`);
        // If status changed, update UI to match
        if (currentGame?.status === 'drawing') {
          onStatusChange('drawing');
        }
      }
    }
  }, [game, gameId, onStatusChange, verifyAllPlayersSubmitted]);

  // Always poll for prompt submission progress when in prompt phase
  // This ensures we detect when all players submit, even if one player's polling fails
  useEffect(() => {
    if (!game || game.status !== 'prompt') {
      return;
    }

    const currentRound = game.current_round || 1;
    if (currentRound < 1) {
      return;
    }

    console.log('[PromptScreen] Starting polling for prompt completion (always active)...');
    
    // Poll every 2 seconds to reduce CPU usage while still being responsive
    // This ensures we detect submissions even from other players
    const pollInterval = setInterval(async () => {
      try {
        // Get all players
        const { data: allPlayers, error: playersError } = await supabase
          .from('players')
          .select('id')
          .eq('game_id', gameId);

        if (playersError) {
          console.error('[PromptScreen] Error fetching players during poll:', playersError);
          return;
        }

        const playerCount = allPlayers?.length || 0;
        if (playerCount === 0) return;

        // Check how many prompts have been submitted for this round
        const { data: submittedPrompts, error: promptsError } = await supabase
          .from('prompts')
          .select('player_id')
          .eq('game_id', gameId)
          .eq('round_number', currentRound);

        if (promptsError) {
          console.error('[PromptScreen] Error checking prompts during poll:', promptsError);
          return;
        }

        const submittedCount = submittedPrompts?.length || 0;
        const uniquePlayerIds = new Set(submittedPrompts?.map(p => p.player_id) || []);
        const uniqueCount = uniquePlayerIds.size;
        
        setSubmissionProgress({ submitted: uniqueCount, total: playerCount });
        console.log(`[PromptScreen Poll] Prompts submitted: ${uniqueCount}/${playerCount} (raw count: ${submittedCount}) for round ${currentRound}`);

        // If all players have submitted, trigger transition check
        if (uniqueCount >= playerCount) {
          console.log('[PromptScreen Poll] All prompts submitted, calling checkAndTransitionToDrawing');
          await checkAndTransitionToDrawing();
        }
      } catch (err) {
        console.error('[PromptScreen] Error in polling for prompt completion:', err);
      }
    }, 2000); // Poll every 2 seconds to reduce CPU usage

    // Also check immediately on mount
    checkAndTransitionToDrawing();

    return () => {
      console.log('[PromptScreen] Stopping polling for prompts');
      clearInterval(pollInterval);
    };
  }, [game, gameId, checkAndTransitionToDrawing]);

  // Check if current player has already submitted on mount
  useEffect(() => {
    if (!game || !gameId || !playerId) return;

    const currentRound = game.current_round || 1;
    if (currentRound < 1) {
      return;
    }

    supabase
      .from('prompts')
      .select('*')
      .eq('game_id', gameId)
      .eq('round_number', currentRound)
      .eq('player_id', playerId)
      .maybeSingle()
      .then(({ data: prompt, error }) => {
        if (!error && prompt) {
          console.log('[PromptScreen] Player has already submitted prompt for this round');
          const promptObject: Prompt = {
            id: prompt.id || '',
            game_id: gameId,
            round_number: currentRound,
            player_id: playerId,
            prompt: prompt.prompt,
            created_at: prompt.created_at || new Date().toISOString(),
            updated_at: prompt.updated_at || new Date().toISOString(),
          };
          setCurrentPrompt(promptObject);
          currentPromptRef.current = promptObject;
          setTimeRemaining(0);
          // Also check submission progress
          checkAndTransitionToDrawing();
        } else if (error && error.code !== 'PGRST116') {
          // PGRST116 is "no rows returned" which is fine
          console.error('[PromptScreen] Error checking prompt status:', error);
        }
      });
  }, [game, gameId, playerId, checkAndTransitionToDrawing]);

  // Subscribe to game status changes to detect when all prompts are submitted
  // Use polling fallback since realtime may not be reliable
  useEffect(() => {
    if (!game || !gameId) return;

    let channel: ReturnType<typeof supabase.channel> | null = null;
    let pollInterval: ReturnType<typeof setInterval> | null = null;
    
    // Initialize last status if not set
    if (lastGameStatusRef.current === null && game?.status) {
      lastGameStatusRef.current = game.status;
    }

    // Always start polling (works even without realtime)
    pollInterval = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from('games')
          .select('status')
          .eq('id', gameId)
          .single();
        
        if (!error && data) {
          const currentStatus = data.status;
          const previousStatus = lastGameStatusRef.current;
          
          // Check if status changed from 'prompt' to 'drawing'
          if (previousStatus === 'prompt' && currentStatus === 'drawing') {
            console.log('Game status changed via polling: prompt -> drawing');
            onStatusChange('drawing');
          }
          lastGameStatusRef.current = currentStatus;
        }
      } catch (err) {
        console.error('Error polling game status:', err);
      }
    }, 2000); // Poll every 2 seconds to reduce CPU usage

    // Try realtime subscription (optional optimization)
    try {
      channel = supabase
        .channel(`game-status-prompt:${gameId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'games',
            filter: `id=eq.${gameId}`,
          },
          (payload) => {
            const updatedGame = payload.new as typeof game;
            const oldStatus = lastGameStatusRef.current;
            lastGameStatusRef.current = updatedGame.status;
            if (oldStatus === 'prompt' && updatedGame.status === 'drawing') {
              console.log('Game status changed via realtime: prompt -> drawing');
              onStatusChange('drawing');
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('PromptScreen: Successfully subscribed to game status updates - realtime active');
          }
        });
    } catch (error) {
      console.warn('PromptScreen: Realtime not available, using polling only:', error);
    }

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [gameId, game, onStatusChange]);

  const handlePromptSubmit = useCallback(async (promptText: string) => {
    if (!game || !currentPlayer) {
      console.log('Cannot submit: missing game or currentPlayer');
      return;
    }
    
    // Prevent double submission - check both state and database
    if (currentPrompt) {
      console.log('Already submitted, ignoring duplicate submission');
      return;
    }

    // Set submitting state immediately to prevent multiple clicks
    const tempPrompt: Prompt = {
      id: 'temp',
      game_id: gameId,
      round_number: game.current_round || 1,
      player_id: playerId,
      prompt: promptText,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setCurrentPrompt(tempPrompt);
    currentPromptRef.current = tempPrompt;

    console.log('Submitting prompt:', promptText);

    // Store prompt in prompts table (per player per round)
    const { error: promptError } = await supabase
      .from('prompts')
      .upsert({
        game_id: gameId,
        round_number: game.current_round || 1,
        player_id: playerId,
        prompt: promptText,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'game_id,round_number,player_id'
      });

    if (promptError) {
      console.error('Error saving prompt:', promptError);
      // Reset prompt state on error
      setCurrentPrompt(null);
      return;
    }

    // Also record submission in player_submissions table
    const { error: submissionError } = await supabase
      .from('player_submissions')
      .upsert({
        game_id: gameId,
        round_number: game.current_round || 1,
        player_id: playerId,
        phase: 'prompt',
      }, {
        onConflict: 'game_id,round_number,player_id,phase'
      });

    if (submissionError) {
      console.error('Error saving submission:', submissionError);
      alert(`Error saving submission: ${submissionError.message}`);
      // Reset prompt state on error
      setCurrentPrompt(null);
      currentPromptRef.current = null;
      return;
    }

    console.log('Successfully saved prompt submission for player:', playerId);

    // Update current prompt state with the saved prompt
    const promptObject: Prompt = {
      id: '',
      game_id: gameId,
      round_number: game.current_round || 1,
      player_id: playerId,
      prompt: promptText,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    console.log('Setting currentPrompt to:', promptObject);
    setCurrentPrompt(promptObject);
    currentPromptRef.current = promptObject;
    
    // Stop the timer immediately
    setTimeRemaining(0);

    // Check if all players have submitted and transition if needed
    await checkAndTransitionToDrawing();
  }, [game, currentPlayer, currentPrompt, gameId, playerId, checkAndTransitionToDrawing]);

  // Initialize timer start time when round changes
  useEffect(() => {
    if (game && game.status === 'prompt' && !currentPromptRef.current && timeRemaining > 0) {
      const currentRound = game.current_round || 1;
      if (initializedRoundRef.current === currentRound) {
        timerStartRef.current = Date.now();
        timerDurationRef.current = timeRemaining;
      }
    }
  }, [game?.current_round, game?.status, timeRemaining]);

  // Real-time accurate timer using Date-based calculation
  useEffect(() => {
    if (!game || game.status !== 'prompt') return;
    
    // Stop timer if player has already submitted (use ref to avoid closure issues)
    if (currentPromptRef.current) return;
    
    if (timeRemaining <= 0) {
      // Auto-submit empty prompt if time runs out
      handlePromptSubmit('');
      return;
    }

    if (timerStartRef.current === null) {
      timerStartRef.current = Date.now();
      timerDurationRef.current = timeRemaining;
    }

    // Update timer every 100ms for smooth display, but calculate based on elapsed time
    const timer = setInterval(() => {
      if (timerStartRef.current === null) return;
      
      const elapsed = Math.floor((Date.now() - timerStartRef.current) / 1000);
      const remaining = Math.max(0, timerDurationRef.current - elapsed);
      
      setTimeRemaining(remaining);
      
      if (remaining <= 0) {
        handlePromptSubmit('');
      }
    }, 100); // Update every 100ms for smooth display

    return () => clearInterval(timer);
  }, [timeRemaining, game, handlePromptSubmit]); // Use ref instead of currentPrompt in deps

  const loadFrames = async (roundId: string, prevPlayerId: string) => {
    try {
      const { data, error } = await supabase
        .from('frames')
        .select('*')
        .eq('round_id', roundId)
        .eq('player_id', prevPlayerId)
        .order('frame_number', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get latest frame for each frame_number
      const latestFrames: Record<number, Frame> = {};
      (data || []).forEach((frame) => {
        const existing = latestFrames[frame.frame_number];
        if (!existing || new Date(frame.created_at) > new Date(existing.created_at)) {
          latestFrames[frame.frame_number] = frame;
        }
      });

      setFrames(Object.values(latestFrames).sort((a, b) => a.frame_number - b.frame_number));
    } catch (err) {
      console.error('Error loading frames:', err);
    }
  };

  return (
    <div className="prompt-screen">
      <div className="prompt-header">
        <h2>Write a Prompt</h2>
        <p>
          {game?.current_round === 1
            ? 'Write an initial prompt for the first drawing'
            : 'Watch the previous animation and write a prompt for the next player'}
        </p>
        {!currentPrompt && (
          <div className="prompt-timer">
            Time: {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
          </div>
        )}
      </div>
      <div className="prompt-content">
        {previousPlayer && frames.length > 0 && (
          <div className="previous-animation">
            <h3>{previousPlayer.nickname}'s Animation</h3>
            <AnimationViewer frames={frames} playerName={previousPlayer.nickname} />
          </div>
        )}
        {currentPrompt ? (
          <div className="prompt-submitted">
            <p className="submission-status">Your prompt has been submitted!</p>
            <p className="prompt-submitted-text">"{currentPrompt.prompt || '(empty prompt)'}"</p>
            <p className="waiting-message">
              Waiting for other players to submit their prompts... ({submissionProgress.submitted}/{submissionProgress.total})
            </p>
          </div>
        ) : (
          <PromptInput
            onPromptSubmit={handlePromptSubmit}
            currentPrompt=""
            isSubmitted={!!currentPrompt}
          />
        )}
      </div>
    </div>
  );
}

