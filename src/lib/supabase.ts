import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Game {
  id: string;
  title: string;
  description: string;
  category: string;
  color: string;
  url: string;
  created_at: string;
  updated_at: string;
}

// Game management functions
export const gameService = {
  // Get all games
  async getGames(): Promise<Game[]> {
    const { data, error } = await supabase
      .from('games')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching games:', error);
      return [];
    }
    
    return data || [];
  },

  // Add a new game
  async addGame(game: Omit<Game, 'id' | 'created_at' | 'updated_at'>): Promise<Game | null> {
    const { data, error } = await supabase
      .from('games')
      .insert([game])
      .select()
      .single();
    
    if (error) {
      console.error('Error adding game:', error);
      return null;
    }
    
    return data;
  },

  // Update a game
  async updateGame(id: string, updates: Partial<Omit<Game, 'id' | 'created_at' | 'updated_at'>>): Promise<Game | null> {
    const { data, error } = await supabase
      .from('games')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating game:', error);
      return null;
    }
    
    return data;
  },

  // Delete a game
  async deleteGame(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('games')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting game:', error);
      return false;
    }
    
    return true;
  },

  // Subscribe to real-time changes
  subscribeToChanges(callback: (games: Game[]) => void) {
    const channel = supabase
      .channel('games-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'games' },
        async () => {
          // Fetch updated games list
          const games = await this.getGames();
          callback(games);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
};