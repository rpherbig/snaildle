import { ChatInputCommandInteraction } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';
import { getDbOperations } from '../database';
import { Game, Guess } from '../database/schema';

interface GameStateRow {
  channel_id: string;
  active: number;
  answer: string;
  guesses: string;
  start_time: string;
}

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
      const db = getDbOperations();

      if (subcommand === 'start') {
        const activeGame = db.getActiveGameForChannel(channelId);
        
        if (activeGame) {
          await interaction.reply({
            content: 'A game is already in progress!',
            ephemeral: true
          });
          return;
        }

        const answer = await getRandomWord();
        const gameId = db.createGame(answer, channelId);

        await interaction.reply('New Snaildle game started! Guess a 5-letter word.');
      }

      else if (subcommand === 'forfeit') {
        const activeGame = db.getActiveGameForChannel(channelId);
        
        if (!activeGame) {
          await interaction.reply({
            content: 'No game is currently in progress!',
            ephemeral: true
          });
          return;
        }

        db.updateGame(activeGame.gameId, {
          endTime: Date.now(),
          forfeit: true
        });

        await interaction.reply(`Game forfeited! The word was: ${activeGame.answerWord}`);
      }
      else if (subcommand === 'debug') {
        // Only allow bot owner to use debug commands
        if (interaction.user.id !== process.env.OWNER_ID) {
          await interaction.reply({
            content: 'You do not have permission to use debug commands.',
            ephemeral: true
          });
          return;
        }

        const activeGame = db.getActiveGameForChannel(channelId);
        if (!activeGame) {
          await interaction.reply({
            content: 'No active game in this channel.',
            ephemeral: true
          });
          return;
        }

        await interaction.reply({
          content: '```json\n' + JSON.stringify(activeGame, null, 2) + '\n```',
          ephemeral: true
        });
      }
      else if (subcommand === 'stats') {
        const stats = db.getStatsTracker();
        const userStats = stats.getPlayerStats(interaction.user.id, channelId);
        
        if (!userStats) {
          await interaction.reply({
            content: 'You haven\'t played any games in this channel yet!',
            ephemeral: true
          });
          return;
        }

        const user = await interaction.client.users.fetch(interaction.user.id);
        const statsMessage = [
          `**${user.username}'s Stats**`,
          '',
          '**Basic Stats**',
          `Games Won: ${userStats.winCount}`,
          `Total Guesses: ${userStats.totalGuessCount}`,
          `Average Guesses per Win: ${userStats.averageGuessesPerWin.toFixed(1)}`,
          `Win Rate: ${(userStats.winRate * 100).toFixed(1)}%`
        ].join('\n');

        await interaction.reply(statsMessage);
      }
      else if (subcommand === 'leaderboard') {
        const stats = db.getStatsTracker();
        const leaderboard = stats.getChannelLeaderboard(channelId);
        const channelStats = stats.getChannelStats(channelId);
        
        if (!leaderboard || leaderboard.length === 0) {
          await interaction.reply({
            content: 'No games have been played in this channel yet!',
            ephemeral: true
          });
          return;
        }

        const leaderboardMessage = [
          '**Channel Leaderboard**',
          '',
          '**Channel Stats**',
          `Solve Rate: ${(channelStats.solveRate * 100).toFixed(1)}%`,
          `Median Guesses per Solved: ${channelStats.medianGuessesPerSolved.toFixed(1)}`,
          `Average Participants per Game: ${channelStats.avgParticipantsPerGame.toFixed(1)}`,
          '',
          '**Top Players**'
        ];
        
        for (let i = 0; i < leaderboard.length; i++) {
          const player = leaderboard[i];
          const user = await interaction.client.users.fetch(player.userId);
          leaderboardMessage.push(
            `${i + 1}. **${user.username}**`,
            `   Wins: ${player.winCount}`,
            `   Win Rate: ${(player.winRate * 100).toFixed(1)}%`,
            `   Avg Guesses: ${player.averageGuessesPerWin.toFixed(1)}`,
            ''
          );
        }

        await interaction.reply(leaderboardMessage.join('\n'));
      }
    }
  },
  {
    name: 'guess',
    async execute(interaction: ChatInputCommandInteraction) {
      const channelId = interaction.channelId;
      const userId = interaction.user.id;
      const guess = interaction.options.getString('word', true).toLowerCase();
      const db = getDbOperations();

      // Validate game is active
      const activeGame = db.getActiveGameForChannel(channelId);
      if (!activeGame) {
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

      // Check if this is a new participant BEFORE recording the guess
      const isNewParticipant = !db.hasUserParticipated(activeGame.gameId, userId);

      // Record the guess
      const guessNumber = activeGame.guessCount + 1;
      db.createGuess({
        gameId: activeGame.gameId,
        userId,
        guessWord: guess,
        guessNumber,
        timestamp: Date.now()
      });

      // Update game state
      db.incrementGameGuessCount(activeGame.gameId);
      if (isNewParticipant) {
        db.incrementGameParticipantCount(activeGame.gameId);
      }

      // Get feedback
      const feedback = getFeedback(guess, activeGame.answerWord);

      // Check for win
      if (guess === activeGame.answerWord) {
        db.updateGame(activeGame.gameId, {
          endTime: Date.now(),
          solved: true,
          winningUser: userId
        });
        await interaction.reply(`🎉 Correct! The word was ${activeGame.answerWord}.\n\n${feedback}`);
        return;
      }

      // Show feedback
      await interaction.reply(feedback);
    }
  }
]; 