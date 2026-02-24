-- Migration: Add is_learned column to seismic_dc_user
-- Description: Tracks whether a user has completed the Seismic learning module
-- Default: false (user hasn't learned yet)

ALTER TABLE seismic_dc_user
ADD COLUMN IF NOT EXISTS is_learned BOOLEAN DEFAULT FALSE;

-- Optional: If you want to mark specific users as learned
-- UPDATE seismic_dc_user SET is_learned = true WHERE username = 'rizkydev';
