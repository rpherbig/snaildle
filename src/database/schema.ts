import Database from 'better-sqlite3';

export interface Game {
    gameId: number;
    answerWord: string;
    channelId: string;
    startTime: number;
    endTime: number | null;
    solved: boolean;
    forfeit: boolean;
    guessCount: number;
    winningUser: string | null;
    participantCount: number;
}

export interface Guess {
    guessId: number;
    gameId: number;
    userId: string;
    guessWord: string;
    guessNumber: number;
    timestamp: number;
}

export interface Player {
    userId: string;
    username: string;
    firstSeen: number;
    lastActive: number;
}

export function initializeDatabase(db: Database.Database): void {
    // Create Games table
    db.exec(`
        CREATE TABLE IF NOT EXISTS games (
            gameId INTEGER PRIMARY KEY AUTOINCREMENT,
            answerWord TEXT NOT NULL,
            channelId TEXT NOT NULL,
            startTime INTEGER NOT NULL,
            endTime INTEGER,
            solved BOOLEAN NOT NULL DEFAULT 0,
            forfeit BOOLEAN NOT NULL DEFAULT 0,
            guessCount INTEGER NOT NULL DEFAULT 0,
            winningUser TEXT,
            participantCount INTEGER NOT NULL DEFAULT 0
        )
    `);

    // Create Guesses table
    db.exec(`
        CREATE TABLE IF NOT EXISTS guesses (
            guessId INTEGER PRIMARY KEY AUTOINCREMENT,
            gameId INTEGER NOT NULL,
            userId TEXT NOT NULL,
            guessWord TEXT NOT NULL,
            guessNumber INTEGER NOT NULL,
            timestamp INTEGER NOT NULL,
            FOREIGN KEY (gameId) REFERENCES games(gameId)
        )
    `);

    // Create Players table
    db.exec(`
        CREATE TABLE IF NOT EXISTS players (
            userId TEXT PRIMARY KEY,
            username TEXT NOT NULL,
            firstSeen INTEGER NOT NULL,
            lastActive INTEGER NOT NULL
        )
    `);

    // Create indexes for better query performance
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_games_channel ON games(channelId);
        CREATE INDEX IF NOT EXISTS idx_games_winner ON games(winningUser);
        CREATE INDEX IF NOT EXISTS idx_guesses_game ON guesses(gameId);
        CREATE INDEX IF NOT EXISTS idx_guesses_user ON guesses(userId);
        CREATE INDEX IF NOT EXISTS idx_guesses_timestamp ON guesses(timestamp);
    `);
} 