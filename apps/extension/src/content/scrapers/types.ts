/**
 * Base interface for all platform scrapers.
 *
 * To add a new platform:
 * 1. Create a new file (e.g. `my-platform-scraper.ts`)
 * 2. Export a class implementing `JobScraper`
 * 3. Register it in `scraper-registry.ts`
 */
export interface JobScraper {
  /** Identifier for this platform, e.g. "naukri", "linkedin", "generic" */
  readonly platform: string;

  /** Return true if this scraper should handle the given URL */
  canHandle(url: URL): boolean;

  /**
   * Return true if the scraper can confidently say a specific job posting
   * is currently visible on the page. Used to trigger the Quick Save ripple effect.
   */
  isJobPage?(doc: Document, url: URL): boolean;

  /**
   * Extract job data from the page DOM.
   * Should never throw — return null for any field that can't be found.
   *
   * TODO: Replace `any` with a proper ScrapedJobData type in @repo/shared-types
   */
  scrape(doc: Document, url: URL): any;
}
