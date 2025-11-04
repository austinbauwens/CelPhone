-- ============================================
-- RUN THIS FIRST: Create prompts table
-- ============================================
-- Copy everything below and paste into Supabase SQL Editor, then click Run

CREATE TABLE IF NOT EXISTS prompts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(game_id, round_number, player_id)
);

CREATE INDEX IF NOT EXISTS idx_prompts_game_round ON prompts(game_id, round_number);
CREATE INDEX IF NOT EXISTS idx_prompts_player ON prompts(player_id);

ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to prompts" ON prompts;
DROP POLICY IF EXISTS "Allow public insert access to prompts" ON prompts;
DROP POLICY IF EXISTS "Allow public update access to prompts" ON prompts;

CREATE POLICY "Allow public read access to prompts" ON prompts FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to prompts" ON prompts FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to prompts" ON prompts FOR UPDATE USING (true);

-- ============================================
-- RUN THIS SECOND: Create player_submissions table
-- ============================================
-- Create a NEW query in SQL Editor, then copy and paste this:

CREATE TABLE IF NOT EXISTS player_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  phase TEXT NOT NULL CHECK (phase IN ('prompt', 'drawing')),
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(game_id, round_number, player_id, phase)
);

CREATE INDEX IF NOT EXISTS idx_player_submissions_game_round_phase ON player_submissions(game_id, round_number, phase);
CREATE INDEX IF NOT EXISTS idx_player_submissions_player ON player_submissions(player_id);

ALTER TABLE player_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to player_submissions" ON player_submissions;
DROP POLICY IF EXISTS "Allow public insert access to player_submissions" ON player_submissions;
DROP POLICY IF EXISTS "Allow public update access to player_submissions" ON player_submissions;

CREATE POLICY "Allow public read access to player_submissions" ON player_submissions FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to player_submissions" ON player_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to player_submissions" ON player_submissions FOR UPDATE USING (true);

