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
