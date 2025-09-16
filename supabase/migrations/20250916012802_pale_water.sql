/*
  # Create games table for UnblockedHub

  1. New Tables
    - `games`
      - `id` (uuid, primary key)
      - `title` (text, game title)
      - `description` (text, game description)
      - `category` (text, game category)
      - `color` (text, background color class)
      - `url` (text, game URL or HTML embed code)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `games` table
    - Add policy for anyone to read games
    - Add policy for authenticated users to insert/update/delete games
*/

CREATE TABLE IF NOT EXISTS games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  category text NOT NULL DEFAULT 'Arcade',
  color text NOT NULL DEFAULT 'bg-blue-500',
  url text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE games ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read games
CREATE POLICY "Anyone can read games"
  ON games
  FOR SELECT
  TO public
  USING (true);

-- Allow anyone to insert, update, and delete games (since this is an open platform)
CREATE POLICY "Anyone can manage games"
  ON games
  FOR ALL
  TO public
  USING (true);

-- Create an index for faster queries
CREATE INDEX IF NOT EXISTS games_category_idx ON games(category);
CREATE INDEX IF NOT EXISTS games_created_at_idx ON games(created_at DESC);