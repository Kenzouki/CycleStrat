import { createClient } from '@supabase/supabase-js';

// You need to replace these with your actual Supabase project values
// Get them from: https://app.supabase.com/project/_/settings/api
const SUPABASE_URL = 'https://gfnqavlaibkhulcoutur.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmbnFhdmxhaWJraHVsY291dHVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzMjYyNDksImV4cCI6MjA2OTkwMjI0OX0.wh4nlVbl25xvtKueg8Cdf3fEnTedYS-R8_8tnlSZolw';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Database types for TypeScript
export interface SessionRecord {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
  data: SessionFile;
}

export interface SessionFile {
  metadata: SessionMetadata;
  data: SessionData;
  history: HistoryEntry[];
}

export interface SessionMetadata {
  name: string;
  created: string;
  totalSessions: number;
  totalProfit: number;
  totalBets: number;
  winRate: number;
  largestWin: number;
  largestLoss: number;
  averageBetSize: number;
  longestWinStreak: number;
  longestLossStreak: number;
  lastPlayed: string;
}

export interface SessionData {
  balance: number;
  profit: number;
  startingBalance: number;
  targetProfit: number;
  stopLoss: number;
  minimumBet: number;
  payoutRatio: number;
  currentCycle: number;
  totalCycles: number;
  currentSequences: number[][];
  isActive: boolean;
  isPaused: boolean;
  startTime: number;
  elapsedTime: number;
  pausedTime: number;
}

export interface HistoryEntry {
  cycle: number;
  bet: number;
  outcome: 'win' | 'loss';
  balance: number;
  profit: number;
  timestamp: number;
  sequencesBefore: number[][];
  sequencesAfter: number[][];
  payout?: number;
}