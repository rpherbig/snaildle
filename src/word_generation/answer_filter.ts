import * as fs from 'fs';
import * as path from 'path';

const RAW_CONTENT_PATH = path.join(process.cwd(), 'data', 'raw_wiki_content.txt');
const ANSWER_WORDS_PATH = path.join(process.cwd(), 'data', 'answer_words.txt');

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

// Utility function to write words to file with consistent line endings
function writeWordsToFile(filePath: string, words: string[]): void {
    // Ensure all words are trimmed and sorted
    const processedWords = words
        .map(word => word.trim())
        .filter(word => word.length > 0)
        .sort();
    
    // Write with consistent \n line endings
    fs.writeFileSync(filePath, processedWords.join('\n'));
}

function isWordValid(word: string): { valid: boolean; reason?: string; normalizedWord?: string } {
    // Normalize word by removing non-alphabetic characters and trimming
    const normalizedWord = word.trim().replace(/[^a-zA-Z]/g, '').toLowerCase();
    
    // Check if normalized word is empty
    if (normalizedWord.length === 0) {
        return { valid: false, reason: 'non-alphabetic' };
    }

    // Check length
    if (normalizedWord.length !== 5) {
        return { valid: false, reason: 'wrong-length' };
    }

    // Check for vowels
    const hasVowel = Array.from(normalizedWord).some(char => VOWELS.has(char));
    if (!hasVowel) {
        return { valid: false, reason: 'no-vowels' };
    }

    // Check for consonants
    const hasConsonant = Array.from(normalizedWord).some(char => !VOWELS.has(char));
    if (!hasConsonant) {
        return { valid: false, reason: 'no-consonants' };
    }

    return { valid: true, normalizedWord };
}

function processWords(): void {
    console.log('Processing raw wiki content into answer words...');

    // Read raw content
    const rawContent = fs.readFileSync(RAW_CONTENT_PATH, 'utf-8');
    
    // Split into words and convert to lowercase, handling any whitespace
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
    const normalizedWords = new Map<string, string>(); // Map of normalized -> original words
    
    for (const word of words) {
        const { valid, reason, normalizedWord } = isWordValid(word);
        
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
        validWords.add(normalizedWord!);
        if (validWords.size === beforeSize) {
            stats.duplicates++;
        } else {
            normalizedWords.set(normalizedWord!, word);
        }
    }

    stats.finalCount = validWords.size;

    // Write to file using the utility function
    writeWordsToFile(ANSWER_WORDS_PATH, Array.from(validWords));

    // Log statistics and examples of normalized words
    console.log('\nWord Processing Statistics:');
    console.log('------------------------');
    console.log(`Total words processed: ${stats.totalWords}`);
    console.log(`Words with non-alphabetic characters: ${stats.nonAlphabetic}`);
    console.log(`Words with wrong length: ${stats.wrongLength}`);
    console.log(`Words with no vowels: ${stats.noVowels}`);
    console.log(`Words with no consonants: ${stats.noConsonants}`);
    console.log(`Duplicate words removed: ${stats.duplicates}`);
    console.log(`Final word count: ${stats.finalCount}`);

    // Log examples of normalized words
    console.log('\nExamples of normalized words:');
    console.log('------------------------');
    let count = 0;
    for (const [normalized, original] of normalizedWords.entries()) {
        if (normalized !== original) {
            console.log(`${original} -> ${normalized}`);
            count++;
            if (count >= 10) break;
        }
    }

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