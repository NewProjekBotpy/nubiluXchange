-- Add images column to news table
-- This column was defined in schema but missing from database
ALTER TABLE news ADD COLUMN IF NOT EXISTS images jsonb DEFAULT '[]'::jsonb;
