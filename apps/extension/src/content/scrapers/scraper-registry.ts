/**
 * Scraper Registry
 *
 * Central place that knows about all platform scrapers.
 * To add a new platform:
 *   1. Create the scraper file (see naukri-scraper.ts for reference)
 *   2. Import it here
 *   3. Add it to the `scrapers` array (BEFORE genericScraper)
 */

import type { JobScraper } from './types';
import { naukriScraper } from './naukri-scraper';
import { linkedInScraper } from './linkedin-scraper';
import { indeedScraper } from './indeed-scraper';
import { genericScraper } from './generic-scraper';
import { ScrapedJob } from '@repo/shared-types';

/**
 * Ordered list of scrapers. The first one whose canHandle() returns true wins.
 * genericScraper MUST be last — it always returns true.
 */
const scrapers: JobScraper[] = [
  naukriScraper,
  linkedInScraper,
  indeedScraper,
  genericScraper, // ← always last (fallback)
];

/** Find the right scraper for a URL */
function getScraper(url: URL): JobScraper {
  for (const scraper of scrapers) {
    if (scraper.canHandle(url)) {
      return scraper;
    }
  }
  // Should never happen since genericScraper.canHandle() always returns true
  return genericScraper;
}

/**
 * Returns true if the URL is handled by a platform-specific scraper (not generic).
 * Used by the content script to decide whether to show the Quick Save button.
 */
export function isProbablyJobPage(url: URL): boolean {
  // Only the specific scrapers — exclude genericScraper (it always returns true)
  const specificScrapers = scrapers.filter((s) => s !== genericScraper);
  return specificScrapers.some((s) => s.canHandle(url));
}

/**
 * Main entry point — call this from the content script.
 *
 * @param doc  - the page's Document object
 * @param url  - the page URL (pass `new URL(window.location.href)`)
 * @returns Scraped job data (shape matches the future ScrapedJobData type)
 */
export function scrapeCurrentPage(doc: Document, url: URL): ScrapedJob {
  const scraper = getScraper(url);
  console.log(`[Job Filler] Using "${scraper.platform}" scraper for ${url.hostname}`);

  try {
    return scraper.scrape(doc, url);
  } catch (err) {
    console.error(`[Job Filler] Scraper "${scraper.platform}" crashed:`, err);
    // Return minimal data so the form still opens with the URL
    return {
      title: null,
      companyName: null,
      location: null,
      description: null,
      keySkills: [],
      tags: [],
      jobType: null,
      salary: null,
      jobPostingUrl: url.href,
      platform: 'error',
      requirements: null,
      currency: null,
      scrapedAt: new Date(),
    };
  }
}
