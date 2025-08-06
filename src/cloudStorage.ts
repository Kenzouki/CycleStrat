import { supabase, SessionRecord, SessionFile } from './supabase';

export class CloudStorage {
  private currentUser: any = null;

  async signUp(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      this.currentUser = data.user;
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  }

  async signIn(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      this.currentUser = data.user;
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  }

  async signOut(): Promise<void> {
    await supabase.auth.signOut();
    this.currentUser = null;
  }

  async getCurrentUser(): Promise<any> {
    if (this.currentUser) return this.currentUser;
    
    const { data: { user } } = await supabase.auth.getUser();
    this.currentUser = user;
    return user;
  }

  async isSignedIn(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return !!user;
  }

  async saveSession(sessionName: string, sessionData: SessionFile): Promise<{ success: boolean; error?: string }> {
    try {
      const user = await this.getCurrentUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      const { error } = await supabase
        .from('sessions')
        .upsert({
          id: sessionName,
          user_id: user.id,
          name: sessionName,
          data: sessionData,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  }

  async loadSession(sessionName: string): Promise<{ success: boolean; data?: SessionFile; error?: string }> {
    try {
      const user = await this.getCurrentUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      const { data, error } = await supabase
        .from('sessions')
        .select('data')
        .eq('id', sessionName)
        .eq('user_id', user.id)
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: data.data };
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  }

  async getAllSessions(): Promise<{ success: boolean; sessions?: string[]; error?: string }> {
    try {
      const user = await this.getCurrentUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      const { data, error } = await supabase
        .from('sessions')
        .select('name')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) {
        return { success: false, error: error.message };
      }

      const sessions = data.map(session => session.name);
      return { success: true, sessions };
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  }

  async deleteSession(sessionName: string): Promise<{ success: boolean; error?: string }> {
    try {
      const user = await this.getCurrentUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', sessionName)
        .eq('user_id', user.id);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  }

  async syncWithLocal(): Promise<{ success: boolean; error?: string }> {
    try {
      const user = await this.getCurrentUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      // Get local sessions
      const localSessions: { [key: string]: SessionFile } = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('labouchere_session_')) {
          const sessionName = key.replace('labouchere_session_', '');
          const sessionData = JSON.parse(localStorage.getItem(key) || '{}');
          localSessions[sessionName] = sessionData;
        }
      }

      // Upload local sessions to cloud
      for (const [sessionName, sessionData] of Object.entries(localSessions)) {
        await this.saveSession(sessionName, sessionData);
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Sync failed' };
    }
  }

  async saveBankroll(bankrollData: any): Promise<{ success: boolean; error?: string }> {
    try {
      const user = await this.getCurrentUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      const { error } = await supabase
        .from('bankrolls')
        .upsert({
          id: 'user_bankroll',
          user_id: user.id,
          data: bankrollData,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  }

  async loadBankroll(): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const user = await this.getCurrentUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      const { data, error } = await supabase
        .from('bankrolls')
        .select('data')
        .eq('id', 'user_bankroll')
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return { success: true, data: null }; // No bankroll found
        }
        return { success: false, error: error.message };
      }

      return { success: true, data: data?.data };
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  }

  async deleteBankroll(): Promise<{ success: boolean; error?: string }> {
    try {
      const user = await this.getCurrentUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      const { error } = await supabase
        .from('bankrolls')
        .delete()
        .eq('id', 'user_bankroll')
        .eq('user_id', user.id);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  }
}