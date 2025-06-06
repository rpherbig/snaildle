import Database from 'better-sqlite3';
import { Game, Guess, Player } from './schema';

export class DatabaseOperations {
    private db: Database.Database;

    constructor(db: Database.Database) {
        this.db = db;
    }

    // Game Operations
    createGame(answerWord: string, channelId: string): number {
        const result = this.db.prepare(`
            INSERT INTO games (
                answerWord, channelId, startTime, endTime, 
                solved, forfeit, guessCount, winningUser, participantCount
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            answerWord,
            channelId,
            Date.now(),  // startTime
            null,        // endTime
            0,          // solved
            0,          // forfeit
            0,          // guessCount
            null,       // winningUser
            0           // participantCount
        );
        return result.lastInsertRowid as number;
    }

    updateGame(gameId: number, updates: Partial<Game>): void {
        const setClauses: string[] = [];
        const values: any[] = [];

        if (updates.answerWord !== undefined) {
            setClauses.push('answerWord = ?');
            values.push(updates.answerWord);
        }
        if (updates.channelId !== undefined) {
            setClauses.push('channelId = ?');
            values.push(updates.channelId);
        }
        if (updates.startTime !== undefined) {
            setClauses.push('startTime = ?');
            values.push(updates.startTime);
        }
        if (updates.endTime !== undefined) {
            setClauses.push('endTime = ?');
            values.push(updates.endTime);
        }
        if (updates.solved !== undefined) {
            setClauses.push('solved = ?');
            values.push(updates.solved ? 1 : 0);
        }
        if (updates.forfeit !== undefined) {
            setClauses.push('forfeit = ?');
            values.push(updates.forfeit ? 1 : 0);
        }
        if (updates.guessCount !== undefined) {
            setClauses.push('guessCount = ?');
            values.push(updates.guessCount);
        }
        if (updates.winningUser !== undefined) {
            setClauses.push('winningUser = ?');
            values.push(updates.winningUser);
        }
        if (updates.participantCount !== undefined) {
            setClauses.push('participantCount = ?');
            values.push(updates.participantCount);
        }

        if (setClauses.length === 0) return;

        values.push(gameId);
        this.db.prepare(`
            UPDATE games
            SET ${setClauses.join(', ')}
            WHERE gameId = ?
        `).run(...values);
    }

    getGame(gameId: number): Game | null {
        const result = this.db.prepare(`
            SELECT * FROM games WHERE gameId = ?
        `).get(gameId) as Game | undefined;
        return result || null;
    }

    // Guess Operations
    createGuess(guess: Omit<Guess, 'guessId'>): number {
        const result = this.db.prepare(`
            INSERT INTO guesses (
                gameId, userId, guessWord, guessNumber, timestamp
            ) VALUES (?, ?, ?, ?, ?)
        `).run(
            guess.gameId,
            guess.userId,
            guess.guessWord,
            guess.guessNumber,
            guess.timestamp
        );
        return result.lastInsertRowid as number;
    }

    getGuessesForGame(gameId: number): Guess[] {
        return this.db.prepare(`
            SELECT * FROM guesses
            WHERE gameId = ?
            ORDER BY guessNumber ASC
        `).all(gameId) as Guess[];
    }

    getGuessesForUser(userId: string): Guess[] {
        return this.db.prepare(`
            SELECT * FROM guesses
            WHERE userId = ?
            ORDER BY timestamp DESC
        `).all(userId) as Guess[];
    }

    // Player Operations
    createOrUpdatePlayer(player: Player): void {
        this.db.prepare(`
            INSERT INTO players (userId, username, firstSeen, lastActive)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(userId) DO UPDATE SET
                username = excluded.username,
                lastActive = excluded.lastActive
        `).run(
            player.userId,
            player.username,
            player.firstSeen,
            player.lastActive
        );
    }

    getPlayer(userId: string): Player | null {
        const result = this.db.prepare(`
            SELECT * FROM players WHERE userId = ?
        `).get(userId) as Player | undefined;
        return result || null;
    }

    updatePlayerLastActive(userId: string, timestamp: number): void {
        this.db.prepare(`
            UPDATE players
            SET lastActive = ?
            WHERE userId = ?
        `).run(timestamp, userId);
    }

    // Utility Operations
    getActiveGameForChannel(channelId: string): Game | null {
        const result = this.db.prepare(`
            SELECT * FROM games
            WHERE channelId = ? AND solved = 0 AND forfeit = 0
            ORDER BY startTime DESC
            LIMIT 1
        `).get(channelId) as Game | undefined;
        return result || null;
    }

    incrementGameGuessCount(gameId: number): void {
        this.db.prepare(`
            UPDATE games
            SET guessCount = guessCount + 1
            WHERE gameId = ?
        `).run(gameId);
    }

    hasUserParticipated(gameId: number, userId: string): boolean {
        const result = this.db.prepare(`
            SELECT COUNT(*) as count
            FROM guesses
            WHERE gameId = ? AND userId = ?
        `).get(gameId, userId) as { count: number };
        return result.count > 0;
    }

    incrementGameParticipantCount(gameId: number): void {
        this.db.prepare(`
            UPDATE games
            SET participantCount = participantCount + 1
            WHERE gameId = ?
        `).run(gameId);
    }

    getAllActiveGames(): Game[] {
        return this.db.prepare(`
            SELECT * FROM games
            WHERE solved = 0 AND forfeit = 0
            ORDER BY startTime DESC
        `).all() as Game[];
    }

    async getActiveGame(channelId: string): Promise<Game | null> {
        const game = this.db.prepare(`
            SELECT *
            FROM games
            WHERE channelId = ? AND solved = 0 AND forfeit = 0
            ORDER BY startTime DESC
            LIMIT 1
        `).get(channelId) as Game | undefined;

        return game || null;
    }
} 