-- Update games table to allow 'prompt' status
ALTER TABLE games DROP CONSTRAINT IF EXISTS games_status_check;
ALTER TABLE games ADD CONSTRAINT games_status_check 
  CHECK (status IN ('lobby', 'drawing', 'viewing', 'prompt', 'complete'));

