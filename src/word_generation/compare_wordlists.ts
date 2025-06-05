import * as fs from 'fs';
import * as path from 'path';
import fetch from 'node-fetch';

const CURRENT_GUESS_LIST_PATH = path.join(__dirname, '../../data/guess_words.txt');
const NEW_GUESS_LIST_URL = 'https://gist.githubusercontent.com/dracos/dd0668f281e685bad51479e5acaadb93/raw/valid-wordle-words.txt';

async function downloadNewWordList(): Promise<string[]> {
    console.log('Downloading new word list...');
    const response = await fetch(NEW_GUESS_LIST_URL);
    const text = await response.text();
    const words = text.split('\n')
        .map(word => word.trim().toLowerCase())
        .filter(word => word.length === 5 && /^[a-z]+$/.test(word));
    console.log(`Downloaded ${words.length} words from new list`);
    return words;
}

async function compareWordLists() {
    try {
        // Read current guess list
        console.log('Reading current guess list...');
        const currentWords = fs.readFileSync(CURRENT_GUESS_LIST_PATH, 'utf-8')
            .split('\n')
            .map(word => word.trim().toLowerCase())
            .filter(word => word.length > 0);
        console.log(`Read ${currentWords.length} words from current list`);

        // Download new word list
        const newWords = await downloadNewWordList();

        // Convert to Sets for efficient comparison
        const currentSet = new Set(currentWords);
        const newSet = new Set(newWords);

        // Find words in new list but not in current list
        const onlyInNew = newWords.filter(word => !currentSet.has(word));
        
        // Find words in current list but not in new list
        const onlyInCurrent = currentWords.filter(word => !newSet.has(word));

        // Print results
        console.log('\nComparison Results:');
        console.log('-------------------');
        console.log(`Current list size: ${currentWords.length}`);
        console.log(`New list size: ${newWords.length}`);
        console.log(`\nWords only in new list: ${onlyInNew.length}`);
        if (onlyInNew.length > 0) {
            console.log('First 10 examples:');
            onlyInNew.slice(0, 10).forEach(word => console.log(`- ${word}`));
        }
        console.log(`\nWords only in current list: ${onlyInCurrent.length}`);
        if (onlyInCurrent.length > 0) {
            console.log('First 10 examples:');
            onlyInCurrent.slice(0, 10).forEach(word => console.log(`- ${word}`));
        }

        // Check for specific words mentioned
        const specificWords = ['exile', 'equip'];
        console.log('\nChecking specific words:');
        specificWords.forEach(word => {
            console.log(`${word}:`);
            console.log(`- In current list: ${currentSet.has(word)}`);
            console.log(`- In new list: ${newSet.has(word)}`);
        });

    } catch (error) {
        console.error('Error comparing word lists:', error);
        process.exit(1);
    }
}

compareWordLists(); 