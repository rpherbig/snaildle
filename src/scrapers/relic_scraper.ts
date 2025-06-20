import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const WIKI_BASE_URL = 'https://supersnail.wiki.gg';
const LOTTERY_2_URL = '/wiki/Lottery_2';
const OUTPUT_FILE = path.join(process.cwd(), 'data', 'minion_relics.json');

interface MinionRelic {
    name: string;
    affct: {
        fame: number;
        art: number;
        fth: number;
        civ: number;
        tech: number;
        dominant: string;
    };
    effect: string;
    minionType: string;
    rank: string;
}

// Ensure data directory exists
if (!fs.existsSync(path.dirname(OUTPUT_FILE))) {
    fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
}

async function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function extractMinionType(effectText: string): string {
    const minionTypes = ['angel', 'zombie', 'dragon', 'demon', 'mutant', 'mecha'];
    const lowerEffect = effectText.toLowerCase();
    
    for (const minionType of minionTypes) {
        if (lowerEffect.includes(minionType)) {
            return minionType;
        }
    }
    
    return 'unknown';
}

function getDominantAffct(affct: { fame: number; art: number; fth: number; civ: number; tech: number }): string {
    const stats = [
        { name: 'FAME', value: affct.fame },
        { name: 'ART', value: affct.art },
        { name: 'FTH', value: affct.fth },
        { name: 'CIV', value: affct.civ },
        { name: 'TECH', value: affct.tech }
    ];
    
    return stats.reduce((max, current) => current.value > max.value ? current : max).name;
}

async function scrapeMinionRelics(): Promise<MinionRelic[]> {
    const browser = await chromium.launch({
        headless: true,
        args: ['--disable-dev-shm-usage', '--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.setDefaultTimeout(60000);
        await page.setDefaultNavigationTimeout(60000);
        
        console.log(`Visiting: ${WIKI_BASE_URL}${LOTTERY_2_URL}`);
        
        await page.goto(`${WIKI_BASE_URL}${LOTTERY_2_URL}`, { 
            waitUntil: 'domcontentloaded',
            timeout: 60000 
        });
        
        console.log('Waiting for page content to load...');
        await page.waitForSelector('table.wikitable', { timeout: 30000 });
        await sleep(3000);
        
        const relics = await page.$$eval('table.wikitable tbody tr', (rows) => {
            const minionRelics: any[] = [];
            
            for (const row of rows) {
                const cells = row.querySelectorAll('td');
                if (cells.length < 8) continue;
                
                try {
                    const rankCell = cells[1];
                    const rank = rankCell.textContent?.trim();
                    if (rank !== 'Blue') continue;
                    
                    const effectCell = cells[2];
                    const effect = effectCell.textContent?.trim() || '';
                    
                    if (!effect.toLowerCase().includes('minion')) continue;
                    
                    // Extract name from the first cell (image + link)
                    const nameCell = cells[0];
                    const nameLink = nameCell.querySelector('a');
                    const name = nameLink?.textContent?.trim() || nameLink?.getAttribute('title') || 'Unknown';
                    
                    const fame = parseInt(cells[3].textContent?.trim() || '0');
                    const art = parseInt(cells[4].textContent?.trim() || '0');
                    const fth = parseInt(cells[5].textContent?.trim() || '0');
                    const civ = parseInt(cells[6].textContent?.trim() || '0');
                    const tech = parseInt(cells[7].textContent?.trim() || '0');
                    
                    minionRelics.push({
                        name,
                        effect,
                        rank,
                        fame,
                        art,
                        fth,
                        civ,
                        tech
                    });
                    
                } catch (error) {
                    console.error('Error parsing row:', error);
                    continue;
                }
            }
            
            return minionRelics;
        });
        
        console.log(`Found ${relics.length} blue relics with minion effects`);
        
        const processedRelics: MinionRelic[] = relics.map(relic => {
            const affct = {
                fame: relic.fame,
                art: relic.art,
                fth: relic.fth,
                civ: relic.civ,
                tech: relic.tech,
                dominant: getDominantAffct({
                    fame: relic.fame,
                    art: relic.art,
                    fth: relic.fth,
                    civ: relic.civ,
                    tech: relic.tech
                })
            };
            
            return {
                name: relic.name,
                affct,
                effect: relic.effect,
                minionType: extractMinionType(relic.effect),
                rank: relic.rank
            };
        });
        
        return processedRelics;
        
    } catch (error) {
        console.error('Error during scraping:', error);
        return [];
    } finally {
        await browser.close();
    }
}

async function main() {
    console.log('Starting minion relic scraping...');
    
    const minionRelics = await scrapeMinionRelics();
    
    if (minionRelics.length > 0) {
        // Save to JSON file
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(minionRelics, null, 2));
        console.log(`\nFound ${minionRelics.length} minion relics:`);
        
        // Display results
        minionRelics.forEach((relic, index) => {
            console.log(`\n${index + 1}. ${relic.name}`);
            console.log(`   Rank: ${relic.rank}`);
            console.log(`   Dominant AFFCT: ${relic.affct.dominant}`);
            console.log(`   Minion Type: ${relic.minionType}`);
            console.log(`   Effect: ${relic.effect}`);
            console.log(`   AFFCT Stats: FAME=${relic.affct.fame}, ART=${relic.affct.art}, FTH=${relic.affct.fth}, CIV=${relic.affct.civ}, TECH=${relic.affct.tech}`);
        });
        
        console.log(`\nResults saved to: ${OUTPUT_FILE}`);
    } else {
        console.log('No minion relics found matching the criteria.');
    }
}

main().catch(console.error); 