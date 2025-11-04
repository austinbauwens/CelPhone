-- First, check if the prompts table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'prompts'
) AS prompts_table_exists;

-- Check if player_submissions table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'player_submissions'
) AS player_submissions_table_exists;

