import { ScrapedJob } from '@repo/shared-types';

export interface JsonLdJobPosting {
  '@type': string;
  title?: string;
  description?: string;
  employmentType?: string;
  hiringOrganization?: string | { name?: string };
  jobLocation?: {
    address?: {
      addressLocality?: string;
      addressRegion?: string;
    };
  };
  baseSalary?: {
    currency?: string;
    value?: {
      value?: string | number;
      minValue?: string | number;
      maxValue?: string | number;
    };
  };
  skills?: string | string[];
  qualifications?: {
    educationalLevel?: string;
  };
  experienceRequirements?: {
    monthsOfExperience?: number | string;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export function safeText(doc: Document, selector: string): string | null {
  try {
    const el = doc.querySelector(selector);
    const text = el?.textContent?.trim();
    return text || null;
  } catch {
    return null;
  }
}

export function safeAttr(doc: Document, selector: string, attr: string): string | null {
  try {
    const el = doc.querySelector(selector);
    const val = el?.getAttribute(attr)?.trim();
    return val || null;
  } catch {
    return null;
  }
}

export function safeTextMulti(doc: Document, selectors: readonly string[]): string | null {
  for (const sel of selectors) {
    const result = safeText(doc, sel);
    if (result) return result;
  }
  return null;
}

export function safeHtml(doc: Document, selector: string): string | null {
  try {
    const el = doc.querySelector(selector);
    const html = el?.innerHTML?.trim();
    return html || null;
  } catch {
    return null;
  }
}

export function safeHtmlMulti(doc: Document, selectors: readonly string[]): string | null {
  for (const sel of selectors) {
    const result = safeHtml(doc, sel);
    if (result) return result;
  }
  return null;
}

export function safeTextAll(doc: Document, selector: string): string[] {
  try {
    const els = doc.querySelectorAll(selector);
    const texts = Array.from(els)
      .map((el) => el.textContent?.trim())
      .filter((t): t is string => !!t);
    return [...new Set(texts)];
  } catch {
    return [];
  }
}

export function parseJsonLd(doc: Document): JsonLdJobPosting | null {
  try {
    const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
    for (const script of scripts) {
      const raw = script.textContent;
      if (!raw) continue;

      const parsed = JSON.parse(raw);

      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        if (item['@type'] === 'JobPosting') return item;

        if (item['@graph'] && Array.isArray(item['@graph'])) {
          const found = item['@graph'].find((g) => g['@type'] === 'JobPosting');
          if (found) return found;
        }
      }
    }
  } catch {
    // JSON parse failure — that's fine
  }
  return null;
}

export function ogMeta(doc: Document, property: string): string | null {
  return safeAttr(doc, `meta[property="og:${property}"]`, 'content');
}

export function createEmptyScrapedData(platform: string, url: string): ScrapedJob {
  return {
    title: null,
    companyName: null,
    location: null,
    description: null,
    requirements: null,
    keySkills: [],
    tags: [],
    jobType: null,
    salary: null,
    currency: null,
    jobPostingUrl: url,
    platform,
    scrapedAt: new Date(),
  };
}

export function htmlToMarkdown(html: string | null | undefined): string | null {
  if (!html) return null;

  let md = html;

  md = md.replace(/<br\s*\/?>/gi, '\n');
  md = md.replace(/<\/p>/gi, '\n\n');
  md = md.replace(/<p[^>]*>/gi, '');

  md = md.replace(/<(b|strong)[^>]*>(.*?)<\/\1>/gi, '**$2**');
  md = md.replace(/<(i|em)[^>]*>(.*?)<\/\1>/gi, '*$2*');

  // Handle lists
  md = md.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');
  md = md.replace(/<ul[^>]*>/gi, '\n');
  md = md.replace(/<\/ul>/gi, '\n');
  md = md.replace(/<ol[^>]*>/gi, '\n');
  md = md.replace(/<\/ol>/gi, '\n');

  // Remove remaining HTML tags
  md = md.replace(/<[^>]+>/g, '');

  // Decode basic HTML entities
  md = md.replace(/&nbsp;/gi, ' ');
  md = md.replace(/&amp;/gi, '&');
  md = md.replace(/&lt;/gi, '<');
  md = md.replace(/&gt;/gi, '>');
  md = md.replace(/&quot;/gi, '"');
  md = md.replace(/&#39;/gi, "'");

  // Clean up extra whitespace/newlines
  md = md.replace(/\n{3,}/g, '\n\n');

  return md.trim();
}
