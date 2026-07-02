/**
 * <stats-counter> — counts each number up from 0 to its target value the first
 * time the section scrolls into view.
 *
 * Progressive enhancement: the final value is already rendered server-side, so
 * it stays correct with JS disabled and for visitors who prefer reduced motion.
 * Only when we're actually going to animate do we reset the digits to 0.
 *
 * Each animated figure is a `.stats__value` element carrying:
 *   data-stat-value    — the numeric target (dot as decimal separator)
 *   data-stat-decimals — how many decimal places to keep
 * with the live digits living in a nested `[data-stat-number]` span so any
 * prefix/suffix (e.g. "+", "%") is left untouched.
 *
 * Self-contained (no theme imports) so it stays portable across client stores.
 */
const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)');

class StatsCounter extends HTMLElement {
  /** @type {HTMLElement[]} */
  #values = [];
  /** @type {IntersectionObserver | null} */
  #observer = null;
  #hasRun = false;

  connectedCallback() {
    this.#values = Array.from(this.querySelectorAll('[data-stat-value]'));
    if (this.#values.length === 0) return;

    // No motion wanted (or IntersectionObserver unavailable): keep the
    // server-rendered final value and bail out.
    if (REDUCED_MOTION.matches || typeof IntersectionObserver === 'undefined') return;

    // Reset to the starting point so the count-up is actually visible.
    for (const el of this.#values) this.#render(el, 0);

    this.#observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            this.#start();
            break;
          }
        }
      },
      { threshold: 0.4 }
    );

    this.#observer.observe(this);
  }

  disconnectedCallback() {
    this.#observer?.disconnect();
  }

  #start() {
    if (this.#hasRun) return;
    this.#hasRun = true;
    this.#observer?.disconnect();

    const duration = Number(this.dataset.duration) || 2000;
    const start = performance.now();

    /** @param {number} now */
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      // easeOutCubic — quick off the line, gentle landing.
      const eased = 1 - Math.pow(1 - progress, 3);

      for (const el of this.#values) {
        const target = Number(el.dataset.statValue) || 0;
        this.#render(el, target * eased);
      }

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        // Snap to the exact targets to avoid easing rounding drift.
        for (const el of this.#values) this.#render(el, Number(el.dataset.statValue) || 0);
      }
    };

    requestAnimationFrame(tick);
  }

  /**
   * @param {HTMLElement} el - The `.stats__value` wrapper.
   * @param {number} value - The current (possibly fractional) value to show.
   */
  #render(el, value) {
    const decimals = Number(el.dataset.statDecimals) || 0;
    const formatted = new Intl.NumberFormat(this.dataset.locale || undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);

    const target = el.querySelector('[data-stat-number]') || el;
    target.textContent = formatted;
  }
}

if (!customElements.get('stats-counter')) {
  customElements.define('stats-counter', StatsCounter);
}
