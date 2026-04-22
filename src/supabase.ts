import { createClient } from '@supabase/supabase-js'
import type { Quest, Character, Dungeon, LifeStatEntry, LifeStatDefinition } from './types'
import { DUNGEON_TEMPLATES, DEFAULT_LIFE_STATS } from './types'

const supabaseUrl = 'https://vcdynoyjogbjgncdjwhl.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjZHlub3lqb2diamduY2Rqd2hsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njg2NTA2NywiZXhwIjoyMDkyNDQxMDY3fQ.F3VcxB7lp4JQLj7GnU1NUSgQ9cRG_a0rUCiqR_KtjO0'

export const supabase = createClient(supabaseUrl, supabaseKey)

// User ID for Philip
const USER_ID = 'okophil'

// Character functions
export async function getCharacter(): Promise<Character | null> {
  const { data, error } = await supabase
    .from('characters')
    .select('*')
    .eq('user_id', USER_ID)
    .single()
  
  if (error) {
    console.error('Error fetching character:', error)
    return null
  }
  
  if (!data) {
    // Create default character
    return createDefaultCharacter()
  }
  
  return {
    level: data.level,
    xp: data.xp,
    xpToNextLevel: data.xp_to_next_level,
    stats: data.stats,
    totalQuestsCompleted: data.total_quests_completed,
    totalBossesDefeated: data.total_bosses_defeated
  }
}

export async function createDefaultCharacter(): Promise<Character> {
  const defaultChar = {
    user_id: USER_ID,
    level: 1,
    xp: 0,
    xp_to_next_level: 100,
    stats: { strength: 10, wisdom: 10, creativity: 10, discipline: 10 },
    total_quests_completed: 0,
    total_bosses_defeated: 0
  }
  
  const { data, error } = await supabase
    .from('characters')
    .insert(defaultChar)
    .select()
    .single()
  
  if (error) {
    console.error('Error creating character:', error)
    throw error
  }
  
  return {
    level: data.level,
    xp: data.xp,
    xpToNextLevel: data.xp_to_next_level,
    stats: data.stats,
    totalQuestsCompleted: data.total_quests_completed,
    totalBossesDefeated: data.total_bosses_defeated
  }
}

export async function updateCharacter(character: Character): Promise<void> {
  const { error } = await supabase
    .from('characters')
    .update({
      level: character.level,
      xp: character.xp,
      xp_to_next_level: character.xpToNextLevel,
      stats: character.stats,
      total_quests_completed: character.totalQuestsCompleted,
      total_bosses_defeated: character.totalBossesDefeated,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', USER_ID)
  
  if (error) {
    console.error('Error updating character:', error)
    throw error
  }
}

// Quest functions
export async function getQuests(): Promise<Quest[]> {
  const { data, error } = await supabase
    .from('quests')
    .select('*')
    .eq('user_id', USER_ID)
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching quests:', error)
    return []
  }
  
  return data.map(q => ({
    id: q.id,
    title: q.title,
    description: q.description,
    type: q.type,
    hp: q.hp,
    maxHp: q.max_hp,
    xpReward: q.xp_reward,
    status: q.status,
    createdAt: q.created_at,
    completedAt: q.completed_at,
    reflection: q.reflection,
    tags: q.tags || []
  }))
}

export async function createQuest(quest: Omit<Quest, 'id' | 'createdAt'>): Promise<Quest> {
  const { data, error } = await supabase
    .from('quests')
    .insert({
      user_id: USER_ID,
      title: quest.title,
      description: quest.description,
      type: quest.type,
      hp: quest.hp,
      max_hp: quest.maxHp,
      xp_reward: quest.xpReward,
      status: quest.status,
      tags: quest.tags
    })
    .select()
    .single()
  
  if (error) {
    console.error('Error creating quest:', error)
    throw error
  }
  
  return {
    id: data.id,
    title: data.title,
    description: data.description,
    type: data.type,
    hp: data.hp,
    maxHp: data.max_hp,
    xpReward: data.xp_reward,
    status: data.status,
    createdAt: data.created_at,
    completedAt: data.completed_at,
    reflection: data.reflection,
    tags: data.tags || []
  }
}

export async function updateQuest(questId: string, updates: Partial<Quest>): Promise<void> {
  const updateData: any = {}
  
  if (updates.hp !== undefined) updateData.hp = updates.hp
  if (updates.status !== undefined) updateData.status = updates.status
  if (updates.reflection !== undefined) updateData.reflection = updates.reflection
  if (updates.completedAt !== undefined) updateData.completed_at = updates.completedAt
  
  const { error } = await supabase
    .from('quests')
    .update(updateData)
    .eq('id', questId)
  
  if (error) {
    console.error('Error updating quest:', error)
    throw error
  }
}

export async function deleteQuest(questId: string): Promise<void> {
  const { error } = await supabase
    .from('quests')
    .delete()
    .eq('id', questId)
  
  if (error) {
    console.error('Error deleting quest:', error)
    throw error
  }
}

// Dungeon functions
export async function getDungeons(): Promise<Dungeon[]> {
  const { data, error } = await supabase
    .from('dungeons')
    .select('*')
    .eq('user_id', USER_ID)
    .order('started_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching dungeons:', error)
    return []
  }
  
  return data.map(d => ({
    id: d.id,
    name: d.name,
    description: d.description,
    category: d.category,
    durationDays: d.duration_days,
    days: d.days || [],
    status: d.status,
    startedAt: d.started_at,
    completedAt: d.completed_at,
    xpReward: d.xp_reward,
    icon: d.icon,
  }))
}

export async function createDungeon(templateId: string): Promise<Dungeon | null> {
  const template = DUNGEON_TEMPLATES.find(t => t.id === templateId)
  if (!template) return null
  
  const days = Array.from({ length: template.durationDays }, (_, i) => ({
    day: i + 1,
    completed: false,
  }))
  
  const { data, error } = await supabase
    .from('dungeons')
    .insert({
      user_id: USER_ID,
      name: template.name,
      description: template.description,
      category: template.category,
      duration_days: template.durationDays,
      days: days,
      status: 'active',
      xp_reward: template.xpReward,
      icon: template.icon,
    })
    .select()
    .single()
  
  if (error) {
    console.error('Error creating dungeon:', error)
    throw error
  }
  
  return {
    id: data.id,
    name: data.name,
    description: data.description,
    category: data.category,
    durationDays: data.duration_days,
    days: data.days,
    status: data.status,
    startedAt: data.started_at,
    completedAt: data.completed_at,
    xpReward: data.xp_reward,
    icon: data.icon,
  }
}

export async function checkInDungeonDay(dungeonId: string, dayNumber: number): Promise<void> {
  const dungeon = await supabase
    .from('dungeons')
    .select('days, status')
    .eq('id', dungeonId)
    .single()
  
  if (dungeon.error) {
    console.error('Error fetching dungeon:', dungeon.error)
    throw dungeon.error
  }
  
  const days = dungeon.data.days.map((d: any) => 
    d.day === dayNumber ? { ...d, completed: true, completedAt: new Date().toISOString() } : d
  )
  
  // Check if all days completed
  const allCompleted = days.every((d: any) => d.completed)
  
  const { error } = await supabase
    .from('dungeons')
    .update({
      days: days,
      status: allCompleted ? 'completed' : 'active',
      completed_at: allCompleted ? new Date().toISOString() : null,
    })
    .eq('id', dungeonId)
  
  if (error) {
    console.error('Error updating dungeon:', error)
    throw error
  }
}

export async function resetDungeon(dungeonId: string): Promise<void> {
  const { data: dungeon } = await supabase
    .from('dungeons')
    .select('duration_days')
    .eq('id', dungeonId)
    .single()
  
  if (!dungeon) return
  
  const days = Array.from({ length: dungeon.duration_days }, (_, i) => ({
    day: i + 1,
    completed: false,
  }))
  
  const { error } = await supabase
    .from('dungeons')
    .update({
      days: days,
      status: 'active',
      completed_at: null,
      started_at: new Date().toISOString(),
    })
    .eq('id', dungeonId)
  
  if (error) {
    console.error('Error resetting dungeon:', error)
    throw error
  }
}

// Life Stats functions
export async function getLifeStatDefinitions(): Promise<LifeStatDefinition[]> {
  const { data, error } = await supabase
    .from('life_stat_definitions')
    .select('*')
    .eq('user_id', USER_ID)
  
  if (error) {
    console.error('Error fetching stat definitions:', error)
    return DEFAULT_LIFE_STATS
  }
  
  if (!data || data.length === 0) {
    // Initialize defaults
    await initializeDefaultStats()
    return DEFAULT_LIFE_STATS
  }
  
  return data.map(s => ({
    id: s.id,
    name: s.name,
    category: s.category,
    unit: s.unit,
    min: s.min,
    max: s.max,
    target: s.target,
    higherIsBetter: s.higher_is_better,
    icon: s.icon,
  }))
}

async function initializeDefaultStats(): Promise<void> {
  const inserts = DEFAULT_LIFE_STATS.map(stat => ({
    user_id: USER_ID,
    id: stat.id,
    name: stat.name,
    category: stat.category,
    unit: stat.unit,
    min: stat.min,
    max: stat.max,
    target: stat.target,
    higher_is_better: stat.higherIsBetter,
    icon: stat.icon,
  }))
  
  const { error } = await supabase
    .from('life_stat_definitions')
    .insert(inserts)
  
  if (error) {
    console.error('Error initializing default stats:', error)
  }
}

export async function addLifeStatEntry(statId: string, value: number, note?: string): Promise<void> {
  const { error } = await supabase
    .from('life_stat_entries')
    .insert({
      user_id: USER_ID,
      stat_id: statId,
      value: value,
      note: note,
      recorded_at: new Date().toISOString(),
    })
  
  if (error) {
    console.error('Error adding stat entry:', error)
    throw error
  }
}

export async function getLifeStatHistory(statId: string, limit: number = 30): Promise<LifeStatEntry[]> {
  const { data, error } = await supabase
    .from('life_stat_entries')
    .select('*')
    .eq('user_id', USER_ID)
    .eq('stat_id', statId)
    .order('recorded_at', { ascending: false })
    .limit(limit)
  
  if (error) {
    console.error('Error fetching stat history:', error)
    return []
  }
  
  return data.map(e => ({
    id: e.id,
    statId: e.stat_id,
    value: e.value,
    recordedAt: e.recorded_at,
    note: e.note,
  }))
}

export async function getAllLifeStatEntries(): Promise<LifeStatEntry[]> {
  const { data, error } = await supabase
    .from('life_stat_entries')
    .select('*')
    .eq('user_id', USER_ID)
    .order('recorded_at', { ascending: false })
    .limit(100)
  
  if (error) {
    console.error('Error fetching all stat entries:', error)
    return []
  }
  
  return data.map(e => ({
    id: e.id,
    statId: e.stat_id,
    value: e.value,
    recordedAt: e.recorded_at,
    note: e.note,
  }))
}

// Real-time subscriptions
export function subscribeToQuests(callback: (quests: Quest[]) => void) {
  return supabase
    .channel('quests')
    .on('postgres_changes', { 
      event: '*', 
      schema: 'public', 
      table: 'quests',
      filter: `user_id=eq.${USER_ID}`
    }, () => {
      getQuests().then(callback)
    })
    .subscribe()
}
