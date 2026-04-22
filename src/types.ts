export type QuestType = 'daily' | 'normal' | 'boss' | 'main' | 'side';

export interface Quest {
  id: string;
  title: string;
  description?: string;
  type: QuestType;
  hp?: number;
  maxHp?: number;
  xpReward: number;
  status: 'active' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
  reflection?: string;
  tags: string[];
}

// === DUNGEONS ===
export type DungeonStatus = 'active' | 'completed' | 'failed';

export interface DungeonDay {
  day: number; // 1-based
  completed: boolean;
  completedAt?: string;
}

export interface Dungeon {
  id: string;
  name: string;
  description: string;
  category: 'habit' | 'challenge' | 'streak';
  durationDays: number;
  days: DungeonDay[];
  status: DungeonStatus;
  startedAt: string;
  completedAt?: string;
  xpReward: number;
  icon?: string;
}

export interface DungeonTemplate {
  id: string;
  name: string;
  description: string;
  durationDays: number;
  category: 'habit' | 'challenge' | 'streak';
  xpReward: number;
  icon: string;
}

export const DUNGEON_TEMPLATES: DungeonTemplate[] = [
  {
    id: 'nofap-7',
    name: 'NoFap Fortress',
    description: '7 Tage ohne PMO. Teste deine Willenskraft.',
    durationDays: 7,
    category: 'challenge',
    xpReward: 500,
    icon: '🏰',
  },
  {
    id: 'meditation-30',
    name: 'Temple of Mindfulness',
    description: '30 Tage täglich meditieren. Finde deine innere Ruhe.',
    durationDays: 30,
    category: 'habit',
    xpReward: 1000,
    icon: '🛕',
  },
  {
    id: 'coldshower-14',
    name: 'Ice Cavern',
    description: '14 Tage kalte Duschen. Baue mentale Stärke.',
    durationDays: 14,
    category: 'challenge',
    xpReward: 700,
    icon: '🧊',
  },
  {
    id: 'nosugar-21',
    name: 'Sugar Desert',
    description: '21 Tage ohne Zucker. Entkomme der Süßigkeit.',
    durationDays: 21,
    category: 'challenge',
    xpReward: 800,
    icon: '🏜️',
  },
];

// === LIFE STATS ===
export type StatCategory = 'body' | 'finance' | 'gym' | 'mental' | 'custom';

export interface LifeStatDefinition {
  id: string;
  name: string;
  category: StatCategory;
  unit: string;
  min?: number;
  max?: number;
  target?: number; // Target value (higher or lower is better depending on stat)
  higherIsBetter: boolean;
  icon: string;
}

export interface LifeStatEntry {
  id: string;
  statId: string;
  value: number;
  recordedAt: string;
  note?: string;
}

export const DEFAULT_LIFE_STATS: LifeStatDefinition[] = [
  { id: 'weight', name: 'Gewicht', category: 'body', unit: 'kg', higherIsBetter: false, icon: '⚖️' },
  { id: 'bodyfat', name: 'Körperfett', category: 'body', unit: '%', higherIsBetter: false, icon: '📊' },
  { id: 'bench', name: 'Bankdrücken', category: 'gym', unit: 'kg', higherIsBetter: true, icon: '🏋️' },
  { id: 'squat', name: 'Kniebeugen', category: 'gym', unit: 'kg', higherIsBetter: true, icon: '🦵' },
  { id: 'deadlift', name: 'Kreuzheben', category: 'gym', unit: 'kg', higherIsBetter: true, icon: '💪' },
  { id: 'balance', name: 'Kontostand', category: 'finance', unit: '€', higherIsBetter: true, icon: '💰' },
  { id: 'sleep', name: 'Schlafqualität', category: 'mental', unit: '/10', min: 1, max: 10, higherIsBetter: true, icon: '😴' },
  { id: 'mood', name: 'Stimmung', category: 'mental', unit: '/10', min: 1, max: 10, higherIsBetter: true, icon: '🧠' },
];

// Generate empty stat history
export function createEmptyStatHistory(): LifeStatEntry[] {
  return [];
}

export interface CharacterStats {
  strength: number;
  wisdom: number;
  creativity: number;
  discipline: number;
}

export interface Character {
  level: number;
  xp: number;
  xpToNextLevel: number;
  stats: CharacterStats;
  totalQuestsCompleted: number;
  totalBossesDefeated: number;
}

export const CORE_VALUES = [
  'Dankbarkeit',
  'Integrität',
  'Tiefgründigkeit',
  'Selbstbestimmung',
  'Selbstbeherrschung',
] as const;

export const XP_TABLE: Record<number, number> = {
  1: 100,
  2: 250,
  3: 500,
  4: 1000,
  5: 2000,
  6: 3500,
  7: 5500,
  8: 8000,
  9: 11000,
  10: 15000,
};

export function calculateXpToNextLevel(level: number): number {
  return XP_TABLE[level] || XP_TABLE[10] * Math.pow(1.5, level - 10);
}

export function getDefaultCharacter(): Character {
  return {
    level: 1,
    xp: 0,
    xpToNextLevel: XP_TABLE[1],
    stats: {
      strength: 10,
      wisdom: 10,
      creativity: 10,
      discipline: 10,
    },
    totalQuestsCompleted: 0,
    totalBossesDefeated: 0,
  };
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

export function getQuestTypeLabel(type: QuestType): string {
  const labels: Record<QuestType, string> = {
    daily: 'Daily Quest',
    normal: 'Normal Enemy',
    boss: 'Boss Fight',
    main: 'Main Quest',
    side: 'Side Quest',
  };
  return labels[type];
}

export function getQuestTypeColor(type: QuestType): string {
  const colors: Record<QuestType, string> = {
    daily: 'text-blue-400',
    normal: 'text-gray-400',
    boss: 'text-red-400',
    main: 'text-yellow-400',
    side: 'text-green-400',
  };
  return colors[type];
}

export function getQuestTypeBg(type: QuestType): string {
  const colors: Record<QuestType, string> = {
    daily: 'bg-blue-500/20 border-blue-500/40',
    normal: 'bg-gray-500/20 border-gray-500/40',
    boss: 'bg-red-500/20 border-red-500/40',
    main: 'bg-yellow-500/20 border-yellow-500/40',
    side: 'bg-green-500/20 border-green-500/40',
  };
  return colors[type];
}
