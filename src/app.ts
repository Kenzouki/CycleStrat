import './styles.css';
import { AuthManager } from './authManager';
import { CASINO_OPTIONS } from './bankrollTypes';
import './bankrollUI';

// Interfaces
interface SessionMetadata {
  sessionName: string;
  casinoName: string;
  gameType: string;
  startingBankroll: number;
  profitGoal: number;
  stopLoss: number;
  minimumBet: number;
  numberOfCycles: number;
  sequenceValue: number;
  riskRewardMultiplier: number;
  evenMoney: boolean;
  useProfitGoalPercentage: boolean;
  useStopLossPercentage: boolean;
  profitGoalPercentage: number;
  stopLossPercentage: number;
  sessionStartTime: Date;
  sessionDuration: number;
  totalAmountWagered: number;
  totalWins: number;
  selectedPotId?: string; // For bankroll manager integration
  totalBets: number;
  isSessionPaused: boolean;
  isManuallyEnded: boolean;
}

interface SessionData {
  balance: number;
  totalProfit: number;
  currentCycle: number;
  cycleProfit: number;
  sequence: number[];
  allCycleSequences: number[][];
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  currentStreak: number;
}

interface HistoryEntry {
  betNumber: number;
  outcome: 'Win' | 'Loss';
  desiredProfit: number;
  betSize: number;
  balance: number;
  sequenceAfter: string;
  timestamp: Date;
}

interface SessionFile {
  metadata: SessionMetadata;
  data: SessionData;
  history: HistoryEntry[];
}

// Main Application Class
class LabouchereApp {
  // Session state
  private currentSession: SessionFile | null = null;
  private isSessionActive = false;
  private sessionTimer: number | null = null;
  private sessionNameTimer: number | null = null;
  private sessionStartTime: Date | null = null;
  private sessionDuration = 0;
  private isSessionPaused = false;

  // Authentication manager
  private authManager: AuthManager;

  // DOM elements
  private elements: { [key: string]: HTMLElement } = {};
  
  // Chart instance and stats tracking
  private profitChart: any = null;
  private consecutiveWins = 0;
  private consecutiveLosses = 0;
  private maxConsecutiveWins = 0;
  private maxConsecutiveLosses = 0;
  private currentStreak = 0; // positive for wins, negative for losses

  // Analytics properties
  private equityCurveChart: any = null;
  private sessionDetailChart: any = null;
  private currentAnalyticsView: 'dashboard' | 'calendar' = 'dashboard';
  private currentCalendarMonth = new Date();
  private filteredSessions: SessionFile[] = [];

  constructor() {
    this.authManager = new AuthManager();
    
    // Set up callback to refresh sessions and bankroll when auth state changes
    this.authManager.setAuthChangeCallback(async () => {
      await this.loadSavedSessions();
      // Also refresh bankroll data for cloud persistence
      if ((window as any).bankrollUI && typeof (window as any).bankrollUI.refreshBankroll === 'function') {
        await (window as any).bankrollUI.refreshBankroll();
      }
    });
    
    // Make CASINO_OPTIONS globally available
    (window as any).CASINO_OPTIONS = CASINO_OPTIONS;
    
    this.initializeApp();
  }

  private async initializeApp(): Promise<void> {
    this.cacheElements();
    this.loadThemePreference();
    this.attachEventListeners();
    await this.loadSavedSessions();
    this.generateSessionName();
    this.updateBetTypeInfo();
    this.populatePotSelection();
    this.startSessionNameTimer();
    this.showToast('Application initialized successfully', 'success');
  }

  private cacheElements(): void {
    const elementIds = [
      'sessionName', 'casinoName', 'gameType', 'savedSessions', 'selectedPot',
      'newSession', 'loadSession', 'deleteSession',
      'startingBankroll', 'profitGoal', 'stopLoss', 'profitPercentage',
      'stopLossPercentage', 'useProfitPercentage', 'useStopLossPercentage',
      'minimumBet', 'numberOfCycles', 'evenMoney', 'riskRewardMultiplier',
      'startSession', 'pauseSession', 'saveSession', 'exportStats',
      'sessionControlsHeader', 'sessionDurationHeader', 'pauseSessionHeader', 'saveSessionHeader', 'exportStatsHeader',
      'mainPanelsGrid',
      'currentBalance', 'cycleProfit', 'currentCycle', 'totalProfit',
      'totalWagered', 'riskRemaining', 'sessionDuration',
      'nextBetSize', 'desiredProfit', 'betWin', 'betLoss', 'splitEntry',
      'copyToClipboard', 'autoSave', 'riskWarning', 'riskWarningText',
      'statusPanel', 'bettingPanel', 'sequencePanel', 'historyPanel', 'liveStatsPanel',
      'liveProfit', 'liveWins', 'liveWagered', 'liveLosses', 'liveWinRate', 
      'currentStreak', 'maxWins', 'maxLosses', 'refreshStats', 'collapseLiveStats', 'themeToggle',
      'sequenceContainer', 'historyBody', 'clearHistory', 'undoLastBet',
      'sortCurrentCycle', 'autoSort', 'collapseSetup', 'setupContent', 'betTypeInfo',
      'modalOverlay', 'modalTitle', 'modalMessage', 'modalConfirm', 'modalCancel', 'modalClose',
      'toastContainer', 'openSettings', 'settingsOverlay', 'settingsClose', 'settingsCancel',
      'saveSettings', 'cloudStatus', 'authBtn', 'authOverlay', 'authClose', 'signinForm',
      'signupForm', 'signinEmail', 'signinPassword', 'signinBtn', 'signupEmail', 'signupPassword',
      'confirmPassword', 'signupBtn', 'signinError', 'signupError', 'localSessionCount', 'localStorageSize',
      'exportAllLocal', 'clearAllLocal', 'setupGuideLink', 'setupGuideOverlay',
      'setupGuideClose', 'setupGuideOk', 'balanceUpdateOverlay', 'balanceUpdateClose', 
      'appCurrentBalance', 'actualBalance', 'balanceDifference', 'skipBalanceUpdate', 'confirmBalanceUpdate',
      'reshuffleCycles', 'reshuffleOverlay', 'reshuffleClose', 'remainingSum', 'newCycleCount',
      'cyclePreview', 'valuePerCycle', 'cycleValuePreview', 'reshuffleCancel', 'reshuffleConfirm',
      'analyticsBtn', 'analyticsPanel', 'closeAnalytics', 'dashboardViewBtn', 'calendarViewBtn',
      'dashboardView', 'calendarView', 'dateRangeFilter', 'customDateInputs', 'startDate', 'endDate',
      'gameFilter', 'casinoFilter', 'applyFilters', 'resetFilters', 'equityCurveChart',
      'prevMonth', 'nextMonth', 'currentMonth', 'calendarDays', 'monthlyTitle', 'monthlyProfit',
      'monthlySessions', 'monthlyAvgPerDay', 'sessionDetailOverlay', 'sessionDetailClose',
      'sessionDetailTitle', 'sessionDetailChart', 'sessionDetailCancel',
      'sessionSelectionOverlay', 'sessionSelectionClose', 'sessionSelectionCancel', 'sessionList'
    ];

    elementIds.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        this.elements[id] = element;
      }
    });
  }

  private attachEventListeners(): void {
    // Session management
    this.elements.newSession?.addEventListener('click', () => this.createNewSession());
    this.elements.loadSession?.addEventListener('click', () => this.loadSession());
    this.elements.deleteSession?.addEventListener('click', () => this.deleteSession());
    this.elements.savedSessions?.addEventListener('change', () => this.onSessionSelectionChange());
    this.elements.selectedPot?.addEventListener('change', () => this.handlePotSelection());

    // Configuration
    this.elements.useProfitPercentage?.addEventListener('change', () => this.toggleProfitPercentage());
    this.elements.useStopLossPercentage?.addEventListener('change', () => this.toggleStopLossPercentage());
    this.elements.evenMoney?.addEventListener('change', () => this.toggleEvenMoney());
    this.elements.riskRewardMultiplier?.addEventListener('input', () => this.updateBetTypeInfo());
    this.elements.casinoName?.addEventListener('blur', () => this.generateSessionName());
    this.elements.gameType?.addEventListener('change', () => this.generateSessionName());

    // Session control
    this.elements.startSession?.addEventListener('click', () => this.startSession());
    this.elements.pauseSession?.addEventListener('click', () => this.togglePauseResume());
    this.elements.saveSession?.addEventListener('click', () => this.saveSession());
    this.elements.exportStats?.addEventListener('click', () => this.exportStatistics());
    
    // Header session controls
    this.elements.pauseSessionHeader?.addEventListener('click', () => this.togglePauseResume());
    this.elements.saveSessionHeader?.addEventListener('click', () => this.saveSession());
    this.elements.exportStatsHeader?.addEventListener('click', () => this.exportStatistics());

    // Betting actions
    this.elements.betWin?.addEventListener('click', () => this.processBet(true));
    this.elements.betLoss?.addEventListener('click', () => this.processBet(false));
    this.elements.splitEntry?.addEventListener('click', () => this.splitLastEntry());

    // History actions
    this.elements.clearHistory?.addEventListener('click', () => this.clearHistory());
    this.elements.undoLastBet?.addEventListener('click', () => this.undoLastBet());

    // Sequence actions
    this.elements.sortCurrentCycle?.addEventListener('click', () => this.sortCurrentCycle());
    this.elements.reshuffleCycles?.addEventListener('click', () => this.showReshuffleModal());

    // UI toggles
    this.elements.collapseSetup?.addEventListener('click', () => this.toggleSetupPanel());
    this.elements.collapseLiveStats?.addEventListener('click', () => this.toggleLiveStatsPanel());
    this.elements.refreshStats?.addEventListener('click', () => this.updateLiveStats());
    this.elements.themeToggle?.addEventListener('click', () => this.toggleTheme());

    // Modal handlers
    this.elements.modalClose?.addEventListener('click', () => this.hideModal());
    this.elements.modalCancel?.addEventListener('click', () => this.hideModal());
    this.elements.modalOverlay?.addEventListener('click', (e) => {
      if (e.target === this.elements.modalOverlay) this.hideModal();
    });

    // Settings handlers
    this.elements.openSettings?.addEventListener('click', () => this.openSettings());
    this.elements.settingsClose?.addEventListener('click', () => this.closeSettings());
    this.elements.settingsCancel?.addEventListener('click', () => this.closeSettings());
    this.elements.saveSettings?.addEventListener('click', () => this.saveSettings());
    this.elements.settingsOverlay?.addEventListener('click', (e) => {
      if (e.target === this.elements.settingsOverlay) this.closeSettings();
    });


    // Local storage handlers
    this.elements.exportAllLocal?.addEventListener('click', () => this.exportAllLocalSessions());
    this.elements.clearAllLocal?.addEventListener('click', () => this.clearAllLocalSessions());

    // Setup guide handlers
    this.elements.setupGuideLink?.addEventListener('click', (e) => {
      e.preventDefault();
      this.showSetupGuide();
    });
    this.elements.setupGuideClose?.addEventListener('click', () => this.closeSetupGuide());
    this.elements.setupGuideOk?.addEventListener('click', () => this.closeSetupGuide());
    this.elements.setupGuideOverlay?.addEventListener('click', (e) => {
      if (e.target === this.elements.setupGuideOverlay) this.closeSetupGuide();
    });

    // Balance update handlers
    this.elements.balanceUpdateClose?.addEventListener('click', () => this.closeBalanceUpdate());
    this.elements.skipBalanceUpdate?.addEventListener('click', () => this.closeBalanceUpdate());
    this.elements.confirmBalanceUpdate?.addEventListener('click', () => this.confirmBalanceUpdate());
    this.elements.actualBalance?.addEventListener('input', () => this.updateBalanceDifference());
    this.elements.balanceUpdateOverlay?.addEventListener('click', (e) => {
      if (e.target === this.elements.balanceUpdateOverlay) this.closeBalanceUpdate();
    });

    // Reshuffle handlers
    this.elements.reshuffleClose?.addEventListener('click', () => this.closeReshuffleModal());
    this.elements.reshuffleCancel?.addEventListener('click', () => this.closeReshuffleModal());
    this.elements.reshuffleConfirm?.addEventListener('click', () => this.confirmReshuffle());
    this.elements.newCycleCount?.addEventListener('input', () => this.updateReshufflePreview());
    this.elements.reshuffleOverlay?.addEventListener('click', (e) => {
      if (e.target === this.elements.reshuffleOverlay) this.closeReshuffleModal();
    });

    // Analytics handlers
    this.elements.analyticsBtn?.addEventListener('click', async () => await this.showAnalytics());
    this.elements.closeAnalytics?.addEventListener('click', () => this.closeAnalytics());
    this.elements.dashboardViewBtn?.addEventListener('click', () => this.switchAnalyticsView('dashboard'));
    this.elements.calendarViewBtn?.addEventListener('click', () => this.switchAnalyticsView('calendar'));
    this.elements.dateRangeFilter?.addEventListener('change', () => this.handleDateRangeChange());
    this.elements.applyFilters?.addEventListener('click', async () => await this.applyAnalyticsFilters());
    this.elements.resetFilters?.addEventListener('click', async () => await this.resetAnalyticsFilters());
    this.elements.prevMonth?.addEventListener('click', () => this.navigateMonth(-1));
    this.elements.nextMonth?.addEventListener('click', () => this.navigateMonth(1));
    
    // Session detail modal handlers
    this.elements.sessionDetailClose?.addEventListener('click', () => this.closeSessionDetail());
    this.elements.sessionDetailCancel?.addEventListener('click', () => this.closeSessionDetail());
    this.elements.sessionDetailOverlay?.addEventListener('click', (e) => {
      if (e.target === this.elements.sessionDetailOverlay) this.closeSessionDetail();
    });

    // Session selection modal handlers
    this.elements.sessionSelectionClose?.addEventListener('click', () => this.closeSessionSelection());
    this.elements.sessionSelectionCancel?.addEventListener('click', () => this.closeSessionSelection());
    this.elements.sessionSelectionOverlay?.addEventListener('click', (e) => {
      if (e.target === this.elements.sessionSelectionOverlay) this.closeSessionSelection();
    });
  }

  // Session Management Methods
  private generateSessionName(): void {
    const now = new Date();
    
    // Format date in local timezone: YYYY-MM-DD_HH-MM
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const timestamp = `${year}-${month}-${day}_${hours}-${minutes}`;
    
    // Get casino and game info
    const casinoInput = this.elements.casinoName as HTMLInputElement;
    const gameSelect = this.elements.gameType as HTMLSelectElement;
    const sessionInput = this.elements.sessionName as HTMLInputElement;
    
    if (sessionInput) {
      let sessionName = `Session_${timestamp}`;
      
      // Add casino name if available
      const casino = casinoInput?.value.trim();
      if (casino) {
        // Clean casino name for filename (remove special characters)
        const cleanCasino = casino.replace(/[^a-zA-Z0-9]/g, '');
        sessionName += `_${cleanCasino}`;
      }
      
      // Add game type if not default
      const gameType = gameSelect?.value;
      if (gameType && gameType !== 'roulette') {
        const cleanGame = gameType.charAt(0).toUpperCase() + gameType.slice(1);
        sessionName += `_${cleanGame}`;
      }
      
      sessionInput.value = sessionName;
    }
  }

  private createNewSession(): void {
    const sessionName = (this.elements.sessionName as HTMLInputElement).value.trim();
    const casinoName = (this.elements.casinoName as HTMLInputElement).value.trim();

    if (!sessionName) {
      this.showToast('Please enter a session name', 'error');
      return;
    }

    // Check if session already exists
    const existingSessions = this.getSavedSessions();
    if (existingSessions.includes(sessionName)) {
      this.showConfirmModal(
        'Session Exists',
        `Session "${sessionName}" already exists. Do you want to overwrite it?`,
        () => {
          this.initializeNewSession(sessionName, casinoName);
        }
      );
      return;
    }

    this.initializeNewSession(sessionName, casinoName);
  }

  private initializeNewSession(sessionName: string, casinoName: string): void {
    const gameType = (this.elements.gameType as HTMLSelectElement).value;
    
    // Reset streak tracking for new session
    this.consecutiveWins = 0;
    this.consecutiveLosses = 0;
    this.maxConsecutiveWins = 0;
    this.maxConsecutiveLosses = 0;
    this.currentStreak = 0;
    
    this.currentSession = {
      metadata: {
        sessionName,
        casinoName,
        gameType,
        startingBankroll: 0,
        profitGoal: 0,
        stopLoss: 0,
        minimumBet: 0,
        numberOfCycles: 0,
        sequenceValue: 0,
        riskRewardMultiplier: 1.0,
        evenMoney: true,
        useProfitGoalPercentage: false,
        useStopLossPercentage: false,
        profitGoalPercentage: 10,
        stopLossPercentage: 5,
        sessionStartTime: new Date(),
        sessionDuration: 0,
        totalAmountWagered: 0,
        totalWins: 0,
        totalBets: 0,
        isSessionPaused: false,
        isManuallyEnded: false,
        selectedPotId: (this.elements.selectedPot as HTMLSelectElement).value || undefined
      },
      data: {
        balance: 0,
        totalProfit: 0,
        currentCycle: 1,
        cycleProfit: 0,
        sequence: [],
        allCycleSequences: [],
        maxConsecutiveWins: 0,
        maxConsecutiveLosses: 0,
        currentStreak: 0
      },
      history: []
    };

    this.showToast(`New session "${sessionName}" created`, 'success');
  }

  private async loadSession(): Promise<void> {
    const selectedSession = (this.elements.savedSessions as HTMLSelectElement).value;
    if (!selectedSession) {
      this.showToast('Please select a session to load', 'error');
      return;
    }

    try {
      let sessionData: any = null;
      
      // Try to load from cloud first if signed in
      const cloudStorage = await this.authManager.getCloudStorage();
      const isSignedIn = await cloudStorage.isSignedIn();
      
      if (isSignedIn) {
        const cloudResult = await cloudStorage.loadSession(selectedSession);
        if (cloudResult.success && cloudResult.data) {
          sessionData = cloudResult.data;
        }
      }
      
      // Fallback to localStorage if cloud failed or user not signed in
      if (!sessionData) {
        const localData = localStorage.getItem(`labouchere_session_${selectedSession}`);
        if (localData) {
          sessionData = JSON.parse(localData);
        }
      }
      
      if (!sessionData) {
        this.showToast('Session data not found', 'error');
        return;
      }

      // Prevent loading completed sessions as this would incorrectly start timer and affect stats
      if (this.isSessionCompleted(sessionData)) {
        this.showToast('Cannot load completed session. This would affect statistics and timer accuracy.', 'error');
        return;
      }

      this.currentSession = sessionData;
      if (this.currentSession) {
        // Convert date strings back to Date objects
        this.currentSession.metadata.sessionStartTime = new Date(this.currentSession.metadata.sessionStartTime);
        this.currentSession.history.forEach(entry => {
          entry.timestamp = new Date(entry.timestamp);
        });

        this.populateUIFromSession();
        this.showToast(`Session "${selectedSession}" loaded successfully`, 'success');
      }
    } catch (error) {
      this.showToast('Error loading session', 'error');
      console.error('Load session error:', error);
    }
  }

  private deleteSession(): void {
    const selectedSession = (this.elements.savedSessions as HTMLSelectElement).value;
    
    if (!selectedSession) {
      this.showToast('Please select a session to delete', 'error');
      return;
    }

    this.showConfirmModal(
      'Delete Session',
      `Are you sure you want to delete session "${selectedSession}"? This action cannot be undone.`,
      async () => {
        // Delete from local storage
        localStorage.removeItem(`labouchere_session_${selectedSession}`);
        
        // Delete from cloud storage if connected
        try {
          const cloudStorage = await this.authManager.getCloudStorage();
          await cloudStorage.deleteSession(selectedSession);
        } catch (error) {
          // Cloud deletion failed or not connected - local deletion still succeeded
        }
        
        await this.loadSavedSessions();
        this.showToast(`Session "${selectedSession}" deleted`, 'success');
      }
    );
  }

  private async saveSession(): Promise<void> {
    if (!this.currentSession) {
      this.showToast('No active session to save', 'error');
      return;
    }

    try {
      // Update session duration
      this.currentSession.metadata.sessionDuration = this.sessionDuration;
      
      const sessionKey = `labouchere_session_${this.currentSession.metadata.sessionName}`;
      
      // Save to localStorage first (backup)
      localStorage.setItem(sessionKey, JSON.stringify(this.currentSession));
      
      // Save to cloud if user is signed in
      const cloudStorage = await this.authManager.getCloudStorage();
      const isSignedIn = await cloudStorage.isSignedIn();
      
      if (isSignedIn) {
        const result = await cloudStorage.saveSession(
          this.currentSession.metadata.sessionName, 
          this.currentSession as any
        );
        
        if (result.success) {
          this.showToast('Session saved to cloud successfully', 'success');
        } else {
          this.showToast('Session saved locally (cloud sync failed)', 'warning');
        }
      } else {
        this.showToast('Session saved locally', 'success');
      }
      
      await this.loadSavedSessions();
    } catch (error) {
      this.showToast('Error saving session', 'error');
      console.error('Save session error:', error);
    }
  }

  private getSavedSessions(): string[] {
    const sessions: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('labouchere_session_')) {
        sessions.push(key.replace('labouchere_session_', ''));
      }
    }
    return sessions.sort();
  }

  private async getCloudSessions(): Promise<string[]> {
    try {
      const cloudStorage = await this.authManager.getCloudStorage();
      const isSignedIn = await cloudStorage.isSignedIn();
      
      if (isSignedIn) {
        const result = await cloudStorage.getAllSessions();
        if (result.success && result.sessions) {
          return result.sessions;
        }
      }
    } catch (error) {
      console.error('Error getting cloud sessions:', error);
    }
    return [];
  }

  private async loadSavedSessions(): Promise<void> {
    const select = this.elements.savedSessions as HTMLSelectElement;
    if (!select) return;

    // Store current selection
    const currentValue = select.value;

    // Clear existing options except the first one
    select.innerHTML = '<option value="">Select a saved session...</option>';

    // Get local sessions
    const localSessions = this.getSavedSessions();
    
    // Get cloud sessions
    const cloudSessions = await this.getCloudSessions();
    
    // Combine and deduplicate
    const allSessions = [...new Set([...localSessions, ...cloudSessions])].sort();
    
    // Process sessions asynchronously to prioritize cloud data
    for (const sessionName of allSessions) {
      try {
        let session: SessionFile | null = null;
        
        // Try to load from cloud first (single source of truth for completion status)
        try {
          const cloudStorage = await this.authManager.getCloudStorage();
          const isSignedIn = await cloudStorage.isSignedIn();
          if (isSignedIn) {
            const cloudResult = await cloudStorage.loadSession(sessionName);
            if (cloudResult.success && cloudResult.data) {
              session = cloudResult.data as unknown as SessionFile;
            }
          }
        } catch (cloudError) {
          console.warn(`Failed to load ${sessionName} from cloud, trying localStorage:`, cloudError);
        }
        
        // Fall back to localStorage only if cloud load failed or user not signed in
        if (!session) {
          const sessionData = localStorage.getItem(`labouchere_session_${sessionName}`);
          if (sessionData) {
            session = JSON.parse(sessionData);
          }
        }
        
        const option = document.createElement('option');
        option.value = sessionName;
        
        if (session) {
          // Mark completed sessions using cloud data as source of truth
          const isCompleted = this.isSessionCompleted(session);
          const completedIndicator = isCompleted ? ' ✓' : '';
          option.textContent = `${sessionName}${completedIndicator}`;
          
          // Add visual styling for completed sessions
          if (isCompleted) {
            option.style.fontWeight = 'bold';
            option.style.color = '#4CAF50';
          }
        } else {
          // Fallback for sessions that couldn't be loaded from either source
          option.textContent = sessionName;
        }
        
        select.appendChild(option);
      } catch (error) {
        console.error(`Error processing session ${sessionName} for dropdown:`, error);
        // Still add the option even if we can't determine completion status
        const option = document.createElement('option');
        option.value = sessionName;
        option.textContent = sessionName;
        select.appendChild(option);
      }
    }

    // Restore selection
    select.value = currentValue;

    // Update button states
    const hasSessions = allSessions.length > 0;
    this.toggleElementState('loadSession', hasSessions);
    this.toggleElementState('deleteSession', hasSessions);
  }

  private onSessionSelectionChange(): void {
    const selectedSession = (this.elements.savedSessions as HTMLSelectElement).value;
    this.toggleElementState('loadSession', !!selectedSession);
    this.toggleElementState('deleteSession', !!selectedSession);
  }

  private exportAllLocalSessions(): void {
    const sessions = this.getSavedSessions();
    if (sessions.length === 0) {
      this.showToast('No local sessions to export', 'warning');
      return;
    }

    const exportData: { [key: string]: any } = {};
    
    sessions.forEach(sessionName => {
      const sessionData = localStorage.getItem(`labouchere_session_${sessionName}`);
      if (sessionData) {
        try {
          exportData[sessionName] = JSON.parse(sessionData);
        } catch (error) {
          console.error(`Error parsing session ${sessionName}:`, error);
        }
      }
    });

    // Create and download file
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `labouchere-sessions-${this.formatDateToLocalString(new Date())}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.showToast(`Exported ${sessions.length} sessions successfully`, 'success');
  }

  private clearAllLocalSessions(): void {
    const sessions = this.getSavedSessions();
    if (sessions.length === 0) {
      this.showToast('No local sessions to clear', 'info');
      return;
    }

    this.showConfirmModal(
      'Clear All Local Sessions',
      `Are you sure you want to delete all ${sessions.length} local sessions? This action cannot be undone.`,
      () => {
        sessions.forEach(sessionName => {
          localStorage.removeItem(`labouchere_session_${sessionName}`);
        });
        
        // Clear current session if it was local
        if (this.currentSession && this.getSavedSessions().length === 0) {
          this.currentSession = null;
          this.isSessionActive = false;
          this.updateAllDisplays();
        }
        
        this.loadSavedSessions();
        this.updateSettingsUI();
        this.showToast(`Cleared ${sessions.length} local sessions`, 'success');
      }
    );
  }

  // Configuration Methods
  private toggleProfitPercentage(): void {
    const usePercentage = (this.elements.useProfitPercentage as HTMLInputElement).checked;
    this.toggleElementState('profitPercentage', usePercentage);
    this.toggleElementState('profitGoal', !usePercentage);
  }

  private toggleStopLossPercentage(): void {
    const usePercentage = (this.elements.useStopLossPercentage as HTMLInputElement).checked;
    this.toggleElementState('stopLossPercentage', usePercentage);
    this.toggleElementState('stopLoss', !usePercentage);
  }

  private toggleEvenMoney(): void {
    const evenMoney = (this.elements.evenMoney as HTMLInputElement).checked;
    const riskRewardGroup = document.getElementById('riskRewardGroup');
    if (riskRewardGroup) {
      riskRewardGroup.style.display = evenMoney ? 'none' : 'block';
    }
    this.updateBetTypeInfo();
  }


  private updateBetTypeInfo(): void {
    const betTypeInfo = this.elements.betTypeInfo;
    
    if (!betTypeInfo) return;

    const evenMoney = (this.elements.evenMoney as HTMLInputElement).checked;
    
    if (evenMoney) {
      betTypeInfo.textContent = 'Even money bets: red/black, odd/even, high/low (1:1 payout)';
    } else {
      const multiplier = parseFloat((this.elements.riskRewardMultiplier as HTMLInputElement).value);
      
      if (isNaN(multiplier)) {
        betTypeInfo.textContent = 'Invalid risk/reward multiplier';
        return;
      }

      let infoText = '';
      if (multiplier === 0.5) {
        infoText = '0.5 = dozens/columns (2:1 odds), 2 dozens/columns groups';
      } else if (multiplier === 2.0) {
        infoText = '2.0 = single numbers (35:1 odds), higher risk, higher reward';
      } else {
        const rounded = Math.round(multiplier * 100) / 100;
        infoText = `${rounded} = custom risk/reward ratio`;
      }

      betTypeInfo.textContent = infoText;
    }
  }

  public populatePotSelection(): void {
    const select = this.elements.selectedPot as HTMLSelectElement;
    if (!select) return;

    // Clear existing options except the first one
    select.innerHTML = '<option value="">Manual Bankroll Entry</option>';

    // Get gaming pots from bankroll manager
    try {
      const gamingPots = window.bankrollUI?.getGamingPots() || [];
      
      gamingPots.forEach(pot => {
        const option = document.createElement('option');
        option.value = pot.id;
        option.textContent = `${pot.name} ($${pot.currentBalance.toFixed(2)})`;
        select.appendChild(option);
      });
    } catch (error) {
      console.error('Error loading gaming pots:', error);
    }
  }

  private handlePotSelection(): void {
    const select = this.elements.selectedPot as HTMLSelectElement;
    const bankrollInput = this.elements.startingBankroll as HTMLInputElement;
    const casinoInput = this.elements.casinoName as HTMLInputElement;
    
    if (select.value) {
      // A pot is selected, populate bankroll from pot balance
      try {
        const pot = window.bankrollUI?.getGamingPots().find(p => p.id === select.value);
        if (pot) {
          bankrollInput.value = pot.currentBalance.toString();
          bankrollInput.readOnly = true;
          bankrollInput.style.backgroundColor = 'var(--bg-tertiary)';
          
          // Auto-populate casino name from pot assignment
          if (pot.casino) {
            const casinoOption = (window as any).CASINO_OPTIONS?.find((c: any) => c.value === pot.casino);
            if (casinoOption) {
              casinoInput.value = casinoOption.label;
              casinoInput.readOnly = true;
              casinoInput.style.backgroundColor = 'var(--bg-tertiary)';
            }
          } else {
            // Reserve pot - clear casino name
            casinoInput.value = '';
            casinoInput.readOnly = false;
            casinoInput.style.backgroundColor = '';
          }
        }
      } catch (error) {
        console.error('Error loading pot data:', error);
      }
    } else {
      // Manual entry
      bankrollInput.readOnly = false;
      bankrollInput.style.backgroundColor = '';
      casinoInput.readOnly = false;
      casinoInput.style.backgroundColor = '';
    }
  }

  // Session Control Methods
  private startSession(): void {
    if (!this.currentSession) {
      this.showToast('Please create a new session first', 'error');
      return;
    }

    try {
      const startingBankroll = parseFloat((this.elements.startingBankroll as HTMLInputElement).value);
      const profitGoal = this.calculateActualProfitGoal(startingBankroll);
      const stopLoss = this.calculateActualStopLoss(startingBankroll);
      const minimumBet = parseFloat((this.elements.minimumBet as HTMLInputElement).value);
      const numberOfCycles = parseInt((this.elements.numberOfCycles as HTMLInputElement).value);
      const evenMoney = (this.elements.evenMoney as HTMLInputElement).checked;
      const riskRewardMultiplier = evenMoney ? 1.0 : parseFloat((this.elements.riskRewardMultiplier as HTMLInputElement).value);

      // Validation
      if (startingBankroll <= 0 || profitGoal <= 0 || stopLoss <= 0 || minimumBet <= 0 || numberOfCycles <= 0) {
        this.showToast('Please enter valid positive values for all fields', 'error');
        return;
      }

      // Update session metadata
      const metadata = this.currentSession.metadata;
      metadata.startingBankroll = startingBankroll;
      metadata.profitGoal = profitGoal;
      metadata.stopLoss = stopLoss;
      metadata.minimumBet = minimumBet;
      metadata.numberOfCycles = numberOfCycles;
      metadata.riskRewardMultiplier = riskRewardMultiplier;
      metadata.evenMoney = evenMoney;
      metadata.useProfitGoalPercentage = (this.elements.useProfitPercentage as HTMLInputElement).checked;
      metadata.useStopLossPercentage = (this.elements.useStopLossPercentage as HTMLInputElement).checked;
      metadata.profitGoalPercentage = parseFloat((this.elements.profitPercentage as HTMLInputElement).value);
      metadata.stopLossPercentage = parseFloat((this.elements.stopLossPercentage as HTMLInputElement).value);
      
      // Reset win/loss statistics for fresh start
      metadata.totalWins = 0;
      metadata.totalBets = 0;
      metadata.totalAmountWagered = 0;

      // Calculate sequence value
      const sequenceValue = Math.max(profitGoal / 4 / numberOfCycles, minimumBet);
      metadata.sequenceValue = this.roundToMinimumBet(sequenceValue, minimumBet);

      // Initialize session data
      const data = this.currentSession.data;
      data.balance = startingBankroll;
      data.totalProfit = 0;
      data.currentCycle = 1;
      data.cycleProfit = 0;
      data.sequence = [];
      data.allCycleSequences = [];
      data.maxConsecutiveWins = 0;
      data.maxConsecutiveLosses = 0;
      data.currentStreak = 0;

      // Initialize all cycle sequences
      for (let i = 0; i < numberOfCycles; i++) {
        const cycleSequence = [
          metadata.sequenceValue,
          metadata.sequenceValue,
          metadata.sequenceValue,
          metadata.sequenceValue
        ];
        data.allCycleSequences.push(cycleSequence);
      }

      // Set current sequence to first cycle
      data.sequence = [...data.allCycleSequences[0]];

      // Auto-sort the initial sequence if enabled
      if (this.shouldAutoSort() && data.sequence.length > 0) {
        data.sequence.sort((a, b) => a - b);
        data.allCycleSequences[0] = [...data.sequence];
      }

      // Clear history
      this.currentSession.history = [];
      const tbody = this.elements.historyBody;
      if (tbody) tbody.innerHTML = '';

      // Start session
      this.isSessionActive = true;
      this.sessionStartTime = new Date();
      this.sessionDuration = 0;
      this.isSessionPaused = false;
      this.startSessionTimer();
      
      // Stop session name timer while session is active
      this.stopSessionNameTimer();

      // Update UI
      this.showSessionPanels();
      this.updateAllDisplays();
      this.copyBetSizeToClipboard();

      const bettingType = evenMoney ? 'even money' : `${riskRewardMultiplier}x risk/reward`;
      this.showToast(`Session started - ${bettingType} betting`, 'success');
      
      // Auto-save if enabled
      this.autoSaveIfEnabled();

    } catch (error) {
      this.showToast('Error starting session', 'error');
      console.error('Start session error:', error);
    }
  }

  private togglePauseResume(): void {
    if (!this.isSessionActive) return;

    if (!this.isSessionPaused) {
      // Pausing the session - ask if user wants to end it
      this.pauseSessionAndPrompt();
    } else {
      // Resuming the session
      this.resumeSession();
    }
  }

  private pauseSessionAndPrompt(): void {
    this.isSessionPaused = true;
    const pauseButton = this.elements.pauseSession;
    
    this.stopSessionTimer();
    if (pauseButton) pauseButton.innerHTML = '<i class="fas fa-play"></i>';
    this.showToast('Session paused', 'info');

    if (this.currentSession) {
      this.currentSession.metadata.isSessionPaused = this.isSessionPaused;
    }

    // Show dialog asking if user wants to end session
    setTimeout(() => {
      this.showEndSessionDialog();
    }, 500);
  }

  private resumeSession(): void {
    this.isSessionPaused = false;
    const pauseButton = this.elements.pauseSession;
    
    this.startSessionTimer();
    if (pauseButton) pauseButton.innerHTML = '<i class="fas fa-pause"></i>';
    this.showToast('Session resumed', 'info');

    if (this.currentSession) {
      this.currentSession.metadata.isSessionPaused = this.isSessionPaused;
    }
  }

  private showEndSessionDialog(): void {
    if (!this.elements.modalOverlay || !this.elements.modalTitle || !this.elements.modalMessage) return;

    this.elements.modalTitle.textContent = 'Session Paused';
    this.elements.modalMessage.innerHTML = 'Your session is now paused. What would you like to do?';
    
    // Update modal buttons
    const modalActions = this.elements.modalOverlay.querySelector('.modal-actions');
    if (modalActions) {
      modalActions.innerHTML = `
        <button class="btn btn-secondary" id="continueLaterBtn">Continue Later</button>
        <button class="btn btn-primary" id="endSessionBtn">End Session</button>
      `;
    }

    this.elements.modalOverlay.style.display = 'flex';

    // Set up event handlers
    const continueLaterBtn = modalActions?.querySelector('#continueLaterBtn');
    const endSessionBtn = modalActions?.querySelector('#endSessionBtn');

    continueLaterBtn?.addEventListener('click', () => {
      this.elements.modalOverlay!.style.display = 'none';
      // Session remains paused, no further action needed
    });

    endSessionBtn?.addEventListener('click', () => {
      this.elements.modalOverlay!.style.display = 'none';
      this.showBalanceReconciliationDialog();
    });
  }

  private showBalanceReconciliationDialog(): void {
    if (!this.currentSession) return;

    const currentBalance = this.currentSession.data.balance;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <h3>Balance Reconciliation</h3>
        <p>Please verify your actual casino balance and update if needed.</p>
        <div class="form-group">
          <label for="actualBalance">Current balance in casino:</label>
          <input type="number" id="actualBalance" step="0.01" value="${currentBalance.toFixed(2)}" class="form-control">
        </div>
        <p><small>App balance: ${this.formatCurrency(currentBalance)}</small></p>
        <div class="modal-buttons">
          <button id="cancelEnd" class="btn btn-secondary">Cancel</button>
          <button id="confirmEnd" class="btn btn-primary">End Session</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const actualBalanceInput = modal.querySelector('#actualBalance') as HTMLInputElement;
    const cancelBtn = modal.querySelector('#cancelEnd');
    const confirmBtn = modal.querySelector('#confirmEnd');

    cancelBtn?.addEventListener('click', () => {
      document.body.removeChild(modal);
      // Keep session paused, don't end it
    });

    confirmBtn?.addEventListener('click', () => {
      const actualBalance = parseFloat(actualBalanceInput.value) || currentBalance;
      const balanceDifference = actualBalance - currentBalance;
      
      // Update balance if there's a discrepancy
      if (Math.abs(balanceDifference) > 0.01) {
        this.currentSession!.data.balance = actualBalance;
        this.currentSession!.data.totalProfit += balanceDifference;
        
        this.showToast(
          `Balance updated by ${this.formatCurrency(balanceDifference)}`, 
          balanceDifference > 0 ? 'success' : 'warning'
        );
      }

      // Mark session as manually ended
      this.currentSession!.metadata.isManuallyEnded = true;
      this.endSessionManually();
      
      document.body.removeChild(modal);
    });

    // Focus on input and select text
    setTimeout(() => actualBalanceInput.focus(), 100);
  }

  private endSessionManually(): void {
    if (!this.currentSession) return;
    
    const totalProfit = this.currentSession.data.totalProfit;
    const profitMessage = totalProfit >= 0 ? 
      `Session ended with profit: ${this.formatCurrency(totalProfit)}` :
      `Session ended with loss: ${this.formatCurrency(Math.abs(totalProfit))}`;
    
    this.endSession('Manual End', profitMessage);
  }

  private endSession(reason: string, message: string): void {
    this.isSessionActive = false;
    this.stopSessionTimer();
    
    // Restart session name timer since session is no longer active
    this.startSessionNameTimer();
    
    // Update final statistics
    if (this.currentSession) {
      this.currentSession.metadata.sessionDuration = this.sessionDuration;
    }

    // Hide session panels
    this.hideElement('sessionControlsHeader');
    this.hideElement('mainPanelsGrid');
    this.hideElement('liveStatsPanel');
    this.hideElement('historyPanel');

    // Disable betting controls
    this.toggleElementState('betWin', false);
    this.toggleElementState('betLoss', false);
    this.toggleElementState('splitEntry', false);
    this.toggleElementState('pauseSession', false);
    this.toggleElementState('pauseSessionHeader', false);
    this.toggleElementState('saveSession', false);
    this.toggleElementState('exportStats', false);
    this.toggleElementState('saveSessionHeader', false);
    this.toggleElementState('exportStatsHeader', false);

    this.showToast(`${reason}: ${message}`, 'info');
    this.autoSaveIfEnabled();
    
    // Prompt for balance update after session ends
    setTimeout(() => {
      this.showBalanceUpdate(reason.toLowerCase());
    }, 1000); // Small delay to let the toast show first
  }

  // Betting Logic Methods
  private processBet(isWin: boolean): void {
    if (!this.currentSession || !this.isSessionActive || this.isSessionPaused) return;

    const desiredProfit = this.calculateDesiredProfit();
    const betSize = this.calculateBetSize();
    const data = this.currentSession.data;
    const metadata = this.currentSession.metadata;

    // Risk management check for losses
    if (!isWin && this.wouldBreachStopLoss(betSize)) {
      this.showConfirmModal(
        'Risk Warning',
        `This bet (${this.formatCurrency(betSize)}) would exceed your stop loss limit. Continue anyway?`,
        () => this.processBetAfterRiskCheck(isWin, desiredProfit, betSize)
      );
      return;
    }

    this.processBetAfterRiskCheck(isWin, desiredProfit, betSize);
  }

  private processBetAfterRiskCheck(isWin: boolean, desiredProfit: number, betSize: number): void {
    if (!this.currentSession) return;

    const data = this.currentSession.data;
    const metadata = this.currentSession.metadata;

    // Update statistics
    metadata.totalBets++;
    metadata.totalAmountWagered = this.roundToMinimumBet(
      metadata.totalAmountWagered + betSize, 
      metadata.minimumBet
    );

    if (isWin) {
      metadata.totalWins++;
      
      // Update consecutive stats
      this.updateConsecutiveStats('Win');

      // Calculate actual profit: bet size * multiplier for non-even money, bet size for even money
      const actualProfit = metadata.evenMoney ? betSize : (betSize * metadata.riskRewardMultiplier);
      
      
      data.balance = this.roundToMinimumBet(data.balance + actualProfit, metadata.minimumBet);
      data.cycleProfit = this.roundToMinimumBet(data.cycleProfit + actualProfit, metadata.minimumBet);

      // Remove first and last elements from sequence
      if (data.sequence.length > 0) {
        data.sequence.shift(); // Remove first
      }
      if (data.sequence.length > 0) {
        data.sequence.pop(); // Remove last
      }

      // Update sequence in allCycleSequences
      data.allCycleSequences[data.currentCycle - 1] = [...data.sequence];

      // Auto-sort sequence if enabled
      if (this.shouldAutoSort() && data.sequence.length > 0) {
        data.sequence.sort((a, b) => a - b);
        data.allCycleSequences[data.currentCycle - 1] = [...data.sequence];
      }

      // Add to history
      this.addToHistory(isWin, desiredProfit, betSize);

      // Check if cycle is complete
      if (data.sequence.length === 0) {
        data.totalProfit = this.roundToMinimumBet(data.totalProfit + data.cycleProfit, metadata.minimumBet);
        data.currentCycle++;

        if (data.currentCycle <= metadata.numberOfCycles) {
          // Start next cycle
          this.startNextCycle();
        } else {
          // All cycles completed
          this.endSession('Success', `All cycles completed. Total profit: ${this.formatCurrency(data.totalProfit)}`);
          return;
        }
      }
    } else {
      // Update consecutive stats
      this.updateConsecutiveStats('Loss');
      
      // Process loss
      data.balance = this.roundToMinimumBet(data.balance - betSize, metadata.minimumBet);
      data.cycleProfit = this.roundToMinimumBet(data.cycleProfit - betSize, metadata.minimumBet);

      // Add to sequence - for non-even money, scale by risk-reward multiplier
      const sequenceAddition = metadata.evenMoney ? desiredProfit : (desiredProfit / metadata.riskRewardMultiplier);
      const newSequenceValue = this.ensureMinimumBet(sequenceAddition, metadata.minimumBet);
      
      data.sequence.push(newSequenceValue);
      data.allCycleSequences[data.currentCycle - 1] = [...data.sequence];

      // Auto-sort sequence if enabled
      if (this.shouldAutoSort()) {
        data.sequence.sort((a, b) => a - b);
        data.allCycleSequences[data.currentCycle - 1] = [...data.sequence];
      }

      // Add to history
      this.addToHistory(isWin, desiredProfit, betSize);

      // Check stop loss - end session if balance drops to or below minimum allowable balance
      const minimumAllowableBalance = metadata.startingBankroll - metadata.stopLoss;
      if (data.balance <= minimumAllowableBalance) {
        this.endSession('Stop Loss', `Balance dropped to ${this.formatCurrency(data.balance)}, below minimum allowable balance of ${this.formatCurrency(minimumAllowableBalance)}`);
        return;
      }

      // Check bankruptcy
      if (data.balance <= 0) {
        this.endSession('Bankruptcy', 'No funds remaining');
        return;
      }
    }

    // Update displays
    this.updateAllDisplays();
    this.copyBetSizeToClipboard();
    this.autoSaveIfEnabled();
  }

  private splitLastEntry(): void {
    if (!this.currentSession || !this.isSessionActive) return;

    const data = this.currentSession.data;
    const metadata = this.currentSession.metadata;

    if (data.sequence.length === 0) {
      this.showToast('No entries in current sequence to split', 'error');
      return;
    }

    const lastValue = data.sequence[data.sequence.length - 1];
    const remainingCycles = metadata.numberOfCycles - data.currentCycle;

    if (remainingCycles === 0) {
      // Last cycle - create new cycle
      this.splitLastEntryCreateNewCycle(lastValue);
    } else {
      // Split across remaining cycles
      this.splitLastEntryAcrossCycles(lastValue, remainingCycles);
    }
  }

  private splitLastEntryCreateNewCycle(lastValue: number): void {
    if (!this.currentSession) return;

    const metadata = this.currentSession.metadata;
    const data = this.currentSession.data;

    const optimalEntries = 4;
    const valuePerEntry = this.roundToMinimumBet(lastValue / optimalEntries, metadata.minimumBet);

    if (valuePerEntry < metadata.minimumBet) {
      this.showToast('Cannot split - value too small', 'error');
      return;
    }

    const totalUsed = this.roundToMinimumBet(valuePerEntry * optimalEntries, metadata.minimumBet);
    const remainder = this.roundToMinimumBet(lastValue - totalUsed, metadata.minimumBet);

    this.showConfirmModal(
      'Create New Cycle',
      `Create new cycle with ${optimalEntries} entries of ${this.formatCurrency(valuePerEntry)} each?`,
      () => {
        // Remove last entry
        data.sequence.pop();

        // Add remainder if any
        if (remainder > 0) {
          data.sequence.unshift(this.ensureMinimumBet(remainder, metadata.minimumBet));
        }

        // Update current sequence
        data.allCycleSequences[data.currentCycle - 1] = [...data.sequence];

        // Create new cycle
        const newCycleSequence = Array(optimalEntries).fill(valuePerEntry);
        data.allCycleSequences.push(newCycleSequence);
        metadata.numberOfCycles++;

        // Update UI
        (this.elements.numberOfCycles as HTMLInputElement).value = metadata.numberOfCycles.toString();
        
        this.addSplitToHistory('SPLIT (NEW CYCLE)', lastValue, 
          `Created new cycle with ${optimalEntries} × ${this.formatCurrency(valuePerEntry)}`);
        
        this.updateAllDisplays();
        this.showToast('New cycle created successfully', 'success');
        this.autoSaveIfEnabled();
      }
    );
  }

  private splitLastEntryAcrossCycles(lastValue: number, remainingCycles: number): void {
    if (!this.currentSession) return;

    const metadata = this.currentSession.metadata;
    const data = this.currentSession.data;

    const baseValuePerCycle = lastValue / remainingCycles;
    const roundedValuePerCycle = this.roundToMinimumBet(baseValuePerCycle, metadata.minimumBet);

    if (roundedValuePerCycle < metadata.minimumBet) {
      this.showToast('Cannot split - would create values below minimum bet', 'error');
      return;
    }

    const totalToDistribute = this.roundToMinimumBet(roundedValuePerCycle * remainingCycles, metadata.minimumBet);
    const remainder = this.roundToMinimumBet(lastValue - totalToDistribute, metadata.minimumBet);

    this.showConfirmModal(
      'Split Across Cycles',
      `Split ${this.formatCurrency(lastValue)} by adding ${this.formatCurrency(roundedValuePerCycle)} to each of ${remainingCycles} remaining cycles?`,
      () => {
        // Remove last entry
        data.sequence.pop();

        // Add remainder if any
        if (remainder > 0) {
          data.sequence.unshift(this.ensureMinimumBet(remainder, metadata.minimumBet));
        }

        // Update current sequence
        data.allCycleSequences[data.currentCycle - 1] = [...data.sequence];

        // Add to future cycles
        for (let i = data.currentCycle; i < metadata.numberOfCycles; i++) {
          data.allCycleSequences[i].push(roundedValuePerCycle);
        }

        this.addSplitToHistory('SPLIT', lastValue,
          `${this.formatCurrency(roundedValuePerCycle)} to ${remainingCycles} cycles`);

        this.updateAllDisplays();
        this.showToast('Split completed successfully', 'success');
        this.autoSaveIfEnabled();
      }
    );
  }

  private sortCurrentCycle(): void {
    if (!this.currentSession || !this.isSessionActive) {
      this.showToast('No active session to sort', 'error');
      return;
    }

    const data = this.currentSession.data;
    
    if (data.sequence.length === 0) {
      this.showToast('Current sequence is empty', 'error');
      return;
    }

    // Sort current cycle sequence from lowest to highest
    data.sequence.sort((a, b) => a - b);
    
    // Update the sequence in allCycleSequences
    data.allCycleSequences[data.currentCycle - 1] = [...data.sequence];

    this.updateAllDisplays();
    this.showToast('Current cycle sorted successfully', 'success');
    this.autoSaveIfEnabled();
  }

  private shouldAutoSort(): boolean {
    const autoSortCheckbox = this.elements.autoSort as HTMLInputElement;
    return autoSortCheckbox && autoSortCheckbox.checked;
  }

  // Calculation Methods
  private calculateActualProfitGoal(startingBankroll: number): number {
    const useProfitPercentage = (this.elements.useProfitPercentage as HTMLInputElement).checked;
    if (useProfitPercentage) {
      const percentage = parseFloat((this.elements.profitPercentage as HTMLInputElement).value);
      return startingBankroll * percentage / 100;
    }
    return parseFloat((this.elements.profitGoal as HTMLInputElement).value);
  }

  private calculateActualStopLoss(startingBankroll: number): number {
    const useStopLossPercentage = (this.elements.useStopLossPercentage as HTMLInputElement).checked;
    if (useStopLossPercentage) {
      const percentage = parseFloat((this.elements.stopLossPercentage as HTMLInputElement).value);
      return startingBankroll * percentage / 100;
    }
    return parseFloat((this.elements.stopLoss as HTMLInputElement).value);
  }

  private calculateDesiredProfit(): number {
    if (!this.currentSession) return 0;
    
    const sequence = this.currentSession.data.sequence;
    const minimumBet = this.currentSession.metadata.minimumBet;

    if (sequence.length === 0) return 0;
    if (sequence.length === 1) return this.ensureMinimumBet(sequence[0], minimumBet);

    return this.ensureMinimumBet(sequence[0] + sequence[sequence.length - 1], minimumBet);
  }

  private calculateBetSize(): number {
    if (!this.currentSession) return 0;

    const desiredProfit = this.calculateDesiredProfit();
    const metadata = this.currentSession.metadata;

    // With risk-reward multiplier: bet amount * multiplier = profit
    // So: bet amount = desired profit / multiplier
    // For even money: bet amount = desired profit / 1 = desired profit
    const betSize = metadata.evenMoney ? desiredProfit : (desiredProfit / metadata.riskRewardMultiplier);
    
    
    return this.ensureMinimumBet(betSize, metadata.minimumBet);
  }

  private wouldBreachStopLoss(betSize: number): boolean {
    if (!this.currentSession) return false;
    
    const data = this.currentSession.data;
    const metadata = this.currentSession.metadata;
    
    // Calculate minimum allowable balance (starting bankroll minus stop loss amount)
    const minimumAllowableBalance = metadata.startingBankroll - metadata.stopLoss;
    
    // Check if placing this bet would drop balance below the minimum allowable balance
    const balanceAfterLoss = data.balance - betSize;
    
    return balanceAfterLoss < minimumAllowableBalance;
  }

  // Utility Methods
  private roundToMinimumBet(value: number, minimumBet: number): number {
    if (minimumBet <= 0) return Math.round(value * 100) / 100;
    
    const decimalPlaces = this.getDecimalPlaces(minimumBet);
    const rounded = Math.round(value / minimumBet) * minimumBet;
    return Math.round(rounded * Math.pow(10, decimalPlaces)) / Math.pow(10, decimalPlaces);
  }

  private ensureMinimumBet(value: number, minimumBet: number): number {
    return Math.max(this.roundToMinimumBet(value, minimumBet), minimumBet);
  }

  private getDecimalPlaces(value: number): number {
    const valueStr = value.toString();
    const decimalIndex = valueStr.indexOf('.');
    return decimalIndex === -1 ? 0 : valueStr.length - decimalIndex - 1;
  }

  private formatCurrency(value: number): string {
    const minimumBet = this.currentSession?.metadata.minimumBet || 0.01;
    const decimalPlaces = this.getDecimalPlaces(minimumBet);
    return `${value.toFixed(decimalPlaces)}`;
  }

  // History Methods
  private addToHistory(isWin: boolean, desiredProfit: number, betSize: number): void {
    if (!this.currentSession) return;

    const data = this.currentSession.data;
    const historyEntry: HistoryEntry = {
      betNumber: this.currentSession.history.length + 1,
      outcome: isWin ? 'Win' : 'Loss',
      desiredProfit,
      betSize,
      balance: data.balance,
      sequenceAfter: data.sequence.join(','),
      timestamp: new Date()
    };

    this.currentSession.history.push(historyEntry);
    this.addHistoryRowToTable(historyEntry, isWin);
  }

  private addSplitToHistory(type: string, amount: number, description: string): void {
    if (!this.currentSession) return;

    const data = this.currentSession.data;
    const historyEntry: HistoryEntry = {
      betNumber: this.currentSession.history.length + 1,
      outcome: type as any,
      desiredProfit: 0,
      betSize: amount,
      balance: data.balance,
      sequenceAfter: description,
      timestamp: new Date()
    };

    this.currentSession.history.push(historyEntry);
    this.addHistoryRowToTable(historyEntry, null, type);
  }

  private addHistoryRowToTable(entry: HistoryEntry, isWin: boolean | null = null, specialType?: string): void {
    const tbody = this.elements.historyBody;
    if (!tbody) return;

    const row = document.createElement('tr');
    
    if (isWin === true) {
      row.classList.add('win');
    } else if (isWin === false) {
      row.classList.add('loss');
    }

    let outcomeHtml = '';
    if (specialType) {
      outcomeHtml = `<span class="outcome-badge" style="background: #f59e0b; color: white;">${specialType}</span>`;
    } else {
      const outcomeClass = isWin ? 'win' : 'loss';
      outcomeHtml = `<span class="outcome-badge ${outcomeClass}">${entry.outcome}</span>`;
    }

    row.innerHTML = `
      <td>${entry.betNumber}</td>
      <td>${outcomeHtml}</td>
      <td>${this.formatCurrency(entry.desiredProfit)}</td>
      <td>${this.formatCurrency(entry.betSize)}</td>
      <td>${this.formatCurrency(entry.balance)}</td>
      <td>${specialType ? entry.sequenceAfter : this.formatSequenceDisplay(entry.sequenceAfter)}</td>
    `;

    tbody.appendChild(row);
    
    // Scroll to bottom
    const container = tbody.closest('.history-table-container');
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }

  private formatSequenceDisplay(sequenceString: string): string {
    if (!sequenceString) return 'N/A';
    
    const values = sequenceString.split(',').filter(v => v.trim());
    if (values.length === 0) return 'Complete';
    
    return values.map(v => this.formatCurrency(parseFloat(v))).join(' → ');
  }

  private clearHistory(): void {
    this.showConfirmModal(
      'Clear History',
      'Are you sure you want to clear all betting history? This action cannot be undone.',
      () => {
        if (this.currentSession) {
          this.currentSession.history = [];
          const tbody = this.elements.historyBody;
          if (tbody) tbody.innerHTML = '';
          this.showToast('History cleared', 'success');
        }
      }
    );
  }

  private undoLastBet(): void {
    if (!this.currentSession || this.currentSession.history.length === 0) {
      this.showToast('No bets to undo', 'error');
      return;
    }

    this.showConfirmModal(
      'Undo Last Bet',
      'Are you sure you want to undo the last bet? This will recalculate your session state.',
      () => {
        this.performUndoLastBet();
      }
    );
  }

  private performUndoLastBet(): void {
    if (!this.currentSession) return;

    const lastEntry = this.currentSession.history.pop();
    if (!lastEntry) return;

    // Reverse statistics
    const metadata = this.currentSession.metadata;
    metadata.totalBets--;
    metadata.totalAmountWagered = this.roundToMinimumBet(
      metadata.totalAmountWagered - lastEntry.betSize,
      metadata.minimumBet
    );
    
    if (lastEntry.outcome === 'Win') {
      metadata.totalWins--;
    }

    // Remove last row from table
    const tbody = this.elements.historyBody;
    if (tbody && tbody.lastElementChild) {
      tbody.removeChild(tbody.lastElementChild);
    }

    // Reconstruct state from remaining history
    this.reconstructStateFromHistory();
    
    this.showToast('Last bet undone', 'success');
    this.autoSaveIfEnabled();
  }

  private reconstructStateFromHistory(): void {
    if (!this.currentSession) return;

    const data = this.currentSession.data;
    const metadata = this.currentSession.metadata;

    // Reset to initial state
    data.balance = metadata.startingBankroll;
    data.cycleProfit = 0;
    data.currentCycle = 1;
    data.totalProfit = 0;
    data.maxConsecutiveWins = 0;
    data.maxConsecutiveLosses = 0;
    data.currentStreak = 0;

    // Reset streak tracking
    this.consecutiveWins = 0;
    this.consecutiveLosses = 0;
    this.maxConsecutiveWins = 0;
    this.maxConsecutiveLosses = 0;
    this.currentStreak = 0;

    // Reset sequences
    for (let i = 0; i < metadata.numberOfCycles; i++) {
      const cycleSequence = [
        metadata.sequenceValue,
        metadata.sequenceValue,
        metadata.sequenceValue,
        metadata.sequenceValue
      ];
      data.allCycleSequences[i] = cycleSequence;
    }
    data.sequence = [...data.allCycleSequences[0]];

    // Auto-sort the initial sequence if enabled (before replaying history)
    if (this.shouldAutoSort() && data.sequence.length > 0) {
      data.sequence.sort((a, b) => a - b);
      data.allCycleSequences[0] = [...data.sequence];
    }

    // Replay history
    this.currentSession.history.forEach(entry => {
      if (entry.outcome === 'Win' || entry.outcome === 'Loss') {
        const isWin = entry.outcome === 'Win';
        
        if (isWin) {
          this.updateConsecutiveStats('Win');
          
          const actualProfit = metadata.evenMoney ? entry.betSize : (entry.betSize * metadata.riskRewardMultiplier);
          data.balance = this.roundToMinimumBet(data.balance + actualProfit, metadata.minimumBet);
          data.cycleProfit = this.roundToMinimumBet(data.cycleProfit + actualProfit, metadata.minimumBet);

          // Remove first and last
          if (data.sequence.length > 0) data.sequence.shift();
          if (data.sequence.length > 0) data.sequence.pop();
        } else {
          this.updateConsecutiveStats('Loss');
          
          data.balance = this.roundToMinimumBet(data.balance - entry.betSize, metadata.minimumBet);
          data.cycleProfit = this.roundToMinimumBet(data.cycleProfit - entry.betSize, metadata.minimumBet);

          // Add to sequence - always use desired profit
          const newValue = this.ensureMinimumBet(entry.desiredProfit, metadata.minimumBet);
          data.sequence.push(newValue);
        }

        // Update cycle sequence
        data.allCycleSequences[data.currentCycle - 1] = [...data.sequence];

        // Handle cycle completion
        if (isWin && data.sequence.length === 0) {
          data.totalProfit = this.roundToMinimumBet(data.totalProfit + data.cycleProfit, metadata.minimumBet);
          data.currentCycle++;
          if (data.currentCycle <= metadata.numberOfCycles) {
            data.sequence = [...data.allCycleSequences[data.currentCycle - 1]];
            data.cycleProfit = 0;
            
            // Auto-sort the new cycle's sequence if enabled
            if (this.shouldAutoSort() && data.sequence.length > 0) {
              data.sequence.sort((a, b) => a - b);
              data.allCycleSequences[data.currentCycle - 1] = [...data.sequence];
            }
          }
        }
      }
    });

    this.updateAllDisplays();
  }

  // UI Update Methods
  private updateAllDisplays(): void {
    this.updateStatusDisplay();
    this.updateBettingDisplay();
    this.updateSequenceDisplay();
    this.updateRiskManagement();
    this.updateLiveStats();
  }

  private updateStatusDisplay(): void {
    if (!this.currentSession) return;

    const data = this.currentSession.data;
    const metadata = this.currentSession.metadata;

    this.setElementText('currentBalance', this.formatCurrency(data.balance));
    this.setElementText('cycleProfit', this.formatCurrency(data.cycleProfit));
    this.setElementText('currentCycle', data.currentCycle.toString());
    this.setElementText('totalProfit', this.formatCurrency(data.totalProfit));
    this.setElementText('totalWagered', this.formatCurrency(metadata.totalAmountWagered));

    const minimumAllowableBalance = metadata.startingBankroll - metadata.stopLoss;
    const remainingRisk = Math.max(0, data.balance - minimumAllowableBalance);
    this.setElementText('riskRemaining', this.formatCurrency(remainingRisk));

    // Update win rate with color coding
    this.updateWinRateDisplay(metadata);
  }

  private migrateLegacyMultiplier(metadata: any): void {
    // Convert new payoutMultiplier back to old riskRewardMultiplier system
    if (metadata.payoutMultiplier !== undefined && metadata.riskRewardMultiplier === undefined) {
      // Convert payout multiplier back to risk-reward system
      if (metadata.payoutMultiplier === 2.0) {
        // Even money
        metadata.evenMoney = true;
        metadata.riskRewardMultiplier = 1.0;
      } else {
        // Non-even money: riskRewardMultiplier = 1 / (payoutMultiplier - 1)
        metadata.evenMoney = false;
        metadata.riskRewardMultiplier = 1 / (metadata.payoutMultiplier - 1);
      }
      
      // Clean up new property
      delete metadata.payoutMultiplier;
      
      console.log(`Migrated new session back to legacy: payout ${metadata.payoutMultiplier}x -> riskReward ${metadata.riskRewardMultiplier}, evenMoney: ${metadata.evenMoney}`);
    }
    
    // Ensure we have the required old properties
    if (metadata.evenMoney === undefined) {
      metadata.evenMoney = true; // Default to even money
    }
    if (metadata.riskRewardMultiplier === undefined) {
      metadata.riskRewardMultiplier = 1.0; // Default for even money
    }
  }

  private updateWinRateDisplay(metadata: SessionMetadata): void {
    const winRate = metadata.totalBets > 0 ? (metadata.totalWins / metadata.totalBets * 100) : 0;
    const winRateText = `${winRate.toFixed(1)}% (${metadata.totalWins}/${metadata.totalBets})`;
    
    // Use risk-reward multiplier directly (1.0 for even money)
    const effectiveRiskReward = metadata.evenMoney ? 1.0 : metadata.riskRewardMultiplier;
    
    // Calculate optimal win rate based on risk-reward multiplier
    const requiredWinRate = this.calculateRequiredWinRate(effectiveRiskReward);
    
    
    // Determine color based on performance vs required win rate
    let colorClass = '';
    if (metadata.totalBets === 0) {
      colorClass = 'neutral'; // No bets yet
    } else if (winRate >= requiredWinRate.excellent) {
      colorClass = 'excellent'; // Excellent performance
    } else if (winRate >= requiredWinRate.good) {
      colorClass = 'good'; // Good performance  
    } else if (winRate >= requiredWinRate.acceptable) {
      colorClass = 'acceptable'; // Acceptable performance
    } else if (winRate >= requiredWinRate.poor) {
      colorClass = 'poor'; // Poor performance
    } else {
      colorClass = 'terrible'; // Terrible performance
    }
    
    
    // Update the element with color coding
    const winRateElement = this.elements.winRate;
    if (winRateElement) {
      winRateElement.textContent = winRateText;
      winRateElement.className = `stat-value win-rate-${colorClass}`;
    }
  }

  private calculateRequiredWinRate(riskRewardMultiplier: number): {excellent: number, good: number, acceptable: number, poor: number} {
    // Calculate break-even win rate using your Python formula: 1 / (1 + rr) * 100
    const breakEvenRate = (1 / (1 + riskRewardMultiplier)) * 100;
    
    // Define ranges with ±5% buffer around breakeven (matching your Python logic)
    const buffer = 0.05 * breakEvenRate; // 5% of breakeven rate
    
    return {
      excellent: breakEvenRate + buffer,  // 5% above break-even (Excellent)
      good: breakEvenRate,               // At break-even (Solid)
      acceptable: breakEvenRate - buffer, // 5% below break-even (Needs Improvement)
      poor: breakEvenRate - (2 * buffer) // 10% below break-even (Poor)
    };
  }

  private updateBettingDisplay(): void {
    if (!this.currentSession) return;

    const desiredProfit = this.calculateDesiredProfit();
    const betSize = this.calculateBetSize();

    this.setElementText('desiredProfit', this.formatCurrency(desiredProfit));
    this.setElementText('nextBetSize', this.formatCurrency(betSize));

    // Enable/disable betting buttons based on session state
    const canBet = this.isSessionActive && !this.isSessionPaused;
    this.toggleElementState('betWin', canBet);
    this.toggleElementState('betLoss', canBet);
    this.toggleElementState('splitEntry', canBet && this.currentSession.data.sequence.length > 0);
    this.toggleElementState('sortCurrentCycle', canBet && this.currentSession.data.sequence.length > 0);
    
    // Reshuffle enabled when there are remaining cycles (current + future)
    const hasRemainingCycles = canBet && this.currentSession.data.currentCycle <= this.currentSession.metadata.numberOfCycles;
    this.toggleElementState('reshuffleCycles', hasRemainingCycles);
  }

  private updateSequenceDisplay(): void {
    const container = this.elements.sequenceContainer;
    if (!container || !this.currentSession) return;

    container.innerHTML = '';

    this.currentSession.data.allCycleSequences.forEach((cycleSequence, index) => {
      const cycleNumber = index + 1;
      const isCurrent = cycleNumber === this.currentSession!.data.currentCycle && this.isSessionActive;
      const isCompleted = cycleNumber < this.currentSession!.data.currentCycle || 
                          (cycleSequence.length === 0 && !this.isSessionActive);
      const isPending = cycleNumber > this.currentSession!.data.currentCycle;

      const cycleDiv = document.createElement('div');
      cycleDiv.className = `sequence-cycle ${isCurrent ? 'current' : isCompleted ? 'completed' : 'pending'}`;

      const headerDiv = document.createElement('div');
      headerDiv.className = 'cycle-header';

      const numberSpan = document.createElement('span');
      numberSpan.className = 'cycle-number';
      numberSpan.textContent = `Cycle ${cycleNumber}`;

      const statusSpan = document.createElement('span');
      statusSpan.className = `cycle-status ${isCurrent ? 'current' : isCompleted ? 'completed' : 'pending'}`;
      statusSpan.textContent = isCurrent ? 'CURRENT' : isCompleted ? 'COMPLETED' : 'PENDING';

      headerDiv.appendChild(numberSpan);
      headerDiv.appendChild(statusSpan);

      const valuesDiv = document.createElement('div');
      valuesDiv.className = 'sequence-values';

      if (cycleSequence.length === 0 && isCompleted) {
        const completeSpan = document.createElement('span');
        completeSpan.className = 'sequence-value';
        completeSpan.textContent = 'Complete';
        valuesDiv.appendChild(completeSpan);
      } else {
        cycleSequence.forEach((value, valueIndex) => {
          const valueSpan = document.createElement('span');
          valueSpan.className = 'sequence-value';
          
          // Highlight first and last values for current cycle
          if (isCurrent && cycleSequence.length > 1 && (valueIndex === 0 || valueIndex === cycleSequence.length - 1)) {
            valueSpan.classList.add('first-last');
          }
          
          valueSpan.textContent = this.formatCurrency(value);
          valuesDiv.appendChild(valueSpan);
        });
      }

      cycleDiv.appendChild(headerDiv);
      cycleDiv.appendChild(valuesDiv);
      container.appendChild(cycleDiv);
    });
  }

  private updateRiskManagement(): void {
    if (!this.currentSession || !this.isSessionActive) {
      this.hideElement('riskWarning');
      return;
    }

    const data = this.currentSession.data;
    const metadata = this.currentSession.metadata;
    const currentBetSize = this.calculateBetSize();
    const minimumAllowableBalance = metadata.startingBankroll - metadata.stopLoss;
    const remainingRisk = Math.max(0, data.balance - minimumAllowableBalance);

    if (remainingRisk <= 0 || data.balance <= minimumAllowableBalance) {
      this.showRiskWarning('STOP LOSS REACHED! Cannot place further bets.');
      this.toggleElementState('betWin', false);
      this.toggleElementState('betLoss', false);
      return;
    }

    if (this.wouldBreachStopLoss(currentBetSize)) {
      const maxSafeBet = Math.max(0, remainingRisk);
      this.showRiskWarning(
        `⚠️ WARNING: This bet (${this.formatCurrency(currentBetSize)}) would breach your stop loss! ` +
        `Maximum safe bet: ${this.formatCurrency(maxSafeBet)}. Consider using 'Split Last Entry'.`
      );
    } else {
      this.hideElement('riskWarning');
    }
  }

  private showRiskWarning(message: string): void {
    const warningElement = this.elements.riskWarning;
    const warningText = this.elements.riskWarningText;
    
    if (warningElement && warningText) {
      warningText.textContent = message;
      warningElement.style.display = 'flex';
    }
  }

  // Session Timer Methods
  private startSessionTimer(): void {
    if (this.sessionTimer) {
      clearInterval(this.sessionTimer);
    }

    this.sessionTimer = window.setInterval(() => {
      if (this.isSessionActive && !this.isSessionPaused) {
        this.sessionDuration++;
        this.updateSessionDurationDisplay();
      }
    }, 1000);
  }

  private stopSessionTimer(): void {
    if (this.sessionTimer) {
      clearInterval(this.sessionTimer);
      this.sessionTimer = null;
    }
  }

  private startSessionNameTimer(): void {
    // Update session name every minute (60000 ms)
    this.sessionNameTimer = window.setInterval(() => {
      // Only update if no session is active and session name field exists
      if (!this.isSessionActive) {
        this.generateSessionName();
      }
    }, 60000);
  }

  private stopSessionNameTimer(): void {
    if (this.sessionNameTimer) {
      clearInterval(this.sessionNameTimer);
      this.sessionNameTimer = null;
    }
  }

  private updateSessionDurationDisplay(): void {
    const hours = Math.floor(this.sessionDuration / 3600);
    const minutes = Math.floor((this.sessionDuration % 3600) / 60);
    const seconds = this.sessionDuration % 60;

    const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    this.setElementText('sessionDuration', timeString);
    this.setElementText('sessionDurationHeader', timeString);
  }

  private formatDuration(durationInSeconds: number): string {
    const hours = Math.floor(durationInSeconds / 3600);
    const minutes = Math.floor((durationInSeconds % 3600) / 60);
    const seconds = Math.floor(durationInSeconds % 60);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  // Helper Methods for Cycle Management
  private startNextCycle(): void {
    if (!this.currentSession) return;

    const data = this.currentSession.data;
    data.sequence = [...data.allCycleSequences[data.currentCycle - 1]];
    data.cycleProfit = 0;

    // Auto-sort the new cycle's sequence if enabled
    if (this.shouldAutoSort() && data.sequence.length > 0) {
      data.sequence.sort((a, b) => a - b);
      data.allCycleSequences[data.currentCycle - 1] = [...data.sequence];
    }

    this.addToHistory('CYCLE COMPLETE' as any, 0, 0);
    this.updateAllDisplays();
    this.showToast(`Cycle ${data.currentCycle} started`, 'info');
  }

  // Session Panel Management
  private showSessionPanels(): void {
    // Show header session controls
    this.showElement('sessionControlsHeader');
    
    // Show the main panels grid
    this.showElement('mainPanelsGrid');
    this.showElement('liveStatsPanel');
    this.showElement('historyPanel');

    // Enable session controls (both original and header)
    this.toggleElementState('pauseSession', true);
    this.toggleElementState('saveSession', true);
    this.toggleElementState('exportStats', true);
    this.toggleElementState('pauseSessionHeader', true);
    this.toggleElementState('saveSessionHeader', true);
    this.toggleElementState('exportStatsHeader', true);
  }

  private populateUIFromSession(): void {
    if (!this.currentSession) return;

    const metadata = this.currentSession.metadata;

    // Migrate legacy riskRewardMultiplier to payoutMultiplier if needed
    this.migrateLegacyMultiplier(metadata);
    
    // Populate form fields
    (this.elements.sessionName as HTMLInputElement).value = metadata.sessionName;
    (this.elements.casinoName as HTMLInputElement).value = metadata.casinoName;
    (this.elements.gameType as HTMLSelectElement).value = metadata.gameType;
    (this.elements.startingBankroll as HTMLInputElement).value = metadata.startingBankroll.toString();
    (this.elements.profitGoal as HTMLInputElement).value = metadata.profitGoal.toString();
    (this.elements.stopLoss as HTMLInputElement).value = metadata.stopLoss.toString();
    (this.elements.minimumBet as HTMLInputElement).value = metadata.minimumBet.toString();
    (this.elements.numberOfCycles as HTMLInputElement).value = metadata.numberOfCycles.toString();
    (this.elements.evenMoney as HTMLInputElement).checked = metadata.evenMoney;
    (this.elements.riskRewardMultiplier as HTMLInputElement).value = metadata.riskRewardMultiplier.toString();
    this.toggleEvenMoney(); // Show/hide risk-reward input based on even money setting
    (this.elements.useProfitPercentage as HTMLInputElement).checked = metadata.useProfitGoalPercentage;
    (this.elements.useStopLossPercentage as HTMLInputElement).checked = metadata.useStopLossPercentage;
    (this.elements.profitPercentage as HTMLInputElement).value = metadata.profitGoalPercentage.toString();
    (this.elements.stopLossPercentage as HTMLInputElement).value = metadata.stopLossPercentage.toString();

    // Update UI state
    this.toggleProfitPercentage();
    this.toggleStopLossPercentage();
    this.updateBetTypeInfo();

    // Set session state - auto-resume loaded sessions
    this.isSessionActive = true;
    this.sessionDuration = metadata.sessionDuration;
    this.isSessionPaused = false; // Always resume loaded sessions
    metadata.isManuallyEnded = false; // Reset manual end flag when resuming
    
    // Migrate legacy session data if needed
    const data = this.currentSession.data;
    if (data.maxConsecutiveWins === undefined) {
      data.maxConsecutiveWins = 0;
    }
    if (data.maxConsecutiveLosses === undefined) {
      data.maxConsecutiveLosses = 0;
    }
    if (data.currentStreak === undefined) {
      data.currentStreak = 0;
    }
    
    // Migrate legacy metadata if needed
    if (metadata.isManuallyEnded === undefined) {
      metadata.isManuallyEnded = false;
    }
    
    // Sync loaded stats with class properties
    this.maxConsecutiveWins = data.maxConsecutiveWins;
    this.maxConsecutiveLosses = data.maxConsecutiveLosses;
    this.currentStreak = data.currentStreak;
    
    // Restart session timer
    this.startSessionTimer();

    // Populate history table
    const tbody = this.elements.historyBody;
    if (tbody) {
      tbody.innerHTML = '';
      this.currentSession.history.forEach(entry => {
        if (entry.outcome === 'Win' || entry.outcome === 'Loss') {
          this.addHistoryRowToTable(entry, entry.outcome === 'Win');
        } else {
          this.addHistoryRowToTable(entry, null, entry.outcome);
        }
      });
    }

    // Show panels and update displays
    this.showSessionPanels();
    this.updateAllDisplays();

    // Start timer if not paused
    if (!this.isSessionPaused) {
      this.startSessionTimer();
    }

    // Update pause button
    const pauseButton = this.elements.pauseSession;
    if (pauseButton) {
      pauseButton.innerHTML = this.isSessionPaused ? '<i class="fas fa-play"></i>' : '<i class="fas fa-pause"></i>';
    }
  }

  // Auto-save functionality
  private async autoSaveIfEnabled(): Promise<void> {
    const autoSaveEnabled = (this.elements.autoSave as HTMLInputElement)?.checked;
    if (autoSaveEnabled && this.currentSession) {
      this.saveSession();
    }
  }

  // Clipboard functionality
  private copyBetSizeToClipboard(): void {
    const copyEnabled = (this.elements.copyToClipboard as HTMLInputElement)?.checked;
    if (!copyEnabled || !this.currentSession) return;

    const betSize = this.calculateBetSize();
    const betText = betSize.toFixed(this.getDecimalPlaces(this.currentSession.metadata.minimumBet));

    navigator.clipboard.writeText(betText).then(() => {
      this.showToast(`Bet size ${this.formatCurrency(betSize)} copied to clipboard`, 'info');
    }).catch(err => {
      console.error('Failed to copy to clipboard:', err);
    });
  }

  // Export functionality
  private exportStatistics(): void {
    if (!this.currentSession) {
      this.showToast('No active session to export', 'error');
      return;
    }

    try {
      const stats = this.generateStatisticsReport();
      const blob = new Blob([stats], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `${this.currentSession.metadata.sessionName}_stats.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.showToast('Statistics exported successfully', 'success');
    } catch (error) {
      this.showToast('Error exporting statistics', 'error');
      console.error('Export error:', error);
    }
  }

  private generateStatisticsReport(): string {
    if (!this.currentSession) return '';

    const metadata = this.currentSession.metadata;
    const data = this.currentSession.data;
    const now = new Date();
    
    let report = `Labouchere Session Statistics Export\n`;
    report += `Generated: ${now.toLocaleString()}\n`;
    report += `==========================================\n\n`;

    // Session Information
    report += `SESSION INFORMATION\n`;
    report += `Session Name: ${metadata.sessionName}\n`;
    report += `Casino: ${metadata.casinoName}\n`;
    report += `Game Type: ${metadata.gameType}\n`;
    report += `Session Start: ${metadata.sessionStartTime.toLocaleString()}\n`;
    
    const duration = new Date(this.sessionDuration * 1000).toISOString().substr(11, 8);
    report += `Session Duration: ${duration}\n`;
    report += `Session Status: ${this.isSessionActive ? (this.isSessionPaused ? 'Paused' : 'Active') : 'Completed'}\n\n`;

    // Betting Configuration
    report += `BETTING CONFIGURATION\n`;
    report += `Starting Bankroll: ${this.formatCurrency(metadata.startingBankroll)}\n`;
    report += `Profit Goal: ${this.formatCurrency(metadata.profitGoal)}${metadata.useProfitGoalPercentage ? ` (${metadata.profitGoalPercentage}%)` : ''}\n`;
    report += `Stop Loss: ${this.formatCurrency(metadata.stopLoss)}${metadata.useStopLossPercentage ? ` (${metadata.stopLossPercentage}%)` : ''}\n`;
    report += `Minimum Bet: ${this.formatCurrency(metadata.minimumBet)}\n`;
    report += `Number of Cycles: ${metadata.numberOfCycles}\n`;
    report += `Sequence Value: ${this.formatCurrency(metadata.sequenceValue)}\n`;
    report += `Betting Type: ${metadata.evenMoney ? 'Even Money' : `${metadata.riskRewardMultiplier}x Risk/Reward`}\n\n`;

    // Current Status
    report += `CURRENT STATUS\n`;
    report += `Current Balance: ${this.formatCurrency(data.balance)}\n`;
    report += `Total Profit/Loss: ${this.formatCurrency(data.totalProfit + data.cycleProfit)}\n`;
    report += `Current Cycle: ${data.currentCycle} of ${metadata.numberOfCycles}\n`;
    report += `Cycle Profit/Loss: ${this.formatCurrency(data.cycleProfit)}\n\n`;

    // Risk Management Status
    report += `RISK MANAGEMENT STATUS\n`;
    const minimumAllowableBalance = metadata.startingBankroll - metadata.stopLoss;
    const remainingRisk = Math.max(0, data.balance - minimumAllowableBalance);
    const riskUsed = metadata.startingBankroll - data.balance;
    report += `Stop Loss Limit: ${this.formatCurrency(metadata.stopLoss)}\n`;
    report += `Minimum Allowable Balance: ${this.formatCurrency(minimumAllowableBalance)}\n`;
    report += `Current Risk Used: ${this.formatCurrency(riskUsed)} (${(riskUsed / metadata.stopLoss * 100).toFixed(1)}%)\n`;
    report += `Remaining Risk Capacity: ${this.formatCurrency(remainingRisk)} (${(remainingRisk / metadata.stopLoss * 100).toFixed(1)}%)\n`;

    if (this.isSessionActive) {
      const nextBetSize = this.calculateBetSize();
      const wouldBreach = this.wouldBreachStopLoss(nextBetSize);
      report += `Next Bet Size: ${this.formatCurrency(nextBetSize)}\n`;
      report += `Would Breach Stop Loss: ${wouldBreach ? 'YES - RISKY!' : 'No'}\n`;
      if (wouldBreach) {
        const maxSafe = Math.max(0, remainingRisk);
        report += `Maximum Safe Bet: ${this.formatCurrency(maxSafe)}\n`;
      }
    }
    report += `\n`;

    // Betting Statistics
    report += `BETTING STATISTICS\n`;
    report += `Total Bets Placed: ${metadata.totalBets}\n`;
    report += `Total Wins: ${metadata.totalWins}\n`;
    report += `Total Losses: ${metadata.totalBets - metadata.totalWins}\n`;
    const winRate = metadata.totalBets > 0 ? (metadata.totalWins / metadata.totalBets * 100) : 0;
    report += `Win Rate: ${winRate.toFixed(2)}%\n`;
    report += `Total Amount Wagered: ${this.formatCurrency(metadata.totalAmountWagered)}\n`;

    if (metadata.totalAmountWagered > 0) {
      const netProfit = data.totalProfit + data.cycleProfit;
      const roi = (netProfit / metadata.startingBankroll) * 100;
      const profitMargin = (netProfit / metadata.totalAmountWagered) * 100;
      report += `Return on Investment (ROI): ${roi.toFixed(2)}%\n`;
      report += `Profit Margin: ${profitMargin.toFixed(2)}%\n`;
    }
    report += `\n`;

    // Cycle Analysis
    report += `CYCLE ANALYSIS\n`;
    data.allCycleSequences.forEach((cycleSequence, index) => {
      const cycleNumber = index + 1;
      let status = '';
      
      if (cycleNumber < data.currentCycle) {
        status = 'COMPLETED';
      } else if (cycleNumber === data.currentCycle) {
        status = 'CURRENT';
      } else {
        status = 'PENDING';
      }

      report += `Cycle ${cycleNumber}: ${status}\n`;
      
      if (cycleSequence.length === 0 && cycleNumber <= data.currentCycle) {
        report += `  Sequence: Complete\n`;
      } else {
        const sequenceStr = cycleSequence.map(v => this.formatCurrency(v)).join(', ');
        report += `  Sequence: ${sequenceStr}\n`;
      }
    });
    report += `\n`;

    // Recent Betting History (last 20 bets)
    report += `RECENT BETTING HISTORY (Last 20 Bets)\n`;
    report += `Bet#\tOutcome\tDesired Profit\tBet Size\tBalance After\n`;

    const recentHistory = this.currentSession.history.slice(-20);
    recentHistory.forEach(bet => {
      if (bet.outcome === 'Win' || bet.outcome === 'Loss') {
        report += `${bet.betNumber}\t${bet.outcome}\t${this.formatCurrency(bet.desiredProfit)}\t${this.formatCurrency(bet.betSize)}\t${this.formatCurrency(bet.balance)}\n`;
      }
    });

    if (this.currentSession.history.length > 20) {
      report += `... (${this.currentSession.history.length - 20} earlier bets not shown)\n`;
    }
    report += `\n`;

    // Performance Metrics
    if (metadata.totalBets > 0) {
      report += `PERFORMANCE METRICS\n`;

      const avgBetSize = metadata.totalAmountWagered / metadata.totalBets;
      report += `Average Bet Size: ${this.formatCurrency(avgBetSize)}\n`;

      const bettingHistory = this.currentSession.history.filter(h => h.outcome === 'Win' || h.outcome === 'Loss');
      if (bettingHistory.length > 0) {
        const largestBet = Math.max(...bettingHistory.map(h => h.betSize));
        const smallestBet = Math.min(...bettingHistory.map(h => h.betSize));
        report += `Largest Bet: ${this.formatCurrency(largestBet)}\n`;
        report += `Smallest Bet: ${this.formatCurrency(smallestBet)}\n`;
      }

      if (this.sessionDuration > 0) {
        const betsPerHour = (metadata.totalBets / this.sessionDuration) * 3600;
        const avgTimePerBet = this.sessionDuration / metadata.totalBets;
        report += `Betting Rate: ${betsPerHour.toFixed(1)} bets per hour\n`;
        report += `Average Time per Bet: ${avgTimePerBet.toFixed(1)} seconds\n`;
      }
    }

    return report;
  }

  // UI Helper Methods
  private toggleSetupPanel(): void {
    const setupContent = this.elements.setupContent;
    const collapseBtn = this.elements.collapseSetup;
    
    if (setupContent && collapseBtn) {
      const isCollapsed = setupContent.style.display === 'none';
      setupContent.style.display = isCollapsed ? 'block' : 'none';
      
      const icon = collapseBtn.querySelector('i');
      if (icon) {
        icon.className = isCollapsed ? 'fas fa-chevron-up' : 'fas fa-chevron-down';
      }
    }
  }

  private toggleLiveStatsPanel(): void {
    const liveStatsContent = document.getElementById('liveStatsContent');
    const collapseBtn = this.elements.collapseLiveStats;
    
    if (liveStatsContent && collapseBtn) {
      const isCollapsed = liveStatsContent.style.display === 'none';
      liveStatsContent.style.display = isCollapsed ? 'block' : 'none';
      
      const icon = collapseBtn.querySelector('i');
      if (icon) {
        icon.className = isCollapsed ? 'fas fa-chevron-up' : 'fas fa-chevron-down';
      }
    }
  }

  private initializeProfitChart(): void {
    if (!this.currentSession) return;

    const canvas = document.getElementById('profitChart') as HTMLCanvasElement;
    if (!canvas) return;

    // Destroy existing chart if it exists
    if (this.profitChart) {
      this.profitChart.destroy();
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Detect dark theme
    const isDarkTheme = document.documentElement.getAttribute('data-theme') === 'dark' || 
                       (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);

    // Prepare data from history
    const history = this.currentSession.history;
    const startingBalance = this.currentSession.metadata.startingBankroll;
    const stopLossAmount = startingBalance - this.currentSession.metadata.stopLoss;
    const currentBalance = this.currentSession.data.balance;

    const chartData: number[] = [];
    const labels: string[] = ['0'];
    chartData.push(startingBalance);

    // Filter out split entries from chart data since they don't represent actual bets
    const actualBets = history.filter(entry => entry.outcome === 'Win' || entry.outcome === 'Loss');
    
    let actualBetNumber = 1;
    actualBets.forEach((entry) => {
      labels.push(actualBetNumber.toString());
      chartData.push(entry.balance);
      actualBetNumber++;
    });

    // Determine if we should show stop loss line (when within 20% of stop loss or already hit it)
    const distanceToStopLoss = currentBalance - stopLossAmount;
    const stopLossRange = startingBalance - stopLossAmount;
    const shouldShowStopLoss = distanceToStopLoss <= (stopLossRange * 0.2) || currentBalance <= stopLossAmount;

    // Calculate smart Y-axis range for better progression visibility
    const minBalance = Math.min(...chartData);
    const maxBalance = Math.max(...chartData);
    const balanceRange = maxBalance - minBalance;
    
    // Aggressive smart padding for better progression visibility
    let padding: number;
    let yMin: number;
    let yMax: number;
    
    if (balanceRange < 2) {
      // Tiny changes - zoom in very close
      padding = 0.5;
      yMin = minBalance - padding;
      yMax = maxBalance + padding;
    } else if (balanceRange < 10) {
      // Small changes - tight zoom
      padding = Math.max(balanceRange * 0.2, 1);
      yMin = minBalance - padding;
      yMax = maxBalance + padding;
    } else if (balanceRange < 50) {
      // Medium changes - moderate zoom
      padding = balanceRange * 0.15;
      yMin = minBalance - padding;
      yMax = maxBalance + padding;
    } else {
      // Large changes - standard zoom but still tight
      padding = balanceRange * 0.08;
      yMin = minBalance - padding;
      yMax = maxBalance + padding;
    }
    
    // Never go below 0 for minimum
    yMin = Math.max(yMin, 0);
    
    // Theme-aware colors
    const profitColor = isDarkTheme ? '#22c55e' : '#059669';
    const warningColor = isDarkTheme ? '#f59e0b' : '#d97706';
    const dangerColor = isDarkTheme ? '#ef4444' : '#dc2626';
    const pointBorderColor = isDarkTheme ? '#1a2c38' : '#ffffff';
    const gridColor = isDarkTheme ? 'rgba(51, 65, 85, 0.3)' : 'rgba(148, 163, 184, 0.3)';
    const textColor = isDarkTheme ? '#e2e8f0' : 'rgba(100, 116, 139, 0.8)';
    const titleColor = isDarkTheme ? '#f1f5f9' : 'rgba(55, 65, 81, 0.9)';

    const datasets = [{
      label: 'Balance',
      data: chartData,
      borderColor: currentBalance >= startingBalance ? profitColor : currentBalance > stopLossAmount ? warningColor : dangerColor,
      backgroundColor: currentBalance >= startingBalance ? 
        (isDarkTheme ? 'rgba(34, 197, 94, 0.15)' : 'rgba(5, 150, 105, 0.2)') : 
        currentBalance > stopLossAmount ? 
          (isDarkTheme ? 'rgba(245, 158, 11, 0.15)' : 'rgba(217, 119, 6, 0.2)') : 
          (isDarkTheme ? 'rgba(239, 68, 68, 0.15)' : 'rgba(220, 38, 38, 0.2)'),
      borderWidth: 3,
      fill: true,
      tension: 0.3,
      pointBackgroundColor: chartData.map((balance, index) => {
        if (index === 0) return isDarkTheme ? '#64748b' : '#6b7280'; // Starting point
        const prevBalance = chartData[index - 1];
        return balance > prevBalance ? profitColor : dangerColor;
      }),
      pointBorderColor: pointBorderColor,
      pointBorderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6
    }];

    // Only add stop loss line if approaching or below it
    if (shouldShowStopLoss) {
      datasets.push({
        label: 'Stop Loss',
        data: Array(labels.length).fill(stopLossAmount),
        borderColor: dangerColor,
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderDash: [8, 4] as any,
        fill: false,
        pointRadius: 0,
        pointHoverRadius: 0,
        tension: 0
      } as any);
    }

    this.profitChart = new (window as any).Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: 'index'
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Bet Number',
              color: titleColor,
              font: {
                size: 12,
                weight: 'bold'
              }
            },
            grid: {
              color: gridColor,
              drawBorder: false
            },
            ticks: {
              color: textColor
            }
          },
          y: {
            title: {
              display: true,
              text: 'Balance ($)',
              color: titleColor,
              font: {
                size: 12,
                weight: 'bold'
              }
            },
            min: yMin,
            max: yMax,
            grid: {
              color: gridColor,
              drawBorder: false
            },
            ticks: {
              color: textColor,
              callback: function(value: any) {
                // Show more precision for small ranges
                if (balanceRange < 10) {
                  return '$' + value.toFixed(2);
                } else if (balanceRange < 100) {
                  return '$' + value.toFixed(1);
                } else {
                  return '$' + value.toFixed(0);
                }
              }
            }
          }
        },
        plugins: {
          legend: {
            display: shouldShowStopLoss,
            position: 'top' as const,
            labels: {
              usePointStyle: true,
              padding: 20,
              font: {
                size: 11
              }
            }
          },
          tooltip: {
            backgroundColor: isDarkTheme ? 'rgba(26, 44, 56, 0.95)' : 'rgba(0, 0, 0, 0.8)',
            titleColor: isDarkTheme ? '#f8fafc' : '#ffffff',
            bodyColor: isDarkTheme ? '#cbd5e1' : '#ffffff',
            borderColor: isDarkTheme ? 'rgba(51, 65, 85, 0.5)' : 'rgba(148, 163, 184, 0.3)',
            borderWidth: 1,
            callbacks: {
              title: function(context: any) {
                return `Bet #${context[0].label}`;
              },
              label: function(context: any) {
                const value = context.parsed.y;
                return `Balance: $${value.toFixed(2)}`;
              }
            }
          }
        }
      }
    });
  }

  private updateConsecutiveStats(outcome: 'Win' | 'Loss'): void {
    if (outcome === 'Win') {
      if (this.currentStreak < 0) {
        // Switching from loss streak to win streak
        this.currentStreak = 1;
      } else {
        // Continuing win streak
        this.currentStreak++;
      }
      this.consecutiveWins = this.currentStreak;
      this.consecutiveLosses = 0;
      this.maxConsecutiveWins = Math.max(this.maxConsecutiveWins, this.consecutiveWins);
      
      // Sync to session data
      if (this.currentSession) {
        this.currentSession.data.maxConsecutiveWins = this.maxConsecutiveWins;
        this.currentSession.data.currentStreak = this.currentStreak;
      }
    } else {
      if (this.currentStreak > 0) {
        // Switching from win streak to loss streak
        this.currentStreak = -1;
      } else {
        // Continuing loss streak
        this.currentStreak--;
      }
      this.consecutiveLosses = Math.abs(this.currentStreak);
      this.consecutiveWins = 0;
      this.maxConsecutiveLosses = Math.max(this.maxConsecutiveLosses, this.consecutiveLosses);
      
      // Sync to session data
      if (this.currentSession) {
        this.currentSession.data.maxConsecutiveLosses = this.maxConsecutiveLosses;
        this.currentSession.data.currentStreak = this.currentStreak;
      }
    }
  }

  private updateLiveStats(): void {
    if (!this.currentSession) return;

    const metadata = this.currentSession.metadata;
    const data = this.currentSession.data;

    // Update profit (current session profit including current cycle)
    const profitElement = this.elements.liveProfit;
    if (profitElement) {
      const currentProfit = data.totalProfit + data.cycleProfit;
      profitElement.textContent = `$${currentProfit.toFixed(2)}`;
      profitElement.classList.toggle('negative', currentProfit < 0);
    }

    // Update wins
    const winsElement = this.elements.liveWins;
    if (winsElement) {
      winsElement.textContent = metadata.totalWins.toString();
    }

    // Update wagered
    const wageredElement = this.elements.liveWagered;
    if (wageredElement) {
      wageredElement.textContent = `$${metadata.totalAmountWagered.toFixed(2)}`;
    }

    // Update losses
    const lossesElement = this.elements.liveLosses;
    if (lossesElement) {
      const totalLosses = metadata.totalBets - metadata.totalWins;
      lossesElement.textContent = totalLosses.toString();
    }

    // Update win rate with color coding
    const winRateElement = this.elements.liveWinRate;
    if (winRateElement) {
      const winRate = metadata.totalBets > 0 ? (metadata.totalWins / metadata.totalBets * 100) : 0;
      const winRateText = `${winRate.toFixed(1)}%`;
      
      // Use risk-reward multiplier directly (1.0 for even money)
      const effectiveRiskReward = metadata.evenMoney ? 1.0 : metadata.riskRewardMultiplier;
      
      // Calculate optimal win rate based on risk-reward multiplier
      const requiredWinRate = this.calculateRequiredWinRate(effectiveRiskReward);
      
      // Determine color based on performance vs required win rate
      let colorClass = '';
      if (metadata.totalBets === 0) {
        colorClass = 'neutral'; // No bets yet
      } else if (winRate >= requiredWinRate.excellent) {
        colorClass = 'excellent'; // Excellent performance
      } else if (winRate >= requiredWinRate.good) {
        colorClass = 'good'; // Good performance  
      } else if (winRate >= requiredWinRate.acceptable) {
        colorClass = 'acceptable'; // Acceptable performance
      } else if (winRate >= requiredWinRate.poor) {
        colorClass = 'poor'; // Poor performance
      } else {
        colorClass = 'terrible'; // Terrible performance
      }
      
      winRateElement.textContent = winRateText;
      winRateElement.className = `live-stat-value win-rate-${colorClass}`;
    }

    // Update current streak
    const streakElement = this.elements.currentStreak;
    if (streakElement) {
      if (this.currentStreak === 0) {
        streakElement.textContent = '-';
        streakElement.className = 'live-stat-value';
      } else if (this.currentStreak > 0) {
        streakElement.textContent = `${this.currentStreak}W`;
        streakElement.className = 'live-stat-value win-streak';
      } else {
        streakElement.textContent = `${Math.abs(this.currentStreak)}L`;
        streakElement.className = 'live-stat-value loss-streak';
      }
    }

    // Update max consecutive wins
    const maxWinsElement = this.elements.maxWins;
    if (maxWinsElement) {
      maxWinsElement.textContent = this.maxConsecutiveWins.toString();
    }

    // Update max consecutive losses
    const maxLossesElement = this.elements.maxLosses;
    if (maxLossesElement) {
      maxLossesElement.textContent = this.maxConsecutiveLosses.toString();
    }

    // Update or initialize chart
    this.initializeProfitChart();
  }

  private toggleTheme(): void {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    this.setTheme(newTheme);
    this.saveThemePreference(newTheme);
  }

  private setTheme(theme: 'light' | 'dark'): void {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }

    // Update theme toggle icon
    const themeIcon = this.elements.themeToggle?.querySelector('i');
    if (themeIcon) {
      if (theme === 'dark') {
        themeIcon.className = 'fas fa-sun';
        this.elements.themeToggle.setAttribute('title', 'Switch to Light Theme');
      } else {
        themeIcon.className = 'fas fa-moon';
        this.elements.themeToggle.setAttribute('title', 'Switch to Dark Theme');
      }
    }

    // Update chart if it exists
    if (this.profitChart && this.currentSession) {
      this.initializeProfitChart();
    }
  }

  private saveThemePreference(theme: 'light' | 'dark'): void {
    try {
      localStorage.setItem('theme-preference', theme);
    } catch (error) {
      console.warn('Could not save theme preference:', error);
    }
  }

  private loadThemePreference(): void {
    try {
      const savedTheme = localStorage.getItem('theme-preference') as 'light' | 'dark' | null;
      if (savedTheme) {
        this.setTheme(savedTheme);
      } else {
        // Check system preference
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        this.setTheme(prefersDark ? 'dark' : 'light');
      }
    } catch (error) {
      console.warn('Could not load theme preference:', error);
      // Fallback to system preference
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.setTheme(prefersDark ? 'dark' : 'light');
    }
  }

  private setElementText(elementId: string, text: string): void {
    const element = this.elements[elementId];
    if (element) {
      element.textContent = text;
    }
  }

  private toggleElementState(elementId: string, enabled: boolean): void {
    const element = this.elements[elementId] as HTMLButtonElement | HTMLInputElement;
    if (element) {
      element.disabled = !enabled;
    }
  }

  // Modal Methods
  private showConfirmModal(title: string, message: string, onConfirm: () => void, onCancel?: () => void): void {
    this.setElementText('modalTitle', title);
    this.setElementText('modalMessage', message);
    
    const confirmBtn = this.elements.modalConfirm;
    const cancelBtn = this.elements.modalCancel;
    const overlay = this.elements.modalOverlay;
    
    if (confirmBtn && overlay) {
      // Remove existing event listeners
      const newConfirmBtn = confirmBtn.cloneNode(true) as HTMLElement;
      const newCancelBtn = cancelBtn?.cloneNode(true) as HTMLElement;
      
      confirmBtn.parentNode?.replaceChild(newConfirmBtn, confirmBtn);
      if (cancelBtn && newCancelBtn) {
        cancelBtn.parentNode?.replaceChild(newCancelBtn, cancelBtn);
        this.elements.modalCancel = newCancelBtn;
        
        newCancelBtn.addEventListener('click', () => {
          if (onCancel) onCancel();
          this.hideModal();
        });
      }
      
      this.elements.modalConfirm = newConfirmBtn;
      
      // Add new event listener
      newConfirmBtn.addEventListener('click', () => {
        onConfirm();
        this.hideModal();
      });
      
      overlay.style.display = 'flex';
    }
  }

  private hideModal(): void {
    const overlay = this.elements.modalOverlay;
    if (overlay) {
      overlay.style.display = 'none';
    }
  }

  private showElement(elementId: string): void {
    const element = this.elements[elementId];
    if (element) {
      (element as HTMLElement).style.display = 'flex';
    }
  }

  private hideElement(elementId: string): void {
    const element = this.elements[elementId];
    if (element) {
      (element as HTMLElement).style.display = 'none';
    }
  }

  // Settings Methods
  private openSettings(): void {
    this.updateSettingsUI();
    this.showElement('settingsOverlay');
  }

  private closeSettings(): void {
    this.hideElement('settingsOverlay');
  }

  private showSetupGuide(): void {
    this.showElement('setupGuideOverlay');
  }

  private closeSetupGuide(): void {
    this.hideElement('setupGuideOverlay');
  }

  // Balance Update Methods
  private showBalanceUpdate(context: string): void {
    if (!this.currentSession?.data.balance) return;
    
    const appBalance = this.currentSession.data.balance;
    (this.elements.appCurrentBalance as HTMLElement).textContent = this.formatCurrency(appBalance).replace('$', '');
    (this.elements.actualBalance as HTMLInputElement).value = '';
    this.hideElement('balanceDifference');
    
    // Store context for after the update
    (this.elements.balanceUpdateOverlay as any).dataset.context = context;
    
    this.showElement('balanceUpdateOverlay');
  }

  private closeBalanceUpdate(): void {
    this.hideElement('balanceUpdateOverlay');
  }

  private updateBalanceDifference(): void {
    const actualBalanceInput = this.elements.actualBalance as HTMLInputElement;
    const actualBalanceValue = parseFloat(actualBalanceInput.value);
    
    if (isNaN(actualBalanceValue) || !this.currentSession?.data.balance) {
      this.hideElement('balanceDifference');
      return;
    }
    
    const appBalance = this.currentSession.data.balance;
    const difference = actualBalanceValue - appBalance;
    const differenceElement = this.elements.balanceDifference?.querySelector('.difference-amount');
    const explanationElement = this.elements.balanceDifference?.querySelector('.difference-explanation');
    
    if (differenceElement && explanationElement) {
      const absoluteDifference = Math.abs(difference);
      
      if (absoluteDifference < 0.01) {
        differenceElement.textContent = 'Perfect match!';
        differenceElement.className = 'difference-amount match';
        explanationElement.textContent = 'Your actual balance matches the app calculation.';
      } else if (difference > 0) {
        differenceElement.textContent = `+${this.formatCurrency(difference)}`;
        differenceElement.className = 'difference-amount positive';
        explanationElement.textContent = 'You have more than expected - possibly due to bonuses or promotional wins.';
      } else {
        differenceElement.textContent = `-${this.formatCurrency(absoluteDifference)}`;
        differenceElement.className = 'difference-amount negative';
        explanationElement.textContent = 'You have less than expected - possibly due to fees or different bet calculations.';
      }
      
      this.showElement('balanceDifference');
    }
  }

  private confirmBalanceUpdate(): void {
    const actualBalanceInput = this.elements.actualBalance as HTMLInputElement;
    const actualBalance = parseFloat(actualBalanceInput.value);
    
    if (isNaN(actualBalance) || actualBalance < 0) {
      this.showToast('Please enter a valid balance amount', 'error');
      return;
    }
    
    if (!this.currentSession) return;
    
    const oldBalance = this.currentSession.data.balance;
    const difference = actualBalance - oldBalance;
    
    // Update the session balance
    this.currentSession.data.balance = actualBalance;
    
    // Update pot balance if applicable
    this.updatePotBalance(actualBalance);
    
    // Add a history entry for the balance adjustment
    if (Math.abs(difference) >= 0.01) {
      this.addToHistory('BALANCE_ADJUSTMENT' as any, 0, difference);
    }
    
    // Update all displays
    this.updateAllDisplays();
    
    // Auto-save the session
    this.autoSaveIfEnabled();
    
    const context = (this.elements.balanceUpdateOverlay as any).dataset.context || 'session event';
    this.showToast(`Balance updated after ${context}. Adjustment: ${difference >= 0 ? '+' : ''}${this.formatCurrency(difference)}`, 'success');
    
    this.closeBalanceUpdate();
  }

  private updatePotBalance(newBalance: number): void {
    if (!this.currentSession?.metadata.selectedPotId) return;
    
    try {
      const bankrollUI = (window as any).bankrollUI;
      if (bankrollUI && typeof bankrollUI.updatePotAfterSession === 'function') {
        const originalBalance = this.currentSession.metadata.startingBankroll;
        const isWin = newBalance > originalBalance;
        bankrollUI.updatePotAfterSession(this.currentSession.metadata.selectedPotId, newBalance, isWin);
        this.showToast('Pot balance updated successfully', 'success');
      }
    } catch (error) {
      console.error('Error updating pot balance:', error);
      this.showToast('Failed to update pot balance', 'error');
    }
  }

  private updateSettingsUI(): void {
    this.updateLocalStorageInfo();
  }


  private updateLocalStorageInfo(): void {
    const sessions = this.getSavedSessions();
    if (this.elements.localSessionCount) {
      this.elements.localSessionCount.textContent = sessions.length.toString();
    }

    // Calculate approximate storage size
    let totalSize = 0;
    sessions.forEach(sessionName => {
      const sessionData = localStorage.getItem(`labouchere_session_${sessionName}`);
      if (sessionData) {
        totalSize += sessionData.length;
      }
    });

    const sizeKB = Math.round(totalSize / 1024 * 100) / 100;
    if (this.elements.localStorageSize) {
      this.elements.localStorageSize.textContent = `${sizeKB} KB`;
    }
  }

  private async saveSettings(): Promise<void> {
    // This method doesn't need to do much since credentials are saved when connecting
    this.showToast('Settings saved', 'success');
    this.closeSettings();
  }

  // Toast Methods
  private showToast(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info'): void {
    const container = this.elements.toastContainer;
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = this.getToastIcon(type);
    toast.innerHTML = `<i class="${icon}"></i><span>${message}</span>`;
    
    container.appendChild(toast);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (toast.parentNode) {
        container.removeChild(toast);
      }
    }, 5000);

    // Make toast clickable to dismiss
    toast.addEventListener('click', () => {
      if (toast.parentNode) {
        container.removeChild(toast);
      }
    });
  }

  private getToastIcon(type: string): string {
    switch (type) {
      case 'success': return 'fas fa-check-circle';
      case 'error': return 'fas fa-exclamation-circle';
      case 'warning': return 'fas fa-exclamation-triangle';
      case 'info': default: return 'fas fa-info-circle';
    }
  }

  // Reshuffle Methods
  private showReshuffleModal(): void {
    if (!this.currentSession || !this.isSessionActive) {
      this.showToast('No active session to reshuffle', 'error');
      return;
    }

    const data = this.currentSession.data;
    const metadata = this.currentSession.metadata;
    
    // Check if there are remaining cycles
    if (data.currentCycle > metadata.numberOfCycles) {
      this.showToast('No remaining cycles to reshuffle', 'error');
      return;
    }

    // Calculate remaining sum from current and pending cycles
    const remainingSum = this.calculateRemainingSum();
    
    // Update modal with remaining sum
    const remainingSumElement = this.elements.remainingSum;
    if (remainingSumElement) {
      remainingSumElement.textContent = remainingSum.toFixed(2);
    }

    // Clear previous input and preview
    const newCycleCountInput = this.elements.newCycleCount as HTMLInputElement;
    if (newCycleCountInput) {
      newCycleCountInput.value = '';
    }
    this.hideElement('cyclePreview');

    this.showElement('reshuffleOverlay');
  }

  private closeReshuffleModal(): void {
    this.hideElement('reshuffleOverlay');
  }

  private calculateRemainingSum(): number {
    if (!this.currentSession) return 0;

    const data = this.currentSession.data;
    let totalSum = 0;

    // Add current cycle sum
    totalSum += data.sequence.reduce((sum, val) => sum + val, 0);

    // Add all pending cycles sum
    for (let i = data.currentCycle; i < data.allCycleSequences.length; i++) {
      totalSum += data.allCycleSequences[i].reduce((sum, val) => sum + val, 0);
    }

    return totalSum;
  }

  private updateReshufflePreview(): void {
    const newCycleCountInput = this.elements.newCycleCount as HTMLInputElement;
    const newCycleCount = parseInt(newCycleCountInput.value);

    if (!newCycleCount || newCycleCount <= 0 || !this.currentSession) {
      this.hideElement('cyclePreview');
      return;
    }

    const remainingSum = this.calculateRemainingSum();
    const valuePerCycle = remainingSum / (newCycleCount * 4); // 4 entries per cycle
    
    // Update preview elements
    const valuePerCycleElement = this.elements.valuePerCycle;
    const cycleValuePreviewElement = this.elements.cycleValuePreview;

    if (valuePerCycleElement && cycleValuePreviewElement) {
      const roundedValue = this.ensureMinimumBet(valuePerCycle, this.currentSession.metadata.minimumBet);
      
      valuePerCycleElement.textContent = roundedValue.toFixed(2);
      cycleValuePreviewElement.textContent = 
        `${roundedValue.toFixed(2)} + ${roundedValue.toFixed(2)} + ${roundedValue.toFixed(2)} + ${roundedValue.toFixed(2)}`;
    }

    this.showElement('cyclePreview');
  }

  private confirmReshuffle(): void {
    if (!this.currentSession || !this.isSessionActive) {
      this.showToast('No active session', 'error');
      return;
    }

    const newCycleCountInput = this.elements.newCycleCount as HTMLInputElement;
    const newCycleCount = parseInt(newCycleCountInput.value);

    if (!newCycleCount || newCycleCount <= 0) {
      this.showToast('Please enter a valid number of cycles', 'error');
      return;
    }

    const data = this.currentSession.data;
    const metadata = this.currentSession.metadata;
    const remainingSum = this.calculateRemainingSum();
    const valuePerEntry = remainingSum / (newCycleCount * 4);
    const roundedValuePerEntry = this.ensureMinimumBet(valuePerEntry, metadata.minimumBet);

    // Create new cycle sequences
    const newCycleSequences: number[][] = [];
    for (let i = 0; i < newCycleCount; i++) {
      newCycleSequences.push([
        roundedValuePerEntry,
        roundedValuePerEntry,
        roundedValuePerEntry,
        roundedValuePerEntry
      ]);
    }

    // Update session data
    data.allCycleSequences = [
      // Keep completed cycles
      ...data.allCycleSequences.slice(0, data.currentCycle - 1),
      // Add new reshuffled cycles
      ...newCycleSequences
    ];

    // Set current sequence to first new cycle
    data.sequence = [...newCycleSequences[0]];
    
    // Update metadata
    metadata.numberOfCycles = data.currentCycle - 1 + newCycleCount;

    // Auto-sort the new sequence if enabled
    if (this.shouldAutoSort() && data.sequence.length > 0) {
      data.sequence.sort((a, b) => a - b);
      data.allCycleSequences[data.currentCycle - 1] = [...data.sequence];
    }

    // Add reshuffle entry to history
    this.addToHistory('RESHUFFLE' as any, newCycleCount, remainingSum);

    // Update all displays
    this.updateAllDisplays();

    // Auto-save if enabled
    this.autoSaveIfEnabled();

    // Close modal and show success message
    this.closeReshuffleModal();
    this.showToast(`Cycles reshuffled successfully. Created ${newCycleCount} new cycles.`, 'success');
  }

  // Analytics Methods
  private async showAnalytics(): Promise<void> {
    // Hide other panels by finding them by class name
    const sessionPanel = document.querySelector('.session-panel') as HTMLElement;
    const mainPanelsGrid = this.elements.mainPanelsGrid as HTMLElement;
    const liveStatsPanel = this.elements.liveStatsPanel as HTMLElement;
    const historyPanel = this.elements.historyPanel as HTMLElement;
    
    if (sessionPanel) sessionPanel.style.display = 'none';
    if (mainPanelsGrid) mainPanelsGrid.style.display = 'none';
    if (liveStatsPanel) liveStatsPanel.style.display = 'none';
    if (historyPanel) historyPanel.style.display = 'none';

    // Show analytics panel
    this.showElement('analyticsPanel');

    // Initialize analytics data
    await this.initializeAnalytics();
  }

  private closeAnalytics(): void {
    this.hideElement('analyticsPanel');
    
    // Show the session panel again
    const sessionPanel = document.querySelector('.session-panel') as HTMLElement;
    if (sessionPanel) sessionPanel.style.display = 'block';
    
    // If there's an active session, show the appropriate panels
    if (this.isSessionActive) {
      this.showElement('mainPanelsGrid');
      this.showElement('liveStatsPanel');
      this.showElement('historyPanel');
    }
  }

  private switchAnalyticsView(view: 'dashboard' | 'calendar'): void {
    this.currentAnalyticsView = view;
    
    // Update button states
    const dashboardBtn = this.elements.dashboardViewBtn;
    const calendarBtn = this.elements.calendarViewBtn;
    
    if (dashboardBtn && calendarBtn) {
      dashboardBtn.classList.toggle('active', view === 'dashboard');
      calendarBtn.classList.toggle('active', view === 'calendar');
    }
    
    // Show/hide views
    const dashboardView = this.elements.dashboardView;
    const calendarView = this.elements.calendarView;
    
    if (dashboardView && calendarView) {
      dashboardView.style.display = view === 'dashboard' ? 'block' : 'none';
      calendarView.style.display = view === 'calendar' ? 'block' : 'none';
    }
    
    // Initialize the appropriate view
    if (view === 'dashboard') {
      this.initializeDashboard();
    } else {
      this.initializeCalendar();
    }
  }

  private async initializeAnalytics(): Promise<void> {
    // Load all completed sessions from cloud (single source of truth)
    this.filteredSessions = await this.getCompletedSessions();
    
    // Populate casino filter
    this.populateCasinoFilter();
    
    // Initialize dashboard view by default
    this.switchAnalyticsView('dashboard');
  }

  private async getCompletedSessions(): Promise<SessionFile[]> {
    const allSessions = [...this.getSavedSessions(), ...(await this.getCloudSessions())];
    // Remove duplicates
    const uniqueSessionNames = [...new Set(allSessions)];
    const completedSessions: SessionFile[] = [];
    
    for (const sessionName of uniqueSessionNames) {
      try {
        let session: SessionFile | null = null;
        
        // Try to load from cloud first (single source of truth for completion status)
        try {
          const cloudStorage = await this.authManager.getCloudStorage();
          const isSignedIn = await cloudStorage.isSignedIn();
          if (isSignedIn) {
            const cloudResult = await cloudStorage.loadSession(sessionName);
            if (cloudResult.success && cloudResult.data) {
              session = cloudResult.data as unknown as SessionFile;
            }
          }
        } catch (cloudError) {
          console.warn(`Failed to load ${sessionName} from cloud for analytics, trying localStorage:`, cloudError);
        }
        
        // Fall back to localStorage only if cloud load failed or user not signed in
        if (!session) {
          const sessionData = localStorage.getItem(`labouchere_session_${sessionName}`);
          if (sessionData) {
            session = JSON.parse(sessionData);
          }
        }
        
        if (session && this.isSessionCompleted(session)) {
          completedSessions.push(session);
        }
      } catch (error) {
        console.error(`Error loading session ${sessionName}:`, error);
      }
    }
    
    return completedSessions.sort((a, b) => 
      new Date(a.metadata.sessionStartTime).getTime() - new Date(b.metadata.sessionStartTime).getTime()
    );
  }

  private isSessionCompleted(session: SessionFile): boolean {
    const metadata = session.metadata;
    const data = session.data;
    
    // Session is completed if:
    // 1. Profit goal was reached
    const profitGoalReached = data.totalProfit >= metadata.profitGoal;
    
    // 2. Stop loss was hit
    const stopLossHit = data.balance <= (metadata.startingBankroll - metadata.stopLoss);
    
    // 3. All cycles were completed successfully (balance went up and all sequences empty)
    const allSequencesEmpty = data.allCycleSequences.every((cycle: number[]) => cycle.length === 0);
    const hadBettingActivity = session.history.length > 0;
    const allCyclesCompleted = allSequencesEmpty && hadBettingActivity && data.totalProfit > 0;
    
    // 4. Session was manually ended by user
    const manuallyEnded = metadata.isManuallyEnded;
    
    return profitGoalReached || stopLossHit || allCyclesCompleted || manuallyEnded;
  }

  private populateCasinoFilter(): void {
    const casinoFilter = this.elements.casinoFilter as HTMLSelectElement;
    if (!casinoFilter) return;
    
    // Get unique casinos
    const casinos = new Set<string>();
    this.filteredSessions.forEach(session => {
      if (session.metadata.casinoName.trim()) {
        casinos.add(session.metadata.casinoName);
      }
    });
    
    // Clear existing options except "All casinos"
    casinoFilter.innerHTML = '<option value="">All casinos</option>';
    
    // Add casino options
    Array.from(casinos).sort().forEach(casino => {
      const option = document.createElement('option');
      option.value = casino;
      option.textContent = casino;
      casinoFilter.appendChild(option);
    });
  }

  private handleDateRangeChange(): void {
    const dateRangeFilter = this.elements.dateRangeFilter as HTMLSelectElement;
    const customDateInputs = this.elements.customDateInputs;
    
    if (dateRangeFilter && customDateInputs) {
      const showCustomInputs = dateRangeFilter.value === 'custom';
      customDateInputs.style.display = showCustomInputs ? 'flex' : 'none';
    }
  }

  private async applyAnalyticsFilters(): Promise<void> {
    const dateRangeFilter = this.elements.dateRangeFilter as HTMLSelectElement;
    const gameFilter = this.elements.gameFilter as HTMLSelectElement;
    const casinoFilter = this.elements.casinoFilter as HTMLSelectElement;
    const startDate = this.elements.startDate as HTMLInputElement;
    const endDate = this.elements.endDate as HTMLInputElement;
    
    let filtered = await this.getCompletedSessions();
    
    // Apply date filter
    if (dateRangeFilter.value !== 'all') {
      const now = new Date();
      let startRange: Date;
      
      if (dateRangeFilter.value === 'custom') {
        if (startDate.value) {
          startRange = new Date(startDate.value);
        } else {
          startRange = new Date(0); // Beginning of time
        }
        
        const endRange = endDate.value ? new Date(endDate.value) : now;
        
        filtered = filtered.filter(session => {
          const sessionDate = new Date(session.metadata.sessionStartTime);
          return sessionDate >= startRange && sessionDate <= endRange;
        });
      } else {
        const days = parseInt(dateRangeFilter.value);
        startRange = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        
        filtered = filtered.filter(session => {
          const sessionDate = new Date(session.metadata.sessionStartTime);
          return sessionDate >= startRange;
        });
      }
    }
    
    // Apply game filter
    if (gameFilter.value) {
      filtered = filtered.filter(session => session.metadata.gameType === gameFilter.value);
    }
    
    // Apply casino filter
    if (casinoFilter.value) {
      filtered = filtered.filter(session => session.metadata.casinoName === casinoFilter.value);
    }
    
    this.filteredSessions = filtered;
    
    // Refresh current view
    if (this.currentAnalyticsView === 'dashboard') {
      this.initializeDashboard();
    } else {
      this.initializeCalendar();
    }
    
    this.showToast(`Applied filters - ${filtered.length} sessions found`, 'info');
  }

  private async resetAnalyticsFilters(): Promise<void> {
    // Reset all filter controls
    const dateRangeFilter = this.elements.dateRangeFilter as HTMLSelectElement;
    const gameFilter = this.elements.gameFilter as HTMLSelectElement;
    const casinoFilter = this.elements.casinoFilter as HTMLSelectElement;
    const startDate = this.elements.startDate as HTMLInputElement;
    const endDate = this.elements.endDate as HTMLInputElement;
    
    if (dateRangeFilter) dateRangeFilter.value = '30';
    if (gameFilter) gameFilter.value = '';
    if (casinoFilter) casinoFilter.value = '';
    if (startDate) startDate.value = '';
    if (endDate) endDate.value = '';
    
    // Hide custom date inputs
    this.handleDateRangeChange();
    
    // Reset filtered sessions
    await this.applyAnalyticsFilters();
  }

  private initializeDashboard(): void {
    this.createEquityCurve();
    this.updatePerformanceStats();
  }

  private createEquityCurve(): void {
    const canvas = this.elements.equityCurveChart as HTMLCanvasElement;
    if (!canvas) return;

    // Destroy existing chart
    if (this.equityCurveChart) {
      this.equityCurveChart.destroy();
    }

    // Prepare data for equity curve
    const equityData = this.prepareEquityCurveData();
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Theme detection and colors
    const isDarkTheme = document.documentElement.getAttribute('data-theme') === 'dark' || 
                       (!document.documentElement.getAttribute('data-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    const gridColor = isDarkTheme ? 'rgba(51, 65, 85, 0.3)' : 'rgba(148, 163, 184, 0.3)';
    const textColor = isDarkTheme ? '#e2e8f0' : 'rgba(100, 116, 139, 0.8)';
    const titleColor = isDarkTheme ? '#f1f5f9' : 'rgba(55, 65, 81, 0.9)';
    const zerLineColor = isDarkTheme ? 'rgba(226, 232, 240, 0.4)' : 'rgba(100, 116, 139, 0.4)';

    this.equityCurveChart = new (window as any).Chart(ctx, {
      type: 'line',
      data: {
        labels: equityData.labels,
        datasets: [{
          label: 'Daily P/L',
          data: equityData.values,
          borderColor: '#4CAF50',
          backgroundColor: 'rgba(76, 175, 80, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            title: {
              display: true,
              text: 'Date',
              color: titleColor
            },
            ticks: {
              color: textColor
            },
            grid: {
              color: gridColor,
              drawBorder: false
            }
          },
          y: {
            title: {
              display: true,
              text: 'Profit/Loss ($)',
              color: titleColor
            },
            ticks: {
              color: textColor
            },
            grid: {
              color: (ctx: any) => ctx.tick.value === 0 ? zerLineColor : gridColor,
              drawBorder: false
            }
          }
        },
        plugins: {
          title: {
            display: true,
            text: 'Equity Curve vs Date',
            color: titleColor
          },
          legend: {
            display: true,
            position: 'top',
            labels: {
              color: textColor
            }
          }
        }
      }
    });
  }

  private prepareEquityCurveData(): { labels: string[], values: number[] } {
    if (this.filteredSessions.length === 0) {
      return { labels: [], values: [] };
    }

    // Group sessions by date and sum P/L
    const dailyPL = new Map<string, number>();
    
    this.filteredSessions.forEach(session => {
      const date = new Date(session.metadata.sessionStartTime);
      const dateStr = this.formatDateToLocalString(date);
      const currentPL = dailyPL.get(dateStr) || 0;
      dailyPL.set(dateStr, currentPL + session.data.totalProfit);
    });

    // Convert to arrays and calculate cumulative P/L
    const sortedEntries = Array.from(dailyPL.entries()).sort();
    const labels: string[] = [];
    const values: number[] = [];
    let cumulative = 0;

    sortedEntries.forEach(([date, pl]) => {
      cumulative += pl;
      labels.push(this.formatDateForChart(date));
      values.push(cumulative);
    });

    return { labels, values };
  }

  private formatDateForChart(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  private formatDateToLocalString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private updatePerformanceStats(): void {
    if (this.filteredSessions.length === 0) {
      this.clearPerformanceStats();
      return;
    }

    const stats = this.calculatePerformanceStats();
    
    // Update all stat elements
    this.updateStatElement('totalSessions', this.filteredSessions.length.toString());
    this.updateStatElement('completedSessions', this.filteredSessions.length.toString());
    this.updateStatElement('totalProfit', this.formatCurrency(stats.totalProfit));
    this.updateStatElement('avgSessionProfit', this.formatCurrency(stats.avgSessionProfit));
    this.updateStatElement('totalWagered', this.formatCurrency(stats.totalWagered));
    this.updateStatElement('winRate', `${stats.winRate.toFixed(1)}%`);
    this.updateStatElement('maxConsecutiveWins', stats.maxConsecutiveWins.toString());
    this.updateStatElement('maxConsecutiveLosses', stats.maxConsecutiveLosses.toString());
    this.updateStatElement('avgSessionTime', this.formatDuration(stats.avgSessionTime));
    this.updateStatElement('profitableSessions', `${stats.profitableSessionsPercent.toFixed(1)}%`);
    this.updateStatElement('largestWin', this.formatCurrency(stats.largestWin));
    this.updateStatElement('largestLoss', this.formatCurrency(stats.largestLoss));
  }

  private calculatePerformanceStats() {
    const stats = {
      totalProfit: 0,
      avgSessionProfit: 0,
      totalWagered: 0,
      winRate: 0,
      maxConsecutiveWins: 0,
      maxConsecutiveLosses: 0,
      avgSessionTime: 0,
      profitableSessionsPercent: 0,
      largestWin: 0,
      largestLoss: 0
    };

    if (this.filteredSessions.length === 0) return stats;

    let totalWins = 0;
    let totalBets = 0;
    let totalDuration = 0;
    let profitableSessions = 0;

    this.filteredSessions.forEach(session => {
      const profit = session.data.totalProfit;
      stats.totalProfit += profit;
      stats.totalWagered += session.metadata.totalAmountWagered;
      totalWins += session.metadata.totalWins;
      totalBets += session.metadata.totalBets;
      totalDuration += session.metadata.sessionDuration;

      if (profit > 0) {
        profitableSessions++;
        stats.largestWin = Math.max(stats.largestWin, profit);
      } else if (profit < 0) {
        stats.largestLoss = Math.min(stats.largestLoss, profit);
      }

      stats.maxConsecutiveWins = Math.max(stats.maxConsecutiveWins, session.data.maxConsecutiveWins);
      stats.maxConsecutiveLosses = Math.max(stats.maxConsecutiveLosses, session.data.maxConsecutiveLosses);
    });

    stats.avgSessionProfit = stats.totalProfit / this.filteredSessions.length;
    stats.winRate = totalBets > 0 ? (totalWins / totalBets) * 100 : 0;
    stats.avgSessionTime = totalDuration / this.filteredSessions.length;
    stats.profitableSessionsPercent = (profitableSessions / this.filteredSessions.length) * 100;

    return stats;
  }

  private updateStatElement(elementId: string, value: string): void {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = value;
      
      // Add color coding for profit/loss values
      if (elementId.includes('Profit') || elementId.includes('Win') || elementId.includes('Loss')) {
        const numValue = parseFloat(value.replace(/[$,%]/g, ''));
        if (!isNaN(numValue)) {
          element.className = numValue > 0 ? 'stat-value positive' : 
                             numValue < 0 ? 'stat-value negative' : 'stat-value';
        }
      }
    }
  }

  private clearPerformanceStats(): void {
    const statIds = [
      'totalSessions', 'completedSessions', 'totalProfit', 'avgSessionProfit',
      'totalWagered', 'winRate', 'maxConsecutiveWins', 'maxConsecutiveLosses',
      'avgSessionTime', 'profitableSessions', 'largestWin', 'largestLoss'
    ];
    
    statIds.forEach(id => this.updateStatElement(id, '0'));
  }

  private initializeCalendar(): void {
    this.renderCalendar();
  }

  private navigateMonth(direction: number): void {
    this.currentCalendarMonth.setMonth(this.currentCalendarMonth.getMonth() + direction);
    this.renderCalendar();
  }

  private renderCalendar(): void {
    const calendarDays = this.elements.calendarDays;
    const currentMonth = this.elements.currentMonth;
    const monthlyTitle = this.elements.monthlyTitle;
    
    if (!calendarDays || !currentMonth || !monthlyTitle) return;

    // Update month display
    const monthYear = this.currentCalendarMonth.toLocaleDateString('en-US', { 
      month: 'long', 
      year: 'numeric' 
    });
    currentMonth.textContent = monthYear;
    monthlyTitle.textContent = `${monthYear} Summary`;

    // Clear existing calendar days
    calendarDays.innerHTML = '';

    // Get first day of month and number of days
    const firstDay = new Date(this.currentCalendarMonth.getFullYear(), this.currentCalendarMonth.getMonth(), 1);
    const lastDay = new Date(this.currentCalendarMonth.getFullYear(), this.currentCalendarMonth.getMonth() + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay()); // Start from Sunday

    // Generate calendar data
    const calendarData = this.generateCalendarData(firstDay, lastDay);
    
    // Create calendar cells
    for (let i = 0; i < 42; i++) { // 6 weeks × 7 days
      const cellDate = new Date(startDate);
      cellDate.setDate(startDate.getDate() + i);
      
      const dayData = calendarData.get(this.formatDateToLocalString(cellDate));
      const isCurrentMonth = cellDate.getMonth() === this.currentCalendarMonth.getMonth();
      
      const dayCell = this.createCalendarDay(cellDate, dayData, isCurrentMonth);
      calendarDays.appendChild(dayCell);
    }

    // Update monthly summary
    this.updateMonthlySummary(calendarData);
  }

  private generateCalendarData(firstDay: Date, lastDay: Date): Map<string, any> {
    const calendarData = new Map();
    
    // Filter sessions for current month
    const monthSessions = this.filteredSessions.filter(session => {
      const sessionDate = new Date(session.metadata.sessionStartTime);
      return sessionDate >= firstDay && sessionDate <= lastDay;
    });

    // Group sessions by date
    monthSessions.forEach(session => {
      const date = new Date(session.metadata.sessionStartTime);
      const dateStr = this.formatDateToLocalString(date);
      
      if (!calendarData.has(dateStr)) {
        calendarData.set(dateStr, {
          sessions: [],
          totalPL: 0,
          winCount: 0,
          lossCount: 0
        });
      }
      
      const dayData = calendarData.get(dateStr);
      dayData.sessions.push(session);
      dayData.totalPL += session.data.totalProfit;
      
      if (session.data.totalProfit > 0) {
        dayData.winCount++;
      } else if (session.data.totalProfit < 0) {
        dayData.lossCount++;
      }
    });

    return calendarData;
  }

  private createCalendarDay(date: Date, dayData: any, isCurrentMonth: boolean): HTMLElement {
    const dayCell = document.createElement('div');
    dayCell.className = `calendar-day ${isCurrentMonth ? 'current-month' : 'other-month'}`;
    
    if (dayData && dayData.sessions.length > 0) {
      dayCell.classList.add(dayData.totalPL > 0 ? 'profit-day' : 'loss-day');
      
      dayCell.innerHTML = `
        <div class="day-number">${date.getDate()}</div>
        <div class="day-pl">${this.formatCurrency(dayData.totalPL)}</div>
        <div class="day-sessions">
          V: ${dayData.winCount} T: ${dayData.sessions.length} W: ${dayData.winCount} L: ${dayData.lossCount}
        </div>
      `;
      
      // Add click handler to show sessions for this day
      dayCell.addEventListener('click', () => this.showDaySessions(date, dayData.sessions));
    } else {
      dayCell.innerHTML = `<div class="day-number">${date.getDate()}</div>`;
    }
    
    return dayCell;
  }

  private updateMonthlySummary(calendarData: Map<string, any>): void {
    let totalPL = 0;
    let totalSessions = 0;
    
    calendarData.forEach(dayData => {
      totalPL += dayData.totalPL;
      totalSessions += dayData.sessions.length;
    });
    
    // Count trading days (days with sessions)
    const tradingDays = calendarData.size;
    const avgPerDay = tradingDays > 0 ? totalPL / tradingDays : 0;
    
    this.updateStatElement('monthlyProfit', this.formatCurrency(totalPL));
    this.updateStatElement('monthlySessions', totalSessions.toString());
    this.updateStatElement('monthlyAvgPerDay', this.formatCurrency(avgPerDay));
  }

  private showDaySessions(date: Date, sessions: SessionFile[]): void {
    if (sessions.length === 1) {
      this.showSessionDetail(sessions[0]);
    } else {
      this.showSessionSelection(date, sessions);
    }
  }

  private showSessionSelection(date: Date, sessions: SessionFile[]): void {
    const dateStr = date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    const titleElement = document.getElementById('sessionSelectionTitle');
    const messageElement = document.getElementById('sessionSelectionMessage');
    
    if (titleElement) {
      titleElement.textContent = `Sessions for ${dateStr}`;
    }
    
    if (messageElement) {
      messageElement.textContent = `${sessions.length} sessions found for this day. Select which session to view:`;
    }
    
    this.populateSessionList(sessions);
    this.showElement('sessionSelectionOverlay');
  }

  private populateSessionList(sessions: SessionFile[]): void {
    const sessionList = this.elements.sessionList;
    if (!sessionList) return;
    
    sessionList.innerHTML = '';
    
    sessions.forEach(session => {
      const sessionItem = document.createElement('div');
      sessionItem.className = 'session-item';
      
      const startTime = new Date(session.metadata.sessionStartTime);
      const timeStr = startTime.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      
      const duration = session.metadata.sessionDuration;
      const durationStr = this.formatDuration(duration);
      
      const plClass = session.data.totalProfit >= 0 ? 'profit' : 'loss';
      
      sessionItem.innerHTML = `
        <div class="session-item-info">
          <div class="session-item-name">${session.metadata.sessionName}</div>
          <div class="session-item-details">
            ${timeStr} • ${session.metadata.casinoName} • ${session.metadata.gameType} • ${durationStr}
          </div>
        </div>
        <div class="session-item-pl ${plClass}">
          ${this.formatCurrency(session.data.totalProfit)}
        </div>
      `;
      
      sessionItem.addEventListener('click', () => {
        this.closeSessionSelection();
        this.showSessionDetail(session);
      });
      
      sessionList.appendChild(sessionItem);
    });
  }

  private closeSessionSelection(): void {
    this.hideElement('sessionSelectionOverlay');
  }

  private showSessionDetail(session: SessionFile): void {
    // Update session detail modal with session data
    this.updateStatElement('detailSessionName', session.metadata.sessionName);
    this.updateStatElement('detailCasino', session.metadata.casinoName);
    this.updateStatElement('detailGameType', session.metadata.gameType);
    this.updateStatElement('detailDuration', this.formatDuration(session.metadata.sessionDuration));
    this.updateStatElement('detailProfitLoss', this.formatCurrency(session.data.totalProfit));
    this.updateStatElement('detailTotalBets', session.metadata.totalBets.toString());
    
    // Calculate session-specific stats
    const winRate = session.metadata.totalBets > 0 ? 
      (session.metadata.totalWins / session.metadata.totalBets) * 100 : 0;
    
    this.updateStatElement('detailWinRate', `${winRate.toFixed(1)}%`);
    this.updateStatElement('detailTotalWagered', this.formatCurrency(session.metadata.totalAmountWagered));
    this.updateStatElement('detailConsecutiveWins', session.data.maxConsecutiveWins.toString());
    this.updateStatElement('detailConsecutiveLosses', session.data.maxConsecutiveLosses.toString());
    
    // Create session P/L chart
    this.createSessionDetailChart(session);
    
    // Show the modal
    this.showElement('sessionDetailOverlay');
  }

  private createSessionDetailChart(session: SessionFile): void {
    const canvas = this.elements.sessionDetailChart as HTMLCanvasElement;
    if (!canvas) return;

    // Destroy existing chart
    if (this.sessionDetailChart) {
      this.sessionDetailChart.destroy();
    }

    // Prepare chart data from session history
    const chartData = this.prepareSessionChartData(session);
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Theme detection and colors
    const isDarkTheme = document.documentElement.getAttribute('data-theme') === 'dark' || 
                       (!document.documentElement.getAttribute('data-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    const gridColor = isDarkTheme ? 'rgba(51, 65, 85, 0.3)' : 'rgba(148, 163, 184, 0.3)';
    const textColor = isDarkTheme ? '#e2e8f0' : 'rgba(100, 116, 139, 0.8)';
    const titleColor = isDarkTheme ? '#f1f5f9' : 'rgba(55, 65, 81, 0.9)';

    this.sessionDetailChart = new (window as any).Chart(ctx, {
      type: 'line',
      data: {
        labels: chartData.labels,
        datasets: [{
          label: 'Balance',
          data: chartData.values,
          borderColor: '#2196F3',
          backgroundColor: 'rgba(33, 150, 243, 0.1)',
          fill: true,
          tension: 0.2,
          pointRadius: 2,
          pointHoverRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            title: {
              display: true,
              text: 'Bet Number',
              color: titleColor
            },
            ticks: {
              color: textColor
            },
            grid: {
              color: gridColor,
              drawBorder: false
            }
          },
          y: {
            title: {
              display: true,
              text: 'Balance ($)',
              color: titleColor
            },
            ticks: {
              color: textColor
            },
            grid: {
              color: gridColor,
              drawBorder: false
            }
          }
        },
        plugins: {
          title: {
            display: true,
            text: 'Session P/L Progress',
            color: titleColor
          },
          legend: {
            display: false
          }
        }
      }
    });
  }

  private prepareSessionChartData(session: SessionFile): { labels: string[], values: number[] } {
    const labels = ['Start'];
    const values = [session.metadata.startingBankroll];
    
    session.history.forEach((entry, index) => {
      labels.push((index + 1).toString());
      values.push(entry.balance);
    });
    
    return { labels, values };
  }

  private closeSessionDetail(): void {
    this.hideElement('sessionDetailOverlay');
    
    // Destroy session detail chart
    if (this.sessionDetailChart) {
      this.sessionDetailChart.destroy();
      this.sessionDetailChart = null;
    }
  }

  // Update session load dropdown to mark completed sessions (delegates to main loader)
  private async updateSessionDropdownWithCompletedIndicator(): Promise<void> {
    // Use the main session loader which now prioritizes cloud data
    await this.loadSavedSessions();
  }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const app = new LabouchereApp();
  (window as any).labouchereApp = app;
});