import { CloudStorage } from './cloudStorage';

export class AuthManager {
  private cloudStorage: CloudStorage;
  private authOverlay: HTMLElement | null = null;
  private cloudStatus: HTMLElement | null = null;
  private authBtn: HTMLElement | null = null;
  private onAuthChangeCallback: (() => Promise<void>) | null = null;

  constructor() {
    this.cloudStorage = new CloudStorage();
    this.initializeElements();
    this.attachEventListeners();
    this.updateUI();
  }

  public setAuthChangeCallback(callback: () => Promise<void>): void {
    this.onAuthChangeCallback = callback;
  }

  private initializeElements(): void {
    this.authOverlay = document.getElementById('authOverlay');
    this.cloudStatus = document.getElementById('cloudStatus');
    this.authBtn = document.getElementById('authBtn');
  }

  private attachEventListeners(): void {
    // Cloud status click to open auth modal
    this.cloudStatus?.addEventListener('click', () => {
      this.showAuthModal();
    });

    // Auth button click
    this.authBtn?.addEventListener('click', () => {
      this.showAuthModal();
    });

    // Close auth modal
    document.getElementById('authClose')?.addEventListener('click', () => {
      this.hideAuthModal();
    });

    // Tab switching
    document.querySelectorAll('.auth-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const tabType = target.getAttribute('data-tab');
        this.switchTab(tabType || 'signin');
      });
    });

    // Sign in form
    document.getElementById('signinBtn')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.handleSignIn();
    });

    // Sign up form
    document.getElementById('signupBtn')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.handleSignUp();
    });

    // Sign out button
    document.getElementById('signoutBtn')?.addEventListener('click', () => {
      this.handleSignOut();
    });

    // Close modal on overlay click
    this.authOverlay?.addEventListener('click', (e) => {
      if (e.target === this.authOverlay) {
        this.hideAuthModal();
      }
    });
  }

  private async showAuthModal(): Promise<void> {
    const isSignedIn = await this.cloudStorage.isSignedIn();
    
    if (isSignedIn) {
      // Show user profile instead of auth form
      await this.showUserProfile();
    } else {
      // Show sign in form
      if (this.authOverlay) {
        this.authOverlay.style.display = 'flex';
      }
    }
  }

  private hideAuthModal(): void {
    if (this.authOverlay) {
      this.authOverlay.style.display = 'none';
    }
    
    // Reset modal to default state
    const authTitle = document.getElementById('authTitle');
    if (authTitle) authTitle.textContent = 'Sign In';
    
    // Hide all forms
    this.hideAllForms();
    
    // Show default forms and info
    const signinForm = document.getElementById('signinForm');
    const cloudInfo = document.getElementById('cloudInfo');
    if (signinForm) signinForm.style.display = 'block';
    if (cloudInfo) cloudInfo.style.display = 'block';
    
    // Reset tabs
    document.querySelectorAll('.auth-tab').forEach(tab => {
      tab.classList.remove('active');
    });
    document.querySelector('[data-tab="signin"]')?.classList.add('active');
    
    this.clearErrors();
  }

  private switchTab(tabType: string): void {
    // Update tab buttons
    document.querySelectorAll('.auth-tab').forEach(tab => {
      tab.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabType}"]`)?.classList.add('active');

    // Update forms
    const signinForm = document.getElementById('signinForm');
    const signupForm = document.getElementById('signupForm');
    
    if (tabType === 'signin') {
      if (signinForm) signinForm.style.display = 'block';
      if (signupForm) signupForm.style.display = 'none';
    } else {
      if (signinForm) signinForm.style.display = 'none';
      if (signupForm) signupForm.style.display = 'block';
    }

    this.clearErrors();
  }

  private async showUserProfile(): Promise<void> {
    if (!this.authOverlay) return;

    // Get user info
    const user = await this.cloudStorage.getCurrentUser();
    if (!user) return;

    // Get cloud session count
    const cloudSessions = await this.getCloudSessionCount();
    
    // Update modal title
    const authTitle = document.getElementById('authTitle');
    if (authTitle) authTitle.textContent = 'Account Details';

    // Hide auth tabs and forms
    this.hideAllForms();
    
    // Show user profile
    const userProfile = document.getElementById('userProfile');
    if (userProfile) userProfile.style.display = 'block';

    // Update user email
    const userEmail = document.getElementById('userEmail');
    if (userEmail) userEmail.textContent = user.email || 'Unknown';

    // Update session count
    const cloudSessionCountEl = document.getElementById('cloudSessionCount');
    if (cloudSessionCountEl) cloudSessionCountEl.textContent = cloudSessions.toString();

    // Update sign in date
    const userSignedInDate = document.getElementById('userSignedInDate');
    if (userSignedInDate && user.last_sign_in_at) {
      const date = new Date(user.last_sign_in_at);
      const today = new Date();
      const isToday = date.toDateString() === today.toDateString();
      
      if (isToday) {
        userSignedInDate.textContent = 'Signed in today';
      } else {
        userSignedInDate.textContent = `Last signed in ${date.toLocaleDateString()}`;
      }
    }

    // Show the modal
    this.authOverlay.style.display = 'flex';
  }

  private hideAllForms(): void {
    const forms = ['signinForm', 'signupForm', 'userProfile'];
    forms.forEach(formId => {
      const form = document.getElementById(formId);
      if (form) form.style.display = 'none';
    });

    const cloudInfo = document.getElementById('cloudInfo');
    if (cloudInfo) cloudInfo.style.display = 'none';
  }

  private async getCloudSessionCount(): Promise<number> {
    try {
      const result = await this.cloudStorage.getAllSessions();
      return result.success && result.sessions ? result.sessions.length : 0;
    } catch (error) {
      return 0;
    }
  }

  private async handleSignOut(): Promise<void> {
    try {
      await this.cloudStorage.signOut();
      this.hideAuthModal();
      this.updateUI();
      this.showToast('Signed out successfully', 'success');
      
      // Refresh sessions list
      if (this.onAuthChangeCallback) {
        await this.onAuthChangeCallback();
      }
    } catch (error) {
      this.showToast('Error signing out', 'error');
    }
  }

  private async handleSignIn(): Promise<void> {
    const emailEl = document.getElementById('signinEmail') as HTMLInputElement;
    const passwordEl = document.getElementById('signinPassword') as HTMLInputElement;
    const errorEl = document.getElementById('signinError');

    if (!emailEl || !passwordEl) return;

    const email = emailEl.value.trim();
    const password = passwordEl.value;

    if (!email || !password) {
      this.showError('signinError', 'Please fill in all fields');
      return;
    }

    try {
      const result = await this.cloudStorage.signIn(email, password);
      
      if (result.success) {
        this.hideAuthModal();
        this.updateUI();
        this.showToast('Signed in successfully', 'success');
        
        // Refresh sessions list
        if (this.onAuthChangeCallback) {
          await this.onAuthChangeCallback();
        }
      } else {
        this.showError('signinError', result.error || 'Sign in failed');
      }
    } catch (error) {
      this.showError('signinError', 'Network error occurred');
    }
  }

  private async handleSignUp(): Promise<void> {
    const emailEl = document.getElementById('signupEmail') as HTMLInputElement;
    const passwordEl = document.getElementById('signupPassword') as HTMLInputElement;
    const confirmEl = document.getElementById('confirmPassword') as HTMLInputElement;

    if (!emailEl || !passwordEl || !confirmEl) return;

    const email = emailEl.value.trim();
    const password = passwordEl.value;
    const confirm = confirmEl.value;

    if (!email || !password || !confirm) {
      this.showError('signupError', 'Please fill in all fields');
      return;
    }

    if (password !== confirm) {
      this.showError('signupError', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      this.showError('signupError', 'Password must be at least 6 characters');
      return;
    }

    try {
      const result = await this.cloudStorage.signUp(email, password);
      
      if (result.success) {
        this.hideAuthModal();
        this.updateUI();
        this.showToast('Account created successfully! Check your email to verify.', 'success');
        
        // Refresh sessions list
        if (this.onAuthChangeCallback) {
          await this.onAuthChangeCallback();
        }
      } else {
        this.showError('signupError', result.error || 'Sign up failed');
      }
    } catch (error) {
      this.showError('signupError', 'Network error occurred');
    }
  }

  private showError(elementId: string, message: string): void {
    const errorEl = document.getElementById(elementId);
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.style.display = 'block';
    }
  }

  private clearErrors(): void {
    ['signinError', 'signupError'].forEach(id => {
      const errorEl = document.getElementById(id);
      if (errorEl) {
        errorEl.style.display = 'none';
        errorEl.textContent = '';
      }
    });
  }

  private async updateUI(): Promise<void> {
    const isSignedIn = await this.cloudStorage.isSignedIn();
    
    if (this.cloudStatus) {
      const icon = this.cloudStatus.querySelector('i');
      if (icon) {
        if (isSignedIn) {
          icon.className = 'fas fa-cloud';
          icon.setAttribute('title', 'Connected to cloud');
          this.cloudStatus.classList.add('connected');
        } else {
          icon.className = 'fas fa-cloud-slash';
          icon.setAttribute('title', 'Not connected');
          this.cloudStatus.classList.remove('connected');
        }
      }
    }

    if (this.authBtn) {
      if (isSignedIn) {
        this.authBtn.style.display = 'none';
      } else {
        this.authBtn.style.display = 'block';
      }
    }
  }

  private showToast(message: string, type: 'success' | 'error'): void {
    // Basic toast implementation - you can enhance this
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
      background: ${type === 'success' ? '#059669' : '#dc2626'};
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  public async getCloudStorage(): Promise<CloudStorage> {
    return this.cloudStorage;
  }

  public async isSignedIn(): Promise<boolean> {
    return this.cloudStorage.isSignedIn();
  }
}