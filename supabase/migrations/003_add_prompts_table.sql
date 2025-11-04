-- Add prompts table to store prompts per player per round
-- This allows the prompt chain system where each player gets a different prompt

CREATE TABLE prompts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(game_id, round_number, player_id)
);

-- Index for performance
CREATE INDEX idx_prompts_game_round ON prompts(game_id, round_number);
CREATE INDEX idx_prompts_player ON prompts(player_id);

-- Enable Row Level Security
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow public read access to prompts" ON prompts FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to prompts" ON prompts FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to prompts" ON prompts FOR UPDATE USING (true);

