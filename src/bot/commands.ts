import { ChatInputCommandInteraction } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';
import { getGameState, saveGameState } from './database';

// Get random word from answer list
async function getRandomWord(): Promise<string> {
  const answerFile = path.join(process.cwd(), 'data', 'answer_words.txt');
  const content = await fs.readFile(answerFile, 'utf-8');
  const words = content.split('\n').filter(word => word.trim());
  return words[Math.floor(Math.random() * words.length)];
}

// Check if word is in guess list
async function isValidGuess(word: string): Promise<boolean> {
  const guessFile = path.join(process.cwd(), 'data', 'guess_words.txt');
  const content = await fs.readFile(guessFile, 'utf-8');
  const words = content.split('\n').map(word => word.trim().toLowerCase());
  return words.includes(word.toLowerCase());
}

// Get Wordle-style feedback for a guess
function getFeedback(guess: string, answer: string): string {
  const result: string[] = [];
  const answerChars = answer.toLowerCase().split('');
  const guessChars = guess.toLowerCase().split('');
  const usedIndices = new Set<number>();

  // First pass: check for exact matches (green squares)
  for (let i = 0; i < guessChars.length; i++) {
    if (guessChars[i] === answerChars[i]) {
      result.push('🟩');
      usedIndices.add(i);
    } else {
      result.push('⬜');
    }
  }

  // Second pass: check for letter matches in wrong position (yellow squares)
  for (let i = 0; i < guessChars.length; i++) {
    if (result[i] === '🟩') continue; // Skip already matched positions

    const letterIndex = answerChars.findIndex((char, idx) => 
      char === guessChars[i] && !usedIndices.has(idx)
    );

    if (letterIndex !== -1) {
      result[i] = '🟨';
      usedIndices.add(letterIndex);
    }
  }

  // Convert letters to emoji letters
  const emojiLetters = guess.toUpperCase().split('').map(letter => 
    `:regional_indicator_${letter.toLowerCase()}:`
  );

  return `${emojiLetters.join('')}\n${result.join('')}`;
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
        const newState = {
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
  },
  {
    name: 'guess',
    async execute(interaction: ChatInputCommandInteraction) {
      const channelId = interaction.channelId;
      const guess = interaction.options.getString('word', true).toLowerCase();

      // Validate game is active
      const gameState = await getGameState(channelId);
      if (!gameState?.active) {
        await interaction.reply({
          content: 'No game is currently in progress!',
          ephemeral: true
        });
        return;
      }

      // Validate guess length
      if (guess.length !== 5) {
        await interaction.reply({
          content: 'Please guess a 5-letter word!',
          ephemeral: true
        });
        return;
      }

      // Validate guess is alphabetic
      if (!/^[a-z]+$/.test(guess)) {
        await interaction.reply({
          content: 'Please use only letters!',
          ephemeral: true
        });
        return;
      }

      // Validate guess is in word list
      if (!await isValidGuess(guess)) {
        await interaction.reply({
          content: 'That\'s not a valid word!',
          ephemeral: true
        });
        return;
      }

      // Add guess to game state
      gameState.guesses.push(guess);
      await saveGameState(channelId, gameState);

      // Get feedback
      const feedback = getFeedback(guess, gameState.answer);

      // Check for win
      if (guess === gameState.answer.trim()) {
        gameState.active = false;
        await saveGameState(channelId, gameState);
        await interaction.reply(`🎉 Correct! The word was ${gameState.answer}.\n\n${feedback}`);
        return;
      }

      // Show feedback
      await interaction.reply(feedback);
    }
  }
]; 