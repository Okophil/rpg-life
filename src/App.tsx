import { useState, useEffect } from 'react';
import type { Quest, QuestType, Character, CharacterStats } from './types';
import {
  getDefaultCharacter,
  getQuestTypeLabel,
  getQuestTypeBg,
  getQuestTypeColor,
  calculateXpToNextLevel,
  CORE_VALUES,
} from './types';
import { 
  getCharacter, 
  updateCharacter, 
  getQuests, 
  createQuest, 
  updateQuest, 
  deleteQuest,
  subscribeToQuests 
} from './supabase';

function App() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [character, setCharacter] = useState<Character>(getDefaultCharacter());
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showReflectionModal, setShowReflectionModal] = useState(false);
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);
  
  // Form states
  const [newQuestTitle, setNewQuestTitle] = useState('');
  const [newQuestType, setNewQuestType] = useState<QuestType>('normal');
  const [newQuestXp, setNewQuestXp] = useState(50);
  const [newQuestHp, setNewQuestHp] = useState(100);
  const [newQuestTags, setNewQuestTags] = useState<string[]>([]);
  const [reflectionText, setReflectionText] = useState('');
  const [hpDamage, setHpDamage] = useState(25);

  // Load data from Supabase
  useEffect(() => {
    loadData();
    
    // Subscribe to real-time updates
    const subscription = subscribeToQuests((updatedQuests) => {
      setQuests(updatedQuests);
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [charData, questsData] = await Promise.all([
        getCharacter(),
        getQuests()
      ]);
      
      if (charData) {
        setCharacter(charData);
      }
      setQuests(questsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

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
      setNewQuestTitle('');
      setNewQuestXp(50);
      setNewQuestHp(100);
      setNewQuestTags([]);
      setShowCreateModal(false);
    } catch (error) {
      console.error('Error creating quest:', error);
    }
  };

  const handleDamageBoss = async (questId: string, damage: number) => {
    const quest = quests.find(q => q.id === questId);
    if (!quest || quest.type !== 'boss') return;
    
    const newHp = Math.max(0, (quest.hp || 0) - damage);
    
    try {
      await updateQuest(questId, { hp: newHp });
      setQuests(quests.map(q => 
        q.id === questId ? { ...q, hp: newHp } : q
      ));
    } catch (error) {
      console.error('Error damaging boss:', error);
    }
  };

  const handleCompleteQuest = (quest: Quest) => {
    if (quest.type === 'boss' && (quest.hp || 0) > 0) {
      return;
    }

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

      // Update local state
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

  const activeQuests = quests.filter(q => q.status === 'active');
  const completedQuests = quests.filter(q => q.status === 'completed').slice(-5);

  const xpPercent = Math.round((character.xp / character.xpToNextLevel) * 100);

  const toggleTag = (tag: string) => {
    if (newQuestTags.includes(tag)) {
      setNewQuestTags(newQuestTags.filter(t => t !== tag));
    } else {
      setNewQuestTags([...newQuestTags, tag]);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-dark flex items-center justify-center">
        <div className="text-primary text-xl font-bold">Loading RPG Life...</div>
      </div>
    );
  }

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
                <p className="text-text-muted">{character.totalQuestsCompleted} quests completed • {character.totalBossesDefeated} bosses defeated</p>
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

      {/* Main Content */}
      <div className="max-w-6xl mx-auto">
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

        {/* Completed Quests */}
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
    </div>
  );
}

export default App;
