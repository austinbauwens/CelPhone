# How to Run SQL Migrations in Supabase

## Step-by-Step Instructions

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Sign in to your account
   - Select your project

2. **Navigate to SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - This opens the SQL query editor

3. **Run the Migration**
   - Copy the contents of the migration file (e.g., `supabase/migrations/004_add_player_submissions.sql`)
   - Paste it into the SQL Editor
   - Click the "Run" button (or press Ctrl+Enter / Cmd+Enter)
   - Wait for the success message

4. **Verify the Migration**
   - Go to "Table Editor" in the left sidebar
   - You should now see a new `player_submissions` table in the list
   - The table should have these columns:
     - `id` (uuid)
     - `game_id` (uuid)
     - `round_number` (integer)
     - `player_id` (uuid)
     - `phase` (text: 'prompt' or 'drawing')
     - `submitted_at` (timestamp)

## Migration Files to Run

Run these migrations in order:
1. `001_initial_schema.sql` (already done)
2. `002_update_games_status_constraint.sql` (already done)
3. `003_add_prompts_table.sql` (already done)
4. `004_add_player_submissions.sql` (NEW - run this now)

## What This Migration Does

This migration creates a `player_submissions` table that tracks when each player completes each phase (prompt or drawing) for each round. This enables:
- Waiting for all players to submit before moving to the next phase
- Preventing double submissions
- Showing submission progress to players
- Proper synchronization between all players
