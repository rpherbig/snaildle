import Database from 'better-sqlite3';

interface StatsRecord {
  winCount: number;
  totalGames: number;
  totalGuesses: number;
  avgGuessesPerWin: number;
}

interface ChannelStatsRecord {
  totalGames: number;
  solvedGames: number;
  medianGuesses: number;
  avgParticipantsPerGame: number;
}

export interface PlayerStats {
  userId: string;
  winCount: number;
  totalGuessCount: number;
  averageGuessesPerWin: number;
  winRate: number;
}

export interface ChannelStats {
  solveRate: number;
  medianGuessesPerSolved: number;
  avgParticipantsPerGame: number;
}

export class StatsTracker {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  getPlayerStats(userId: string, channelId: string): PlayerStats | null {
    // Get basic stats
    const stats = this.db.prepare(`
      SELECT 
        COUNT(CASE WHEN solved = 1 THEN 1 END) as winCount,
        COUNT(*) as totalGames,
        SUM(guessCount) as totalGuesses,
        AVG(CASE WHEN solved = 1 THEN guessCount END) as avgGuessesPerWin
      FROM games
      WHERE channelId = ? AND winningUser = ?
    `).get(channelId, userId) as StatsRecord;

    if (!stats || stats.totalGames === 0) {
      return null;
    }

    return {
      userId,
      winCount: stats.winCount,
      totalGuessCount: stats.totalGuesses,
      averageGuessesPerWin: stats.avgGuessesPerWin || 0,
      winRate: stats.winCount / stats.totalGames
    };
  }

  getChannelStats(channelId: string): ChannelStats {
    const stats = this.db.prepare(`
      WITH solved_games AS (
        SELECT guessCount
        FROM games
        WHERE channelId = ? AND solved = 1
      ),
      game_participants AS (
        SELECT gameId, COUNT(DISTINCT userId) as participant_count
        FROM guesses
        WHERE gameId IN (SELECT gameId FROM games WHERE channelId = ?)
        GROUP BY gameId
      )
      SELECT 
        COUNT(*) as totalGames,
        COUNT(CASE WHEN solved = 1 THEN 1 END) as solvedGames,
        (
          SELECT AVG(guessCount)
          FROM (
            SELECT guessCount
            FROM solved_games
            ORDER BY guessCount
            LIMIT 2 - (SELECT COUNT(*) FROM solved_games) % 2
            OFFSET (SELECT (COUNT(*) - 1) / 2 FROM solved_games)
          )
        ) as medianGuesses,
        AVG(participant_count) as avgParticipantsPerGame
      FROM games g
      LEFT JOIN game_participants gp ON g.gameId = gp.gameId
      WHERE channelId = ?
    `).get(channelId, channelId, channelId) as ChannelStatsRecord;

    return {
      solveRate: stats.solvedGames / stats.totalGames,
      medianGuessesPerSolved: stats.medianGuesses || 0,
      avgParticipantsPerGame: stats.avgParticipantsPerGame || 0
    };
  }

  getChannelLeaderboard(channelId: string): PlayerStats[] {
    // Get all players who have played in this channel
    const players = this.db.prepare(`
      SELECT DISTINCT winningUser as user_id
      FROM games
      WHERE channelId = ?
    `).all(channelId) as { user_id: string }[];

    // Get stats for each player
    const playerStats = players
      .map(player => this.getPlayerStats(player.user_id, channelId))
      .filter((stats): stats is PlayerStats => stats !== null);

    // Sort by win count, then win rate
    return playerStats.sort((a, b) => {
      if (b.winCount !== a.winCount) {
        return b.winCount - a.winCount;
      }
      return b.winRate - a.winRate;
    });
  }
} 