import React, { useState, useEffect } from 'react';
import { Gamepad2, Plus, Edit3, Trash2, Save, X, Bell, RefreshCw, Wifi, WifiOff } from 'lucide-react';

// Fallback interface if Supabase isn't connected
interface Game {
  id: string;
  title: string;
  description: string;
  category: string;
  color: string;
  url: string;
  created_at: string;
  updated_at: string;
}

const categories = ['All', 'Arcade', 'Puzzle', 'Multiplayer', 'Action', 'Strategy', 'Sports'];

// Fallback localStorage service
const localStorageService = {
  async getGames(): Promise<Game[]> {
    const stored = localStorage.getItem('unblockedGames');
    return stored ? JSON.parse(stored) : [];
  },

  async addGame(game: Omit<Game, 'id' | 'created_at' | 'updated_at'>): Promise<Game | null> {
    const games = await this.getGames();
    const newGame: Game = {
      ...game,
      id: Date.now().toString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    games.unshift(newGame);
    localStorage.setItem('unblockedGames', JSON.stringify(games));
    
    // Trigger storage event for cross-tab sync
    localStorage.setItem('gameUpdate', Date.now().toString());
    
    return newGame;
  },

  async updateGame(id: string, updates: Partial<Omit<Game, 'id' | 'created_at' | 'updated_at'>>): Promise<Game | null> {
    const games = await this.getGames();
    const gameIndex = games.findIndex(g => g.id === id);
    if (gameIndex === -1) return null;
    
    const updatedGame = {
      ...games[gameIndex],
      ...updates,
      updated_at: new Date().toISOString()
    };
    games[gameIndex] = updatedGame;
    localStorage.setItem('unblockedGames', JSON.stringify(games));
    
    // Trigger storage event for cross-tab sync
    localStorage.setItem('gameUpdate', Date.now().toString());
    
    return updatedGame;
  },

  async deleteGame(id: string): Promise<boolean> {
    const games = await this.getGames();
    const filteredGames = games.filter(g => g.id !== id);
    localStorage.setItem('unblockedGames', JSON.stringify(filteredGames));
    
    // Trigger storage event for cross-tab sync
    localStorage.setItem('gameUpdate', Date.now().toString());
    
    return true;
  },

  subscribeToChanges(callback: (games: Game[]) => void) {
    const handleStorageChange = async (e: StorageEvent) => {
      if (e.key === 'gameUpdate') {
        const games = await this.getGames();
        callback(games);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }
};

function App() {
  const [gameService, setGameService] = useState<any>(null);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false);
  const [games, setGames] = useState<Game[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [showAddGame, setShowAddGame] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [secretSequence, setSecretSequence] = useState('');
  const [showNotification, setShowNotification] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [lastGameCount, setLastGameCount] = useState(0);

  // Initialize Supabase service
  useEffect(() => {
    const initializeSupabase = async () => {
      setIsLoading(true);
      try {
        const supabaseModule = await import('./lib/supabase');
        setGameService(supabaseModule.gameService);
        setIsSupabaseConnected(true);
        // Load games after Supabase is connected
        const fetchedGames = await supabaseModule.gameService.getGames();
        setGames(fetchedGames);
        setLastGameCount(fetchedGames.length);
      } catch (error) {
        console.warn('Supabase not available, using localStorage fallback');
        setIsSupabaseConnected(false);
        // Load games from localStorage
        const fetchedGames = await localStorageService.getGames();
        setGames(fetchedGames);
        setLastGameCount(fetchedGames.length);
      }
      setIsLoading(false);
    };

    initializeSupabase();
  }, []);

  // Get the appropriate service
  const getGameService = () => gameService || localStorageService;

  const [newGame, setNewGame] = useState({
    title: '',
    description: '',
    category: 'Arcade',
    color: 'bg-blue-500',
    url: ''
  });

  const colors = [
    'bg-blue-500', 'bg-red-500', 'bg-green-500', 'bg-yellow-500',
    'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-orange-500'
  ];

  const filteredGames = games.filter(game => {
    const matchesCategory = selectedCategory === 'All' || game.category === selectedCategory;
    const matchesSearch = game.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         game.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Load admin mode state from localStorage on mount
  useEffect(() => {
    const savedAdminMode = localStorage.getItem('adminMode');
    if (savedAdminMode === 'true') {
      setIsAdminMode(true);
    }
  }, []);

  // Save admin mode state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('adminMode', isAdminMode.toString());
  }, [isAdminMode]);

  // Load games from Supabase on mount
  useEffect(() => {
    // Don't load games here since we're loading them in the Supabase initialization
  }, []);

  // Subscribe to real-time changes
  useEffect(() => {
    if (!gameService && !isSupabaseConnected) return;
    
    const unsubscribe = getGameService().subscribeToChanges((updatedGames) => {
      setGames(prevGames => {
        // Only show notification if games were added (not on initial load or deletions)
        if (prevGames.length > 0 && updatedGames.length > prevGames.length) {
          setShowNotification(true);
        }
        setLastGameCount(updatedGames.length);
        return updatedGames;
      });
    });

    return unsubscribe;
  }, [gameService, isSupabaseConnected]);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadGames = async () => {
    setIsLoading(true);
    try {
      const fetchedGames = await getGameService().getGames();
      setGames(fetchedGames);
    } catch (error) {
      console.error('Failed to load games:', error);
      setIsOnline(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === '\\') {
        event.preventDefault();
        window.open('https://classroom.google.com', '_blank');
      }
      if (event.key === 'Escape') {
        setSelectedGame(null);
        setShowAddGame(false);
        setEditingGame(null);
      }
      
      // Secret sequence detection
      const newSequence = secretSequence + event.key;
      if (newSequence.length > 10) {
        setSecretSequence(newSequence.slice(-10));
      } else {
        setSecretSequence(newSequence);
      }
      
      if (newSequence.includes('admin123')) {
        setIsAdminMode(true);
        setSecretSequence('');
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [secretSequence]);

  const handleGameClick = (game: Game) => {
    if (!isAdminMode) {
      setSelectedGame(game);
    }
  };

  const handleBackToGames = () => {
    setSelectedGame(null);
  };

  const handleAddGame = async () => {
    if (newGame.title && newGame.url) {
      const addedGame = await getGameService().addGame(newGame);
      if (addedGame) {
        setGames(prev => {
          const newGames = [addedGame, ...prev];
          setLastGameCount(newGames.length);
          return newGames;
        });
        setNewGame({
          title: '',
          description: '',
          category: 'Arcade',
          color: 'bg-blue-500',
          url: ''
        });
        setShowAddGame(false);
      }
    }
  };

  const handleEditGame = (game: Game) => {
    setEditingGame(game);
    setNewGame({
      title: game.title,
      description: game.description,
      category: game.category,
      color: game.color,
      url: game.url
    });
  };

  const handleUpdateGame = async () => {
    if (editingGame && newGame.title && newGame.url) {
      const updatedGame = await getGameService().updateGame(editingGame.id, newGame);
      if (updatedGame) {
        setGames(prev => {
          const newGames = prev.map(game => 
            game.id === editingGame.id ? updatedGame : game
          );
          setLastGameCount(newGames.length);
          return newGames;
        });
        setEditingGame(null);
        setNewGame({
          title: '',
          description: '',
          category: 'Arcade',
          color: 'bg-blue-500',
          url: ''
        });
      }
    }
  };

  const handleDeleteGame = async (gameId: string) => {
    if (confirm('Are you sure you want to delete this game?')) {
      const success = await getGameService().deleteGame(gameId);
      if (success) {
        setGames(prev => {
          const newGames = prev.filter(game => game.id !== gameId);
          setLastGameCount(newGames.length);
          return newGames;
        });
      } else {
        alert('Failed to delete game. Please try again.');
      }
    }
  };

  const handleExitAdminMode = () => {
    setIsAdminMode(false);
    setShowAddGame(false);
    setEditingGame(null);
  };

  const handleReloadGames = async () => {
    setIsLoading(true);
    try {
      const fetchedGames = await getGameService().getGames();
      setGames(fetchedGames);
      setLastGameCount(fetchedGames.length);
    } catch (error) {
      console.error('Failed to reload games:', error);
    } finally {
      setIsLoading(false);
    }
    setShowNotification(false);
  };

  const handleDismissNotification = () => {
    setShowNotification(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800">
      {/* Connection Status */}
      <div className={`fixed top-4 left-4 z-50 px-3 py-1 rounded-full text-sm font-medium ${
        isSupabaseConnected && isOnline ? 'bg-green-500 text-white' : 
        isSupabaseConnected ? 'bg-red-500 text-white' : 'bg-yellow-500 text-white'
      }`}>
        {isSupabaseConnected && isOnline ? (
          <div className="flex items-center gap-1">
            <Wifi className="w-3 h-3" />
            Cloud Sync
          </div>
        ) : isSupabaseConnected ? (
          <div className="flex items-center gap-1">
            <WifiOff className="w-3 h-3" />
            Offline
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <WifiOff className="w-3 h-3" />
            Local Only
          </div>
        )}
      </div>

      {/* New Games Notification */}
      {showNotification && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white p-4 rounded-lg shadow-lg max-w-sm">
          <div className="flex items-start gap-3">
            <Bell className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-bold mb-1">New Games Available!</h4>
              <p className="text-sm mb-3">New games have been added to the collection.</p>
              <div className="flex gap-2">
                <button
                  onClick={handleReloadGames}
                  className="bg-white text-green-500 px-3 py-1 rounded text-sm font-medium hover:bg-gray-100 transition-colors flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  Reload Now
                </button>
                <button
                  onClick={handleDismissNotification}
                  className="bg-green-600 text-white px-3 py-1 rounded text-sm font-medium hover:bg-green-700 transition-colors"
                >
                  Later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Game Player Overlay */}
      {selectedGame && (
        <div className="fixed inset-0 z-40 bg-black bg-opacity-90 flex items-center justify-center p-4">
          <div className="w-full h-full max-w-6xl max-h-full bg-white rounded-lg overflow-hidden relative">
            <div className="flex items-center justify-between p-4 bg-gray-100 border-b">
              <h2 className="text-xl font-bold text-gray-800">{selectedGame.title}</h2>
              <button
                onClick={handleBackToGames}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
              >
                Back to Games
              </button>
            </div>
            {selectedGame.url.includes('<') ? (
              <div 
                className="w-full h-full"
                style={{ height: 'calc(100% - 73px)' }}
                dangerouslySetInnerHTML={{ __html: selectedGame.url }}
              />
            ) : (
              <iframe
                src={selectedGame.url}
                className="w-full h-full border-none"
                title={selectedGame.title}
                style={{ height: 'calc(100% - 73px)' }}
                allow="fullscreen; autoplay; encrypted-media"
                allowFullScreen
              />
            )}
          </div>
        </div>
      )}

      {/* Add/Edit Game Modal */}
      {(showAddGame || editingGame) && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">
                {editingGame ? 'Edit Game' : 'Add New Game'}
              </h3>
              <button
                onClick={() => {
                  setShowAddGame(false);
                  setEditingGame(null);
                  setNewGame({
                    title: '',
                    description: '',
                    category: 'Arcade',
                    color: 'bg-blue-500',
                    url: ''
                  });
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Game Title"
                value={newGame.title}
                onChange={(e) => setNewGame({...newGame, title: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              
              <input
                type="text"
                placeholder="Description"
                value={newGame.description}
                onChange={(e) => setNewGame({...newGame, description: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              
              <select
                value={newGame.category}
                onChange={(e) => setNewGame({...newGame, category: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {categories.filter(cat => cat !== 'All').map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              
              <select
                value={newGame.color}
                onChange={(e) => setNewGame({...newGame, color: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {colors.map(color => (
                  <option key={color} value={color}>
                    {color.replace('bg-', '').replace('-500', '')}
                  </option>
                ))}
              </select>
              
              <input
                type="url"
                placeholder="Game URL"
                value={newGame.url}
                onChange={(e) => setNewGame({...newGame, url: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              
              <div className="text-sm text-gray-600">
                <p className="mb-2">URL Options:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Direct game URLs (e.g., https://example.com/game.html)</li>
                  <li>HTML embed code (will be rendered directly)</li>
                </ul>
              </div>
              
              <button
                onClick={editingGame ? handleUpdateGame : handleAddGame}
                className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                {editingGame ? 'Update Game' : 'Add Game'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Gamepad2 className="w-12 h-12 text-yellow-400" />
            <h1 className="text-5xl font-bold text-white">UnblockedHub</h1>
            {isAdminMode && (
              <div className="ml-4 px-3 py-1 bg-red-500 text-white text-sm rounded-full">
                ADMIN MODE
              </div>
            )}
          </div>
          <p className="text-xl text-gray-300 mb-6">Premium Unblocked Games Collection</p>
          <div className="text-sm text-gray-400 bg-black bg-opacity-30 inline-block px-4 py-2 rounded-full">
            Press "\" for Google Classroom • Press ESC to close games
          </div>
        </header>

        {/* Admin Controls */}
        {isAdminMode && (
          <div className="mb-8 text-center">
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => setShowAddGame(true)}
                className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Add New Game
              </button>
              <button
                onClick={handleExitAdminMode}
                className="bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2"
              >
                <X className="w-5 h-5" />
                Exit Admin Mode
              </button>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="mb-8">
          <div className="max-w-md mx-auto mb-6">
            <input
              type="text"
              placeholder="Search games..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white bg-opacity-20 text-white placeholder-gray-300 border border-white border-opacity-30 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
            />
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-6 py-3 rounded-full font-medium transition-all duration-300 ${
                  selectedCategory === category
                    ? 'bg-yellow-400 text-gray-900 shadow-lg scale-105'
                    : 'bg-white bg-opacity-20 text-white hover:bg-opacity-30'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="animate-spin w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-xl text-gray-300">Loading games...</p>
          </div>
        )}

        {/* Games Grid */}
        {!isLoading && games.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredGames.map((game) => (
              <div
                key={game.id}
                onClick={() => handleGameClick(game)}
                className="group cursor-pointer bg-white bg-opacity-10 backdrop-blur-sm rounded-2xl p-6 border border-white border-opacity-20 hover:bg-opacity-20 hover:scale-105 transition-all duration-300 hover:shadow-2xl relative"
              >
                {isAdminMode && (
                  <div className="absolute top-2 right-2 flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditGame(game);
                      }}
                      className="p-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteGame(game.id);
                      }}
                      className="p-1 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
                
                <div className={`w-12 h-12 ${game.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <Gamepad2 className="w-6 h-6 text-white" />
                </div>
                
                <h3 className="text-xl font-bold text-white mb-2">{game.title}</h3>
                <p className="text-gray-300 mb-3">{game.description}</p>
                
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 bg-white bg-opacity-20 rounded-full text-sm text-gray-200">
                    {game.category}
                  </span>
                  {!isAdminMode && (
                    <button className="text-yellow-400 hover:text-yellow-300 transition-colors">
                      Play →
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : !isLoading && (
          <div className="text-center py-12">
            <Gamepad2 className="w-24 h-24 text-gray-400 mx-auto mb-4" />
            <p className="text-2xl text-gray-300 mb-4">No games available yet</p>
            <p className="text-gray-400">Games will appear here when available</p>
          </div>
        )}

        {filteredGames.length === 0 && games.length > 0 && !isLoading && (
          <div className="text-center py-12">
            <p className="text-2xl text-gray-300">No games found matching your search.</p>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-16 text-center">
          <div className="bg-black bg-opacity-30 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-white mb-4">Controls</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-300">
              <div className="bg-white bg-opacity-10 rounded-lg p-4">
                <strong className="text-yellow-400">"\" Key:</strong> Open Google Classroom in new tab
              </div>
              <div className="bg-white bg-opacity-10 rounded-lg p-4">
                <strong className="text-yellow-400">ESC Key:</strong> Close current game/modal
              </div>
            </div>
            <p className="text-gray-400 mt-4">© 2025 UnblockedHub - Global Game Collection</p>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;