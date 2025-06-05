import { Client, Collection, Events, GatewayIntentBits, ChatInputCommandInteraction } from 'discord.js';
import dotenv from 'dotenv';
import { commands } from './commands';

// Load environment variables
dotenv.config();

// Bot setup
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages
  ]
});

// Create commands collection
interface Command {
  name: string;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

const commandsCollection = new Collection<string, Command>();
for (const command of commands) {
  commandsCollection.set(command.name, command);
}

client.once(Events.ClientReady, () => {
  console.log(`${client.user?.tag} has connected to Discord!`);
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = commandsCollection.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
    } else {
      await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
    }
  }
});

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