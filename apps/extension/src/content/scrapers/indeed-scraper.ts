/**
 * Indeed Job Scraper — BOILERPLATE
 *
 * TODO: Implement this scraper.
 *
 * Tips:
 *   - Open an Indeed job page, right-click → Inspect to find selectors
 *   - Indeed often uses classes/attributes like:
 *       Title:    '.jobsearch-JobInfoHeader-title', 'h1[data-testid="jobTitle"]'
 *       Company:  '[data-company-name]', '.jobsearch-CompanyInfoContainer a'
 *       Location: '[data-testid="job-location"]', '.jobsearch-JobInfoHeader-subtitle > div:last-child'
 *       Desc:     '#jobDescriptionText', '.jobsearch-JobComponent-description'
 *       Salary:   '#salaryInfoAndJobType span', '.salary-snippet'
 *       JobType:  '#salaryInfoAndJobType .jobsearch-JobMetadataHeader-item'
 *   - Indeed also embeds JSON-LD — use parseJsonLd() from utils.ts
 *   - See naukri-scraper.ts for a full reference implementation
 */

import type { JobScraper } from './types';
import { createEmptyScrapedData } from './utils';

class IndeedScraper implements JobScraper {
  readonly platform = 'indeed';

  canHandle(url: URL): boolean {
    return url.hostname.includes('indeed.com');
  }

  scrape(doc: Document, url: URL): any {
    const data = createEmptyScrapedData(this.platform, url.href);

    // TODO: Implement scraping logic
    // 1. Try parseJsonLd(doc) first — Indeed often has JobPosting schema
    // 2. Fall back to DOM selectors using safeTextMulti / safeTextAll
    // 3. See naukri-scraper.ts for the full pattern

    return data;
  }
}

export const indeedScraper = new IndeedScraper();
