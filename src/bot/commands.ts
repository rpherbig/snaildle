import { ChatInputCommandInteraction } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';

interface GameState {
  active: boolean;
  answer: string;
  guesses: string[];
  start_time: string;
}

const GAMES_DIR = path.join(process.cwd(), 'data', 'games');

// Ensure games directory exists
async function ensureGamesDir() {
  try {
    await fs.access(GAMES_DIR);
  } catch {
    await fs.mkdir(GAMES_DIR, { recursive: true });
  }
}

// Get game state for a channel
async function getGameState(channelId: string): Promise<GameState | null> {
  const gameFile = path.join(GAMES_DIR, `${channelId}.json`);
  try {
    const data = await fs.readFile(gameFile, 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

// Save game state for a channel
async function saveGameState(channelId: string, state: GameState) {
  await ensureGamesDir();
  const gameFile = path.join(GAMES_DIR, `${channelId}.json`);
  await fs.writeFile(gameFile, JSON.stringify(state, null, 2));
}

// Get random word from answer list
async function getRandomWord(): Promise<string> {
  const answerFile = path.join(process.cwd(), 'data', 'answer_words.txt');
  const content = await fs.readFile(answerFile, 'utf-8');
  const words = content.split('\n').filter(word => word.trim());
  return words[Math.floor(Math.random() * words.length)];
}

export const commands = [
  {
    name: 'snaildle',
    async execute(interaction: ChatInputCommandInteraction) {
      const subcommand = interaction.options.getSubcommand();
      const channelId = interaction.channelId;

      if (subcommand === 'start') {
        const gameState = await getGameState(channelId);
        
        if (gameState?.active) {
          await interaction.reply({
            content: 'A game is already in progress!',
            ephemeral: true
          });
          return;
        }

        const answer = await getRandomWord();
        const newState: GameState = {
          active: true,
          answer,
          guesses: [],
          start_time: new Date().toISOString()
        };

        await saveGameState(channelId, newState);
        await interaction.reply('New Snaildle game started! Guess a 5-letter word.');
      }

      else if (subcommand === 'forfeit') {
        const gameState = await getGameState(channelId);
        
        if (!gameState?.active) {
          await interaction.reply({
            content: 'No game is currently in progress!',
            ephemeral: true
          });
          return;
        }

        gameState.active = false;
        await saveGameState(channelId, gameState);
        await interaction.reply(`Game forfeited! The word was: ${gameState.answer}`);
      }
    }
  }
]; 