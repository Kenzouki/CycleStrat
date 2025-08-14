export enum PotType {
  GAMING = 'gaming',
  SAVINGS = 'savings',
  EMERGENCY = 'emergency',
  INVESTMENT = 'investment',
  ENTERTAINMENT = 'entertainment'
}

export enum CasinoType {
  ONLINE_CASINO = 'online_casino',
  LIVE_CASINO = 'live_casino',
  SPORTS_BETTING = 'sports_betting',
  POKER = 'poker',
  CRYPTO_CASINO = 'crypto_casino',
  TRADITIONAL_CASINO = 'traditional_casino'
}

export interface BankrollPot {
  id: string;
  name: string;
  type: PotType;
  originalAmount: number;
  currentBalance: number;
  casino?: string; // Changed to string for specific casino names
  isActive: boolean;
  createdAt: Date;
  lastUpdated: Date;
  history: TransactionHistory[];
}

export interface TransactionHistory {
  id: string;
  amount: number;
  type: 'win' | 'loss' | 'transfer_in' | 'transfer_out' | 'manual_edit' | 'reset';
  description?: string;
  timestamp: Date;
  relatedPotId?: string; // For transfers
}

export interface BankrollStats {
  totalAllocated: number;
  totalSavings: number;
  netProfitLoss: number;
  potsAtRisk: number;
  totalPots: number;
}

export interface BankrollData {
  totalAmount: number;
  pots: BankrollPot[];
  createdAt: Date;
  lastUpdated: Date;
}

export const POT_TYPE_OPTIONS = [
  { value: PotType.GAMING, label: 'Gaming', icon: '🎰' },
  { value: PotType.SAVINGS, label: 'Savings', icon: '💰' },
  { value: PotType.EMERGENCY, label: 'Emergency', icon: '🚨' },
  { value: PotType.INVESTMENT, label: 'Investment', icon: '📈' },
  { value: PotType.ENTERTAINMENT, label: 'Entertainment', icon: '🎉' }
];

export const CASINO_OPTIONS = [
  { value: '', label: 'Reserve Pot (No Casino)', icon: '💰', isReserve: true },
  { value: 'rollbit', label: 'Rollbit', icon: '🎲', url: 'https://rollbit.com/', logo: 'https://rollbit.com/static/images/logos/rollbit-logo-white.png' },
  { value: 'bc-game', label: 'BC.Game', icon: '🎮', url: 'https://bc.game/', logo: 'https://bc.game/assets/images/bc-logo.png' },
  { value: 'shuffle', label: 'Shuffle', icon: '🔀', url: 'https://shuffle.com/', logo: 'https://shuffle.com/assets/images/shuffle-logo.png' },
  { value: 'betpanda', label: 'BetPanda', icon: '🐼', url: 'https://betpanda.io/en/', logo: 'https://betpanda.io/assets/images/betpanda-logo.png' },
  { value: 'duelbits', label: 'DuelBits', icon: '⚔️', url: 'https://duelbits.com/en', logo: 'https://duelbits.com/assets/images/duelbits-logo.png' },
  { value: 'rainbet', label: 'Rainbet', icon: '🌧️', url: 'https://rainbet.com/', logo: 'https://rainbet.com/assets/images/rainbet-logo.png' },
  { value: 'other', label: 'Other Casino', icon: '🏛️', isCustom: true }
];