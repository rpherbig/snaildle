import Database from 'better-sqlite3';
import { initializeDatabase } from './schema';
import { DatabaseOperations } from './operations';
import { StatsTracker } from './stats';

let db: Database.Database | null = null;
let operations: DatabaseOperations | null = null;
let stats: StatsTracker | null = null;

export function initializeDbConnection(dbPath: string): void {
    if (db) {
        throw new Error('Database connection already initialized');
    }

    db = new Database(dbPath);
    db.pragma('foreign_keys = ON');
    initializeDatabase(db);
    
    operations = new DatabaseOperations(db);
    stats = new StatsTracker(db);
}

export function getDbOperations(): DatabaseOperations {
    if (!operations) {
        throw new Error('Database operations not initialized');
    }
    return operations;
}

export function getStatsTracker(): StatsTracker {
    if (!stats) {
        throw new Error('Stats tracker not initialized');
    }
    return stats;
}

export function closeDbConnection(): void {
    if (db) {
        db.close();
        db = null;
        operations = null;
        stats = null;
    }
}

// Export types
export type { Game, Guess, Player } from './schema';
export type { PlayerStats, ChannelStats, GlobalStats } from './stats'; 