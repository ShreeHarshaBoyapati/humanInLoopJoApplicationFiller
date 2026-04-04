import { ScrapedJob } from '@repo/shared-types';
import type { JobScraper } from './types';
import {
  safeTextMulti,
  safeHtmlMulti,
  createEmptyScrapedData,
  htmlToMarkdown,
  parseJsonLd,
} from './utils';

const SELECTORS = {
  title: [
    // Logged-in view (split pane)
    'h2.job-details-jobs-unified-top-card__job-title',
    '.job-details-jobs-unified-top-card__job-title-link',
    // Public view (/jobs/view)
    'h1.top-card-layout__title',
    'h1.topcard__title',
    // Fallbacks
    '.p5 h1',
    'h1',
  ],
  company: [
    // Logged-in view
    '.job-details-jobs-unified-top-card__company-name a',
    '.job-details-jobs-unified-top-card__company-name',
    // Public view
    '.topcard__org-name-link',
    'a.topcard__org-name-link',
    // Fallbacks
    '.job-details-jobs-unified-top-card__primary-description a',
  ],
  location: [
    // Logged-in view
    '.job-details-jobs-unified-top-card__primary-description-container span.tvm__text--neutral',
    '.job-details-jobs-unified-top-card__bullet',
    // Public view
    '.topcard__flavor--bullet',
    'span.topcard__flavor--bullet',
  ],
  description: [
    // Logged-in view
    '#job-details',
    '.jobs-description__content',
    // Public view
    '.description__text',
    '.show-more-less-html__markup',
  ],
} as const;

class LinkedInScraper implements JobScraper {
  readonly platform = 'linkedin';

  canHandle(url: URL): boolean {
    return url.hostname.includes('linkedin.com');
  }

  isJobPage(doc: Document): boolean {
    // If we can find the explicit job title, we are looking at a job
    const title = safeTextMulti(doc, SELECTORS.title);
    return title !== null && title.trim().length > 0;
  }

  scrape(doc: Document, url: URL): ScrapedJob {
    const data = createEmptyScrapedData(this.platform, url.href);

    const jsonLd = parseJsonLd(doc);

    if (jsonLd) {
      data.title = jsonLd.title || null;
      data.description = htmlToMarkdown(jsonLd.description) || null;
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
        data.salary = String(jsonLd.baseSalary?.value?.value) || null;
        data.currency = jsonLd.baseSalary?.currency || null;
      }

      if (jsonLd.skills) {
        data.keySkills = Array.isArray(jsonLd.skills)
          ? jsonLd.skills
          : jsonLd.skills.split(',').map((s: string) => s.trim());
      }

      let reqs = '';
      if (jsonLd.qualifications?.educationalLevel) {
        reqs += `**Education:** ${jsonLd.qualifications.educationalLevel}\n`;
      }
      if (jsonLd.experienceRequirements?.monthsOfExperience) {
        reqs += `**Experience:** ${jsonLd.experienceRequirements.monthsOfExperience} months\n`;
      }
      if (reqs) {
        data.requirements = reqs.trim();
      }
    }

    data.title = data.title || safeTextMulti(doc, SELECTORS.title);
    data.companyName = data.companyName || safeTextMulti(doc, SELECTORS.company);
    data.location = data.location || safeTextMulti(doc, SELECTORS.location);
    const descHtml = safeHtmlMulti(doc, SELECTORS.description);
    data.description = data.description || htmlToMarkdown(descHtml);
    console.log('========the data is ===>>', JSON.stringify(data));

    return data;
  }
}

export const linkedInScraper = new LinkedInScraper();
