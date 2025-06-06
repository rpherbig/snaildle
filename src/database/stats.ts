import Database from 'better-sqlite3';
import { Game, Guess, Player } from './schema';

export interface PlayerStats {
    // Basic Stats
    winCount: number;
    totalGuessCount: number;
    guessToWinRatio: number;
    averageGuessesPerWin: number;
    participationRate: number;
    
    // Streak Stats
    currentWinStreak: number;
    longestWinStreak: number;
    currentParticipationStreak: number;
    longestParticipationStreak: number;
    
    // Performance Stats
    firstGuessDistribution: number[];
    averageGameDuration: number;
    winRate: number;
}

export interface ChannelStats {
    totalGames: number;
    winRate: number;
    averageGuessesPerPuzzle: number;
    averageParticipantsPerPuzzle: number;
    topPlayers: Array<{
        userId: string;
        winCount: number;
    }>;
    
    // Player Rankings
    mostWins: { userId: string; count: number }[];
    mostGuesses: { userId: string; count: number }[];
    mostParticipation: { userId: string; count: number }[];
    
    // Time-based Stats
    mostActiveTimeOfDay: number;
    mostActiveDayOfWeek: number;
    
    // Word Stats
    mostCommonAnswerWords: { word: string; count: number }[];
    mostSuccessfulFirstGuesses: { word: string; count: number }[];
}

export interface GlobalStats {
    totalGamesPlayed: number;
    totalPlayers: number;
    averageWinRate: number;
    mostActiveChannels: { channelId: string; count: number }[];
    mostSuccessfulPlayers: { userId: string; winCount: number }[];
}

export class StatsTracker {
    private db: Database.Database;

    constructor(db: Database.Database) {
        this.db = db;
    }

    // Player Statistics
    async getPlayerStats(userId: string): Promise<PlayerStats> {
        const stats: PlayerStats = {
            // Basic Stats
            winCount: this.getPlayerWinCount(userId),
            totalGuessCount: this.getPlayerGuessCount(userId),
            guessToWinRatio: this.getPlayerGuessToWinRatio(userId),
            averageGuessesPerWin: this.getPlayerAverageGuessesPerWin(userId),
            participationRate: this.getPlayerParticipationRate(userId),
            
            // Streak Stats
            currentWinStreak: this.getPlayerCurrentWinStreak(userId),
            longestWinStreak: this.getPlayerLongestWinStreak(userId),
            currentParticipationStreak: this.getPlayerCurrentParticipationStreak(userId),
            longestParticipationStreak: this.getPlayerLongestParticipationStreak(userId),
            
            // Performance Stats
            firstGuessDistribution: this.getPlayerFirstGuessDistribution(userId),
            averageGameDuration: this.getPlayerAverageGameDuration(userId),
            winRate: this.getPlayerWinRate(userId)
        };

        return stats;
    }

    // Channel Statistics
    async getChannelStats(channelId: string): Promise<ChannelStats> {
        const stats: ChannelStats = {
            totalGames: this.getTotalGamesPlayed(),
            winRate: this.getChannelWinRate(channelId),
            averageGuessesPerPuzzle: this.getChannelAverageGuessesPerPuzzle(channelId),
            averageParticipantsPerPuzzle: this.getChannelAverageParticipantsPerPuzzle(channelId),
            topPlayers: this.getChannelTopPlayers(channelId),
            
            // Player Rankings
            mostWins: this.getChannelMostWins(channelId),
            mostGuesses: this.getChannelMostGuesses(channelId),
            mostParticipation: this.getChannelMostParticipation(channelId),
            
            // Time-based Stats
            mostActiveTimeOfDay: this.getChannelMostActiveTimeOfDay(channelId),
            mostActiveDayOfWeek: this.getChannelMostActiveDayOfWeek(channelId),
            
            // Word Stats
            mostCommonAnswerWords: this.getChannelMostCommonAnswerWords(channelId),
            mostSuccessfulFirstGuesses: this.getChannelMostSuccessfulFirstGuesses(channelId)
        };

        return stats;
    }

    // Global Statistics
    async getGlobalStats(): Promise<GlobalStats> {
        const stats: GlobalStats = {
            totalGamesPlayed: this.getTotalGamesPlayed(),
            totalPlayers: this.getTotalPlayers(),
            averageWinRate: this.getAverageWinRate(),
            mostActiveChannels: this.getMostActiveChannels(),
            mostSuccessfulPlayers: this.getMostSuccessfulPlayers()
        };

        return stats;
    }

    // Helper methods for Player Statistics
    private getPlayerWinCount(userId: string): number {
        const result = this.db.prepare(`
            SELECT COUNT(*) as count
            FROM games
            WHERE winningUser = ?
        `).get(userId) as { count: number };
        return result.count;
    }

    private getPlayerGuessCount(userId: string): number {
        const result = this.db.prepare(`
            SELECT COUNT(*) as count
            FROM guesses
            WHERE userId = ?
        `).get(userId) as { count: number };
        return result.count;
    }

    private getPlayerGuessToWinRatio(userId: string): number {
        const winCount = this.getPlayerWinCount(userId);
        const guessCount = this.getPlayerGuessCount(userId);
        return winCount > 0 ? guessCount / winCount : 0;
    }

    private getPlayerAverageGuessesPerWin(userId: string): number {
        const result = this.db.prepare(`
            SELECT AVG(guessCount) as avg
            FROM games
            WHERE winningUser = ?
        `).get(userId) as { avg: number | null };
        return result.avg || 0;
    }

    private getPlayerParticipationRate(userId: string): number {
        const totalGames = this.db.prepare(`
            SELECT COUNT(*) as count
            FROM games
        `).get() as { count: number };

        const playerGames = this.db.prepare(`
            SELECT COUNT(DISTINCT gameId) as count
            FROM guesses
            WHERE userId = ?
        `).get(userId) as { count: number };

        return totalGames.count > 0 ? playerGames.count / totalGames.count : 0;
    }

    private getPlayerCurrentWinStreak(userId: string): number {
        const result = this.db.prepare(`
            WITH recent_games AS (
                SELECT g.*, ROW_NUMBER() OVER (ORDER BY g.endTime DESC) as rn
                FROM games g
                WHERE g.winningUser = ? OR g.winningUser IS NULL
            )
            SELECT COUNT(*) as streak
            FROM recent_games
            WHERE rn <= (
                SELECT MIN(rn)
                FROM recent_games
                WHERE winningUser IS NULL
            )
        `).get(userId) as { streak: number };
        return result.streak || 0;
    }

    private getPlayerLongestWinStreak(userId: string): number {
        const result = this.db.prepare(`
            WITH game_results AS (
                SELECT 
                    g.*,
                    ROW_NUMBER() OVER (ORDER BY g.endTime) as game_num,
                    SUM(CASE WHEN g.winningUser = ? THEN 1 ELSE 0 END) 
                        OVER (ORDER BY g.endTime ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) as win_count
                FROM games g
                WHERE g.winningUser = ? OR g.winningUser IS NULL
            )
            SELECT MAX(win_count) as longest_streak
            FROM game_results
        `).get(userId, userId) as { longest_streak: number };
        return result.longest_streak || 0;
    }

    private getPlayerCurrentParticipationStreak(userId: string): number {
        const result = this.db.prepare(`
            WITH recent_games AS (
                SELECT g.*, ROW_NUMBER() OVER (ORDER BY g.endTime DESC) as rn
                FROM games g
                LEFT JOIN guesses gs ON g.gameId = gs.gameId AND gs.userId = ?
                WHERE gs.userId IS NOT NULL OR g.winningUser IS NULL
            )
            SELECT COUNT(*) as streak
            FROM recent_games
            WHERE rn <= (
                SELECT MIN(rn)
                FROM recent_games
                WHERE winningUser IS NULL
            )
        `).get(userId) as { streak: number };
        return result.streak || 0;
    }

    private getPlayerLongestParticipationStreak(userId: string): number {
        const result = this.db.prepare(`
            WITH game_participation AS (
                SELECT 
                    g.*,
                    ROW_NUMBER() OVER (ORDER BY g.endTime) as game_num,
                    SUM(CASE WHEN gs.userId = ? THEN 1 ELSE 0 END) 
                        OVER (ORDER BY g.endTime ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) as participation_count
                FROM games g
                LEFT JOIN guesses gs ON g.gameId = gs.gameId AND gs.userId = ?
            )
            SELECT MAX(participation_count) as longest_streak
            FROM game_participation
        `).get(userId, userId) as { longest_streak: number };
        return result.longest_streak || 0;
    }

    private getPlayerFirstGuessDistribution(userId: string): number[] {
        const distribution = this.db.prepare(`
            WITH first_guesses AS (
                SELECT gs.guessNumber
                FROM guesses gs
                JOIN games g ON gs.gameId = g.gameId
                WHERE gs.userId = ? AND g.winningUser = ?
                GROUP BY gs.gameId
                HAVING gs.guessNumber = MIN(gs.guessNumber)
            )
            SELECT guessNumber, COUNT(*) as count
            FROM first_guesses
            GROUP BY guessNumber
            ORDER BY guessNumber
        `).all(userId, userId) as Array<{ guessNumber: number; count: number }>;

        // Initialize array with 6 zeros (for guesses 1-6)
        const result = new Array(6).fill(0);
        distribution.forEach(({ guessNumber, count }) => {
            result[guessNumber - 1] = count;
        });
        return result;
    }

    private getPlayerAverageGameDuration(userId: string): number {
        const result = this.db.prepare(`
            SELECT AVG(g.endTime - g.startTime) as avg_duration
            FROM games g
            WHERE g.winningUser = ?
        `).get(userId) as { avg_duration: number | null };
        return result.avg_duration || 0;
    }

    private getPlayerWinRate(userId: string): number {
        const totalGames = this.db.prepare(`
            SELECT COUNT(DISTINCT gameId) as count
            FROM guesses
            WHERE userId = ?
        `).get(userId) as { count: number };

        const winCount = this.getPlayerWinCount(userId);
        return totalGames.count > 0 ? winCount / totalGames.count : 0;
    }

    // Channel Statistics Helper Methods
    private getChannelMostWins(channelId: string): { userId: string; count: number }[] {
        return this.db.prepare(`
            SELECT winningUser as userId, COUNT(*) as count
            FROM games
            WHERE channelId = ? AND winningUser IS NOT NULL
            GROUP BY winningUser
            ORDER BY count DESC
            LIMIT 10
        `).all(channelId) as Array<{ userId: string; count: number }>;
    }

    private getChannelMostGuesses(channelId: string): { userId: string; count: number }[] {
        return this.db.prepare(`
            SELECT gs.userId, COUNT(*) as count
            FROM guesses gs
            JOIN games g ON gs.gameId = g.gameId
            WHERE g.channelId = ?
            GROUP BY gs.userId
            ORDER BY count DESC
            LIMIT 10
        `).all(channelId) as Array<{ userId: string; count: number }>;
    }

    private getChannelMostParticipation(channelId: string): { userId: string; count: number }[] {
        return this.db.prepare(`
            SELECT gs.userId, COUNT(DISTINCT gs.gameId) as count
            FROM guesses gs
            JOIN games g ON gs.gameId = g.gameId
            WHERE g.channelId = ?
            GROUP BY gs.userId
            ORDER BY count DESC
            LIMIT 10
        `).all(channelId) as Array<{ userId: string; count: number }>;
    }

    private getChannelAverageGuessesPerPuzzle(channelId: string): number {
        const result = this.db.prepare(`
            SELECT AVG(guessCount) as avg
            FROM games
            WHERE channelId = ?
        `).get(channelId) as { avg: number | null };
        return result.avg || 0;
    }

    private getChannelAverageParticipantsPerPuzzle(channelId: string): number {
        const result = this.db.prepare(`
            SELECT AVG(participantCount) as avg
            FROM games
            WHERE channelId = ?
        `).get(channelId) as { avg: number | null };
        return result.avg || 0;
    }

    private getChannelWinRate(channelId: string): number {
        const totalGames = this.db.prepare(`
            SELECT COUNT(*) as count
            FROM games
            WHERE channelId = ?
        `).get(channelId) as { count: number };

        const solvedGames = this.db.prepare(`
            SELECT COUNT(*) as count
            FROM games
            WHERE channelId = ? AND solved = 1
        `).get(channelId) as { count: number };

        return totalGames.count > 0 ? solvedGames.count / totalGames.count : 0;
    }

    private getChannelAverageGameDuration(channelId: string): number {
        const result = this.db.prepare(`
            SELECT AVG(endTime - startTime) as avg_duration
            FROM games
            WHERE channelId = ? AND endTime IS NOT NULL
        `).get(channelId) as { avg_duration: number | null };
        return result.avg_duration || 0;
    }

    private getChannelMostActiveTimeOfDay(channelId: string): number {
        const result = this.db.prepare(`
            WITH game_times AS (
                SELECT strftime('%H', startTime, 'unixepoch') as hour
                FROM games
                WHERE channelId = ?
            )
            SELECT hour, COUNT(*) as count
            FROM game_times
            GROUP BY hour
            ORDER BY count DESC
            LIMIT 1
        `).get(channelId) as { hour: number };
        return result.hour || 0;
    }

    private getChannelMostActiveDayOfWeek(channelId: string): number {
        const result = this.db.prepare(`
            WITH game_days AS (
                SELECT strftime('%w', startTime, 'unixepoch') as day
                FROM games
                WHERE channelId = ?
            )
            SELECT day, COUNT(*) as count
            FROM game_days
            GROUP BY day
            ORDER BY count DESC
            LIMIT 1
        `).get(channelId) as { day: number };
        return result.day || 0;
    }

    private getChannelMostCommonAnswerWords(channelId: string): { word: string; count: number }[] {
        return this.db.prepare(`
            SELECT answerWord as word, COUNT(*) as count
            FROM games
            WHERE channelId = ?
            GROUP BY answerWord
            ORDER BY count DESC
            LIMIT 10
        `).all(channelId) as Array<{ word: string; count: number }>;
    }

    private getChannelMostSuccessfulFirstGuesses(channelId: string): { word: string; count: number }[] {
        return this.db.prepare(`
            WITH first_guesses AS (
                SELECT gs.guessWord
                FROM guesses gs
                JOIN games g ON gs.gameId = g.gameId
                WHERE g.channelId = ? AND g.winningUser = gs.userId
                GROUP BY gs.gameId
                HAVING gs.guessNumber = MIN(gs.guessNumber)
            )
            SELECT guessWord as word, COUNT(*) as count
            FROM first_guesses
            GROUP BY guessWord
            ORDER BY count DESC
            LIMIT 10
        `).all(channelId) as Array<{ word: string; count: number }>;
    }

    private getChannelTopPlayers(channelId: string): Array<{ userId: string; winCount: number }> {
        return this.db.prepare(`
            SELECT winningUser as userId, COUNT(*) as winCount
            FROM games
            WHERE channelId = ? AND winningUser IS NOT NULL
            GROUP BY winningUser
            ORDER BY winCount DESC
            LIMIT 10
        `).all(channelId) as Array<{ userId: string; winCount: number }>;
    }

    // Global Statistics Helper Methods
    private getTotalGamesPlayed(): number {
        const result = this.db.prepare(`
            SELECT COUNT(*) as count
            FROM games
        `).get() as { count: number };
        return result.count;
    }

    private getTotalPlayers(): number {
        const result = this.db.prepare(`
            SELECT COUNT(DISTINCT userId) as count
            FROM guesses
        `).get() as { count: number };
        return result.count;
    }

    private getAverageWinRate(): number {
        const totalGames = this.getTotalGamesPlayed();
        const solvedGames = this.db.prepare(`
            SELECT COUNT(*) as count
            FROM games
            WHERE solved = 1
        `).get() as { count: number };

        return totalGames > 0 ? solvedGames.count / totalGames : 0;
    }

    private getMostActiveChannels(): { channelId: string; count: number }[] {
        return this.db.prepare(`
            SELECT channelId, COUNT(*) as count
            FROM games
            GROUP BY channelId
            ORDER BY count DESC
            LIMIT 10
        `).all() as Array<{ channelId: string; count: number }>;
    }

    private getMostSuccessfulPlayers(): { userId: string; winCount: number }[] {
        return this.db.prepare(`
            SELECT winningUser as userId, COUNT(*) as winCount
            FROM games
            WHERE winningUser IS NOT NULL
            GROUP BY winningUser
            ORDER BY winCount DESC
            LIMIT 10
        `).all() as Array<{ userId: string; winCount: number }>;
    }
} 