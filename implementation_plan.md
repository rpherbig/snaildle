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

### Step 2: Answer Word List Generation
- Input: `data/raw_wiki_content.txt`
- Output: `data/answer_words.txt`
- Processing steps:
  1. Split text into words
  2. Filter criteria:
     - Remove non-alphabetic characters
     - Convert to lowercase
     - Keep only 5-letter words
     - Remove duplicates (case-insensitive)
     - Remove words with no vowels (including 'y')
     - Remove words with no consonants
  3. Save filtered list to `data/answer_words.txt`
- Considerations:
  - Log filtering statistics
  - Validate word quality
  - Consider adding manual review step
  - Keep track of word sources for potential future filtering
  - Minimum target: 100 valid words for answer list
  - Note: 'y' is treated as a vowel for filtering purposes
  - Note: De-duplication is case-insensitive (e.g., "Snail" and "SNAIL" are considered the same word)

### Step 3: Guess Word List Generation
- Inputs:
  - `data/answer_words.txt`
  - Wordle's guess list (from https://github.com/topics/wordle-word-list)
- Output: `data/guess_words.txt`
- Process:
  1. Load Wordle's guess list
  2. Combine with our answer words
  3. Apply same filtering as answer words
  4. Remove duplicates
  5. Save to `data/guess_words.txt`
- Considerations:
  - Ensure guess list is larger than answer list
  - Validate word quality
  - Consider adding manual review step
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
1. `/snaildle start`
   - Starts a new game in the channel
   - Fails if a game is already active
   - Selects random word from answer list
   - Error: "A game is already in progress!" (ephemeral)
2. `/snaildle forfeit`
   - Shows confirmation button
   - Button options:
     - "Yes, forfeit the game" (confirms forfeit)
     - "No, keep playing" (dismisses)
   - On confirmation:
     - Ends current game
     - Reveals the answer
   - Error: "No game is currently in progress!" (ephemeral)
3. `/guess [word]`
   - Submits a guess
   - Returns color-coded result
   - Validates word is in guess list
   - Error: "No game is currently in progress!" (ephemeral)
   - Invalid word errors:
     - "That's not a valid word!" (ephemeral)
     - "Please guess a 5-letter word!" (ephemeral)
     - "Please use only letters!" (ephemeral)

### Game State
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
- File locking:
  - Use Python's `fcntl` (Unix) or `msvcrt` (Windows) for file locking
  - Acquire lock before reading/writing JSON file
  - Release lock after operation completes
  - Handle lock timeout (suggest 5 seconds)
  - Error handling:
    - If lock can't be acquired: "Please try your guess again in a moment"
    - If lock times out: "The game is busy, please try again"

## Technical Implementation

### Discord Bot Setup
1. Create Discord application
2. Set up bot with required permissions:
   - Send Messages
   - Read Message History
   - Use Slash Commands
3. Generate and secure bot token
4. Add bot to server with proper permissions

### Development Environment
- Node.js 16+
- TypeScript
- Dependencies:
  - discord.js
  - dotenv (for token management)
  - playwright (for web scraping)
  - typescript
  - ts-node (for development)

### Project Structure
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
│   │   ├── commands.ts
│   │   └── game_state.ts
│   └── utils/
│       ├── word_validation.ts
│       └── file_locking.ts
├── tests/
├── .env
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

### Implementation Notes
- Each step should be implemented as a separate Python script
- Use argparse for command-line arguments
- Include logging for debugging and monitoring
- Add unit tests for each processing step
- Document any manual steps or decisions needed
- Create a requirements.txt file for dependencies
- Write state to JSON file immediately after each state change
- Validate word lists before starting the bot

### Next Steps
1. Set up Discord bot and get token
2. Implement web scraping script
3. Test with small subset of pages (suggest starting with Character pages)
4. Implement answer word filtering
5. Implement guess word list generation
6. Implement basic bot commands
7. Review and refine word lists
8. Document any manual curation needed

### Future Considerations
- Add more sophisticated filtering if needed
- Implement word categorization
- Add word frequency analysis
- Create a process for updating word lists as the wiki grows
- Add scoring system
- Add player statistics
- Add game history
- Add help and hint commands
- Migrate to proper database if needed
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