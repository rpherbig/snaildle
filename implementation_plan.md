# Snaildle Implementation Plan

## Word List Generation Process

### Step 1: Web Scraping ✅
- Target URLs:
  - Characters: https://supersnail.wiki.gg/wiki/Category:Characters
  - Gears: https://supersnail.wiki.gg/wiki/Category:Gears
  - Home Base: https://supersnail.wiki.gg/wiki/Category:Home_Base
  - Locations: https://supersnail.wiki.gg/wiki/Category:Locations
  - Organs: https://supersnail.wiki.gg/wiki/Category:Organs
  - Relics: https://supersnail.wiki.gg/wiki/Category:Relics
- Tools used:
  - Playwright for browser automation
  - TypeScript for type safety
- Process:
  1. For each target category:
     - Launch headless browser
     - Navigate to category page
     - Extract page titles and subcategories
     - Follow pagination links if present
     - Recursively process subcategories
  2. Save raw text to `data/raw_wiki_content.txt`
- Implementation details:
  - Rate limiting: 5-10 seconds between requests
  - Error handling with exponential backoff
  - Progress tracking for resumable scraping
  - Cloudflare protection handling
  - Proper browser headers and viewport settings

### Step 2: Answer Word List Generation ✅
- Input: `data/raw_wiki_content.txt`
- Output: `data/answer_words.txt`
- Processing steps:
  1. Split text into words
  2. Filter criteria:
     - Normalize words by removing non-alphabetic characters
     - Convert to lowercase
     - Keep only 5-letter words
     - Remove duplicates (case-insensitive)
     - Remove words with no vowels (including 'y')
     - Remove words with no consonants
  3. Save filtered list to `data/answer_words.txt`
- Implementation details:
  - TypeScript implementation with strong typing
  - Detailed statistics tracking
  - Alphabetical sorting of final word list
  - Current results:
    - 20,090 total words processed
    - 111 words normalized (non-alphabetic characters removed)
    - 16,441 words wrong length
    - 3,174 duplicates removed
    - 364 valid words in final list
  - Successfully exceeds minimum target of 100 words

### Step 3: Guess Word List Generation ✅
- Inputs:
  - `data/answer_words.txt`
  - Wordle's guess list (from https://gist.github.com/cfreshman/cdcdf777450c5b5301e439061d29694c)
- Output: `data/guess_words.txt`
- Process:
  1. Load Wordle's guess list
  2. Combine with our answer words
  3. Apply same filtering as answer words
  4. Remove duplicates
  5. Save to `data/guess_words.txt`
- Implementation details:
  - Implemented in `src/word_generation/guess_generator.ts`
  - Run with `npm run process-guesses`
  - Uses the official Wordle allowed guesses list: https://gist.github.com/cfreshman/cdcdf777450c5b5301e439061d29694c
  - Ensures guess list is larger than answer list
  - Validates word quality
  - Outputs 10,933 valid guess words as of current run
  - Consider adding manual review step if needed
  - Document any words removed from Wordle's list

## Game Mechanics

### Core Gameplay
- One active game per Discord channel
- No guess limit - game continues until:
  - Players correctly guess the word
  - Players use `/snaildle forfeit` command
- Wordle-style feedback using emoji:
  - 🟩 (green square): Correct letter in correct position
  - 🟨 (yellow square): Correct letter in wrong position
  - ⬜ (white square): Letter not in word
- Invalid guess handling:
  - Word not in guess list: "That's not a valid word!"
  - Wrong length: "Please guess a 5-letter word!"
  - Non-alphabetic characters: "Please use only letters!"

### Commands
1. `/snaildle start` ✅
   - Starts a new game in the channel
   - Fails if a game is already active
   - Selects random word from answer list
   - Error: "A game is already in progress!" (ephemeral)
2. `/snaildle forfeit` ✅
   - Ends current game
   - Reveals the answer
   - Error: "No game is currently in progress!" (ephemeral)
3. `/guess [word]` (In Progress)
   - Makes a guess in the current game
   - Validates word against guess list
   - Provides Wordle-style feedback
   - Error: "No game is currently in progress!" (ephemeral)
   - Error: "That's not a valid word!" (ephemeral)
   - Error: "Please guess a 5-letter word!" (ephemeral)

### Game State ✅
- Persist to JSON file immediately after each state change
- File structure:
  - One JSON file per channel: `data/games/{channel_id}.json`
  - Example: `data/games/123456789.json`
- JSON structure:
  ```json
  {
    "active": true/false,
    "answer": "word",
    "guesses": ["word1", "word2", ...],
    "start_time": "timestamp"
  }
  ```
- State changes:
  1. Game start: Create new JSON file for channel
  2. Each guess: Append to guesses array
  3. Game end: Set active to false

## Technical Implementation

### Discord Bot Setup ✅
1. Create Discord application
2. Set up bot with required permissions:
   - Send Messages
   - Read Message History
   - Use Slash Commands
3. Generate and secure bot token
4. Add bot to server with proper permissions

### Development Environment ✅
- Node.js 16+
- TypeScript
- Dependencies:
  - discord.js
  - dotenv (for token management)
  - playwright (for web scraping)
  - typescript
  - ts-node (for development)

### Project Structure ✅
```
snaildle/
├── data/
│   ├── raw_wiki_content.txt
│   ├── answer_words.txt
│   ├── guess_words.txt
│   └── games/
│       └── {channel_id}.json
├── src/
│   ├── word_generation/
│   │   ├── scraper.ts
│   │   ├── answer_filter.ts
│   │   └── guess_generator.ts
│   ├── bot/
│   │   ├── main.ts
│   │   └── commands.ts
│   └── utils/
├── tests/
├── .env
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

### Next Steps
1. ✅ Set up Discord bot and get token
2. ✅ Implement web scraping script
3. ✅ Test with small subset of pages
4. ✅ Implement answer word filtering
5. ✅ Implement guess word list generation
6. ✅ Implement basic bot commands (start/forfeit)
7. 🔄 Implement guess command with Wordle-style feedback
8. 🔄 Implement database integration
   - Set up SQLite database with better-sqlite3
   - Create database schema:
     - Games table (gameId, answerWord, channelId, startTime, endTime, solved, forfeit, guessCount, winningUser, participantCount)
     - Guesses table (guessId, gameId, userId, guessWord, guessNumber, timestamp)
     - Players table (userId, username, firstSeen, lastActive)
   - Implement database operations:
     - Game creation and updates
     - Guess recording
     - Player tracking
     - Statistics calculation
9. 🔄 Implement statistics tracking
   - Per Player Statistics:
     - Basic Stats (win count, total guess count, guess to win ratio, average guesses per win, participation rate)
     - Streak Stats (current/longest win streak, current/longest participation streak)
     - Performance Stats (first guess distribution, average game duration, win rate)
   - Per Channel Statistics:
     - Player Rankings (most wins, most guesses, most participation)
     - Game Metrics (average guesses per puzzle, average participants per puzzle, win rate, average game duration)
     - Time-based Stats (most active time of day, most active day of week)
     - Word Stats (most common answer words, most successful first guesses)
   - Global Statistics:
     - Total games played
     - Total players
     - Average win rate
     - Most active channels
     - Most successful players
10. Add file locking for concurrent access
11. Add comprehensive error handling
12. Add logging

### Future Considerations
- Add more sophisticated filtering if needed
- Implement word categorization
- Add word frequency analysis
- Create a process for updating word lists as the wiki grows
- Add scoring system
- Add help and hint commands
- Add multiple game support per channel
- Add rate limiting
- Add spam protection
- Add game timeouts
- Add comprehensive logging
- Add word list backup mechanism
- Add configuration file
- Add logging configuration
- Add word list validation script
- Add command testing script
- Add database optimization and caching
- Add regular maintenance tasks
- Add backup procedures
- Add web dashboard for statistics
- Add multi-language support
- Add custom word lists
- Add tournament mode
- Add integration with other Discord features 