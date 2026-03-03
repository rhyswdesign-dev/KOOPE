import * as fs from 'fs';
import * as path from 'path';
import { vaultItems, monetizationItems } from '../src/data/vaultData';
import { BARS } from '../src/data/bars/index';
import { ALL_COCKTAILS } from '../src/data/cocktails';
import { ALL_SPIRIT_BRANDS } from '../src/data/brands/index';
import {
    highlandCrownGold, mixmindRumGold, botanicalCrownGold,
    crystalPeakGold, agaveRealGold
} from '../src/data/spirits';

const results: any[] = [];

function search(obj: any, pathStr: string, parentName: string, parentDesc: string) {
    if (!obj) return;
    if (typeof obj === 'string') {
        if (obj.includes('unsplash.com') || obj.includes('static.spotapps.co')) {
            results.push({
                url: obj,
                name: parentName,
                description: parentDesc,
                path: pathStr
            });
        }
        return;
    }

    if (Array.isArray(obj)) {
        obj.forEach((item, index) => {
            search(item, `${pathStr}[${index}]`, item?.name || parentName, item?.description || item?.tagline || item?.blurb || parentDesc);
        });
        return;
    }

    if (typeof obj === 'object') {
        const name = obj.name || obj.title || obj.handle || parentName;
        const desc = obj.description || obj.tagline || obj.blurb || obj.caption || obj.subtitle || obj.story?.short || parentDesc;

        for (const key of Object.keys(obj)) {
            search(obj[key], `${pathStr}.${key}`, name, desc);
        }
    }
}

search(vaultItems, 'vaultItems', 'Vault Items', 'Vault Item');
search(monetizationItems, 'monetizationItems', 'Monetization Items', 'Monetization Item');
search(BARS, 'BARS', 'Bars', 'Bar');
search(ALL_COCKTAILS, 'ALL_COCKTAILS', 'Cocktails', 'Cocktail');
search(ALL_SPIRIT_BRANDS, 'ALL_SPIRIT_BRANDS', 'Brands', 'Brand');

const spirits = [highlandCrownGold, mixmindRumGold, botanicalCrownGold, crystalPeakGold, agaveRealGold];
search(spirits, 'SPIRITS', 'Spirits', 'Spirit');

// Deduplicate by URL
const uniqueResults = new Map();
for (const r of results) {
    if (!uniqueResults.has(r.url)) {
        uniqueResults.set(r.url, r);
    } else {
        // combine names/paths if multiple uses
        const existing = uniqueResults.get(r.url);
        if (!existing.name.includes(r.name)) {
            existing.name += ' / ' + r.name;
        }
    }
}

const finalResults = Array.from(uniqueResults.values());

let markdown = '# Mock/Stock Images That Need Replacement\n\n';
markdown += 'Here is the list of all mock images (Unsplash or similar) used across the app\'s data files, along with their names and descriptions so you can recreate them. Some images are reused across multiple items.\n\n';

finalResults.forEach((item, i) => {
    markdown += `### ${i + 1}. ${item.name || 'Unknown'}\n`;
    if (item.description) {
        markdown += `**Description:** ${item.description}\n`;
    }
    markdown += `**Current Image URL:** ${item.url}\n\n`;
});

const artifactPath = path.join(process.cwd(), '.gemini', 'antigravity', 'brain', 'dc92e5e1-8ae8-4423-bfb9-927ae9eb50b2', 'mock_images_list.md');
fs.writeFileSync(artifactPath, markdown);
console.log(`Extracted ${finalResults.length} unique mock images. Wrote to ${artifactPath}`);
