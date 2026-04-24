import { useState, useEffect } from 'react';
import type { Quest, QuestType, Character, CharacterStats, Dungeon, LifeStatDefinition, LifeStatEntry } from './types';
import {
  getDefaultCharacter,
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

// 🏰 MEDIEVAL SPRITE SYSTEM
const ENEMY_SPRITES: Record<string, { sprite: string; name: string; description: string }> = {
  goblin: { sprite: '👺', name: 'Goblin', description: 'Schwach, aber zahlreich' },
  skeleton: { sprite: '💀', name: 'Skelett', description: 'Täglich wiederkehrend' },
  bandit: { sprite: '🥷', name: 'Bandit', description: 'Gewöhnlicher Feind' },
  slime: { sprite: '🟢', name: 'Schleim', description: 'Einfaches Ziel' },
  orc: { sprite: '👹', name: 'Ork', description: 'Starker Gegner' },
  troll: { sprite: '👾', name: 'Troll', description: 'Widerstandsfähig' },
  wolf: { sprite: '🐺', name: 'Wolf', description: 'Schnell und wild' },
  spider: { sprite: '🕷️', name: 'Spinne', description: 'Listig' },
  ghost: { sprite: '👻', name: 'Geist', description: 'Flüchtig' },
  zombie: { sprite: '🧟', name: 'Untoter', description: 'Hartnäckig' },
  dragon: { sprite: '🐉', name: 'Drache', description: 'Legendär' },
  demon: { sprite: '👿', name: 'Dämon', description: 'Unermessliche Macht' },
  vampire: { sprite: '🧛', name: 'Vampir', description: 'Kaltblütig' },
  werewolf: { sprite: '🐕', name: 'Werwolf', description: 'Wild' },
  hydra: { sprite: '🐍', name: 'Hydra', description: 'Mehrköpfig' },
  necromancer: { sprite: '🧙‍♂️', name: 'Nekromant', description: 'Meister der Untoten' },
  golem: { sprite: '🗿', name: 'Golem', description: 'Unzerstörbar' },
  basilisk: { sprite: '🦎', name: 'Basilisk', description: 'Tödlicher Blick' },
};

const SPRITE_POOL = Object.keys(ENEMY_SPRITES);

function getRandomEnemySprite(): string {
  return SPRITE_POOL[Math.floor(Math.random() * SPRITE_POOL.length)];
}

function getEnemyForBoss(): string {
  const bosses = ['dragon', 'demon', 'necromancer', 'hydra', 'golem', 'vampire', 'basilisk', 'werewolf'];
  return bosses[Math.floor(Math.random() * bosses.length)];
}

type TabType = 'wildnis' | 'quests' | 'dungeons' | 'stats';

// 🕐 Format time for display
function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

// 🌙 Get time period label
function getTimePeriod(dateString: string): string {
  const hour = new Date(dateString).getHours();
  if (hour >= 6 && hour < 12) return 'Morgen';
  if (hour >= 12 && hour < 18) return 'Tag';
  if (hour >= 18 && hour < 22) return 'Abend';
  return 'Nacht';
}

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('wildnis');
  
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
      // Add sprite metadata to quests
      const questsWithSprites = questsData.map(q => ({
        ...q,
        spriteKey: q.spriteKey || (q.type === 'boss' ? getEnemyForBoss() : getRandomEnemySprite())
      }));
      setQuests(questsWithSprites);
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
      const spriteKey = newQuestType === 'boss' ? getEnemyForBoss() : getRandomEnemySprite();
      const newQuest = await createQuest({
        title: newQuestTitle,
        description: '',
        type: newQuestType,
        hp: newQuestType === 'boss' ? newQuestHp : undefined,
        maxHp: newQuestType === 'boss' ? newQuestHp : undefined,
        xpReward: newQuestXp,
        status: 'active',
        tags: newQuestTags,
        spriteKey: spriteKey,
      });
      
      setQuests([{ ...newQuest, spriteKey }, ...quests]);
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

  // 🏰 WILDNIS: Normale Feinde + Bosse
  const renderWildnis = () => {
    const normalEnemies = quests.filter(q => q.status === 'active' && (q.type === 'normal' || q.type === 'daily'));
    const bosses = quests.filter(q => q.status === 'active' && q.type === 'boss');
    const completedEnemies = quests.filter(q => q.status === 'completed' && (q.type === 'normal' || q.type === 'boss' || q.type === 'daily')).slice(-5);

    return (
      <>
        {/* 🗡️ Normal Enemies Section */}
        <div className="mb-10">
          <div className="flex justify-between items-center mb-6 border-b-2 border-bronze pb-3">
            <div className="flex items-center gap-3">
              <span className="text-3xl">⚔️</span>
              <div>
                <h2 className="text-2xl font-medieval font-bold text-gold">Die Wildnis</h2>
                <p className="text-text-muted text-sm font-parchment italic">Gewöhnliche Gegner erwarten dich...</p>
              </div>
            </div>
            <button
              onClick={() => { setNewQuestType('normal'); setShowCreateModal(true); }}
              className="btn-medieval px-4 py-2 rounded text-sm"
            >
              + Feind erscheinen
            </button>
          </div>

          {normalEnemies.length === 0 ? (
            <div className="text-center py-12 text-text-muted parchment-card rounded-xl p-8">
              <p className="text-4xl mb-4">🏕️</p>
              <p className="text-lg font-medieval">Die Wildnis ist ruhig...</p>
              <p className="font-parchment italic">Noch keine Gegner gesichtet.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {normalEnemies.map(quest => {
                const sprite = ENEMY_SPRITES[quest.spriteKey || 'goblin'] || ENEMY_SPRITES['goblin'];
                const timeLabel = formatTime(quest.createdAt);
                const period = getTimePeriod(quest.createdAt);
                
                return (
                  <div key={quest.id} className="enemy-card rounded-xl p-4 relative group hover:border-gold transition-all">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-3xl">{sprite.sprite}</span>
                        <div>
                          <p className="font-medieval font-bold text-parchment text-sm">{sprite.name}</p>
                          <p className="text-text-muted text-xs font-parchment">{sprite.description}</p>
                        </div>
                      </div>
                      <span className="text-gold font-medieval font-bold text-sm">+{quest.xpReward}</span>
                    </div>
                    
                    <h3 className="font-parchment font-semibold text-parchment mb-3 text-lg">{quest.title}</h3>
                    
                    <div className="flex items-center gap-2 mb-3">
                      <span className="time-badge">{timeLabel}</span>
                      <span className="text-xs text-text-muted">{period}</span>
                    </div>
                    
                    {quest.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {quest.tags.map(tag => (
                          <span key={tag} className="text-xs text-gold border border-bronze px-2 py-0.5 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCompleteQuest(quest)}
                        className="flex-1 btn-success text-parchment py-2 rounded font-medieval text-sm"
                      >
                        ⚔️ Erledigen
                      </button>
                      <button
                        onClick={() => handleDeleteQuest(quest.id)}
                        className="px-3 text-text-muted hover:text-blood transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 🐉 Boss Section */}
        {bosses.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-6 border-b-2 border-blood pb-3">
              <span className="text-3xl">🐉</span>
              <div>
                <h2 className="text-2xl font-medieval font-bold text-blood">Bosskämpfe</h2>
                <p className="text-text-muted text-sm font-parchment italic">Mächtige Gegner fordern dich heraus...</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
              {bosses.map(quest => {
                const sprite = ENEMY_SPRITES[quest.spriteKey || 'dragon'] || ENEMY_SPRITES['dragon'];
                const hpPercent = ((quest.hp || 0) / (quest.maxHp || 1)) * 100;
                
                return (
                  <div key={quest.id} className="boss-card rounded-xl p-6 relative">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <span className="text-5xl">{sprite.sprite}</span>
                        <div>
                          <p className="font-medieval font-bold text-gold text-lg">{sprite.name}</p>
                          <p className="text-text-muted text-sm font-parchment">{sprite.description}</p>
                          <span className="text-gold font-medieval text-sm">+{quest.xpReward} XP</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-blood font-medieval font-bold text-2xl">{quest.hp}</span>
                        <span className="text-text-muted text-sm"> / {quest.maxHp} HP</span>
                      </div>
                    </div>
                    
                    <h3 className="font-parchment font-semibold text-parchment text-xl mb-4">{quest.title}</h3>
                    
                    {/* Boss HP Bar */}
                    <div className="mb-4">
                      <div className="hp-bar h-6">
                        <div className="hp-fill h-full flex items-center justify-center" style={{ width: `${hpPercent}%` }}>
                          {hpPercent > 20 && <span className="text-parchment text-xs font-medieval">{Math.round(hpPercent)}%</span>}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="1"
                        max={quest.hp}
                        value={hpDamage}
                        onChange={(e) => setHpDamage(Math.max(1, parseInt(e.target.value) || 0))}
                        className="w-20 bg-midnight text-parchment rounded px-2 py-2 text-sm border border-blood"
                        placeholder="DMG"
                      />
                      <button
                        onClick={() => handleDamageBoss(quest.id, hpDamage)}
                        className="flex-1 btn-danger text-parchment py-2 rounded font-medieval"
                      >
                        ⚔️ Angreifen
                      </button>
                      <button
                        onClick={() => handleDeleteQuest(quest.id)}
                        className="px-3 text-text-muted hover:text-blood transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent Defeated */}
        {completedEnemies.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-medieval font-bold text-text-muted mb-4">⚰️ Kürzlich Besiegt</h3>
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {completedEnemies.map(quest => {
                const sprite = ENEMY_SPRITES[quest.spriteKey || 'goblin'] || ENEMY_SPRITES['goblin'];
                return (
                  <div key={quest.id} className="bg-midnight-light rounded-lg p-3 border border-bronze opacity-60 flex items-center gap-3">
                    <span className="text-xl">{sprite.sprite}</span>
                    <div className="flex-1">
                      <p className="text-parchment text-sm font-parchment">{quest.title}</p>
                      <p className="text-gold text-xs">+{quest.xpReward} XP</p>
                    </div>
                    <span className="text-success">✓</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </>
    );
  };

  // 📜 QUESTS: Main + Side Quests
  const renderQuests = () => {
    const mainQuests = quests.filter(q => q.status === 'active' && q.type === 'main');
    const sideQuests = quests.filter(q => q.status === 'active' && q.type === 'side');
    const completedQuests = quests.filter(q => q.status === 'completed' && (q.type === 'main' || q.type === 'side')).slice(-5);

    return (
      <>
        {/* 🏰 Main Quests Section */}
        <div className="mb-10">
          <div className="flex justify-between items-center mb-6 border-b-2 border-gold pb-3">
            <div className="flex items-center gap-3">
              <span className="text-3xl">📜</span>
              <div>
                <h2 className="text-2xl font-medieval font-bold text-gold">Hauptquests</h2>
                <p className="text-text-muted text-sm font-parchment italic">Deine größten Unterfangen...</p>
              </div>
            </div>
            <button
              onClick={() => { setNewQuestType('main'); setShowCreateModal(true); }}
              className="btn-medieval px-4 py-2 rounded text-sm"
            >
              + Neue Hauptquest
            </button>
          </div>

          {mainQuests.length === 0 ? (
            <div className="text-center py-12 text-text-muted parchment-card rounded-xl p-8">
              <p className="text-4xl mb-4">🏰</p>
              <p className="text-lg font-medieval">Keine Hauptquests aktiv...</p>
              <p className="font-parchment italic">Die Geschichte wartet auf dich.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
              {mainQuests.map(quest => (
                <div key={quest.id} className="main-quest-card rounded-xl p-6 relative">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">📜</span>
                      <div>
                        <p className="font-medieval font-bold text-gold">Hauptquest</p>
                        <span className="text-gold font-medieval">+{quest.xpReward} XP</span>
                      </div>
                    </div>
                    <div className="w-3 h-3 bg-gold rounded-full shadow-gold animate-pulse" />
                  </div>
                  
                  <h3 className="font-parchment font-bold text-parchment text-xl mb-4">{quest.title}</h3>
                  
                  {quest.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {quest.tags.map(tag => (
                        <span key={tag} className="text-xs text-gold border border-gold px-3 py-1 rounded-full font-medieval">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCompleteQuest(quest)}
                      className="flex-1 bg-gold hover:bg-gold-light text-midnight py-3 rounded font-medieval font-bold transition-all"
                    >
                      ✦ Abschließen
                    </button>
                    <button
                      onClick={() => handleDeleteQuest(quest.id)}
                      className="px-4 text-text-muted hover:text-blood transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 🍃 Side Quests Section */}
        <div className="mb-10">
          <div className="flex justify-between items-center mb-6 border-b-2 border-forest pb-3">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🍃</span>
              <div>
                <h2 className="text-2xl font-medieval font-bold text-forest">Nebenquests</h2>
                <p className="text-text-muted text-sm font-parchment italic">Kleinere Aufgaben und Errungenschaften...</p>
              </div>
            </div>
            <button
              onClick={() => { setNewQuestType('side'); setShowCreateModal(true); }}
              className="btn-medieval px-4 py-2 rounded text-sm"
            >
              + Nebenquest
            </button>
          </div>

          {sideQuests.length === 0 ? (
            <div className="text-center py-12 text-text-muted parchment-card rounded-xl p-8">
              <p className="text-4xl mb-4">🌿</p>
              <p className="text-lg font-medieval">Keine Nebenquests...</p>
              <p className="font-parchment italic">Zeit, die Welt zu erkunden.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {sideQuests.map(quest => (
                <div key={quest.id} className="side-quest-card rounded-xl p-4 relative hover:border-gold transition-all">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">🍃</span>
                      <span className="text-gold font-medieval font-bold text-sm">+{quest.xpReward}</span>
                    </div>
                  </div>
                  
                  <h3 className="font-parchment font-semibold text-parchment mb-3">{quest.title}</h3>
                  
                  {quest.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {quest.tags.map(tag => (
                        <span key={tag} className="text-xs text-forest border border-forest px-2 py-0.5 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCompleteQuest(quest)}
                      className="flex-1 btn-success text-parchment py-2 rounded font-medieval text-sm"
                    >
                      ✓ Erfüllen
                    </button>
                    <button
                      onClick={() => handleDeleteQuest(quest.id)}
                      className="px-2 text-text-muted hover:text-blood transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recently Completed Quests */}
        {completedQuests.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-medieval font-bold text-text-muted mb-4">📖 Abgeschlossen</h3>
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {completedQuests.map(quest => (
                <div key={quest.id} className="bg-midnight-light rounded-lg p-3 border border-bronze opacity-60">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{quest.type === 'main' ? '📜' : '🍃'}</span>
                    <p className="text-parchment text-sm font-parchment">{quest.title}</p>
                  </div>
                  <p className="text-gold text-xs">+{quest.xpReward} XP</p>
                  {quest.reflection && (
                    <p className="text-text-muted text-xs italic mt-1">"{quest.reflection.substring(0, 50)}..."</p>
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
        <div className="flex justify-between items-center mb-6 border-b-2 border-bronze pb-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🏰</span>
            <div>
              <h2 className="text-2xl font-medieval font-bold text-gold">Dungeons</h2>
              <p className="text-text-muted text-sm font-parchment italic">Lange Herausforderungen...</p>
            </div>
          </div>
          <button
            onClick={() => setShowDungeonTemplates(true)}
            className="btn-medieval px-4 py-2 rounded text-sm"
          >
            + Dungeon betreten
          </button>
        </div>

        {activeDungeons.length === 0 && completedDungeons.length === 0 ? (
          <div className="text-center py-12 text-text-muted parchment-card rounded-xl p-8">
            <p className="text-4xl mb-4">🏰</p>
            <p className="text-lg font-medieval">Keine aktiven Dungeons</p>
            <p className="font-parchment italic">Die Tore sind verschlossen...</p>
          </div>
        ) : (
          <>
            {activeDungeons.length > 0 && (
              <div className="grid gap-6 mb-8">
                {activeDungeons.map(dungeon => {
                  const completedDays = dungeon.days.filter(d => d.completed).length;
                  const progress = (completedDays / dungeon.durationDays) * 100;
                  
                  return (
                    <div key={dungeon.id} className="parchment-card rounded-xl p-6">
                      <div className="flex items-center gap-4 mb-4">
                        <span className="text-4xl">{dungeon.icon}</span>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-gold font-medieval">{dungeon.name}</h3>
                          <p className="text-text-muted text-sm font-parchment">{dungeon.description}</p>
                        </div>
                        <span className="text-gold font-medieval font-bold">+{dungeon.xpReward}</span>
                      </div>
                      
                      <div className="mb-4">
                        <div className="flex justify-between text-sm mb-2 font-parchment">
                          <span className="text-text-muted">Fortschritt</span>
                          <span className="text-gold">{completedDays} / {dungeon.durationDays} Tage</span>
                        </div>
                        <div className="h-3 bg-midnight rounded-full overflow-hidden border border-bronze">
                          <div
                            className="h-full bg-gradient-to-r from-gold to-gold-light transition-all duration-500"
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
                            className={`w-10 h-10 rounded-lg font-medieval font-bold transition-all border ${
                              day.completed
                                ? 'bg-success border-forest text-parchment'
                                : 'bg-midnight border-bronze text-text-muted hover:border-gold hover:text-gold'
                            }`}
                          >
                            {day.completed ? '✓' : day.day}
                          </button>
                        ))}
                      </div>
                      
                      <button
                        onClick={() => handleResetDungeon(dungeon.id)}
                        className="mt-4 text-sm text-text-muted hover:text-blood transition-colors font-parchment"
                      >
                        Dungeon zurücksetzen
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {completedDungeons.length > 0 && (
              <div>
                <h3 className="text-lg font-medieval font-bold text-text-muted mb-4">🏆 Vollendet</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {completedDungeons.map(dungeon => (
                    <div key={dungeon.id} className="bg-midnight-light rounded-xl p-4 border border-success/30 opacity-75">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{dungeon.icon}</span>
                        <div className="flex-1">
                          <h4 className="text-parchment font-medieval font-bold">{dungeon.name}</h4>
                          <p className="text-success text-sm font-parchment">✓ Vollendet</p>
                        </div>
                        <span className="text-gold">+{dungeon.xpReward}</span>
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
      <div className="min-h-screen bg-midnight flex items-center justify-center">
        <div className="text-gold text-xl font-medieval">Das Königreich lädt...</div>
      </div>
    );
  }

  const xpPercent = Math.round((character.xp / character.xpToNextLevel) * 100);

  return (
    <div className="min-h-screen bg-midnight p-4 md:p-8 font-parchment">
      {/* 🏰 Header / Character Stats */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="parchment-card rounded-xl p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-gold/20 border-2 border-gold flex items-center justify-center text-3xl font-bold text-gold font-medieval shadow-gold">
                {character.level}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gold font-medieval">Level {character.level} Krieger</h1>
                <p className="text-parchment-dark font-parchment">
                  {character.totalQuestsCompleted} Quests • {character.totalBossesDefeated} Bosse besiegt
                </p>
              </div>
            </div>
            
            <div className="flex-1 max-w-md">
              <div className="flex justify-between text-sm mb-2 font-medieval">
                <span className="text-gold">Erfahrung</span>
                <span className="text-parchment-dark">{character.xp} / {character.xpToNextLevel}</span>
              </div>
              <div className="h-4 bg-midnight rounded-full overflow-hidden border border-bronze">
                <div
                  className="h-full xp-fill"
                  style={{ width: `${xpPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 🏰 Navigation Tabs */}
      <div className="max-w-6xl mx-auto mb-6">
        <div className="flex gap-2 border-b-2 border-bronze pb-2">
          {(['wildnis', 'quests', 'dungeons', 'stats'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 rounded-t-lg font-medieval font-bold transition-all ${
                activeTab === tab
                  ? 'bg-gold/20 text-gold border-t-2 border-x-2 border-gold'
                  : 'text-parchment-dark hover:text-gold'
              }`}
            >
              {tab === 'wildnis' && '⚔️ Wildnis'}
              {tab === 'quests' && '📜 Quests'}
              {tab === 'dungeons' && '🏰 Dungeons'}
              {tab === 'stats' && '📊 Stats'}
            </button>
          ))}
        </div>
      </div>

      {/* 🏰 Main Content */}
      <div className="max-w-6xl mx-auto">
        {activeTab === 'wildnis' && renderWildnis()}
        {activeTab === 'quests' && renderQuests()}
        {activeTab === 'dungeons' && renderDungeons()}
        {activeTab === 'stats' && renderStats()}
      </div>

      {/* 🏰 Create Quest Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="parchment-card rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gold font-medieval mb-4">
              {newQuestType === 'normal' ? 'Neuer Feind' : 
               newQuestType === 'boss' ? 'Boss beschwören' :
               newQuestType === 'main' ? 'Hauptquest beginnen' : 
               newQuestType === 'side' ? 'Nebenquest annehmen' : 'Neue Aufgabe'}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-parchment-dark text-sm mb-2 font-parchment">Name</label>
                <input
                  type="text"
                  value={newQuestTitle}
                  onChange={(e) => setNewQuestTitle(e.target.value)}
                  className="w-full bg-midnight text-parchment rounded-lg px-4 py-2 border border-bronze focus:border-gold focus:outline-none font-parchment"
                  placeholder="Wie lautet der Name?"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-parchment-dark text-sm mb-2 font-parchment">Art</label>
                <select
                  value={newQuestType}
                  onChange={(e) => setNewQuestType(e.target.value as QuestType)}
                  className="w-full bg-midnight text-parchment rounded-lg px-4 py-2 border border-bronze focus:border-gold focus:outline-none font-parchment"
                >
                  <option value="normal">Gewöhnlicher Feind</option>
                  <option value="boss">Bosskampf</option>
                  <option value="main">Hauptquest</option>
                  <option value="side">Nebenquest</option>
                  <option value="daily">Tägliche Quest</option>
                </select>
              </div>
              
              {newQuestType === 'boss' && (
                <div>
                  <label className="block text-parchment-dark text-sm mb-2 font-parchment">Boss HP</label>
                  <input
                    type="number"
                    value={newQuestHp}
                    onChange={(e) => setNewQuestHp(parseInt(e.target.value) || 100)}
                    className="w-full bg-midnight text-parchment rounded-lg px-4 py-2 border border-bronze focus:border-gold focus:outline-none"
                  />
                </div>
              )}
              
              <div>
                <label className="block text-parchment-dark text-sm mb-2 font-parchment">XP-Belohnung</label>
                <input
                  type="number"
                  value={newQuestXp}
                  onChange={(e) => setNewQuestXp(parseInt(e.target.value) || 0)}
                  className="w-full bg-midnight text-parchment rounded-lg px-4 py-2 border border-bronze focus:border-gold focus:outline-none"
                />
              </div>
              
              <div>
                <label className="block text-parchment-dark text-sm mb-2 font-parchment">Werte</label>
                <div className="flex flex-wrap gap-2">
                  {CORE_VALUES.map(tag => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1 rounded-full text-sm transition-colors font-parchment ${
                        newQuestTags.includes(tag)
                          ? 'bg-gold text-midnight font-bold'
                          : 'bg-midnight-light text-parchment-dark border border-bronze'
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
                className="flex-1 py-2 text-parchment-dark hover:text-parchment transition-colors font-parchment"
              >
                Abbrechen
              </button>
              <button
                onClick={handleCreateQuest}
                disabled={!newQuestTitle.trim()}
                className="flex-1 btn-medieval disabled:opacity-50 disabled:cursor-not-allowed text-parchment py-2 rounded-lg font-medieval"
              >
                Erstellen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🏰 Reflection Modal */}
      {showReflectionModal && selectedQuest && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="parchment-card rounded-xl p-6 w-full max-w-md">
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">⚔️</div>
              <h2 className="text-xl font-bold text-gold font-medieval">Sieg!</h2>
              <p className="text-gold font-medieval mt-1">+{selectedQuest.xpReward} XP</p>
            </div>
            
            <p className="text-parchment-dark text-sm mb-3 font-parchment">
              Besiegt: <span className="text-parchment font-medium">{selectedQuest.title}</span>
            </p>
            
            <textarea
              value={reflectionText}
              onChange={(e) => setReflectionText(e.target.value)}
              className="w-full h-24 bg-midnight text-parchment rounded-lg px-4 py-2 border border-bronze focus:border-gold focus:outline-none resize-none font-parchment"
              placeholder="Dokumentiere deinen Sieg... (optional)"
            />
            
            <button
              onClick={finishCompletion}
              className="w-full btn-success text-parchment py-3 rounded-lg font-medieval mt-4"
            >
              Belohnung einfordern
            </button>
          </div>
        </div>
      )}

      {/* 🏰 Dungeon Templates Modal */}
      {showDungeonTemplates && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="parchment-card rounded-xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gold font-medieval mb-4">Dungeon wählen</h2>
            
            <div className="space-y-3">
              {DUNGEON_TEMPLATES.map(template => (
                <button
                  key={template.id}
                  onClick={() => handleStartDungeon(template.id)}
                  className="w-full bg-midnight hover:bg-gold/10 rounded-lg p-4 text-left border border-bronze hover:border-gold transition-all"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-3xl">{template.icon}</span>
                    <div className="flex-1">
                      <h3 className="text-parchment font-medieval font-bold">{template.name}</h3>
                      <p className="text-parchment-dark text-sm font-parchment">{template.description}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-gold font-medieval font-bold">+{template.xpReward}</span>
                      <p className="text-parchment-dark text-xs font-parchment">{template.durationDays} Tage</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            
            <button
              onClick={() => setShowDungeonTemplates(false)}
              className="w-full mt-4 py-2 text-parchment-dark hover:text-parchment transition-colors font-parchment"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* 🏰 Stat Entry Modal */}
      {showStatEntryModal && selectedStat && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="parchment-card rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">{selectedStat.icon}</span>
              <div>
                <h2 className="text-xl font-bold text-gold font-medieval">{selectedStat.name}</h2>
                <p className="text-parchment-dark text-sm font-parchment">{selectedStat.unit}</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-parchment-dark text-sm mb-2 font-parchment">Wert</label>
                <input
                  type="number"
                  step="0.1"
                  value={statValue}
                  onChange={(e) => setStatValue(e.target.value)}
                  className="w-full bg-midnight text-parchment rounded-lg px-4 py-2 border border-bronze focus:border-gold focus:outline-none font-parchment"
                  placeholder={`${selectedStat.name} eingeben`}
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-parchment-dark text-sm mb-2 font-parchment">Notiz (optional)</label>
                <input
                  type="text"
                  value={statNote}
                  onChange={(e) => setStatNote(e.target.value)}
                  className="w-full bg-midnight text-parchment rounded-lg px-4 py-2 border border-bronze focus:border-gold focus:outline-none font-parchment"
                  placeholder="Notiz hinzufügen..."
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowStatEntryModal(false)}
                className="flex-1 py-2 text-parchment-dark hover:text-parchment transition-colors font-parchment"
              >
                Abbrechen
              </button>
              <button
                onClick={handleAddStatEntry}
                disabled={!statValue.trim() || isNaN(parseFloat(statValue))}
                className="flex-1 btn-medieval disabled:opacity-50 disabled:cursor-not-allowed text-parchment py-2 rounded-lg font-medieval"
              >
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
