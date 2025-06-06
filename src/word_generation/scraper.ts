import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const WIKI_BASE_URL = 'https://supersnail.wiki.gg';
const CATEGORIES = [
    '/wiki/Category:Characters',
    '/wiki/Category:Gears',
    '/wiki/Category:Home_Base',
    '/wiki/Category:Locations',
    '/wiki/Category:Organs',
    '/wiki/Category:Relics'
];

const OUTPUT_FILE = path.join(process.cwd(), 'data', 'raw_wiki_content.txt');
const PROGRESS_FILE = path.join(process.cwd(), 'data', 'scrape_progress.json');

interface ScrapeProgress {
    completedCategories: string[];
    inProgressCategory?: {
        categoryUrl: string;
        currentPageUrl: string | null;
    };
}

// Ensure data directory exists
if (!fs.existsSync(path.dirname(OUTPUT_FILE))) {
    fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
}

// Initialize output file if it doesn't exist
if (!fs.existsSync(OUTPUT_FILE)) {
    fs.writeFileSync(OUTPUT_FILE, '');
}

function loadProgress(): ScrapeProgress {
    try {
        if (fs.existsSync(PROGRESS_FILE)) {
            const data = fs.readFileSync(PROGRESS_FILE, 'utf-8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error loading progress:', error);
    }
    return { completedCategories: [] };
}

function saveProgress(progress: ScrapeProgress): void {
    try {
        fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
    } catch (error) {
        console.error('Error saving progress:', error);
    }
}

function appendTitles(titles: string[]): void {
    try {
        fs.appendFileSync(OUTPUT_FILE, titles.join('\n') + '\n');
    } catch (error) {
        console.error('Error appending titles:', error);
    }
}

async function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function extractPageTitles(page: any): Promise<string[]> {
    return await page.$$eval('.mw-category-group a', (links: any[]) => 
        links.map(link => link.textContent.trim())
    );
}

async function extractSubcategories(page: any): Promise<string[]> {
    return await page.$$eval('.mw-category-group a[href^="/wiki/Category:"]', (links: any[]) => 
        links.map(link => link.getAttribute('href'))
    );
}

async function getNextPageUrl(page: any): Promise<string | null> {
    const nextPageLink = await page.$('a:has-text("next page")');
    if (nextPageLink) {
        return await nextPageLink.getAttribute('href');
    }
    return null;
}

async function scrapeCategory(browser: any, categoryUrl: string, progress: ScrapeProgress): Promise<void> {
    console.log(`Scraping category: ${categoryUrl}`);
    
    const page = await browser.newPage();
    
    // Set a realistic viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    // Add random delay between actions to mimic human behavior
    await page.setDefaultTimeout(30000);
    await page.setDefaultNavigationTimeout(30000);

    let currentUrl: string | null = `${WIKI_BASE_URL}${categoryUrl}`;
    
    while (currentUrl) {
        console.log(`Visiting: ${currentUrl}`);
        
        try {
            await page.goto(currentUrl, { waitUntil: 'networkidle' });
            
            // Random delay between 2-5 seconds
            await sleep(2000 + Math.random() * 3000);
            
            // Extract titles from current page
            const titles = await extractPageTitles(page);
            if (titles.length > 0) {
                appendTitles(titles);
            }
            
            // Update progress
            progress.inProgressCategory = {
                categoryUrl,
                currentPageUrl: currentUrl
            };
            saveProgress(progress);
            
            // Get next page URL
            currentUrl = await getNextPageUrl(page);
            if (currentUrl) {
                currentUrl = `${WIKI_BASE_URL}${currentUrl}`;
            }
            
        } catch (error) {
            console.error(`Error scraping ${currentUrl}:`, error);
            // Wait longer on error
            await sleep(10000);
            continue;
        }
    }
    
    // Mark category as completed
    progress.completedCategories.push(categoryUrl);
    delete progress.inProgressCategory;
    saveProgress(progress);
    
    // Recursively scrape subcategories
    const subcategories = await extractSubcategories(page);
    for (const subcategory of subcategories) {
        if (!progress.completedCategories.includes(subcategory)) {
            await scrapeCategory(browser, subcategory, progress);
        }
    }
    
    await page.close();
}

async function main() {
    const progress = loadProgress();
    console.log('Previous progress:', progress);
    
    const browser = await chromium.launch({
        headless: true, // Set to false for debugging
        args: ['--disable-dev-shm-usage']
    });
    
    try {
        for (const category of CATEGORIES) {
            if (!progress.completedCategories.includes(category)) {
                await scrapeCategory(browser, category, progress);
            }
        }
        console.log('All categories have been scraped!');
    } catch (error) {
        console.error('Error during scraping:', error);
    } finally {
        await browser.close();
    }
}

main().catch(console.error); 