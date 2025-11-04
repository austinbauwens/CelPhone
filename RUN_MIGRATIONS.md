# How to Run Supabase Migrations

## Quick Fix: Run These SQL Queries

The `prompts` table is missing from your database. Follow these steps:

### Step 1: Open Supabase SQL Editor
1. Go to https://supabase.com/dashboard
2. Sign in and select your project
3. Click **"SQL Editor"** in the left sidebar
4. Click **"New query"** button

### Step 2: Run This SQL (Copy and Paste)

```sql
-- Create prompts table
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_prompts_game_round ON prompts(game_id, round_number);
CREATE INDEX IF NOT EXISTS idx_prompts_player ON prompts(player_id);

-- Enable Row Level Security
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (drop existing first if they exist)
DROP POLICY IF EXISTS "Allow public read access to prompts" ON prompts;
DROP POLICY IF EXISTS "Allow public insert access to prompts" ON prompts;
DROP POLICY IF EXISTS "Allow public update access to prompts" ON prompts;

CREATE POLICY "Allow public read access to prompts" ON prompts FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to prompts" ON prompts FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to prompts" ON prompts FOR UPDATE USING (true);
```

3. Click **"Run"** button (or press Ctrl+Enter / Cmd+Enter)
4. Wait for "Success" message

### Step 3: Run This SQL (Create New Query)

Click **"New query"** again, then paste this:

```sql
-- Create player_submissions table
CREATE TABLE IF NOT EXISTS player_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  phase TEXT NOT NULL CHECK (phase IN ('prompt', 'drawing')),
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(game_id, round_number, player_id, phase)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_player_submissions_game_round_phase ON player_submissions(game_id, round_number, phase);
CREATE INDEX IF NOT EXISTS idx_player_submissions_player ON player_submissions(player_id);

-- Enable Row Level Security
ALTER TABLE player_submissions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (drop existing first if they exist)
DROP POLICY IF EXISTS "Allow public read access to player_submissions" ON player_submissions;
DROP POLICY IF EXISTS "Allow public insert access to player_submissions" ON player_submissions;
DROP POLICY IF EXISTS "Allow public update access to player_submissions" ON player_submissions;

CREATE POLICY "Allow public read access to player_submissions" ON player_submissions FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to player_submissions" ON player_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to player_submissions" ON player_submissions FOR UPDATE USING (true);
```

5. Click **"Run"** button
6. Wait for "Success" message

### Step 4: Verify Tables Exist

1. Click **"Table Editor"** in the left sidebar
2. You should see both `prompts` and `player_submissions` in the list
3. If you see them, the migrations worked!

### Step 5: Refresh Your App

1. Go back to your app
2. Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)
3. Try submitting a prompt again
4. The 404 errors should be gone!

## Troubleshooting

If you get an error when running the SQL:
- Make sure you're in the correct project
- Check that the `games` and `players` tables exist first
- Copy the error message and share it

## Visual Guide

After clicking "SQL Editor", you should see:
- A text area on the left (where you paste SQL)
- A "Run" button at the bottom
- Results panel on the right

After running, you should see:
- Green checkmark ✅ and "Success" message
- Or red X ❌ with error message (if something went wrong)

