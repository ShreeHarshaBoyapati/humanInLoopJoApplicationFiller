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
    '#job_header > div.styles_jhc__top__BUxpc > div.styles_jhc__jd-top-head__MFoZl > header > h1',
    'header > h1',
    'h1',
  ],
  company: [
    '#job_header > div.styles_jhc__top__BUxpc > div.styles_jhc__jd-top-head__MFoZl > div > a',
    '.company-name',
  ],
  location: [
    '#job_header > div.styles_jhc__top__BUxpc > div.styles_jhc__left__tg9m8 > div.styles_jhc__loc___Du2H > span > span > a',
    '.jd-header-comp-loc .location',
    '.loc_tru',
    '.loc',
  ],
  experience: [
    '#job_header > div.styles_jhc__top__BUxpc > div.styles_jhc__left__tg9m8 > div.styles_jhc__exp-salary-container__NXsVd > div.styles_jhc__exp__k_giM > span',
    '.exp_tru',
    '.experience',
  ],
  salary: [
    '#job_header > div.styles_jhc__top__BUxpc > div.styles_jhc__left__tg9m8 > div.styles_jhc__exp-salary-container__NXsVd > div.styles_jhc__salary__jdfEC > span',
    '.sal_tru',
    '.salary',
  ],
  description: [
    '#root > div > main > div.styles_jdc__content__EZJMQ > div.styles_left-section-container__btAcB > section.styles_job-desc-container__txpYf > div:nth-child(3) > div.styles_JDC__dang-inner-html__h0K4t',
    '.jd-desc',
    '.job-desc',
    '.dang-inner-html',
  ],
  jobType: [
    '#root > div > main > div.styles_jdc__content__EZJMQ > div.styles_left-section-container__btAcB > section.styles_job-desc-container__txpYf > div:nth-child(3) > div.styles_other-details__oEN4O > div:nth-child(4) > span > span',
    '.jd-header-comp-type',
    '.jobType',
  ],
} as const;

class NaukriScraper implements JobScraper {
  readonly platform = 'naukri';

  canHandle(url: URL): boolean {
    return url.hostname.includes('naukri.com');
  }

  isJobPage(doc: Document): boolean {
    // Naukri reliably includes JSON-LD for JobPostings when viewing an actual job
    const jsonLd = parseJsonLd(doc);
    console.log('=======in isJobPage');

    return jsonLd !== null && jsonLd !== undefined;
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
    data.salary = data.salary || safeTextMulti(doc, SELECTORS.salary);
    data.jobType = data.jobType || safeTextMulti(doc, SELECTORS.jobType);
    const descHtml = safeHtmlMulti(doc, SELECTORS.description);
    data.description = data.description || htmlToMarkdown(descHtml);

    return data;
  }
}

export const naukriScraper = new NaukriScraper();
