import type { Quest, Character } from './types';
import { getDefaultCharacter } from './types';

const QUESTS_KEY = 'rpg-life-quests';
const CHARACTER_KEY = 'rpg-life-character';

export function saveQuests(quests: Quest[]): void {
  localStorage.setItem(QUESTS_KEY, JSON.stringify(quests));
}

export function loadQuests(): Quest[] {
  const stored = localStorage.getItem(QUESTS_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function saveCharacter(character: Character): void {
  localStorage.setItem(CHARACTER_KEY, JSON.stringify(character));
}

export function loadCharacter(): Character {
  const stored = localStorage.getItem(CHARACTER_KEY);
  if (!stored) return getDefaultCharacter();
  try {
    return JSON.parse(stored);
  } catch {
    return getDefaultCharacter();
  }
}
