// Conflict Resolution Strategies for Offline Sync
// Handles data conflicts when local and server versions diverge
import { logger } from '@/lib/logger';

export type ConflictStrategy = 'lastWriteWins' | 'fieldMerge' | 'userPrompt';

export interface ConflictResolutionConfig {
  strategy: ConflictStrategy;
  entityType?: string;
  customMerger?: (local: any, server: any) => any;
}

export interface ConflictData {
  id: string;
  entityType: string;
  localVersion: any;
  serverVersion: any;
  localTimestamp: string;
  serverTimestamp: string;
  conflictedFields: string[];
}

export interface ConflictResolution {
  resolvedData: any;
  strategy: ConflictStrategy;
  manual: boolean;
  timestamp: string;
}

class ConflictResolutionManager {
  private strategies: Map<string, ConflictResolutionConfig> = new Map();
  private conflictHistory: ConflictData[] = [];
  private pendingConflicts: ConflictData[] = [];
  private maxHistorySize = 100;

  // Register strategy for a specific entity type
  registerStrategy(entityType: string, config: ConflictResolutionConfig) {
    this.strategies.set(entityType, config);
    logger.info('[ConflictResolution] Registered strategy', { component: 'ConflictResolution', entityType, strategy: config.strategy });
  }

  // Get strategy for entity type
  private getStrategy(entityType: string): ConflictResolutionConfig {
    return this.strategies.get(entityType) || {
      strategy: 'lastWriteWins', // Default strategy
    };
  }

  // Detect conflicts between local and server data
  detectConflict(local: any, server: any, entityType: string): ConflictData | null {
    if (!local || !server) {
      return null;
    }

    // Check if data has diverged
    const conflictedFields = this.findConflictedFields(local, server);
    
    if (conflictedFields.length === 0) {
      return null; // No conflict
    }

    const conflict: ConflictData = {
      id: local.id || server.id || this.generateId(),
      entityType,
      localVersion: local,
      serverVersion: server,
      localTimestamp: local.updatedAt || local.timestamp || new Date().toISOString(),
      serverTimestamp: server.updatedAt || server.timestamp || new Date().toISOString(),
      conflictedFields,
    };

    this.addToHistory(conflict);
    this.addToPending(conflict);

    return conflict;
  }

  // Find fields that differ between local and server
  private findConflictedFields(local: any, server: any): string[] {
    const fields: string[] = [];
    const allKeys = new Set([...Object.keys(local), ...Object.keys(server)]);

    for (const key of allKeys) {
      // Skip metadata fields
      if (['id', 'createdAt', 'updatedAt', 'timestamp', 'lastSynced', 'syncStatus'].includes(key)) {
        continue;
      }

      if (JSON.stringify(local[key]) !== JSON.stringify(server[key])) {
        fields.push(key);
      }
    }

    return fields;
  }

  // Resolve conflict using configured strategy
  async resolveConflict(conflict: ConflictData): Promise<ConflictResolution> {
    const config = this.getStrategy(conflict.entityType);

    let resolvedData: any;
    let manual = false;

    switch (config.strategy) {
      case 'lastWriteWins':
        resolvedData = this.lastWriteWins(conflict);
        break;
      
      case 'fieldMerge':
        resolvedData = this.fieldMerge(conflict);
        break;
      
      case 'userPrompt':
        manual = true;
        // Keep in pending until user resolves
        return {
          resolvedData: null,
          strategy: 'userPrompt',
          manual: true,
          timestamp: new Date().toISOString(),
        };
      
      default:
        resolvedData = this.lastWriteWins(conflict);
    }

    // Apply custom merger if provided
    if (config.customMerger) {
      resolvedData = config.customMerger(conflict.localVersion, conflict.serverVersion);
    }

    // Remove from pending
    this.removeFromPending(conflict.id);

    return {
      resolvedData,
      strategy: config.strategy,
      manual,
      timestamp: new Date().toISOString(),
    };
  }

  // Strategy: Last Write Wins
  private lastWriteWins(conflict: ConflictData): any {
    const localTime = new Date(conflict.localTimestamp).getTime();
    const serverTime = new Date(conflict.serverTimestamp).getTime();

    if (localTime > serverTime) {
      logger.info('[ConflictResolution] Last write wins: Using local version', { component: 'ConflictResolution', conflictId: conflict.id });
      return conflict.localVersion;
    } else {
      logger.info('[ConflictResolution] Last write wins: Using server version', { component: 'ConflictResolution', conflictId: conflict.id });
      return conflict.serverVersion;
    }
  }

  // Strategy: Field-level Merge
  private fieldMerge(conflict: ConflictData): any {
    const merged = { ...conflict.serverVersion };

    // For each conflicted field, use the newer value
    for (const field of conflict.conflictedFields) {
      const localValue = conflict.localVersion[field];
      const serverValue = conflict.serverVersion[field];

      // Use timestamp-based decision
      const localTime = new Date(conflict.localTimestamp).getTime();
      const serverTime = new Date(conflict.serverTimestamp).getTime();

      if (localTime > serverTime) {
        merged[field] = localValue;
      } else {
        merged[field] = serverValue;
      }
    }

    logger.info('[ConflictResolution] Field merge completed', { component: 'ConflictResolution', fieldsCount: conflict.conflictedFields.length });
    return merged;
  }

  // Manually resolve conflict with user selection
  manualResolve(conflictId: string, resolution: 'local' | 'server' | 'custom', customData?: any): ConflictResolution {
    const conflict = this.pendingConflicts.find(c => c.id === conflictId);
    
    if (!conflict) {
      throw new Error(`Conflict ${conflictId} not found`);
    }

    let resolvedData: any;

    switch (resolution) {
      case 'local':
        resolvedData = conflict.localVersion;
        break;
      case 'server':
        resolvedData = conflict.serverVersion;
        break;
      case 'custom':
        resolvedData = customData;
        break;
    }

    this.removeFromPending(conflictId);

    return {
      resolvedData,
      strategy: 'userPrompt',
      manual: true,
      timestamp: new Date().toISOString(),
    };
  }

  // Add conflict to history
  private addToHistory(conflict: ConflictData) {
    this.conflictHistory.push(conflict);

    if (this.conflictHistory.length > this.maxHistorySize) {
      this.conflictHistory.shift();
    }
  }

  // Add conflict to pending list
  private addToPending(conflict: ConflictData) {
    const existing = this.pendingConflicts.findIndex(c => c.id === conflict.id);
    if (existing >= 0) {
      this.pendingConflicts[existing] = conflict;
    } else {
      this.pendingConflicts.push(conflict);
    }
  }

  // Remove conflict from pending list
  private removeFromPending(conflictId: string) {
    const index = this.pendingConflicts.findIndex(c => c.id === conflictId);
    if (index >= 0) {
      this.pendingConflicts.splice(index, 1);
    }
  }

  // Get all pending conflicts
  getPendingConflicts(): ConflictData[] {
    return [...this.pendingConflicts];
  }

  // Get conflict history
  getConflictHistory(): ConflictData[] {
    return [...this.conflictHistory];
  }

  // Clear conflict history
  clearHistory() {
    this.conflictHistory = [];
  }

  // Generate unique ID
  private generateId(): string {
    return `conflict-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get conflict statistics
  getStats() {
    const byType: Record<string, number> = {};
    const byStrategy: Record<ConflictStrategy, number> = {
      lastWriteWins: 0,
      fieldMerge: 0,
      userPrompt: 0,
    };

    for (const conflict of this.conflictHistory) {
      byType[conflict.entityType] = (byType[conflict.entityType] || 0) + 1;
      const strategy = this.getStrategy(conflict.entityType).strategy;
      byStrategy[strategy]++;
    }

    return {
      total: this.conflictHistory.length,
      pending: this.pendingConflicts.length,
      byType,
      byStrategy,
    };
  }
}

// Singleton instance
export const conflictResolution = new ConflictResolutionManager();

// Export for testing
export { ConflictResolutionManager };
