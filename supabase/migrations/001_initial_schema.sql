-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Games table
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_code TEXT UNIQUE NOT NULL,
  host_id UUID NOT NULL,
  frames_per_round INTEGER NOT NULL CHECK (frames_per_round IN (2, 3, 4)),
  current_round INTEGER NOT NULL DEFAULT 0,
  total_rounds INTEGER NOT NULL DEFAULT 5,
  status TEXT NOT NULL DEFAULT 'lobby' CHECK (status IN ('lobby', 'drawing', 'viewing', 'prompt', 'complete')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Players table
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_id UUID,
  nickname TEXT NOT NULL,
  turn_order INTEGER NOT NULL,
  is_host BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rounds table
CREATE TABLE rounds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  prompt TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE
);

-- Frames table
CREATE TABLE frames (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  round_id UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  frame_number INTEGER NOT NULL CHECK (frame_number >= 0 AND frame_number < 4),
  image_data TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_players_game_id ON players(game_id);
CREATE INDEX idx_rounds_game_id ON rounds(game_id);
CREATE INDEX idx_frames_round_id ON frames(round_id);
CREATE INDEX idx_frames_player_id ON frames(player_id);
CREATE INDEX idx_games_room_code ON games(room_code);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_games_updated_at BEFORE UPDATE ON games
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE frames ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allow public read/write for now - can be refined later)
CREATE POLICY "Allow public read access to games" ON games FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to games" ON games FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to games" ON games FOR UPDATE USING (true);

CREATE POLICY "Allow public read access to players" ON players FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to players" ON players FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to players" ON players FOR UPDATE USING (true);

CREATE POLICY "Allow public read access to rounds" ON rounds FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to rounds" ON rounds FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to rounds" ON rounds FOR UPDATE USING (true);

CREATE POLICY "Allow public read access to frames" ON frames FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to frames" ON frames FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to frames" ON frames FOR UPDATE USING (true);

