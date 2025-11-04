import { useState, useEffect, useCallback, useRef } from 'react';
import { DrawingCanvas } from './DrawingCanvas';
import { FrameSelector } from './FrameSelector';
import { ToolPanel } from './ToolPanel';
import { DrawingTimer } from './DrawingTimer';
import { PromptDisplay } from './PromptDisplay';
import { DrawingProvider } from './DrawingContext';
import { useGame } from '../../hooks/useGame';
import { supabase } from '../../lib/supabase';
import { soundManager } from '../../lib/sounds';
import type { Round, Player } from '../../types';

interface DrawingScreenProps {
  gameId: string;
  playerId: string;
  onStatusChange: (status: 'lobby' | 'drawing' | 'viewing' | 'prompt' | 'complete') => void;
}

export function DrawingScreen({ gameId, playerId, onStatusChange }: DrawingScreenProps) {
  const { game } = useGame(gameId);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [round, setRound] = useState<Round | null>(null);
  const [prompt, setPrompt] = useState<string>('Loading prompt...');
  const [timeRemaining, setTimeRemaining] = useState(180); // 3 minutes in seconds
  const timerStartRef = useRef<number | null>(null); // Track when timer started
  const timerDurationRef = useRef<number>(180); // Track initial duration
  const [completedFrames, setCompletedFrames] = useState<Set<number>>(new Set());
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submissionProgress, setSubmissionProgress] = useState({ submitted: 0, total: 0 });
  const [allFramesComplete, setAllFramesComplete] = useState(false);
  const [_players, setPlayers] = useState<Player[]>([]);
  const [_currentPlayer, setCurrentPlayer] = useState<Player | null>(null);

  // Robust helper to verify all players have submitted with multiple checks
  const verifyAllPlayersSubmitted = useCallback(async (
    phase: 'drawing' | 'prompt',
    roundNumber: number,
    maxRetries: number = 3
  ): Promise<{ allSubmitted: boolean; playerCount: number; submittedCount: number; missingPlayers: string[] }> => {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Get all players with retry - only select needed fields
        const { data: allPlayers, error: playersError } = await supabase
          .from('players')
          .select('id, nickname')
          .eq('game_id', gameId)
          .order('turn_order', { ascending: true });

        if (playersError) {
          console.error(`[verifyAllPlayersSubmitted] Attempt ${attempt + 1}: Error fetching players:`, playersError);
          if (attempt < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1))); // Exponential backoff
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

        // Check submissions based on phase - only select player_id for performance
        let submissions: any[] = [];
        if (phase === 'drawing') {
          const { data: submittedDrawings, error: submissionsError } = await supabase
            .from('player_submissions')
            .select('player_id') // Only select what we need
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
          // Prompt phase - only select player_id for performance
          const { data: submittedPrompts, error: promptsError } = await supabase
            .from('prompts')
            .select('player_id') // Only select what we need
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
          // Retry after short delay
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

  // Define checkAndTransitionToViewing BEFORE it's used in useEffect
  const checkAndTransitionToViewing = useCallback(async () => {
    if (!game || !gameId) return;

    const currentRound = game.current_round;
    if (!currentRound || currentRound < 1) {
      console.error('Invalid current_round:', currentRound);
      return;
    }

    // Robust verification with retries
    const verification = await verifyAllPlayersSubmitted('drawing', currentRound, 3);
    
    setSubmissionProgress({ submitted: verification.submittedCount, total: verification.playerCount });
    
    console.log(`[checkAndTransitionToViewing] Drawings submitted: ${verification.submittedCount}/${verification.playerCount} for round ${currentRound}`);
    
    if (verification.missingPlayers.length > 0) {
      console.log(`[checkAndTransitionToViewing] Missing players: ${verification.missingPlayers.join(', ')}`);
    }

    // If all players have submitted (with verification), move to next phase
    if (verification.allSubmitted && verification.submittedCount >= verification.playerCount) {
      console.log('[checkAndTransitionToViewing] All drawings submitted, checking game status...');
      
      // Double-check current game status
      const { data: currentGame, error: gameError } = await supabase
        .from('games')
        .select('status, current_round, total_rounds')
        .eq('id', gameId)
        .single();

      if (gameError) {
        console.error('[checkAndTransitionToViewing] Error fetching game:', gameError);
        return;
      }

      // Final verification: Double-check all players are still accounted for
      const finalVerification = await verifyAllPlayersSubmitted('drawing', currentRound, 2);
      if (!finalVerification.allSubmitted) {
        console.warn('[checkAndTransitionToViewing] Final verification failed. Missing players:', finalVerification.missingPlayers);
        // Update progress but don't transition yet
        setSubmissionProgress({ submitted: finalVerification.submittedCount, total: finalVerification.playerCount });
        return;
      }

      // Verify we're still on the same round and status
      if (currentGame && currentGame.status === 'drawing' && currentGame.current_round === currentRound) {
        const isLastRound = (currentGame.current_round || 0) >= (currentGame.total_rounds || 0);
        
        if (isLastRound) {
          // Last round - show all animations at the end
          // Retry mechanism for status update
          let updateSuccess = false;
          for (let retry = 0; retry < 3; retry++) {
            const { error: updateError } = await supabase
              .from('games')
              .update({ status: 'complete' })
              .eq('id', gameId)
              .eq('status', 'drawing')
              .eq('current_round', currentRound);

            if (!updateError) {
              console.log('[checkAndTransitionToViewing] All drawings submitted for final round, transitioning to complete');
              onStatusChange('complete');
              updateSuccess = true;
              break;
            } else {
              console.warn(`[checkAndTransitionToViewing] Status update attempt ${retry + 1} failed:`, updateError);
              // Check if another player already updated
              const { data: latestGame } = await supabase
                .from('games')
                .select('status, current_round')
                .eq('id', gameId)
                .single();
              
              if (latestGame && latestGame.status === 'complete') {
                console.log('[checkAndTransitionToViewing] Status already updated to complete by another player');
                onStatusChange('complete');
                updateSuccess = true;
                break;
              }
              
              if (retry < 2) {
                await new Promise(resolve => setTimeout(resolve, 1000 * (retry + 1)));
              }
            }
          }

          if (!updateSuccess) {
            console.error('[checkAndTransitionToViewing] Failed to update status after all retries. Will retry on next poll.');
          }
        } else {
          // Not last round - go to prompt phase for next round
          const nextRound = (currentGame.current_round || 0) + 1;
          
          // Ensure next round exists (with retry)
          let roundExists = false;
          for (let retry = 0; retry < 3; retry++) {
            const { data: existingRound } = await supabase
              .from('rounds')
              .select('id')
              .eq('game_id', gameId)
              .eq('round_number', nextRound)
              .maybeSingle();

            if (existingRound) {
              roundExists = true;
              break;
            }

            // Create round if it doesn't exist
            const { error: roundError } = await supabase.from('rounds').insert({
              game_id: gameId,
              round_number: nextRound,
              prompt: '', // Will be set by players in prompt screen
            });

            if (!roundError) {
              roundExists = true;
              break;
            } else {
              console.warn(`[checkAndTransitionToViewing] Round creation attempt ${retry + 1} failed:`, roundError);
              // Check again if another player created it
              const { data: checkRound } = await supabase
                .from('rounds')
                .select('id')
                .eq('game_id', gameId)
                .eq('round_number', nextRound)
                .maybeSingle();
              
              if (checkRound) {
                roundExists = true;
                break;
              }
              
              if (retry < 2) {
                await new Promise(resolve => setTimeout(resolve, 1000 * (retry + 1)));
              }
            }
          }

          if (!roundExists) {
            console.error('[checkAndTransitionToViewing] Failed to ensure next round exists after all retries.');
            return;
          }

          // Move to prompt input phase with retry mechanism
          let updateSuccess = false;
          for (let retry = 0; retry < 3; retry++) {
            const { error: updateError } = await supabase
              .from('games')
              .update({
                status: 'prompt',
                current_round: nextRound,
              })
              .eq('id', gameId)
              .eq('status', 'drawing')
              .eq('current_round', currentRound);

            if (!updateError) {
              console.log('[checkAndTransitionToViewing] All drawings submitted, transitioning to prompt phase for next round');
              onStatusChange('prompt');
              updateSuccess = true;
              break;
            } else {
              console.warn(`[checkAndTransitionToViewing] Status update attempt ${retry + 1} failed:`, updateError);
              // Check if another player already updated
              const { data: latestGame } = await supabase
                .from('games')
                .select('status, current_round')
                .eq('id', gameId)
                .single();
              
              if (latestGame && latestGame.status === 'prompt' && latestGame.current_round === nextRound) {
                console.log('[checkAndTransitionToViewing] Status already updated to prompt by another player');
                onStatusChange('prompt');
                updateSuccess = true;
                break;
              }
              
              if (retry < 2) {
                await new Promise(resolve => setTimeout(resolve, 1000 * (retry + 1)));
              }
            }
          }

          if (!updateSuccess) {
            console.error('[checkAndTransitionToViewing] Failed to update status after all retries. Will retry on next poll.');
          }
        }
      } else {
        console.log(`[checkAndTransitionToViewing] Game status mismatch. Current: ${currentGame?.status}, Round: ${currentGame?.current_round}, Expected: drawing/${currentRound}`);
        // If status changed, update UI to match
        if (currentGame?.status === 'prompt') {
          onStatusChange('prompt');
        } else if (currentGame?.status === 'complete') {
          onStatusChange('complete');
        }
      }
    }
  }, [game, gameId, onStatusChange, verifyAllPlayersSubmitted]);

  useEffect(() => {
    if (!game) return;

    // Fetch current round
    const currentRound = game.current_round;
    if (!currentRound || currentRound < 1) {
      console.error('Invalid current_round:', currentRound);
      return;
    }

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

    // Get all players to determine prompt chain
    supabase
      .from('players')
      .select('*')
      .eq('game_id', gameId)
      .order('turn_order', { ascending: true })
      .then(({ data: allPlayers, error: playersError }) => {
        if (!playersError && allPlayers) {
          setPlayers(allPlayers);
          const current = allPlayers.find(p => p.id === playerId);
          if (current) {
            setCurrentPlayer(current);
            
            // Get prompt from previous player in chain (circular)
            // Player 1 gets prompt from Player N (last player)
            // Player 2 gets prompt from Player 1
            // etc.
            const currentIndex = allPlayers.findIndex(p => p.id === playerId);
            const previousIndex = currentIndex === 0 ? allPlayers.length - 1 : currentIndex - 1;
            const previousPlayer = allPlayers[previousIndex];
            
            if (previousPlayer) {
              // Fetch prompt from previous player for current round
              const currentRound = game.current_round;
              if (currentRound && currentRound >= 1) {
                supabase
                  .from('prompts')
                  .select('prompt')
                  .eq('game_id', gameId)
                  .eq('round_number', currentRound)
                  .eq('player_id', previousPlayer.id)
                  .single()
                  .then(({ data: promptData, error: promptError }) => {
                    if (!promptError && promptData) {
                      setPrompt(promptData.prompt);
                    } else {
                      setPrompt('No prompt available');
                    }
                  });
              } else {
                setPrompt('No prompt available');
              }
            }
          }
        }
      });

    // Subscribe to game status changes
    const channel = supabase
      .channel(`game-status:${gameId}`)
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
          if (updatedGame.status !== 'drawing') {
            onStatusChange(updatedGame.status);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, game, onStatusChange]);


  // Always poll for submission progress when in drawing phase
  // This ensures we detect when all players submit, even if one player's polling fails
  useEffect(() => {
    if (!game || game.status !== 'drawing') {
      return;
    }

    const currentRound = game.current_round;
    if (!currentRound || currentRound < 1) {
      return;
    }

    console.log('Starting polling for drawing completion (always active)...');
    
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
          console.error('Error fetching players during poll:', playersError);
          return;
        }

        const playerCount = allPlayers?.length || 0;
        if (playerCount === 0) return;

        // Check how many players have submitted their drawings for this round
        const { data: submittedDrawings, error: submissionsError } = await supabase
          .from('player_submissions')
          .select('player_id')
          .eq('game_id', gameId)
          .eq('round_number', currentRound)
          .eq('phase', 'drawing');

        if (submissionsError) {
          console.error('Error checking submissions during poll:', submissionsError);
          return;
        }

        const submittedCount = submittedDrawings?.length || 0;
        setSubmissionProgress({ submitted: submittedCount, total: playerCount });
        console.log(`[Poll] Drawings submitted: ${submittedCount}/${playerCount} for round ${currentRound}`);

        // If all players have submitted, trigger transition check
        if (submittedCount >= playerCount) {
          console.log('[Poll] All drawings submitted, calling checkAndTransitionToViewing');
          await checkAndTransitionToViewing();
        }
      } catch (err) {
        console.error('Error in polling for drawing completion:', err);
      }
    }, 2000); // Poll every 2 seconds to reduce CPU usage

    // Also check immediately on mount
    checkAndTransitionToViewing();

    return () => {
      console.log('Stopping polling for drawings');
      clearInterval(pollInterval);
    };
  }, [game, gameId, checkAndTransitionToViewing]);

  // Check if current player has already submitted on mount
  useEffect(() => {
    if (!game || !round || !gameId || !playerId) return;

    const currentRound = game.current_round;
    if (!currentRound || currentRound < 1) {
      return;
    }

    supabase
      .from('player_submissions')
      .select('*')
      .eq('game_id', gameId)
      .eq('round_number', currentRound)
      .eq('player_id', playerId)
      .eq('phase', 'drawing')
      .maybeSingle()
      .then(({ data: submission, error }) => {
        if (!error && submission) {
          console.log('Player has already submitted drawing for this round');
          setIsSubmitted(true);
          // Also check submission progress
          checkAndTransitionToViewing();
        } else if (error && error.code !== 'PGRST116') {
          // PGRST116 is "no rows returned" which is fine
          console.error('Error checking submission status:', error);
        }
      });
  }, [game, gameId, round, playerId, checkAndTransitionToViewing]);

  // Define handleSubmit BEFORE it's used in useEffect
  const handleSubmit = useCallback(async () => {
    if (!game || !round || !gameId || !playerId || isSubmitted) return;

    const currentRound = game.current_round;
    if (!currentRound || currentRound < 1) {
      console.error('Invalid current_round:', currentRound);
      return;
    }

    // Verify all frames have data before allowing submission
    if (!allFramesComplete) {
      console.log('Cannot submit: not all frames have data');
      alert('Please complete all frames before submitting');
      return;
    }

    // Mark this player's drawing as submitted
    const { error: submissionError } = await supabase
      .from('player_submissions')
      .upsert({
        game_id: gameId,
        round_number: currentRound,
        player_id: playerId,
        phase: 'drawing',
      }, {
        onConflict: 'game_id,round_number,player_id,phase'
      });

    if (submissionError) {
      console.error('Error saving submission:', submissionError);
      return;
    }

    setIsSubmitted(true);
    
    // Check if all players have submitted and transition if needed
    await checkAndTransitionToViewing();
  }, [game, round, gameId, playerId, isSubmitted, allFramesComplete, checkAndTransitionToViewing]);

  // Initialize timer start time when round changes or timer resets
  useEffect(() => {
    if (game && round && !isSubmitted && timeRemaining > 0) {
      timerStartRef.current = Date.now();
      timerDurationRef.current = timeRemaining;
    }
  }, [game?.current_round, round?.id, isSubmitted]);

  // Real-time accurate timer using Date-based calculation
  useEffect(() => {
    if (timeRemaining <= 0 || isSubmitted) {
      if (timeRemaining <= 0 && !isSubmitted) {
        handleSubmit();
      }
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
      
      if (remaining <= 0 && !isSubmitted) {
        handleSubmit();
      }
    }, 100); // Update every 100ms for smooth display

    return () => clearInterval(timer);
  }, [timeRemaining, game, isSubmitted, handleSubmit]);

  const framesPerRound = game?.frames_per_round || 3;
  
  // Verify frames have actual data
  useEffect(() => {
    if (!round?.id || framesPerRound === 0) {
      setAllFramesComplete(false);
      return;
    }

    const verifyFrames = async () => {
      try {
        const { data: frames, error } = await supabase
          .from('frames')
          .select('frame_number, image_data, created_at')
          .eq('round_id', round.id)
          .eq('player_id', playerId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Get latest frame for each frame_number (handle duplicates)
        const latestFrames: Record<number, boolean> = {};
        (frames || []).forEach((frame) => {
          const frameNum = frame.frame_number;
          if (!latestFrames.hasOwnProperty(frameNum)) {
            const hasData = frame.image_data && 
                           frame.image_data.trim() !== '' && 
                           frame.image_data !== '[]' &&
                           frame.image_data !== 'null';
            latestFrames[frameNum] = hasData;
          }
        });

        // Check if we have data for all required frames
        let allComplete = true;
        for (let i = 0; i < framesPerRound; i++) {
          if (!latestFrames[i]) {
            allComplete = false;
            break;
          }
        }
        
        setAllFramesComplete(allComplete);
      } catch (err) {
        console.error('Error verifying frames:', err);
        setAllFramesComplete(false);
      }
    };

    verifyFrames();

    // Also trigger verification when completedFrames changes (from checkboxes)
    // But always verify against database to ensure frames actually have data
    const interval = setInterval(() => {
      verifyFrames();
    }, 2000); // Check every 2 seconds

    return () => clearInterval(interval);
  }, [round?.id, playerId, framesPerRound]);

  // Check frame completion status
  useEffect(() => {
    if (!round?.id) return;

    const checkFrames = async () => {
      try {
        const { data, error } = await supabase
          .from('frames')
          .select('frame_number, image_data, created_at')
          .eq('round_id', round.id)
          .eq('player_id', playerId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Get latest frame for each frame_number (handle duplicates)
        const latestFrames: Record<number, { hasData: boolean }> = {};
        (data || []).forEach((frame) => {
          const frameNum = frame.frame_number;
          // Only process if we haven't seen this frame_number yet
          // (since we ordered by created_at desc, first one is latest)
          if (!latestFrames[frameNum]) {
            const hasData = frame.image_data && 
                           frame.image_data.trim() !== '' && 
                           frame.image_data !== '[]' &&
                           frame.image_data !== 'null';
            latestFrames[frameNum] = { hasData };
          }
        });

        const completed = new Set<number>();
        Object.keys(latestFrames).forEach((frameNumStr) => {
          const frameNum = parseInt(frameNumStr);
          if (latestFrames[frameNum].hasData) {
            completed.add(frameNum);
          }
        });
        
        setCompletedFrames(completed);
      } catch (err) {
        console.error('Error checking frames:', err);
      }
    };

    checkFrames();

    // Subscribe to frame updates (use separate filters for compatibility)
    const channel = supabase
      .channel(`frames:${round.id}:${playerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'frames',
          filter: `round_id=eq.${round.id}`,
        },
        (payload) => {
          // Only check if the frame belongs to this player
          if (payload.new && (payload.new as any).player_id === playerId) {
            checkFrames();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [round?.id, playerId]);

  return (
    <DrawingProvider>
      <div className="drawing-screen">
        <div className="drawing-header">
          <PromptDisplay prompt={prompt} />
          <DrawingTimer timeRemaining={timeRemaining} />
        </div>
        <div className="drawing-layout">
          <div className="drawing-left">
            <FrameSelector
              frames={framesPerRound}
              currentFrame={currentFrame}
              onFrameSelect={setCurrentFrame}
              roundId={round?.id || ''}
              playerId={playerId}
              completedFrames={completedFrames}
              onFrameCompleteToggle={(frameNum, isComplete) => {
                setCompletedFrames((prev) => {
                  const newSet = new Set(prev);
                  if (isComplete) {
                    newSet.add(frameNum);
                  } else {
                    newSet.delete(frameNum);
                  }
                  return newSet;
                });
              }}
            />
          </div>
          <div className="drawing-center">
            <DrawingCanvas
              gameId={gameId}
              playerId={playerId}
              roundId={round?.id || ''}
              frameNumber={currentFrame}
              framesPerRound={framesPerRound}
              onFrameComplete={(frameNum) => {
                setCompletedFrames((prev) => new Set([...prev, frameNum]));
              }}
            />
          </div>
          <div className="drawing-right">
            <ToolPanel />
          </div>
        </div>
        <div className="drawing-footer">
          {isSubmitted ? (
            <div className="submission-waiting">
              <p className="submission-status">Your drawing has been submitted!</p>
              <p className="waiting-message">
                Waiting for other players to finish... ({submissionProgress.submitted}/{submissionProgress.total})
              </p>
            </div>
          ) : allFramesComplete ? (
            <button 
              className="btn btn-primary btn-large" 
              onClick={() => {
                soundManager.playSubmit();
                handleSubmit();
              }}
              onMouseEnter={() => soundManager.playHover()}
            >
              SUBMIT
            </button>
          ) : (
            <div className="submit-info">
              Complete all {framesPerRound} frames to submit ({completedFrames.size}/{framesPerRound})
            </div>
          )}
        </div>
      </div>
    </DrawingProvider>
  );
}

