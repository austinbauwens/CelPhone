import { useState, useEffect } from 'react';
import { AnimationGallery } from './AnimationGallery';
import { useGame } from '../../hooks/useGame';
import { supabase } from '../../lib/supabase';
import { soundManager } from '../../lib/sounds';
import type { Frame, Prompt, Player, Round } from '../../types';

interface AnimationScreenProps {
  gameId: string;
  playerId: string;
  onStatusChange: (status: 'lobby' | 'drawing' | 'viewing' | 'prompt' | 'complete') => void;
}

export function AnimationScreen({ gameId, onStatusChange }: AnimationScreenProps) {
  const { game } = useGame(gameId);
  const [players, setPlayers] = useState<Player[]>([]);
  const [_rounds, setRounds] = useState<Round[]>([]);
  const [_allRoundsFrames, setAllRoundsFrames] = useState<Record<number, Frame[]>>({});
  const [_allRoundsPrompts, setAllRoundsPrompts] = useState<Record<number, Prompt[]>>({});
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [playerChains, setPlayerChains] = useState<Record<string, Array<{ round: number; prompt: Prompt | null; promptAuthor: Player | null; animation: Frame[]; animationAuthor: Player | null }>>>({});

  useEffect(() => {
    if (!game) return;

    // Only show animation screen when game is complete
    // This screen shows all animations from all rounds at the end
    if (game.status !== 'complete') {
      console.log('Animation screen: Game not complete yet, status:', game.status);
      return;
    }

    // Load all rounds and their frames
    const loadAllRounds = async () => {
      try {
        // Fetch all rounds for this game
        const { data: allRounds, error: roundsError } = await supabase
          .from('rounds')
          .select('*')
          .eq('game_id', gameId)
          .order('round_number', { ascending: true })
          .order('started_at', { ascending: false });

        if (roundsError) throw roundsError;
        if (!allRounds) return;

        // Filter to only keep unique round numbers (handle duplicates - get latest)
        const uniqueRounds: Record<number, Round> = {};
        allRounds.forEach((round) => {
          const existing = uniqueRounds[round.round_number];
          if (!existing || new Date(round.started_at || 0) > new Date(existing.started_at || 0)) {
            uniqueRounds[round.round_number] = round;
          }
        });

        const sortedRounds = Object.values(uniqueRounds).sort((a, b) => a.round_number - b.round_number);
        setRounds(sortedRounds);

        // Load players
        const { data: allPlayers, error: playersError } = await supabase
          .from('players')
          .select('*')
          .eq('game_id', gameId)
          .order('turn_order', { ascending: true });

        if (!playersError && allPlayers) {
          setPlayers(allPlayers);
        }

        // Load frames and prompts for each unique round
        const framesByRound: Record<number, Frame[]> = {};
        const promptsByRound: Record<number, Prompt[]> = {};
        
        for (const round of sortedRounds) {
          // Load frames for this round
          const { data: roundFrames, error: framesError } = await supabase
            .from('frames')
            .select('*')
            .eq('round_id', round.id)
            .order('player_id', { ascending: true })
            .order('frame_number', { ascending: true })
            .order('created_at', { ascending: false });

          if (framesError) {
            console.error(`Error loading frames for round ${round.round_number}:`, framesError);
          } else {
            // Filter to only keep the latest frame for each player+frame_number combination
            const latestFrames: Record<string, Frame> = {};
            (roundFrames || []).forEach((frame) => {
              const key = `${frame.player_id}-${frame.frame_number}`;
              const existing = latestFrames[key];
              if (!existing || new Date(frame.created_at) > new Date(existing.created_at)) {
                latestFrames[key] = frame;
              }
            });

            framesByRound[round.round_number] = Object.values(latestFrames);
          }

          // Load prompts for this round
          const { data: roundPrompts, error: promptsError } = await supabase
            .from('prompts')
            .select('*')
            .eq('game_id', gameId)
            .eq('round_number', round.round_number)
            .order('player_id', { ascending: true });

          if (promptsError) {
            console.error(`Error loading prompts for round ${round.round_number}:`, promptsError);
          } else {
            promptsByRound[round.round_number] = roundPrompts || [];
          }
        }

        setAllRoundsFrames(framesByRound);
        setAllRoundsPrompts(promptsByRound);

        // Build player chains - each player's journey starting from their Round 1 prompt
        // The chain shows: Original prompt → Animation → New prompt → Animation → etc.
        if (allPlayers && allPlayers.length > 0) {
          const chains: Record<string, Array<{ round: number; prompt: Prompt | null; promptAuthor: Player | null; animation: Frame[]; animationAuthor: Player | null }>> = {};
          
          // For each player, build their chain
          allPlayers.forEach((originPlayer) => {
            const chain: Array<{ round: number; prompt: Prompt | null; promptAuthor: Player | null; animation: Frame[]; animationAuthor: Player | null }> = [];
            
            // Round 1: Find this player's initial prompt
            const round1Prompts = promptsByRound[1] || [];
            const originPrompt = round1Prompts.find(p => p.player_id === originPlayer.id);
            if (originPrompt) {
              // Find who drew this prompt (next player in circular chain)
              const originIndex = allPlayers.findIndex(p => p.id === originPlayer.id);
              const drawerIndex = (originIndex + 1) % allPlayers.length;
              const drawer = allPlayers[drawerIndex];
              
              // Get the animation from Round 1 (drawer's frames)
              const round1Frames = framesByRound[1] || [];
              const animation = round1Frames.filter(f => f.player_id === drawer.id);
              
              chain.push({
                round: 1,
                prompt: originPrompt,
                promptAuthor: originPlayer,
                animation: animation,
                animationAuthor: drawer
              });
              
              // Follow the chain through subsequent rounds
              // Each round: the drawer sees their animation, writes a new prompt, then the next player draws it
              let currentPlayer = drawer; // Player who drew the previous animation
              for (let roundNum = 2; roundNum <= sortedRounds.length; roundNum++) {
                const roundPrompts = promptsByRound[roundNum] || [];
                const roundFrames = framesByRound[roundNum] || [];
                
                // Current player saw their animation, wrote a new prompt based on it
                const currentPrompt = roundPrompts.find(p => p.player_id === currentPlayer.id);
                
                // Find who drew this prompt (next player in circular chain)
                const currentIndex = allPlayers.findIndex(p => p.id === currentPlayer.id);
                const nextDrawerIndex = (currentIndex + 1) % allPlayers.length;
                const nextDrawer = allPlayers[nextDrawerIndex];
                
                // Get the animation (next drawer's frames)
                const animation = roundFrames.filter(f => f.player_id === nextDrawer.id);
                
                chain.push({
                  round: roundNum,
                  prompt: currentPrompt || null,
                  promptAuthor: currentPrompt ? currentPlayer : null,
                  animation: animation,
                  animationAuthor: nextDrawer
                });
                
                // Move to next player in chain (the drawer becomes the next prompt writer)
                currentPlayer = nextDrawer;
              }
            }
            
            chains[originPlayer.id] = chain;
          });
          
          setPlayerChains(chains);
          
          // Set first player as selected by default
          if (!selectedPlayerId && allPlayers.length > 0) {
            setSelectedPlayerId(allPlayers[0].id);
          }
        }
      } catch (err) {
        console.error('Error loading all rounds:', err);
      }
    };

    loadAllRounds();

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
          onStatusChange(updatedGame.status);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, game, onStatusChange]);

  const selectedPlayer = players.find(p => p.id === selectedPlayerId);
  const selectedChain = selectedPlayerId ? playerChains[selectedPlayerId] || [] : [];

  return (
    <div className="animation-screen">
      <div className="animation-header">
        <h2>Game Complete - View All Animations</h2>
        <p>Select a player to see their prompt's journey through the game</p>
      </div>
      
      {/* Player Selection */}
      <div className="player-selector">
        <h3>Select Player:</h3>
        <div className="player-buttons">
          {players.map((player) => (
            <button
              key={player.id}
              className={`player-btn ${selectedPlayerId === player.id ? 'active' : ''}`}
              onClick={() => {
                soundManager.playClick();
                setSelectedPlayerId(player.id);
              }}
              onMouseEnter={() => soundManager.playHover()}
            >
              {player.nickname}
            </button>
          ))}
        </div>
      </div>

      {/* Selected Player's Chain */}
      {selectedPlayer && selectedChain.length > 0 && (
        <div className="animation-content">
          <div className="chain-header">
            <h3>{selectedPlayer.nickname}'s Journey</h3>
            <p>Starting from their original prompt in Round 1</p>
          </div>
          
          {selectedChain.map((chainItem, index) => (
            <div key={index} className="round-animations">
              <h4>Round {chainItem.round}</h4>
              
              {/* Show the prompt */}
              {chainItem.prompt && chainItem.promptAuthor && (
                <div className="round-prompts">
                  <h5>Prompt:</h5>
                  <div className="prompt-item">
                    <span className="prompt-player">
                      {chainItem.promptAuthor.nickname}:
                    </span>
                    <span className="prompt-text">"{chainItem.prompt.prompt}"</span>
                  </div>
                  {index > 0 && (
                    <p className="prompt-context">
                      (Based on {chainItem.promptAuthor.nickname}'s animation from Round {chainItem.round - 1})
                    </p>
                  )}
                </div>
              )}
              
              {/* Show the animation */}
              {chainItem.animation.length > 0 && chainItem.animationAuthor && (
                <div className="round-animation">
                  <h5>Animation by {chainItem.animationAuthor.nickname}:</h5>
                  <AnimationGallery
                    gameId={gameId}
                    frames={chainItem.animation}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

