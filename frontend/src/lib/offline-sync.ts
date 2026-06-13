/**
 * E-Nutrition Rwanda - Offline Storage & Synchronization Service
 * 
 * Manages local storage of pending actions (registrations, assessments)
 * using localStorage and handles synchronization with the backend.
 * Data is scoped per user.
 */

import { api, type User } from './api';
import { toast } from 'sonner';

export type SyncActionType = 'registration' | 'assessment';

export interface SyncAction {
  id: string;
  type: SyncActionType;
  description: string;
  payload: any;
  status: 'queued' | 'syncing' | 'synced' | 'error';
  timestamp: number;
  error?: string;
}

class OfflineSyncService {
  private actions: SyncAction[] = [];
  private currentUserId: string | null = null;

  constructor() {
    this.loadCurrentUser();
    this.loadActions();
  }

  /**
   * Get the storage key for the current user
   */
  private getSyncStorageKey(userId: string): string {
    return `enr-pending-sync-${userId}`;
  }

  private getLastSyncKey(userId: string): string {
    return `enr-last-sync-${userId}`;
  }

  /**
   * Load current user from localStorage
   */
  private loadCurrentUser() {
    if (typeof window === 'undefined') return;
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const user: User = JSON.parse(storedUser);
        this.currentUserId = user.id;
      }
    } catch (e) {
      console.error('Failed to load current user', e);
    }
  }

  /**
   * Refresh the current user context (call this when user logs in/out)
   */
  refreshUserContext() {
    this.loadCurrentUser();
    this.loadActions();
  }

  /**
   * Load actions from localStorage for the current user
   */
  private loadActions() {
    if (typeof window === 'undefined' || !this.currentUserId) {
      this.actions = [];
      return;
    }
    try {
      const stored = localStorage.getItem(this.getSyncStorageKey(this.currentUserId));
      this.actions = stored ? JSON.parse(stored) : [];
      
      // Reset any stuck 'syncing' actions back to 'queued'
      // This fixes actions that were in the middle of syncing when page closed/refreshed
      let hasChanges = false;
      for (let i = 0; i < this.actions.length; i++) {
        if (this.actions[i].status === 'syncing') {
          this.actions[i].status = 'queued';
          delete this.actions[i].error;
          hasChanges = true;
        }
      }
      if (hasChanges) {
        this.saveActions();
      }
    } catch (e) {
      console.error('Failed to load sync actions', e);
      this.actions = [];
    }
  }

  /**
   * Save actions to localStorage for the current user
   */
  private saveActions() {
    if (typeof window === 'undefined' || !this.currentUserId) return;
    localStorage.setItem(this.getSyncStorageKey(this.currentUserId), JSON.stringify(this.actions));
  }

  /**
   * Add a new action to the sync queue
   */
  addAction(type: SyncActionType, description: string, payload: any) {
    this.loadCurrentUser();
    this.loadActions();
    
    // Inject syncId for idempotency if not present
    const syncId = payload.syncId || `sync-${Math.random().toString(36).substring(2, 15)}-${Date.now()}`;
    const enrichedPayload = { ...payload, syncId };

    const action: SyncAction = {
      id: Math.random().toString(36).substring(2, 9),
      type,
      description,
      payload: enrichedPayload,
      status: 'queued',
      timestamp: Date.now(),
    };
    this.actions.push(action);
    this.saveActions();
    
    // Notify UI that stats might have changed
    window.dispatchEvent(new CustomEvent('enr-sync-updated'));
    
    return action;
  }

  /**
   * Get all pending actions for the current user
   */
  getActions(): SyncAction[] {
    this.loadCurrentUser();
    this.loadActions();
    return [...this.actions];
  }

  /**
   * Get count of pending actions for the current user
   */
  getPendingCount(): number {
    this.loadCurrentUser();
    this.loadActions();
    return this.actions.filter(a => a.status !== 'synced').length;
  }

  /**
   * Get last sync time for the current user
   */
  getLastSyncTime(): string | null {
    this.loadCurrentUser();
    if (!this.currentUserId) return null;
    return localStorage.getItem(this.getLastSyncKey(this.currentUserId));
  }

  /**
   * Set last sync time for the current user
   */
  setLastSyncTime(time: string) {
    this.loadCurrentUser();
    if (!this.currentUserId) return;
    localStorage.setItem(this.getLastSyncKey(this.currentUserId), time);
  }

  /**
   * Retry a specific failed action
   */
  async retryAction(actionId: string): Promise<boolean> {
    this.loadCurrentUser();
    this.loadActions();
    
    const action = this.actions.find(a => a.id === actionId);
    if (!action) return false;

    if (!navigator.onLine) {
      toast.error('Cannot retry: No internet connection');
      return false;
    }

    action.status = 'syncing';
    delete action.error;
    this.saveActions();
    window.dispatchEvent(new CustomEvent('enr-sync-updated'));

    try {
      if (action.type === 'registration') {
        // Need to get user profile for facilityId if not present
        let payload = { ...action.payload };
        if (!payload.facilityId) {
          const profile = await api.getProfile();
          payload.facilityId = profile.facilityId;
        }
        await api.createChild(payload);
      } else if (action.type === 'assessment') {
        await api.createAssessment(action.payload);
      }
      
      // Remove the successfully retried action immediately from queue
      this.actions = this.actions.filter(a => a.id !== actionId);
      this.saveActions();
      window.dispatchEvent(new CustomEvent('enr-sync-updated'));
      return true;
    } catch (e: any) {
      console.error(`Failed to retry action ${actionId}`, e);
      action.status = 'error';
      action.error = e.message || 'Unknown error';
      this.saveActions();
      window.dispatchEvent(new CustomEvent('enr-sync-updated'));
      return false;
    }
  }

  /**
   * Synchronize all pending actions for the current user
   */
  async syncAll(): Promise<{ success: number; failed: number }> {
    this.loadCurrentUser();
    this.loadActions();
    
    const results = { success: 0, failed: 0 };
    
    // Only attempt sync if online
    if (!navigator.onLine) {
      toast.error('Cannot sync: No internet connection');
      return results;
    }

    // First, get user profile once for registration actions that might need it
    let profile: any = null;
    try {
      profile = await api.getProfile();
    } catch (e) {
      console.error('Failed to get user profile', e);
    }

    // Process actions and collect ids of successfully synced ones to remove
    const syncedIds: string[] = [];

    for (let i = 0; i < this.actions.length; i++) {
      const action = this.actions[i];
      if (action.status === 'synced') continue;

      action.status = 'syncing';
      delete action.error;
      this.saveActions();
      window.dispatchEvent(new CustomEvent('enr-sync-updated'));

      try {
        let payload = { ...action.payload };
        
        if (action.type === 'registration') {
          // Ensure facilityId is present for registration
          if (!payload.facilityId && profile) {
            payload.facilityId = profile.facilityId;
          }
          await api.createChild(payload);
        } else if (action.type === 'assessment') {
          await api.createAssessment(payload);
        }
        
        results.success++;
        syncedIds.push(action.id); // Mark for removal
      } catch (e: any) {
        console.error(`Failed to sync action ${action.id}`, e);
        action.status = 'error';
        action.error = e.message || 'Unknown error';
        results.failed++;
      }
      
      this.saveActions();
      window.dispatchEvent(new CustomEvent('enr-sync-updated'));
    }

    // Remove successfully synced actions from queue immediately
    if (syncedIds.length > 0) {
      this.actions = this.actions.filter(a => !syncedIds.includes(a.id));
      this.saveActions();
      window.dispatchEvent(new CustomEvent('enr-sync-updated'));
    }

    // Update last sync time regardless of success/failure
    this.setLastSyncTime(new Date().toLocaleString());

    return results;
  }

  /**
   * Clear all synced actions from history for the current user
   */
  clearSynced() {
    this.loadCurrentUser();
    this.loadActions();
    
    this.actions = this.actions.filter(a => a.status !== 'synced');
    this.saveActions();
    window.dispatchEvent(new CustomEvent('enr-sync-updated'));
  }

  /**
   * Remove a specific action for the current user
   */
  removeAction(id: string) {
    this.loadCurrentUser();
    this.loadActions();
    
    this.actions = this.actions.filter(a => a.id !== id);
    this.saveActions();
    window.dispatchEvent(new CustomEvent('enr-sync-updated'));
  }
}

export const offlineSync = new OfflineSyncService();
