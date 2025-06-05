import * as fs from 'fs';
import * as path from 'path';

const RAW_CONTENT_PATH = path.join(__dirname, '../../data/raw_wiki_content.txt');
const ANSWER_WORDS_PATH = path.join(__dirname, '../../data/answer_words.txt');

// Vowels including 'y'
const VOWELS = new Set(['a', 'e', 'i', 'o', 'u', 'y']);

interface FilterStats {
    totalWords: number;
    nonAlphabetic: number;
    wrongLength: number;
    noVowels: number;
    noConsonants: number;
    duplicates: number;
    finalCount: number;
}

function isWordValid(word: string): { valid: boolean; reason?: string } {
    // Check if word contains only letters
    if (!/^[a-zA-Z]+$/.test(word)) {
        return { valid: false, reason: 'non-alphabetic' };
    }

    // Check length
    if (word.length !== 5) {
        return { valid: false, reason: 'wrong-length' };
    }

    // Check for vowels
    const hasVowel = Array.from(word.toLowerCase()).some(char => VOWELS.has(char));
    if (!hasVowel) {
        return { valid: false, reason: 'no-vowels' };
    }

    // Check for consonants
    const hasConsonant = Array.from(word.toLowerCase()).some(char => !VOWELS.has(char));
    if (!hasConsonant) {
        return { valid: false, reason: 'no-consonants' };
    }

    return { valid: true };
}

function processWords(): void {
    console.log('Processing raw wiki content into answer words...');

    // Read raw content
    const rawContent = fs.readFileSync(RAW_CONTENT_PATH, 'utf-8');
    
    // Split into words and convert to lowercase
    const words = rawContent.toLowerCase().split(/\s+/);
    
    const stats: FilterStats = {
        totalWords: words.length,
        nonAlphabetic: 0,
        wrongLength: 0,
        noVowels: 0,
        noConsonants: 0,
        duplicates: 0,
        finalCount: 0
    };

    // Process words
    const validWords = new Set<string>();
    
    for (const word of words) {
        const { valid, reason } = isWordValid(word);
        
        if (!valid) {
            switch (reason) {
                case 'non-alphabetic':
                    stats.nonAlphabetic++;
                    break;
                case 'wrong-length':
                    stats.wrongLength++;
                    break;
                case 'no-vowels':
                    stats.noVowels++;
                    break;
                case 'no-consonants':
                    stats.noConsonants++;
                    break;
            }
            continue;
        }

        // Add to set (automatically handles duplicates)
        const beforeSize = validWords.size;
        validWords.add(word);
        if (validWords.size === beforeSize) {
            stats.duplicates++;
        }
    }

    stats.finalCount = validWords.size;

    // Sort words alphabetically
    const sortedWords = Array.from(validWords).sort();

    // Write to file
    fs.writeFileSync(ANSWER_WORDS_PATH, sortedWords.join('\n'));

    // Log statistics
    console.log('\nWord Processing Statistics:');
    console.log('------------------------');
    console.log(`Total words processed: ${stats.totalWords}`);
    console.log(`Words with non-alphabetic characters: ${stats.nonAlphabetic}`);
    console.log(`Words with wrong length: ${stats.wrongLength}`);
    console.log(`Words with no vowels: ${stats.noVowels}`);
    console.log(`Words with no consonants: ${stats.noConsonants}`);
    console.log(`Duplicate words removed: ${stats.duplicates}`);
    console.log(`Final word count: ${stats.finalCount}`);

    if (stats.finalCount < 100) {
        console.warn('\nWarning: Less than 100 valid words found!');
    }
}

// Run the script
try {
    processWords();
} catch (error) {
    console.error('Error processing words:', error);
    process.exit(1);
} 