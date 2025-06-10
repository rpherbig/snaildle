import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const WIKI_BASE_URL = 'https://tacticus.fandom.com';
const CATEGORIES_URL = '/wiki/Special:Categories';
const OUTPUT_FILE = path.join(process.cwd(), 'data', 'categories.txt');

// Ensure data directory exists
if (!fs.existsSync(path.dirname(OUTPUT_FILE))) {
    fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
}

async function extractCategories(page: any): Promise<string[]> {
    return await page.$$eval('li', (items: any[]) => 
        items.map(item => {
            const link = item.querySelector('a.newcategory');
            if (!link) return null;
            
            const href = link.getAttribute('href');
            const text = item.textContent.trim();
            // Extract member count from the full li text (format: "Category Name (X members)")
            const match = text.match(/\((.*?)\s*members?\)/);
            const memberCount = match ? match[1] : '0';
            
            // Only include category links
            if (href && href.startsWith('/wiki/Category:')) {
                return `'${href}', // ${memberCount} members`;
            }
            return null;
        }).filter((href): href is string => href !== null)
    );
}

async function getNextPageUrl(page: any): Promise<string | null> {
    const nextPageLink = await page.$('.mw-nextlink');
    if (nextPageLink) {
        return await nextPageLink.getAttribute('href');
    }
    return null;
}

async function main() {
    const browser = await chromium.launch({
        headless: true,
        args: ['--disable-dev-shm-usage']
    });
    
    try {
        const page = await browser.newPage();
        await page.setViewportSize({ width: 1920, height: 1080 });
        page.setDefaultTimeout(30000);
        
        let currentUrl: string | null = `${WIKI_BASE_URL}${CATEGORIES_URL}`;
        const allCategories: string[] = [];
        
        while (currentUrl) {
            console.log(`Visiting: ${currentUrl}`);
            
            try {
                await page.goto(currentUrl, { waitUntil: 'networkidle' });
                
                // Extract categories from current page
                const categories = await extractCategories(page);
                console.log(`Found ${categories.length} categories on current page`);
                allCategories.push(...categories);
                
                // Get next page URL
                const nextUrl = await getNextPageUrl(page);
                if (nextUrl) {
                    currentUrl = `${WIKI_BASE_URL}${nextUrl}`;
                } else {
                    currentUrl = null;
                }
                
                // Add a small delay between requests
                await new Promise(resolve => setTimeout(resolve, 2000));
                
            } catch (error) {
                console.error(`Error scraping ${currentUrl}:`, error);
                break;
            }
        }
        
        // Remove duplicates and sort
        const uniqueCategories = [...new Set(allCategories)].sort();
        
        // Save to file with array brackets
        const output = `[\n    ${uniqueCategories.join(',\n    ')}\n]`;
        fs.writeFileSync(OUTPUT_FILE, output);
        console.log(`Found ${uniqueCategories.length} unique categories. Saved to ${OUTPUT_FILE}`);
        
    } catch (error) {
        console.error('Error during scraping:', error);
    } finally {
        await browser.close();
    }
}

main().catch(console.error); 