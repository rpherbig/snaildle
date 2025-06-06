import Database from 'better-sqlite3';
import path from 'path';

const db = new Database(path.join(process.cwd(), 'data', 'snaildle.db'));

// Initialize database schema
function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS game_states (
      channel_id TEXT PRIMARY KEY,
      active BOOLEAN,
      answer TEXT,
      guesses TEXT,
      start_time TEXT
    )
  `);
}

// Initialize the database when the module is loaded
initializeDatabase();

export interface GameState {
  active: boolean;
  answer: string;
  guesses: string[];
  start_time: string;
}

export function getGameState(channelId: string): GameState | null {
  const stmt = db.prepare('SELECT * FROM game_states WHERE channel_id = ?');
  const result = stmt.get(channelId) as any;
  
  if (!result) return null;
  
  return {
    active: result.active === 1,
    answer: result.answer,
    guesses: JSON.parse(result.guesses),
    start_time: result.start_time
  };
}

export function saveGameState(channelId: string, state: GameState) {
  const stmt = db.prepare(`
    INSERT INTO game_states (channel_id, active, answer, guesses, start_time)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(channel_id) DO UPDATE SET
      active = excluded.active,
      answer = excluded.answer,
      guesses = excluded.guesses,
      start_time = excluded.start_time
  `);
  
  stmt.run(
    channelId,
    state.active ? 1 : 0,
    state.answer,
    JSON.stringify(state.guesses),
    state.start_time
  );
}

// Close database connection when the process exits
process.on('exit', () => db.close()); 