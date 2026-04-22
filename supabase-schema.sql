-- RPG Life Database Schema

-- Character table
CREATE TABLE IF NOT EXISTS characters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  xp_to_next_level INTEGER DEFAULT 100,
  stats JSONB DEFAULT '{"strength": 10, "wisdom": 10, "creativity": 10, "discipline": 10}'::jsonb,
  total_quests_completed INTEGER DEFAULT 0,
  total_bosses_defeated INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quests table
CREATE TABLE IF NOT EXISTS quests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT CHECK (type IN ('daily', 'normal', 'boss', 'main', 'side')),
  hp INTEGER,
  max_hp INTEGER,
  xp_reward INTEGER DEFAULT 50,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed')),
  reflection TEXT,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Calendar events (auto-imported from CalDAV)
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  external_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  calendar_source TEXT NOT NULL, -- 'icloud', 'google', 'zpa'
  converted_to_quest BOOLEAN DEFAULT FALSE,
  quest_id UUID REFERENCES quests(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Loot/Items table
CREATE TABLE IF NOT EXISTS items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  rarity TEXT CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  equipped BOOLEAN DEFAULT FALSE,
  stat_bonuses JSONB DEFAULT '{}'::jsonb,
  obtained_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Boss action definitions
CREATE TABLE IF NOT EXISTS boss_actions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  boss_type TEXT NOT NULL, -- e.g., 'training_camp', 'uni_project'
  action_name TEXT NOT NULL,
  damage INTEGER DEFAULT 25,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow all" ON characters FOR ALL USING (true);
CREATE POLICY "Allow all" ON quests FOR ALL USING (true);
CREATE POLICY "Allow all" ON calendar_events FOR ALL USING (true);
CREATE POLICY "Allow all" ON items FOR ALL USING (true);

-- Insert default boss actions
INSERT INTO boss_actions (boss_type, action_name, damage, description) VALUES
('training_camp', 'Tasche packen', 25, 'Pack alle notwendigen Items'),
('training_camp', 'Route planen', 30, 'Plane den Weg zum Trainingslager'),
('training_camp', 'Essen vorbereiten', 20, 'Bereite Mahlzeiten für unterwegs vor'),
('uni_project', 'Recherche', 25, 'Sammle Informationen zum Thema'),
('uni_project', 'Outline erstellen', 30, 'Strukturiere das Projekt'),
('uni_project', 'Ersten Draft schreiben', 35, 'Schreibe die erste Version'),
('uni_project', 'Review & Feedback', 20, 'Lass jemanden drüber schauen'),
('daily_routine', 'Morgenroutine', 20, 'Starte den Tag richtig'),
('daily_routine', 'Hauptaufgabe', 40, 'Die wichtigste Aufgabe des Tages'),
('daily_routine', 'Abendroutine', 20, 'Beende den Tag reflektiert');
