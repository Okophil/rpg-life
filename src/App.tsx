import { useState, useEffect } from 'react';
import type { Quest, QuestType, Character, CharacterStats, Dungeon, LifeStatDefinition, LifeStatEntry } from './types';
import {
  getDefaultCharacter,
  getQuestTypeLabel,
  getQuestTypeBg,
  getQuestTypeColor,
  calculateXpToNextLevel,
  CORE_VALUES,
  DUNGEON_TEMPLATES,
} from './types';
import { 
  getCharacter, 
  updateCharacter, 
  getQuests, 
  createQuest, 
  updateQuest, 
  deleteQuest,
  subscribeToQuests,
  getDungeons,
  createDungeon,
  checkInDungeonDay,
  resetDungeon,
  getLifeStatDefinitions,
  addLifeStatEntry,
  getLifeStatHistory,
} from './supabase';

type TabType = 'quests' | 'dungeons' | 'stats';

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('quests');
  
  // Core data
  const [quests, setQuests] = useState<Quest[]>([]);
  const [character, setCharacter] = useState<Character>(getDefaultCharacter());
  const [dungeons, setDungeons] = useState<Dungeon[]>([]);
  const [lifeStats, setLifeStats] = useState<LifeStatDefinition[]>([]);
  const [statHistory, setStatHistory] = useState<Record<string, LifeStatEntry[]>>({});
  
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showReflectionModal, setShowReflectionModal] = useState(false);
  const [showDungeonTemplates, setShowDungeonTemplates] = useState(false);
  const [showStatEntryModal, setShowStatEntryModal] = useState(false);
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);
  const [selectedStat, setSelectedStat] = useState<LifeStatDefinition | null>(null);
  
  // Form states
  const [newQuestTitle, setNewQuestTitle] = useState('');
  const [newQuestType, setNewQuestType] = useState<QuestType>('normal');
  const [newQuestXp, setNewQuestXp] = useState(50);
  const [newQuestHp, setNewQuestHp] = useState(100);
  const [newQuestTags, setNewQuestTags] = useState<string[]>([]);
  const [reflectionText, setReflectionText] = useState('');
  const [hpDamage, setHpDamage] = useState(25);
  const [statValue, setStatValue] = useState('');
  const [statNote, setStatNote] = useState('');

  // Load data
  useEffect(() => {
    loadAllData();
    
    const subscription = subscribeToQuests((updatedQuests) => {
      setQuests(updatedQuests);
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [charData, questsData, dungeonsData, statDefs] = await Promise.all([
        getCharacter(),
        getQuests(),
        getDungeons(),
        getLifeStatDefinitions(),
      ]);
      
      if (charData) setCharacter(charData);
      setQuests(questsData);
      setDungeons(dungeonsData);
      setLifeStats(statDefs);
      
      // Load history for all stats
      const history: Record<string, LifeStatEntry[]> = {};
      for (const stat of statDefs) {
        history[stat.id] = await getLifeStatHistory(stat.id, 30);
      }
      setStatHistory(history);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Quest handlers
  const handleCreateQuest = async () => {
    if (!newQuestTitle.trim()) return;
    
    try {
      const newQuest = await createQuest({
        title: newQuestTitle,
        description: '',
        type: newQuestType,
        hp: newQuestType === 'boss' ? newQuestHp : undefined,
        maxHp: newQuestType === 'boss' ? newQuestHp : undefined,
        xpReward: newQuestXp,
        status: 'active',
        tags: newQuestTags,
      });
      
      setQuests([newQuest, ...quests]);
      resetQuestForm();
      setShowCreateModal(false);
    } catch (error) {
      console.error('Error creating quest:', error);
    }
  };

  const resetQuestForm = () => {
    setNewQuestTitle('');
    setNewQuestXp(50);
    setNewQuestHp(100);
    setNewQuestTags([]);
  };

  const handleDamageBoss = async (questId: string, damage: number) => {
    const quest = quests.find(q => q.id === questId);
    if (!quest || quest.type !== 'boss') return;
    
    const newHp = Math.max(0, (quest.hp || 0) - damage);
    
    try {
      await updateQuest(questId, { hp: newHp });
      setQuests(quests.map(q => q.id === questId ? { ...q, hp: newHp } : q));
    } catch (error) {
      console.error('Error damaging boss:', error);
    }
  };

  const handleCompleteQuest = (quest: Quest) => {
    if (quest.type === 'boss' && (quest.hp || 0) > 0) return;
    setSelectedQuest(quest);
    setReflectionText('');
    setShowReflectionModal(true);
  };

  const finishCompletion = async () => {
    if (!selectedQuest) return;

    try {
      const completedAt = new Date().toISOString();
      
      await updateQuest(selectedQuest.id, { 
        status: 'completed',
        completedAt: completedAt,
        reflection: reflectionText
      });

      setQuests(quests.map(q =>
        q.id === selectedQuest.id
          ? { ...q, status: 'completed', completedAt, reflection: reflectionText }
          : q
      ));

      // Update character
      const xpGained = selectedQuest.xpReward;
      const newXp = character.xp + xpGained;
      let newLevel = character.level;
      let remainingXp = newXp;
      let xpToNext = character.xpToNextLevel;

      while (remainingXp >= xpToNext) {
        remainingXp -= xpToNext;
        newLevel++;
        xpToNext = calculateXpToNextLevel(newLevel);
      }

      const isBoss = selectedQuest.type === 'boss';
      const statBonus = isBoss ? 2 : 1;
      const randomStat = ['strength', 'wisdom', 'creativity', 'discipline'][Math.floor(Math.random() * 4)] as keyof CharacterStats;

      const updatedCharacter = {
        ...character,
        level: newLevel,
        xp: remainingXp,
        xpToNextLevel: xpToNext,
        stats: {
          ...character.stats,
          [randomStat]: character.stats[randomStat] + statBonus,
        },
        totalQuestsCompleted: character.totalQuestsCompleted + 1,
        totalBossesDefeated: isBoss ? character.totalBossesDefeated + 1 : character.totalBossesDefeated,
      };

      await updateCharacter(updatedCharacter);
      setCharacter(updatedCharacter);

      setShowReflectionModal(false);
      setSelectedQuest(null);
      setReflectionText('');
    } catch (error) {
      console.error('Error completing quest:', error);
    }
  };

  const handleDeleteQuest = async (questId: string) => {
    try {
      await deleteQuest(questId);
      setQuests(quests.filter(q => q.id !== questId));
    } catch (error) {
      console.error('Error deleting quest:', error);
    }
  };

  // Dungeon handlers
  const handleStartDungeon = async (templateId: string) => {
    try {
      const newDungeon = await createDungeon(templateId);
      if (newDungeon) {
        setDungeons([newDungeon, ...dungeons]);
        setShowDungeonTemplates(false);
      }
    } catch (error) {
      console.error('Error starting dungeon:', error);
    }
  };

  const handleCheckInDungeon = async (dungeonId: string, dayNumber: number) => {
    try {
      await checkInDungeonDay(dungeonId, dayNumber);
      // Reload dungeons
      const updatedDungeons = await getDungeons();
      setDungeons(updatedDungeons);
    } catch (error) {
      console.error('Error checking in dungeon:', error);
    }
  };

  const handleResetDungeon = async (dungeonId: string) => {
    try {
      await resetDungeon(dungeonId);
      const updatedDungeons = await getDungeons();
      setDungeons(updatedDungeons);
    } catch (error) {
      console.error('Error resetting dungeon:', error);
    }
  };

  // Stat handlers
  const handleOpenStatEntry = (stat: LifeStatDefinition) => {
    setSelectedStat(stat);
    setStatValue('');
    setStatNote('');
    setShowStatEntryModal(true);
  };

  const handleAddStatEntry = async () => {
    if (!selectedStat || !statValue.trim()) return;
    
    const value = parseFloat(statValue);
    if (isNaN(value)) return;
    
    try {
      await addLifeStatEntry(selectedStat.id, value, statNote || undefined);
      
      // Refresh history
      const history = await getLifeStatHistory(selectedStat.id, 30);
      setStatHistory(prev => ({ ...prev, [selectedStat.id]: history }));
      
      setShowStatEntryModal(false);
      setSelectedStat(null);
      setStatValue('');
      setStatNote('');
    } catch (error) {
      console.error('Error adding stat entry:', error);
    }
  };

  const toggleTag = (tag: string) => {
    if (newQuestTags.includes(tag)) {
      setNewQuestTags(newQuestTags.filter(t => t !== tag));
    } else {
      setNewQuestTags([...newQuestTags, tag]);
    }
  };

  // Render helpers
  const renderQuests = () => {
    const activeQuests = quests.filter(q => q.status === 'active');
    const completedQuests = quests.filter(q => q.status === 'completed').slice(-5);

    return (
      <>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-text">Active Quests</h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            + New Quest
          </button>
        </div>

        {activeQuests.length === 0 ? (
          <div className="text-center py-12 text-text-muted">
            <p className="text-lg mb-2">No active quests</p>
            <p>Create your first quest to begin your adventure!</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {activeQuests.map(quest => (
              <div
                key={quest.id}
                className={`rounded-xl p-5 border-2 ${getQuestTypeBg(quest.type)} relative group`}
              >
                <div className="flex justify-between items-start mb-3">
                  <span className={`text-xs font-bold uppercase tracking-wider ${getQuestTypeColor(quest.type)}`}>
                    {getQuestTypeLabel(quest.type)}
                  </span>
                  <span className="text-xp font-bold">+{quest.xpReward} XP</span>
                </div>
                
                <h3 className="text-lg font-bold text-text mb-2">{quest.title}</h3>
                
                {quest.type === 'boss' && (
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-text-muted">Boss HP</span>
                      <span className="text-danger">{quest.hp} / {quest.maxHp}</span>
                    </div>
                    <div className="h-4 bg-surface rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-300"
                        style={{ width: `${((quest.hp || 0) / (quest.maxHp || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
                
                {quest.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {quest.tags.map(tag => (
                      <span key={tag} className="text-xs bg-surface/50 px-2 py-1 rounded text-text-muted">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                
                <div className="flex gap-2 mt-4">
                  {quest.type === 'boss' && (quest.hp || 0) > 0 ? (
                    <>
                      <input
                        type="number"
                        min="1"
                        max={quest.hp}
                        value={hpDamage}
                        onChange={(e) => setHpDamage(Math.max(1, parseInt(e.target.value) || 0))}
                        className="w-20 bg-surface text-text rounded px-2 py-2 text-sm border border-surface-light"
                        placeholder="DMG"
                      />
                      <button
                        onClick={() => handleDamageBoss(quest.id, hpDamage)}
                        className="flex-1 bg-danger hover:bg-red-600 text-white py-2 rounded-lg font-medium transition-colors"
                      >
                        Attack
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleCompleteQuest(quest)}
                      className="flex-1 bg-success hover:bg-green-600 text-white py-2 rounded-lg font-medium transition-colors"
                    >
                      Complete
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteQuest(quest.id)}
                    className="px-3 py-2 text-text-muted hover:text-danger transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {completedQuests.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-bold text-text mb-6">Recently Completed</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {completedQuests.map(quest => (
                <div
                  key={quest.id}
                  className="bg-surface rounded-xl p-4 border border-surface-light opacity-75"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-xs font-bold uppercase ${getQuestTypeColor(quest.type)}`}>
                      {getQuestTypeLabel(quest.type)}
                    </span>
                    <span className="text-success">✓ Done</span>
                  </div>
                  <h3 className="text-text font-medium">{quest.title}</h3>
                  {quest.reflection && (
                    <p className="text-text-muted text-sm mt-2 italic">"{quest.reflection}"</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </>
    );
  };

  const renderDungeons = () => {
    const activeDungeons = dungeons.filter(d => d.status === 'active');
    const completedDungeons = dungeons.filter(d => d.status === 'completed');

    return (
      <>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-text">Dungeons</h2>
          <button
            onClick={() => setShowDungeonTemplates(true)}
            className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            + Start Dungeon
          </button>
        </div>

        {activeDungeons.length === 0 && completedDungeons.length === 0 ? (
          <div className="text-center py-12 text-text-muted">
            <p className="text-lg mb-2">Keine aktiven Dungeons</p>
            <p>Starte deinen ersten Dungeon, um Streaks zu tracken!</p>
          </div>
        ) : (
          <>
            {activeDungeons.length > 0 && (
              <div className="grid gap-6 mb-8">
                {activeDungeons.map(dungeon => {
                  const completedDays = dungeon.days.filter(d => d.completed).length;
                  const progress = (completedDays / dungeon.durationDays) * 100;
                  
                  return (
                    <div key={dungeon.id} className="bg-surface rounded-xl p-6 border border-surface-light">
                      <div className="flex items-center gap-4 mb-4">
                        <span className="text-4xl">{dungeon.icon}</span>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-text">{dungeon.name}</h3>
                          <p className="text-text-muted text-sm">{dungeon.description}</p>
                        </div>
                        <span className="text-xp font-bold">+{dungeon.xpReward} XP</span>
                      </div>
                      
                      <div className="mb-4">
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-text-muted">Progress</span>
                          <span className="text-primary">{completedDays} / {dungeon.durationDays} Days</span>
                        </div>
                        <div className="h-3 bg-surface-light rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-purple-600 to-purple-400 transition-all duration-500"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        {dungeon.days.map((day) => (
                          <button
                            key={day.day}
                            onClick={() => !day.completed && handleCheckInDungeon(dungeon.id, day.day)}
                            disabled={day.completed}
                            className={`w-10 h-10 rounded-lg font-bold transition-all ${
                              day.completed
                                ? 'bg-success text-white'
                                : 'bg-surface-light text-text-muted hover:bg-primary/20 hover:text-primary'
                            }`}
                          >
                            {day.completed ? '✓' : day.day}
                          </button>
                        ))}
                      </div>
                      
                      <button
                        onClick={() => handleResetDungeon(dungeon.id)}
                        className="mt-4 text-sm text-text-muted hover:text-danger transition-colors"
                      >
                        Reset Dungeon
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {completedDungeons.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-text mb-4">Completed Dungeons</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {completedDungeons.map(dungeon => (
                    <div key={dungeon.id} className="bg-surface rounded-xl p-4 border border-success/30 opacity-75">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{dungeon.icon}</span>
                        <div className="flex-1">
                          <h4 className="text-text font-bold">{dungeon.name}</h4>
                          <p className="text-success text-sm">✓ Completed</p>
                        </div>
                        <span className="text-xp">+{dungeon.xpReward} XP</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </>
    );
  };

  const renderStats = () => {
    const categories = ['body', 'finance', 'gym', 'mental'] as const;
    const categoryLabels: Record<string, string> = {
      body: 'Körper',
      finance: 'Finanzen',
      gym: 'Gym',
      mental: 'Mental',
    };

    return (
      <>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-text">Life Stats</h2>
        </div>

        <div className="space-y-6">
          {categories.map(category => {
            const categoryStats = lifeStats.filter(s => s.category === category);
            if (categoryStats.length === 0) return null;
            
            return (
              <div key={category} className="bg-surface rounded-xl p-6 border border-surface-light">
                <h3 className="text-lg font-bold text-primary mb-4">{categoryLabels[category]}</h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {categoryStats.map(stat => {
                    const history = statHistory[stat.id] || [];
                    const latest = history[0];
                    const previous = history[1];
                    
                    let changeText = '';
                    let changeColor = 'text-text-muted';
                    if (latest && previous) {
                      const change = latest.value - previous.value;
                      const isPositive = stat.higherIsBetter ? change > 0 : change < 0;
                      changeText = change > 0 ? `+${change}` : `${change}`;
                      changeColor = isPositive ? 'text-success' : 'text-danger';
                    }
                    
                    return (
                      <div
                        key={stat.id}
                        onClick={() => handleOpenStatEntry(stat)}
                        className="bg-surface-light rounded-lg p-4 cursor-pointer hover:border-primary/50 border border-transparent transition-all"
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl">{stat.icon}</span>
                          <div className="flex-1">
                            <p className="text-text font-medium">{stat.name}</p>
                            <p className="text-text-muted text-xs">{stat.unit}</p>
                          </div>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-bold text-primary">
                            {latest ? latest.value : '—'}
                          </span>
                          {changeText && (
                            <span className={`text-sm ${changeColor}`}>{changeText}</span>
                          )}
                        </div>
                        {history.length > 0 && (
                          <div className="mt-3 h-8 flex items-end gap-1">
                            {history.slice(0, 10).reverse().map((entry, i) => {
                              const values = history.map(e => e.value);
                              const min = Math.min(...values);
                              const max = Math.max(...values);
                              const range = max - min || 1;
                              const height = ((entry.value - min) / range) * 100;
                              return (
                                <div
                                  key={i}
                                  className="flex-1 bg-primary/60 rounded-sm"
                                  style={{ height: `${Math.max(20, height)}%` }}
                                />
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-dark flex items-center justify-center">
        <div className="text-primary text-xl font-bold">Loading RPG Life...</div>
      </div>
    );
  }

  const xpPercent = Math.round((character.xp / character.xpToNextLevel) * 100);

  return (
    <div className="min-h-screen bg-bg-dark p-4 md:p-8">
      {/* Header / Character Stats */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="bg-surface rounded-xl p-6 border border-surface-light">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center text-3xl font-bold text-primary">
                {character.level}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-text">Level {character.level} Adventurer</h1>
                <p className="text-text-muted">{character.totalQuestsCompleted} quests • {character.totalBossesDefeated} bosses</p>
              </div>
            </div>
            
            <div className="flex-1 max-w-md">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-xp font-medium">XP</span>
                <span className="text-text-muted">{character.xp} / {character.xpToNextLevel}</span>
              </div>
              <div className="h-3 bg-surface-light rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-yellow-500 to-yellow-300 transition-all duration-500"
                  style={{ width: `${xpPercent}%` }}
                />
              </div>
            </div>
          </div>
          
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            {Object.entries(character.stats).map(([stat, value]) => (
              <div key={stat} className="bg-surface-light rounded-lg p-3 text-center">
                <p className="text-xs text-text-muted uppercase tracking-wider mb-1">{stat}</p>
                <p className="text-xl font-bold text-primary">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-6xl mx-auto mb-6">
        <div className="flex gap-2">
          {(['quests', 'dungeons', 'stats'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-primary text-white'
                  : 'bg-surface text-text-muted hover:text-text'
              }`}
            >
              {tab === 'quests' && '⚔️ Quests'}
              {tab === 'dungeons' && '🏰 Dungeons'}
              {tab === 'stats' && '📊 Stats'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto">
        {activeTab === 'quests' && renderQuests()}
        {activeTab === 'dungeons' && renderDungeons()}
        {activeTab === 'stats' && renderStats()}
      </div>

      {/* Create Quest Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-surface rounded-xl p-6 w-full max-w-md border border-surface-light">
            <h2 className="text-xl font-bold text-text mb-4">Create New Quest</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-text-muted text-sm mb-2">Title</label>
                <input
                  type="text"
                  value={newQuestTitle}
                  onChange={(e) => setNewQuestTitle(e.target.value)}
                  className="w-full bg-bg-dark text-text rounded-lg px-4 py-2 border border-surface-light focus:border-primary focus:outline-none"
                  placeholder="What needs to be done?"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-text-muted text-sm mb-2">Quest Type</label>
                <select
                  value={newQuestType}
                  onChange={(e) => setNewQuestType(e.target.value as QuestType)}
                  className="w-full bg-bg-dark text-text rounded-lg px-4 py-2 border border-surface-light focus:border-primary focus:outline-none"
                >
                  <option value="daily">Daily Quest</option>
                  <option value="normal">Normal Enemy</option>
                  <option value="boss">Boss Fight</option>
                  <option value="main">Main Quest</option>
                  <option value="side">Side Quest</option>
                </select>
              </div>
              
              {newQuestType === 'boss' && (
                <div>
                  <label className="block text-text-muted text-sm mb-2">Boss HP</label>
                  <input
                    type="number"
                    value={newQuestHp}
                    onChange={(e) => setNewQuestHp(parseInt(e.target.value) || 100)}
                    className="w-full bg-bg-dark text-text rounded-lg px-4 py-2 border border-surface-light focus:border-primary focus:outline-none"
                  />
                </div>
              )}
              
              <div>
                <label className="block text-text-muted text-sm mb-2">XP Reward</label>
                <input
                  type="number"
                  value={newQuestXp}
                  onChange={(e) => setNewQuestXp(parseInt(e.target.value) || 0)}
                  className="w-full bg-bg-dark text-text rounded-lg px-4 py-2 border border-surface-light focus:border-primary focus:outline-none"
                />
              </div>
              
              <div>
                <label className="block text-text-muted text-sm mb-2">Core Values</label>
                <div className="flex flex-wrap gap-2">
                  {CORE_VALUES.map(tag => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        newQuestTags.includes(tag)
                          ? 'bg-primary text-white'
                          : 'bg-surface-light text-text-muted hover:text-text'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 py-2 text-text-muted hover:text-text transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateQuest}
                disabled={!newQuestTitle.trim()}
                className="flex-1 bg-primary hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 rounded-lg font-medium transition-colors"
              >
                Create Quest
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reflection Modal */}
      {showReflectionModal && selectedQuest && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-surface rounded-xl p-6 w-full max-w-md border border-surface-light">
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">⚔️</div>
              <h2 className="text-xl font-bold text-text">Victory!</h2>
              <p className="text-success font-bold mt-1">+{selectedQuest.xpReward} XP</p>
            </div>
            
            <p className="text-text-muted text-sm mb-3">
              You defeated: <span className="text-text font-medium">{selectedQuest.title}</span>
            </p>
            
            <textarea
              value={reflectionText}
              onChange={(e) => setReflectionText(e.target.value)}
              className="w-full h-24 bg-bg-dark text-text rounded-lg px-4 py-2 border border-surface-light focus:border-primary focus:outline-none resize-none"
              placeholder="Document your victory... (optional)"
            />
            
            <button
              onClick={finishCompletion}
              className="w-full bg-success hover:bg-green-600 text-white py-3 rounded-lg font-medium mt-4 transition-colors"
            >
              Claim Reward
            </button>
          </div>
        </div>
      )}

      {/* Dungeon Templates Modal */}
      {showDungeonTemplates && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-surface rounded-xl p-6 w-full max-w-lg border border-surface-light max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-text mb-4">Choose Your Dungeon</h2>
            
            <div className="space-y-3">
              {DUNGEON_TEMPLATES.map(template => (
                <button
                  key={template.id}
                  onClick={() => handleStartDungeon(template.id)}
                  className="w-full bg-surface-light hover:bg-primary/10 rounded-lg p-4 text-left border border-transparent hover:border-primary/30 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-3xl">{template.icon}</span>
                    <div className="flex-1">
                      <h3 className="text-text font-bold">{template.name}</h3>
                      <p className="text-text-muted text-sm">{template.description}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xp font-bold">+{template.xpReward} XP</span>
                      <p className="text-text-muted text-xs">{template.durationDays} Days</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            
            <button
              onClick={() => setShowDungeonTemplates(false)}
              className="w-full mt-4 py-2 text-text-muted hover:text-text transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Stat Entry Modal */}
      {showStatEntryModal && selectedStat && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-surface rounded-xl p-6 w-full max-w-md border border-surface-light">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">{selectedStat.icon}</span>
              <div>
                <h2 className="text-xl font-bold text-text">{selectedStat.name}</h2>
                <p className="text-text-muted text-sm">{selectedStat.unit}</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-text-muted text-sm mb-2">Value</label>
                <input
                  type="number"
                  step="0.1"
                  value={statValue}
                  onChange={(e) => setStatValue(e.target.value)}
                  className="w-full bg-bg-dark text-text rounded-lg px-4 py-2 border border-surface-light focus:border-primary focus:outline-none"
                  placeholder={`Enter ${selectedStat.name}`}
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-text-muted text-sm mb-2">Note (optional)</label>
                <input
                  type="text"
                  value={statNote}
                  onChange={(e) => setStatNote(e.target.value)}
                  className="w-full bg-bg-dark text-text rounded-lg px-4 py-2 border border-surface-light focus:border-primary focus:outline-none"
                  placeholder="Add a note..."
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowStatEntryModal(false)}
                className="flex-1 py-2 text-text-muted hover:text-text transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddStatEntry}
                disabled={!statValue.trim() || isNaN(parseFloat(statValue))}
                className="flex-1 bg-primary hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 rounded-lg font-medium transition-colors"
              >
                Save Entry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
