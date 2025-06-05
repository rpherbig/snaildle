import { REST, Routes } from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

const commands = [
  {
    name: 'snaildle',
    description: 'Snaildle game commands',
    options: [
      {
        name: 'start',
        type: 1, // SUB_COMMAND
        description: 'Start a new Snaildle game in this channel'
      },
      {
        name: 'forfeit',
        type: 1, // SUB_COMMAND
        description: 'Forfeit the current game and reveal the answer'
      }
    ]
  },
  {
    name: 'guess',
    description: 'Make a guess in the current Snaildle game',
    options: [
      {
        name: 'word',
        type: 3, // STRING
        description: 'Your 5-letter guess',
        required: true
      }
    ]
  }
];

const token = process.env.TOKEN;
const clientId = process.env.CLIENT_ID;

if (!token) {
  throw new Error('No Discord token found. Please set TOKEN in .env file');
}
if (!clientId) {
  throw new Error('No Discord client ID found. Please set CLIENT_ID in .env file');
}

const rest = new REST({ version: '10' }).setToken(token);

async function main() {
  try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(
      Routes.applicationCommands(clientId!),
      { body: commands },
    );

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
}

main();
