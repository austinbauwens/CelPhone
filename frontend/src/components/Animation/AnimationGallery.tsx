import { useState, useEffect } from 'react';
import { AnimationViewer } from './AnimationViewer';
import { supabase } from '../../lib/supabase';
import type { Frame, Player } from '../../types';

interface AnimationGalleryProps {
  gameId: string;
  frames: Frame[];
}

export function AnimationGallery({ gameId, frames }: AnimationGalleryProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [playerFrames, setPlayerFrames] = useState<Record<string, Frame[]>>({});

  useEffect(() => {
    // Load players
    supabase
      .from('players')
      .select('*')
      .eq('game_id', gameId)
      .order('turn_order', { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) {
          setPlayers(data);
        }
      });

    // Group frames by player and frame_number, keeping only the latest frame for each frame_number
    const grouped: Record<string, Frame[]> = {};
    const latestFrames: Record<string, Record<number, Frame>> = {};
    
    frames.forEach((frame) => {
      if (!latestFrames[frame.player_id]) {
        latestFrames[frame.player_id] = {};
      }
      
      // Keep only the latest frame for each frame_number (based on created_at)
      const existing = latestFrames[frame.player_id][frame.frame_number];
      if (!existing || new Date(frame.created_at) > new Date(existing.created_at)) {
        latestFrames[frame.player_id][frame.frame_number] = frame;
      }
    });

    // Convert to arrays and sort by frame_number
    Object.keys(latestFrames).forEach((playerId) => {
      const playerFrames = Object.values(latestFrames[playerId]);
      playerFrames.sort((a, b) => a.frame_number - b.frame_number);
      grouped[playerId] = playerFrames;
    });

    setPlayerFrames(grouped);
  }, [gameId, frames]);

  return (
    <div className="animation-gallery">
      <h2>Animations</h2>
      <div className="gallery-grid">
        {players.map((player) => {
          const playerFramesList = playerFrames[player.id] || [];
          if (playerFramesList.length === 0) return null;

          return (
            <div key={player.id} className="gallery-item">
              <AnimationViewer frames={playerFramesList} playerName={player.nickname} showDownload={true} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

