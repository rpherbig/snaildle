import { Client, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Bot setup
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages
  ]
});

client.once('ready', () => {
  console.log(`${client.user?.tag} has connected to Discord!`);
});

// Load commands
// TODO: Add command implementations

const main = async () => {
  const token = process.env.TOKEN;
  const clientId = process.env.CLIENT_ID;

  if (!token) {
    throw new Error('No Discord token found. Please set TOKEN in .env file');
  }
  if (!clientId) {
    throw new Error('No Discord client ID found. Please set CLIENT_ID in .env file');
  }

  await client.login(token);
};

main().catch(console.error); 