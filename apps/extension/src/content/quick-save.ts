/**
 * Content script: Injects a floating "Quick Save" button on job posting pages.
 * Uses Shadow DOM for style isolation from the host page.
 */

import cssText from './quick-save.css?inline';

function injectQuickSaveButton(): void {
  // Guard against double-injection
  if (document.getElementById('jfp-quick-save-root')) return;

  // --- Host element ---
  const host = document.createElement('div');
  host.id = 'jfp-quick-save-root';
  const shadow = host.attachShadow({ mode: 'closed' });

  // --- Styles ---
  const style = document.createElement('style');
  style.textContent = cssText;
  shadow.appendChild(style);

  // --- Wrapper (positioning handled by :host) ---
  const wrapper = document.createElement('div');
  wrapper.style.position = 'relative';
  wrapper.style.display = 'inline-flex';
  wrapper.style.alignItems = 'center';

  // --- Button ---
  const btn = document.createElement('button');
  btn.className = 'jfpQuickSaveBtn';
  btn.setAttribute('aria-label', 'Quick Save Job');

  const icon = document.createElement('img');
  icon.src = chrome.runtime.getURL('public/icon-48.png');
  icon.alt = 'Job Filler';
  btn.appendChild(icon);

  // --- Tooltip ---
  const tooltip = document.createElement('span');
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

    chrome.runtime.sendMessage(
      { action: 'OPEN_SIDE_PANEL', payload: { url: currentUrl } },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error('[Job Filler] Quick save error:', chrome.runtime.lastError.message);
        } else if (response?.success) {
          // Brief visual feedback
          btn.style.transform = 'scale(0.9)';
          setTimeout(() => {
            btn.style.transform = '';
          }, 150);
        }
      }
    );
  });

  // --- Inject into page ---
  document.body.appendChild(host);
}

// Run when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectQuickSaveButton);
} else {
  injectQuickSaveButton();
}
