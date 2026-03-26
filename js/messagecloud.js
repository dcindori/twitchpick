/**
 * MessageCloud — counts full message frequencies from chat (trimmed, case-insensitive)
 * and renders a ranked vertical list like WordCloud but for entire messages.
 *
 * Useful for polls like "what should we play?" where viewers type full answers.
 *
 * Font range : 14px – 56px
 * Max entries: 30 displayed at once
 */
class MessageCloud {
  constructor(cloudEl, countEl) {
    this.cloudEl = cloudEl;
    this.countEl = countEl;

    this.counts       = {};   // normalised message → { display, count }
    this.totalMessages = 0;
    this.MAX_ENTRIES   = 30;

    this.FONT_MAX = 56;
    this.FONT_MIN = 14;

    this._renderScheduled = false;
  }

  /* ── Public API ─────────────────────────────────────────── */

  addMessage(username, text) {
    const key = text.trim().toLowerCase();
    if (key.length === 0) return;

    if (!this.counts[key]) {
      this.counts[key] = { display: text.trim(), count: 0 };
    }
    this.counts[key].count++;

    this._updateBadge();

    if (!this._renderScheduled) {
      this._renderScheduled = true;
      requestAnimationFrame(() => {
        this._renderCloud();
        this._renderScheduled = false;
      });
    }
  }

  _updateBadge() {
    if (!this.countEl) return;
    const repeated = Object.values(this.counts).filter(e => e.count >= 2).length;
    this.countEl.textContent = repeated;
  }

  reset() {
    this.counts = {};

    if (this.countEl) this.countEl.textContent = '0';

    this.cloudEl.innerHTML = '<div class="cloud-empty">Capturing messages — responses will appear here</div>';
  }

  /* ── Internal ────────────────────────────────────────────── */

  _renderCloud() {
    // Only show messages that have been repeated (count >= 2)
    const sorted = Object.values(this.counts)
      .filter(e => e.count >= 2)
      .sort((a, b) => b.count - a.count)
      .slice(0, this.MAX_ENTRIES);

    if (sorted.length === 0) return;

    const maxCount = sorted[0].count;

    const empty = this.cloudEl.querySelector('.cloud-empty');
    if (empty) empty.remove();

    const existingRows = Array.from(this.cloudEl.querySelectorAll('.cloud-word-row'));

    sorted.forEach((entry, rank) => {
      const fontSize = this._calcFontSize(entry.count, maxCount, rank, sorted.length);
      const opacity  = 0.55 + 0.45 * (entry.count / maxCount);

      let row = existingRows[rank];
      if (!row) {
        row = document.createElement('div');
        row.className = 'cloud-word-row';
        row.innerHTML = `
          <span class="cloud-word-rank"></span>
          <span class="cloud-word-text"></span>
          <span class="cloud-word-count"></span>
        `;
        this.cloudEl.appendChild(row);
      }

      row.querySelector('.cloud-word-rank').textContent  = rank + 1;
      row.querySelector('.cloud-word-text').textContent  = entry.display;
      row.querySelector('.cloud-word-text').style.fontSize = `${fontSize}px`;
      row.querySelector('.cloud-word-text').style.opacity  = opacity;

      const countEl = row.querySelector('.cloud-word-count');
      const oldCount = countEl.textContent;
      const newCount = `×${entry.count}`;
      countEl.textContent = newCount;

      if (oldCount !== newCount && oldCount !== '') {
        countEl.classList.remove('bump');
        void countEl.offsetWidth;
        countEl.classList.add('bump');
      }
    });

    for (let i = sorted.length; i < existingRows.length; i++) {
      existingRows[i].remove();
    }
  }

  _calcFontSize(count, maxCount, rank, total) {
    const countRatio = count / maxCount;
    const rankRatio  = 1 - (rank / Math.max(total, 1));
    const blended = countRatio * 0.7 + rankRatio * 0.3;
    const size    = this.FONT_MIN + blended * (this.FONT_MAX - this.FONT_MIN);
    return Math.round(Math.max(this.FONT_MIN, Math.min(this.FONT_MAX, size)));
  }
}
