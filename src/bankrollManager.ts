import { BankrollPot, BankrollData, BankrollStats, PotType, TransactionHistory } from './bankrollTypes';
import { CloudStorage } from './cloudStorage';

export class BankrollService {
  private static readonly STORAGE_KEY = 'labouchere_bankroll';
  private bankroll: BankrollData | null = null;
  private cloudStorage: CloudStorage;

  constructor() {
    this.cloudStorage = new CloudStorage();
    this.loadBankroll().catch(error => {
      console.error('Failed to load bankroll during initialization:', error);
    });
  }

  private async loadBankroll(): Promise<void> {
    // First try to load from cloud if user is signed in
    try {
      const isSignedIn = await this.cloudStorage.isSignedIn();
      if (isSignedIn) {
        const cloudResult = await this.cloudStorage.loadBankroll();
        if (cloudResult.success && cloudResult.data) {
          this.parseBankrollData(cloudResult.data);
          return;
        }
      }
    } catch (error) {
      console.error('Failed to load bankroll from cloud:', error);
    }

    // Fallback to localStorage
    const stored = localStorage.getItem(BankrollService.STORAGE_KEY);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        this.parseBankrollData(data);
      } catch (error) {
        console.error('Failed to load bankroll:', error);
        this.bankroll = null;
      }
    }
  }

  private parseBankrollData(data: any): void {
    this.bankroll = {
      ...data,
      createdAt: new Date(data.createdAt),
      lastUpdated: new Date(data.lastUpdated),
      pots: data.pots.map((pot: any) => ({
        ...pot,
        createdAt: new Date(pot.createdAt),
        lastUpdated: new Date(pot.lastUpdated),
        history: pot.history.map((h: any) => ({
          ...h,
          timestamp: new Date(h.timestamp)
        }))
      }))
    };
  }

  private async saveBankroll(): Promise<void> {
    if (this.bankroll) {
      this.bankroll.lastUpdated = new Date();
      localStorage.setItem(BankrollService.STORAGE_KEY, JSON.stringify(this.bankroll));
      
      // Also save to cloud if user is signed in
      try {
        const isSignedIn = await this.cloudStorage.isSignedIn();
        if (isSignedIn) {
          await this.cloudStorage.saveBankroll(this.bankroll);
        }
      } catch (error) {
        console.error('Failed to save bankroll to cloud:', error);
      }
    }
  }

  createBankroll(totalAmount: number): void {
    this.bankroll = {
      totalAmount,
      pots: [],
      createdAt: new Date(),
      lastUpdated: new Date()
    };
    this.saveBankroll();
  }

  getCurrentBankroll(): BankrollData | null {
    return this.bankroll;
  }

  createEqualPots(numberOfPots: number, potNames: string[]): void {
    if (!this.bankroll) {
      throw new Error('No bankroll created');
    }

    const amountPerPot = this.bankroll.totalAmount / numberOfPots;
    const pots: BankrollPot[] = [];

    for (let i = 0; i < numberOfPots; i++) {
      const pot: BankrollPot = {
        id: this.generateId(),
        name: potNames[i] || `Gaming Pot ${i + 1}`,
        type: PotType.GAMING,
        originalAmount: amountPerPot,
        currentBalance: amountPerPot,
        isActive: true,
        createdAt: new Date(),
        lastUpdated: new Date(),
        history: [{
          id: this.generateId(),
          amount: amountPerPot,
          type: 'manual_edit',
          description: 'Initial pot creation',
          timestamp: new Date()
        }]
      };
      pots.push(pot);
    }

    // Add one savings pot
    const savingsPot: BankrollPot = {
      id: this.generateId(),
      name: 'Savings',
      type: PotType.SAVINGS,
      originalAmount: 0,
      currentBalance: 0,
      isActive: true,
      createdAt: new Date(),
      lastUpdated: new Date(),
      history: []
    };
    pots.push(savingsPot);

    this.bankroll.pots = pots;
    this.saveBankroll();
  }

  createCustomPots(potConfigs: Array<{name: string, percentage: number, type: PotType, casino?: string}>): void {
    if (!this.bankroll) {
      throw new Error('No bankroll created');
    }

    // Validate percentages
    const totalPercentage = potConfigs.reduce((sum, config) => sum + config.percentage, 0);
    if (Math.abs(totalPercentage - 100) > 0.01) {
      throw new Error('Pot percentages must total 100%');
    }

    const pots: BankrollPot[] = potConfigs.map(config => {
      const amount = (this.bankroll!.totalAmount * config.percentage) / 100;
      
      const pot: BankrollPot = {
        id: this.generateId(),
        name: config.name,
        type: config.type,
        originalAmount: amount,
        currentBalance: amount,
        casino: config.casino,
        isActive: true,
        createdAt: new Date(),
        lastUpdated: new Date(),
        history: [{
          id: this.generateId(),
          amount: amount,
          type: 'manual_edit',
          description: 'Initial pot creation',
          timestamp: new Date()
        }]
      };
      return pot;
    });

    // Ensure there's always a savings pot
    const hasSavings = pots.some(pot => pot.type === PotType.SAVINGS);
    if (!hasSavings) {
      const savingsPot: BankrollPot = {
        id: this.generateId(),
        name: 'Savings',
        type: PotType.SAVINGS,
        originalAmount: 0,
        currentBalance: 0,
        isActive: true,
        createdAt: new Date(),
        lastUpdated: new Date(),
        history: []
      };
      pots.push(savingsPot);
    }

    this.bankroll.pots = pots;
    this.saveBankroll();
  }

  getAllPots(): BankrollPot[] {
    return this.bankroll?.pots || [];
  }

  getGamingPots(): BankrollPot[] {
    return this.getAllPots().filter(pot => 
      pot.type === PotType.GAMING && pot.isActive && pot.currentBalance > 0
    );
  }

  getPotById(id: string): BankrollPot | null {
    return this.getAllPots().find(pot => pot.id === id) || null;
  }

  updatePotBalance(potId: string, newBalance: number, transactionType: TransactionHistory['type'], description?: string): boolean {
    if (!this.bankroll) return false;

    const pot = this.getPotById(potId);
    if (!pot) return false;

    const transaction: TransactionHistory = {
      id: this.generateId(),
      amount: newBalance - pot.currentBalance,
      type: transactionType,
      description: description || `Balance updated to $${newBalance.toFixed(2)}`,
      timestamp: new Date()
    };

    pot.currentBalance = newBalance;
    pot.lastUpdated = new Date();
    pot.history.push(transaction);

    this.saveBankroll();
    return true;
  }

  transferMoney(fromPotId: string, toPotId: string, amount: number, description?: string): boolean {
    if (!this.bankroll) return false;

    const fromPot = this.getPotById(fromPotId);
    const toPot = this.getPotById(toPotId);

    if (!fromPot || !toPot || fromPot.currentBalance < amount) {
      return false;
    }

    // Record outgoing transaction
    const outTransaction: TransactionHistory = {
      id: this.generateId(),
      amount: -amount,
      type: 'transfer_out',
      description: description || `Transfer to ${toPot.name}`,
      timestamp: new Date(),
      relatedPotId: toPotId
    };

    // Record incoming transaction
    const inTransaction: TransactionHistory = {
      id: this.generateId(),
      amount: amount,
      type: 'transfer_in',
      description: description || `Transfer from ${fromPot.name}`,
      timestamp: new Date(),
      relatedPotId: fromPotId
    };

    // Update balances
    fromPot.currentBalance -= amount;
    fromPot.lastUpdated = new Date();
    fromPot.history.push(outTransaction);

    toPot.currentBalance += amount;
    toPot.lastUpdated = new Date();
    toPot.history.push(inTransaction);

    this.saveBankroll();
    return true;
  }

  resetPot(potId: string): boolean {
    if (!this.bankroll) return false;

    const pot = this.getPotById(potId);
    if (!pot) return false;

    const transaction: TransactionHistory = {
      id: this.generateId(),
      amount: pot.originalAmount - pot.currentBalance,
      type: 'reset',
      description: `Pot reset to original amount`,
      timestamp: new Date()
    };

    pot.currentBalance = pot.originalAmount;
    pot.lastUpdated = new Date();
    pot.history.push(transaction);

    this.saveBankroll();
    return true;
  }

  deletePot(potId: string): boolean {
    if (!this.bankroll) return false;

    const potIndex = this.bankroll.pots.findIndex(pot => pot.id === potId);
    if (potIndex === -1) return false;

    // Don't allow deleting savings pots
    const pot = this.bankroll.pots[potIndex];
    if (pot.type === PotType.SAVINGS) return false;

    // Transfer remaining balance to savings pot if exists
    if (pot.currentBalance > 0) {
      const savingsPot = this.bankroll.pots.find(p => p.type === PotType.SAVINGS);
      if (savingsPot) {
        this.transferMoney(potId, savingsPot.id, pot.currentBalance, 'Pot deletion - funds moved to savings');
      }
    }

    this.bankroll.pots.splice(potIndex, 1);
    this.saveBankroll();
    return true;
  }

  getStats(): BankrollStats {
    const pots = this.getAllPots();
    
    const totalAllocated = pots.reduce((sum, pot) => sum + pot.currentBalance, 0);
    const totalSavings = pots
      .filter(pot => pot.type === PotType.SAVINGS)
      .reduce((sum, pot) => sum + pot.currentBalance, 0);
    
    const netProfitLoss = pots.reduce((sum, pot) => {
      return sum + (pot.currentBalance - pot.originalAmount);
    }, 0);

    const potsAtRisk = pots.filter(pot => 
      pot.type !== PotType.SAVINGS && 
      pot.currentBalance < (pot.originalAmount * 0.2)
    ).length;

    return {
      totalAllocated,
      totalSavings,
      netProfitLoss,
      potsAtRisk,
      totalPots: pots.length
    };
  }

  clearBankroll(): void {
    this.bankroll = null;
    localStorage.removeItem(BankrollService.STORAGE_KEY);
  }

  exportData(): string {
    if (!this.bankroll) {
      throw new Error('No bankroll data to export');
    }
    return JSON.stringify(this.bankroll, null, 2);
  }

  importData(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      
      // Basic validation
      if (!data.totalAmount || !Array.isArray(data.pots)) {
        return false;
      }

      this.bankroll = {
        ...data,
        createdAt: new Date(data.createdAt),
        lastUpdated: new Date(),
        pots: data.pots.map((pot: any) => ({
          ...pot,
          createdAt: new Date(pot.createdAt),
          lastUpdated: new Date(pot.lastUpdated),
          history: pot.history.map((h: any) => ({
            ...h,
            timestamp: new Date(h.timestamp)
          }))
        }))
      };

      this.saveBankroll();
      return true;
    } catch (error) {
      console.error('Failed to import bankroll data:', error);
      return false;
    }
  }

  updatePotName(potId: string, newName: string): boolean {
    if (!this.bankroll) return false;
    const pot = this.getPotById(potId);
    if (!pot) return false;

    pot.name = newName;
    pot.lastUpdated = new Date();
    this.bankroll.lastUpdated = new Date();
    this.saveBankroll();
    return true;
  }

  updatePotCasino(potId: string, casino: string): boolean {
    if (!this.bankroll) return false;
    const pot = this.getPotById(potId);
    if (!pot) return false;

    pot.casino = casino || undefined;
    pot.lastUpdated = new Date();
    this.bankroll.lastUpdated = new Date();
    this.saveBankroll();
    return true;
  }

  deleteBankroll(): boolean {
    if (!this.bankroll) return false;
    
    localStorage.removeItem(BankrollService.STORAGE_KEY);
    this.bankroll = null;
    return true;
  }

  getPotsForCasino(casino: string): BankrollPot[] {
    if (!this.bankroll) return [];
    return this.bankroll.pots.filter(pot => pot.casino === casino && pot.isActive);
  }

  getReservePots(): BankrollPot[] {
    if (!this.bankroll) return [];
    return this.bankroll.pots.filter(pot => !pot.casino && pot.isActive);
  }

  addGamingPot(name: string, casino?: string): string {
    if (!this.bankroll) throw new Error('No bankroll created');
    
    const pot: BankrollPot = {
      id: this.generateId(),
      name: name,
      type: PotType.GAMING,
      originalAmount: 0,
      currentBalance: 0,
      casino: casino,
      isActive: true,
      createdAt: new Date(),
      lastUpdated: new Date(),
      history: []
    };
    
    this.bankroll.pots.push(pot);
    this.saveBankroll();
    return pot.id;
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}