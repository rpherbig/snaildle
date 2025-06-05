import * as fs from 'fs';
import * as path from 'path';
import fetch from 'node-fetch';

const WORDLE_GUESS_LIST_URL = 'https://gist.githubusercontent.com/cfreshman/cdcdf777450c5b5301e439061d29694c/raw/wordle-allowed-guesses.txt';

async function downloadWordleGuessList(): Promise<string[]> {
    console.log('Downloading Wordle guess list...');
    const response = await fetch(WORDLE_GUESS_LIST_URL);
    const text = await response.text();
    const words = text.split('\n').filter((word: string) => word.trim() !== '');
    console.log(`Downloaded ${words.length} words from Wordle guess list`);
    return words;
}

function hasVowels(word: string): boolean {
    return /[aeiouy]/i.test(word);
}

function hasConsonants(word: string): boolean {
    return /[bcdfghjklmnpqrstvwxz]/i.test(word);
}

function isValidWord(word: string): boolean {
    return (
        word.length === 5 &&
        /^[a-z]+$/i.test(word) &&
        hasVowels(word) &&
        hasConsonants(word)
    );
}

async function generateGuessList() {
    try {
        // Read our answer words
        console.log('Reading answer words...');
        const answerWordsPath = path.join(__dirname, '../../data/answer_words.txt');
        const answerWords = fs.readFileSync(answerWordsPath, 'utf-8')
            .split('\n')
            .filter(word => word.trim() !== '');
        console.log(`Read ${answerWords.length} answer words`);

        // Download and process Wordle's guess list
        const wordleGuesses = await downloadWordleGuessList();
        
        // Combine and filter words
        console.log('Combining and filtering words...');
        const allWords = new Set([...answerWords, ...wordleGuesses]);
        console.log(`Combined ${allWords.size} unique words`);
        
        const validWords = Array.from(allWords)
            .filter(isValidWord)
            .map(word => word.toLowerCase())
            .sort();

        console.log(`Filtered to ${validWords.length} valid words`);

        // Save to file
        const outputPath = path.join(__dirname, '../../data/guess_words.txt');
        fs.writeFileSync(outputPath, validWords.join('\n'));

        console.log(`Generated guess word list with ${validWords.length} words`);
        console.log(`Saved to ${outputPath}`);

    } catch (error) {
        console.error('Error generating guess list:', error);
        process.exit(1);
    }
}

generateGuessList(); 