import { createClient } from '@supabase/supabase-js'
import type { Quest, Character } from './types'

const supabaseUrl = 'https://vcdynoyjogbjgncdjwhl.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjZHlub3lqb2diamduY2Rqd2hsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4NjUwNjcsImV4cCI6MjA5MjQ0MTA2N30.MKnPwRpPzqKcs7F6AHoU0cKpuyKktcULn0TySuv0ki0'

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

// Boss actions
export async function getBossActions(bossType: string) {
  const { data, error } = await supabase
    .from('boss_actions')
    .select('*')
    .eq('boss_type', bossType)
  
  if (error) {
    console.error('Error fetching boss actions:', error)
    return []
  }
  
  return data
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
