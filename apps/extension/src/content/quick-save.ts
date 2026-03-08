/**
 * Content script: Injects a floating "Quick Save" button on job posting pages.
 * Uses Shadow DOM for style isolation from the host page.
 *
 * Features:
 * - Shows only on pages that match a known job board URL pattern
 * - Hides/shows dynamically on SPAs as the URL changes
 * - Shows a loading spinner while scraping + storing data
 */

import cssText from './quick-save.css?inline';
import {
  scrapeCurrentPage,
  isProbablyJobPage,
  isJobDetectedOnPage,
} from './scrapers/scraper-registry';

// --- DOM refs (module-level so event handlers can access them) ---
let host: HTMLDivElement | null = null;
let wrapper: HTMLDivElement | null = null; // Contains button and pulse ring
let btn: HTMLButtonElement | null = null;
let tooltip: HTMLSpanElement | null = null;

// ----------------------------------------------------------------
// Visibility helpers
// ----------------------------------------------------------------

function showButton(): void {
  if (host) host.classList.remove('jfpHidden');
}

function hideButton(): void {
  if (host) host.classList.add('jfpHidden');
}

function updateVisibility(): void {
  console.log('======got added 0==========');
  try {
    const url = new URL(window.location.href);
    if (isProbablyJobPage(url)) {
      showButton();

      // Determine if a specific job matches to show the ripple
      if (wrapper) {
        if (isJobDetectedOnPage(document, url)) {
          console.log('======got added==========');

          wrapper.classList.add('jfpReady');
        } else {
          console.log('=========got removed=========');

          wrapper.classList.remove('jfpReady');
        }
      }
    } else {
      hideButton();
      if (wrapper) wrapper.classList.remove('jfpReady');
    }
  } catch {
    hideButton();
  }
}

// ----------------------------------------------------------------
// Loading state helpers
// ----------------------------------------------------------------

function setLoading(isLoading: boolean): void {
  if (!btn || !tooltip) return;
  if (isLoading) {
    btn.classList.add('jfpLoading');
    btn.disabled = true;
    tooltip.textContent = 'Saving…';
  } else {
    btn.classList.remove('jfpLoading');
    btn.disabled = false;
    tooltip.textContent = 'Quick Save Job';
  }
}

// ----------------------------------------------------------------
// Main injection
// ----------------------------------------------------------------

function injectQuickSaveButton(): void {
  // Guard against double-injection
  console.log('=======got here============');

  if (document.getElementById('jfp-quick-save-root')) return;

  // --- Host element (visibility class lives here so :host() CSS selector works) ---
  host = document.createElement('div');
  host.id = 'jfp-quick-save-root';
  const shadow = host.attachShadow({ mode: 'closed' });

  // --- Styles ---
  const style = document.createElement('style');
  style.textContent = cssText;
  shadow.appendChild(style);

  // --- Wrapper ---
  wrapper = document.createElement('div');
  wrapper.style.position = 'relative';
  wrapper.style.display = 'inline-flex';
  wrapper.style.alignItems = 'center';

  // --- Button ---
  btn = document.createElement('button');
  btn.className = 'jfpQuickSaveBtn';
  btn.setAttribute('aria-label', 'Quick Save Job');

  const icon = document.createElement('img');
  icon.src = chrome.runtime.getURL('public/icon-48.png');
  icon.alt = 'Job Filler';
  btn.appendChild(icon);

  // --- Tooltip ---
  tooltip = document.createElement('span');
  tooltip.className = 'jfpTooltip';
  tooltip.textContent = 'Quick Save Job';

  // --- Pulse ring ---
  const pulse = document.createElement('span');
  pulse.className = 'jfpPulseRing';

  // --- Assemble ---
  wrapper.appendChild(btn);
  wrapper.appendChild(tooltip);
  wrapper.appendChild(pulse);
  shadow.appendChild(wrapper);

  // --- Click handler ---
  btn.addEventListener('click', () => {
    const currentUrl = window.location.href;

    setLoading(true);
    let scrapedData;
    try {
      scrapedData = scrapeCurrentPage(document, new URL(currentUrl));
    } catch (err) {
      console.error('[Job Filler] Scrape error:', err);
      setLoading(false);
      return;
    }

    chrome.storage.local.set({ scrapedJobData: scrapedData, quickSaveActive: true }, () => {
      chrome.runtime.sendMessage({ action: 'OPEN_SIDE_PANEL' }, (response) => {
        setLoading(false);
        if (chrome.runtime.lastError) {
          console.error('[Job Filler] Quick save error:', chrome.runtime.lastError.message);
        } else if (response?.success) {
          // Brief visual feedback — scale down then back
          btn!.style.transform = 'scale(0.9)';
          setTimeout(() => {
            if (btn) btn.style.transform = '';
          }, 150);
        }
      });
    });
  });

  // --- Inject into page ---
  document.body.appendChild(host);

  // --- Initial visibility check ---
  updateVisibility();

  // --- SPA: watch for URL changes (pushState / popstate / hashchange) ---
  // Patch history API so pushState/replaceState fire a custom event
  const originalPushState = history.pushState.bind(history);
  history.pushState = (...args) => {
    originalPushState(...args);
    updateVisibility();
  };
  const originalReplaceState = history.replaceState.bind(history);
  history.replaceState = (...args) => {
    originalReplaceState(...args);
    updateVisibility();
  };
  window.addEventListener('popstate', updateVisibility);
  window.addEventListener('hashchange', updateVisibility);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectQuickSaveButton);
} else {
  injectQuickSaveButton();
}
