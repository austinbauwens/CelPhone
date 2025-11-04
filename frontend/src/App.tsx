import { useState, useEffect } from 'react';
import { LobbyScreen } from './components/Lobby/LobbyScreen';
import { DrawingScreen } from './components/Drawing/DrawingScreen';
import { AnimationScreen } from './components/Animation/AnimationScreen';
import { PromptScreen } from './components/Drawing/PromptScreen';
import { ShimmerGrid } from './components/ShimmerGrid';
import { supabase } from './lib/supabase';
import './App.css';

function App() {
  const [gameId, setGameId] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [screen, setScreen] = useState<'lobby' | 'drawing' | 'animation' | 'prompt'>('lobby');

  // Check for room code in URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomCode = params.get('room');
    if (roomCode) {
      // Room code is in URL, user can paste it to join
      // This will be handled by JoinGame component
    }
  }, []);

  const handleGameJoined = (newGameId: string, newPlayerId: string) => {
    setGameId(newGameId);
    setPlayerId(newPlayerId);
    setScreen('lobby');
  };

  const handleGameStatusChange = (status: 'lobby' | 'drawing' | 'viewing' | 'prompt' | 'complete') => {
    if (status === 'drawing') {
      setScreen('drawing');
    } else if (status === 'viewing') {
      setScreen('animation');
    } else if (status === 'prompt') {
      setScreen('prompt');
    } else if (status === 'complete') {
      setScreen('animation'); // Show all animations at the end
    }
  };

  return (
    <div className="app">
      <ShimmerGrid />
      <div className="app-content">
        {screen === 'lobby' && (
          <LobbyScreen
            gameId={gameId}
            playerId={playerId}
            onGameJoined={handleGameJoined}
            onGameStatusChange={handleGameStatusChange}
          />
        )}
        {screen === 'drawing' && gameId && playerId && (
          <DrawingScreen
            gameId={gameId}
            playerId={playerId}
            onStatusChange={handleGameStatusChange}
          />
        )}
        {screen === 'animation' && gameId && playerId && (
          <AnimationScreen
            gameId={gameId}
            playerId={playerId}
            onStatusChange={handleGameStatusChange}
          />
        )}
        {screen === 'prompt' && gameId && playerId && (
          <PromptScreen
            gameId={gameId}
            playerId={playerId}
            onStatusChange={handleGameStatusChange}
          />
        )}
      </div>
    </div>
  );
}

export default App;
