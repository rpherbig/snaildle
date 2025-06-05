# Snaildle

A Discord bot that facilitates a Wordle-like game using words from the game Super Snail.

## Setup

1. Create a Discord application and bot:
   - Go to [Discord Developer Portal](https://discord.com/developers/applications)
   - Click "New Application"
   - Go to the "Bot" section
   - Click "Add Bot"
   - Under "Privileged Gateway Intents", enable:
     - Server Members Intent
   - Copy the bot token
   - Go to "General Information" and copy the Application ID (this is your CLIENT_ID)

2. Create a `.env` file in the project root:
   ```
   TOKEN=your_bot_token_here
   CLIENT_ID=your_application_id_here
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Install Playwright browsers:
   ```bash
   npx playwright install chromium
   ```

5. Build the project:
   ```bash
   npm run build
   ```

6. Run the bot:
   ```bash
   npm start
   ```

   For development with auto-reload:
   ```bash
   npm run dev
   ```

## Invite the Bot

Add Snaildle to your server using this invite link:
[Invite Snaildle](https://discord.com/api/oauth2/authorize?client_id=1379939127448830003&permissions=274878221376&scope=bot%20applications.commands)

## Commands

- `/snaildle start` - Start a new game
- `/snaildle forfeit` - Forfeit the current game
- `/guess [word]` - Make a guess

## Development

The project is structured as follows:
- `data/` - Word lists and game state files
  - `raw_wiki_content.txt` - Raw scraped content from wiki
  - `answer_words.txt` - Processed 5-letter words for answers
  - `guess_words.txt` - Processed 5-letter words for guesses
  - `games/` - Game state files for each channel
- `src/` - Source code
  - `word_generation/` - Scripts for generating word lists
    - `scraper.ts` - Wiki content scraper
    - `answer_filter.ts` - Answer word processor
    - `guess_generator.ts` - Guess word generator
  - `bot/` - Discord bot code
  - `utils/` - Utility functions
- `dist/` - Compiled JavaScript files
- `tests/` - Test files

## Word List Generation

### Scraping Wiki Content
To scrape content from the Super Snail wiki:
```bash
npm run scrape
```
This will:
- Visit each category page
- Extract page titles and subcategories
- Handle pagination
- Save progress to allow resuming
- Output to `data/raw_wiki_content.txt`

### Processing Answer Words
To process the raw content into valid answer words:
```bash
npm run process-answers
```
This will:
- Filter for 5-letter words
- Remove non-alphabetic characters
- Remove duplicates
- Ensure words have vowels and consonants
- Sort alphabetically
- Output to `data/answer_words.txt`

Current results:
- 20,090 total words processed
- 1,592 non-alphabetic words removed
- 3,082 duplicates removed
- 348 valid words in final list

### Processing Guess Words
To generate the guess word list:
```bash
npm run process-guesses
```
This will:
- Combine answer words with Wordle's guess list (sourced from https://gist.github.com/cfreshman/cdcdf777450c5b5301e439061d29694c)
- Apply same filtering as answer words
- Remove duplicates
- Output to `data/guess_words.txt`

Current results:
- 10,933 valid guess words in the final list