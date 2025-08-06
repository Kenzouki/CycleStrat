import { BankrollService } from './bankrollManager';
import { BankrollPot, PotType, CASINO_OPTIONS, POT_TYPE_OPTIONS } from './bankrollTypes';

export class BankrollUI {
  private bankrollService: BankrollService;
  private currentStep: number = 1;
  
  constructor() {
    this.bankrollService = new BankrollService();
    this.initializeEventListeners();
    this.updateDisplay();
  }

  private initializeEventListeners(): void {
    // Main bankroll button
    document.getElementById('bankrollBtn')?.addEventListener('click', () => {
      this.showBankrollModal();
    });

    // Close buttons
    document.getElementById('bankrollClose')?.addEventListener('click', () => {
      this.hideBankrollModal();
    });

    document.getElementById('transferClose')?.addEventListener('click', () => {
      this.hideTransferModal();
    });

    // Creation flow
    document.getElementById('createBankrollBtn')?.addEventListener('click', () => {
      this.startBankrollCreation();
    });

    document.getElementById('createBankrollWithSavings')?.addEventListener('click', () => {
      this.createBankrollWithSavings();
    });

    document.getElementById('addNewPot')?.addEventListener('click', () => {
      this.addNewPotForm();
    });

    document.getElementById('finalizeBankroll')?.addEventListener('click', () => {
      this.finalizeBankroll();
    });

    // Transfer money
    document.getElementById('transferMoney')?.addEventListener('click', () => {
      this.showTransferModal();
    });

    // Delete bankroll
    document.getElementById('deleteBankroll')?.addEventListener('click', () => {
      this.deleteBankroll();
    });

    document.getElementById('confirmTransfer')?.addEventListener('click', () => {
      this.confirmTransfer();
    });

    document.getElementById('cancelTransfer')?.addEventListener('click', () => {
      this.hideTransferModal();
    });

    // From pot selection change
    document.getElementById('fromPot')?.addEventListener('change', () => {
      this.updateAvailableBalance();
    });

    // Close modal on overlay click
    document.getElementById('bankrollOverlay')?.addEventListener('click', (e) => {
      if (e.target === document.getElementById('bankrollOverlay')) {
        this.hideBankrollModal();
      }
    });

    document.getElementById('transferOverlay')?.addEventListener('click', (e) => {
      if (e.target === document.getElementById('transferOverlay')) {
        this.hideTransferModal();
      }
    });
  }

  private showBankrollModal(): void {
    document.getElementById('bankrollOverlay')!.style.display = 'flex';
    this.updateDisplay();
  }

  private hideBankrollModal(): void {
    document.getElementById('bankrollOverlay')!.style.display = 'none';
  }

  private showTransferModal(): void {
    document.getElementById('transferOverlay')!.style.display = 'flex';
    this.populateTransferSelects();
  }

  private hideTransferModal(): void {
    document.getElementById('transferOverlay')!.style.display = 'none';
    this.clearTransferForm();
  }

  private updateDisplay(): void {
    const bankroll = this.bankrollService.getCurrentBankroll();
    
    if (!bankroll || bankroll.pots.length === 0) {
      this.showNoBankrollState();
    } else {
      this.showBankrollManagement();
      this.updateStats();
      this.renderPots();
    }
    
    // Update the pot selection dropdown in the main app
    this.refreshMainAppPotSelection();
  }

  private refreshMainAppPotSelection(): void {
    // Call the main app's method to refresh pot selection dropdown
    if ((window as any).labouchereApp && (window as any).labouchereApp.populatePotSelection) {
      (window as any).labouchereApp.populatePotSelection();
    }
  }

  private showNoBankrollState(): void {
    document.getElementById('noBankroll')!.style.display = 'block';
    document.getElementById('bankrollStats')!.style.display = 'none';
    document.getElementById('bankrollForm')!.style.display = 'none';
    document.getElementById('potsManagement')!.style.display = 'none';
  }

  private showBankrollManagement(): void {
    document.getElementById('noBankroll')!.style.display = 'none';
    document.getElementById('bankrollStats')!.style.display = 'block';
    document.getElementById('bankrollForm')!.style.display = 'none';
    document.getElementById('potsManagement')!.style.display = 'block';
  }

  private startBankrollCreation(): void {
    document.getElementById('noBankroll')!.style.display = 'none';
    document.getElementById('bankrollForm')!.style.display = 'block';
    this.showBankrollStep('bankrollSetup');
  }

  private showBankrollStep(stepId: string): void {
    // Hide all steps
    document.querySelectorAll('.form-step').forEach(el => {
      (el as HTMLElement).style.display = 'none';
    });

    // Show current step
    document.getElementById(stepId)!.style.display = 'block';
  }

  private createBankrollWithSavings(): void {
    const totalInput = document.getElementById('totalBankroll') as HTMLInputElement;
    const amount = parseFloat(totalInput.value);

    if (!amount || amount <= 0) {
      this.showToast('Please enter a valid bankroll amount', 'error');
      return;
    }

    // Create bankroll with only savings pot initially
    this.bankrollService.createBankroll(amount);
    
    // Create the savings pot with the full amount
    const savingsPot = {
      name: 'Savings',
      percentage: 100,
      type: PotType.SAVINGS as PotType,
      casino: undefined
    };
    
    this.bankrollService.createCustomPots([savingsPot]);
    
    // Update the display and show pot creation step
    document.getElementById('savingsAmount')!.textContent = amount.toFixed(2);
    this.showBankrollStep('potCreation');
    
    // Clear any existing pot forms
    document.getElementById('dynamicPotsContainer')!.innerHTML = '';
  }

  private addNewPotForm(): void {
    const container = document.getElementById('dynamicPotsContainer')!;
    const potIndex = container.children.length + 1;
    
    const div = document.createElement('div');
    div.className = 'dynamic-pot-form';
    div.innerHTML = `
      <div class="pot-form-header">
        <h5>Gaming Pot ${potIndex}</h5>
        <button type="button" class="btn btn-icon remove-pot" onclick="this.closest('.dynamic-pot-form').remove();">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="pot-form-row">
        <div class="form-group">
          <label>Pot Name:</label>
          <input type="text" class="form-control pot-name" value="Gaming Pot ${potIndex}" placeholder="Enter pot name...">
        </div>
        <div class="form-group">
          <label>Amount ($):</label>
          <input type="number" class="form-control pot-amount" value="0" min="0.01" step="0.01" placeholder="Enter amount...">
        </div>
        <div class="form-group casino-group">
          <label>Casino:</label>
          <select class="form-control pot-casino" onchange="bankrollUI.updatePotNameFromCasino(this)">
            <option value="">None (Reserve Pot)</option>
            ${CASINO_OPTIONS.map(option => 
              `<option value="${option.value}">${option.icon} ${option.label}</option>`
            ).join('')}
          </select>
        </div>
      </div>
    `;
    
    container.appendChild(div);
  }

  private finalizeBankroll(): void {
    const forms = document.querySelectorAll('.dynamic-pot-form');
    if (forms.length === 0) {
      this.showToast('Add at least one gaming pot or finish with savings only', 'warning');
      this.updateDisplay();
      return;
    }

    const savingsPot = this.bankrollService.getAllPots().find(pot => pot.type === PotType.SAVINGS);
    if (!savingsPot) {
      this.showToast('Error: Savings pot not found', 'error');
      return;
    }

    let totalPotAmount = 0;
    const potRequests: Array<{name: string, amount: number, casino?: string}> = [];
    
    forms.forEach(form => {
      const name = (form.querySelector('.pot-name') as HTMLInputElement).value || 'Gaming Pot';
      const amount = parseFloat((form.querySelector('.pot-amount') as HTMLInputElement).value) || 0;
      const casino = (form.querySelector('.pot-casino') as HTMLSelectElement).value || undefined;
      
      if (amount > 0) {
        potRequests.push({ name, amount, casino });
        totalPotAmount += amount;
      }
    });

    if (totalPotAmount > savingsPot.currentBalance) {
      this.showToast(`Total pot amounts ($${totalPotAmount.toFixed(2)}) exceed available savings ($${savingsPot.currentBalance.toFixed(2)})`, 'error');
      return;
    }

    // Create gaming pots by transferring from savings
    try {
      potRequests.forEach(request => {
        // Create gaming pot with zero balance first
        this.bankrollService.addGamingPot(request.name, request.casino);
        
        // Get the newly created pot
        const newPot = this.bankrollService.getAllPots().find(pot => 
          pot.name === request.name && pot.type === PotType.GAMING
        );
        
        if (newPot) {
          // Transfer money from savings to the new pot
          this.bankrollService.transferMoney(savingsPot.id, newPot.id, request.amount, 'Initial pot funding');
        }
      });

      this.showToast('Bankroll setup completed successfully!', 'success');
      this.updateDisplay();
    } catch (error) {
      this.showToast('Error creating pots: ' + (error as Error).message, 'error');
    }
  }

  public updatePotNameFromCasino(selectElement: HTMLSelectElement): void {
    const potForm = selectElement.closest('.dynamic-pot-form') || selectElement.closest('.custom-pot-form');
    if (!potForm) return;

    const nameInput = potForm.querySelector('.pot-name') as HTMLInputElement;
    const selectedCasino = selectElement.value;
    
    if (selectedCasino && nameInput) {
      const casinoOption = CASINO_OPTIONS.find(option => option.value === selectedCasino);
      if (casinoOption) {
        nameInput.value = casinoOption.label;
      }
    }
  }

  private updatePotNameInputs(): void {
    const numberOfPots = parseInt((document.getElementById('numberOfPots') as HTMLInputElement).value);
    const container = document.getElementById('potNamesContainer')!;
    
    container.innerHTML = '';
    
    for (let i = 0; i < numberOfPots; i++) {
      const div = document.createElement('div');
      div.className = 'form-group pot-name-input';
      div.innerHTML = `
        <label for="potName${i}">Pot ${i + 1} Name:</label>
        <input type="text" id="potName${i}" class="form-control" value="Gaming Pot ${i + 1}" placeholder="Enter pot name...">
      `;
      container.appendChild(div);
    }
  }

  private initializeCustomPots(): void {
    const container = document.getElementById('customPotsContainer')!;
    container.innerHTML = '';
    
    // Add initial pot
    this.addCustomPotForm();
    this.addCustomPotForm();
  }

  private addCustomPotForm(): void {
    const container = document.getElementById('customPotsContainer')!;
    const potIndex = container.children.length;
    
    const div = document.createElement('div');
    div.className = 'custom-pot-form';
    div.innerHTML = `
      <button type="button" class="remove-pot" onclick="this.parentElement.remove(); this.updatePercentageTotal();">×</button>
      <div class="pot-form-row">
        <div class="form-group">
          <label>Pot Name:</label>
          <input type="text" class="form-control pot-name" value="Gaming Pot ${potIndex + 1}" placeholder="Enter pot name...">
        </div>
        <div class="form-group">
          <label>Type:</label>
          <select class="form-control pot-type">
            ${POT_TYPE_OPTIONS.map(option => 
              `<option value="${option.value}">${option.icon} ${option.label}</option>`
            ).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Percentage:</label>
          <input type="number" class="form-control pot-percentage" value="33.33" min="0.01" max="100" step="0.01" onchange="this.closest('.bankroll-modal').querySelector('.bankroll-ui').updatePercentageTotal();">
        </div>
        <div class="form-group casino-group">
          <label>Casino:</label>
          <select class="form-control pot-casino">
            <option value="">None</option>
            ${CASINO_OPTIONS.map(option => 
              `<option value="${option.value}">${option.icon} ${option.label}</option>`
            ).join('')}
          </select>
        </div>
      </div>
    `;
    
    container.appendChild(div);
    this.updatePercentageTotal();
  }

  private updatePercentageTotal(): void {
    const percentageInputs = document.querySelectorAll('.pot-percentage') as NodeListOf<HTMLInputElement>;
    let total = 0;
    
    percentageInputs.forEach(input => {
      total += parseFloat(input.value) || 0;
    });
    
    const totalElement = document.getElementById('totalPercentage')!;
    totalElement.textContent = total.toFixed(2);
    
    const parentElement = totalElement.closest('.percentage-total')!;
    parentElement.classList.remove('valid', 'invalid');
    
    if (Math.abs(total - 100) < 0.01) {
      parentElement.classList.add('valid');
    } else {
      parentElement.classList.add('invalid');
    }
  }

  private createEqualPots(): void {
    const numberOfPots = parseInt((document.getElementById('numberOfPots') as HTMLInputElement).value);
    const potNames: string[] = [];
    
    for (let i = 0; i < numberOfPots; i++) {
      const nameInput = document.getElementById(`potName${i}`) as HTMLInputElement;
      potNames.push(nameInput.value || `Gaming Pot ${i + 1}`);
    }
    
    try {
      this.bankrollService.createEqualPots(numberOfPots, potNames);
      this.showToast('Pots created successfully!', 'success');
      this.updateDisplay();
    } catch (error) {
      this.showToast('Failed to create pots', 'error');
    }
  }

  private createCustomPots(): void {
    const forms = document.querySelectorAll('.custom-pot-form');
    const potConfigs: Array<{name: string, percentage: number, type: PotType, casino?: string}> = [];
    
    forms.forEach(form => {
      const name = (form.querySelector('.pot-name') as HTMLInputElement).value;
      const type = (form.querySelector('.pot-type') as HTMLSelectElement).value as PotType;
      const percentage = parseFloat((form.querySelector('.pot-percentage') as HTMLInputElement).value);
      const casino = (form.querySelector('.pot-casino') as HTMLSelectElement).value || undefined;
      
      potConfigs.push({ name, type, percentage, casino });
    });
    
    try {
      this.bankrollService.createCustomPots(potConfigs);
      this.showToast('Pots created successfully!', 'success');
      this.updateDisplay();
    } catch (error) {
      this.showToast((error as Error).message, 'error');
    }
  }

  private updateStats(): void {
    const stats = this.bankrollService.getStats();
    
    document.getElementById('totalAllocated')!.textContent = `$${stats.totalAllocated.toFixed(2)}`;
    document.getElementById('totalSavings')!.textContent = `$${stats.totalSavings.toFixed(2)}`;
    document.getElementById('netProfitLoss')!.textContent = `$${stats.netProfitLoss.toFixed(2)}`;
    document.getElementById('potsAtRisk')!.textContent = stats.potsAtRisk.toString();
    
    // Color code the net P&L
    const netElement = document.getElementById('netProfitLoss')!;
    netElement.className = 'stat-value';
    if (stats.netProfitLoss > 0) {
      netElement.classList.add('profit');
    } else if (stats.netProfitLoss < 0) {
      netElement.classList.add('loss');
    }
  }

  private renderPots(): void {
    const container = document.getElementById('potsGrid')!;
    const pots = this.bankrollService.getAllPots();
    
    container.innerHTML = '';
    
    pots.forEach(pot => {
      const potCard = this.createPotCard(pot);
      container.appendChild(potCard);
    });
  }

  private createPotCard(pot: BankrollPot): HTMLElement {
    const div = document.createElement('div');
    div.className = 'pot-card';
    
    const profitLoss = pot.currentBalance - pot.originalAmount;
    const profitLossPercent = ((profitLoss / pot.originalAmount) * 100).toFixed(1);
    
    // Add status classes
    if (profitLoss > 0) {
      div.classList.add('profitable');
    } else if (profitLoss < 0) {
      div.classList.add('losing');
    }
    
    if (pot.currentBalance < (pot.originalAmount * 0.2)) {
      div.classList.add('at-risk');
    }
    
    const typeOption = POT_TYPE_OPTIONS.find(opt => opt.value === pot.type);
    const casinoOption = CASINO_OPTIONS.find(opt => opt.value === pot.casino);
    
    div.innerHTML = `
      <div class="pot-header">
        <div class="pot-name-container">
          <div class="pot-name">
            ${typeOption?.icon || '💰'} ${pot.name}
          </div>
          <button class="btn-icon edit-name-btn" onclick="bankrollUI.editPotName('${pot.id}')" title="Edit pot name">
            <i class="fas fa-edit"></i>
          </button>
        </div>
        <div class="pot-type">${typeOption?.label || 'Gaming'}</div>
      </div>
      
      <div class="pot-balance">
        <span class="current-balance">$${pot.currentBalance.toFixed(2)}</span>
        <span class="original-amount">Original: $${pot.originalAmount.toFixed(2)}</span>
        <span class="profit-loss ${profitLoss >= 0 ? 'profit' : 'loss'}">
          ${profitLoss >= 0 ? '+' : ''}$${profitLoss.toFixed(2)} (${profitLossPercent}%)
        </span>
      </div>
      
      <div class="pot-casino">
        ${pot.casino ? `
          <div class="casino-info">
            ${casinoOption?.icon || '🎮'} <strong>${casinoOption?.label || pot.casino}</strong>
          </div>
        ` : `
          <div class="casino-info reserve">
            💰 <strong>Reserve Pot</strong>
          </div>
        `}
        <button class="btn-icon edit-casino-btn" onclick="bankrollUI.editPotCasino('${pot.id}')" title="Change casino assignment">
          <i class="fas fa-building"></i>
        </button>
      </div>
      
      ${pot.currentBalance < (pot.originalAmount * 0.2) ? `
        <div class="risk-warning">
          <i class="fas fa-exclamation-triangle warning-icon"></i>
          <strong>Low Balance Warning!</strong> This pot is below 20% of its original amount.
        </div>
      ` : ''}
      
      <div class="pot-actions">
        <button class="btn btn-sm btn-secondary" onclick="bankrollUI.editPot('${pot.id}')">
          <i class="fas fa-edit"></i> Edit
        </button>
        <button class="btn btn-sm btn-warning" onclick="bankrollUI.resetPot('${pot.id}')">
          <i class="fas fa-undo"></i> Reset
        </button>
        ${pot.type !== PotType.SAVINGS ? `
          <button class="btn btn-sm btn-danger" onclick="bankrollUI.deletePot('${pot.id}')">
            <i class="fas fa-trash"></i> Delete
          </button>
        ` : ''}
      </div>
    `;
    
    return div;
  }

  private populateTransferSelects(): void {
    const pots = this.bankrollService.getAllPots().filter(pot => pot.isActive);
    const fromSelect = document.getElementById('fromPot') as HTMLSelectElement;
    const toSelect = document.getElementById('toPot') as HTMLSelectElement;
    
    fromSelect.innerHTML = '<option value="">Select source pot...</option>';
    toSelect.innerHTML = '<option value="">Select destination pot...</option>';
    
    pots.forEach(pot => {
      const option = `<option value="${pot.id}">${pot.name} ($${pot.currentBalance.toFixed(2)})</option>`;
      fromSelect.innerHTML += option;
      toSelect.innerHTML += option;
    });
  }

  private updateAvailableBalance(): void {
    const fromSelect = document.getElementById('fromPot') as HTMLSelectElement;
    const balanceSpan = document.getElementById('availableBalance')!;
    
    if (fromSelect.value) {
      const pot = this.bankrollService.getPotById(fromSelect.value);
      balanceSpan.textContent = pot ? pot.currentBalance.toFixed(2) : '0.00';
    } else {
      balanceSpan.textContent = '0.00';
    }
  }

  private confirmTransfer(): void {
    const fromSelect = document.getElementById('fromPot') as HTMLSelectElement;
    const toSelect = document.getElementById('toPot') as HTMLSelectElement;
    const amountInput = document.getElementById('transferAmount') as HTMLInputElement;
    const descriptionInput = document.getElementById('transferDescription') as HTMLInputElement;
    
    const fromPotId = fromSelect.value;
    const toPotId = toSelect.value;
    const amount = parseFloat(amountInput.value);
    const description = descriptionInput.value;
    
    if (!fromPotId || !toPotId) {
      this.showToast('Please select both source and destination pots', 'error');
      return;
    }
    
    if (fromPotId === toPotId) {
      this.showToast('Cannot transfer to the same pot', 'error');
      return;
    }
    
    if (!amount || amount <= 0) {
      this.showToast('Please enter a valid transfer amount', 'error');
      return;
    }
    
    const success = this.bankrollService.transferMoney(fromPotId, toPotId, amount, description);
    
    if (success) {
      this.showToast('Transfer completed successfully!', 'success');
      this.hideTransferModal();
      this.updateDisplay();
    } else {
      this.showToast('Transfer failed. Check available balance.', 'error');
    }
  }

  private clearTransferForm(): void {
    (document.getElementById('fromPot') as HTMLSelectElement).value = '';
    (document.getElementById('toPot') as HTMLSelectElement).value = '';
    (document.getElementById('transferAmount') as HTMLInputElement).value = '';
    (document.getElementById('transferDescription') as HTMLInputElement).value = '';
    document.getElementById('availableBalance')!.textContent = '0.00';
  }

  // Public methods for pot management (called from pot cards)
  public editPot(potId: string): void {
    const pot = this.bankrollService.getPotById(potId);
    if (!pot) return;
    
    const newBalance = prompt(`Edit balance for ${pot.name}:`, pot.currentBalance.toString());
    if (newBalance !== null) {
      const balance = parseFloat(newBalance);
      if (!isNaN(balance) && balance >= 0) {
        this.bankrollService.updatePotBalance(potId, balance, 'manual_edit');
        this.updateDisplay();
        this.showToast('Pot balance updated', 'success');
      } else {
        this.showToast('Invalid balance amount', 'error');
      }
    }
  }

  public editPotName(potId: string): void {
    const pot = this.bankrollService.getPotById(potId);
    if (!pot) return;
    
    const newName = prompt(`Edit name for pot:`, pot.name);
    if (newName !== null && newName.trim()) {
      this.bankrollService.updatePotName(potId, newName.trim());
      this.updateDisplay();
      this.showToast('Pot name updated', 'success');
    }
  }

  public editPotCasino(potId: string): void {
    const pot = this.bankrollService.getPotById(potId);
    if (!pot) return;
    
    // Create a custom modal for casino selection
    this.showCasinoSelectionModal(potId, pot.casino || '');
  }

  private showCasinoSelectionModal(potId: string, currentCasino: string): void {
    const modalHTML = `
      <div class="modal-overlay" id="casinoSelectionOverlay" style="display: flex;">
        <div class="modal casino-selection-modal">
          <div class="modal-header">
            <h3><i class="fas fa-building"></i> Select Casino</h3>
            <button class="btn btn-icon" id="casinoSelectionClose">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="modal-content">
            <div class="casino-grid">
              ${CASINO_OPTIONS.map(casino => `
                <div class="casino-option ${currentCasino === casino.value ? 'selected' : ''}" data-casino="${casino.value}">
                  <div class="casino-icon">${casino.icon}</div>
                  <div class="casino-name">${casino.label}</div>
                  ${casino.isReserve ? '<div class="casino-note">For refills & transfers</div>' : ''}
                  ${casino.isCustom ? '<div class="casino-note">Custom casino name</div>' : ''}
                </div>
              `).join('')}
            </div>
            ${currentCasino === 'other' ? `
              <div class="custom-casino-input">
                <label for="customCasinoName">Custom Casino Name:</label>
                <input type="text" id="customCasinoName" placeholder="Enter casino name..." value="${currentCasino}">
              </div>
            ` : ''}
          </div>
          <div class="modal-actions">
            <button class="btn btn-secondary" id="cancelCasinoSelection">Cancel</button>
            <button class="btn btn-primary" id="confirmCasinoSelection">Confirm</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Add event listeners
    document.getElementById('casinoSelectionClose')?.addEventListener('click', () => this.closeCasinoSelectionModal());
    document.getElementById('cancelCasinoSelection')?.addEventListener('click', () => this.closeCasinoSelectionModal());
    document.getElementById('confirmCasinoSelection')?.addEventListener('click', () => this.confirmCasinoSelection(potId));
    
    // Casino option selection
    document.querySelectorAll('.casino-option').forEach(option => {
      option.addEventListener('click', (e) => {
        document.querySelectorAll('.casino-option').forEach(opt => opt.classList.remove('selected'));
        (e.currentTarget as HTMLElement).classList.add('selected');
        
        const casino = (e.currentTarget as HTMLElement).dataset.casino;
        if (casino === 'other') {
          const customInput = document.getElementById('customCasinoName') as HTMLInputElement;
          if (customInput) customInput.style.display = 'block';
        }
      });
    });
  }

  private closeCasinoSelectionModal(): void {
    const modal = document.getElementById('casinoSelectionOverlay');
    if (modal) {
      modal.remove();
    }
  }

  private confirmCasinoSelection(potId: string): void {
    const selectedOption = document.querySelector('.casino-option.selected') as HTMLElement;
    if (!selectedOption) {
      this.showToast('Please select a casino', 'error');
      return;
    }
    
    let casino = selectedOption.dataset.casino || '';
    
    if (casino === 'other') {
      const customInput = document.getElementById('customCasinoName') as HTMLInputElement;
      casino = customInput?.value.trim() || '';
      if (!casino) {
        this.showToast('Please enter a custom casino name', 'error');
        return;
      }
    }
    
    this.bankrollService.updatePotCasino(potId, casino);
    this.updateDisplay();
    this.closeCasinoSelectionModal();
    this.showToast('Casino assignment updated', 'success');
  }

  public resetPot(potId: string): void {
    const pot = this.bankrollService.getPotById(potId);
    if (!pot) return;
    
    if (confirm(`Reset "${pot.name}" to its original amount of $${pot.originalAmount.toFixed(2)}?`)) {
      this.bankrollService.resetPot(potId);
      this.updateDisplay();
      this.showToast('Pot reset to original amount', 'success');
    }
  }

  public deletePot(potId: string): void {
    const pot = this.bankrollService.getPotById(potId);
    if (!pot) return;
    
    if (confirm(`Are you sure you want to delete "${pot.name}"? This action cannot be undone.`)) {
      this.bankrollService.deletePot(potId);
      this.updateDisplay();
      this.showToast('Pot deleted', 'success');
    }
  }

  // Get gaming pots for session configuration
  public getGamingPots(): BankrollPot[] {
    return this.bankrollService.getGamingPots();
  }

  // Update pot balance after session (called from main app)
  public updatePotAfterSession(potId: string, newBalance: number, isWin: boolean): void {
    this.bankrollService.updatePotBalance(potId, newBalance, isWin ? 'win' : 'loss');
  }

  private showToast(message: string, type: 'success' | 'error' | 'warning' = 'success'): void {
    // Simple toast implementation - you can enhance this
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 4px;
      color: white;
      font-weight: 500;
      z-index: 10000;
      background: ${type === 'success' ? '#059669' : type === 'error' ? '#dc2626' : '#f59e0b'};
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  public deleteBankroll(): void {
    const stats = this.bankrollService.getStats();
    const confirmed = confirm(
      `Are you sure you want to delete your entire bankroll?\n\n` +
      `This will permanently delete:\n` +
      `• ${stats.totalPots} pots\n` +
      `• $${stats.totalAllocated.toFixed(2)} total allocated\n` +
      `• All transaction history\n\n` +
      `This action cannot be undone!`
    );
    
    if (confirmed) {
      const doubleConfirm = confirm('This is your final warning. Delete everything?');
      if (doubleConfirm) {
        this.bankrollService.deleteBankroll();
        this.updateDisplay();
        this.showToast('Bankroll deleted successfully', 'success');
      }
    }
  }
}

// Global instance for pot card actions
declare global {
  interface Window {
    bankrollUI: BankrollUI;
  }
}

window.bankrollUI = new BankrollUI();