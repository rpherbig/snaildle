import * as fs from 'fs';
import * as path from 'path';
import fetch from 'node-fetch';

const WORDLE_GUESS_LIST_URL = 'https://gist.githubusercontent.com/dracos/dd0668f281e685bad51479e5acaadb93/raw/valid-wordle-words.txt';

async function downloadWordleGuessList(): Promise<string[]> {
    console.log('Downloading Wordle guess list...');
    const response = await fetch(WORDLE_GUESS_LIST_URL);
    const text = await response.text();
    const words = text.split('\n')
        .map(word => word.trim().toLowerCase())
        .filter(word => word.length === 5 && /^[a-z]+$/.test(word));
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
            .split(/\r?\n/)
            .map(word => word.trim().toLowerCase())
            .filter(word => word.length === 5 && /^[a-z]+$/.test(word));
        console.log(`Read ${answerWords.length} answer words`);

        // Download and process Wordle's guess list
        const wordleGuesses = await downloadWordleGuessList();
        
        // Use a single Set to collect all unique words
        const uniqueWords = new Set<string>();
        answerWords.forEach(word => uniqueWords.add(word));
        wordleGuesses.filter(isValidWord).forEach(word => uniqueWords.add(word.trim().toLowerCase()));

        const sortedWords = Array.from(uniqueWords).sort();

        console.log(`Filtered to ${sortedWords.length} valid words`);

        // Save to file with \n as the line separator
        const outputPath = path.join(__dirname, '../../data/guess_words.txt');
        fs.writeFileSync(outputPath, sortedWords.join('\n'));

        console.log(`Generated guess word list with ${sortedWords.length} words`);
        console.log(`Saved to ${outputPath}`);

    } catch (error) {
        console.error('Error generating guess list:', error);
        process.exit(1);
    }
}

generateGuessList(); 