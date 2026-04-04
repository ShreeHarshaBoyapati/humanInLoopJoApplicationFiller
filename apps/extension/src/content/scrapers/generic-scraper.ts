/**
 * Generic / Fallback Scraper — FULL IMPLEMENTATION
 *
 * Used when no platform-specific scraper matches the URL.
 * Extracts whatever it can from universal sources:
 *   1. JSON-LD `JobPosting` structured data (many sites include this)
 *   2. OpenGraph meta tags (og:title, og:description)
 *   3. Standard meta tags and <title>
 */

import type { JobScraper } from './types';
import { safeText, safeAttr, parseJsonLd, ogMeta, createEmptyScrapedData } from './utils';

class GenericScraper implements JobScraper {
  readonly platform = 'generic';

  /** Always returns true — this is the fallback */
  canHandle(): boolean {
    return true;
  }

  scrape(doc: Document, url: URL) {
    const data = createEmptyScrapedData(this.platform, url.href);

    // ------ 1. JSON-LD (best source if available) ------
    const jsonLd = parseJsonLd(doc);
    if (jsonLd) {
      data.title = jsonLd.title || null;
      data.description = jsonLd.description || null;
      data.jobType = jsonLd.employmentType || null;
      data.location =
        jsonLd.jobLocation?.address?.addressLocality ||
        jsonLd.jobLocation?.address?.addressRegion ||
        null;

      if (jsonLd.hiringOrganization) {
        data.companyName =
          typeof jsonLd.hiringOrganization === 'string'
            ? jsonLd.hiringOrganization
            : jsonLd.hiringOrganization.name || null;
      }

      if (jsonLd.baseSalary) {
        const sal = jsonLd.baseSalary;
        const min = sal.value?.minValue ?? '';
        const max = sal.value?.maxValue ?? '';
        const currency = sal.currency ?? '';
        data.salary = min || max ? `${currency} ${min}–${max}`.trim() : null;
      }

      if (jsonLd.skills) {
        data.keySkills = Array.isArray(jsonLd.skills)
          ? jsonLd.skills
          : jsonLd.skills.split(',').map((s: string) => s.trim());
      }
    }

    // ------ 2. OpenGraph meta tags (fill gaps) ------
    data.title = data.title || ogMeta(doc, 'title');
    data.description = data.description || ogMeta(doc, 'description');

    // ------ 3. Standard meta / <title> (last resort) ------
    data.title =
      data.title || safeAttr(doc, 'meta[name="title"]', 'content') || safeText(doc, 'title');

    data.description = data.description || safeAttr(doc, 'meta[name="description"]', 'content');

    // Clean up title — remove site name suffix like " | SiteName" or " - SiteName"
    if (data.title) {
      data.title = data.title.replace(/\s*[|\-–—]\s*[^|\-–—]+$/, '').trim();
    }

    return data;
  }
}

export const genericScraper = new GenericScraper();
