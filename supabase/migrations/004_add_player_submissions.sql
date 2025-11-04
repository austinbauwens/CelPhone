-- Add player_submissions table to track when players complete each phase
-- This ensures we wait for all players before progressing to the next phase

CREATE TABLE player_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  phase TEXT NOT NULL CHECK (phase IN ('prompt', 'drawing')),
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(game_id, round_number, player_id, phase)
);

-- Index for performance
CREATE INDEX idx_player_submissions_game_round_phase ON player_submissions(game_id, round_number, phase);
CREATE INDEX idx_player_submissions_player ON player_submissions(player_id);

-- Enable Row Level Security
ALTER TABLE player_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow public read access to player_submissions" ON player_submissions FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to player_submissions" ON player_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to player_submissions" ON player_submissions FOR UPDATE USING (true);

